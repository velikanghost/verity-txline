"use client";

import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import AppHeader from "@/components/layout/AppHeader";
import CinematicBackdrop from "@/components/layout/CinematicBackdrop";
import { useSocket } from "@/hooks/useSocket";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { useEffect } from "react";
import { PreviewModeBanner } from "@/components/ui/PreviewModeBanner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = useWalletProfile();
  const { joinRoom, leaveRoom } = useSocket();

  useEffect(() => {
    if (profile?.id) {
      joinRoom(`user:${profile.id}`);
      return () => {
        leaveRoom(`user:${profile.id}`);
      };
    }
  }, [profile?.id, joinRoom, leaveRoom]);

  return (
    <>
      <CinematicBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1300px] justify-center gap-3 px-0 sm:px-3 xl:gap-6 xl:px-5">
        <div className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col py-4 sm:flex xl:w-[280px]">
          <Sidebar />
        </div>

        {/* Single full-width column — every page owns its own layout. */}
        <main className="min-w-0 flex-1 max-w-[1080px] pb-28 sm:pb-0">
          <AppHeader />
          <PreviewModeBanner />
          <div className="px-4 sm:px-0">{children}</div>
        </main>
      </div>
      <MobileNav />
    </>
  );
}
