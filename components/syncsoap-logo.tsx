import type { SVGProps } from "react";

export function SyncSoapLogo({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      aria-hidden
      {...props}
    >
      <polygon
        points="50,15 15,80 85,80"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <line
        x1="50"
        y1="15"
        x2="50"
        y2="55"
        stroke="currentColor"
        strokeWidth="4"
      />
      <line
        x1="15"
        y1="80"
        x2="50"
        y2="55"
        stroke="currentColor"
        strokeWidth="4"
      />
      <line
        x1="85"
        y1="80"
        x2="50"
        y2="55"
        stroke="currentColor"
        strokeWidth="4"
      />
      <circle cx="50" cy="55" r="5" fill="currentColor" />
      <circle cx="50" cy="15" r="8" fill="currentColor" />
      <circle cx="15" cy="80" r="8" fill="currentColor" />
      <circle cx="85" cy="80" r="8" fill="currentColor" />
    </svg>
  );
}
