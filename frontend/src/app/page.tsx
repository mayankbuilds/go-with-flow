"use client";

import { useState, useEffect } from "react";
import { 
  Target, 
  Terminal, 
  Plus, 
  Check, 
  Flame, 
  ExternalLink, 
  BookOpen, 
  Archive, 
  Sparkles 
} from "lucide-react";
import Heatmap from "@/components/Heatmap";
import { CodingLog, HeatmapDay, DailyFocus, ScratchpadItem } from "@/types";

const API_BASE = "http://localhost:8000";

export default function CommandPage() {
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [recentLogs, setRecentLogs] = useState<CodingLog[]>([]);
  const [focusTasks, setFocusTasks] = useState<DailyFocus[]>([]);
  const [scratchItems, setScratchItems] = useState<ScratchpadItem[]>([]);

  // Modals & Inputs
  const [probTitle, setProbTitle] = useState("");
  const [platform, setPlatform] = useState("LeetCode");
  const [difficulty, setDifficulty] = useState("Medium");
  const [topicTag, setTopicTag] = useState("DP");
  const [scratchInput, setScratchInput] = useState("");
  const [scratchBucket, setScratchBucket] = useState("College");

  useEffect(() => {
    refreshAll();
  }, []);

  const refreshAll = () => {
    fetchHeatmap();
    fetchRecentLogs();
    fetchTodayFocus();
    fetchScratchpad();
  };

  const fetchHeatmap = async () => {
    const res = await fetch(`${API_BASE}/coding/heatmap?days=112`);
    if (res.ok) setHeatmapData(await res.json());
  };

  const fetchRecentLogs = async () => {
    const res = await fetch(`${API_BASE}/coding/logs?limit=5`);
    if (res.ok) setRecentLogs(await res.json());
  };

  const fetchTodayFocus = async () => {
    const res = await fetch(`${API_BASE}/focus/today`);
    if (res.ok) setFocusTasks(await res.json());
  };

  const fetchScratchpad = async () => {
    const res = await fetch(`${API_BASE}/scratchpad`);
    if (res.ok) setScratchItems(await res.json());
  };

  // Log a Solved Problem
  const handleLogProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!probTitle.trim()) return;

    const res = await fetch(`${API_BASE}/coding/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problem_title: probTitle,
        platform,
        difficulty,
        topic_tag: topicTag,
      }),
    });

    if (res.ok) {
      setProbTitle("");
      fetchRecentLogs();
      fetchHeatmap();
    }
  };

  // Set or Overwrite Focus Slot (1, 2, or 3)
  const handleSetFocus = async (priority: number, title: string) => {
    if (!title.trim()) return;
    const res = await fetch(`${API_BASE}/focus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority_order: priority, title }),
    });
    if (res.ok) fetchTodayFocus();
  };

  // Toggle Focus Completion
  const toggleFocusDone = async (item: DailyFocus) => {
    const res = await fetch(`${API_BASE}/focus/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: !item.is_completed }),
    });
    if (res.ok) fetchTodayFocus();
  };

  // Add Scratchpad Errands
  const handleAddScratchpad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scratchInput.trim()) return;

    const res = await fetch(`${API_BASE}/scratchpad`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: scratchInput, bucket: scratchBucket }),
    });

    if (res.ok) {
      setScratchInput("");
      fetchScratchpad();
    }
  };

  const handleArchiveScratch = async (id: number) => {
    const res = await fetch(`${API_BASE}/scratchpad/${id}/archive`, { method: "PATCH" });
    if (res.ok) fetchScratchpad();
  };

  const getSlot = (p: number) => focusTasks.find((f) => f.priority_order === p);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
      {/* Top Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono flex items-center gap-2">
              <Terminal className="w-6 h-6 text-emerald-400" /> STREAKFLOW // OS
            </h1>
            <span className="text-[11px] font-mono bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 px-2 py-0.5 rounded-full">
              LIVE EXECUTION
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            AIML & DSA Arena • Rule of 3 Non-Negotiables • Fast Cognitive Scratchpad
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span className="text-xs font-mono text-zinc-300">DSA Streak Active</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Arena on Left, Rule-of-3 on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: The Arena (DSA & Heatmap) */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" /> The Coding Arena
            </h2>
            <span className="text-xs text-zinc-500 font-mono">Real-time ledger</span>
          </div>

          {/* GitHub Style Heatmap */}
          <Heatmap data={heatmapData} />

          {/* Log Problem Form */}
          <form onSubmit={handleLogProblem} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4">
            <span className="text-xs font-mono text-zinc-400 block mb-2 font-medium">Log Solved Problem:</span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <input
                type="text"
                placeholder="Problem title (e.g. 3Sum, Coin Change)"
                value={probTitle}
                onChange={(e) => setProbTitle(e.target.value)}
                className="sm:col-span-6 bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs rounded-xl text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="sm:col-span-2 bg-zinc-950 border border-zinc-800 px-2 py-2 text-xs rounded-xl text-zinc-300 focus:outline-none"
              >
                <option value="LeetCode">LeetCode</option>
                <option value="Codeforces">CF</option>
                <option value="GFG">GFG</option>
                <option value="Personal">Custom</option>
              </select>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="sm:col-span-2 bg-zinc-950 border border-zinc-800 px-2 py-2 text-xs rounded-xl text-zinc-300 focus:outline-none"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <button
                type="submit"
                className="sm:col-span-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Log
              </button>
            </div>
          </form>

          {/* Recent Solves Feed */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-zinc-500 uppercase">Recent Submissions</span>
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800/60 rounded-xl"
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
                  <span className="text-xs font-mono text-zinc-200">{log.problem_title}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                  <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">{log.platform}</span>
                  <span>{log.solved_at}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT: Daily Focus (Rule of 3) & Scratchpad */}
        <section className="lg:col-span-5 space-y-6">
          
          {/* Rule of 3 Focus Engine */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-zinc-200 flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-400" /> Rule of 3 (Today's Non-Negotiables)
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">Max 3 tasks. Everything else is distraction.</p>
              </div>
            </div>

            <div className="space-y-3">
              {[1, 2, 3].map((slotNumber) => {
                const item = getSlot(slotNumber);
                return (
                  <div
                    key={slotNumber}
                    className={`p-3.5 rounded-xl border transition-all ${
                      item?.is_completed
                        ? "bg-zinc-950/40 border-emerald-900/40 text-zinc-500"
                        : item
                        ? "bg-zinc-900/80 border-zinc-700/80 text-zinc-200 shadow-sm"
                        : "bg-zinc-950/30 border-dashed border-zinc-800 text-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-black text-orange-400/80">#{slotNumber}</span>
                      
                      {item ? (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className={`text-xs font-medium truncate ${item.is_completed ? "line-through text-zinc-500" : ""}`}>
                            {item.title}
                          </span>
                          <button
                            onClick={() => toggleFocusDone(item)}
                            className={`p-1.5 rounded-lg transition ${
                              item.is_completed
                                ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder={`Lock in Priority #${slotNumber}...`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSetFocus(slotNumber, (e.target as HTMLInputElement).value);
                            }
                          }}
                          className="flex-1 bg-transparent text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none font-mono"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cognitive Dump / Errands / College Scratchpad */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Brain-dump & College Errands
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">Auto-triage</span>
            </div>

            <form onSubmit={handleAddScratchpad} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Quick dump: 'Buy curd', 'Submit compiler lab'..."
                value={scratchInput}
                onChange={(e) => setScratchInput(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs rounded-xl text-zinc-200 focus:outline-none focus:border-zinc-600"
              />
              <select
                value={scratchBucket}
                onChange={(e) => setScratchBucket(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-xs rounded-xl text-zinc-400"
              >
                <option value="College">College</option>
                <option value="Errand">Errand</option>
                <option value="Shopping">Shopping</option>
              </select>
              <button
                type="submit"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 text-xs rounded-xl transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-none">
              {scratchItems.length === 0 ? (
                <div className="text-center py-6 text-zinc-600 text-xs font-mono">
                  Inbox zero. Clean mental space.
                </div>
              ) : (
                scratchItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-zinc-950/60 border border-zinc-800/60 rounded-xl group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800">
                        {item.bucket}
                      </span>
                      <span className="text-xs text-zinc-300 truncate">{item.content}</span>
                    </div>
                    <button
                      onClick={() => handleArchiveScratch(item.id)}
                      className="text-zinc-600 hover:text-rose-400 transition p-1"
                      title="Archive item"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

      </div>
    </main>
  );
}