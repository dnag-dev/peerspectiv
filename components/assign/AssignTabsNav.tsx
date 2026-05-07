"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Props {
  pendingCount: number;
  assignedCount: number;
}

export function AssignTabsNav({ pendingCount, assignedCount }: Props) {
  const sp = useSearchParams();
  const tab = sp.get("tab") === "assigned" ? "assigned" : "pending";
  return (
    <div className="border-b border-border-subtle">
      <nav className="-mb-px flex gap-6" aria-label="Assign tabs">
        <TabLink href="/assign?tab=pending" active={tab === "pending"} count={pendingCount}>
          Pending approval
        </TabLink>
        <TabLink href="/assign?tab=assigned" active={tab === "assigned"} count={assignedCount}>
          Assigned
        </TabLink>
      </nav>
    </div>
  );
}

function TabLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-status-info-fg text-status-info-fg"
          : "border-transparent text-ink-secondary hover:border-border-default hover:text-ink-800"
      }`}
    >
      {children}
      <span
        className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${
          active ? "bg-status-info-bg text-status-info-fg" : "bg-ink-100 text-ink-secondary"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}
