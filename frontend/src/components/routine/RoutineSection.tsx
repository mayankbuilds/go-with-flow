"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, CheckCircle, Circle } from "lucide-react";
import { StudentRoutine } from "@/types";

interface RoutineSectionProps {
  routines: StudentRoutine[];
  onToggle: (id: number) => Promise<void>;
  onCreate: (title: string, start: string, end: string, cat: string) => Promise<void>;
}

export default function RoutineSection({ routines, onToggle, onCreate }: RoutineSectionProps) {
  const [nowStr, setNowStr] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:30");
  const [cat, setCat] = useState("Coding");

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      setNowStr(`${hh}:${mm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatus = (r: StudentRoutine) => {
    if (r.is_completed_today) {
      return { label: "Completed", color: "text-emerald-400 bg-emerald-950/60 border-emerald-800" };
    }
    if (nowStr >= r.start_time && nowStr <= r.end_time) {
      return { label: "Active Now", color: "text-amber-400 bg-amber-950/80 border-amber-700 animate-pulse" };
    }
    if (nowStr > r.end_time) {
      return { label: "Late / Pending", color: "text-rose-400 bg-rose-950/60 border-rose-800" };
    }
    return { label: `Starts at ${r.start_time}`, color: "text-zinc-400 bg-zinc-900 border-zinc-800" };
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreate(title.trim(), start, end, cat);
    setTitle("");
    setShowAdd(false);
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-zinc-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" /> Student Routine Timetable
          </h2>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            Structured daily blocks with live reminder status
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add Block
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-4 p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2">
          <input
            type="text"
            placeholder="e.g. Morning DSA, College Lab Prep, Revision"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs rounded-lg text-zinc-200 focus:outline-none"
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1 font-mono">Start Time</label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs rounded-lg text-zinc-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1 font-mono">End Time</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs rounded-lg text-zinc-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1 font-mono">Category</label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs rounded-lg text-zinc-200"
              >
                <option value="Coding">Coding</option>
                <option value="College">College</option>
                <option value="Workout">Workout</option>
                <option value="Reading">Reading</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs py-1.5 rounded-lg transition"
          >
            Lock Routine Block (+40 XP)
          </button>
        </form>
      )}

      <div className="space-y-2">
        {routines.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-600 font-mono">
            No routines set. Add your daily study or coding hours!
          </div>
        ) : (
          routines.map((r) => {
            const status = getStatus(r);
            return (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800/80 rounded-xl hover:border-zinc-700 transition"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggle(r.id)}
                    className="text-zinc-500 hover:text-emerald-400 transition"
                  >
                    {r.is_completed_today ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-600" />
                    )}
                  </button>
                  <div>
                    <span
                      className={`text-xs font-mono font-medium ${
                        r.is_completed_today ? "line-through text-zinc-500" : "text-zinc-200"
                      }`}
                    >
                      {r.title}
                    </span>
                    <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-2 mt-0.5">
                      <span>{r.start_time} - {r.end_time}</span>
                      <span>•</span>
                      <span>{r.category}</span>
                    </div>
                  </div>
                </div>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${status.color}`}>
                  {status.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}