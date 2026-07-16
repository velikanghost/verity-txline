"use client"

import { useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/store/apiClient"
import { usePreviewMode } from "@/hooks/usePreviewMode"

/**
 * Claim winnings for one or more resolved markets via the Solana program's
 * `claim` instruction (backend-signed). Replaces the old Arc redeem flow.
 */
export function useClaimWinnings() {
  const qc = useQueryClient()
  const previewMode = usePreviewMode()

  const redeemMultipleWinnings = async (
    marketIds: string[],
    totalWinnings?: number,
  ) => {
    void totalWinnings
    if (previewMode) throw new Error("Sample preview is read-only.")

    const results: { marketId: string; txSig?: string; error?: string }[] = []
    for (const marketId of marketIds) {
      try {
        const res = await apiRequest<{ txSig: string }>("/solana/claim", {
          method: "POST",
          body: JSON.stringify({ marketId }),
        })
        results.push({ marketId, txSig: res.txSig })
      } catch (error: unknown) {
        results.push({
          marketId,
          error: error instanceof Error ? error.message : "Claim failed",
        })
      }
    }
    qc.invalidateQueries({ queryKey: ["worldcup", "markets"] })
    qc.invalidateQueries({ queryKey: ["usdcBalance"] })
    return results
  }

  return { redeemMultipleWinnings }
}
