from datetime import date
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from app.database import SessionDep
from app.models.focus import DailyFocus
from app.models.stats import UserStats
from app.schemas.focus import DailyFocusCreate, DailyFocusResponse, DailyFocusUpdate

router = APIRouter(prefix="/focus", tags=["Focus"])


@router.get("/today", response_model=list[DailyFocusResponse])
def get_today_focus(db: SessionDep):
    today = date.today()
    stmt = select(DailyFocus).where(DailyFocus.target_date == today).order_by(DailyFocus.priority_order.asc())
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