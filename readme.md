# FastComm IA

Aplicação web construída com Next.js e React, containerizada com Docker, e integrada a um banco Postgres. A plataforma permite cadastrar endpoints externos e utilizá-los em um chat inteligente alimentado pela OpenAI.

## Funcionalidades

- Layout com menu lateral e cabeçalho fixo.
- Tela de gestão para cadastrar endpoints com bearer token, contexto e payload base.
- Chat integrado à OpenAI que pode invocar endpoints cadastrados para responder solicitações.
- Persistência dos endpoints em banco Postgres.
- Ambiente completo via Docker Compose (Next.js + Postgres).

## Pré-requisitos

- Docker e Docker Compose instalados.
- Uma chave de API válida da OpenAI.

## Configuração

1. Copie o arquivo `.env.example` para `.env` e ajuste os valores necessários:

   ```bash
   cp .env.example .env
   ```

2. Informe sua chave da OpenAI no arquivo `.env`:

   ```dotenv
   OPENAI_API_KEY=sk-...
   ```

3. Suba os containers:

   ```bash
   docker compose up --build
   ```

   O serviço web ficará disponível em `http://localhost:3000` e o Postgres em `localhost:5432`.

## Uso

1. Acesse a aba **Gestão** para cadastrar um novo endpoint informando URL, método HTTP, bearer token (opcional), contexto e payload base.
2. Vá para a aba **Chat** e converse com a FastComm IA. Sempre que apropriado, ela utilizará os endpoints cadastrados para consultar ou enviar informações.

## Desenvolvimento local sem Docker

Caso prefira executar sem Docker, instale as dependências e rode o ambiente de desenvolvimento:

```bash
npm install

# com o banco já configurado e o arquivo .env preenchido,
# inicialize o servidor de desenvolvimento:
npm run dev
```

O comando `npm run dev` inicia o Next.js em modo de desenvolvimento na porta padrão `3000`. Antes disso, garanta que:

1. O Postgres esteja ativo (pode ser via `docker compose up db -d` ou uma instância local).
2. A variável `DATABASE_URL` e os demais valores do `.env` estejam corretamente preenchidos.

Com o serviço de desenvolvimento rodando, acesse `http://localhost:3000` no navegador.

## Estrutura do banco

Os endpoints são persistidos na tabela `endpoints` com os campos:

- `id` (serial, chave primária)
- `name`
- `endpoint_url`
- `method`
- `bearer_token`
- `context`
- `payload`
- `created_at`

A tabela é criada automaticamente na primeira conexão da aplicação.

## Observações

- Esta versão não possui autenticação. Todas as rotas estão abertas.
- Garanta que os endpoints cadastrados retornem respostas rápidas para evitar timeouts durante o chat.
