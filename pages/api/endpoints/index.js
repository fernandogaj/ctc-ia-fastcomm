import { createEndpoint, listEndpoints } from '../../../lib/endpoints';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const endpoints = await listEndpoints();
    res.status(200).json(endpoints);
    return;
  }

  if (req.method === 'POST') {
    const { endpointUrl, method } = req.body;

    if (!endpointUrl) {
      res.status(400).json({ error: 'endpointUrl é obrigatório' });
      return;
    }

    if (!method) {
      res.status(400).json({ error: 'method é obrigatório' });
      return;
    }

    try {
      const endpoint = await createEndpoint(req.body);
      res.status(201).json(endpoint);
    } catch (error) {
      console.error('Erro ao criar endpoint', error);
      res.status(500).json({ error: 'Não foi possível criar o endpoint' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method Not Allowed');
}
