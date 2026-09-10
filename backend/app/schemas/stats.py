from datetime import date
from pydantic import BaseModel, ConfigDict


class UserStatsResponse(BaseModel):
    id: int
    xp: int
    level: int
    current_streak_days: int
    longest_streak_days: int
    last_active_date: date | None = None

    model_config = ConfigDict(from_attributes=True)