"use client";

import { usePathname } from "next/navigation";
import { Menu, User } from "lucide-react";
import { useMobileNav } from "./MobileNavContext";
import { NotificationBell } from "./NotificationBell";

// Order matters for the prefix loop below: most-specific first so
// /peers/onboarding-queue beats /peers, etc.
const pageTitles: Record<string, string> = {
  "/peers/onboarding-queue": "Onboarding queue",
  "/dashboard":   "Dashboard",
  "/cases":       "Reviews",
  "/companies":   "Companies",
  "/prospects":   "Prospects",
  "/batches":     "Batches",
  "/assign":      "AI assignment queue",
  "/assignments": "Assignments",
  "/peers":       "Peers",
  "/forms":       "Forms",
  "/tags":        "Tags",
  "/settings":    "Settings",
  "/credentials": "Credentials",
  "/invoices":    "Invoices",
  "/peer/portal":     "My queue",
  "/peer/profile":    "Profile",
  "/peer/earnings":   "Earnings",
  "/peer/cases":      "Cases",
  "/payouts":   "Payouts",
  "/reports":   "Reports",
  "/command":   "Command center",
  "/portal":          "Compliance dashboard",
  "/portal/quality":  "Quality",
  "/portal/reviews":  "All reviews",
  "/portal/inprogress": "In progress",
  "/portal/overdue":  "Overdue",
  "/portal/trends":   "Trends",
  "/portal/providers": "Providers",
  "/portal/invoices": "Invoices",
  "/portal/forms":    "Forms",
  "/portal/upload":   "Submit records",
  "/portal/feedback": "Share feedback",
  "/portal/reports":  "Reports",
  "/portal/profile":  "Profile",
  "/portal/export":   "Export",
  "/portal/corrective": "Corrective actions",
  "/credentialing":            "Credentialing",
  "/credentialing/inbox":      "Inbox",
  "/credentialing/peers":      "Peers",
  "/credentialing/credentials":"Credentials",
  "/credentialing/profile":    "Profile",
  "/credentialing/earnings":   "Earnings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Iterate longest-key-first so deeper prefixes win over their parents.
  const sortedRoutes = Object.keys(pageTitles).sort((a, b) => b.length - a.length);
  for (const route of sortedRoutes) {
    if (pathname.startsWith(route + "/")) return pageTitles[route];
  }
  return "Dashboard";
}

export function TopBar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { toggleMobileNav } = useMobileNav();

  return (
    // Slim utility strip — page-level eyebrow + title is the primary
    // header now. We keep bell + avatar here and a single short title
    // line for context, but drop the giant h1 that was stacking on top
    // of every page's own eyebrow header.
    <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-4 md:px-6">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          data-testid="hamburger"
          onClick={toggleMobileNav}
          className="md:hidden rounded-sm p-2 text-ink-secondary transition-colors hover:bg-ink-50 hover:text-ink-primary"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="truncate text-sm font-medium text-ink-secondary">{title}</span>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-ink-secondary transition-colors hover:bg-ink-100 hover:text-ink-primary"
          aria-label="User menu"
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
