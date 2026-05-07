"use client";

/**
 * Slim utility top bar for the credentialing persona — mirrors the
 * admin + client portal pattern (breadcrumb + bell + avatar).
 */
import * as React from "react";
import { usePathname } from "next/navigation";
import { Bell, User } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/credentialing": "Dashboard",
  "/credentialing/earnings": "Earnings",
  "/credentialing/profile": "Profile",
  "/credentialing/inbox": "Inbox",
  "/credentialing/peers": "Peers",
  "/credentialing/credentials": "Credentials",
};

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const sorted = Object.keys(PAGE_TITLES).sort((a, b) => b.length - a.length);
  for (const route of sorted) {
    if (pathname.startsWith(route + "/")) return PAGE_TITLES[route];
  }
  return "Dashboard";
}

export function CredentialerTopBar() {
  const pathname = usePathname();
  const title = resolveTitle(pathname);
  return (
    <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="font-medium text-ink-primary">Credentialing</span>
        <span className="text-ink-tertiary">/</span>
        <span className="text-ink-secondary">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-ink-secondary transition-colors hover:bg-ink-100 hover:text-ink-primary"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="User menu"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-ink-secondary transition-colors hover:bg-ink-100 hover:text-ink-primary"
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
