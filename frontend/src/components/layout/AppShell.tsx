"use client"

import MobileNav from "@/components/layout/MobileNav"
import AppHeader from "@/components/layout/AppHeader"
import { useSocket } from "@/hooks/useSocket"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useEffect } from "react"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = useWalletProfile()
  const { joinRoom, leaveRoom } = useSocket()

  useEffect(() => {
    if (profile?.id) {
      joinRoom(`user:${profile.id}`)
      return () => {
        leaveRoom(`user:${profile.id}`)
      }
    }
  }, [profile?.id, joinRoom, leaveRoom])

  return (
    <>
      {/* Mobile-only: a single phone-width column centered on every screen. */}
      <div className="mx-auto min-h-screen w-full max-w-[600px] px-4">
        <AppHeader />
        <main className="min-w-0 pb-24 sm:pb-10">{children}</main>
      </div>
      <MobileNav />
    </>
  )
}
