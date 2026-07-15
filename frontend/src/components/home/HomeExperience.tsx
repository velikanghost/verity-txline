"use client"

import { useAuth } from "@/components/providers/AuthModals"
import LandingPage from "@/components/home/LandingPage"
import { WorldCupMarketsList } from "@/components/worldcup/WorldCupMarketsList"

export default function HomeExperience() {
  const { authenticated, loading } = useAuth()

  // Avoid a flash of the wrong view while the session resolves.
  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-ash">Loading…</div>
    )
  }

  // Signed out → the Verity landing page (intro + Get Started).
  if (!authenticated) {
    return <LandingPage />
  }

  // Signed in → straight to the markets, no intro/ad copy.
  return (
    <div className="flex min-h-screen flex-col gap-5 py-2">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-lg font-black text-charcoal-primary dark:text-white">
          Markets
        </h1>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
          Settles on-chain via TxLINE
        </span>
      </div>
      <WorldCupMarketsList />
    </div>
  )
}
