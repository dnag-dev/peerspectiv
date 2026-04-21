'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

type Portal = 'admin' | 'client' | 'reviewer';

interface AshChatProps {
  portal: Portal;
  context: Record<string, any>;
  initialGreeting: string;
  suggestedPrompts: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AshChat({
  portal,
  context,
  initialGreeting,
  suggestedPrompts,
}: AshChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: initialGreeting },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) {
      // small delay to allow panel to mount
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const hasUserSent = messages.some((m) => m.role === 'user');

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          portal,
          context,
          // send prior history (excluding the greeting) so server has conversation memory
          conversationHistory: messages.filter(
            (m, i) => !(i === 0 && m.role === 'assistant')
          ),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { message: string };
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry — I hit an error: ${
            err?.message ?? 'unknown error'
          }. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          aria-label="Ask Ash"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          style={{ backgroundColor: '#2E6FE8' }}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Ask Ash</span>
        </button>
      )}

      {/* Slide-out panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Ash assistant"
          className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
          style={{
            width: 384,
            height: 520,
            backgroundColor: '#0F2040',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: '#2E6FE8' }}
            >
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Ash</span>
                <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
              </div>
              <div className="text-[11px] text-white/50">
                Peerspectiv AI · Always on
              </div>
            </div>
            <button
              type="button"
              aria-label="Close Ash"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))}

            {loading && (
              <div className="flex items-end gap-2">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: '#2E6FE8' }}
                >
                  A
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-white/70"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-white/70"
                      style={{ animationDelay: '120ms' }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-white/70"
                      style={{ animationDelay: '240ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Suggested prompts — only before first user message */}
            {!hasUserSent && suggestedPrompts.length > 0 && !loading && (
              <div className="flex flex-wrap gap-2 pt-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:border-blue-400/60 hover:bg-blue-500/10 hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-white/10 px-3 py-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Ash anything..."
              disabled={loading}
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-blue-400/60 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: '#2E6FE8' }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function MessageBubble({
  role,
  content,
}: {
  role: 'user' | 'assistant';
  content: string;
}) {
  if (role === 'assistant') {
    return (
      <div className="flex items-end gap-2">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundColor: '#2E6FE8' }}
        >
          A
        </div>
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2 text-sm text-white/90">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white"
        style={{ backgroundColor: '#2E6FE8' }}
      >
        {content}
      </div>
    </div>
  );
}
