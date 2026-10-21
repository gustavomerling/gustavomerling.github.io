/** Emblem: a tower on the measuring grid, with the crosshair of the game. Flat strokes, one accent. */
export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 96 96" aria-hidden="true">
      <rect x="4" y="4" width="88" height="88" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path d="M4 48h88M48 4v88" stroke="currentColor" strokeWidth="1" opacity="0.12" />
      <path d="M26 88V26h44v62" fill="#0c0e12" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M26 48h44M26 68h44" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <g fill="currentColor" opacity="0.7">
        <rect x="34" y="34" width="6" height="8" />
        <rect x="56" y="34" width="6" height="8" />
        <rect x="34" y="54" width="6" height="8" />
        <rect x="56" y="54" width="6" height="8" />
      </g>
      <circle cx="48" cy="48" r="20" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      <path d="M48 22v10M48 64v10M22 48h10M64 48h10" stroke="var(--accent)" strokeWidth="2.5" />
      <circle cx="48" cy="48" r="2.5" fill="var(--accent)" />
    </svg>
  );
}

/** Brand block: emblem + wordmark. The title is the h1 of the page. */
export function Logo() {
  return (
    <div className="logo">
      <LogoMark />
      <div className="logo-word">
        <span className="logo-kicker">Project</span>
        <h1 className="logo-title" aria-label="Project Shooter 2D">
          Shooter<sup>2D</sup>
        </h1>
      </div>
    </div>
  );
}
