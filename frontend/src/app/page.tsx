"use client";

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Terminal,
  Target,
  Award,
  Settings as SettingsIcon,
} from "lucide-react";
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
import PomodoroTimer from "@/components/focus/PomodoroTimer";
import {
  CodingLog,
  HeatmapDay,
  DailyFocus,
  StudentRoutine,
  UserStats,
} from "@/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("arena");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [recentLogs, setRecentLogs] = useState<CodingLog[]>([]);
  const [focusTasks, setFocusTasks] = useState<DailyFocus[]>([]);
  const [routines, setRoutines] = useState<StudentRoutine[]>([]);
  const [isPomodoroFullscreen, setIsPomodoroFullscreen] = useState(false);
  const [timerInfo, setTimerInfo] = useState<
    | {
        timeLeft: number;
        isRunning: boolean;
        mode: string;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSessionComplete = async () => {
    try {
      const s = await api.getUserStats();
      setStats(s);
    } catch (err) {
      console.error("Dashboard failed to load stats after pomodoro:", err);
    }
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

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

  const handleCreateRoutine = async (
    title: string,
    start: string,
    end: string,
    cat: string,
    scheduled_date?: string | null,
  ) => {
    await api.createRoutine({
      title,
      start_time: start,
      end_time: end,
      category: cat,
      scheduled_date: scheduled_date || null,
    });
    setRoutines(await api.getRoutines());
  };

  const handleUpdateRoutine = async (
    id: number,
    data: {
      title?: string;
      start_time?: string;
      end_time?: string;
      category?: string;
      scheduled_date?: string | null;
      is_completed_today?: boolean;
    },
  ) => {
    await api.updateRoutine(id, data);
    setRoutines(await api.getRoutines());
  };

  const handleDeleteRoutine = async (id: number) => {
    await api.deleteRoutine(id);
    setRoutines(await api.getRoutines());
    setStats(await api.getUserStats());
  };

  const handleUpdateLog = async (
    id: number,
    data: {
      problem_title?: string;
      platform?: string;
      difficulty?: string;
      topic_tag?: string;
    },
  ) => {
    await api.updateCodingLog(id, data);
    await loadDashboard();
  };

  const handleDeleteLog = async (id: number) => {
    await api.deleteCodingLog(id);
    await loadDashboard();
  };

  const totalSolved = heatmapData.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
      <Header
        stats={stats}
        onOpenPomodoro={() => setIsPomodoroFullscreen(true)}
        timerInfo={timerInfo}
      />

      {/* Desktop Navigation Tabs */}
      <div className="hidden md:flex items-center gap-2 mb-8 border-b border-zinc-800 pb-3">
        {[
          { id: "arena", label: "The Arena", icon: Terminal },
          { id: "routine", label: "Focus & Routines", icon: Target },
          { id: "stats", label: "Statistics", icon: Award },
          { id: "settings", label: "Settings", icon: SettingsIcon },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as NavTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition cursor-pointer ${
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

      {/* Dynamic Views (Persistent state across tab switches) */}
      <div className="space-y-6">
        <div
          className={
            activeTab === "arena"
              ? "grid grid-cols-1 lg:grid-cols-12 gap-8"
              : "hidden"
          }
        >
          <div className="lg:col-span-7 space-y-6">
            <Heatmap data={heatmapData} />
            <ProblemLogger onLog={handleLogProblem} />
          </div>
          <div className="lg:col-span-5">
            <RecentLogs
              logs={recentLogs}
              onUpdateLog={handleUpdateLog}
              onDeleteLog={handleDeleteLog}
              onRefresh={loadDashboard}
            />
          </div>
        </div>

        <div className={activeTab === "routine" ? "space-y-6" : "hidden"}>
          {/* Full width Pomodoro with Fullscreen Focus Mode */}
          <PomodoroTimer
            onSessionComplete={handleSessionComplete}
            isFullscreen={isPomodoroFullscreen}
            onToggleFullscreen={setIsPomodoroFullscreen}
            onTimerUpdate={setTimerInfo}
          />

          {/* Dual column focus & routine */}
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
                onUpdate={handleUpdateRoutine}
                onDelete={handleDeleteRoutine}
              />
            </div>
          </div>
        </div>

        <div className={activeTab === "stats" ? "max-w-5xl mx-auto" : "hidden"}>
          <AchievementsView
            stats={stats}
            totalSolved={totalSolved}
            onRefreshDashboard={loadDashboard}
          />
        </div>

        <div
          className={activeTab === "settings" ? "max-w-2xl mx-auto" : "hidden"}
        >
          <SettingsView onResetComplete={loadDashboard} />
        </div>
      </div>

      {/* Mobile Bottom Navigation for PWA */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}
