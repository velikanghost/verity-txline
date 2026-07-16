"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, User, Swords, Search } from "lucide-react";
import SidebarProfile from "@/components/layout/SidebarProfile";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { useNotificationsQuery } from "@/store/verity/verityQueries";
import { useAuth } from "@/components/providers/AuthModals";
import { PixelTrophyIcon } from "@/components/icons/PixelTrophyIcon";
import ThemeToggle from "@/components/layout/ThemeToggle";

const NAV_ITEMS = [
  { icon: Swords, label: "Duels", href: "/pvp" },
  { icon: Search, label: "Search", href: "/search" },
  { icon: User, label: "Player", href: "/profile" },
  { icon: Bell, label: "Alerts", href: "/notifications" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const { authenticated, login } = useAuth();
  const { profile } = useWalletProfile();
  const { data: notifications = [] } = useNotificationsQuery(profile?.id || "");
  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <div className="tournament-sidebar game-panel flex h-full flex-col rounded-[26px] border border-white/[0.08] p-2 text-white shadow-[0_22px_70px_rgba(9,12,30,.18)] xl:p-4">
      {/* Logo */}
      <div className="sidebar-brand-row mb-3 flex flex-col items-center gap-3 xl:flex-row xl:justify-between xl:gap-2">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5 rounded-2xl py-2 xl:py-3"
        >
          <span className="sidebar-brand-emblem arcade-brand-emblem flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition-transform group-hover:-translate-y-0.5">
            <PixelTrophyIcon className="h-8 w-8" />
          </span>
          <span className="hidden min-w-0 xl:block">
            <span className="arcade-brand-wordmark block truncate leading-none">
              Verity
            </span>
            <span className="sidebar-brand-subtitle mt-1 block font-mono text-[7px] font-black uppercase tracking-[0.2em] text-[#777f9e]">
              World Cup duels
            </span>
          </span>
        </Link>
        <div className="sidebar-theme-toggle shrink-0">
          <ThemeToggle />
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1.5 border-t border-white/[0.07] pt-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href + "/"));
          const href = item.href === "/profile" ? `/profile` : item.href;
          const isAuthRequired =
            item.href === "/profile" || item.href === "/portfolio";
          return (
            <Link
              key={item.label}
              href={href}
              onClick={(e) => {
                if (isAuthRequired && !authenticated) {
                  e.preventDefault();
                  login();
                }
              }}
              className="group flex w-fit items-center xl:w-full"
            >
              <div
                className={`flex items-center gap-3 rounded-2xl p-3 text-[15px] transition-all duration-200 xl:w-full xl:px-4 xl:py-3 ${
                  isActive
                    ? "bg-gradient-to-r from-[#1479ff] to-[#0862d3] font-semibold text-white shadow-[0_9px_26px_rgba(20,121,255,.24)]"
                    : "text-[#79819f] hover:bg-white/[0.055] hover:text-white"
                }`}
              >
                <div className="relative flex items-center justify-center shrink-0">
                  <item.icon className="h-6 w-6 xl:h-5 xl:w-5" />
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-coral-red text-[8px] font-bold text-white shadow-sm ring-1.5 ring-surface-solid">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span className="font-game hidden font-black xl:block">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Profile & Wallet info */}
      <div className="mt-2">
        <SidebarProfile />
      </div>
    </div>
  );
}
