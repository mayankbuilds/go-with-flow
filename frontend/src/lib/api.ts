import { 
  CodingAnalytics,
  CodingLog, 
  CodingSyncResult,
  HeatmapDay, 
  DailyFocus, 
  FocusSession,
  FocusStats,
  StudentRoutine, 
  UserStats 
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Request failed with status ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Coding Arena & Analytics
  getHeatmap: (days: number = 112) => 
    request<HeatmapDay[]>(`/coding/heatmap?days=${days}`),
  
  getRecentLogs: (limit: number = 10, offset: number = 0) => 
    request<CodingLog[]>(`/coding/logs?limit=${limit}&offset=${offset}`),
  
  logProblem: (data: { problem_title: string; platform: string; difficulty: string; topic_tag: string }) => 
    request<CodingLog>("/coding/logs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCodingLog: (id: number, data: { problem_title?: string; platform?: string; difficulty?: string; topic_tag?: string }) =>
    request<CodingLog>(`/coding/logs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteCodingLog: (id: number) =>
    request<void>(`/coding/logs/${id}`, { method: "DELETE" }),

  getCodingAnalytics: () =>
    request<CodingAnalytics>("/coding/analytics"),

  syncLeetCode: (username: string) =>
    request<CodingSyncResult>("/coding/sync/leetcode", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),

  syncCodeforces: (handle: string) =>
    request<CodingSyncResult>("/coding/sync/codeforces", {
      method: "POST",
      body: JSON.stringify({ handle }),
    }),

  // Rule of 3 Focus & Focus Sessions
  getTodayFocus: () => 
    request<DailyFocus[]>("/focus/today"),
  
  setFocusSlot: (data: { priority_order: number; title: string }) => 
    request<DailyFocus>("/focus", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  updateFocusTask: (id: number, data: { is_completed?: boolean; title?: string }) => 
    request<DailyFocus>(`/focus/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  
  deleteFocusTask: (id: number) => 
    request<void>(`/focus/${id}`, { method: "DELETE" }),

  logFocusSession: (data: { duration_seconds: number; session_type?: string; xp_earned?: number }) =>
    request<FocusSession>("/focus/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getFocusStats: (days: number = 7) =>
    request<FocusStats>(`/focus/stats?days=${days}`),

  // Student Routines (Timetable)
  getRoutines: () => 
    request<StudentRoutine[]>("/routines"),
  
  createRoutine: (data: { title: string; start_time: string; end_time: string; category: string; scheduled_date?: string | null }) => 
    request<StudentRoutine>("/routines", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateRoutine: (id: number, data: { title?: string; start_time?: string; end_time?: string; category?: string; scheduled_date?: string | null; is_completed_today?: boolean }) =>
    request<StudentRoutine>(`/routines/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteRoutine: (id: number) =>
    request<void>(`/routines/${id}`, { method: "DELETE" }),
  
  toggleRoutine: (id: number) => 
    request<StudentRoutine>(`/routines/${id}/toggle`, { method: "PATCH" }),

  // User Stats & XP
  getUserStats: () => 
    request<UserStats>("/user/stats"),

  // Danger Zone / Reset
  resetAllData: () =>
    request<{ status: string; message: string }>("/settings/reset-all-data", {
      method: "POST",
    }),
};