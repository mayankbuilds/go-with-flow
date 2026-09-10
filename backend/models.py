from datetime import datetime, date, timezone
from typing import Optional, List
from sqlalchemy import String, DateTime, Date, Integer, Boolean, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class CodingLog(Base):
    __tablename__ = "coding_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    problem_title: Mapped[str] = mapped_column(String(255), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), default="LeetCode")  # LeetCode, Codeforces, GFG, etc.
    difficulty: Mapped[str] = mapped_column(String(20), default="Medium")  # Easy, Medium, Hard
    topic_tag: Mapped[str] = mapped_column(String(50), default="DSA")     # DP, Graph, Trees, System Design
    problem_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    time_spent_mins: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    solved_at: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )


class DailyFocus(Base):
    """
    Rule of 3: Max 3 critical tasks per day to force execution focus.
    """
    __tablename__ = "daily_focus"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    target_date: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    priority_order: Mapped[int] = mapped_column(Integer)  # 1, 2, or 3
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )

    __table_args__ = (
        # Ensure priority 1, 2, or 3 is unique per specific date
        UniqueConstraint("target_date", "priority_order", name="unique_daily_focus_slot"),
    )


class QuickScratchpad(Base):
    """
    Brain-dump inbox for college submissions, shopping, errands.
    """
    __tablename__ = "scratchpad"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    content: Mapped[str] = mapped_column(String(300), nullable=False)
    bucket: Mapped[str] = mapped_column(String(50), default="General")  # College, Errands, Shopping, ReadLater
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    reminder_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )