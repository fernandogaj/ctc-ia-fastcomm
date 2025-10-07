import OpenAI from 'openai';
import { getEndpointById, listEndpoints } from '../../lib/endpoints';

function normalizeText(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function findLatestUserMessage(messages) {
  if (!Array.isArray(messages)) {
    return '';
  }

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') {
      return messages[i].content || '';
    }
  }

  return '';
}

async function executeEndpoint(endpoint, payloadToSend) {
  let responseData;
  let statusCode;

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (endpoint.bearer_token) {
      headers.Authorization = `Bearer ${endpoint.bearer_token}`;
    }

    const fetchOptions = {
      method: endpoint.method || 'POST',
      headers,
    };

    if (payloadToSend && endpoint.method !== 'GET') {
      fetchOptions.body =
        typeof payloadToSend === 'string' ? payloadToSend : JSON.stringify(payloadToSend);
    }

    const response = await fetch(endpoint.endpoint_url, fetchOptions);
    statusCode = response.status;
    const text = await response.text();
    try {
      responseData = JSON.parse(text);
    } catch (error) {
      responseData = text;
    }
  } catch (error) {
    responseData = `Falha ao chamar o endpoint: ${error.message}`;
    statusCode = 500;
  }

  return { statusCode, responseData };
}

function mapMessages(messages) {
  return messages.map((message) => ({ role: message.role, content: message.content }));
}

