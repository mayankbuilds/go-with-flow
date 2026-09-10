"use client";

import { CodingLog } from "@/types";

interface RecentLogsProps {
  logs: CodingLog[];
}

export default function RecentLogs({ logs }: RecentLogsProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-mono text-zinc-500 uppercase">
        Recent Submissions
      </span>
      {logs.length === 0 ? (
        <div className="text-xs font-mono text-zinc-600 p-4 border border-dashed border-zinc-800 rounded-xl text-center">
          No problems logged yet. Complete a problem to start your record!
        </div>
      ) : (
        logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between p-3 bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800/60 rounded-xl transition"
          >
            <div className="flex items-center gap-3">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  log.difficulty === "Easy"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                    : log.difficulty === "Hard"
                    ? "bg-rose-950 text-rose-400 border border-rose-800/60"
                    : "bg-amber-950 text-amber-400 border border-amber-800/60"
                }`}
              >
                {log.difficulty}
              </span>
              <span className="text-xs font-mono text-zinc-200">
                {log.problem_title}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                {log.platform}
              </span>
              <span>{log.solved_at}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}