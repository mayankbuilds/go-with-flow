"use client";

export type ThemeMode = "dark" | "light";
export type AccentColor = "emerald" | "cyan" | "purple" | "amber" | "rose";

export interface AccentConfig {
  id: AccentColor;
  name: string;
  hex: string;
  glow: string;
  bgClass: string;
}

export const ACCENT_PALETTES: AccentConfig[] = [
  {
    id: "emerald",
    name: "Emerald Flow",
    hex: "#10b981",
    glow: "rgba(16, 185, 129, 0.4)",
    bgClass: "bg-emerald-500",
  },
  {
    id: "cyan",
    name: "Cyan Velocity",
    hex: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.4)",
    bgClass: "bg-cyan-500",
  },
  {
    id: "purple",
    name: "Cyber Violet",
    hex: "#a855f7",
    glow: "rgba(168, 85, 247, 0.4)",
    bgClass: "bg-purple-500",
  },
  {
    id: "amber",
    name: "Solar Amber",
    hex: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.4)",
    bgClass: "bg-amber-500",
  },
  {
    id: "rose",
    name: "Neon Crimson",
    hex: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.4)",
    bgClass: "bg-rose-500",
  },
];

export function applyTheme(mode: ThemeMode, accent: AccentColor) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  // Apply mode
  if (mode === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  }

  // Apply accent
  root.setAttribute("data-accent", accent);

  const found = ACCENT_PALETTES.find((p) => p.id === accent) || ACCENT_PALETTES[0];
  root.style.setProperty("--theme-accent", found.hex);
  root.style.setProperty("--theme-accent-glow", found.glow);

  // Save to localStorage
  localStorage.setItem("streakflow_theme_mode", mode);
  localStorage.setItem("streakflow_accent_color", accent);

  window.dispatchEvent(
    new CustomEvent("streakflow-theme-changed", { detail: { mode, accent } }),
  );
}

export function getInitialTheme(): { mode: ThemeMode; accent: AccentColor } {
  if (typeof window === "undefined") {
    return { mode: "dark", accent: "emerald" };
  }

  const savedMode = (localStorage.getItem("streakflow_theme_mode") as ThemeMode) || "dark";
  const savedAccent = (localStorage.getItem("streakflow_accent_color") as AccentColor) || "emerald";

  return {
    mode: savedMode === "light" ? "light" : "dark",
    accent: ACCENT_PALETTES.some((p) => p.id === savedAccent) ? savedAccent : "emerald",
  };
}

