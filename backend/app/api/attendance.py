from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List
from datetime import date, timedelta

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import Attendance, Student, Subscription, User
from app.schemas.schemas import AttendanceCreate, AttendanceUpdate, AttendanceResponse

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

@router.get("/", response_model=List[AttendanceResponse])
async def get_attendance(
    skip: int = 0,
    limit: int = 100,
    student_id: int = None,
    date_from: date = None,
    date_to: date = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання списку відвідувань"""
    query = db.query(Attendance)

    if student_id:
        query = query.filter(Attendance.student_id == student_id)

    if date_from:
        query = query.filter(Attendance.date >= date_from)

    if date_to:
        query = query.filter(Attendance.date <= date_to)

    # Якщо тренер, показуємо тільки його учнів
    if current_user.role == "trainer":
        trainer = db.query(User).filter(User.id == current_user.id).first()
        if trainer and trainer.trainer:
            query = query.join(Student).filter(Student.trainer_id == trainer.trainer.id)

    attendance = query.order_by(Attendance.date.desc()).offset(skip).limit(limit).all()
    return attendance

@router.get("/date/{attendance_date}", response_model=List[AttendanceResponse])
async def get_attendance_by_date(
    attendance_date: date,
    group_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання відвідувань за конкретну дату"""
    query = db.query(Attendance).filter(Attendance.date == attendance_date)

    if group_id:
        query = query.join(Student).filter(Student.group_id == group_id)

    # Якщо тренер, показуємо тільки його учнів
    if current_user.role == "trainer":
        trainer = db.query(User).filter(User.id == current_user.id).first()
        if trainer and trainer.trainer:
            query = query.join(Student).filter(Student.trainer_id == trainer.trainer.id)

    attendance = query.all()
    return attendance

@router.get("/student/{student_id}", response_model=List[AttendanceResponse])
async def get_student_attendance(
    student_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання історії відвідувань учня"""
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Перевірка доступу для тренера
    if current_user.role == "trainer" and current_user.trainer:
        trainer_id = current_user.trainer.id
        is_own_student = db.query(Student).filter(
            Student.id == attendance.student_id,
            or_(
                Student.trainer_id == trainer_id,
                Student.group.has(Group.trainer_id == trainer_id)
            )
        ).first()
        if not is_own_student:
            raise HTTPException(status_code=403, detail="Ви можете відмічати тільки своїх учнів")

    attendance = db.query(Attendance)\
        .filter(Attendance.student_id == student_id)\
        .order_by(Attendance.date.desc())\
        .limit(limit)\
        .all()

    return attendance

@router.post("/", response_model=AttendanceResponse, status_code=201)
async def mark_attendance(
    attendance: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Відмітка відвідування"""
    # Перевірка, чи існує учень
    student = db.query(Student).filter(Student.id == attendance.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Перевірка доступу для тренера
    if current_user.role == "trainer":
        trainer = db.query(User).filter(User.id == current_user.id).first()
        if trainer and trainer.trainer:
            if student.trainer_id != trainer.trainer.id:
                raise HTTPException(status_code=403, detail="Access denied")

    # Перевірка, чи вже є відмітка на цю дату
    existing = db.query(Attendance).filter(
        Attendance.student_id == attendance.student_id,
        Attendance.date == attendance.date
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for this date")

    # Створення відмітки
    db_attendance = Attendance(
        **attendance.model_dump(),
        marked_by=current_user.id
    )
    db.add(db_attendance)

    # Якщо учень присутній, списуємо заняття з абонемента
    if attendance.status == "present":
        active_subscription = db.query(Subscription).filter(
            Subscription.student_id == attendance.student_id,
            Subscription.is_active == True,
            Subscription.remaining_classes > 0
        ).first()

        if active_subscription:
            active_subscription.remaining_classes -= 1
            if active_subscription.remaining_classes == 0:
                active_subscription.is_active = False

    db.commit()
    db.refresh(db_attendance)
    return db_attendance

@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: int,
    attendance_update: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Оновлення відмітки відвідування"""
    db_attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()

    if not db_attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")

    # Перевірка доступу для тренера
    student = db.query(Student).filter(Student.id == db_attendance.student_id).first()
    trainer = db.query(User).filter(User.id == current_user.id).first()
    if trainer and trainer.trainer:
        if student.trainer_id != trainer.trainer.id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Оновлення полів
    update_data = attendance_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_attendance, field, value)

    db.commit()
    db.refresh(db_attendance)
    return db_attendance

@router.delete("/{attendance_id}", status_code=204)
async def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Видалення відмітки відвідування"""
    db_attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()

    if not db_attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")

    # Перевірка доступу для тренера
    student = db.query(Student).filter(Student.id == db_attendance.student_id).first()
    trainer = db.query(User).filter(User.id == current_user.id).first()
    if trainer and trainer.trainer:
        if student.trainer_id != trainer.trainer.id:
            raise HTTPException(status_code=403, detail="Access denied")

    db.delete(db_attendance)
    db.commit()
    return None
