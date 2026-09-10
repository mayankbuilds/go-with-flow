// frontend/src/lib/api.ts
import { 
  CodingLog, 
  HeatmapDay, 
  DailyFocus, 
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
  // Coding Arena
  getHeatmap: (days: number = 112) => 
    request<HeatmapDay[]>(`/coding/heatmap?days=${days}`),
  
  getRecentLogs: (limit: number = 10) => 
    request<CodingLog[]>(`/coding/logs?limit=${limit}`),
  
  logProblem: (data: { problem_title: string; platform: string; difficulty: string; topic_tag: string }) => 
    request<CodingLog>("/coding/logs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Rule of 3 Focus
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

  // Student Routines
  getRoutines: () => 
    request<StudentRoutine[]>("/routines"),
  
  createRoutine: (data: { title: string; start_time: string; end_time: string; category: string }) => 
    request<StudentRoutine>("/routines", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  toggleRoutine: (id: number) => 
    request<StudentRoutine>(`/routines/${id}/toggle`, { method: "PATCH" }),

  // User Stats & XP
  getUserStats: () => 
    request<UserStats>("/user/stats"),
};