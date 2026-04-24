"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileBarChart,
  Users,
  Wrench,
  Download,
  Heart,
  Menu,
  X,
  User,
  LogOut,
} from "lucide-react";
import { useClerkSession } from "./useClerkSession";

export type ClientRole = "cmo" | "quality" | "operations";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  group: "Overview" | "Reviews" | "Analytics" | "Compliance";
  dimFor?: ClientRole[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard, group: "Overview" },
  { label: "All Reviews", href: "/portal/reviews", icon: ClipboardList, group: "Reviews" },
  { label: "In Progress", href: "/portal/inprogress", icon: Clock, group: "Reviews", dimFor: ["cmo"] },
  { label: "Overdue", href: "/portal/overdue", icon: AlertTriangle, group: "Reviews", dimFor: ["cmo"] },
  { label: "Trends", href: "/portal/trends", icon: TrendingUp, group: "Analytics", dimFor: ["operations"] },
  { label: "Quality Reports", href: "/portal/quality", icon: FileBarChart, group: "Analytics", dimFor: ["operations"] },
  { label: "Providers", href: "/portal/providers", icon: Users, group: "Analytics" },
  { label: "Corrective Actions", href: "/portal/corrective", icon: Wrench, group: "Compliance" },
  { label: "Export & Reports", href: "/portal/export", icon: Download, group: "Compliance" },
  { label: "Share Feedback", href: "/portal/feedback", icon: Heart, group: "Compliance" },
];

const groups: Array<NavItem["group"]> = ["Overview", "Reviews", "Analytics", "Compliance"];

export function ClientSidebar({
  companyName,
  role,
}: {
  companyName: string;
  role: ClientRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { name: userName, signOut } = useClerkSession({
    fallbackName: "Client User",
    fallbackEmail: companyName,
  });
  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  const content = (
    <aside
      className="flex h-full w-64 flex-shrink-0 flex-col"
      style={{ backgroundColor: "#0F2040" }}
    >
      <div className="flex h-20 items-center justify-between px-5">
        <div className="rounded-md bg-white px-3 py-2 shadow-sm">
          <Image
            src="/peerspectiv-logo.png"
            alt="Peerspectiv"
            width={180}
            height={37}
            priority
            className="block h-auto w-[180px]"
          />
        </div>
        <button
          className="lg:hidden text-white"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="px-6 pb-2 text-xs uppercase tracking-wide text-gray-400">
        {companyName}
      </div>
      <nav className="mt-2 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g}>
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              {g}
            </p>
            <div className="space-y-1">
              {navItems
                .filter((i) => i.group === g)
                .map((item) => {
                  const isActive =
                    item.href === "/portal"
                      ? pathname === "/portal"
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                  const isDimmed = item.dimFor?.includes(role) ?? false;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-l-[3px] bg-white/10 text-white"
                          : "border-l-[3px] border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200"
                      } ${isDimmed ? "opacity-30" : ""}`}
                      style={isActive ? { borderLeftColor: "#2E6FE8" } : undefined}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mx-3 mb-3 rounded-md bg-yellow-500/20 px-3 py-2 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
          Demo Mode
        </span>
      </div>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="flex items-center gap-3 px-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: "#2E6FE8" }}
          >
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-gray-400 truncate">{companyName}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            data-testid="sign-out"
            className="rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed left-3 top-3 z-40 rounded-md p-2 text-white lg:hidden"
        style={{ backgroundColor: "#0F2040" }}
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop */}
      <div className="hidden lg:flex h-full">{content}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full">{content}</div>
        </div>
      )}
    </>
  );
}
