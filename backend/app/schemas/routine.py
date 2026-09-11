from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class StudentRoutineCreate(BaseModel):
    title: str = Field(..., min_length=1)
    start_time: str
    end_time: str
    category: str = "Coding"
    scheduled_date: str | None = None


class StudentRoutineUpdate(BaseModel):
    title: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    category: str | None = None
    scheduled_date: str | None = None
    is_completed_today: bool | None = None


class StudentRoutineResponse(BaseModel):
    id: int
    title: str
    start_time: str
    end_time: str
    category: str
    scheduled_date: str | None = None
    is_completed_today: bool
    last_completed_date: date | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
