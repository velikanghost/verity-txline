"use client"

import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useUserPortfolioQuery } from "@/store/verity/verityQueries"
import { useUsdcBalance } from "@/hooks/useUsdcBalance"
import { getMarketPrice } from "@/lib/verity"
import { useMemo } from "react"

export function useUserPortfolio() {
  const { profile } = useWalletProfile()
  const userId = profile?.id || ""

  const {
    data: rawPositions,
    isLoading: isPositionsLoading,
    error,
    refetch: refetchPositions,
  } = useUserPortfolioQuery(userId)
  const {
    rawBalance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useUsdcBalance()

  const usdcBalance = Number(rawBalance) / 1e6

  const positions = useMemo(() => {
    if (!rawPositions) return []

    return rawPositions.map((p) => {
      const isResolved = p.status === "resolved"
      const currentPrice =
        isResolved
          ? p.resolved_outcome?.toUpperCase() === p.side?.toUpperCase()
            ? 1.0
            : 0.0
          : getMarketPrice(
              {
                usdc_yes_amount: p.usdc_yes_amount ?? 0,
                usdc_no_amount: p.usdc_no_amount ?? 0,
              },
              p.side,
            )
      const currentValue = p.shares * currentPrice
      const unrealizedPnL = isResolved ? 0 : currentValue - (p.invested_usdc || 0)
      const realizedPnL = isResolved
        ? p.realized_pnl !== undefined
          ? p.realized_pnl
          : currentValue - (p.invested_usdc || 0)
        : 0

      return {
        ...p,
        currentPrice,
        currentValue,
        unrealizedPnL,
        realizedPnL,
      }
    })
  }, [rawPositions])

  const stats = useMemo(() => {
    if (positions.length === 0) {
      return {
        totalPositions: 0,
        totalInvested: 0,
        holdingsValue: 0,
        unrealizedPnL: 0,
        realizedPnL: 0,
        netWorth: usdcBalance,
      }
    }

    const totalPositions = positions.length
    const totalInvested = positions.reduce(
      (sum, p) => sum + Number(p.invested_usdc || 0),
      0,
    )
    const holdingsValue = positions.reduce(
      (sum, p) => sum + Number(p.currentValue || 0),
      0,
    )
    const unrealizedPnL = positions.reduce(
      (sum, p) => sum + Number(p.unrealizedPnL || 0),
      0,
    )
    const realizedPnL = positions.reduce(
      (sum, p) => sum + Number(p.realizedPnL || 0),
      0,
    )
    const netWorth = usdcBalance + holdingsValue

    return {
      totalPositions,
      totalInvested,
      holdingsValue,
      unrealizedPnL,
      realizedPnL,
      netWorth,
    }
  }, [positions, usdcBalance])

  const refetch = async () => {
    await Promise.all([refetchPositions(), refetchBalance()])
  }

  return {
    profile,
    positions,
    isLoading: isPositionsLoading || isBalanceLoading || !userId,
    error,
    stats,
    usdcBalance,
    refetch,
  }
}