function buildSystemPrompt(endpoints) {
  if (!endpoints.length) {
    return 'Você é um assistente empresarial que conversa em português e informa quando não possui endpoints cadastrados para executar ações. Responda de forma cordial e objetiva.';
  }

  const description = endpoints
    .map(
      (endpoint) =>
        `ID ${endpoint.id} - ${endpoint.name || 'Sem nome'}\n` +
        `Método: ${endpoint.method}\n` +
        `URL: ${endpoint.endpoint_url}\n` +
        `Contexto: ${endpoint.context || 'Sem contexto'}\n` +
        `Payload base: ${endpoint.payload || 'Nenhum'}\n`
    )
    .join('\n');

  return `Você é um copiloto de operações chamado FastComm IA. Utilize os endpoints cadastrados quando forem úteis para responder solicitações.\n\nLista de endpoints disponíveis:\n${description}\n\nAntes de chamar um endpoint, confirme que ele é adequado. Quando chamar um endpoint use a função callEndpoint. Se o endpoint não ajudar, apenas responda com texto.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: 'OPENAI_API_KEY não configurada' });
    return;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { messages = [] } = req.body;
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'messages deve ser um array' });
    return;
  }

  try {
    const endpoints = await listEndpoints();

    const systemMessage = buildSystemPrompt(endpoints);
    const openAiMessages = [
      { role: 'system', content: systemMessage },
      ...mapMessages(messages),
    ];

    const latestUserMessage = findLatestUserMessage(messages);
    const latestUserContent = normalizeText(latestUserMessage);
    const matchedEndpoint = endpoints.find((endpoint) => {
      if (!endpoint?.context) {
        return false;
      }

      const normalizedContext = normalizeText(endpoint.context);
      return normalizedContext && latestUserContent.includes(normalizedContext);
    });

    if (matchedEndpoint) {
      let payloadToSend = null;
      if (matchedEndpoint.payload) {
        try {
          payloadToSend = JSON.parse(matchedEndpoint.payload);
        } catch (error) {
          payloadToSend = matchedEndpoint.payload;
        }
      }

      const { statusCode, responseData } = await executeEndpoint(matchedEndpoint, payloadToSend);

      const simulatedFunctionCall = {
        role: 'assistant',
        content: null,
        function_call: {
          name: 'callEndpoint',
          arguments: JSON.stringify({ endpointId: matchedEndpoint.id, useStoredPayload: true }),
        },
      };

      const followUpMessages = [
        ...openAiMessages,
        simulatedFunctionCall,
        {
          role: 'tool',
          name: 'callEndpoint',
          content: JSON.stringify(
            {
              endpointId: matchedEndpoint.id,
              endpointName: matchedEndpoint.name,
              endpointUrl: matchedEndpoint.endpoint_url,
              statusCode,
              requestPayload: payloadToSend ?? null,
              responseData,
              userRequest: latestUserMessage,
            },
            null,
            2
          ),
        },
      ];

      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: followUpMessages,
        temperature: 0.2,
      });

      const finalMessage = finalCompletion.choices[0]?.message;
      res.status(200).json({
        message: {
          id: Date.now().toString(),
          role: 'assistant',
          content: finalMessage?.content || 'Não foi possível obter uma resposta.',
        },
      });
      return;
    }

    const functionDefinition = {
      name: 'callEndpoint',
      description: 'Executa uma chamada HTTP em um endpoint cadastrado',
      parameters: {
        type: 'object',
        properties: {
          endpointId: {
            type: 'integer',
            description: 'Identificador do endpoint disponível',
          },
          payload: {
            type: 'object',
            description: 'Payload JSON customizado para a requisição. Se omitido, será usado o payload base.',
          },
          useStoredPayload: {
            type: 'boolean',
            description: 'Quando true, utiliza o payload base exatamente como salvo.',
          },
        },
        required: ['endpointId'],
      },
    };

    const initialCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: openAiMessages,
      functions: [functionDefinition],
      function_call: 'auto',
      temperature: 0.2,
    });

    const choice = initialCompletion.choices[0];

    if (choice.finish_reason === 'function_call' && choice.message?.function_call) {
      const { arguments: rawArgs, name } = choice.message.function_call;

      if (name !== 'callEndpoint') {
        res.status(500).json({ error: 'Função desconhecida solicitada pela IA.' });
        return;
      }

      let parsedArgs;
      try {
        parsedArgs = JSON.parse(rawArgs || '{}');
      } catch (error) {
        res.status(500).json({ error: 'Argumentos inválidos retornados pela IA.' });
        return;
      }

      const endpointId = parsedArgs.endpointId;
      if (!endpointId) {
        res.status(500).json({ error: 'A IA não forneceu o endpointId para a chamada.' });
        return;
      }

      const endpoint = await getEndpointById(endpointId);
      if (!endpoint) {
        res.status(500).json({ error: 'A IA tentou usar um endpoint inexistente.' });
        return;
      }

      let payloadToSend = null;
      if (parsedArgs.payload) {
        payloadToSend = parsedArgs.payload;
      } else if (parsedArgs.useStoredPayload !== false && endpoint.payload) {
        try {
          payloadToSend = JSON.parse(endpoint.payload);
        } catch (error) {
          payloadToSend = endpoint.payload;
        }
      }

      const { statusCode, responseData } = await executeEndpoint(endpoint, payloadToSend);

      const followUpMessages = [
        ...openAiMessages,
        choice.message,
        {
          role: 'tool',
          name: 'callEndpoint',
          content: JSON.stringify(
            {
              endpointId: endpoint.id,
              endpointName: endpoint.name,
              endpointUrl: endpoint.endpoint_url,
              statusCode,
              requestPayload: payloadToSend ?? null,
              responseData,
              userRequest: latestUserMessage,
            },
            null,
            2
          ),
        },
      ];

      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: followUpMessages,
        temperature: 0.2,
      });

      const finalMessage = finalCompletion.choices[0]?.message;
      res.status(200).json({
        message: {
          id: Date.now().toString(),
          role: 'assistant',
          content: finalMessage?.content || 'Não foi possível obter uma resposta.',
        },
      });
      return;
    }

    res.status(200).json({
      message: {
        id: Date.now().toString(),
        role: 'assistant',
        content: choice.message?.content || 'Não foi possível obter uma resposta.',
      },
    });
  } catch (error) {
    console.error('Erro no chat', error);
    res.status(500).json({ error: 'Não foi possível processar a conversa' });
  }
}
