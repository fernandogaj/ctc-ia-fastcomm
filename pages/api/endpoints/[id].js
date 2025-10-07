import { deleteEndpoint, getEndpointById } from '../../../lib/endpoints';

export default async function handler(req, res) {
  const {
    query: { id },
  } = req;

  if (!id) {
    res.status(400).json({ error: 'id é obrigatório' });
    return;
  }

  if (req.method === 'GET') {
    const endpoint = await getEndpointById(id);
    if (!endpoint) {
      res.status(404).json({ error: 'Endpoint não encontrado' });
      return;
    }
    res.status(200).json(endpoint);
    return;
  }

  if (req.method === 'DELETE') {
    await deleteEndpoint(id);
    res.status(204).end();
    return;
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  res.status(405).end('Method Not Allowed');
}
