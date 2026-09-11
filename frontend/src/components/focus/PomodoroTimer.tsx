"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Flame,
  Music,
  Sliders,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "@/lib/api";

export type TimerMode = "focus" | "short_break" | "long_break";

const MODE_TIMES: Record<TimerMode, number> = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

const MUSIC_PRESETS = [
  {
    id: "lofi",
    name: "Lofi Focus Beats",
    url: "https://stream.zeno.fm/f3wvbbqmdg8uv",
    tag: "Relaxing Beats",
  },
  {
    id: "synthwave",
    name: "Cyberpunk Synthwave",
    url: "https://stream.zeno.fm/kswam402w0hvv",
    tag: "High Tempo",
  },
  {
    id: "ambient",
    name: "Rain & Ambient Flow",
    url: "https://actions.google.com/sounds/v1/weather/rain_heavy.ogg",
    tag: "Nature Sound",
  },
  {
    id: "alpha",
    name: "Deep Alpha Waves",
    url: "https://actions.google.com/sounds/v1/weather/ambient_wind_desert.ogg",
    tag: "Deep Concentration",
  },
];

interface PomodoroProps {
  onSessionComplete?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: (fullscreen: boolean) => void;
  showInline?: boolean;
  onTimerUpdate?: (info: {
    timeLeft: number;
    isRunning: boolean;
    mode: TimerMode;
  }) => void;
}

