"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { authClient } from "@/infrastructure/auth/client";

interface SidebarProps {
  userEmail: string;
  userName?: string | null;
  userUsername?: string | null;
}

export function Sidebar({ userEmail, userName, userUsername }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navOverview = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      name: "Cards / Akun",
      href: "/dashboard/accounts",
      icon: CreditCard,
      active: pathname.startsWith("/dashboard/accounts"),
    },
  ];

  const navFinance = [
    {
      name: "Transactions",
      href: "/dashboard/history",
      icon: Receipt,
      active: pathname.startsWith("/dashboard/history"),
    },
  ];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const displayName = userName || userUsername || userEmail.split("@")[0];

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-16 items-center justify-between border-b border-[#2F5D8C] bg-[#0B1F3B] px-4 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/Icon.svg" alt="Fintry" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-[#F2F5F8]">Fintry</span>
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-[#C9D6E5] hover:bg-[#123A63] hover:text-[#F2F5F8]"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar (Sticky Viewport-Height) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#2F5D8C] bg-[#0B1F3B] transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-6 border-b border-[#2F5D8C]">
          <img src="/Icon.svg" alt="Fintry" className="h-8 w-8" />
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-[#F2F5F8]">Fintry</span>
            <span className="text-[10px] uppercase tracking-wider text-[#00E5A2]">Command Center</span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
          <div className="space-y-6">
            {/* OVERVIEW group */}
            <div>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#C9D6E5]">
                Overview
              </p>
              <nav className="mt-2 space-y-1">
                {navOverview.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        item.active
                          ? "bg-[#123A63] text-[#00E5A2] border border-[#2F5D8C]/60"
                          : "text-[#C9D6E5] hover:bg-[#123A63] hover:text-[#F2F5F8]"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition ${
                          item.active ? "text-[#00E5A2]" : "text-[#C9D6E5] group-hover:text-[#F2F5F8]"
                        }`}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* FINANCE group */}
            <div>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#C9D6E5]">
                Finance
              </p>
              <nav className="mt-2 space-y-1">
                {navFinance.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        item.active
                          ? "bg-[#123A63] text-[#00E5A2] border border-[#2F5D8C]/60"
                          : "text-[#C9D6E5] hover:bg-[#123A63] hover:text-[#F2F5F8]"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition ${
                          item.active ? "text-[#00E5A2]" : "text-[#C9D6E5] group-hover:text-[#F2F5F8]"
                        }`}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* ACCOUNT & PROFILE group */}
          <div className="shrink-0 border-t border-[#2F5D8C] pt-4 space-y-2">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#C9D6E5]">
              Account
            </p>

            <Link
              href="/dashboard/profile"
              onClick={() => setIsOpen(false)}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname.startsWith("/dashboard/profile")
                  ? "bg-[#123A63] text-[#00E5A2] border border-[#2F5D8C]/60"
                  : "text-[#C9D6E5] hover:bg-[#123A63] hover:text-[#F2F5F8]"
              }`}
            >
              <User
                className={`h-4 w-4 shrink-0 transition ${
                  pathname.startsWith("/dashboard/profile")
                    ? "text-[#00E5A2]"
                    : "text-[#C9D6E5] group-hover:text-[#F2F5F8]"
                }`}
              />
              <div className="flex flex-col truncate">
                <span className="truncate text-sm font-medium text-[#F2F5F8]">{displayName}</span>
                <span className="truncate text-xs text-[#C9D6E5]">Profil & Pengaturan</span>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#FF4B72] transition hover:bg-[#FF4B72]/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>{loggingOut ? "Keluar..." : "Keluar (Logout)"}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
