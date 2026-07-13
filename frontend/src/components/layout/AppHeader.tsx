"use client";

import Link from "next/link";
import { Bell, Gamepad2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/AuthModals";
import ThemeToggle from "./ThemeToggle";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { useNotificationsQuery } from "@/store/verity/verityQueries";

/**
 * Global top bar. Holds the search field on every breakpoint (mobile finally
 * gets search), plus mobile-only chrome (logo + alerts + theme + login) since
 * the left sidebar is hidden on mobile. Desktop chrome lives in the sidebar,
 * so on desktop this is just the search row.
 *
 * TODO: the search input is presentational until a /search route is wired.
 */
export default function AppHeader() {
  const { authenticated, loading, login } = useAuth();
  const { profile } = useWalletProfile();
  const { data: notifications = [] } = useNotificationsQuery(profile?.id || "");
  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <div className="sticky top-0 z-20 mt-3 flex flex-col gap-2 bg-warm-canvas/85 pb-2 backdrop-blur">
      {/* Mobile chrome row — hidden on desktop (sidebar covers it there). */}
      <div className="flex items-center justify-between sm:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1479ff] to-[#0862d3] text-white shadow-[0_6px_18px_rgba(20,121,255,.28)]">
            <Gamepad2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="font-game text-xl font-black text-charcoal-primary dark:text-white">
            Verity
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            aria-label="Open Alerts"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-solid text-ash transition-colors hover:text-charcoal-primary"
            href="/notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-coral-red text-[8px] font-bold text-white ring-2 ring-background">
                {unreadCount}
              </span>
            )}
          </Link>
          <ThemeToggle />
          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-stone-surface" />
          ) : !authenticated ? (
            <button
              className="game-button-primary flex h-9 items-center gap-1 rounded-xl px-5 font-game text-sm font-black text-white transition-opacity hover:opacity-95"
              onClick={login}
              type="button"
            >
              <span>Login</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Search — always visible. */}
      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <Search className="h-4.5 w-4.5 text-ash transition-colors group-focus-within:text-[#1479ff]" />
        </div>
        <Input
          className="h-12 w-full rounded-2xl border border-border bg-surface-solid pl-12 pr-28 text-sm font-semibold text-charcoal-primary shadow-[0_8px_30px_rgba(5,16,31,.1)] focus-visible:border-[#1479ff]/50 focus-visible:ring-2 focus-visible:ring-[#1479ff]/10 focus-visible:ring-offset-0 dark:text-white"
          placeholder="Find a match, team, or quest..."
          type="text"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 hidden items-center sm:flex">
          <span className="rounded-lg border border-border bg-surface-muted px-2 py-1 font-mono text-[8px] font-black uppercase tracking-wider text-ash">
            World Cup
          </span>
        </span>
      </div>
    </div>
  );
}
