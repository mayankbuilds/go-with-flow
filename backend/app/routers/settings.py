from fastapi import APIRouter, status
from sqlalchemy import delete, select
from app.database import SessionDep
from app.models.coding import CodingLog
from app.models.focus import DailyFocus, FocusSession
from app.models.routine import StudentRoutine
from app.models.stats import UserStats

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.post("/reset-all-data", status_code=status.HTTP_200_OK)
def reset_all_data(db: SessionDep):
    """
    Permanently wipes all user data:
    - Coding logs
    - Focus sessions
    - Daily focus targets
    - Routine schedule blocks
    - Resets XP, Level, and Streaks back to base level 1.
    """
    db.execute(delete(CodingLog))
    db.execute(delete(DailyFocus))
    db.execute(delete(FocusSession))
    db.execute(delete(StudentRoutine))

    stats = db.scalars(select(UserStats)).first()
    if stats:
        stats.level = 1
        stats.xp = 0
        stats.current_streak_days = 0
        stats.longest_streak_days = 0
        stats.last_active_date = None
    else:
        db.add(
            UserStats(
                level=1,
                xp=0,
                current_streak_days=0,
                longest_streak_days=0,
                last_active_date=None,
            )
        )

    db.commit()
    return {
        "status": "success",
        "message": "All user data has been permanently cleared and reset to fresh state.",
    }
