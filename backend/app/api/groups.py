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
        if not current_user.trainer:
            return []
        
        query = query.filter(Group.trainer_id == current_user.trainer.id)

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
        trainer_profile = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if trainer_profile:
            if group.trainer_id != trainer_profile.id:
                raise HTTPException(status_code=403, detail="Access denied")

    return group

@router.post("/", response_model=GroupResponse, status_code=201)
async def create_group(
    group: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Створення нової групи"""
    group_data = group.model_dump()
    
    # Якщо створює тренер, автоматично призначаємо його
    if current_user.role == "trainer" and current_user.trainer:
        group_data["trainer_id"] = current_user.trainer.id
        
    db_group = Group(**group_data)
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
        trainer_profile = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if trainer_profile:
            if db_group.trainer_id != trainer_profile.id:
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
    current_user: User = Depends(get_current_user)
):
    """Видалення групи"""
    db_group = db.query(Group).filter(Group.id == group_id).first()

    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Перевірка прав: адмін або власник групи (тренер)
    if current_user.role == "trainer":
        if not current_user.trainer or db_group.trainer_id != current_user.trainer.id:
            raise HTTPException(status_code=403, detail="Ви можете видаляти тільки свої групи")
    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Доступ заборонено")

    db.delete(db_group)
    db.commit()
    return None
