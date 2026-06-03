import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

const AI_FUNCTION_URL = 'https://adorzqjhazsfvbttlfht.supabase.co/functions/v1/ai-assistant';

const QUICK_SUGGESTIONS = [
  'Como me inscrever?',
  'Qual o percurso?',
  'Onde retirar o kit?',
  'Como funciona o pagamento?',
];

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

async function askAI(question: string): Promise<string> {
  const res = await fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'chat', question }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Olá! Sou o assistente da 022 RUNNER 🏃 Como posso te ajudar?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const reply = await askAI(text);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Desculpe, tive um problema. Tente novamente ou fale pelo WhatsApp.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
        style={{ backgroundColor: '#C9A84C' }}
        aria-label="Assistente IA"
      >
        {open ? <X size={24} color="#000" /> : <MessageCircle size={26} color="#000" />}
      </button>

      {/* Janela de chat */}
      {open && (
        <div
          className="fixed bottom-36 md:bottom-24 right-4 md:right-6 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: 340, height: 480, backgroundColor: '#111111', border: '1px solid #C9A84C' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: '#000', borderBottom: '2px solid #C9A84C' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#C9A84C' }}>
              <Bot size={20} color="#000" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Assistente 022 RUNNER</p>
              <p className="text-xs" style={{ color: '#9ca3af' }}>IA para esportistas</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-green-400">Online</span>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed"
                  style={{
                    backgroundColor: m.role === 'user' ? '#C9A84C' : '#1a1a1a',
                    color: m.role === 'user' ? '#000' : '#e5e7eb',
                    fontWeight: m.role === 'user' ? 600 : 400,
                    border: m.role === 'assistant' ? '1px solid #333' : 'none',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#9ca3af' }}>
                  <span className="animate-pulse">Digitando...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugestões rápidas */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-xs px-2.5 py-1 rounded-full border transition-colors hover:bg-yellow-900/20"
                  style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 flex gap-2" style={{ borderTop: '1px solid #333' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Digite sua dúvida..."
              className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none mt-2"
              style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333' }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="mt-2 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
              style={{ backgroundColor: '#C9A84C' }}
            >
              <Send size={16} color="#000" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
