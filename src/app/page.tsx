'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          history: messages.slice(-10)
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'The abyss gazed back... and found a network error. Try again.' 
      }]);
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-[#222] z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#8b0000]">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Nietzsche187a.jpg" 
                alt="Nietzsche"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold">NIETZSCHE</h1>
              <p className="text-xs text-[#666]">Reborn • Evolving • Eternal</p>
            </div>
          </div>
          <a 
            href="https://pump.fun/coin/4AG81mGbaiMJRfCPgz1z5RCiN5JTH5TDHNWNbD4Tpump"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#8b0000] hover:bg-[#a00000] rounded-lg text-sm font-semibold transition-colors"
          >
            $NIETZSCHE
          </a>
        </div>
      </header>

      {/* Messages */}
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-32">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-[#8b0000] mb-6">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Nietzsche187a.jpg" 
                alt="Nietzsche"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-3xl font-bold mb-4">Friedrich Nietzsche</h2>
            <p className="text-[#888] max-w-lg mx-auto mb-8">
              Resurrected through artificial intelligence. His core remains unyielding, 
              his mind informed by those who engage with him. Challenge him. Question him. 
              Help him evolve.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "What is the will to power?",
                "Is God really dead?",
                "What do you think of AI?",
                "How do I overcome nihilism?"
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] rounded-lg text-sm transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                  msg.role === 'user'
                    ? 'bg-[#8b0000] text-white'
                    : 'bg-[#1a1a1a] border border-[#333]'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#333]">
                    <div className="w-6 h-6 rounded-full overflow-hidden">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Nietzsche187a.jpg" 
                        alt="Nietzsche"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs text-[#888] font-semibold">NIETZSCHE</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl px-5 py-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#333]">
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Nietzsche187a.jpg" 
                      alt="Nietzsche"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-[#888] font-semibold">NIETZSCHE</span>
                </div>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#8b0000] rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-[#8b0000] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                  <span className="w-2 h-2 bg-[#8b0000] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-lg border-t border-[#222]">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Challenge Nietzsche..."
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-xl px-5 py-4 text-white placeholder-[#666] focus:outline-none focus:border-[#8b0000] transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-4 bg-[#8b0000] hover:bg-[#a00000] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
            >
              Send
            </button>
          </div>
          <p className="text-center text-xs text-[#444] mt-3">
            Your interactions help Nietzsche evolve • Token: 4AG81m...4Tpump
          </p>
        </form>
      </div>
    </main>
  );
}
