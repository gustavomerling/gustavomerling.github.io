export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g transform="rotate(6.5 20 32)">
        <rect x="8" y="6" width="6" height="28" rx="3" fill="currentColor" />
        <rect x="22" y="6" width="6" height="28" rx="3" fill="currentColor" />
        <rect x="36" y="6" width="6" height="28" rx="3" fill="currentColor" />
      </g>
    </svg>
  )
}