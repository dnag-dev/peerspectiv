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
  FileText,
  DollarSign,
  UserCog,
} from "lucide-react";
import { useMobileNav } from "./MobileNavContext";
import { useClerkSession } from "./useClerkSession";

const adminNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Batches", href: "/batches", icon: FolderOpen },
  { label: "Assign", href: "/assign", icon: UserCheck },
  { label: "Reviewers", href: "/reviewers", icon: ClipboardCheck },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Command Center", href: "/command", icon: Terminal },
];

const reviewerNavItems = [
  { label: "My Queue", href: "/reviewer/portal", icon: ClipboardCheck },
  { label: "Earnings", href: "/reviewer/earnings", icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileNavOpen, closeMobileNav } = useMobileNav();

  // Detect role from pathname — reviewer sees different nav.
  // IMPORTANT: trailing slash so `/reviewers` (admin list) does NOT match.
  const isReviewer = pathname === "/reviewer" || pathname.startsWith("/reviewer/");
  const navItems = isReviewer ? reviewerNavItems : adminNavItems;

  const session = useClerkSession({
    fallbackName: isReviewer ? "Dr. Richard Johnson" : "Ashton Williams",
    fallbackEmail: isReviewer ? "rjohnson@peerspectiv.com" : "admin@peerspectiv.com",
  });
  // In demo mode, override the cookie-based name with the pathname-derived role
  const name = isReviewer ? "Dr. Richard Johnson" : session.name;
  const email = isReviewer ? "rjohnson@peerspectiv.com" : session.email;
  const signOut = session.signOut;

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          onClick={closeMobileNav}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-shrink-0 flex-col bg-brand-navy
          transform transition-transform duration-200 ease-in-out
          ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0
        `}
      >
        {/* Wordmark */}
        <div className="flex h-20 items-center px-5">
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
        </div>

        {/* Navigation */}
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileNav}
                className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-l-[3px] border-brand-blue bg-white/10 text-white"
                    : "border-l-[3px] border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Demo banner */}
        <div className="mx-3 mb-3 rounded-md bg-yellow-500/20 px-3 py-2 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
            Demo Mode — Sample Data
          </span>
        </div>

        {/* User section */}
        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex items-center gap-3 px-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{name}</p>
              <p className="text-xs text-gray-400 truncate">{email}</p>
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
    </>
  );
}
