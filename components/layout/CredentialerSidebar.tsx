"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  DollarSign,
  User as UserIcon,
  Menu,
} from "lucide-react";
import { useClerkSession } from "./useClerkSession";
import { SidebarShell, type SidebarNavItem } from "./Sidebar";

const NAV: SidebarNavItem[] = [
  { label: "Dashboard", href: "/credentialing", icon: LayoutDashboard, group: "Credentialing" },
  { label: "Earnings",  href: "/credentialing/earnings",    icon: DollarSign,      group: "Credentialing" },
  { label: "Profile",   href: "/credentialing/profile",     icon: UserIcon,        group: "Account" },
];

const GROUPS = ["Credentialing", "Account"];

export function CredentialerSidebar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { name: userName, email, signOut } = useClerkSession({
    fallbackName: "Renée Cole",
    fallbackEmail: "credentialing@peerspectiv.com",
  });

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  return (
    <>
      <button
        className="fixed left-3 top-3 z-50 rounded-sm bg-ink-950 p-2 text-paper lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:flex h-full">
        <SidebarShell
          nav={NAV}
          groups={GROUPS}
          role="credentialer"
          userName={userName}
          userSubtitle={email || "credentialing@peerspectiv.com"}
          onSignOut={handleLogout}
          onCloseMobile={() => {}}
          mobileOpen={false}
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full">
            <SidebarShell
              nav={NAV}
              groups={GROUPS}
              role="credentialer"
              userName={userName}
              userSubtitle={email || "credentialing@peerspectiv.com"}
              onSignOut={handleLogout}
              onCloseMobile={() => setMobileOpen(false)}
              mobileOpen={true}
              contextLabel="Credentialing"
            />
          </div>
        </div>
      )}
    </>
  );
}
