"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { ProofBallIcon } from "@/components/icons/ProofBallIcon";

const PARTICLES = [
  { left: "8%", top: "14%", size: 3, delay: "-2s", duration: "13s" },
  { left: "18%", top: "72%", size: 2, delay: "-8s", duration: "16s" },
  { left: "31%", top: "34%", size: 2, delay: "-4s", duration: "11s" },
  { left: "45%", top: "84%", size: 3, delay: "-10s", duration: "18s" },
  { left: "57%", top: "20%", size: 2, delay: "-6s", duration: "15s" },
  { left: "68%", top: "64%", size: 4, delay: "-1s", duration: "19s" },
  { left: "78%", top: "11%", size: 2, delay: "-12s", duration: "17s" },
  { left: "87%", top: "78%", size: 3, delay: "-5s", duration: "14s" },
  { left: "94%", top: "39%", size: 2, delay: "-9s", duration: "12s" },
] as const;

function getSceneAccent(pathname: string) {
  if (pathname.startsWith("/pvp") || pathname.startsWith("/markets")) {
    return "#ff6b4a";
  }
  if (pathname.startsWith("/search")) return "#35e881";
  if (pathname.startsWith("/profile")) return "#ffc844";
  if (pathname.startsWith("/missions")) return "#ffc844";
  if (pathname.startsWith("/leaderboard")) return "#1479ff";
  if (pathname.startsWith("/portfolio")) return "#35e881";
  if (pathname.startsWith("/notifications")) return "#ff6b4a";
  return "#1479ff";
}

export default function CinematicBackdrop() {
  const pathname = usePathname();
  const accent = getSceneAccent(pathname);

  return (
    <div
      className="cinematic-backdrop fixed inset-0 z-0 overflow-hidden"
      style={{ "--scene-accent": accent } as CSSProperties}
      aria-hidden="true"
    >
      <div className="cinematic-vignette absolute inset-0" />
      <div className="cinematic-light-sweep absolute -inset-y-1/4 -left-1/3 w-1/3" />

      <div className="proof-ball-scene absolute">
        <div className="proof-ball-halo absolute inset-[16%] rounded-full" />
        <ProofBallIcon className="h-full w-full text-[var(--scene-accent)]" />
      </div>

      <div className="cinematic-particles absolute inset-0">
        {PARTICLES.map((particle, index) => (
          <span
            key={`${particle.left}-${particle.top}`}
            className="cinematic-particle absolute rounded-full bg-[var(--scene-accent)]"
            style={
              {
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
                "--particle-drift": `${index % 2 === 0 ? 22 : -18}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
