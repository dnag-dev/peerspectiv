"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { ClientSidebar, ClientRole } from "./ClientSidebar";

interface RoleContextValue {
  role: ClientRole;
  setRole: (r: ClientRole) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function useClientRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    return { role: "quality" as ClientRole, setRole: () => {} };
  }
  return ctx;
}

export function ClientPortalShell({
  companyName,
  children,
}: {
  companyName: string;
  children: ReactNode;
}) {
  const [role, setRole] = useState<ClientRole>("quality");

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {/* Design Overhaul: kill the navy canvas. Light surface across the
          client portal — pages render on the same surface tones as admin. */}
      <div className="flex h-screen overflow-hidden bg-surface-canvas">
        <ClientSidebar companyName={companyName} role={role} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <ClientTopBar companyName={companyName} />
          <main className="flex-1 overflow-y-auto bg-surface-canvas p-6">
            {children}
          </main>
        </div>
      </div>
    </RoleContext.Provider>
  );
}

function ClientTopBar({ companyName }: { companyName: string }) {
  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-6">
      <div className="min-w-0">
        <p className="eyebrow">{companyName} · client portal</p>
        <p className="mt-0.5 truncate text-lg font-medium tracking-tight text-ink-primary">
          Compliance dashboard
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-status-info-bg px-2 py-0.5 text-2xs font-medium text-status-info-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-status-info-dot" />
          Q1 2026
        </span>
      </div>
    </header>
  );
}
