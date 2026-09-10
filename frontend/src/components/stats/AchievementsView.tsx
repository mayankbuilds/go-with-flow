"use client";

import { Award, Flame, Shield, Sparkles, Trophy, Zap } from "lucide-react";
import { UserStats } from "@/types";

interface Props {
  stats: UserStats | null;
  totalSolved: number;
}

export default function AchievementsView({ stats, totalSolved }: Props) {
  const level = stats?.level ?? 1;
  const xp = stats?.xp ?? 0;
  const streak = stats?.current_streak_days ?? 0;
  const nextLevelXp = level * 300;
  const currentLevelProgress = xp % 300;

  const badges = [
    {
      id: "first_blood",
      title: "First Blood",
      desc: "Solve your first coding problem",
      unlocked: totalSolved >= 1,
      icon: Sparkles,
      tier: "Bronze",
    },
    {
      id: "streak_7",
      title: "Week Warrior",
      desc: "Maintain a 7-day consistency streak",
      unlocked: streak >= 7,
      icon: Flame,
      tier: "Silver",
    },
    {
      id: "century",
      title: "Centurion",
      desc: "Log 100 solved problems in the ledger",
      unlocked: totalSolved >= 100,
      icon: Trophy,
      tier: "Gold",
    },
    {
      id: "focus_master",
      title: "Shield Bearer",
      desc: "Reach Level 5 in execution hierarchy",
      unlocked: level >= 5,
      icon: Shield,
      tier: "Platinum",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Rank Status Banner */}
      <div className="bg-gradient-to-br from-purple-950/40 via-zinc-900/60 to-zinc-950 border border-purple-900/50 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">
              Player Hierarchy Tier
            </span>
            <h2 className="text-2xl font-black text-white font-mono mt-1 flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-400 fill-purple-400" />
              Level {level} Architect
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              {300 - currentLevelProgress} XP remaining to achieve Level {level + 1}
            </p>
          </div>

          <div className="text-right font-mono">
            <span className="text-3xl font-black text-purple-300">{xp}</span>
            <span className="text-xs text-zinc-500 block">Total Lifetime XP</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1.5">
            <span>Tier Progress</span>
            <span>{Math.round((currentLevelProgress / 300) * 100)}%</span>
          </div>
          <div className="h-3 w-full bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-emerald-400 transition-all duration-700"
              style={{ width: `${(currentLevelProgress / 300) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider font-mono text-zinc-400 mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" /> Milestones & Badges
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {badges.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                  b.unlocked
                    ? "bg-zinc-900/60 border-zinc-700/80 text-zinc-200"
                    : "bg-zinc-950/40 border-zinc-850 opacity-40 grayscale"
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl border ${
                    b.unlocked
                      ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-600"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-100">{b.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {b.tier}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">{b.desc}</p>
                  <span className="text-[10px] font-mono text-emerald-400 mt-2 block">
                    {b.unlocked ? "✓ UNLOCKED" : "LOCKED"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}