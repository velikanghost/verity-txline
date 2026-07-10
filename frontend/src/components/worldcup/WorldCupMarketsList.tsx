"use client"

import { useWorldCupMarketsQuery } from "@/store/verity/worldcupQueries"
import { WorldCupMarketCard } from "./WorldCupMarketCard"

/** Reusable World Cup market list — used by the /markets World Cup tab and the
 * standalone /markets/worldcup route. */
export function WorldCupMarketsList() {
  const { data: markets, isLoading, error } = useWorldCupMarketsQuery()

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Predict live match stats. Every market settles trustlessly on Solana by
        verifying TxLINE&apos;s signed data feed on-chain — no oracle to trust.
      </p>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/[0.02]"
            />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-rose-400">Failed to load markets.</p>}

      {markets && markets.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No World Cup markets yet — check back once fixtures are live.
        </p>
      )}

      <div className="space-y-3">
        {markets?.map((m) => (
          <WorldCupMarketCard key={m.id} market={m} />
        ))}
      </div>
    </div>
  )
}
