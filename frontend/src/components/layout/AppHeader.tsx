"use client"

import Link from "next/link"
import { Bell, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/providers/AuthModals"
import ThemeToggle from "./ThemeToggle"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useNotificationsQuery } from "@/store/verity/verityQueries"

/**
 * Global top bar. Holds the search field on every breakpoint (mobile finally
 * gets search), plus mobile-only chrome (logo + alerts + theme + login) since
 * the left sidebar is hidden on mobile. Desktop chrome lives in the sidebar,
 * so on desktop this is just the search row.
 *
 * TODO: the search input is presentational until a /search route is wired.
 */
export default function AppHeader() {
  const { authenticated, loading, login } = useAuth()
  const { profile } = useWalletProfile()
  const { data: notifications = [] } = useNotificationsQuery(profile?.id || "")
  const unreadCount = notifications.filter((n: any) => !n.read).length

  return (
    <div className="sticky top-0 z-20 mt-3 flex flex-col gap-2 bg-warm-canvas/85 pb-2 backdrop-blur">
      {/* Mobile chrome row — hidden on desktop (sidebar covers it there). */}
      <div className="flex items-center justify-between sm:hidden">
        <Link href="/" className="flex items-center">
          <div className="verity-blob flex h-8 w-8 items-center justify-center bg-sunburst-yellow text-sm font-semibold text-midnight">
            V
            <span className="verity-blob-smile scale-75" />
          </div>
          <span className="ml-2.5 text-lg font-semibold tracking-[-0.25px] text-charcoal-primary">
            Verity
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            aria-label="Open Alerts"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-ash transition-colors hover:text-charcoal-primary"
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
              className="flex h-9 items-center gap-1 rounded-[6px] bg-inverse px-5 text-sm font-semibold tracking-[-0.18px] text-inverse-text transition-opacity hover:opacity-90"
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
          <Search className="h-5 w-5 text-ash transition-colors group-focus-within:text-charcoal-primary" />
        </div>
        <Input
          className="verity-card h-11 w-full rounded-[32px] border-0 pl-12 pr-4 text-[15px] tracking-[-0.2px] text-charcoal-primary focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-stone-surface focus-visible:ring-offset-0"
          placeholder="Search markets, users..."
          type="text"
        />
      </div>
    </div>
  )
}
