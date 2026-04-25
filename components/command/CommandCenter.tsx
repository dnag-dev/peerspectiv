"use client";

import { useRef, useState, useEffect, useCallback, type KeyboardEvent } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CommandResponse } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TableData {
  headers: string[];
  rows: string[][];
}

interface MessageContent {
  text?: string;
  table?: TableData;
  cards?: { label: string; value: string | number }[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: MessageContent;
  timestamp: Date;
}

/* ------------------------------------------------------------------ */
/*  Quick-command chips                                                */
/* ------------------------------------------------------------------ */

const QUICK_COMMANDS = [
  "Past-due cases?",
  "Reviewer rankings",
  "Assign new batch",
  "Generate QAPI report",
  "Dashboard stats",
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Turn a CommandResponse into renderable content blocks. */
function parseResponse(res: CommandResponse): MessageContent {
  const content: MessageContent = {};

  // Always include the plain-english text
  if (res.plain_english_response) {
    content.text = res.plain_english_response;
  }

  // Attempt to render structured data
  if (res.data) {
    // If the API returned an array-of-objects, render as a table
    if (Array.isArray(res.data) && res.data.length > 0 && typeof res.data[0] === "object") {
      const rows = res.data as Record<string, unknown>[];
      const headers = Object.keys(rows[0]);
      content.table = {
        headers,
        rows: rows.map((r) => headers.map((h) => String(r[h] ?? ""))),
      };
    }

    // If the API returned an object with numeric/string leaves, show as cards
    if (
      !Array.isArray(res.data) &&
      typeof res.data === "object" &&
      res.data !== null
    ) {
      const entries = Object.entries(res.data as Record<string, unknown>);
      const isFlat = entries.every(
        ([, v]) => typeof v === "string" || typeof v === "number"
      );
      if (isFlat && entries.length > 0) {
        content.cards = entries.map(([label, value]) => ({
          label: label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          value: value as string | number,
        }));
      }
    }
  }

  return content;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function DataTable({ table }: { table: TableData }) {
  return (
    <div className="mt-3 overflow-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {table.headers.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
              >
                {h.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr
              key={i}
              className="border-b last:border-0 transition-colors hover:bg-muted/30"
            >
              {row.map((cell, j) => (
                <td key={j} className="whitespace-nowrap px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusCards({ cards }: { cards: { label: string; value: string | number }[] }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border bg-muted/30 p-3 text-center"
        >
          <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
          <p className="mt-1 text-lg font-semibold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function CommandCenter() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "assistant",
      content: {
        text: "Welcome to Peerspectiv Command Center. I can help you manage cases, check stats, and generate reports. What would you like to do?",
      },
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      // Add user message
      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: { text: trimmed },
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch("/api/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command_text: trimmed }),
        });

        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }

        const json = (await res.json()) as { data: CommandResponse };
        const parsed = parseResponse(json.data);

        const assistantMsg: Message = {
          id: uid(),
          role: "assistant",
          content: parsed,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errMsg: Message = {
          id: uid(),
          role: "assistant",
          content: {
            text:
              err instanceof Error
                ? `Something went wrong: ${err.message}. Please try again.`
                : "An unexpected error occurred. Please try again.",
          },
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [isLoading]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border bg-white shadow-sm">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/10">
                <Bot className="h-4 w-4 text-mint-600" />
              </div>
            )}

            <div
              className={
                msg.role === "user"
                  ? "max-w-[75%] rounded-2xl rounded-br-sm bg-brand-blue px-4 py-2.5 text-sm text-white"
                  : "max-w-[85%]"
              }
            >
              {msg.role === "assistant" ? (
                <Card className="border-0 shadow-none bg-gray-50">
                  <CardContent className="p-3">
                    {msg.content.text && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content.text}
                      </p>
                    )}
                    {msg.content.table && <DataTable table={msg.content.table} />}
                    {msg.content.cards && <StatusCards cards={msg.content.cards} />}
                  </CardContent>
                </Card>
              ) : (
                <span>{msg.content.text}</span>
              )}
            </div>

            {msg.role === "user" && (
              <div className="ml-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                <User className="h-4 w-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/10">
              <Bot className="h-4 w-4 text-mint-600" />
            </div>
            <Card className="border-0 shadow-none bg-gray-50">
              <CardContent className="p-3">
                <TypingIndicator />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Quick commands + input area */}
      <div className="border-t bg-white p-4">
        {/* Quick-command chips */}
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              type="button"
              disabled={isLoading}
              onClick={() => sendMessage(cmd)}
              className="rounded-full border border-brand-blue/30 bg-brand-blue/5 px-3 py-1 text-xs font-medium text-mint-600 transition-colors hover:bg-brand-blue/10 disabled:opacity-50"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or question..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            aria-label="Send command"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
