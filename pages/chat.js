import { useEffect, useRef, useState } from 'react';

const initialMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'Olá! Sou a FastComm IA. Como posso ajudar hoje?'
  }
];

export default function Chat() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const historyRef = useRef(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao conversar com a IA');
      }

      const data = await response.json();
      setMessages([...updatedMessages, data.message]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card chat-container">
      <div className="chat-history" ref={historyRef}>
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.role}`}>
            <strong>{message.role === 'user' ? 'Você' : 'FastComm IA'}:</strong>
            <div>{message.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message assistant">
            <strong>FastComm IA:</strong>
            <div>Processando sua solicitação...</div>
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={sendMessage}>
        <textarea
          placeholder="Digite sua mensagem"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit" disabled={isLoading}>
          Enviar
        </button>
      </form>
      {error && <div className="status-message" style={{ color: '#dc2626' }}>{error}</div>}
      {!error && (
        <div className="status-message">
          A IA utiliza os endpoints cadastrados na aba de gestão para executar ações em seu nome.
        </div>
      )}
    </div>
  );
}
