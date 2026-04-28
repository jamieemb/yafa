import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

/**
 * YAFA logo mark — a rounded square in the primary colour with a
 * stylised "Y" inside and a small accent dot. Uses CSS tokens so it
 * picks up the active theme.
 */
export function LogoMark({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-7 shrink-0", className)}
      aria-hidden
    >
      <rect width="28" height="28" rx="6" className="fill-primary" />
      <path
        d="M7.5 7.5 L13 14 L13 20.5 M18.5 7.5 L13 14"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-[var(--primary-foreground)]"
      />
      <circle
        cx="21"
        cy="9"
        r="1.5"
        className="fill-[var(--primary-foreground)]"
      />
    </svg>
  );
}

/**
 * Logo mark + wordmark for sidebar / page header use.
 */
export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="flex flex-col leading-none">
        <span className="text-[15px] font-bold tracking-[-0.03em] text-foreground">
          YAFA
        </span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
          Yet Another Finance App
        </span>
      </div>
    </div>
  );
}
