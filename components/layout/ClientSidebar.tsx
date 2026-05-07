"use client";

import { useRouter } from "next/navigation";
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
  Receipt,
  UploadCloud,
  Menu,
  Folder,
  FileText,
  User as UserIcon,
} from "lucide-react";
import { useClerkSession } from "./useClerkSession";
import { SidebarShell, type SidebarNavItem, type SidebarRole } from "./Sidebar";

export type ClientRole = "cmo" | "quality" | "operations";

const NAV: SidebarNavItem[] = [
  { label: "Dashboard",          href: "/portal",            icon: LayoutDashboard,  group: "Overview" },
  { label: "Submit Records",     href: "/portal/upload",     icon: UploadCloud,      group: "Overview" },
  { label: "My Files",           href: "/portal/files",      icon: Folder,           group: "Overview" },
  { label: "Reviews",             href: "/portal/reviews",    icon: ClipboardList,    group: "Reviews" },
  { label: "Trends",             href: "/portal/trends",     icon: TrendingUp,       group: "Analytics" },
  { label: "Quality Reports",    href: "/portal/quality",    icon: FileBarChart,     group: "Analytics" },
  { label: "Providers",          href: "/portal/providers",  icon: Users,            group: "Analytics" },
  { label: "Corrective Actions", href: "/portal/corrective", icon: Wrench,           group: "Compliance" },
  { label: "Export & Reports",   href: "/portal/export",     icon: Download,         group: "Compliance" },
  { label: "Forms",              href: "/portal/forms",      icon: FileText,         group: "Compliance" },
  { label: "Invoices",           href: "/portal/invoices",   icon: Receipt,          group: "Compliance" },
  { label: "Share Feedback",     href: "/portal/feedback",   icon: Heart,            group: "Compliance" },
  { label: "Profile",            href: "/portal/profile",    icon: UserIcon,         group: "Account" },
];

const GROUPS = ["Overview", "Reviews", "Analytics", "Compliance", "Account"];

const DIM_FOR: Record<ClientRole, string[]> = {
  cmo:        [],
  quality:    [],
  operations: ["/portal/trends", "/portal/quality"],
};

export function ClientSidebar({
  companyName,
  role,
}: {
  companyName: string;
  role: ClientRole;
}) {
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

  const dimSet = new Set(DIM_FOR[role] || []);
  const nav = NAV.map((i) => ({ ...i, dim: dimSet.has(i.href) }));

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed left-3 top-3 z-50 rounded-sm bg-ink-950 p-2 text-paper lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">
        <SidebarShell
          nav={nav}
          groups={GROUPS}
          role={role as SidebarRole}
          userName={userName}
          userSubtitle={companyName}
          onSignOut={handleLogout}
          onCloseMobile={() => {}}
          mobileOpen={false}
          contextLabel={companyName}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full">
            <SidebarShell
              nav={nav}
              groups={GROUPS}
              role={role as SidebarRole}
              userName={userName}
              userSubtitle={companyName}
              onSignOut={handleLogout}
              onCloseMobile={() => setMobileOpen(false)}
              mobileOpen={true}
              contextLabel={companyName}
            />
          </div>
        </div>
      )}
    </>
  );
}
