interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * YAFA logo mark — a rounded square in the primary colour with a
 * stylised "Y" and a small dot. Uses MUI theme CSS variables so it
 * follows the active colour scheme.
 */
export function LogoMark({ size = 28, className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      style={{ flex: "0 0 auto", display: "block" }}
    >
      <rect width="28" height="28" rx="8" fill="var(--mui-palette-primary-main, #0f62fe)" />
      <path
        d="M7.5 7.5 L13 14 L13 20.5 M18.5 7.5 L13 14"
        stroke="var(--mui-palette-primary-contrastText, #ffffff)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="9" r="1.5" fill="var(--mui-palette-primary-contrastText, #ffffff)" />
    </svg>
  );
}
