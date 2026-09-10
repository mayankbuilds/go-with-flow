from datetime import date, datetime, timezone
from sqlalchemy import Date, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CodingLog(Base):
    __tablename__ = "coding_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    problem_title: Mapped[str] = mapped_column(String(255), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), default="LeetCode")
    difficulty: Mapped[str] = mapped_column(String(20), default="Medium")
    topic_tag: Mapped[str] = mapped_column(String(50), default="DSA")
    problem_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    time_spent_mins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    solved_at: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )