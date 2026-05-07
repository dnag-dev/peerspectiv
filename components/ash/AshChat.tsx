'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Send, X } from 'lucide-react';
import { SparkIcon } from '@/components/ui/pulse';

type Portal = 'admin' | 'client' | 'peer' | 'credentialer';

/**
 * Phase 8.1 — Peer-route prompt overrides.
 *
 * Peer routes live under /peer/* but inherit the admin (dashboard) layout for
 * historical reasons. Until peer gets its own layout, swap prompts + portal
 * client-side based on the pathname so peers see the peer-tailored quick
 * actions in their Ask Ash drawer.
 */
const PEER_ROUTE_PROMPTS = [
  'Explain this chart in plain English',
  "What's the default answer for question 5?",
  "Summarize the chart's medications",
];

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
  const pathname = usePathname() ?? '';
  const isPeerRoute = pathname.startsWith('/peer');
  const effectivePortal: Portal = isPeerRoute ? 'peer' : portal;
  const effectivePrompts = useMemo(
    () => (isPeerRoute ? PEER_ROUTE_PROMPTS : suggestedPrompts),
    [isPeerRoute, suggestedPrompts]
  );

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
          portal: effectivePortal,
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
      {/* Floating button — cobalt with mint ping pulse */}
      {!open && (
        <button
          type="button"
          aria-label="Ask Ash"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-pill bg-cobalt-700 px-5 py-3 text-white shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:bg-cobalt-800 hover:shadow-xl focus:outline-none focus-visible:ring-[3px] focus-visible:ring-cobalt-300/40"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-mint-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-500" />
          </span>
          <SparkIcon className="h-3 w-3" />
          <span className="text-sm font-medium">Ask Ash</span>
        </button>
      )}

      {/* Drawer — white surface, cobalt header strip */}
      {open && (
        <div
          role="dialog"
          aria-label="Ash assistant"
          className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-modal"
          style={{ width: 384, height: 520 }}
        >
          {/* Header strip */}
          <div className="flex items-center gap-3 bg-cobalt-700 px-4 py-3 text-white">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-white/20">
              <SparkIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Ash</span>
                <span className="h-2 w-2 rounded-full bg-mint-500 shadow-[0_0_6px_var(--mint-500)]" />
              </div>
              <div className="text-eyebrow text-cobalt-100">
                Your peer review co-pilot
              </div>
            </div>
            <button
              type="button"
              aria-label="Close Ash"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-surface-canvas px-4 py-3"
          >
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))}

            {loading && (
              <div className="flex items-end gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-cobalt-700 text-white">
                  <SparkIcon className="h-3 w-3" />
                </div>
                <div className="rounded-lg rounded-bl-sm border border-cobalt-100 bg-status-info-bg px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cobalt-500" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cobalt-500" style={{ animationDelay: '200ms' }} />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cobalt-500" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              </div>
            )}

            {!hasUserSent && effectivePrompts.length > 0 && !loading && (
              <div className="flex flex-wrap gap-2 pt-2">
                {effectivePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-md border border-status-info-fg/30 bg-surface-card px-3 py-1 text-xs text-status-info-fg transition-colors hover:bg-status-info-bg"
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
            className="flex items-center gap-2 border-t border-border-subtle bg-surface-card px-3 py-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Ash anything..."
              disabled={loading}
              className="flex-1 rounded-md border border-border-subtle bg-surface-card px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary focus:border-cobalt-500 focus:outline-none focus:ring-[3px] focus:ring-cobalt-300/30 disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cobalt-700 text-white transition-colors hover:bg-cobalt-800 disabled:cursor-not-allowed disabled:opacity-40"
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
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-cobalt-700 text-white">
          <SparkIcon className="h-3 w-3" />
        </div>
        <div className="max-w-[80%] whitespace-pre-wrap rounded-lg rounded-bl-sm border border-cobalt-100 bg-status-info-bg px-3 py-2 text-sm text-ink-primary">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-ink-100 px-3 py-2 text-sm text-ink-primary">
        {content}
      </div>
    </div>
  );
}
