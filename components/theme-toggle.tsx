"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * No mount effect and no resolvedTheme read: the icon is chosen by CSS, so the
 * server HTML and the first client render agree. Clicking reads the html class
 * that next-themes already applied.
 */
export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => {
        const isDark = document.documentElement.classList.contains("dark");
        setTheme(isDark ? "light" : "dark");
      }}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-fg transition-colors duration-150 hover:border-border-strong hover:text-fg active:scale-[0.97]"
    >
      <Moon className="size-4 dark:hidden" strokeWidth={1.9} />
      <Sun className="hidden size-4 dark:block" strokeWidth={1.9} />
    </button>
  );
}
