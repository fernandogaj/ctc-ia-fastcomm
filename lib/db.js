import { Pool } from 'pg';

let pool;
let initialized = false;

function buildPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada.');
  }

  pool = new Pool({ connectionString });
  return pool;
}

async function ensureSchema(client) {
  if (initialized) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS endpoints (
      id SERIAL PRIMARY KEY,
      name TEXT,
      endpoint_url TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'POST',
      bearer_token TEXT,
      context TEXT,
      payload TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  initialized = true;
}

export async function getClient() {
  const client = buildPool();
  await ensureSchema(client);
  return client;
}
