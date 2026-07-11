"use client"

import { useWorldCupMarketsQuery } from "@/store/verity/worldcupQueries"
import { WorldCupMarketCard } from "./WorldCupMarketCard"

/** Reusable World Cup market grid — used by the home page, the /markets World
 * Cup tab, and the standalone /markets/worldcup route. */
export function WorldCupMarketsList() {
  const { data: markets, isLoading, error } = useWorldCupMarketsQuery()

  return (
    <div>
      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="verity-card h-40 animate-pulse bg-stone-100 dark:bg-zinc-900/40"
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm font-medium text-rose-500">
          Failed to load markets.
        </p>
      )}

      {markets && markets.length === 0 && (
        <div className="verity-card p-8 text-center">
          <p className="text-sm font-bold text-charcoal-primary dark:text-white">
            No World Cup markets yet
          </p>
          <p className="mt-1 text-xs text-ash">
            Check back once fixtures are live.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {markets?.map((m) => (
          <WorldCupMarketCard key={m.id} market={m} />
        ))}
      </div>
    </div>
  )
}
