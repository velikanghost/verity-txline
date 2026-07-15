import type { ReactNode } from "react";

interface PagePanelProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export default function PagePanel({
  eyebrow,
  title,
  description,
  children,
}: PagePanelProps) {
  return (
    <div className="tournament-page-panel flex flex-col gap-3 py-3 sm:py-4">
      <section className="verity-card game-grid relative overflow-hidden p-5 sm:p-6">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#1479ff]/22 blur-3xl" />
        {eyebrow && (
          <p className="relative font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#59a2ff]">
            {eyebrow}
          </p>
        )}
        <h1 className="relative mt-1 text-[32px] font-black leading-[1.03] text-midnight sm:text-[40px]">
          {title}
        </h1>
        {description && (
          <p className="relative mt-2 max-w-[520px] text-[15px] leading-[1.47] tracking-[-0.2px] text-graphite">
            {description}
          </p>
        )}
      </section>

      {children}
    </div>
  );
}
