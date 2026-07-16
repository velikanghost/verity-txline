"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";

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
    return "#de7186";
  }
  if (pathname.startsWith("/search")) return "#71c3a5";
  if (pathname.startsWith("/profile")) return "#f2d66a";
  if (pathname.startsWith("/missions")) return "#f2d66a";
  if (pathname.startsWith("/leaderboard")) return "#8f79d8";
  if (pathname.startsWith("/portfolio")) return "#71c3a5";
  if (pathname.startsWith("/notifications")) return "#de7186";
  return "#8f79d8";
}

export default function CinematicBackdrop() {
  const pathname = usePathname();
  const accent = getSceneAccent(pathname);

  return (
    <div
      className="cinematic-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ "--scene-accent": accent } as CSSProperties}
      aria-hidden="true"
    >
      <div className="cinematic-vignette absolute inset-0" />
      <div className="cinematic-light-sweep absolute -inset-y-1/4 -left-1/3 w-1/3" />

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
