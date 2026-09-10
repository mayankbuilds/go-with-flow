"use client";

import { useMemo, useState, useEffect } from "react";
import { HeatmapDay } from "@/types";

interface HeatmapProps {
  data: HeatmapDay[];
}

export default function Heatmap({ data }: HeatmapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((d) => {
      map[d.date] = d.count;
    });
    return map;
  }, [data]);

  const days = useMemo(() => {
    if (!mounted) return [];
    const arr = [];
    const today = new Date();
    for (let i = 111; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      arr.push({
        date: iso,
        count: countMap[iso] || 0,
      });
    }
    return arr;
  }, [countMap, mounted]);

  const getColor = (count: number) => {
    if (count === 0) return "bg-zinc-900 border-zinc-800/80";
    if (count === 1) return "bg-emerald-950/80 border-emerald-800 text-emerald-300";
    if (count <= 3) return "bg-emerald-700 border-emerald-600 text-emerald-100";
    return "bg-emerald-500 border-emerald-400 text-black";
  };

  const totalSolved = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Execution Matrix</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Last 16 weeks of coding consistency</p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-emerald-400">{totalSolved}</span>
          <span className="text-xs text-zinc-500">solved</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[500px] min-h-[120px]">
          {mounted &&
            days.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count} solved`}
                className={`w-3.5 h-3.5 rounded-sm border transition-all hover:scale-125 cursor-pointer ${getColor(
                  d.count
                )}`}
              />
            ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-[11px] text-zinc-500">
        <span>16 weeks ago</span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-zinc-900 border border-zinc-800" />
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-950 border border-emerald-800" />
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-700" />
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span>More</span>
        </div>
        <span>Today</span>
      </div>
    </div>
  );
}