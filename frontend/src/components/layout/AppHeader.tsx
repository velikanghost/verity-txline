"use client"

import Link from "next/link"
import { Bell } from "lucide-react"
import { useAuth } from "@/components/providers/AuthModals"
import { displayName as getDisplayName } from "@/lib/verity"
import ThemeToggle from "./ThemeToggle"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useNotificationsQuery } from "@/store/verity/verityQueries"

/**
 * Global top bar: logo + alerts + theme + profile. Navigation and search live
 * in the bottom nav (mobile-only app), so the header stays minimal.
 */
export default function AppHeader() {
  const { user, authenticated, loading, login } = useAuth()
  const { profile } = useWalletProfile()
  const { data: notifications = [] } = useNotificationsQuery(profile?.id || "")
  const unreadCount = notifications.filter((n: any) => !n.read).length

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-stone-surface/70 bg-warm-canvas/85 px-4 backdrop-blur">
      <div className="flex h-16 items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          <div className="verity-blob flex h-9 w-9 items-center justify-center bg-sunburst-yellow text-base font-semibold text-midnight">
            V
            <span className="verity-blob-smile scale-90" />
          </div>
          <span className="ml-2.5 text-lg font-semibold tracking-[-0.25px] text-charcoal-primary">
            Verity
          </span>
        </Link>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          <Link
            aria-label="Open Alerts"
            href="/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-ash transition-colors hover:text-charcoal-primary"
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
          ) : authenticated && user ? (
            <Link
              href="/profile"
              aria-label={getDisplayName(user)}
              className="verity-blob flex h-9 w-9 items-center justify-center bg-sky-blue"
            >
              <span className="verity-blob-smile scale-90" />
            </Link>
          ) : (
            <button
              className="flex h-9 items-center gap-1 rounded-[8px] bg-inverse px-5 text-sm font-semibold tracking-[-0.18px] text-inverse-text transition-opacity hover:opacity-90"
              onClick={login}
              type="button"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
