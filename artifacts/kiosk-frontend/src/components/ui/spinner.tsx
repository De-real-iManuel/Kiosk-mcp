import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
  reduceMotion?: boolean;
}

function LoadingSpinner({
  className,
  size = 24,
  reduceMotion = false,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center justify-center", className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        className={cn(!reduceMotion && "animate-spin")}
        style={!reduceMotion ? { animationDuration: "8s" } : undefined}
      >
        <path
          fillRule="evenodd"
          d="M7 11h86v11H83v52c0 10.5-6.5 17-17 17H34c-10.5 0-17-6.5-17-17V22H7V11Zm28 34h30v19H35V45Z"
        />
      </svg>
    </span>
  );
}

// Legacy alias - keep for any existing callers
const Spinner = LoadingSpinner;

export { LoadingSpinner, Spinner };
