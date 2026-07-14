"use client"

import { type ReactNode, useEffect } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"

import { Toaster } from "@/lib/toast"
import { queryClient } from "@/lib/queryClient"
import AuthModals from "./AuthModals"
import { useAuthStore } from "@/store/authStore"

export default function AppProviders({ children }: { children: ReactNode }) {
  const setReferrerInput = useAuthStore((s) => s.setReferrerInput)

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
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="light"
        enableSystem={false}
        storageKey="verity-arcade-theme"
      >
        {children}
        <AuthModals />
        <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
