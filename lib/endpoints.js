import { getClient } from './db';

export async function listEndpoints() {
  const client = await getClient();
  const { rows } = await client.query(
    'SELECT id, name, endpoint_url, method, bearer_token, context, payload FROM endpoints ORDER BY id DESC'
  );
  return rows;
}

export async function createEndpoint(data) {
  const client = await getClient();
  const {
    name,
    endpointUrl,
    method = 'POST',
    bearerToken,
    context,
    payload,
  } = data;

  const { rows } = await client.query(
    `INSERT INTO endpoints (name, endpoint_url, method, bearer_token, context, payload)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, endpoint_url, method, bearer_token, context, payload`,
    [name || null, endpointUrl, method.toUpperCase(), bearerToken || null, context || null, payload || null]
  );

  return rows[0];
}

export async function deleteEndpoint(id) {
  const client = await getClient();
  await client.query('DELETE FROM endpoints WHERE id = $1', [id]);
}

export async function getEndpointById(id) {
  const client = await getClient();
  const { rows } = await client.query(
    'SELECT id, name, endpoint_url, method, bearer_token, context, payload FROM endpoints WHERE id = $1',
    [id]
  );
  return rows[0];
}
