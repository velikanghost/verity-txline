import type { SVGProps } from "react";

type ArcadeIconProps = SVGProps<SVGSVGElement> & { active?: boolean };

const INK = "#241B4A";
const MUTED = "#B9B5C5";
const PAPER = "#FFF9EC";

export function HomeNavIcon({ active, ...props }: ArcadeIconProps) {
  const roof = active ? "#DE7186" : "#AAA5B2";
  const wall = active ? "#AFE9D9" : "#E4E1E7";
  const detail = active ? "#F2D66A" : MUTED;

  return (
    <svg viewBox="0 0 76 64" fill="none" {...props}>
      <path
        d="M12 32 38 9l26 23-5 6-4-4v21H21V34l-4 4Z"
        fill={INK}
        opacity={active ? 1 : 0.22}
        transform="translate(3 4)"
      />
      <path
        d="M12 29 38 6l26 23-5 6-4-4v21H21V31l-4 4Z"
        fill={wall}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="m14 28 24-21 25 22-6 7-19-17-18 16Z"
        fill={roof}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 52V35h13v17"
        fill={detail}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="25" y="34" width="6" height="7" rx="1" fill={PAPER} stroke={INK} strokeWidth="2" />
      <circle cx="41" cy="43" r="1.5" fill={INK} />
    </svg>
  );
}

export function DuelNavIcon({ active, ...props }: ArcadeIconProps) {
  const left = active ? "#8F79D8" : "#AAA5B2";
  const right = active ? "#DE7186" : "#C5C0C9";
  const spark = active ? "#F2D66A" : MUTED;

  return (
    <svg viewBox="0 0 76 64" fill="none" {...props}>
      <g opacity={active ? 1 : 0.22} transform="translate(3 4)">
        <path d="m17 10 11 3 31 36-8 8-33-37Z" fill={INK} />
        <path d="m59 10-11 3-31 36 8 8 33-37Z" fill={INK} />
      </g>
      <path
        d="m17 7 11 3 31 36-8 8-33-37Z"
        fill={left}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="m59 7-11 3-31 36 8 8 33-37Z"
        fill={right}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="m13 45 13-1 5 6-8 10-5-6-6-1Z" fill={spark} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="m63 45-13-1-5 6 8 10 5-6 6-1Z" fill={spark} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path
        className="arcade-duel-spark"
        d="m38 17 2.5 5.5L46 25l-5.5 2.5L38 33l-2.5-5.5L30 25l5.5-2.5Z"
        fill={spark}
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchNavIcon({ active, ...props }: ArcadeIconProps) {
  const lens = active ? "#AFE9D9" : "#E4E1E7";
  const handle = active ? "#8F79D8" : "#AAA5B2";
  const accent = active ? "#F2D66A" : MUTED;

  return (
    <svg viewBox="0 0 76 64" fill="none" {...props}>
      <g opacity={active ? 1 : 0.22} transform="translate(3 4)">
        <circle cx="31" cy="26" r="18" fill={INK} />
        <path d="m44 39 17 15-7 7-16-17Z" fill={INK} />
      </g>
      <circle cx="31" cy="26" r="18" fill={lens} stroke={INK} strokeWidth="3" />
      <circle cx="31" cy="26" r="11" fill={PAPER} stroke={INK} strokeWidth="2" />
      <path d="m44 39 17 15-7 7-16-17Z" fill={handle} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M25 20c3-3 8-3 11 0" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path
        className="arcade-search-star"
        d="m57 8 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z"
        fill={accent}
        stroke={INK}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function PlayerNavIcon({ active, ...props }: ArcadeIconProps) {
  const card = active ? "#8F79D8" : "#AAA5B2";
  const face = active ? "#F2D66A" : "#D5D1DA";
  const shirt = active ? "#AFE9D9" : "#E4E1E7";
  const badge = active ? "#E8294F" : MUTED;

  return (
    <svg viewBox="0 0 76 64" fill="none" {...props}>
      <g transform="rotate(-5 38 31)">
        <rect x="17" y="7" width="43" height="49" rx="7" fill={INK} opacity={active ? 1 : 0.22} transform="translate(3 4)" />
        <rect x="17" y="7" width="43" height="49" rx="7" fill={card} stroke={INK} strokeWidth="3" />
        <rect x="22" y="12" width="33" height="38" rx="4" fill={PAPER} stroke={INK} strokeWidth="2" />
        <circle cx="38.5" cy="25" r="7" fill={face} stroke={INK} strokeWidth="2" />
        <path d="M27 45c1-8 5.5-12 11.5-12S49 37 51 45Z" fill={shirt} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="m51 10 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill={badge} stroke={INK} strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export function AlertNavIcon({ active, ...props }: ArcadeIconProps) {
  const bell = active ? "#F2D66A" : "#E4E1E7";
  const metal = active ? "#8F79D8" : "#AAA5B2";
  const spark = active ? "#DE7186" : MUTED;

  return (
    <svg viewBox="0 0 76 64" fill="none" {...props}>
      <g opacity={active ? 1 : 0.22} transform="translate(3 4)">
        <path d="M38 12c-12 0-16 11-17 22-1 8-5 10-5 12h44c0-2-4-4-5-12-1-11-5-22-17-22Z" fill={INK} />
        <rect x="14" y="45" width="48" height="6" rx="3" fill={INK} />
        <circle cx="38" cy="55" r="4.5" fill={INK} />
      </g>
      <path
        d="M38 9c-12 0-16 11-17 22-1 8-5 10-5 12h44c0-2-4-4-5-12-1-11-5-22-17-22Z"
        fill={bell}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M30 19c2-3 6-5 9-5" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <rect x="14" y="42" width="48" height="6" rx="3" fill={metal} stroke={INK} strokeWidth="3" />
      <circle cx="38" cy="52" r="4.5" fill={metal} stroke={INK} strokeWidth="3" />
      <circle cx="38" cy="9" r="4" fill={metal} stroke={INK} strokeWidth="2.5" />
      <path
        className="arcade-search-star"
        d="m58 10 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z"
        fill={spark}
        stroke={INK}
        strokeWidth="1.5"
      />
    </svg>
  );
}
