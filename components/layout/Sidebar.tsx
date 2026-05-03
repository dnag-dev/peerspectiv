"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  FolderOpen,
  UserCheck,
  ClipboardCheck,
  ShieldCheck,
  BarChart3,
  Terminal,
  User,
  LogOut,
  DollarSign,
  Receipt,
  FileText,
  Tag,
  Settings,
  ArrowUpDown,
  X,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react";
import { useMobileNav } from "./MobileNavContext";
import { useClerkSession } from "./useClerkSession";

const COLLAPSE_STORAGE_KEY = "peerspectiv.sidebar.collapsed";

/**
 * Practitioner-spec unified sidebar. One component, three personas — admin
 * and peer use the built-in nav arrays here; client portal renders this
 * via <ClientSidebar>, which passes its own grouped nav array + persona role.
 *
 * Visual contract:
 *  - 256px wide, ink-950 surface, paper-toned text
 *  - Eyebrow group labels in uppercase
 *  - Active item: mint-400 text, mint-600/8 bg, 2px left mint border, mint icon glow
 *  - Footer: demo-mode pill ABOVE user card; user card has color-coded role chip
 */

export type SidebarRole = "admin" | "peer" | "cmo" | "quality" | "operations";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
  dim?: boolean;
  /** Optional count badge — only rendered when > 0. */
  badge?: number;
}

interface SidebarShellProps {
  nav: SidebarNavItem[];
  /** Group order. If omitted, items render flat. */
  groups?: string[];
  role: SidebarRole;
  userName: string;
  userSubtitle: string; // email for admin/peer, company name for client
  onSignOut: () => void;
  onCloseMobile: () => void;
  mobileOpen: boolean;
  /** Optional sub-header line above nav (e.g. company name for client). */
  contextLabel?: string;
}

