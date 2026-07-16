"use client";

import { useEffect, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Swords,
} from "lucide-react";
import { DuelNavIcon } from "@/components/icons/ArcadeNavIcons";

interface DuelStationSlate {
  id: string;
  question: string;
  deadline?: string;
  lockTime?: string;
  options: Array<{ id: string; volume?: number }>;
}

interface DuelStationStageProps {
  slates: DuelStationSlate[];
  loading: boolean;
  errorMessage?: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
  authenticated: boolean;
  hasLineup: boolean;
  completed?: boolean;
  onLogin: () => void;
}

const timeLabel = (slate: DuelStationSlate): string => {
  const timestamp = slate.lockTime || slate.deadline;
  if (!timestamp) return "OPEN";
  const remaining = new Date(timestamp).getTime() - Date.now();
  if (remaining <= 0) return "LOCKED";
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return `LIVE · ${hours}H ${minutes}M`;
};

const slateVolume = (slate: DuelStationSlate): number =>
  slate.options.reduce(
    (total, option) => total + Number(option.volume ?? 0),
    0,
  );

export default function DuelStationStage({
  slates,
  loading,
  errorMessage,
  selectedId,
  onSelect,
  onRetry,
  authenticated,
  hasLineup,
  completed = false,
  onLogin,
}: DuelStationStageProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const selectedSlate = useMemo(
    () => slates.find((slate) => slate.id === selectedId) ?? slates[0] ?? null,
    [selectedId, slates],
  );
  const selectedIndex = selectedSlate
    ? slates.findIndex((slate) => slate.id === selectedSlate.id)
    : -1;

  useEffect(() => {
    if (!selectedSlate || !trackRef.current) return;
    const track = trackRef.current;
    const selectedCard = track.querySelector<HTMLElement>(
      `[data-slate-id="${selectedSlate.id}"]`,
    );
    if (!selectedCard) return;

    const centeredLeft =
      selectedCard.offsetLeft -
      (track.clientWidth - selectedCard.offsetWidth) / 2;
    track.scrollTo({
      left: Math.max(0, centeredLeft),
      behavior: "smooth",
    });
  }, [selectedSlate]);

  const moveSelection = (direction: -1 | 1) => {
    if (!slates.length) return;
    const currentIndex = selectedIndex < 0 ? 0 : selectedIndex;
    const nextIndex = Math.min(
      slates.length - 1,
      Math.max(0, currentIndex + direction),
    );
    onSelect(slates[nextIndex].id);
  };

  const startMouseDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    didDragRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
  };

  const moveMouseDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4) didDragRef.current = true;
    event.currentTarget.scrollLeft = drag.scrollLeft - distance;
  };

  const stopMouseDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  };

  const actionLabel = completed
    ? "View results"
    : hasLineup
      ? "Resume duel"
      : "Build lineup";

  return (
    <div
      className={`zero-duel-poster duel-station-stage ${slates.length ? "has-contests" : "is-empty"}`}
      aria-label="Duel Station contest selector"
    >
      <span className="zero-duel-poster-ribbon">
        {completed
          ? "Duel complete"
          : hasLineup
            ? "Active duel"
            : "Duel station"}
      </span>
      <div className="duel-station-watermark" aria-hidden="true">
        <DuelNavIcon active className="h-28 w-32" />
      </div>

      {loading ? (
        <div className="duel-station-state" aria-live="polite">
          <RefreshCw className="h-6 w-6 animate-spin" aria-hidden="true" />
          <strong>Loading live contests</strong>
        </div>
      ) : errorMessage ? (
        <div className="duel-station-state" role="alert">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
          <strong>Contest signal lost</strong>
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : slates.length === 0 ? (
        <div className="duel-station-state">
          <CalendarClock className="h-6 w-6" aria-hidden="true" />
          <strong>Next contest drops soon</strong>
          <span>Check back before the next World Cup matchday.</span>
          <button type="button" onClick={onRetry}>
            Refresh
          </button>
        </div>
      ) : (
        <div className="duel-station-content">
          <div className="duel-station-carousel-head">
            <span>Live contests</span>
            <div className="duel-station-carousel-controls">
              <span>Swipe · select</span>
              <button
                type="button"
                aria-label="Previous contest"
                onClick={() => moveSelection(-1)}
                disabled={selectedIndex <= 0}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next contest"
                onClick={() => moveSelection(1)}
                disabled={selectedIndex >= slates.length - 1}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className="duel-station-track"
            ref={trackRef}
            data-dragging="false"
            onPointerDown={startMouseDrag}
            onPointerMove={moveMouseDrag}
            onPointerUp={stopMouseDrag}
            onPointerCancel={stopMouseDrag}
          >
            {slates.map((slate) => {
              const selected = slate.id === selectedSlate?.id;
              return (
                <button
                  type="button"
                  className="duel-station-contest-card"
                  data-selected={selected}
                  data-slate-id={slate.id}
                  key={slate.id}
                  onClick={() => {
                    if (didDragRef.current) return;
                    onSelect(slate.id);
                  }}
                >
                  <span className="duel-station-card-topline">
                    <span>
                      <i aria-hidden="true" /> {timeLabel(slate)}
                    </span>
                    <strong>${slateVolume(slate).toLocaleString()}</strong>
                  </span>
                  <span className="duel-station-card-title">
                    <Swords aria-hidden="true" />
                    <strong>{slate.question}</strong>
                  </span>
                  <span className="duel-station-card-meta">
                    {slate.options.length} props · minimum 3 picks
                  </span>
                  {selected && (
                    <span
                      className="duel-station-card-check"
                      aria-label="Selected"
                    >
                      <Check aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="duel-station-dots" aria-label="Contest position">
            {slates.map((slate) => (
              <button
                type="button"
                aria-label={`Select ${slate.question}`}
                data-active={slate.id === selectedSlate?.id}
                key={slate.id}
                onClick={() => onSelect(slate.id)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedSlate && !loading && !errorMessage && (
        <div className="duel-station-action-rail">
          <span className="duel-station-selection">
            <small>
              {completed
                ? "Your completed duel"
                : hasLineup
                  ? "Your active duel"
                  : "Selected contest"}
            </small>
            <strong>{selectedSlate.question}</strong>
          </span>
          {authenticated ? (
            <a href="#prediction-ticket" className="duel-station-cta">
              {actionLabel} <ArrowRight aria-hidden="true" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="duel-station-cta"
            >
              Sign in to enter <ArrowRight aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
