"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ClientSidebar, ClientRole } from "./ClientSidebar";

const PAGE_TITLES: Record<string, string> = {
  "/portal":             "Compliance dashboard",
  "/portal/quality":     "Quality reports",
  "/portal/batches":     "Batches",
  "/portal/current-period": "Current period reviews",
  "/portal/reviews":     "Reviews",
  "/portal/trends":      "Trends",
  "/portal/providers":   "Providers",
  "/portal/invoices":    "Invoices",
  "/portal/forms":       "Forms",
  "/portal/upload":      "Submit records",
  "/portal/feedback":    "Share feedback",
  "/portal/reports":     "Reports",
  "/portal/profile":     "Profile",
  "/portal/export":      "Export & reports",
  "/portal/corrective":  "Corrective actions",
  "/portal/welcome":     "Welcome",
  "/portal/submit":      "Submit a batch",
};

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const sorted = Object.keys(PAGE_TITLES).sort((a, b) => b.length - a.length);
  for (const route of sorted) {
    if (pathname.startsWith(route + "/")) return PAGE_TITLES[route];
  }
  return "Compliance dashboard";
}

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
  const pathname = usePathname();
  const title = resolveTitle(pathname);
  return (
    // Slim utility strip — pages render their own eyebrow + h1 as the
    // primary header. This row carries breadcrumb context + cadence pill.
    <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-6">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="font-medium text-ink-primary">{companyName}</span>
        <span className="text-ink-tertiary">/</span>
        <span className="text-ink-secondary">{title}</span>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-status-info-bg px-2 py-0.5 text-2xs font-medium text-status-info-fg">
        <span className="h-1.5 w-1.5 rounded-full bg-status-info-dot" />
        Q1 2026
      </span>
    </header>
  );
}
