from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.api import auth
from app.models.models import Subscription, Student, PriceList, User, Group, Trainer
from app.schemas.schemas import SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse
from sqlalchemy import or_

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])

@router.get("/", response_model=List[dict])
def get_subscriptions(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """Отримання списку абонементів (оптимізовано через Join)"""
    query = db.query(
        Subscription.id,
        Subscription.student_id,
        Subscription.pricelist_item_id,
        Subscription.classes_remaining,
        Subscription.is_active,
        (Student.first_name + " " + Student.last_name).label("student_name"),
        PriceList.name.label("pricelist_item_name")
    ).join(Student, Subscription.student_id == Student.id)\
     .outerjoin(PriceList, Subscription.pricelist_item_id == PriceList.id)

    # Якщо тренер, показуємо тільки абонементи його учнів
    if current_user.role == "trainer" and current_user.trainer:
        trainer_id = current_user.trainer.id
        query = query.filter(
            or_(
                Student.trainer_id == trainer_id,
                Student.group.has(Group.trainer_id == trainer_id)
            )
        )

    results = query.all()
    return [dict(r._mapping) for r in results]

@router.get("/{sub_id}", response_model=SubscriptionResponse)
def get_subscription(sub_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """Отримання інформації про конкретний абонемент"""
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    # Перевірка доступу для тренера
    if current_user.role == "trainer" and current_user.trainer:
        trainer_id = current_user.trainer.id
        is_own_student = db.query(Student).filter(
            Student.id == sub.student_id,
            or_(
                Student.trainer_id == trainer_id,
                Student.group.has(Group.trainer_id == trainer_id)
            )
        ).first()
        if not is_own_student:
            raise HTTPException(status_code=403, detail="Ви не маєте доступу до цього абонемента")

    return sub

@router.post("/")
def create_subscription(subscription: SubscriptionCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """Створення абонемента (тільки адмін)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Тільки адміністратор може додавати абонементи"
        )
    new_sub = Subscription(**subscription.model_dump(), is_active=True)
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub

@router.put("/{sub_id}")
def update_subscription(sub_id: int, sub_update: SubscriptionUpdate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """Оновлення абонемента (тільки адмін)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Тільки адмін")
    
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = sub_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sub, field, value)
    
    db.commit()
    db.refresh(sub)
    return sub

@router.get("/pricelist_subscriptions/")
def get_pricelist_subs(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """Список послуг категорії абонемент"""
    return db.query(PriceList).filter(PriceList.category == "subscription", PriceList.is_active == True).all()

@router.get("/students_for_dropdown/")
def get_students_dropdown(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """Список учнів для вибору (з фільтрацією для тренерів)"""
    query = db.query(Student).filter(Student.is_active == True)
    if current_user.role == "trainer" and current_user.trainer:
        trainer_id = current_user.trainer.id
        query = query.filter(
            or_(
                Student.trainer_id == trainer_id,
                Student.group.has(Group.trainer_id == trainer_id)
            )
        )
    return query.all()

@router.delete("/{sub_id}")
def delete_subscription(sub_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Тільки адміністратор може видаляти абонементи"
        )
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(sub)
    db.commit()
    return {"status": "deleted"}