from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, date
from typing import Optional, List

# --- Coding Log Schemas ---
class CodingLogCreate(BaseModel):
    problem_title: str = Field(..., min_length=1)
    platform: Optional[str] = "LeetCode"
    difficulty: Optional[str] = "Medium"
    topic_tag: Optional[str] = "DSA"
    problem_url: Optional[str] = None
    time_spent_mins: Optional[int] = None
    solved_at: Optional[date] = None

class CodingLogResponse(CodingLogCreate):
    id: int
    solved_at: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HeatmapDay(BaseModel):
    date: str
    count: int

# --- Daily Focus (Rule of 3) Schemas ---
class DailyFocusCreate(BaseModel):
    title: str = Field(..., min_length=1)
    priority_order: int = Field(..., ge=1, le=3, description="Must be 1, 2, or 3")
    target_date: Optional[date] = None

class DailyFocusUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None

class DailyFocusResponse(BaseModel):
    id: int
    title: str
    target_date: date
    priority_order: int
    is_completed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Scratchpad Schemas ---
class ScratchpadCreate(BaseModel):
    content: str = Field(..., min_length=1)
    bucket: Optional[str] = "General"
    reminder_time: Optional[datetime] = None

class ScratchpadResponse(BaseModel):
    id: int
    content: str
    bucket: str
    is_archived: bool
    reminder_time: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)