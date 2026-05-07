from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date, timedelta

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import Student, Attendance, Payment, Subscription, Insurance, User
from app.schemas.schemas import DashboardStats, AttendanceStats

router = APIRouter(prefix="/api/stats", tags=["Statistics"])

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання статистики для дашборду"""
    today = date.today()

    # Базовий запит для учнів
    students_query = db.query(Student)

    # Якщо тренер, показуємо тільки його учнів
    if current_user.role == "trainer" and current_user.trainer:
        students_query = students_query.filter(Student.trainer_id == current_user.trainer.id)

    # Загальна кількість учнів
    total_students = students_query.count()

    # Активні учні
    active_students = students_query.filter(Student.is_active == True).count()

    # Кількість груп (тільки для адміна)
    from app.models.models import Group
    if current_user.role == "admin":
        total_groups = db.query(Group).filter(Group.is_active == True).count()
    else:
        total_groups = db.query(Group).filter(
            Group.trainer_id == current_user.trainer.id,
            Group.is_active == True
        ).count()

    # Відвідування сьогодні
    attendance_query = db.query(Attendance).filter(Attendance.date == today)
    if current_user.role == "trainer" and current_user.trainer:
        attendance_query = attendance_query.join(Student).filter(
            Student.trainer_id == current_user.trainer.id
        )
    today_attendance = attendance_query.filter(Attendance.status == "present").count()

    # Учні з боргами
    debts_query = db.query(Payment).filter(
        Payment.next_payment_date < today,
        Payment.status != "paid"
    )
    if current_user.role == "trainer" and current_user.trainer:
        debts_query = debts_query.join(Student).filter(
            Student.trainer_id == current_user.trainer.id
        )
    students_with_debts = debts_query.distinct(Payment.student_id).count()

    # Абонементи, що закінчуються (менше 3 занять або закінчуються через 7 днів)
    week_later = today + timedelta(days=7)
    expiring_subs_query = db.query(Subscription).filter(
        Subscription.is_active == True,
        (Subscription.remaining_classes <= 3) | (Subscription.end_date <= week_later)
    )
    if current_user.role == "trainer" and current_user.trainer:
        expiring_subs_query = expiring_subs_query.join(Student).filter(
            Student.trainer_id == current_user.trainer.id
        )
    expiring_subscriptions = expiring_subs_query.count()

    # Страховки, що закінчуються (через 14 днів)
    two_weeks_later = today + timedelta(days=14)
    expiring_ins_query = db.query(Insurance).filter(
        Insurance.is_active == True,
        Insurance.end_date <= two_weeks_later
    )
    if current_user.role == "trainer" and current_user.trainer:
        expiring_ins_query = expiring_ins_query.join(Student).filter(
            Student.trainer_id == current_user.trainer.id
        )
    expiring_insurance = expiring_ins_query.count()

    return DashboardStats(
        total_students=total_students,
        active_students=active_students,
        total_groups=total_groups,
        today_attendance=today_attendance,
        students_with_debts=students_with_debts,
        expiring_subscriptions=expiring_subscriptions,
        expiring_insurance=expiring_insurance
    )

@router.get("/attendance", response_model=List[AttendanceStats])
async def get_attendance_stats(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання статистики відвідувань по учнях"""
    query = db.query(
        Student.id.label("student_id"),
        Student.first_name,
        Student.last_name,
        func.count(func.case((Attendance.status == "present", 1))).label("total_present"),
        func.count(func.case((Attendance.status == "absent", 1))).label("total_absent"),
        func.count(func.case((Attendance.status == "sick", 1))).label("total_sick"),
        func.count(Attendance.id).label("total_classes"),
        (func.count(func.case((Attendance.status == "present", 1))) * 100.0 /
         func.nullif(func.count(Attendance.id), 0)).label("attendance_rate")
    ).outerjoin(Attendance, Student.id == Attendance.student_id)\
     .filter(Student.is_active == True)\
     .group_by(Student.id, Student.first_name, Student.last_name)

    # Якщо тренер, показуємо тільки його учнів
    if current_user.role == "trainer" and current_user.trainer:
        query = query.filter(Student.trainer_id == current_user.trainer.id)

    stats = query.order_by(func.count(Attendance.id).desc()).limit(limit).all()

    return [
        AttendanceStats(
            student_id=s.student_id,
            first_name=s.first_name,
            last_name=s.last_name,
            total_present=s.total_present or 0,
            total_absent=s.total_absent or 0,
            total_sick=s.total_sick or 0,
            total_classes=s.total_classes or 0,
            attendance_rate=round(s.attendance_rate or 0, 2)
        )
        for s in stats
    ]
