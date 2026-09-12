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
  X,
  CheckCircle2,
  Sliders,
  Radio,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";

export type TimerMode = "focus" | "short_break" | "long_break";

export interface MusicPreset {
  id: string;
  name: string;
  url: string;
  tag: string;
  type: "stream" | "brown_noise" | "binaural" | "rain";
}

const MUSIC_PRESETS: MusicPreset[] = [
  {
    id: "brown_noise",
    name: "Brownian Waterfall",
    url: "synth",
    tag: "Offline Synth",
    type: "brown_noise",
  },
  {
    id: "binaural",
    name: "Binaural Alpha Waves (10Hz)",
    url: "synth",
    tag: "Offline Synth",
    type: "binaural",
  },
  {
    id: "rain",
    name: "Rain & Thunderstorm",
    url: "synth",
    tag: "Offline Synth",
    type: "rain",
  },
];

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/,
  );
  return match ? match[1] : null;
}

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

  // Timer States
  const [mode, setMode] = useState<TimerMode>("focus");
  const [customFocusMins, setCustomFocusMins] = useState(25);
  const [showCustomMinsInput, setShowCustomMinsInput] = useState(false);
  const [customMinsInputValue, setCustomMinsInputValue] = useState("25");

  const getModeTime = useCallback(
    (m: TimerMode) => {
      if (m === "focus") return customFocusMins * 60;
      if (m === "short_break") return 5 * 60;
      return 15 * 60;
    },
    [customFocusMins],
  );

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Zen Mode Idle Detection for Fullscreen
  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Background Focus Audio State
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [selectedMusicPreset, setSelectedMusicPreset] = useState("brown_noise");
  const [customMusicUrl, setCustomMusicUrl] = useState("");
  const [recentMusicUrls, setRecentMusicUrls] = useState<string[]>([]);
  const [useCustomMusic, setUseCustomMusic] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [showMusicMenu, setShowMusicMenu] = useState(false);
  const [audioStatusMsg, setAudioStatusMsg] = useState<string | null>(null);
  const [activeYtId, setActiveYtId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const prevVolumeRef = useRef<number>(0.4);

  // Web Audio Context & Nodes for offline sound generator
  const synthCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<{
    source?: AudioBufferSourceNode | OscillatorNode;
    rightOsc?: OscillatorNode;
    gainNode?: GainNode;
  } | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUrl = localStorage.getItem("streakflow_custom_music_url");
      if (savedUrl) {
        setCustomMusicUrl(savedUrl);
      }
      try {
        const savedRecents = JSON.parse(
          localStorage.getItem("streakflow_recent_music_urls") || "[]",
        );
        if (Array.isArray(savedRecents)) {
          setRecentMusicUrls(savedRecents.slice(0, 3));
        }
      } catch {}
      const savedSound = localStorage.getItem("streakflow_sound_enabled");
      if (savedSound !== null) {
        setSoundEnabled(savedSound === "true");
      }
      const savedFocusMins = localStorage.getItem(
        "streakflow_custom_focus_mins",
      );
      if (savedFocusMins) {
        const parsed = parseInt(savedFocusMins, 10);
        if (parsed > 0 && parsed <= 300) {
          setCustomFocusMins(parsed);
          setCustomMinsInputValue(parsed.toString());
          setTimeLeft(parsed * 60);
        }
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

  // Report timer status to parent
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

  // Fullscreen toggle
  const enterFullscreen = useCallback(async () => {
    setIsFullscreen(true);
    try {
      if (typeof document !== "undefined" && !document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
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

  // Sound chime toggler
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("streakflow_sound_enabled", String(next));
    }
  };

  // Smart volume / mute toggler for focus audio and timer chimes
  const handleVolumeButtonClick = () => {
    if (musicPlaying) {
      if (musicVolume > 0) {
        prevVolumeRef.current = musicVolume;
        setMusicVolume(0);
      } else {
        setMusicVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.4);
      }
    } else {
      toggleSound();
    }
  };

  // Synthesizer Audio Chimes
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

  // Offline Web Audio Synthesizers
  const stopSynth = useCallback(() => {
    if (synthNodesRef.current) {
      try {
        if (synthNodesRef.current.source) {
          synthNodesRef.current.source.stop();
          synthNodesRef.current.source.disconnect();
        }
        if (synthNodesRef.current.rightOsc) {
          synthNodesRef.current.rightOsc.stop();
          synthNodesRef.current.rightOsc.disconnect();
        }
      } catch {}
      synthNodesRef.current = null;
    }
  }, []);

  const startBrownNoise = useCallback(
    (ctx: AudioContext, vol: number) => {
      stopSynth();
      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(650, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.7, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      synthNodesRef.current = { source, gainNode: gain };
    },
    [stopSynth],
  );

  const startRainSynth = useCallback(
    (ctx: AudioContext, vol: number) => {
      stopSynth();
      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
        b6 = white * 0.115926;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1200, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.8, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      synthNodesRef.current = { source, gainNode: gain };
    },
    [stopSynth],
  );

  const startBinaural = useCallback(
    (ctx: AudioContext, vol: number) => {
      stopSynth();
      const oscLeft = ctx.createOscillator();
      const oscRight = ctx.createOscillator();
      oscLeft.type = "sine";
      oscRight.type = "sine";
      oscLeft.frequency.setValueAtTime(200, ctx.currentTime);
      oscRight.frequency.setValueAtTime(210, ctx.currentTime);

      const pannerLeft = ctx.createStereoPanner
        ? ctx.createStereoPanner()
        : null;
      const pannerRight = ctx.createStereoPanner
        ? ctx.createStereoPanner()
        : null;
      if (pannerLeft) pannerLeft.pan.setValueAtTime(-0.8, ctx.currentTime);
      if (pannerRight) pannerRight.pan.setValueAtTime(0.8, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.25, ctx.currentTime);

      if (pannerLeft && pannerRight) {
        oscLeft.connect(pannerLeft);
        pannerLeft.connect(gain);
        oscRight.connect(pannerRight);
        pannerRight.connect(gain);
      } else {
        oscLeft.connect(gain);
        oscRight.connect(gain);
      }

      gain.connect(ctx.destination);
      oscLeft.start();
      oscRight.start();

      synthNodesRef.current = {
        source: oscLeft,
        rightOsc: oscRight,
        gainNode: gain,
      };
    },
    [stopSynth],
  );

  // Audio Playback Coordination
  const activePreset =
    MUSIC_PRESETS.find((p) => p.id === selectedMusicPreset) || MUSIC_PRESETS[0];
  const currentMusicUrl = useCustomMusic ? customMusicUrl : activePreset.url;
  const safeAudioSrc = activeYtId ? undefined : currentMusicUrl;

  // Direct start audio function to guarantee user-gesture acceptance
  // Audio stream & YouTube player controller
  const playAudioStream = useCallback(
    (url: string) => {
      stopSynth();
      const ytId = extractYouTubeId(url);
      if (ytId) {
        if (audioRef.current) audioRef.current.pause();
        setActiveYtId(ytId);
        setMusicPlaying(true);
        setAudioStatusMsg(`Streaming YouTube Audio (${ytId})`);
        return;
      }

      setActiveYtId(null);
      if (!audioRef.current) return;

      setAudioStatusMsg("Connecting stream...");
      setAudioStatusMsg("Connecting direct stream...");
      audioRef.current.crossOrigin = "anonymous";
      audioRef.current.src = url;
      audioRef.current.volume = musicVolume;
      audioRef.current.load();

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setMusicPlaying(true);
            setAudioStatusMsg("Playing");
            setAudioStatusMsg("Playing Direct Stream");
          })
          .catch((err) => {
            console.warn("Direct stream play error:", err);
            setAudioStatusMsg("Unable to stream URL (Format or CORS error)");
            setAudioStatusMsg(
              "Direct stream unreachable. Paste direct .mp3 / icecast URL or YouTube link.",
            );
            setMusicPlaying(false);
          });
      }
    },
    [musicVolume, stopSynth],
  );

  const startOfflineSynth = useCallback(
    (type: "brown_noise" | "binaural" | "rain") => {
      setActiveYtId(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          if (!synthCtxRef.current || synthCtxRef.current.state === "closed") {
            synthCtxRef.current = new AudioCtx();
          }
          if (synthCtxRef.current.state === "suspended") {
            synthCtxRef.current.resume();
          }
          if (type === "brown_noise") {
            startBrownNoise(synthCtxRef.current, musicVolume);
            setAudioStatusMsg("Synthesizing Brownian Waterfall (Offline)");
          } else if (type === "binaural") {
            startBinaural(synthCtxRef.current, musicVolume);
            setAudioStatusMsg("Synthesizing 10Hz Alpha Waves (Offline)");
          } else if (type === "rain") {
            startRainSynth(synthCtxRef.current, musicVolume);
            setAudioStatusMsg("Synthesizing Rain & Storm (Offline)");
          }
          setMusicPlaying(true);
        }
      } catch (err) {
        console.warn("Offline synth error:", err);
      }
    },
    [musicVolume, startBinaural, startBrownNoise, startRainSynth],
  );

  const toggleMusic = () => {
    if (musicPlaying) {
      if (audioRef.current) audioRef.current.pause();
      stopSynth();
      setActiveYtId(null);
      setMusicPlaying(false);
      setAudioStatusMsg("Paused");
    } else {
      if (useCustomMusic && customMusicUrl) {
        playAudioStream(customMusicUrl);
      } else if (activePreset.type === "stream") {
        playAudioStream(activePreset.url);
      } else {
        startOfflineSynth(activePreset.type);
      }
    }
  };

  const handleSelectPreset = (preset: MusicPreset) => {
    setSelectedMusicPreset(preset.id);
    setUseCustomMusic(false);
    setActiveYtId(null);
    if (preset.type === "stream") {
      playAudioStream(preset.url);
    } else {
      startOfflineSynth(preset.type);
    }
  };

  const handleSetCustomUrl = (url: string) => {
    const trimmed = url.trim();
    if (trimmed) {
      setCustomMusicUrl(trimmed);
      setUseCustomMusic(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("streakflow_custom_music_url", trimmed);
        setRecentMusicUrls((prev) => {
          const filtered = prev.filter((u) => u !== trimmed);
          const updated = [trimmed, ...filtered].slice(0, 3);
          localStorage.setItem(
            "streakflow_recent_music_urls",
            JSON.stringify(updated),
          );
          return updated;
        });
      }
      playAudioStream(trimmed);
    }
  };

  // Adjust volume across HTML5 audio, Web Audio synths, and YouTube iframe
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
    if (synthNodesRef.current?.gainNode && synthCtxRef.current) {
      const targetGain =
        activePreset.type === "binaural"
          ? musicVolume * 0.25
          : musicVolume * 0.7;
      synthNodesRef.current.gainNode.gain.setValueAtTime(
        targetGain,
        synthCtxRef.current.currentTime,
      );
    }
    if (ytIframeRef.current?.contentWindow) {
      try {
        if (musicVolume === 0) {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "mute", args: [] }),
            "*",
          );
        } else {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "unMute", args: [] }),
            "*",
          );
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: "command",
              func: "setVolume",
              args: [Math.round(musicVolume * 100)],
            }),
            "*",
          );
        }
      } catch {}
    }
  }, [musicVolume, activePreset.type]);

  // YouTube player loop event listener (auto restarts video when it finishes)
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      try {
        let payload = e.data;
        if (typeof payload === "string") {
          payload = JSON.parse(payload);
        }
        // State 0 is ENDED in YouTube IFrame Player API
        if (
          (payload?.event === "onStateChange" && payload?.info === 0) ||
          payload?.info === 0
        ) {
          if (ytIframeRef.current?.contentWindow) {
            ytIframeRef.current.contentWindow.postMessage(
              JSON.stringify({
                event: "command",
                func: "seekTo",
                args: [0, true],
              }),
              "*",
            );
            ytIframeRef.current.contentWindow.postMessage(
              JSON.stringify({
                event: "command",
                func: "playVideo",
                args: [],
              }),
              "*",
            );
          }
        }
      } catch {}
    };

    window.addEventListener("message", handleWindowMessage);
    return () => window.removeEventListener("message", handleWindowMessage);
  }, []);

  // Clean up synth on unmount
  useEffect(() => {
    return () => {
      stopSynth();
      if (synthCtxRef.current && synthCtxRef.current.state !== "closed") {
        synthCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopSynth]);

  // Timer mode toggle sound
  const handleToggleTimer = () => {
    if (!isRunning) {
      playStartSound();
      setIsRunning(true);
    } else {
      playPauseSound();
      setIsRunning(false);
    }
  };

  // Explicit Complete & Log Sprint handler
  // Automatic Sprint Completion handler (Triggered strictly when timer reaches 00:00)
  const handleLogAndCompleteSprint = (customMins?: number) => {
    setIsRunning(false);
    playEndChime();

    const plannedSeconds = getModeTime(mode);
    const secondsWorked = plannedSeconds - timeLeft;
    const minutesToRecord =
      customMins !== undefined
        ? customMins
        : Math.max(1, Math.round(secondsWorked / 60));
    if (mode === "focus") {
      const minutesToRecord =
        customMins !== undefined
          ? customMins
          : Math.max(1, Math.round(getModeTime("focus") / 60));

      // Log to API & Local storage
      api
        .logFocusSession({
          duration_seconds: minutesToRecord * 60,
          session_type: "focus",
          xp_earned: minutesToRecord >= 25 ? 50 : 25,
        })
        .then(() => {
          // Broadcast custom event so Statistics immediately updates
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("focus-session-completed", {
                detail: { minutes: minutesToRecord },
              }),
            );
          }
        })
        .catch(() => {});
      // Log to API & Local storage
      api
        .logFocusSession({
          duration_seconds: minutesToRecord * 60,
          session_type: "focus",
          xp_earned: minutesToRecord >= 25 ? 50 : 25,
        })
        .then(() => {
          // Broadcast custom event so Statistics immediately updates
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("focus-session-completed", {
                detail: { minutes: minutesToRecord },
              }),
            );
          }
        })
        .catch(() => {});

      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      setCompletedSessions((prev) => prev + 1);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      setCompletedSessions((prev) => prev + 1);

      if (onSessionComplete) onSessionComplete();
      if (onSessionComplete) onSessionComplete();
    }

    // Reset to break or next sprint
    // Advance to next cycle
    const nextMode: TimerMode =
      (completedSessions + 1) % 4 === 0 ? "long_break" : "short_break";
    mode === "focus"
      ? (completedSessions + 1) % 4 === 0
        ? "long_break"
        : "short_break"
      : "focus";
    setMode(nextMode);
    setTimeLeft(getModeTime(nextMode));
  };

  // Timer Tick
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleLogAndCompleteSprint(customFocusMins);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, customFocusMins, mode, completedSessions]);

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
    setTimeLeft(getModeTime(newMode));
  };

  const resetTimer = (targetMode: TimerMode = mode) => {
    setIsRunning(false);
    setTimeLeft(getModeTime(targetMode));
  };

  const handleApplyCustomMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customMinsInputValue, 10);
    if (!isNaN(val) && val > 0 && val <= 300) {
      setCustomFocusMins(val);
      if (typeof window !== "undefined") {
        localStorage.setItem("streakflow_custom_focus_mins", val.toString());
      }
      setShowCustomMinsInput(false);
      if (mode === "focus") {
        setIsRunning(false);
        setTimeLeft(val * 60);
      }
    }
  };

  // Focus Audio Modal
  const renderMusicModal = () => {
    if (!showMusicMenu) return null;
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
        <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <span className="font-bold text-zinc-100 flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400" /> Focus Audio
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMusic}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  musicPlaying
                    ? "bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900"
                    : "bg-emerald-500 text-black hover:bg-emerald-400"
                }`}
              >
                {musicPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" /> PAUSE
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> PLAY
                  </>
                )}
              </button>
              <button
                onClick={() => setShowMusicMenu(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {audioStatusMsg && (
            <div className="text-[11px] px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-1.5 text-zinc-300">
              <Radio
                className={`w-3 h-3 ${musicPlaying ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`}
              />
              <span className="truncate">{audioStatusMsg}</span>
            </div>
          )}

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
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">
              Curated Streams & Offline Audio
            </span>
            {MUSIC_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                  !useCustomMusic &&
                  selectedMusicPreset === p.id &&
                  musicPlaying
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

          {/* Custom Audio Stream URL */}
          {/* Custom Audio Stream & YouTube URL */}
          <div className="pt-3 border-t border-zinc-800/80 space-y-2">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">
              Direct Audio or YouTube Stream URL
            </span>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste YouTube link or .mp3 / icecast URL..."
                value={customMusicUrl}
                onChange={(e) => setCustomMusicUrl(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleSetCustomUrl(customMusicUrl)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Play
              </button>
            </div>

            {/* Last 3 Stream URLs Record */}
            {recentMusicUrls.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">
                  Recent Stream URLs (Last 3)
                </span>
                <div className="flex flex-col gap-1.5">
                  {recentMusicUrls.map((url, idx) => {
                    const ytId = extractYouTubeId(url);
                    const label = ytId
                      ? `YouTube Stream (${ytId})`
                      : url.replace(/^https?:\/\//, "").slice(0, 36);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCustomMusicUrl(url);
                          handleSetCustomUrl(url);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg bg-zinc-900/70 hover:bg-zinc-800 text-[11px] text-zinc-300 border border-zinc-800 flex items-center justify-between gap-2 transition cursor-pointer"
                        title={url}
                      >
                        <span className="truncate flex items-center gap-1.5">
                          <Play className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{label}</span>
                        </span>
                        <span className="text-[9px] text-zinc-500 shrink-0 font-mono uppercase">
                          {ytId ? "YouTube" : "Audio"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeYtId && musicPlaying && (
              <div className="mt-2 p-2.5 rounded-xl border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-[11px]">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />{" "}
                  YouTube Audio Active
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">
                  Plays in background
                </span>
              </div>
            )}

            {useCustomMusic && customMusicUrl && !activeYtId && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                ✓ Playing direct stream (saved)
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Custom Minutes Modal
  const renderCustomMinsModal = () => {
    if (!showCustomMinsInput) return null;
    return (
      <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
        <form
          onSubmit={handleApplyCustomMinutes}
          className="w-full max-w-xs bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 font-mono text-xs"
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="font-bold text-zinc-100 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" /> Custom Sprint
              Time
            </span>
            <button
              type="button"
              onClick={() => setShowCustomMinsInput(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">
              Sprint Duration (in minutes, 1 - 180):
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={customMinsInputValue}
              onChange={(e) => setCustomMinsInputValue(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-white text-base font-bold outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setCustomMinsInputValue(m.toString())}
                className="py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-[11px]"
              >
                {m}m
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition cursor-pointer"
          >
            Apply Sprint Time
          </button>
        </form>
      </div>
    );
  };

  // Persistent audio engine keeping streams and YouTube playing across modal close
  const renderPersistentAudio = () => {
    return (
      <>
        <audio
          ref={audioRef}
          src={safeAudioSrc}
          crossOrigin="anonymous"
          loop
          preload="none"
        />

        {/* Persistent YouTube Stream Player */}
        {activeYtId && (
          <div
            className={
              musicPlaying && !showMusicMenu
                ? "fixed bottom-20 sm:bottom-6 right-4 z-50 bg-zinc-950/95 border border-zinc-800 p-2.5 rounded-2xl shadow-2xl flex items-center gap-3 font-mono text-xs backdrop-blur-md animate-in fade-in"
                : "w-0 h-0 overflow-hidden opacity-0 pointer-events-none absolute"
            }
          >
            {musicPlaying && !showMusicMenu && (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-emerald-400" /> YouTube
                      Stream
                    </span>
                    <span className="text-[9px] text-zinc-500 max-w-[100px] truncate">
                      {activeYtId}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleMusic}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold transition cursor-pointer"
                >
                  Pause
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopSynth();
                    setActiveYtId(null);
                    setMusicPlaying(false);
                  }}
                  className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                  title="Stop YouTube Stream"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Hidden iframe keeping YouTube audio alive in background */}
            <iframe
              ref={ytIframeRef}
              key={activeYtId}
              src={`https://www.youtube-nocookie.com/embed/${activeYtId}?autoplay=1&enablejsapi=1&loop=1&playlist=${activeYtId}`}
              title="YouTube Background Audio"
              className="w-[1px] h-[1px] opacity-0 overflow-hidden pointer-events-none absolute"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              onLoad={() => {
                if (ytIframeRef.current?.contentWindow) {
                  try {
                    ytIframeRef.current.contentWindow.postMessage(
                      JSON.stringify({
                        event: "command",
                        func: "setVolume",
                        args: [Math.round(musicVolume * 100)],
                      }),
                      "*",
                    );
                  } catch {}
                }
              }}
            />
          </div>
        )}
      </>
    );
  };

  // FULLSCREEN MODE
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-[100] w-screen h-[100dvh] min-h-[100dvh] bg-black text-white flex flex-col justify-between p-4 sm:p-8 md:p-12 select-none overflow-hidden"
        style={{ cursor: isIdle && isRunning ? "none" : "default" }}
      >
        {renderPersistentAudio()}

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

        {/* TOP BAR */}
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
                ? `Deep Work Sprint (${customFocusMins}m)`
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
            <button
              onClick={() => setShowMusicMenu(!showMusicMenu)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono transition cursor-pointer ${
                musicPlaying
                  ? "bg-emerald-950/70 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
              title="Focus Audio (M)"
            >
              <Music
                className={`w-3.5 h-3.5 ${musicPlaying ? "animate-spin" : ""}`}
              />
              <span className="hidden md:inline">
                {musicPlaying ? "Audio Playing" : "Focus Audio"}
              </span>
            </button>

            <button
              onClick={handleVolumeButtonClick}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                musicPlaying
                  ? musicVolume === 0
                    ? "bg-rose-950/60 border-rose-800 text-rose-400"
                    : "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                  : "bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
              title={
                musicPlaying
                  ? musicVolume === 0
                    ? "Unmute Focus Audio"
                    : `Focus Audio: ${Math.round(musicVolume * 100)}% (Click to Mute)`
                  : soundEnabled
                    ? "Mute Timer Chimes"
                    : "Enable Timer Chimes"
              }
            >
              {musicPlaying ? (
                musicVolume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )
              ) : soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={exitFullscreen}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-mono text-xs transition cursor-pointer"
              title="Exit Fullscreen (ESC)"
            >
              <Minimize2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Exit</span>
              <kbd className="hidden md:inline px-1.5 py-0.5 text-[10px] bg-zinc-800 rounded border border-zinc-700 text-zinc-400">
                ESC
              </kbd>
            </button>
          </div>
        </div>

        {/* MAIN STAGE */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full max-w-4xl mx-auto text-center px-2">
          {/* Mode Switcher */}
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
              FOCUS ({customFocusMins}M)
            </button>
            <button
              onClick={() => switchMode("short_break")}
              className={`text-xs sm:text-sm font-mono px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                mode === "short_break"
                  ? "bg-zinc-800 text-cyan-400 font-bold shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              SHORT (5M)
            </button>
            <button
              onClick={() => switchMode("long_break")}
              className={`text-xs sm:text-sm font-mono px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                mode === "long_break"
                  ? "bg-zinc-800 text-purple-400 font-bold shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              LONG (15M)
            </button>
            <button
              onClick={() => setShowCustomMinsInput(true)}
              className="text-xs font-mono px-2.5 py-1.5 rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200"
              title="Set Custom Focus Time"
            >
              ⚙ CUSTOM
            </button>
          </div>

          {/* GIANT DIGITAL CLOCK */}
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

          {/* CONTROLS */}
          <div
            className={`flex items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-10 transition-all duration-700 flex-wrap ${
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

        {/* BOTTOM HELPER BAR */}
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
              Focus Audio
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
                R
              </kbd>{" "}
              Reset
            </span>
          </div>

          <div className="hidden sm:block text-zinc-500">Go with Flow</div>
        </div>

        {renderMusicModal()}
        {renderCustomMinsModal()}
      </div>
    );
  }

  // If not inline and not fullscreen, just render audio
  if (!showInline) {
    return renderPersistentAudio();
  }

  // STANDARD INLINE CARD MODE
  return (
    <div className="relative overflow-hidden bg-black border border-zinc-800/80 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center">
      {renderPersistentAudio()}

      {/* Ambience */}
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
        <div className="flex items-center gap-1 sm:gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800 flex-wrap">
          <button
            onClick={() => switchMode("focus")}
            className={`text-xs font-mono px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === "focus"
                ? "bg-zinc-800 text-emerald-400 font-bold shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            FOCUS ({customFocusMins}M)
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
          <button
            onClick={() => setShowCustomMinsInput(true)}
            className="text-[11px] font-mono px-2 py-1 rounded-lg border border-dashed border-zinc-700 text-zinc-400 hover:text-emerald-400 transition cursor-pointer"
            title="Custom duration"
          >
            ⚙ CUSTOM
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMusicMenu(true)}
            className={`p-2 rounded-xl border text-xs font-mono transition cursor-pointer ${
              musicPlaying
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Focus Audio (M)"
          >
            <Music
              className={`w-3.5 h-3.5 ${musicPlaying ? "animate-spin" : ""}`}
            />
          </button>

          <button
            onClick={handleVolumeButtonClick}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              musicPlaying
                ? musicVolume === 0
                  ? "bg-rose-950/60 border-rose-800 text-rose-400"
                  : "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                : "bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
            title={
              musicPlaying
                ? musicVolume === 0
                  ? "Unmute Focus Audio"
                  : `Focus Audio: ${Math.round(musicVolume * 100)}% (Click to Mute)`
                : soundEnabled
                  ? "Mute Timer Chimes"
                  : "Enable Timer Chimes"
            }
          >
            {musicPlaying ? (
              musicVolume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )
            ) : soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={enterFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/70 hover:border-emerald-600 text-emerald-400 text-xs font-mono font-bold transition cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            title="Enter Fullscreen (F)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Clock Display */}
      <div
        onClick={enterFullscreen}
        className="my-2 z-10 text-center cursor-pointer group"
        title="Click for Fullscreen Zen Mode"
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
      <div className="flex items-center gap-3 mt-6 z-10 flex-wrap justify-center">
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

      {/* Helper */}
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
          focus audio
        </span>
      </div>


      {renderMusicModal()}
      {renderCustomMinsModal()}
    </div>
  );
}
