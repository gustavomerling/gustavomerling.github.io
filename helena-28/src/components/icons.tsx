const PATHS = {
  bow: (
    <>
      <path d="M12 10.5C9.2 6.2 3.6 3.8 2.6 7.4c-.9 3.3 3 5.6 9.4 4.6Z" />
      <path d="M12 10.5c2.8-4.3 8.4-6.7 9.4-3.1.9 3.3-3 5.6-9.4 4.6Z" />
      <path d="M11 12.4 8.3 20l2.2-.9 1.5 1.9Zm2 0 2.7 7.6-2.2-.9-1.5 1.9Z" />
      <rect x="10.2" y="9" width="3.6" height="4.2" rx="1.6" />
    </>
  ),
  ghost: (
    <>
      <path d="M12 3C7.6 3 5 6.4 5 10.5V20l2.3-1.6L9.6 20l2.4-1.6 2.4 1.6 2.3-1.6L19 20v-9.5C19 6.4 16.4 3 12 3Z" />
      <circle cx="9.6" cy="10.4" r="1.1" fill="var(--ink)" stroke="none" />
      <circle cx="14.4" cy="10.4" r="1.1" fill="var(--ink)" stroke="none" />
    </>
  ),
  heart: (
    <path d="M12 20.5C5 15.5 2.5 12 2.5 8.6 2.5 6 4.5 4 7 4c1.9 0 3.6 1 5 2.8C13.4 5 15.1 4 17 4c2.5 0 4.5 2 4.5 4.6 0 3.4-2.5 6.9-9.5 11.9Z" />
  ),
  spark: <path d="M12 2c.8 6 4 9.2 10 10-6 .8-9.2 4-10 10-.8-6-4-9.2-10-10 6-.8 9.2-4 10-10Z" />,
  pumpkin: (
    <>
      <path fill="var(--orange-500)" d="M12 7.2c-1-.6-2.4-.9-3.6-.6C5 7.2 3 9.8 3 13.4 3 17.1 5.6 20 9 20c1.2 0 2.2-.3 3-.8.8.5 1.8.8 3 .8 3.4 0 6-2.9 6-6.6 0-3.6-2-6.2-5.4-6.8-1.2-.3-2.6 0-3.6.6Z" />
      <path d="M12 7.2V19.2M12 7.2c0-2 .6-3.2 2.2-4.2" fill="none" />
    </>
  ),
  bat: (
    <path d="M12 8.6c-.5-1.2-1.4-1.9-2.3-2 .3.8.2 1.6-.3 2.1-1.1-1-2.9-1.5-5.1-1.1 1.1.7 1.7 1.8 1.7 3.1-1.1-.5-2.5-.5-3.9.2 1.7.5 3.1 1.6 3.9 3.1 1-.9 2.5-1.2 3.9-.6.3-1.2 1.2-2 2.1-2.2.9.2 1.8 1 2.1 2.2 1.4-.6 2.9-.3 3.9.6.8-1.5 2.2-2.6 3.9-3.1-1.4-.7-2.8-.7-3.9-.2 0-1.3.6-2.4 1.7-3.1-2.2-.4-4 .1-5.1 1.1-.5-.5-.6-1.3-.3-2.1-.9.1-1.8.8-2.3 2Z" />
  ),
  star: (
    <path d="m12 2.8 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M7 4v16M17 4v16M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4" fill="none" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5.5l11-2.2V16" fill="none" />
      <circle cx="6.5" cy="18" r="2.6" />
      <circle cx="17.5" cy="16" r="2.6" />
    </>
  ),
}

export type IconName = keyof typeof PATHS

type IconProps = {
  name: IconName
  size?: number
  /** Cor de preenchimento; o contorno é sempre a "tinta" */
  color?: string
}

export function Icon({ name, size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      stroke="var(--ink)"
      strokeWidth={1.4}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  )
}
