"use client";

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Terminal, Target, Award, Settings as SettingsIcon } from "lucide-react";
import Header from "@/components/navigation/Header";
import MobileNav, { NavTab } from "@/components/navigation/MobileNav";
import Heatmap from "@/components/arena/Heatmap";
import ProblemLogger from "@/components/arena/ProblemLogger";
import RecentLogs from "@/components/arena/RecentLogs";
import FocusSection from "@/components/focus/FocusSection";
import RoutineSection from "@/components/routine/RoutineSection";
import AchievementsView from "@/components/stats/AchievementsView";
import SettingsView from "@/components/settings/SettingsView";
import { api } from "@/lib/api";
import { CodingLog, HeatmapDay, DailyFocus, StudentRoutine, UserStats } from "@/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("arena");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [recentLogs, setRecentLogs] = useState<CodingLog[]>([]);
  const [focusTasks, setFocusTasks] = useState<DailyFocus[]>([]);
  const [routines, setRoutines] = useState<StudentRoutine[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [s, h, l, f, r] = await Promise.all([
        api.getUserStats(),
        api.getHeatmap(112),
        api.getRecentLogs(10),
        api.getTodayFocus(),
        api.getRoutines(),
      ]);
      setStats(s);
      setHeatmapData(h);
      setRecentLogs(l);
      setFocusTasks(f);
      setRoutines(r);
    } catch (err) {
      console.error("Dashboard failed to load:", err);
    }
  };

  const handleLogProblem = async (data: {
    problem_title: string;
    platform: string;
    difficulty: string;
    topic_tag: string;
  }) => {
    await api.logProblem(data);
    const [h, l, s] = await Promise.all([
      api.getHeatmap(112),
      api.getRecentLogs(10),
      api.getUserStats(),
    ]);
    setHeatmapData(h);
    setRecentLogs(l);
    setStats(s);
    confetti({ particleCount: 35, spread: 45, origin: { y: 0.8 } });
  };

  const handleSaveFocus = async (priority: number, title: string) => {
    await api.setFocusSlot({ priority_order: priority, title });
    setFocusTasks(await api.getTodayFocus());
  };

  const handleToggleFocus = async (item: DailyFocus) => {
    const nextState = !item.is_completed;
    await api.updateFocusTask(item.id, { is_completed: nextState });
    const updated = await api.getTodayFocus();
    setFocusTasks(updated);
    setStats(await api.getUserStats());

    if (nextState && updated.filter((t) => t.is_completed).length === 3) {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    }
  };

  const handleDeleteFocus = async (id: number) => {
    await api.deleteFocusTask(id);
    setFocusTasks(await api.getTodayFocus());
  };

  const handleToggleRoutine = async (id: number) => {
    await api.toggleRoutine(id);
    setRoutines(await api.getRoutines());
    setStats(await api.getUserStats());
  };

  const handleCreateRoutine = async (title: string, start: string, end: string, cat: string) => {
    await api.createRoutine({ title, start_time: start, end_time: end, category: cat });
    setRoutines(await api.getRoutines());
  };

  const totalSolved = heatmapData.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
      <Header stats={stats} />

      {/* Desktop Navigation Tabs */}
      <div className="hidden md:flex items-center gap-2 mb-8 border-b border-zinc-800 pb-3">
        {[
          { id: "arena", label: "The Arena", icon: Terminal },
          { id: "routine", label: "Focus & Routines", icon: Target },
          { id: "stats", label: "Achievements & RPG", icon: Award },
          { id: "settings", label: "Storage & Settings", icon: SettingsIcon },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as NavTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition ${
                isActive
                  ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Views */}
      <div className="space-y-6">
        {activeTab === "arena" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <Heatmap data={heatmapData} />
              <ProblemLogger onLog={handleLogProblem} />
            </div>
            <div className="lg:col-span-5">
              <RecentLogs logs={recentLogs} />
            </div>
          </div>
        )}

        {activeTab === "routine" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6">
              <FocusSection
                tasks={focusTasks}
                onSave={handleSaveFocus}
                onToggle={handleToggleFocus}
                onDelete={handleDeleteFocus}
              />
            </div>
            <div className="lg:col-span-6">
              <RoutineSection
                routines={routines}
                onToggle={handleToggleRoutine}
                onCreate={handleCreateRoutine}
              />
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="max-w-3xl mx-auto">
            <AchievementsView stats={stats} totalSolved={totalSolved} />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto">
            <SettingsView />
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation for PWA */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}