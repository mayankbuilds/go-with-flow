from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class DailyFocusCreate(BaseModel):
    title: str = Field(..., min_length=1)
    priority_order: int = Field(..., ge=1, le=3)
    target_date: date | None = None


class DailyFocusUpdate(BaseModel):
    title: str | None = None
    is_completed: bool | None = None


class DailyFocusResponse(BaseModel):
    id: int
    title: str
    target_date: date
    priority_order: int
    is_completed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FocusSessionCreate(BaseModel):
    duration_seconds: int = 1500
    session_type: str = "focus"
    target_date: date | None = None
    xp_earned: int = 50


class FocusSessionResponse(BaseModel):
    id: int
    duration_seconds: int
    session_type: str
    target_date: date
    xp_earned: int
    completed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FocusDayStat(BaseModel):
    date: str
    focus_minutes: int
    sessions_count: int


class FocusStatsResponse(BaseModel):
    total_focus_minutes: int
    today_focus_minutes: int
    total_sessions: int
    daily_stats: list[FocusDayStat]
