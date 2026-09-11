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


class CodingLogUpdate(BaseModel):
    problem_title: str | None = None
    platform: str | None = None
    difficulty: str | None = None
    topic_tag: str | None = None
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


class LeetCodeSyncRequest(BaseModel):
    username: str = Field(..., min_length=1)


class CodeforcesSyncRequest(BaseModel):
    handle: str = Field(..., min_length=1)


class PlatformStat(BaseModel):
    platform: str
    count: int
    color: str


class DifficultyStat(BaseModel):
    difficulty: str
    count: int
    color: str


class CodingSyncResult(BaseModel):
    platform: str
    handle: str
    total_solved: int
    easy_solved: int = 0
    medium_solved: int = 0
    hard_solved: int = 0
    rating: int | None = None
    rank: str | None = None
    synced_problems_count: int = 0
    message: str


class CodingAnalyticsResponse(BaseModel):
    total_solved: int
    platform_breakdown: list[PlatformStat]
    difficulty_breakdown: list[DifficultyStat]
