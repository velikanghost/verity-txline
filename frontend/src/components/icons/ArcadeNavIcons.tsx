import type { SVGProps } from "react"

type ArcadeIconProps = SVGProps<SVGSVGElement> & { active?: boolean }

export function HomeNavIcon({ active, ...props }: ArcadeIconProps) {
  return (
    <svg viewBox="0 0 76 64" fill="none" {...props}>
      <defs>
        <linearGradient id="home-roof" x1="15" y1="11" x2="57" y2="51">
          <stop stopColor={active ? "#8EC5FF" : "#69758C"} />
          <stop offset="0.5" stopColor={active ? "#0090FF" : "#343D50"} />
          <stop offset="1" stopColor={active ? "#065FB0" : "#171E2C"} />
        </linearGradient>
        <linearGradient id="home-door" x1="31" y1="34" x2="45" y2="54">
          <stop stopColor={active ? "#FFC844" : "#676E7D"} />
          <stop offset="1" stopColor={active ? "#FF7A1A" : "#303744"} />
        </linearGradient>
      </defs>
      <ellipse cx="38" cy="56" rx="24" ry="5" fill="#020711" opacity=".55" />
      <g transform="rotate(-2 38 32)">
        <path d="M12 30 37 8l27 22-5 7-4-3v20H20V34l-3 3Z" fill="url(#home-roof)" stroke={active ? "#B9DBFF" : "#707C93"} strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M18 31 38 14l20 17" stroke="white" strokeOpacity={active ? ".6" : ".18"} strokeWidth="2" strokeLinecap="round" />
        <path d="M30 54V36c0-2 1.6-3.5 3.5-3.5h9c2 0 3.5 1.5 3.5 3.5v18Z" fill="url(#home-door)" stroke={active ? "#FFE39A" : "#727987"} strokeWidth="1.4" />
        <circle cx="42" cy="43" r="1.5" fill={active ? "#F4F7FF" : "#8A91A0"} />
        <path d="M24 28h28" stroke={active ? "#00CA48" : "#4D5668"} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function DuelNavIcon({ active, ...props }: ArcadeIconProps) {
  return (
    <svg viewBox="0 0 76 64" fill="none" {...props}>
      <defs>
        <linearGradient id="duel-blade" x1="12" y1="9" x2="57" y2="54">
          <stop stopColor={active ? "#8EC5FF" : "#66728D"} />
          <stop offset="0.48" stopColor={active ? "#0090FF" : "#30394E"} />
          <stop offset="1" stopColor={active ? "#065FB0" : "#171D2B"} />
        </linearGradient>
        <filter id="duel-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={active ? "2.4" : "0.8"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="38" cy="55" rx="23" ry="5" fill="#020711" opacity=".55" />
      <g filter="url(#duel-glow)">
        <path d="M18 9 26 12 52 45 46 51 20 18Z" fill="url(#duel-blade)" stroke={active ? "#B9DBFF" : "#75809A"} strokeWidth="1.5" />
        <path d="m21 43 13-12 5 6-13 12-1 7-5 3-3-3 3-5Z" fill={active ? "#FFC844" : "#555C6B"} stroke={active ? "#FFE7A0" : "#777E8B"} strokeWidth="1.2" />
        <path d="M58 9 50 12 24 45 30 51 56 18Z" fill="url(#duel-blade)" stroke={active ? "#B9DBFF" : "#75809A"} strokeWidth="1.5" />
        <path d="m55 43-13-12-5 6 13 12 1 7 5 3 3-3-3-5Z" fill={active ? "#FF3E00" : "#555C6B"} stroke={active ? "#FFB09C" : "#777E8B"} strokeWidth="1.2" />
        <path d="M28 13 48 39" stroke="white" strokeOpacity={active ? ".68" : ".18"} strokeWidth="1.3" />
      </g>
    </svg>
  )
}

export function SearchNavIcon({ active, ...props }: ArcadeIconProps) {
  return (
    <svg viewBox="0 0 76 64" fill="none" {...props}>
      <defs>
        <radialGradient id="search-lens" cx="0" cy="0" r="1" gradientTransform="translate(30 23) rotate(50) scale(28)">
          <stop stopColor={active ? "#BDE8FF" : "#79859C"} />
          <stop offset=".45" stopColor={active ? "#00CA48" : "#3E4658"} />
          <stop offset="1" stopColor={active ? "#0090FF" : "#1D2433"} />
        </radialGradient>
      </defs>
      <ellipse cx="38" cy="55" rx="22" ry="5" fill="#020711" opacity=".55" />
      <g className="arcade-lens-ring">
        <circle cx="31" cy="27" r="18" fill="#10182A" stroke={active ? "#BFE0FF" : "#69748B"} strokeWidth="3" />
        <circle cx="31" cy="27" r="13" fill="url(#search-lens)" stroke={active ? "#0090FF" : "#343D50"} strokeWidth="2" />
        <path d="m43 40 17 14-6 6-16-16Z" fill={active ? "#0090FF" : "#343D50"} stroke={active ? "#91C4FF" : "#68738B"} strokeWidth="1.5" />
        <path d="M24 19c4-3 9-3 13 0" stroke="white" strokeOpacity={active ? ".75" : ".24"} strokeWidth="2" strokeLinecap="round" />
        {active && <path d="M14 27h34" stroke="#F4F7FF" strokeOpacity=".72" className="arcade-scan-line" />}
      </g>
    </svg>
  )
}

export function TrophyNavIcon({ active, ...props }: ArcadeIconProps) {
  return (
    <svg viewBox="0 0 76 64" fill="none" {...props}>
      <defs>
        <linearGradient id="trophy-cup" x1="24" y1="10" x2="52" y2="42">
          <stop stopColor={active ? "#FFE39A" : "#69758C"} />
          <stop offset=".5" stopColor={active ? "#FFC844" : "#343D50"} />
          <stop offset="1" stopColor={active ? "#FF7A1A" : "#171E2C"} />
        </linearGradient>
      </defs>
      <ellipse cx="38" cy="56" rx="21" ry="4.6" fill="#020711" opacity=".55" />
      <g transform="rotate(-2 38 30)">
        <path d="M25 15c-8 0-9 12 0 13" stroke={active ? "#B9DBFF" : "#707C93"} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M51 15c8 0 9 12 0 13" stroke={active ? "#B9DBFF" : "#707C93"} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M24 11h28v6c0 10-6 16-14 16s-14-6-14-16z" fill="url(#trophy-cup)" stroke={active ? "#FFE7A0" : "#707C93"} strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M29 14c-1 6 1 11 5 13" stroke="white" strokeOpacity={active ? ".6" : ".18"} strokeWidth="2" strokeLinecap="round" />
        <path d="M38 17l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill={active ? "#FF3E00" : "#4D5668"} />
        <path d="M35 33h6v6h-6z" fill={active ? "#FFC844" : "#555C6B"} />
        <path d="M29 45c0-2 2-4 4-4h10c2 0 4 2 4 4v2H29z" fill="url(#trophy-cup)" stroke={active ? "#FFE7A0" : "#727987"} strokeWidth="1.3" />
        <rect x="27" y="47" width="24" height="4" rx="2" fill={active ? "#FF7A1A" : "#4A5263"} />
      </g>
    </svg>
  )
}

export function PlayerNavIcon({ active, ...props }: ArcadeIconProps) {
  return (
    <svg viewBox="0 0 76 64" fill="none" {...props}>
      <defs>
        <linearGradient id="player-card" x1="19" y1="7" x2="58" y2="56">
          <stop stopColor={active ? "#43F093" : "#66728A"} />
          <stop offset=".5" stopColor={active ? "#0090FF" : "#30394B"} />
          <stop offset="1" stopColor={active ? "#065FB0" : "#171D2A"} />
        </linearGradient>
      </defs>
      <ellipse cx="38" cy="56" rx="23" ry="5" fill="#020711" opacity=".55" />
      <g transform="rotate(-7 38 31)">
        <rect x="17" y="7" width="43" height="48" rx="8" fill="url(#player-card)" stroke={active ? "#B8D9FF" : "#707B91"} strokeWidth="1.7" />
        <rect x="22" y="12" width="33" height="38" rx="5" fill="#08111F" fillOpacity=".72" stroke="white" strokeOpacity=".16" />
        <circle cx="38.5" cy="25" r="7" fill={active ? "#FFC844" : "#626B7D"} />
        <path d="M28 43c1.8-7 6-10 10.5-10S47 36 49 43" fill={active ? "#00CA48" : "#4A5263"} />
        <path d="M23 15h9" stroke="white" strokeOpacity={active ? ".65" : ".2"} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="53" cy="14" r="2" fill={active ? "#FF3E00" : "#555E70"} />
      </g>
    </svg>
  )
}
