"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils/cn";

const themes = [
  {
    value: "light",
    label: "Light",
    description: "Always use the light theme.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark theme.",
  },
  {
    value: "system",
    label: "System",
    description: "Match your device preference.",
  },
] as const;

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Theme preference uses the existing next-themes client persistence.
 * It is not stored on the user or workspace document.
 */
export function ThemePreference() {
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();
  const active = isClient ? (theme ?? "system") : "system";

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Theme preference</legend>
      <p className="text-xs leading-5 text-muted-foreground">
        Applies on this device. Your choice is remembered in the browser and is
        not synced to the workspace.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {themes.map((item) => {
          const selected = active === item.value;
          const inputId = `theme-${item.value}`;
          return (
            <label
              key={item.value}
              htmlFor={inputId}
              className={cn(
                "cursor-pointer rounded-[var(--radius-md)] border px-3 py-3 transition-ui",
                selected
                  ? "border-ring bg-muted/70"
                  : "border-border bg-background hover:bg-muted/40",
              )}
            >
              <span className="flex items-start gap-2.5">
                <input
                  id={inputId}
                  type="radio"
                  name="theme"
                  value={item.value}
                  checked={selected}
                  onChange={() => setTheme(item.value)}
                  className="mt-1 size-3.5 accent-foreground"
                />
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                  <span className="block text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
