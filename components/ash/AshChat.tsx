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
      {/* Floating button — Practitioner: mint primary, soft mint glow */}
      {!open && (
        <button
          type="button"
          aria-label="Ask Ash"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-pill bg-mint-600 px-5 py-3 text-paper shadow-lg transition-all duration-150 hover:bg-mint-700 hover:shadow-[0_0_24px_var(--mint-100)] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-600/40"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-paper opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-paper" />
          </span>
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Ask Ash</span>
        </button>
      )}

      {/* Slide-out panel — authority-900 deep surface, mint accents */}
      {open && (
        <div
          role="dialog"
          aria-label="Ash assistant"
          className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-lg border border-ink-800 bg-authority-900 shadow-modal"
          style={{ width: 384, height: 520 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-ink-800/60 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-mint-600 font-display text-sm italic font-semibold text-paper">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-paper">Ash</span>
                <span className="h-2 w-2 rounded-full bg-mint-400 shadow-[0_0_6px_var(--mint-400)]" />
              </div>
              <div className="text-eyebrow text-ink-400">
                Peerspectiv AI · Always on
              </div>
            </div>
            <button
              type="button"
              aria-label="Close Ash"
              onClick={() => setOpen(false)}
              className="rounded-sm p-1 text-ink-300 transition-colors hover:bg-ink-800 hover:text-paper"
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
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-mint-600 font-display text-[10px] italic font-semibold text-paper">
                  A
                </div>
                <div className="rounded-lg rounded-bl-sm bg-ink-800/60 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-mint-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-mint-400" style={{ animationDelay: '120ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-mint-400" style={{ animationDelay: '240ms' }} />
                  </div>
                </div>
              </div>
            )}

            {!hasUserSent && suggestedPrompts.length > 0 && !loading && (
              <div className="flex flex-wrap gap-2 pt-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-pill border border-ink-700 bg-ink-800/40 px-3 py-1 text-xs text-ink-200 transition-colors hover:border-mint-600/60 hover:bg-mint-600/10 hover:text-paper"
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
            className="flex items-center gap-2 border-t border-ink-800/60 px-3 py-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Ash anything..."
              disabled={loading}
              className="flex-1 rounded-pill border border-ink-700 bg-ink-800/40 px-4 py-2 text-sm text-paper placeholder:text-ink-400 focus:border-mint-600 focus:outline-none focus:ring-[3px] focus:ring-mint-600/30 disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-mint-600 text-paper transition-colors hover:bg-mint-700 disabled:cursor-not-allowed disabled:opacity-40"
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
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-mint-600 font-display text-[10px] italic font-semibold text-paper">
          A
        </div>
        <div className="max-w-[80%] whitespace-pre-wrap rounded-lg rounded-bl-sm bg-ink-800/60 px-3 py-2 text-sm text-ink-100">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-mint-600 px-3 py-2 text-sm text-paper">
        {content}
      </div>
    </div>
  );
}
