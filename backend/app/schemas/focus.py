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