from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class StudentRoutineCreate(BaseModel):
    title: str = Field(..., min_length=1)
    start_time: str
    end_time: str
    category: str = "Coding"


class StudentRoutineResponse(BaseModel):
    id: int
    title: str
    start_time: str
    end_time: str
    category: str
    is_completed_today: bool
    last_completed_date: date | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)