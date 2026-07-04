import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AI_FUNCTION_URL = 'https://adorzqjhazsfvbttlfht.supabase.co/functions/v1/ai-assistant';
const ANON_KEY = 'sb_publishable_b098wEy_wai6_RWuR5pV7g_IAw-x86p';

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

async function askAI(question: string, userId: string | null, pageUrl: string): Promise<string> {
  const res = await fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ type: 'chat', question, userId, pageUrl }),
  });
  if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text || data.reply || data.message || JSON.stringify(data);
}

export function ChatBot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Eai povo! 🏃 Sou o LEO 022RUNNERS! Na pista ou na dúvida, tô aqui! Como posso ajudar?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, []);

  const typeMessage = useCallback((text: string): Promise<void> => {
    return new Promise(resolve => {
      setMessages(prev => [...prev, { role: 'assistant', text: '' }]);
      let i = 0;
      typingRef.current = setInterval(() => {
        i++;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', text: text.slice(0, i) };
          return updated;
        });
        if (i >= text.length) {
          if (typingRef.current) clearInterval(typingRef.current);
          typingRef.current = null;
          resolve();
        }
      }, 30);
    });
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const reply = await askAI(text, user?.id ?? null, window.location.pathname);
      await new Promise(r => setTimeout(r, 800));
      setLoading(false);
      await typeMessage(reply);
    } catch (err: any) {
      const detail = err?.message ? ` (${err.message})` : '';
      await new Promise(r => setTimeout(r, 800));
      setLoading(false);
      await typeMessage(`Não consegui processar sua pergunta${detail}. Fala direto com o Leandro: https://wa.me/5522974044125 😄`);
    }
  };

  return (
    <>
      {/* CSS keyframes — corredor animado + pontos de digitação */}
      <style>{`
        @keyframes leo-arm-l {
          0%, 100% { transform: rotate(-30deg); }
          50%       { transform: rotate(30deg);  }
        }
        @keyframes leo-arm-r {
          0%, 100% { transform: rotate(30deg);  }
          50%       { transform: rotate(-30deg); }
        }
        @keyframes leo-leg-l {
          0%, 100% { transform: rotate(40deg);  }
          50%       { transform: rotate(-40deg); }
        }
        @keyframes leo-leg-r {
          0%, 100% { transform: rotate(-40deg); }
          50%       { transform: rotate(40deg);  }
        }
        .leo-run-arm-l {
          transform-origin: 15px 9px;
          animation: leo-arm-l 0.6s linear infinite;
        }
        .leo-run-arm-r {
          transform-origin: 15px 9px;
          animation: leo-arm-r 0.6s linear infinite;
        }
        .leo-run-leg-l {
          transform-origin: 15px 18px;
          animation: leo-leg-l 0.6s linear infinite;
        }
        .leo-run-leg-r {
          transform-origin: 15px 18px;
          animation: leo-leg-r 0.6s linear infinite;
        }
        @keyframes leo-dot {
          0%, 60%, 100% { opacity: 0.2; }
          30%           { opacity: 1;   }
        }
        .leo-dot-1 { display: inline-block; animation: leo-dot 1.2s ease-in-out infinite 0s;   }
        .leo-dot-2 { display: inline-block; animation: leo-dot 1.2s ease-in-out infinite 0.2s; }
        .leo-dot-3 { display: inline-block; animation: leo-dot 1.2s ease-in-out infinite 0.4s; }
        .leo-bib-btn { bottom: 80px; right: 20px; }
        @media (min-width: 768px) { .leo-bib-btn { bottom: 20px; } }
      `}</style>

      {/* Botão flutuante — número de peito LEO com corredor animado */}
      <button
        onClick={() => setOpen(o => !o)}
        className="leo-bib-btn fixed z-50 transition-all duration-200"
        style={{
          width: '65px',
          height: '80px',
          backgroundColor: '#fff',
          border: '3px solid #C9A84C',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(201,168,76,0.35), 0 2px 6px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          cursor: 'pointer',
          padding: '6px 4px',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(201,168,76,0.55), 0 2px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(201,168,76,0.35), 0 2px 6px rgba(0,0,0,0.12)';
        }}
        aria-label="LEO 022RUNNERS"
      >
        {open ? (
          <X size={22} color="#000" />
        ) : (
          <>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" overflow="visible" style={{ flexShrink: 0 }}>
              <circle cx="15" cy="4" r="2.5" fill="#C9A84C" />
              <line x1="15" y1="6.5" x2="15" y2="18" stroke="#111" strokeWidth="2" strokeLinecap="round" />
              <line className="leo-run-arm-l" x1="15" y1="9" x2="9" y2="15" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
              <line className="leo-run-arm-r" x1="15" y1="9" x2="21" y2="15" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
              <line className="leo-run-leg-l" x1="15" y1="18" x2="10" y2="26" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
              <line className="leo-run-leg-r" x1="15" y1="18" x2="20" y2="26" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span style={{ fontWeight: 900, fontSize: '14px', color: '#000', letterSpacing: '1.5px', lineHeight: 1 }}>LEO</span>
            <div style={{ width: '80%', height: '1.5px', backgroundColor: '#C9A84C', margin: '2px 0' }} />
            <span style={{ fontWeight: 700, fontSize: '11px', color: '#C9A84C', letterSpacing: '2px', lineHeight: 1 }}>022</span>
          </>
        )}
      </button>

      {/* Janela de chat */}
      {open && (
        <div
          className="fixed bottom-36 md:bottom-24 right-4 md:right-6 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: 340, height: 480, backgroundColor: '#111111', border: '1px solid #C9A84C' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: '#000', borderBottom: '2px solid #C9A84C' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#C9A84C', fontSize: 22 }}>
              🏃
            </div>
            <div>
              <p className="font-bold text-white text-sm">LEO 022RUNNERS</p>
              <p className="text-xs" style={{ color: '#9ca3af' }}>Assistente virtual corredor</p>
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
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {/* Bolha de digitação com 3 pontos animados */}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#9ca3af' }}>
                  LEO está digitando
                  <span className="leo-dot-1">.</span>
                  <span className="leo-dot-2">.</span>
                  <span className="leo-dot-3">.</span>
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
              placeholder="Pergunte ao LEO..."
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