export default function PomodoroTimer({
  onSessionComplete,
  isFullscreen: externalIsFullscreen,
  onToggleFullscreen,
  showInline = true,
  onTimerUpdate,
}: PomodoroProps) {
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen =
    externalIsFullscreen !== undefined
      ? externalIsFullscreen
      : internalFullscreen;

  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(MODE_TIMES.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Zen Mode Idle Detection for Fullscreen (Auto-hide everything except timer when mouse stops)
  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Background Music State
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [selectedMusicPreset, setSelectedMusicPreset] = useState("lofi");
  const [customMusicUrl, setCustomMusicUrl] = useState("");
  const [useCustomMusic, setUseCustomMusic] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [showMusicMenu, setShowMusicMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load saved custom music URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("streakflow_custom_music_url");
      if (saved) {
        setCustomMusicUrl(saved);
        setUseCustomMusic(true);
      }
    }
  }, []);

  const setIsFullscreen = useCallback(
    (val: boolean) => {
      if (onToggleFullscreen) {
        onToggleFullscreen(val);
      } else {
        setInternalFullscreen(val);
      }
    },
    [onToggleFullscreen],
  );

  // Report timer status to parent for interactive navbar button
  useEffect(() => {
    if (onTimerUpdate) {
      onTimerUpdate({ timeLeft, isRunning, mode });
    }
  }, [timeLeft, isRunning, mode, onTimerUpdate]);

  // Handle Fullscreen Idle State
  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    // Only auto-hide after 2.5 seconds if running in fullscreen
    if (isFullscreen && isRunning) {
      idleTimeoutRef.current = setTimeout(() => {
        setIsIdle(true);
      }, 2500);
    }
  }, [isFullscreen, isRunning]);

  useEffect(() => {
    if (!isFullscreen || !isRunning) {
      setIsIdle(false);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      return;
    }

    const handleActivity = () => resetIdleTimer();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    resetIdleTimer();

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [isFullscreen, isRunning, resetIdleTimer]);

  // Fullscreen Browser Native API Toggle
  const enterFullscreen = useCallback(async () => {
    setIsFullscreen(true);
    try {
      if (typeof document !== "undefined" && !document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if (
          (
            document.documentElement as unknown as {
              webkitRequestFullscreen?: () => Promise<void>;
            }
          ).webkitRequestFullscreen
        ) {
          await (
            document.documentElement as unknown as {
              webkitRequestFullscreen: () => Promise<void>;
            }
          ).webkitRequestFullscreen();
        }
      }
    } catch {}
  }, [setIsFullscreen]);

  const exitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
    try {
      if (typeof document !== "undefined" && document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (
          (
            document as unknown as {
              webkitExitFullscreen?: () => Promise<void>;
            }
          ).webkitExitFullscreen
        ) {
          await (
            document as unknown as { webkitExitFullscreen: () => Promise<void> }
          ).webkitExitFullscreen();
        }
      }
    } catch {}
  }, [setIsFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Sync native ESC key exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFs =
        Boolean(document.fullscreenElement) ||
        Boolean(
          (document as unknown as { webkitFullscreenElement?: Element })
            .webkitFullscreenElement,
        );
      if (!isNativeFs && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, [isFullscreen, setIsFullscreen]);

  // Synthesizer Sounds (Start & End)
  const playStartSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Arpeggio chords: 440Hz -> 554.37Hz -> 659.25Hz
      const notes = [440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch {}
  }, [soundEnabled]);

  const playEndChime = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Harmonious chime (587.33 Hz & 880 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.start(now);
      osc1.stop(now + 0.5);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(880, now + 0.15);
      gain2.gain.setValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.8);
    } catch {}
  }, [soundEnabled]);

  // Sound chime for pausing
  const playPauseSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Descending pause tone: 554.37Hz -> 440Hz
      const notes = [554.37, 440];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.2);
      });
    } catch {}
  }, [soundEnabled]);

  // Audio Music Management
  const currentMusicUrl = useCustomMusic
    ? customMusicUrl
    : MUSIC_PRESETS.find((p) => p.id === selectedMusicPreset)?.url ||
      MUSIC_PRESETS[0].url;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
      if (musicPlaying) {
        audioRef.current.play().catch(() => setMusicPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [musicPlaying, currentMusicUrl, musicVolume]);

  const toggleMusic = () => {
    setMusicPlaying((prev) => !prev);
  };

  const handleSetCustomUrl = (url: string) => {
    const trimmed = url.trim();
    if (trimmed) {
      setCustomMusicUrl(trimmed);
      setUseCustomMusic(true);
      setMusicPlaying(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("streakflow_custom_music_url", trimmed);
      }
    }
  };

  const handleToggleTimer = () => {
    if (!isRunning) {
      playStartSound();
      setIsRunning(true);
    } else {
      playPauseSound();
      setIsRunning(false);
    }
  };

  // Timer Tick
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      playEndChime();

      if (mode === "focus") {
        const nextSessions = completedSessions + 1;
        setCompletedSessions(nextSessions);

        // Record focus session to backend
        api
          .logFocusSession({
            duration_seconds: MODE_TIMES.focus,
            session_type: "focus",
            xp_earned: 50,
          })
          .catch(() => {});

        if (onSessionComplete) onSessionComplete();

        // Switch to break
        const nextMode: TimerMode =
          nextSessions % 4 === 0 ? "long_break" : "short_break";
        setMode(nextMode);
        setTimeLeft(MODE_TIMES[nextMode]);
      } else {
        setMode("focus");
        setTimeLeft(MODE_TIMES.focus);
      }
      setIsRunning(false);
    }
    return () => clearInterval(timer);
  }, [
    isRunning,
    timeLeft,
    mode,
    completedSessions,
    onSessionComplete,
    playEndChime,
  ]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handleToggleTimer();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMusic();
      } else if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        exitFullscreen();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        resetTimer(mode);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, toggleFullscreen, exitFullscreen, mode, isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODE_TIMES[newMode]);
  };

  const resetTimer = (targetMode: TimerMode = mode) => {
    setIsRunning(false);
    setTimeLeft(MODE_TIMES[targetMode]);
  };

  // Floating / Fixed Unified Music Selection Modal (immune to clipping and stacking issues)
  const renderMusicModal = () => {
    if (!showMusicMenu) return null;
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
        <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <span className="font-bold text-zinc-100 flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400" /> Focus Soundscapes &
              Music
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMusic}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  musicPlaying
                    ? "bg-rose-950 text-rose-400 border border-rose-800 hover:bg-rose-900"
                    : "bg-emerald-500 text-black hover:bg-emerald-400"
                }`}
              >
                {musicPlaying ? "PAUSE" : "PLAY"}
              </button>
              <button
                onClick={() => setShowMusicMenu(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Volume Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
              <span>Volume</span>
              <span className="text-emerald-400 font-bold">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
              Soundscapes
            </span>
            {MUSIC_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedMusicPreset(p.id);
                  setUseCustomMusic(false);
                  setMusicPlaying(true);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                  !useCustomMusic && selectedMusicPreset === p.id
                    ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-bold"
                    : "bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 text-zinc-300"
                }`}
              >
                <span>{p.name}</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  {p.tag}
                </span>
              </button>
            ))}
          </div>

          {/* Custom Audio URL */}
          <div className="pt-3 border-t border-zinc-800/80 space-y-2">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
              Custom Audio Stream URL
            </span>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste direct audio stream URL..."
                value={customMusicUrl}
                onChange={(e) => setCustomMusicUrl(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleSetCustomUrl(customMusicUrl)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Set
              </button>
            </div>
            {useCustomMusic && customMusicUrl && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                ✓ Playing custom stream (saved)
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // FULLSCREEN MODE (With idle auto-hide controls)
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-[100] w-screen h-[100dvh] min-h-[100dvh] bg-black text-white flex flex-col justify-between p-4 sm:p-8 md:p-12 select-none overflow-hidden"
        style={{ cursor: isIdle && isRunning ? "none" : "default" }}
      >
        {/* Hidden Background Audio Player */}
        <audio ref={audioRef} src={currentMusicUrl} loop preload="none" />

        {/* Ambient Radial Glow */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
            mode === "focus"
              ? "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0,transparent_75%)]"
              : mode === "short_break"
                ? "bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0,transparent_75%)]"
                : "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08)_0,transparent_75%)]"
          }`}
        />

        {/* TOP BAR (Auto-hides on idle) */}
        <div
          className={`relative z-10 flex items-center justify-between w-full max-w-6xl mx-auto transition-all duration-700 ${
            isIdle && isRunning
              ? "opacity-0 pointer-events-none -translate-y-4"
              : "opacity-100 translate-y-0"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRunning ? "animate-pulse" : ""
              } ${
                mode === "focus"
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : mode === "short_break"
                    ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                    : "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"
              }`}
            />
            <span className="font-mono text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-300">
              {mode === "focus"
                ? "Deep Work Sprint"
                : mode === "short_break"
                  ? "Short Break"
                  : "Long Break"}
            </span>

            {completedSessions > 0 && (
              <span className="hidden sm:flex items-center gap-1 font-mono text-xs bg-orange-950/40 border border-orange-800/60 text-orange-400 px-2 py-0.5 rounded-md">
                <Flame className="w-3 h-3 fill-orange-400" />
                {completedSessions}{" "}
                {completedSessions === 1 ? "Session" : "Sessions"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Music Controls */}
            <div>
              <button
                onClick={() => setShowMusicMenu(!showMusicMenu)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono transition cursor-pointer ${
                  musicPlaying
                    ? "bg-emerald-950/70 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
                title="Focus Soundscapes & Music (M)"
              >
                <Music
                  className={`w-3.5 h-3.5 ${musicPlaying ? "animate-spin" : ""}`}
                />
                <span className="hidden md:inline">
                  {musicPlaying ? "Music Playing" : "Music"}
                </span>
              </button>
            </div>

            {/* Audio Mute/Unmute */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              title={soundEnabled ? "Mute Timer Sound" : "Enable Timer Sound"}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Exit Fullscreen */}
            <button
              onClick={exitFullscreen}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-mono text-xs transition cursor-pointer"
              title="Exit Fullscreen (ESC)"
            >
              <Minimize2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
              <kbd className="hidden md:inline px-1.5 py-0.5 text-[10px] bg-zinc-800 rounded border border-zinc-700 text-zinc-400">
                ESC
              </kbd>
            </button>
          </div>
        </div>

        {/* CENTER MAIN STAGE */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full max-w-4xl mx-auto text-center px-2">
          {/* Mode Switcher (Auto-hides on idle) */}
          <div
            className={`flex items-center gap-1 sm:gap-2 mb-6 sm:mb-10 bg-zinc-950/80 p-1 sm:p-1.5 rounded-2xl border border-zinc-800 max-w-full overflow-x-auto transition-all duration-700 ${
              isIdle && isRunning
                ? "opacity-0 pointer-events-none -translate-y-4"
                : "opacity-100 translate-y-0"
            }`}
          >
            <button
              onClick={() => switchMode("focus")}
              className={`text-xs sm:text-sm font-mono px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                mode === "focus"
                  ? "bg-zinc-800 text-emerald-400 font-bold shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              FOCUS (25M)
            </button>
            <button
              onClick={() => switchMode("short_break")}
              className={`text-xs sm:text-sm font-mono px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                mode === "short_break"
                  ? "bg-zinc-800 text-cyan-400 font-bold shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              SHORT BREAK (5M)
            </button>
            <button
              onClick={() => switchMode("long_break")}
              className={`text-xs sm:text-sm font-mono px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                mode === "long_break"
                  ? "bg-zinc-800 text-purple-400 font-bold shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              LONG BREAK (15M)
            </button>
          </div>

          {/* GIANT RESPONSIVE DIGITAL CLOCK (Always visible, expands when idle) */}
          <div className="my-2 sm:my-6 select-none transition-transform duration-700">
            <div
              className={`text-7xl xs:text-8xl sm:text-9xl md:text-[14vw] lg:text-[17vw] font-black font-mono tracking-tighter tabular-nums leading-none select-none ${
                isIdle && isRunning ? "scale-105" : "scale-100"
              } transition-transform duration-700 ${
                mode === "focus"
                  ? "text-white drop-shadow-[0_0_60px_rgba(16,185,129,0.25)]"
                  : mode === "short_break"
                    ? "text-white drop-shadow-[0_0_60px_rgba(6,182,212,0.25)]"
                    : "text-white drop-shadow-[0_0_60px_rgba(168,85,247,0.25)]"
              }`}
            >
              {formatTime(timeLeft)}
            </div>

            <p
              className={`text-xs sm:text-sm font-mono tracking-widest text-zinc-400 uppercase mt-4 sm:mt-8 transition-opacity duration-700 ${
                isIdle && isRunning ? "opacity-40" : "opacity-100"
              }`}
            >
              {isRunning
                ? mode === "focus"
                  ? "Deep Work Sprint • In The Flow"
                  : "Recharge & Hydrate • Rest Your Eyes"
                : "Timer Paused"}
            </p>
          </div>

          {/* CONTROLS (Auto-hides on idle) */}
          <div
            className={`flex items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-10 transition-all duration-700 ${
              isIdle && isRunning
                ? "opacity-0 pointer-events-none translate-y-4"
                : "opacity-100 translate-y-0"
            }`}
          >
            <button
              onClick={handleToggleTimer}
              className={`h-14 sm:h-16 px-8 sm:px-12 rounded-2xl font-mono text-xs sm:text-sm font-bold tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                isRunning
                  ? "bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                  : mode === "focus"
                    ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                    : mode === "short_break"
                      ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                      : "bg-purple-500 text-white hover:bg-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.4)]"
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" /> PAUSE
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" /> START SPRINT
                </>
              )}
            </button>

            <button
              onClick={() => resetTimer(mode)}
              className="h-14 sm:h-16 w-14 sm:w-16 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Reset Timer (R)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BOTTOM HELPER BAR (Auto-hides on idle) */}
        <div
          className={`relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-4 border-t border-zinc-900 transition-all duration-700 ${
            isIdle && isRunning
              ? "opacity-0 pointer-events-none translate-y-4"
              : "opacity-100 translate-y-0"
          }`}
        >
          <div className="hidden sm:flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
                Space
              </kbd>{" "}
              Play/Pause
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
                F
              </kbd>{" "}
              Fullscreen
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
                M
              </kbd>{" "}
              Music
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
                R
              </kbd>{" "}
              Reset
            </span>
          </div>

          <div className="sm:hidden mx-auto text-zinc-500 text-center">
            Zen Focus Active • Move mouse/tap to show controls 🌊
          </div>

          <div className="hidden sm:block text-zinc-500">
            Go With Flow Zen Engine
          </div>
        </div>

        {/* Unified Music Modal */}
        {renderMusicModal()}
      </div>
    );
  }

  // If not fullscreen and not showing inline, return null (timer remains active in background)
  if (!showInline) {
    return <audio ref={audioRef} src={currentMusicUrl} loop preload="none" />;
  }

  // STANDARD INLINE CARD MODE
  return (
    <div className="relative overflow-hidden bg-black border border-zinc-800/80 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center">
      {/* Background Audio */}
      <audio ref={audioRef} src={currentMusicUrl} loop preload="none" />

      {/* Background Ambience */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          mode === "focus"
            ? "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0,transparent_70%)]"
            : mode === "short_break"
              ? "bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0,transparent_70%)]"
              : "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.05)_0,transparent_70%)]"
        }`}
      />

      {/* Card Header */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 z-10">
        <div className="flex items-center gap-1 sm:gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => switchMode("focus")}
            className={`text-xs font-mono px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === "focus"
                ? "bg-zinc-800 text-emerald-400 font-bold shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            FOCUS (25M)
          </button>
          <button
            onClick={() => switchMode("short_break")}
            className={`text-xs font-mono px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === "short_break"
                ? "bg-zinc-800 text-cyan-400 font-bold shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            SHORT (5M)
          </button>
          <button
            onClick={() => switchMode("long_break")}
            className={`text-xs font-mono px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === "long_break"
                ? "bg-zinc-800 text-purple-400 font-bold shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            LONG (15M)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Music Toggle / Popup */}
          <button
            onClick={() => setShowMusicMenu(true)}
            className={`p-2 rounded-xl border text-xs font-mono transition cursor-pointer ${
              musicPlaying
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Focus Soundscapes & Music (M)"
          >
            <Music
              className={`w-3.5 h-3.5 ${musicPlaying ? "animate-spin" : ""}`}
            />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            title={soundEnabled ? "Mute Sound" : "Enable Sound"}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={enterFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/70 hover:border-emerald-600 text-emerald-400 text-xs font-mono font-bold transition cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            title="Enter Fullscreen Focus (F)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Digital Clock Display */}
      <div
        onClick={enterFullscreen}
        className="my-2 z-10 text-center cursor-pointer group"
        title="Click to enter Fullscreen Zen Mode"
      >
        <div className="text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-tighter text-white tabular-nums select-none drop-shadow-[0_0_25px_rgba(255,255,255,0.06)] group-hover:scale-[1.02] transition-transform">
          {formatTime(timeLeft)}
        </div>
        <p className="text-[11px] font-mono tracking-widest text-zinc-500 uppercase mt-2 group-hover:text-emerald-400 transition-colors">
          {isRunning
            ? mode === "focus"
              ? "Deep Work Sprint • In The Flow"
              : "Resting & Hydrating"
            : "Paused • Click for Fullscreen"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-6 z-10">
        <button
          onClick={handleToggleTimer}
          className={`h-12 px-6 rounded-xl font-mono text-xs font-bold tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            isRunning
              ? "bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              : mode === "focus"
                ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-current" /> PAUSE
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> START SPRINT
            </>
          )}
        </button>

        <button
          onClick={() => resetTimer(mode)}
          className="h-12 w-12 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Keyboard Helper */}
      <div className="mt-4 text-[10px] font-mono text-zinc-600 flex items-center gap-2">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
            Space
          </kbd>{" "}
          play/pause
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
            F
          </kbd>{" "}
          fullscreen
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
            M
          </kbd>{" "}
          music
        </span>
      </div>

      {/* Unified Music Modal */}
      {renderMusicModal()}
    </div>
  );
}
