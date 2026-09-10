from datetime import date, timedelta
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models
import schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="StreakFlow Command Center API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# 1. CODING / DSA LEDGER & HEATMAP
# -------------------------------------------------------------

@app.post("/coding/logs", response_model=schemas.CodingLogResponse, status_code=status.HTTP_201_CREATED)
def log_problem(log_data: schemas.CodingLogCreate, db: Session = Depends(get_db)):
    data = log_data.model_dump()
    if not data.get("solved_at"):
        data["solved_at"] = date.today()
        
    log = models.CodingLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@app.get("/coding/logs", response_model=List[schemas.CodingLogResponse])
def get_recent_coding_logs(limit: int = 10, db: Session = Depends(get_db)):
    stmt = select(models.CodingLog).order_by(models.CodingLog.solved_at.desc(), models.CodingLog.id.desc()).limit(limit)
    return list(db.scalars(stmt).all())

@app.get("/coding/heatmap", response_model=List[schemas.HeatmapDay])
def get_heatmap_data(days: int = 120, db: Session = Depends(get_db)):
    start_date = date.today() - timedelta(days=days)
    stmt = (
        select(models.CodingLog.solved_at, func.count(models.CodingLog.id))
        .where(models.CodingLog.solved_at >= start_date)
        .group_by(models.CodingLog.solved_at)
        .order_by(models.CodingLog.solved_at.asc())
    )
    results = db.execute(stmt).all()
    return [{"date": str(row[0]), "count": row[1]} for row in results]

# -------------------------------------------------------------
# 2. DAILY FOCUS ENGINE (RULE OF 3)
# -------------------------------------------------------------

@app.get("/focus/today", response_model=List[schemas.DailyFocusResponse])
def get_today_focus(target_date: Optional[date] = None, db: Session = Depends(get_db)):
    current_date = target_date or date.today()
    stmt = (
        select(models.DailyFocus)
        .where(models.DailyFocus.target_date == current_date)
        .order_by(models.DailyFocus.priority_order.asc())
    )
    return list(db.scalars(stmt).all())

@app.post("/focus", response_model=schemas.DailyFocusResponse, status_code=status.HTTP_201_CREATED)
def set_focus_slot(focus_data: schemas.DailyFocusCreate, db: Session = Depends(get_db)):
    target = focus_data.target_date or date.today()

    # Rule of 3 check
    existing_stmt = select(models.DailyFocus).where(
        models.DailyFocus.target_date == target,
        models.DailyFocus.priority_order == focus_data.priority_order
    )
    existing = db.scalars(existing_stmt).first()

    if existing:
        # Overwrite or update existing slot
        existing.title = focus_data.title
        existing.is_completed = False
        db.commit()
        db.refresh(existing)
        return existing

    new_focus = models.DailyFocus(
        title=focus_data.title,
        priority_order=focus_data.priority_order,
        target_date=target
    )
    db.add(new_focus)
    db.commit()
    db.refresh(new_focus)
    return new_focus

@app.patch("/focus/{focus_id}", response_model=schemas.DailyFocusResponse)
def update_focus_state(focus_id: int, update_data: schemas.DailyFocusUpdate, db: Session = Depends(get_db)):
    stmt = select(models.DailyFocus).where(models.DailyFocus.id == focus_id)
    focus_item = db.scalars(stmt).first()
    if not focus_item:
        raise HTTPException(status_code=404, detail="Focus task not found")

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(focus_item, field, value)

    db.commit()
    db.refresh(focus_item)
    return focus_item

# -------------------------------------------------------------
# 3. FAST SCRATCHPAD / ERRANDS INBOX
# -------------------------------------------------------------

@app.get("/scratchpad", response_model=List[schemas.ScratchpadResponse])
def get_scratchpad(bucket: Optional[str] = None, db: Session = Depends(get_db)):
    stmt = select(models.QuickScratchpad).where(models.QuickScratchpad.is_archived.is_(False))
    if bucket and bucket != "All":
        stmt = stmt.where(models.QuickScratchpad.bucket == bucket)
    stmt = stmt.order_by(models.QuickScratchpad.created_at.desc())
    return list(db.scalars(stmt).all())

@app.post("/scratchpad", response_model=schemas.ScratchpadResponse, status_code=status.HTTP_201_CREATED)
def add_scratchpad_item(item: schemas.ScratchpadCreate, db: Session = Depends(get_db)):
    db_item = models.QuickScratchpad(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.patch("/scratchpad/{item_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
def archive_scratchpad_item(item_id: int, db: Session = Depends(get_db)):
    stmt = select(models.QuickScratchpad).where(models.QuickScratchpad.id == item_id)
    item = db.scalars(stmt).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_archived = True
    db.commit()
    return None