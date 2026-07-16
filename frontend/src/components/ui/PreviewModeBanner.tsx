"use client";

import type { MouseEvent } from "react";
import { Eye, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { usePreviewMode } from "@/hooks/usePreviewMode";

export function PreviewModeBanner() {
  const previewMode = usePreviewMode();
  const pathname = usePathname();

  if (!previewMode) return null;

  const exitPreview = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const destination = new URL(window.location.href);
    destination.searchParams.set("preview", "0");
    window.location.assign(
      `${destination.pathname}${destination.search}${destination.hash}`,
    );
  };

  return (
    <div className="preview-mode-banner mx-4 mt-2 flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 sm:mx-0">
      <span className="flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.14em]">
        <Eye className="h-4 w-4" aria-hidden="true" />
        Sample data preview
      </span>
      <a
        href={`${pathname}?preview=0`}
        onClick={exitPreview}
        className="preview-mode-exit clickable inline-flex min-h-8 items-center gap-1 rounded-lg border-2 px-2 font-mono text-[8px] font-black uppercase tracking-wider"
      >
        Exit <X className="h-3 w-3" aria-hidden="true" />
      </a>
    </div>
  );
}
