"use client"

import { useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/store/apiClient"

/**
 * Send USDC from the user's Circle Solana wallet to another address via the
 * backend (`POST /solana/send`, Circle-signed). Replaces the Arc transfer flow.
 */
export function useUsdcTransfer() {
  const qc = useQueryClient()

  const transferUsdc = async (toAddress: string, amountUsdc: number) => {
    const res = await apiRequest<{ txSig: string }>("/solana/send", {
      method: "POST",
      body: JSON.stringify({ toAddress, amountUsdc }),
    })
    qc.invalidateQueries({ queryKey: ["usdcBalance"] })
    return res.txSig
  }

  return { transferUsdc }
}
