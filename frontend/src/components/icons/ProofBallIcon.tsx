import type { SVGProps } from "react";

export function ProofBallIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 520 520" fill="none" aria-hidden="true" {...props}>
      <defs>
        <radialGradient
          id="proof-ball-core"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(188 156) rotate(48) scale(395)"
        >
          <stop stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="0.48" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="1" stopColor="#050711" stopOpacity="0.08" />
        </radialGradient>
        <linearGradient
          id="proof-ball-edge"
          x1="102"
          y1="87"
          x2="427"
          y2="435"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.5" />
          <stop offset="0.42" stopColor="currentColor" stopOpacity="0.38" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
        <clipPath id="proof-ball-clip">
          <circle cx="260" cy="260" r="176" />
        </clipPath>
        <filter
          id="proof-ball-glow"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="proof-ball-orbit" stroke="currentColor">
        <ellipse cx="260" cy="260" rx="231" ry="92" strokeOpacity="0.16" />
        <ellipse
          cx="260"
          cy="260"
          rx="231"
          ry="92"
          strokeOpacity="0.08"
          transform="rotate(62 260 260)"
        />
        <circle
          cx="42"
          cy="231"
          r="5"
          fill="currentColor"
          fillOpacity="0.72"
          stroke="none"
          filter="url(#proof-ball-glow)"
        />
        <circle
          cx="402"
          cy="378"
          r="3.5"
          fill="white"
          fillOpacity="0.68"
          stroke="none"
        />
        <circle
          cx="327"
          cy="50"
          r="2.5"
          fill="currentColor"
          fillOpacity="0.62"
          stroke="none"
        />
      </g>

      <g className="proof-ball-body">
        <circle cx="260" cy="260" r="176" fill="url(#proof-ball-core)" />
        <circle
          cx="260"
          cy="260"
          r="176"
          stroke="url(#proof-ball-edge)"
          strokeWidth="2"
        />
        <circle
          cx="260"
          cy="260"
          r="168"
          stroke="currentColor"
          strokeOpacity="0.08"
        />

        <g clipPath="url(#proof-ball-clip)" stroke="currentColor">
          <path
            d="M260 173 309 208 290 266 230 266 211 208 260 173Z"
            fill="currentColor"
            fillOpacity="0.14"
            strokeOpacity="0.52"
            strokeWidth="2"
          />
          <path
            d="m211 208-68-17-37 50 41 54 83-29M309 208l68-17 37 50-41 54-83-29M230 266l-37 69 34 61h66l34-61-37-69"
            strokeOpacity="0.35"
            strokeWidth="2"
          />
          <path
            d="m143 191 13-73 66-37 38 92M377 191l-13-73-66-37-38 92M147 295l-27 64 56 67 51-30M373 295l27 64-56 67-51-30"
            strokeOpacity="0.22"
            strokeWidth="2"
          />
          <path
            d="M106 241 67 219M414 241l39-22M120 359l-34 34M400 359l34 34M222 81l-7-43M298 81l7-43"
            strokeOpacity="0.18"
          />

          <g fill="currentColor" stroke="none">
            <circle
              cx="260"
              cy="173"
              r="4"
              fillOpacity="0.85"
              filter="url(#proof-ball-glow)"
            />
            <circle cx="309" cy="208" r="3" fillOpacity="0.65" />
            <circle cx="290" cy="266" r="3.5" fillOpacity="0.78" />
            <circle cx="230" cy="266" r="3" fillOpacity="0.6" />
            <circle cx="211" cy="208" r="3.5" fillOpacity="0.7" />
            <circle cx="147" cy="295" r="2.5" fillOpacity="0.55" />
            <circle cx="373" cy="295" r="2.5" fillOpacity="0.55" />
            <circle cx="227" cy="396" r="3" fillOpacity="0.55" />
            <circle cx="293" cy="396" r="3" fillOpacity="0.55" />
          </g>

          <path
            d="M145 139c37-38 82-57 135-57"
            stroke="white"
            strokeOpacity="0.24"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M132 160c17-21 34-34 55-47"
            stroke="white"
            strokeOpacity="0.12"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
