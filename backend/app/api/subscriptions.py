from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api import auth
from app.models.models import Subscription, Student, PriceList, User

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

@router.get("/")
def get_subscriptions(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    subs = db.query(Subscription).all()
    result = []
    for sub in subs:
        student = db.query(Student).filter(Student.id == sub.student_id).first()
        item = db.query(PriceList).filter(PriceList.id == sub.pricelist_item_id).first()
        result.append({
            "id": sub.id,
            "student_id": sub.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Невідомо",
            "pricelist_item_id": sub.pricelist_item_id,
            "pricelist_item_name": item.name if item else "Видалено",
            "classes_remaining": sub.classes_remaining,
            "is_active": sub.is_active
        })
    return result

@router.get("/{sub_id}")
def get_subscription(sub_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub

@router.post("/")
def create_subscription(data: dict, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Тільки адміністратор може додавати абонементи"
        )
    new_sub = Subscription(
        student_id=data['student_id'],
        pricelist_item_id=data['pricelist_item_id'],
        classes_remaining=data['classes_remaining'],
        is_active=True
    )
    db.add(new_sub)
    db.commit()
    return {"status": "ok"}

@router.put("/{sub_id}")
def update_subscription(sub_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Тільки адмін")
    
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")

    sub.student_id = data.get('student_id', sub.student_id)
    sub.pricelist_item_id = data.get('pricelist_item_id', sub.pricelist_item_id)
    sub.classes_remaining = data.get('classes_remaining', sub.classes_remaining)
    
    db.commit()
    return {"status": "updated"}

@router.get("/pricelist_subscriptions/")
def get_pricelist_subs(db: Session = Depends(get_db)):
    # Фільтруємо прайс-лист за категорією 'subscription'
    return db.query(PriceList).filter(PriceList.category == "subscription", PriceList.is_active == True).all()

@router.get("/students_for_dropdown/")
def get_students_dropdown(db: Session = Depends(get_db)):
    return db.query(Student).filter(Student.is_active == True).all()

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