const ROLE_CHIP: Record<SidebarRole, { label: string; cls: string }> = {
  admin:      { label: "ADMIN",    cls: "bg-cobalt-100 text-cobalt-800" },
  peer:   { label: "PEER", cls: "bg-mint-100 text-mint-700" },
  cmo:        { label: "CMO",      cls: "bg-cobalt-100 text-cobalt-800" },
  quality:    { label: "QUALITY",  cls: "bg-cobalt-100 text-cobalt-800" },
  operations: { label: "OPS",      cls: "bg-cobalt-100 text-cobalt-800" },
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

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
        title={collapsed ? item.label : undefined}
        className={`group relative flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-md px-3 py-2 text-sm font-medium transition-all ${
          isActive
            ? "bg-paper-surface text-cobalt-900 shadow-sm"
            : "text-cobalt-100 hover:bg-cobalt-700/40 hover:text-white"
        } ${item.dim ? "opacity-50" : ""}`}
      >
        <Icon
          className="h-[18px] w-[18px] flex-shrink-0"
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && typeof item.badge === "number" && item.badge > 0 && (
          <span
            className={`ml-auto inline-flex min-w-[20px] items-center justify-center rounded-pill px-1.5 py-0.5 font-mono text-[10px] font-medium ${
              isActive
                ? "bg-cobalt-100 text-cobalt-800"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const aside = (
    <aside className={`flex h-full ${collapsed ? "w-16" : "w-64"} flex-shrink-0 flex-col bg-cobalt-900 transition-[width] duration-150`}>
      {/* Logo lockup */}
      <div className={`flex h-20 items-center ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}>
        {!collapsed && (
          <div className="rounded-md bg-paper-surface px-3 py-2 shadow-sm">
            <Image
              src="/peerspectiv-logo.png"
              alt="Peerspectiv"
              width={180}
              height={37}
              priority
              className="block h-auto w-[160px]"
            />
          </div>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-paper-surface text-cobalt-900 font-bold text-sm">
            P
          </div>
        )}
        <button
          className="lg:hidden md:hidden text-cobalt-100 hover:text-white"
          onClick={onCloseMobile}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {contextLabel && !collapsed && (
        <div className="px-6 pb-2 text-eyebrow text-cobalt-200">
          {contextLabel}
        </div>
      )}

      {/* Navigation */}
      <nav className="mt-2 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups && groups.length > 0 ? (
          groups.map((g) => (
            <div key={g}>
              {!collapsed && (
                <p className="px-3 pb-2 text-eyebrow text-cobalt-200">{g}</p>
              )}
              <div className="space-y-0.5">
                {nav.filter((i) => i.group === g).map(renderItem)}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-0.5">{nav.map(renderItem)}</div>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        data-testid="sidebar-collapse-toggle"
        onClick={toggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="mx-3 mb-2 flex items-center justify-center rounded-md border border-cobalt-700/50 bg-cobalt-800/40 px-2 py-1.5 text-cobalt-100 hover:bg-cobalt-700/40 hover:text-white transition-colors"
      >
        {collapsed ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronsLeft className="h-4 w-4" />
            <span className="ml-2 text-xs">Collapse</span>
          </>
        )}
      </button>

      {/* Demo Mode pill — amber for visibility on cobalt */}
      {!collapsed && (
        <div className="mx-3 mb-3 rounded-pill border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-center">
          <span className="text-eyebrow text-amber-500">Demo Mode</span>
        </div>
      )}

      {/* User card on white-tint surface */}
      <div className="border-t border-cobalt-800/60 bg-white/5 px-3 py-3">
        <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "gap-3 px-2"}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-pill bg-cobalt-700">
            <User className="h-4 w-4 text-cobalt-100" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center rounded-sm px-1.5 py-0 text-[9px] font-mono font-medium tracking-[0.10em] ${chip.cls}`}
                >
                  {chip.label}
                </span>
                <span className="truncate text-[11px] text-cobalt-200">{userSubtitle}</span>
              </div>
            </div>
          )}
          <button
            onClick={onSignOut}
            title="Sign out"
            data-testid="sign-out"
            className="rounded-md p-2 text-cobalt-200 hover:bg-cobalt-700/50 hover:text-white transition-colors"
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

/* ---------- Default export: admin + peer wrapper ---------- */

function buildAdminNavItems(openReassignmentCount = 0): SidebarNavItem[] {
  return [
    // Primary tier
    { label: "Dashboard",       href: "/dashboard",  icon: LayoutDashboard,  group: "Workspace" },
    { label: "Reviews",         href: "/cases",      icon: ClipboardCheck,   group: "Workspace" },
    { label: "Reports",         href: "/reports",    icon: BarChart3,        group: "Workspace" },
    { label: "Peers",           href: "/peers",      icon: UserCheck,        group: "Workspace" },
    { label: "Companies",       href: "/companies",  icon: Building2,        group: "Workspace" },
    { label: "Forms",           href: "/forms",      icon: FileText,         group: "Workspace" },
    { label: "Tags",            href: "/tags",       icon: Tag,              group: "Workspace" },
    { label: "Settings",        href: "/settings",   icon: Settings,         group: "Workspace" },
    // Second-tier admin tools
    { label: "Batches",         href: "/batches",    icon: FolderOpen,       group: "Admin Tools" },
    { label: "Assignments",     href: "/assignments", icon: ArrowUpDown,     group: "Admin Tools", badge: openReassignmentCount },
    { label: "Credentials",     href: "/credentials", icon: ShieldCheck,     group: "Admin Tools" },
    { label: "Payouts",         href: "/payouts",    icon: DollarSign,       group: "Admin Tools" },
    { label: "Invoices",        href: "/invoices",   icon: Receipt,          group: "Admin Tools" },
    { label: "Command Center",  href: "/command",    icon: Terminal,         group: "Admin Tools" },
  ];
}

const ADMIN_GROUPS = ["Workspace", "Admin Tools"];

const peerNavItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/peer/portal",   icon: LayoutDashboard },
  { label: "Profile",   href: "/peer/profile",  icon: User },
];

export function Sidebar({ openReassignmentCount = 0 }: { openReassignmentCount?: number } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileNavOpen, closeMobileNav } = useMobileNav();

  const isPeer = pathname === "/peer" || pathname.startsWith("/peer/");
  const role: SidebarRole = isPeer ? "peer" : "admin";
  const navItems = isPeer ? peerNavItems : buildAdminNavItems(openReassignmentCount);

  const session = useClerkSession({
    fallbackName: isPeer ? "Dr. Richard Johnson" : "Ashton Williams",
    fallbackEmail: isPeer ? "rjohnson@peerspectiv.com" : "admin@peerspectiv.com",
  });
  const name = isPeer ? "Dr. Richard Johnson" : session.name;
  const email = isPeer ? "rjohnson@peerspectiv.com" : session.email;

  async function handleLogout() {
    await session.signOut();
    router.push("/login");
  }

  return (
    <SidebarShell
      nav={navItems}
      groups={isPeer ? undefined : ADMIN_GROUPS}
      role={role}
      userName={name}
      userSubtitle={email}
      onSignOut={handleLogout}
      onCloseMobile={closeMobileNav}
      mobileOpen={mobileNavOpen}
    />
  );
}
