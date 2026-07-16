"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthModals"
import { apiRequest } from "@/store/apiClient"

/**
 * The user's Solana USDC (and SOL) balance, read from the backend
 * (`GET /solana/balance`). Keeps the same interface the UI already expects:
 * `rawBalance` (base units, 6 decimals), `formattedBalance`, `isLoading`.
 */
export function useUsdcBalance(options: { enabled?: boolean } = {}) {
  const { authenticated } = useAuth()

  const query = useQuery({
    queryKey: ["usdcBalance"],
    queryFn: () => apiRequest<{ usdc: number; sol: number }>("/solana/balance"),
    enabled: authenticated && (options.enabled ?? true),
    refetchInterval: 5000,
  })

  const usdc = query.data?.usdc ?? 0
  const rawBalance = BigInt(Math.round(usdc * 1e6))
  const formattedBalance = usdc.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return {
    rawBalance,
    formattedBalance,
    solBalance: query.data?.sol ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
