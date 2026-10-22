import type { ReactNode } from 'react';

/** 24px line icons for the menu, same stroke weight as the game's flat shapes. */
const frame = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const MENU_ICONS: Record<string, ReactNode> = {
  campaign: frame(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l5.5 3.5-5.5 3.5z" fill="currentColor" />
    </>,
  ),
  zombie: frame(
    <>
      <circle cx="12" cy="11" r="8" />
      <path d="M7.5 9.5l2 2M9.5 9.5l-2 2M14.5 9.5l2 2M16.5 9.5l-2 2" />
      <path d="M8.5 15.5l1.2-1.2 1.2 1.2 1.2-1.2 1.2 1.2 1.2-1.2 1.2 1.2" />
      <path d="M9 19v2M15 19v2" />
    </>,
  ),
  medieval: frame(
    <>
      <path d="M4 4h8v5c0 3.5-2.4 5.6-4 6.6C6.4 14.6 4 12.5 4 9z" />
      <path d="M20.5 3.5l-9 9M12 7.5l4.5 4.5M10.5 12l2.5 2.5" />
    </>,
  ),
  seed: frame(
    <>
      <rect x="3.5" y="3.5" width="17" height="17" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9.5 3.5v17M14.5 3.5v17" opacity="0.5" />
      <path d="M12 9.5v5M9.5 12h5" />
    </>,
  ),
  controls: frame(
    <>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
    </>,
  ),
  options: frame(
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>,
  ),
  quit: frame(
    <>
      <path d="M12 3v8" />
      <path d="M7.1 6.4a7.5 7.5 0 1 0 9.8 0" />
    </>,
  ),
};
