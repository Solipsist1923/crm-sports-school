from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import date

from app.core.database import get_db
from app.api.auth import get_current_user, get_current_active_admin
from app.models.models import Payment, Student, User, Group, Trainer
from app.schemas.schemas import PaymentCreate, PaymentUpdate, PaymentResponse

router = APIRouter(prefix="/api/payments", tags=["Payments"])

@router.get("/", response_model=List[PaymentResponse])
async def get_payments(
    skip: int = 0,
    limit: int = 100,
    student_id: int = None,
    payment_type: str = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання списку оплат"""
    query = db.query(Payment)

    if student_id:
        query = query.filter(Payment.student_id == student_id)

    if payment_type:
        query = query.filter(Payment.payment_type == payment_type)

    if status:
        query = query.filter(Payment.status == status)

    # Якщо тренер, показуємо тільки його учнів
    if current_user.role == "trainer":
        trainer_profile = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if trainer_profile:
            query = query.join(Student).filter(Student.trainer_id == trainer_profile.id)

    payments = query.order_by(Payment.payment_date.desc()).offset(skip).limit(limit).all()
    return payments

@router.get("/overdue", response_model=List[PaymentResponse])
async def get_overdue_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання прострочених оплат"""
    today = date.today()
    query = db.query(Payment).filter(
        Payment.next_payment_date < today,
        Payment.status != "paid"
    )

    # Якщо тренер, показуємо тільки його учнів
    if current_user.role == "trainer":
        trainer_profile = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if trainer_profile:
            query = query.join(Student).filter(Student.trainer_id == trainer_profile.id)

    payments = query.order_by(Payment.next_payment_date).all()
    return payments

@router.get("/student/{student_id}", response_model=List[PaymentResponse])
async def get_student_payments(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання історії оплат учня"""
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Перевірка доступу для тренера
    if current_user.role == "trainer" and current_user.trainer:
        trainer_id = current_user.trainer.id
        is_own_student = db.query(Student).filter(
            Student.id == student_id,
            or_(
                Student.trainer_id == trainer_id,
                Student.group.has(Group.trainer_id == trainer_id)
            )
        ).first()
        if not is_own_student:
            raise HTTPException(status_code=403, detail="Ви можете додавати оплату тільки своїм учням")

    payments = db.query(Payment)\
        .filter(Payment.student_id == student_id)\
        .order_by(Payment.payment_date.desc())\
        .all()

    return payments

@router.post("/", response_model=PaymentResponse, status_code=201)
async def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Створення нової оплати"""
    # Перевірка, чи існує учень
    student = db.query(Student).filter(Student.id == payment.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    # Перевірка доступу для тренера
    if current_user.role == "trainer" and current_user.trainer:
        trainer_id = current_user.trainer.id
        is_own_student = db.query(Student).filter(
            Student.id == payment.student_id,
            or_(
                Student.trainer_id == trainer_id,
                Student.group.has(Group.trainer_id == trainer_id)
            )
        ).first()
        if not is_own_student:
            raise HTTPException(status_code=403, detail="Ви можете додавати оплату тільки своїм учням")

    db_payment = Payment(
        **payment.model_dump(),
        created_by=current_user.id
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: int,
    payment_update: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Оновлення оплати"""
    db_payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Перевірка доступу для тренера
    if current_user.role == "trainer":
        student = db.query(Student).filter(Student.id == db_payment.student_id).first()
        trainer_profile = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if trainer_profile and student.trainer_id != trainer_profile.id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Оновлення полів
    update_data = payment_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_payment, field, value)

    db.commit()
    db.refresh(db_payment)
    return db_payment

@router.delete("/{payment_id}", status_code=204)
async def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """Видалення оплати (тільки для адміністратора)"""
    db_payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    db.delete(db_payment)
    db.commit()
    return None
