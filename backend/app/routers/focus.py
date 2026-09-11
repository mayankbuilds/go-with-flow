from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from app.database import SessionDep
from app.models.focus import DailyFocus, FocusSession
from app.models.stats import UserStats
from app.schemas.focus import (
    DailyFocusCreate,
    DailyFocusResponse,
    DailyFocusUpdate,
    FocusDayStat,
    FocusSessionCreate,
    FocusSessionResponse,
    FocusStatsResponse,
)

router = APIRouter(prefix="/focus", tags=["Focus"])


@router.get("/today", response_model=list[DailyFocusResponse])
def get_today_focus(db: SessionDep):
    today = date.today()
    stmt = (
        select(DailyFocus)
        .where(DailyFocus.target_date == today)
        .order_by(DailyFocus.priority_order.asc())
    )
    return list(db.scalars(stmt).all())


@router.post("", response_model=DailyFocusResponse, status_code=status.HTTP_201_CREATED)
def set_focus_slot(focus_data: DailyFocusCreate, db: SessionDep):
    today = focus_data.target_date or date.today()
    stmt = select(DailyFocus).where(
        DailyFocus.target_date == today,
        DailyFocus.priority_order == focus_data.priority_order,
    )
    existing = db.scalars(stmt).first()

    if existing:
        existing.title = focus_data.title.strip()
        existing.is_completed = False
        db.commit()
        db.refresh(existing)
        return existing

    new_item = DailyFocus(
        title=focus_data.title.strip(),
        priority_order=focus_data.priority_order,
        target_date=today,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.patch("/{focus_id}", response_model=DailyFocusResponse)
def update_focus_task(focus_id: int, update_data: DailyFocusUpdate, db: SessionDep):
    stmt = select(DailyFocus).where(DailyFocus.id == focus_id)
    item = db.scalars(stmt).first()
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    # Reward 20 XP on completion
    if update_data.is_completed:
        stats = db.scalars(select(UserStats)).first()
        if stats:
            stats.xp += 20
            stats.level = (stats.xp // 300) + 1

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{focus_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_focus_task(focus_id: int, db: SessionDep):
    stmt = select(DailyFocus).where(DailyFocus.id == focus_id)
    item = db.scalars(stmt).first()
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(item)
    db.commit()
    return None


@router.post(
    "/sessions",
    response_model=FocusSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def log_focus_session(payload: FocusSessionCreate, db: SessionDep):
    today = payload.target_date or date.today()
    session = FocusSession(
        duration_seconds=payload.duration_seconds,
        session_type=payload.session_type,
        target_date=today,
        xp_earned=payload.xp_earned,
    )
    db.add(session)

    # Award XP for focus sprint
    if payload.session_type == "focus":
        stats = db.scalars(select(UserStats)).first()
        if stats:
            stats.xp += payload.xp_earned
            stats.level = (stats.xp // 300) + 1
            if stats.last_active_date != today:
                stats.current_streak_days += 1
                stats.last_active_date = today
                if stats.current_streak_days > stats.longest_streak_days:
                    stats.longest_streak_days = stats.current_streak_days

    db.commit()
    db.refresh(session)
    return session


@router.get("/stats", response_model=FocusStatsResponse)
def get_focus_stats(db: SessionDep, days: int = 7):
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    # All focus sessions
    all_sessions = list(
        db.scalars(
            select(FocusSession).where(FocusSession.session_type == "focus")
        ).all()
    )
    total_seconds = sum(s.duration_seconds for s in all_sessions)
    total_minutes = total_seconds // 60

    # Today's focus
    today_sessions = [s for s in all_sessions if s.target_date == today]
    today_minutes = sum(s.duration_seconds for s in today_sessions) // 60

    # Group by date for the last `days`
    daily_map: dict[str, dict] = {}
    for i in range(days):
        d_str = str(today - timedelta(days=days - 1 - i))
        daily_map[d_str] = {"focus_minutes": 0, "sessions_count": 0}

    for s in all_sessions:
        d_str = str(s.target_date)
        if d_str in daily_map:
            daily_map[d_str]["focus_minutes"] += s.duration_seconds // 60
            daily_map[d_str]["sessions_count"] += 1

    daily_stats = [
        FocusDayStat(
            date=d_str,
            focus_minutes=val["focus_minutes"],
            sessions_count=val["sessions_count"],
        )
        for d_str, val in daily_map.items()
    ]

    return FocusStatsResponse(
        total_focus_minutes=total_minutes,
        today_focus_minutes=today_minutes,
        total_sessions=len(all_sessions),
        daily_stats=daily_stats,
    )
