"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FolderOpen,
  UserCheck,
  ClipboardCheck,
  BarChart3,
  Terminal,
  User,
  LogOut,
  DollarSign,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMobileNav } from "./MobileNavContext";
import { useClerkSession } from "./useClerkSession";

/**
 * Practitioner-spec unified sidebar. One component, three personas — admin
 * and reviewer use the built-in nav arrays here; client portal renders this
 * via <ClientSidebar>, which passes its own grouped nav array + persona role.
 *
 * Visual contract:
 *  - 256px wide, ink-950 surface, paper-toned text
 *  - Eyebrow group labels in uppercase
 *  - Active item: mint-400 text, mint-600/8 bg, 2px left mint border, mint icon glow
 *  - Footer: demo-mode pill ABOVE user card; user card has color-coded role chip
 */

export type SidebarRole = "admin" | "reviewer" | "cmo" | "quality" | "operations";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
  dim?: boolean;
}

interface SidebarShellProps {
  nav: SidebarNavItem[];
  /** Group order. If omitted, items render flat. */
  groups?: string[];
  role: SidebarRole;
  userName: string;
  userSubtitle: string; // email for admin/reviewer, company name for client
  onSignOut: () => void;
  onCloseMobile: () => void;
  mobileOpen: boolean;
  /** Optional sub-header line above nav (e.g. company name for client). */
  contextLabel?: string;
}

const ROLE_CHIP: Record<SidebarRole, { label: string; cls: string }> = {
  admin:      { label: "ADMIN",    cls: "bg-authority-700 text-paper" },
  reviewer:   { label: "REVIEWER", cls: "bg-mint-600/15 text-mint-400 border border-mint-600/30" },
  cmo:        { label: "CMO",      cls: "bg-info-600/20 text-info-100 border border-info-600/40" },
  quality:    { label: "QUALITY",  cls: "bg-info-600/20 text-info-100 border border-info-600/40" },
  operations: { label: "OPS",      cls: "bg-info-600/20 text-info-100 border border-info-600/40" },
};

export function SidebarShell({
  nav,
  groups,
  role,
  userName,
  userSubtitle,
  onSignOut,
  onCloseMobile,
  mobileOpen,
  contextLabel,
}: SidebarShellProps) {
  const pathname = usePathname();
  const chip = ROLE_CHIP[role];

  const renderItem = (item: SidebarNavItem) => {
    const isActive =
      item.href === pathname ||
      (item.href !== "/" && pathname.startsWith(item.href + "/"));
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onCloseMobile}
        className={`group relative flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-mint-600/10 text-mint-400"
            : "text-ink-300 hover:bg-ink-900 hover:text-paper"
        } ${item.dim ? "opacity-40" : ""}`}
      >
        {isActive && (
          <span className="absolute inset-y-1 left-0 w-[2px] rounded-r bg-mint-600" />
        )}
        <Icon
          className={`h-[18px] w-[18px] flex-shrink-0 ${
            isActive ? "[filter:drop-shadow(0_0_6px_var(--mint-600))]" : ""
          }`}
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const aside = (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col bg-ink-950">
      {/* Logo lockup */}
      <div className="flex h-20 items-center justify-between px-5">
        <div className="rounded bg-paper px-3 py-2 shadow-sm">
          <Image
            src="/peerspectiv-logo.png"
            alt="Peerspectiv"
            width={180}
            height={37}
            priority
            className="block h-auto w-[160px]"
          />
        </div>
        <button
          className="lg:hidden md:hidden text-ink-300 hover:text-paper"
          onClick={onCloseMobile}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {contextLabel && (
        <div className="px-6 pb-2 text-eyebrow text-ink-500">
          {contextLabel}
        </div>
      )}

      {/* Navigation */}
      <nav className="mt-2 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups && groups.length > 0 ? (
          groups.map((g) => (
            <div key={g}>
              <p className="px-3 pb-2 text-eyebrow text-ink-500">{g}</p>
              <div className="space-y-0.5">
                {nav.filter((i) => i.group === g).map(renderItem)}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-0.5">{nav.map(renderItem)}</div>
        )}
      </nav>

      {/* Demo Mode pill */}
      <div className="mx-3 mb-3 rounded-pill border border-warning-600/30 bg-warning-600/10 px-3 py-1.5 text-center">
        <span className="text-eyebrow text-warning-600">Demo Mode</span>
      </div>

      {/* User card */}
      <div className="border-t border-ink-800 px-3 py-3">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-pill bg-ink-800">
            <User className="h-4 w-4 text-ink-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-paper">{userName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center rounded-pill px-1.5 py-0 text-[9px] font-mono font-semibold tracking-[0.08em] ${chip.cls}`}
              >
                {chip.label}
              </span>
              <span className="truncate text-[11px] text-ink-500">{userSubtitle}</span>
            </div>
          </div>
          <button
            onClick={onSignOut}
            title="Sign out"
            data-testid="sign-out"
            className="rounded-sm p-2 text-ink-400 hover:bg-ink-900 hover:text-paper transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-ink-950/60 md:hidden"
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {aside}
      </div>
    </>
  );
}

/* ---------- Default export: admin + reviewer wrapper ---------- */

const adminNavItems: SidebarNavItem[] = [
  { label: "Dashboard",      href: "/dashboard",  icon: LayoutDashboard },
  { label: "Companies",      href: "/companies",  icon: Building2 },
  { label: "Batches",        href: "/batches",    icon: FolderOpen },
  { label: "Assign",         href: "/assign",     icon: UserCheck },
  { label: "Reviewers",      href: "/reviewers",  icon: ClipboardCheck },
  { label: "Payouts",        href: "/payouts",    icon: DollarSign },
  { label: "Reports",        href: "/reports",    icon: BarChart3 },
  { label: "Command Center", href: "/command",    icon: Terminal },
];

const reviewerNavItems: SidebarNavItem[] = [
  { label: "My Queue", href: "/reviewer/portal",   icon: ClipboardCheck },
  { label: "Earnings", href: "/reviewer/earnings", icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileNavOpen, closeMobileNav } = useMobileNav();

  const isReviewer = pathname === "/reviewer" || pathname.startsWith("/reviewer/");
  const role: SidebarRole = isReviewer ? "reviewer" : "admin";
  const navItems = isReviewer ? reviewerNavItems : adminNavItems;

  const session = useClerkSession({
    fallbackName: isReviewer ? "Dr. Richard Johnson" : "Ashton Williams",
    fallbackEmail: isReviewer ? "rjohnson@peerspectiv.com" : "admin@peerspectiv.com",
  });
  const name = isReviewer ? "Dr. Richard Johnson" : session.name;
  const email = isReviewer ? "rjohnson@peerspectiv.com" : session.email;

  async function handleLogout() {
    await session.signOut();
    router.push("/login");
  }

  return (
    <SidebarShell
      nav={navItems}
      role={role}
      userName={name}
      userSubtitle={email}
      onSignOut={handleLogout}
      onCloseMobile={closeMobileNav}
      mobileOpen={mobileNavOpen}
    />
  );
}
