"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
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
// because each tab embeds the standard per-case PeerCaseSplit form.
//
// Listens for "peerspectiv:save-and-next" custom events dispatched by
// ReviewForm's "Save & Next Chart" button to advance to the next tab.
export function GroupCaseTabs({ tabs }: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");

  const goToNext = useCallback(() => {
    const currentIdx = tabs.findIndex((t) => t.id === activeTab);
    if (currentIdx >= 0 && currentIdx < tabs.length - 1) {
      setActiveTab(tabs[currentIdx + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab, tabs]);

  useEffect(() => {
    const handler = () => goToNext();
    window.addEventListener("peerspectiv:save-and-next", handler);
    return () => window.removeEventListener("peerspectiv:save-and-next", handler);
  }, [goToNext]);

  return (
    <TabsPrimitive.Root
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-shrink-0 border-b border-border-subtle px-4 pt-3 lg:px-6">
        <TabsPrimitive.List className="flex flex-wrap gap-1">
          {tabs.map((t, i) => (
            <TabsPrimitive.Trigger
              key={t.id}
              value={t.id}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-md border border-b-0 px-3 py-2 text-sm font-medium transition-colors",
                "data-[state=active]:border-status-info-fg/30 data-[state=active]:bg-surface-card data-[state=active]:text-status-info-fg",
                "data-[state=inactive]:border-transparent data-[state=inactive]:text-ink-secondary data-[state=inactive]:hover:text-ink-primary"
              )}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-[11px] font-mono text-ink-secondary data-[state=active]:bg-status-info-bg data-[state=active]:text-status-info-fg">
                {i + 1}
              </span>
              <span>{t.label}</span>
              {t.status === "completed" && (
                <span className="rounded-full bg-mint-100 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-status-success-fg">
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
