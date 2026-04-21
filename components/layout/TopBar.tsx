"use client";

import { usePathname } from "next/navigation";
import { Menu, User } from "lucide-react";
import { useMobileNav } from "./MobileNavContext";
import { NotificationBell } from "./NotificationBell";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/companies": "Companies",
  "/batches": "Batches",
  "/assign-queue": "Assign Queue",
  "/reviewer-portal": "Reviewer Portal",
  "/reports": "Reports",
  "/command-center": "Command Center",
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname];

  // Match prefix (for nested routes like /companies/123)
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
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      {/* Left side: hamburger (mobile) + page title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          data-testid="hamburger"
          onClick={toggleMobileNav}
          className="md:hidden rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <NotificationBell />

        {/* User avatar */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white transition-opacity hover:opacity-90"
          aria-label="User menu"
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
