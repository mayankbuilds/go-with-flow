"use client";

import { Target, Trophy } from "lucide-react";
import { DailyFocus } from "@/types";
import DailyFocusCard from "./DailyFocusCard";

interface FocusSectionProps {
  tasks: DailyFocus[];
  onSave: (priority: number, title: string) => Promise<void>;
  onToggle: (item: DailyFocus) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function FocusSection({
  tasks,
  onSave,
  onToggle,
  onDelete,
}: FocusSectionProps) {
  const getSlot = (p: number) => tasks.find((t) => t.priority_order === p);
  const completedCount = tasks.filter((t) => t.is_completed).length;

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-zinc-200 flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" /> Rule of 3 (Today's Non-Negotiables)
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
            Focus on 3 priority targets. (+20 XP each)
          </p>
        </div>
        {completedCount === 3 && (
          <span className="flex items-center gap-1 text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-md">
            <Trophy className="w-3 h-3" /> Day Complete!
          </span>
        )}
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((slot) => (
          <DailyFocusCard
            key={slot}
            slotNumber={slot}
            item={getSlot(slot)}
            onSave={onSave}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}