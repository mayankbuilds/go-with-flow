export interface CodingLog {
  id: number;
  problem_title: string;
  platform: string;
  difficulty: "Easy" | "Medium" | "Hard" | string;
  topic_tag: string;
  problem_url?: string | null;
  time_spent_mins?: number | null;
  solved_at: string;
  created_at: string;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface DailyFocus {
  id: number;
  title: string;
  target_date: string;
  priority_order: number; // 1, 2, or 3
  is_completed: boolean;
  created_at: string;
}

export interface ScratchpadItem {
  id: number;
  content: string;
  bucket: string;
  is_archived: boolean;
  reminder_time?: string | null;
  created_at: string;
}