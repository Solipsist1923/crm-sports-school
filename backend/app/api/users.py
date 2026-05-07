from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.models import User, Trainer
from app.schemas.schemas import UserCreate, UserResponse, TrainerCreate
from app.api.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=dict)
async def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Отримати список всіх користувачів (тільки для адміністратора)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ заборонено"
        )

    users = db.query(User).all()

    users_list = []
    for user in users:
        users_list.append({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None
        })

    return {"users": users_list}

from pydantic import BaseModel
from typing import Optional

class TrainerData(BaseModel):
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    phone: Optional[str] = ""
    specialization: Optional[str] = ""

class UserCreateRequest(BaseModel):
    username: str
    full_name: str
    role: str
    password: str
    is_active: bool = True
    trainer_data: Optional[TrainerData] = None

@router.post("", response_model=dict)
async def create_user(
    user_data: UserCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Створити нового користувача (тільки для адміністратора)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ заборонено"
        )

    # Перевірка чи існує користувач з таким логіном
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Користувач з таким логіном вже існує"
        )

    # Перевірка довжини пароля
    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароль повинен містити мінімум 6 символів"
        )

    # Створення користувача
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        role=user_data.role,
        password_hash=hashed_password,
        is_active=user_data.is_active,
        created_at=datetime.utcnow()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Якщо роль тренер, створюємо профіль тренера
    if user_data.role == "trainer" and user_data.trainer_data:
        trainer = Trainer(
            user_id=new_user.id,
            first_name=user_data.trainer_data.first_name,
            last_name=user_data.trainer_data.last_name,
            phone=user_data.trainer_data.phone,
            specialization=user_data.trainer_data.specialization
        )
        db.add(trainer)
        db.commit()

    return {
        "message": "Користувача успішно створено",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "full_name": new_user.full_name,
            "role": new_user.role
        }
    }

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Видалити користувача (тільки для адміністратора)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ заборонено"
        )

    # Не дозволяємо видалити самого себе
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ви не можете видалити свій власний обліковий запис"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Користувача не знайдено"
        )

    # Якщо це тренер, спочатку видаляємо профіль тренера
    if user.role == "trainer":
        trainer = db.query(Trainer).filter(Trainer.user_id == user_id).first()
        if trainer:
            db.delete(trainer)

    db.delete(user)
    db.commit()

    return {"message": "Користувача успішно видалено"}
