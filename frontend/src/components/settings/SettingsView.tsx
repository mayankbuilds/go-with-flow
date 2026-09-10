"use client";

import { useState } from "react";
import { Download, Upload, ShieldCheck, Database, HardDrive } from "lucide-react";

export default function SettingsView() {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleExportBackup = async () => {
    try {
      const endpoints = ["/coding/logs?limit=500", "/focus/today", "/routines", "/user/stats"];
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const [logs, focus, routines, stats] = await Promise.all(
        endpoints.map((ep) => fetch(`${API_BASE}${ep}`).then((r) => r.json()))
      );

      const backupData = {
        exported_at: new Date().toISOString(),
        version: "2.0.0",
        data: { logs, focus, routines, stats },
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `streakflow-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setStatusMsg("Backup successfully downloaded to local disk.");
    } catch (err) {
      console.error(err);
      setStatusMsg("Failed to export backup. Ensure backend is online.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cloud & Drive Info */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-950/50 border border-blue-800 text-blue-400 rounded-xl">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono text-zinc-200">
              Personal Storage & Privacy
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              StreakFlow stores all habits, streaks, and focus records in your private database.
              Export regular JSON backups to keep in Google Drive or offline disk.
            </p>
          </div>
        </div>
      </div>

      {/* Backup Actions */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" /> Offline Snapshot (Cashew Engine)
        </h4>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExportBackup}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 text-xs font-mono py-3 px-4 rounded-xl border border-zinc-700 transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Export JSON Snapshot
          </button>
        </div>

        {statusMsg && (
          <p className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-xl">
            {statusMsg}
          </p>
        )}
      </div>
    </div>
  );
}