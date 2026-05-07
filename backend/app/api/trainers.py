from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import Trainer, User
from app.schemas.schemas import TrainerResponse

router = APIRouter(prefix="/api/trainers", tags=["Trainers"])

@router.get("/", response_model=List[TrainerResponse])
async def get_trainers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання списку тренерів"""
    trainers = db.query(Trainer).offset(skip).limit(limit).all()
    return trainers

@router.get("/{trainer_id}", response_model=TrainerResponse)
async def get_trainer(
    trainer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання інформації про тренера"""
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()

    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    return trainer
