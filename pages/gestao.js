import { useEffect, useState } from 'react';

const defaultForm = {
  name: '',
  endpointUrl: '',
  method: 'POST',
  bearerToken: '',
  context: '',
  payload: '{\n  \"example\": \"valor\"\n}'
};

export default function Gestao() {
  const [form, setForm] = useState({ ...defaultForm });
  const [endpoints, setEndpoints] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchEndpoints = async () => {
    const res = await fetch('/api/endpoints');
    if (res.ok) {
      const data = await res.json();
      setEndpoints(data);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao salvar endpoint');
      }
      setForm({ ...defaultForm });
      await fetchEndpoints();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja remover este endpoint?')) return;
    await fetch(`/api/endpoints/${id}`, { method: 'DELETE' });
    fetchEndpoints();
  };

  return (
    <div className="card">
      <h2>Gestão de Endpoints</h2>
      <p>Cadastre os serviços que poderão ser utilizados pela IA durante as conversas.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Nome</label>
        <input
          id="name"
          name="name"
          placeholder="Financeiro, CRM, ERP..."
          value={form.name}
          onChange={handleChange}
        />

        <label htmlFor="endpointUrl">URL do Endpoint</label>
        <input
          id="endpointUrl"
          name="endpointUrl"
          placeholder="https://api.exemplo.com/recurso"
          value={form.endpointUrl}
          onChange={handleChange}
          required
        />

        <label htmlFor="method">Método HTTP</label>
        <select id="method" name="method" value={form.method} onChange={handleChange}>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>

        <label htmlFor="bearerToken">Bearer Token</label>
        <input
          id="bearerToken"
          name="bearerToken"
          placeholder="Opcional"
          value={form.bearerToken}
          onChange={handleChange}
        />

        <label htmlFor="context">Contexto</label>
        <textarea
          id="context"
          name="context"
          rows={3}
          placeholder="Quando usar este endpoint? Qual o formato da resposta?"
          value={form.context}
          onChange={handleChange}
        />

        <label htmlFor="payload">Payload Base</label>
        <textarea
          id="payload"
          name="payload"
          rows={6}
          value={form.payload}
          onChange={handleChange}
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar endpoint'}
        </button>
        {error && <div className="status-message" style={{ color: '#dc2626' }}>{error}</div>}
      </form>

      <div className="endpoint-list">
        <h3>Endpoints cadastrados</h3>
        {endpoints.length === 0 && <p>Nenhum endpoint cadastrado ainda.</p>}
        {endpoints.map((endpoint) => (
          <div className="endpoint-item" key={endpoint.id}>
            <h3>{endpoint.name || 'Sem nome'}</h3>
            <p><strong>URL:</strong> {endpoint.endpoint_url}</p>
            <p><strong>Método:</strong> {endpoint.method}</p>
            {endpoint.context && <p><strong>Contexto:</strong> {endpoint.context}</p>}
            {endpoint.payload && (
              <details>
                <summary>Payload base</summary>
                <pre>{endpoint.payload}</pre>
              </details>
            )}
            <div className="endpoint-actions">
              <button type="button" onClick={() => handleDelete(endpoint.id)}>
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
