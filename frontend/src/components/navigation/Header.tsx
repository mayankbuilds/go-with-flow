"use client";

import { Terminal, Flame, Timer, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { UserStats } from "@/types";
import {
  applyTheme,
  getInitialTheme,
  ThemeMode,
  AccentColor,
} from "@/lib/theme";

interface HeaderProps {
  stats: UserStats | null;
  onOpenPomodoro?: () => void;
  timerInfo?: {
    timeLeft: number;
    isRunning: boolean;
    mode: string;
  };
}

export default function Header({
  stats,
  onOpenPomodoro,
  timerInfo,
}: HeaderProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [accent, setAccent] = useState<AccentColor>("emerald");

  useEffect(() => {
    const init = getInitialTheme();
    setThemeMode(init.mode);
    setAccent(init.accent);
    applyTheme(init.mode, init.accent);

    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ mode: ThemeMode; accent: AccentColor }>;
      if (custom.detail) {
        setThemeMode(custom.detail.mode);
        setAccent(custom.detail.accent);
      }
    };
    window.addEventListener("streakflow-theme-changed", handler);
    return () =>
      window.removeEventListener("streakflow-theme-changed", handler);
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(next);
    applyTheme(next, accent);
  };
  const xp = stats?.xp ?? 100;
  const level = stats?.level ?? 1;
  const streakDays = stats?.current_streak_days ?? 1;
  const progressInLevel = Math.round(((xp % 300) / 300) * 100);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-zinc-800 gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-wider text-white uppercase font-mono flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-emerald-400" /> GO WITH FLOW
          </h1>
        </div>
        <p className="text-xs text-zinc-400 mt-1 font-mono">
          Daily Routines • Coding Arena • Deep Focus
        </p>
      </div>

      {/* Stats Widget */}
      <div className="flex items-center gap-3 self-start sm:self-auto bg-zinc-900/60 border border-zinc-800 p-2.5 rounded-2xl">
        <div className="flex items-center gap-2 pr-3 border-r border-zinc-800">
          <div className="w-7 h-7 rounded-xl bg-purple-950/60 border border-purple-800 flex items-center justify-center font-mono font-black text-purple-400 text-xs shadow-[0_0_10px_rgba(168,85,247,0.3)]">
            L{level}
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-400">
              <span>{xp % 300}/300 XP</span>
            </div>
            <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${progressInLevel}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-orange-400 font-mono text-xs px-2.5 py-1 bg-orange-950/40 border border-orange-800/60 rounded-xl">
          <Flame className="w-4 h-4 fill-orange-500 text-orange-500 animate-bounce" />
          <span className="font-bold">{streakDays} Days Active</span>
        </div>

        {onOpenPomodoro && (
          <button
            onClick={onOpenPomodoro}
            className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl border transition cursor-pointer ${
              timerInfo?.isRunning
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "bg-emerald-950/40 hover:bg-emerald-950/70 border-emerald-800/60 hover:border-emerald-700 text-emerald-400"
            }`}
            title="Open Fullscreen Pomodoro Focus (F)"
          >
            {timerInfo?.isRunning ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            ) : (
              <Timer className="w-3.5 h-3.5" />
            )}
            <span className="font-bold">
              {timerInfo
                ? timerInfo.isRunning
                  ? `${formatTimer(timerInfo.timeLeft)}`
                  : timerInfo.timeLeft < 1500
                    ? `${formatTimer(timerInfo.timeLeft)} (Paused)`
                    : "Focus Timer"
                : "Focus Timer"}
            </span>
          </button>
        )}

        {/* Dark / Light Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
          title={
            themeMode === "dark"
              ? "Switch to White / Light Mode"
              : "Switch to Dark Mode"
          }
        >
          {themeMode === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-cyan-400" />
          )}
        </button>
      </div>
    </header>
  );
}
