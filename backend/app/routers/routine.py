from datetime import date
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from app.database import SessionDep
from app.models.routine import StudentRoutine
from app.models.stats import UserStats
from app.schemas.routine import StudentRoutineCreate, StudentRoutineResponse

router = APIRouter(prefix="/routines", tags=["Routine"])


@router.get("", response_model=list[StudentRoutineResponse])
def get_routines(db: SessionDep):
    today = date.today()
    stmt = select(StudentRoutine).order_by(StudentRoutine.start_time.asc())
    routines = list(db.scalars(stmt).all())

    # Auto-reset completed flag when date changes
    for r in routines:
        if r.last_completed_date != today:
            r.is_completed_today = False
    db.commit()
    return routines


@router.post("", response_model=StudentRoutineResponse, status_code=status.HTTP_201_CREATED)
def create_routine(payload: StudentRoutineCreate, db: SessionDep):
    routine = StudentRoutine(**payload.model_dump())
    db.add(routine)
    db.commit()
    db.refresh(routine)
    return routine


@router.patch("/{routine_id}/toggle", response_model=StudentRoutineResponse)
def toggle_routine(routine_id: int, db: SessionDep):
    stmt = select(StudentRoutine).where(StudentRoutine.id == routine_id)
    routine = db.scalars(stmt).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine block not found")

    routine.is_completed_today = not routine.is_completed_today
    if routine.is_completed_today:
        routine.last_completed_date = date.today()
        stats = db.scalars(select(UserStats)).first()
        if stats:
            stats.xp += 40
            stats.level = (stats.xp // 300) + 1

    db.commit()
    db.refresh(routine)
    return routine