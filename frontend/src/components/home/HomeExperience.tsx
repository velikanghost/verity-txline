"use client"

import Link from "next/link"
import { Swords } from "lucide-react"
import { WorldCupMarketsList } from "@/components/worldcup/WorldCupMarketsList"

export default function HomeExperience() {
  return (
    <div className="flex min-h-screen flex-col gap-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">
          Social Prediction Market
        </p>
        <h1 className="mt-1 max-w-xl text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl">
          Predict the match. Prove your read.
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground">
          Back your calls on live World Cup stats — every market settles
          trustlessly on-chain by verifying TxLINE&apos;s signed data feed. Then
          take opponents head-to-head in the PvP Arena.
        </p>
        <Link
          href="/pvp"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
        >
          <Swords className="h-4 w-4" />
          Enter the PvP Arena
        </Link>
      </div>

      {/* All markets */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-bold">Markets</h2>
        <WorldCupMarketsList />
      </div>
    </div>
  )
}
