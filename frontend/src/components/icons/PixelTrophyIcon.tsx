import type { SVGProps } from "react";

export function PixelTrophyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      {...props}
    >
      <g fill="#241B4A">
        <path d="M7 4h18v3H7zM5 7h4v9H5zM3 7h4v3H3zM3 10h3v6H3zM5 14h5v4H5zM23 7h4v9h-4zM25 7h4v3h-4zM26 10h3v6h-3zM22 14h5v4h-5zM8 7h16v9H8zM10 16h12v4H10zM13 20h6v5h-6zM9 24h14v5H9z" />
      </g>

      <g>
        <path fill="#FFC844" d="M10 7h12v7H10z" />
        <path fill="#F4A62A" d="M10 14h12v2H10zM8 8h2v6H8zM22 8h2v6h-2z" />
        <path fill="#FFDE72" d="M11 8h4v5h-4z" />
        <path fill="#E67822" d="M18 8h4v6h-4zM13 16h6v3h-6zM15 20h2v4h-2zM11 26h10v1H11z" />
        <path fill="#FFC844" d="M6 10h2v4H6zM24 10h2v4h-2zM15 19h2v5h-2zM11 25h10v2H11z" />
        <path fill="#FFF9EC" d="M12 8h2v2h-2z" />
      </g>
    </svg>
  );
}
