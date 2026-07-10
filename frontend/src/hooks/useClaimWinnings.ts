"use client"

import { useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/store/apiClient"

/**
 * Claim winnings for one or more resolved markets via the Solana program's
 * `claim` instruction (backend-signed). Replaces the old Arc redeem flow.
 */
export function useClaimWinnings() {
  const qc = useQueryClient()

  const redeemMultipleWinnings = async (
    marketIds: string[],
    _totalWinnings?: number,
  ) => {
    const results: { marketId: string; txSig?: string; error?: string }[] = []
    for (const marketId of marketIds) {
      try {
        const res = await apiRequest<{ txSig: string }>("/solana/claim", {
          method: "POST",
          body: JSON.stringify({ marketId }),
        })
        results.push({ marketId, txSig: res.txSig })
      } catch (e: any) {
        results.push({ marketId, error: e?.message })
      }
    }
    qc.invalidateQueries({ queryKey: ["worldcup", "markets"] })
    qc.invalidateQueries({ queryKey: ["usdcBalance"] })
    return results
  }

  return { redeemMultipleWinnings }
}
