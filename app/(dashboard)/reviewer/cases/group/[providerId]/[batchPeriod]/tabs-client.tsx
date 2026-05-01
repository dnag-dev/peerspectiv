"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

interface TabEntry {
  id: string;
  label: string;
  status: string | null;
  content: React.ReactNode;
}

interface Props {
  tabs: TabEntry[];
}

// Section F1: Radix-tabs strip + per-tab content. Each tab renders the full
// case detail server-rendered upstream — submission flows are unchanged
// because each tab embeds the standard per-case ReviewerCaseSplit form.
export function GroupCaseTabs({ tabs }: Props) {
  const defaultValue = tabs[0]?.id ?? "";
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-shrink-0 border-b border-ink-200 px-4 pt-3 lg:px-6">
        <TabsPrimitive.List className="flex flex-wrap gap-1">
          {tabs.map((t, i) => (
            <TabsPrimitive.Trigger
              key={t.id}
              value={t.id}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-md border border-b-0 px-3 py-2 text-sm font-medium transition-colors",
                "data-[state=active]:border-cobalt-200 data-[state=active]:bg-paper-surface data-[state=active]:text-cobalt-700",
                "data-[state=inactive]:border-transparent data-[state=inactive]:text-ink-500 data-[state=inactive]:hover:text-ink-700"
              )}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-[11px] font-mono text-ink-600 data-[state=active]:bg-cobalt-100 data-[state=active]:text-cobalt-700">
                {i + 1}
              </span>
              <span>{t.label}</span>
              {t.status === "completed" && (
                <span className="rounded-full bg-mint-100 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-mint-700">
                  done
                </span>
              )}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
      </div>
      {tabs.map((t) => (
        <TabsPrimitive.Content
          key={t.id}
          value={t.id}
          className="flex min-h-0 flex-1 flex-col focus-visible:outline-none"
        >
          {t.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
