/**
 * PersonaSidebar — single sidebar primitive for all four personas.
 * Always dark navy. Default 52px icon-only; consumers can render an
 * expanded label set themselves (kept simple for the demo).
 *
 * `currentPath` is exact-matched for `/dashboard` (root) and prefix-
 * matched otherwise — fixes the "two items active" bug.
 */
"use client";

import * as React from "react";
import Link from "next/link";

export type Persona = "admin" | "client" | "peer" | "cred";

export interface SidebarItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface PersonaSidebarProps {
  persona: Persona;
  items: SidebarItem[];
  currentPath: string;
  /** When provided, rendered above the nav (e.g. dashboard root link). */
  homeHref?: string;
}

const personaActiveBg: Record<Persona, string> = {
  admin:  "bg-[rgba(29,158,117,0.18)] text-[#5DCAA5]",
  client: "bg-[rgba(83,74,183,0.22)] text-[#AFA9EC]",
  peer:   "bg-[rgba(55,138,221,0.22)] text-[#85B7EB]",
  cred:   "bg-[rgba(186,117,23,0.22)] text-[#FAC775]",
};

function isItemActive(currentPath: string, href: string): boolean {
  // Exact match for the literal dashboard root, prefix match otherwise.
  // This prevents Dashboard + a sibling page both lighting up.
  if (href === "/" || href.endsWith("/dashboard") || href.endsWith("/portal") || href.endsWith("/credentialing")) {
    return currentPath === href;
  }
  return currentPath === href || currentPath.startsWith(href + "/");
}

export default function PersonaSidebar({
  persona,
  items,
  currentPath,
  homeHref,
}: PersonaSidebarProps) {
  return (
    <aside className="flex w-[52px] flex-col items-center gap-1 bg-surface-sidebar py-3.5">
      {/* logo */}
      <Link
        href={homeHref ?? "/"}
        className="mb-3.5 flex h-8 w-8 items-center justify-center rounded-md bg-brand transition hover:bg-brand-hover"
        aria-label="Home"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 14a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </Link>
      {items.map((item) => {
        const isActive = isItemActive(currentPath, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
              isActive
                ? personaActiveBg[persona]
                : "text-ink-onDarkMuted hover:bg-surface-sidebarHover hover:text-white"
            }`}
          >
            {item.icon}
          </Link>
        );
      })}
    </aside>
  );
}
