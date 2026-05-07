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
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-ink-200 bg-paper-surface px-4 md:px-6">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          data-testid="hamburger"
          onClick={toggleMobileNav}
          className="md:hidden rounded-sm p-2 text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-h1 text-ink-950">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-pill bg-ink-100 text-ink-700 transition-colors hover:bg-ink-200"
          aria-label="User menu"
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
