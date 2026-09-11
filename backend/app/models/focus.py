from datetime import date, datetime, timezone
from sqlalchemy import Boolean, Date, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class DailyFocus(Base):
    __tablename__ = "daily_focus"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    target_date: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    priority_order: Mapped[int] = mapped_column(Integer)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "target_date", "priority_order", name="unique_daily_focus_slot"
        ),
    )


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=1500)
    session_type: Mapped[str] = mapped_column(String(50), default="focus")
    target_date: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    xp_earned: Mapped[int] = mapped_column(Integer, default=50)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
