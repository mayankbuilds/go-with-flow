from fastapi import APIRouter
from sqlalchemy import select
from app.database import SessionDep
from app.models.stats import UserStats
from app.schemas.stats import UserStatsResponse

router = APIRouter(prefix="/user", tags=["User Stats"])


@router.get("/stats", response_model=UserStatsResponse)
def get_user_stats(db: SessionDep):
    stmt = select(UserStats)
    stats = db.scalars(stmt).first()
    if not stats:
        stats = UserStats(xp=100, level=1, current_streak_days=1, longest_streak_days=1)
        db.add(stats)
        db.commit()
        db.refresh(stats)
    return stats