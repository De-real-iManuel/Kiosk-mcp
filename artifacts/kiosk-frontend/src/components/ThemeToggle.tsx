"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  /** 'ink' renders for dark backgrounds; 'paper' for light backgrounds */
  surface?: "ink" | "paper";
  className?: string;
}

export function ThemeToggle({
  surface = "paper",
  className = "",
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  // Avoid hydration mismatch — don't render until mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className={`inline-block h-9 w-9 ${className}`} />;

  const isDark = theme === "dark";
  const baseColor =
    surface === "ink"
      ? "text-[#8A8478] hover:text-[#EDE7DC]"
      : "text-[#777064] hover:text-[#12110F]";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex h-9 w-9 items-center justify-center transition-colors ${baseColor} ${className}`}
    >
      {isDark ? (
        <Sun size={16} strokeWidth={1.6} />
      ) : (
        <Moon size={16} strokeWidth={1.6} />
      )}
    </button>
  );
}
