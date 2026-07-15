"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  DuelNavIcon,
  HomeNavIcon,
  PlayerNavIcon,
  SearchNavIcon,
  TrophyNavIcon,
} from "@/components/icons/ArcadeNavIcons"

// Odd count with Duel in the middle — the primary action sits dead center.
const NAV_ITEMS = [
  { icon: HomeNavIcon, label: "Home", href: "/" },
  { icon: SearchNavIcon, label: "Search", href: "/search" },
  { icon: DuelNavIcon, label: "Duel", href: "/pvp" },
  { icon: TrophyNavIcon, label: "Ranks", href: "/leaderboard" },
  { icon: PlayerNavIcon, label: "Player", href: "/profile" },
] as const

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary navigation"
      className="arcade-mobile-nav fixed inset-x-4 bottom-3 z-40 mx-auto max-w-[430px] sm:hidden"
    >
      <div className="grid grid-cols-5 px-1.5 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`))
          const Icon = item.icon

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`arcade-nav-item ${isActive ? "is-active" : ""}`}
              href={item.href}
              key={item.label}
            >
              <span className="arcade-nav-object" aria-hidden="true">
                <Icon className="h-[54px] w-[64px]" active={isActive} />
              </span>
              <span className="arcade-nav-label">{item.label}</span>
              <span className="arcade-nav-signal" aria-hidden="true" />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
