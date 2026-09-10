"use client";

import { Terminal, Flame, Zap } from "lucide-react";
import { UserStats } from "@/types";

interface HeaderProps {
  stats: UserStats | null;
}

export default function Header({ stats }: HeaderProps) {
  const xp = stats?.xp ?? 100;
  const level = stats?.level ?? 1;
  const streakDays = stats?.current_streak_days ?? 1;
  const progressInLevel = Math.round(((xp % 300) / 300) * 100);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-zinc-800 gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono flex items-center gap-2">
            <Terminal className="w-6 h-6 text-emerald-400" /> STREAKFLOW // OS
          </h1>
          <span className="text-[11px] font-mono bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Zap className="w-3 h-3 fill-emerald-400" /> V2.0
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1 font-mono">
          Student Routine Architect • Execution Arena • Rule-of-3 Engine
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
      </div>
    </header>
  );
}