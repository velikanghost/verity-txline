"use client"

import { useFeedQuery } from "@/store/verity/verityQueries"

const EMPTY_ARRAY: any[] = []

export function useFeed(profileId?: string, onlyMarkets = false) {
  const { data, isLoading, isError, error, refetch } = useFeedQuery(
    profileId,
    onlyMarkets,
  )

  const errorMessage = isError
    ? (error as any)?.message || "Unable to load feed."
    : null

  return {
    items: data || EMPTY_ARRAY,
    loading: isLoading,
    error: errorMessage,
    reload: refetch,
  }
}
