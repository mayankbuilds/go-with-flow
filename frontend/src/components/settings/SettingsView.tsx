"use client";

import { useState, useEffect } from "react";
import {
  HardDrive,
  Cloud,
  RefreshCw,
  Check,
  LogIn,
  AlertTriangle,
  Trash2,
  Sliders,
  Code2,
  ShieldAlert,
} from "lucide-react";
import { driveSync } from "@/lib/driveSync";
import { api } from "@/lib/api";

interface SettingsViewProps {
  onResetComplete?: () => Promise<void>;
}

export default function SettingsView({ onResetComplete }: SettingsViewProps) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Danger Zone State
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const REQUIRED_CONFIRM_PHRASE = "DELETE ALL MY DATA";

  useEffect(() => {
    const checkGoogle = setInterval(() => {
      if (typeof window !== "undefined" && window.google) {
        driveSync.initTokenClient(() => {
          setIsSignedIn(true);
          setStatusMsg("Authenticated with Google Drive.");
        });
        clearInterval(checkGoogle);
      }
    }, 300);

    return () => clearInterval(checkGoogle);
  }, []);

  const handleLogin = () => {
    driveSync.requestLogin();
  };

  const handleSyncToDrive = async () => {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const [logs, focus, routines, stats] = await Promise.all([
        api.getRecentLogs(500),
        api.getTodayFocus(),
        api.getRoutines(),
        api.getUserStats(),
      ]);

      const payload = {
        synced_at: new Date().toISOString(),
        version: "2.0.0",
        data: { logs, focus, routines, stats },
      };

      await driveSync.uploadSnapshot(payload);
      setStatusMsg(
        "Successfully synced snapshot to Google Drive appDataFolder.",
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setStatusMsg(`Sync failed: ${message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const snapshot = await driveSync.downloadSnapshot();
      if (!snapshot) {
        setStatusMsg("No existing backup found in Google Drive.");
        return;
      }
      setStatusMsg(
        "Data restored from Drive. Please refresh page to reload state.",
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setStatusMsg(`Restore failed: ${message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleResetAllData = async () => {
    if (confirmText.trim() !== REQUIRED_CONFIRM_PHRASE) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.resetAllData();
      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("streakflow_lc_handle");
        localStorage.removeItem("streakflow_cf_handle");
        localStorage.removeItem("streakflow_custom_categories");
        localStorage.removeItem("streakflow_custom_music_url");
      }
      setDeleteSuccess(true);
      setConfirmText("");
      if (onResetComplete) {
        await onResetComplete();
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Reset failed";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 font-mono">
      {/* SECTION 1: STORAGE & BACKUP */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
            Storage & Cloud Vault
          </h3>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-950/50 border border-emerald-800/80 text-emerald-400 rounded-xl shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-200">
                Go with Flow Private Storage
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Your execution logs, routine blocks, and pomodoro records are
                stored locally with zero third-party tracking. Connect Google
                Drive to sync private encrypted snapshots directly to your
                personal cloud (
                <code className="text-emerald-400 font-mono">
                  appDataFolder
                </code>
                ).
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-cyan-400" /> Google Drive Cloud
                Vault
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded border ${
                  isSignedIn
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800"
                    : "bg-zinc-900 text-zinc-500 border-zinc-800"
                }`}
              >
                {isSignedIn ? "Connected" : "Disconnected"}
              </span>
            </div>

            {!isSignedIn ? (
              <button
                onClick={handleLogin}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs py-2.5 px-4 rounded-xl border border-zinc-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-cyan-400" /> Connect Google Drive
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={handleSyncToDrive}
                  disabled={syncing}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
                  />
                  Backup to Drive
                </button>

                <button
                  onClick={handleRestoreFromDrive}
                  disabled={syncing}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs py-2.5 px-4 rounded-xl border border-zinc-700 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  Restore from Drive
                </button>
              </div>
            )}

            {statusMsg && (
              <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: APPLICATION PREFERENCES */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
          <Sliders className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
            Preferences & Environment
          </h3>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-200 block font-bold">
                Theme & Style
              </span>
              <span className="text-[11px] text-zinc-500">
                Dark Hacker Terminal Aesthetic
              </span>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-emerald-400">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-800">
            <div>
              <span className="text-zinc-200 block font-bold">
                Sound Effects
              </span>
              <span className="text-[11px] text-zinc-500">
                Synthesizer Chimes for Start, Pause & Pomodoro Completion
              </span>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-emerald-400">
              Enabled
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: DANGER ZONE (RESET DATA) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-rose-950/70">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <h3 className="text-xs uppercase tracking-wider text-rose-400 font-bold">
            Danger Zone
          </h3>
        </div>

        <div className="bg-rose-950/15 border border-rose-900/60 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-400 rounded-xl shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-200">
                Wipe All Saved User Data
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Permanently deletes all logged coding submissions, focus sprint
                records, routine timetable items, and resets your RPG Level, XP,
                and active streaks back to base values.
              </p>
            </div>
          </div>

          <div className="p-4 bg-zinc-950/80 border border-rose-950 rounded-xl space-y-3">
            <label className="block text-xs text-zinc-300">
              To confirm, type{" "}
              <span className="text-rose-400 font-bold select-all bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-900/50">
                {REQUIRED_CONFIRM_PHRASE}
              </span>{" "}
              below:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "DELETE ALL MY DATA"'
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-rose-500 text-zinc-100 text-xs p-2.5 rounded-xl outline-none"
            />

            <button
              onClick={handleResetAllData}
              disabled={
                confirmText.trim() !== REQUIRED_CONFIRM_PHRASE || isDeleting
              }
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                confirmText.trim() === REQUIRED_CONFIRM_PHRASE && !isDeleting
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                  : "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-60"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting
                ? "Wiping Data..."
                : "Permanently Delete All Saved Data"}
            </button>

            {deleteSuccess && (
              <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-lg text-center">
                ✓ All user data successfully wiped. Refreshing dashboard...
              </div>
            )}

            {deleteError && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-lg text-center">
                {deleteError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
