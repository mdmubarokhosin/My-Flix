"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <Button size="icon" onClick={cycleTheme} aria-label={`Current theme: ${theme}`}>
      <Monitor className="hidden dark:block" />
      <Sun className="block dark:hidden" />
    </Button>
  );
}
