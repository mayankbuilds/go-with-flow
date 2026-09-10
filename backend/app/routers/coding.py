from datetime import date, timedelta
from fastapi import APIRouter, status
from sqlalchemy import func, select
from app.database import SessionDep
from app.models.coding import CodingLog
from app.models.stats import UserStats
from app.schemas.coding import CodingLogCreate, CodingLogResponse, HeatmapDay

router = APIRouter(prefix="/coding", tags=["Coding"])


@router.post("/logs", response_model=CodingLogResponse, status_code=status.HTTP_201_CREATED)
def log_problem(log_data: CodingLogCreate, db: SessionDep):
    data = log_data.model_dump()
    today = date.today()
    if not data.get("solved_at"):
        data["solved_at"] = today

    log = CodingLog(**data)
    db.add(log)

    # Award 30 XP on coding submission
    stats = db.scalars(select(UserStats)).first()
    if stats:
        stats.xp += 30
        stats.level = (stats.xp // 300) + 1
        if stats.last_active_date != today:
            stats.current_streak_days += 1
            stats.last_active_date = today
            if stats.current_streak_days > stats.longest_streak_days:
                stats.longest_streak_days = stats.current_streak_days

    db.commit()
    db.refresh(log)
    return log


@router.get("/logs", response_model=list[CodingLogResponse])
def get_recent_logs(db: SessionDep, limit: int = 10):
    stmt = select(CodingLog).order_by(CodingLog.solved_at.desc(), CodingLog.id.desc()).limit(limit)
    return list(db.scalars(stmt).all())


@router.get("/heatmap", response_model=list[HeatmapDay])
def get_heatmap_data(db: SessionDep, days: int = 112):
    start_date = date.today() - timedelta(days=days)
    stmt = (
        select(CodingLog.solved_at, func.count(CodingLog.id))
        .where(CodingLog.solved_at >= start_date)
        .group_by(CodingLog.solved_at)
        .order_by(CodingLog.solved_at.asc())
    )
    results = db.execute(stmt).all()
    return [{"date": str(row[0]), "count": row[1]} for row in results]