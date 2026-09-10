"use client";

import { useState, useEffect } from "react";
import { HardDrive, Cloud, RefreshCw, Check, LogIn } from "lucide-react";
import { driveSync } from "@/lib/driveSync";
import { api } from "@/lib/api";

export default function SettingsView() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

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
      setStatusMsg("Successfully synced snapshot to Google Drive appDataFolder.");
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
      setStatusMsg("Data restored from Drive. Please refresh page to reload state.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setStatusMsg(`Restore failed: ${message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-400 rounded-xl">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono text-zinc-200">
              GowithFlow Private Storage
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Your daily execution targets, coding records, and streaks are stored locally.
              Connect your Google Drive to sync snapshots directly to your personal cloud (<code className="text-zinc-300 font-mono">appDataFolder</code>) with zero external servers.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-cyan-400" /> Google Drive Cloud Vault
          </h4>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
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
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-mono py-3 px-4 rounded-xl border border-zinc-700 transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4 text-cyan-400" /> Connect Google Drive
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSyncToDrive}
              disabled={syncing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black text-xs font-mono font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              Backup Now to Drive
            </button>

            <button
              onClick={handleRestoreFromDrive}
              disabled={syncing}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-mono py-3 px-4 rounded-xl border border-zinc-700 transition flex items-center justify-center gap-2"
            >
              Restore from Drive
            </button>
          </div>
        )}

        {statusMsg && (
          <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}