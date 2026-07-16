"use client"

import { type ReactNode, useEffect } from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { Toaster } from "@/lib/toast"
import { queryClient } from "@/lib/queryClient"
import AuthModals from "./AuthModals"
import { useAuthStore } from "@/store/authStore"
import { useThemeStore } from "@/store/themeStore"

export default function AppProviders({ children }: { children: ReactNode }) {
  const setReferrerInput = useAuthStore((s) => s.setReferrerInput)
  const hydrateTheme = useThemeStore((s) => s.hydrate)

  useEffect(() => {
    hydrateTheme()
  }, [hydrateTheme])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get("ref")
      if (ref) {
        setReferrerInput(ref)
        const token = localStorage.getItem("verity_auth_token")
        if (!token) {
          useAuthStore.getState().login()
        }
      }
    }
  }, [setReferrerInput])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <AuthModals />
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
    </QueryClientProvider>
  )
}
