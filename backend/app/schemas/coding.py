from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class CodingLogCreate(BaseModel):
    problem_title: str = Field(..., min_length=1)
    platform: str = "LeetCode"
    difficulty: str = "Medium"
    topic_tag: str = "DSA"
    problem_url: str | None = None
    time_spent_mins: int | None = None
    solved_at: date | None = None


class CodingLogResponse(CodingLogCreate):
    id: int
    solved_at: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HeatmapDay(BaseModel):
    date: str
    count: int