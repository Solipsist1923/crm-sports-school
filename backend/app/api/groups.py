from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.auth import get_current_user, get_current_active_admin
from app.models.models import Group, Trainer, User
from app.schemas.schemas import GroupCreate, GroupUpdate, GroupResponse

router = APIRouter(prefix="/api/groups", tags=["Groups"])

@router.get("/", response_model=List[GroupResponse])
async def get_groups(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    trainer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання списку груп"""
    query = db.query(Group)

    if is_active is not None:
        query = query.filter(Group.is_active == is_active)

    if trainer_id is not None:
        query = query.filter(Group.trainer_id == trainer_id)

    # Якщо тренер, показуємо тільки його групи
    if current_user.role == "trainer":
        trainer = db.query(User).filter(User.id == current_user.id).first()
        if trainer and trainer.trainer:
            query = query.filter(Group.trainer_id == trainer.trainer.id)

    groups = query.offset(skip).limit(limit).all()
    return groups

@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання інформації про групу"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Перевірка доступу для тренера
    if current_user.role == "trainer":
        trainer = db.query(User).filter(User.id == current_user.id).first()
        if trainer and trainer.trainer:
            if group.trainer_id != trainer.trainer.id:
                raise HTTPException(status_code=403, detail="Access denied")

    return group

@router.post("/", response_model=GroupResponse, status_code=201)
async def create_group(
    group: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Створення нової групи"""
    db_group = Group(**group.model_dump())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    group_update: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Оновлення групи"""
    db_group = db.query(Group).filter(Group.id == group_id).first()

    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Перевірка доступу для тренера
    if current_user.role == "trainer":
        trainer = db.query(User).filter(User.id == current_user.id).first()
        if trainer and trainer.trainer:
            if db_group.trainer_id != trainer.trainer.id:
                raise HTTPException(status_code=403, detail="Access denied")

    # Оновлення полів
    update_data = group_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_group, field, value)

    db.commit()
    db.refresh(db_group)
    return db_group

@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """Видалення групи (тільки для адміністратора)"""
    db_group = db.query(Group).filter(Group.id == group_id).first()

    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")

    db.delete(db_group)
    db.commit()
    return None
