"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: render a stable icon on the server, swap on mount.
  useEffect(() => setMounted(true), []);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const Icon = !mounted
    ? Sun
    : theme === "dark"
      ? Moon
      : theme === "system"
        ? Monitor
        : Sun;

  const label = !mounted
    ? "Toggle theme"
    : `Current theme: ${theme}. Click to switch.`;

  return (
    <Button size="icon" onClick={cycleTheme} aria-label={label} title={label}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}
