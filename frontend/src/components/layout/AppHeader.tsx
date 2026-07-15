"use client";

import Link from "next/link";
import { Bell, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/providers/AuthModals";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { useNotificationsQuery } from "@/store/verity/verityQueries";
import { PixelTrophyIcon } from "@/components/icons/PixelTrophyIcon";

export default function AppHeader() {
  const { authenticated, loading, login } = useAuth();
  const { profile } = useWalletProfile();
  const { formattedBalance, isLoading, refetch } = useUsdcBalance();
  const { data: notifications = [] } = useNotificationsQuery(profile?.id || "");
  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <header className="arcade-app-header sticky top-0 z-30 flex items-center justify-between gap-3 py-3 backdrop-blur-xl sm:mt-3 sm:rounded-2xl sm:border sm:border-white/[0.07] sm:px-4">
      <Link href="/pvp" className="group flex min-w-0 items-center gap-2.5">
        <span className="arcade-brand-emblem flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]">
          <PixelTrophyIcon className="h-8 w-8" />
        </span>
        <span className="min-w-0">
          <span className="arcade-brand-wordmark block truncate leading-none">
            Verity
          </span>
          <span className="mt-1 block font-mono text-[7px] font-black uppercase tracking-[0.22em] text-[#71809f]">
            World Cup duels
          </span>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        {authenticated && (
          <button
            aria-label="Refresh balance"
            className="arcade-balance-pill group"
            onClick={() => void refetch()}
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#35e881] transition-transform duration-500 group-hover:rotate-180" />
            <span>{isLoading ? "•••" : `$${formattedBalance}`}</span>
          </button>
        )}

        <Link
          aria-label="Open alerts"
          className="arcade-alert-button relative flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.09] bg-[#0b0f1a]/85 text-[#7b859f] transition-colors hover:text-white"
          href="/notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff6b4a] px-1 font-mono text-[8px] font-black text-white ring-2 ring-[#07111f]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {!loading && !authenticated && (
          <button
            className="game-button-primary h-10 rounded-[14px] px-4 font-game text-sm font-black text-white"
            onClick={login}
            type="button"
          >
            Log in
          </button>
        )}
      </div>
    </header>
  );
}
