// Shared inline SVG icons (no icon library needed).

type IconProps = { className?: string };

export function ScoutMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.5c1 4.2 2.3 5.5 6.5 6.5-4.2 1-5.5 2.3-6.5 6.5-1-4.2-2.3-5.5-6.5-6.5 4.2-1 5.5-2.3 6.5-6.5Z" />
      <path
        d="M18.2 14.2c.5 2.1 1.15 2.75 3.3 3.3-2.15.55-2.8 1.2-3.3 3.3-.5-2.1-1.15-2.75-3.3-3.3 2.15-.55 2.8-1.2 3.3-3.3Z"
        opacity={0.8}
      />
    </svg>
  );
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h8.5M17.5 7H20M4 17h2.5M11.5 17H20" />
      <circle cx="15" cy="7" r="2.25" />
      <circle cx="9" cy="17" r="2.25" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 17 17 7M8.5 7H17v8.5" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.4 12.3 2.4 2.4 4.8-5" />
    </svg>
  );
}
