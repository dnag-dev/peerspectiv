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
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#0B1829" }}>
        <ClientSidebar companyName={companyName} role={role} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar companyName={companyName} />
          <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#0B1829" }}>
            {children}
          </main>
        </div>
      </div>
    </RoleContext.Provider>
  );
}

function TopBar({ companyName }: { companyName: string }) {
  return (
    <header
      className="flex h-16 flex-shrink-0 items-center justify-between border-b px-6 lg:px-6"
      style={{ backgroundColor: "#0F2040", borderColor: "#1A3050" }}
    >
      <h1 className="pl-10 lg:pl-0 text-base font-semibold text-white">
        {companyName} — Client Portal
      </h1>
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider text-gray-400">Q1 2026</span>
      </div>
    </header>
  );
}
