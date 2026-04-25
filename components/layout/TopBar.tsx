"use client";

import { usePathname } from "next/navigation";
import { Menu, User } from "lucide-react";
import { useMobileNav } from "./MobileNavContext";
import { NotificationBell } from "./NotificationBell";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/companies": "Companies",
  "/batches":   "Batches",
  "/assign":    "AI Assignment Queue",
  "/reviewers": "Reviewers",
  "/reviewer/portal":   "My Queue",
  "/reviewer/earnings": "Earnings",
  "/payouts":   "Payouts",
  "/reports":   "Reports",
  "/command":   "Command Center",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [route, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(route + "/")) return title;
  }
  return "Peerspectiv";
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
