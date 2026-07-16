"use client";

import { Radio, RefreshCw } from "lucide-react";
import { useWorldCupMarketsQuery } from "@/store/verity/worldcupQueries";
import { WorldCupMarketCard } from "./WorldCupMarketCard";
import { usePreviewMode } from "@/hooks/usePreviewMode";
import { getPreviewWorldCupMarkets } from "@/lib/previewData";

/** Reusable World Cup market grid — used by the home page, the /markets World
 * Cup tab, and the standalone /markets/worldcup route. */
export function WorldCupMarketsList() {
  const previewMode = usePreviewMode();
  const {
    data: markets,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useWorldCupMarketsQuery({ enabled: !previewMode });
  const displayMarkets = previewMode ? getPreviewWorldCupMarkets() : markets;

  return (
    <div>
      {!previewMode && isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="worldcup-state-surface h-[420px] animate-pulse rounded-[24px] border-[3px]"
            />
          ))}
        </div>
      )}

      {!previewMode && error && !isLoading && (
        <div className="worldcup-state-surface flex flex-col items-start justify-between gap-4 rounded-[24px] border-[3px] p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff6b4a]/10 text-[#ff927b]">
              <Radio className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-game text-lg font-black text-charcoal-primary">
                The arena lost its signal
              </p>
              <p className="mt-1 text-xs leading-5 text-ash">
                Your picks are safe. Reconnect to the live fixture feed and
                continue playing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="game-button-primary clickable inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 font-game text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {isFetching ? "Connecting" : "Try again"}
          </button>
        </div>
      )}

      {!error && displayMarkets && displayMarkets.length === 0 && (
        <div className="worldcup-state-surface flex min-h-64 flex-col items-center justify-center rounded-[24px] border-[3px] p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunburst-yellow/15 text-[#b27600] ">
            <Radio className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="font-game mt-4 text-xl font-black text-charcoal-primary">
            New matches are spawning soon
          </p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-ash">
            Markets appear here as soon as World Cup fixtures are published and
            connected to the live TxLINE feed.
          </p>
        </div>
      )}

      {displayMarkets && displayMarkets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {displayMarkets.map((market) => (
            <WorldCupMarketCard
              key={market.id}
              market={market}
              preview={previewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
