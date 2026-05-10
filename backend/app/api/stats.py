from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, case, or_
from typing import List
from datetime import date, timedelta

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import Student, Attendance, Payment, Subscription, Insurance, User, Group
from app.schemas.schemas import DashboardStats, AttendanceStats

router = APIRouter(prefix="/api/stats", tags=["Statistics"])

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання статистики для дашборду"""
    today = date.today()
    total_students = 0
    active_students = 0
    total_groups = 0
    today_attendance = 0
    students_with_debts = 0
    expiring_subscriptions = 0
    expired_insurance = 0
    expiring_insurance = 0

    try:
        total_students = db.query(Student).count()
        active_students = db.query(Student).filter(Student.is_active == True).count()
        total_groups = db.query(Group).filter(Group.is_active == True).count()
        today_attendance = db.query(Attendance).filter(
            Attendance.date == today, 
            Attendance.status == "present"
        ).count()

        try:
            students_with_debts = db.query(func.count(distinct(Payment.student_id))).filter(
                Payment.next_payment_date < today,
                Payment.status != "paid"
            ).scalar() or 0
        except Exception: pass

        try:
            week_later = today + timedelta(days=7)
            expiring_subscriptions = db.query(Subscription).filter(
                Subscription.is_active == True,
                (Subscription.remaining_classes <= 3) | (Subscription.end_date <= week_later)
            ).count()
        except Exception: pass

        expired_insurance = db.query(Student).filter(
            Student.is_active == True,
            or_(
                Student.insurance_end == None,
                Student.insurance_end < today
            )
        ).count()

        month_later = today + timedelta(days=30)
        expiring_insurance = db.query(Student).filter(
            Student.is_active == True,
            Student.insurance_end >= today,
            Student.insurance_end <= month_later
        ).count()
    except Exception as e:
        print(f"RESILIENCE LOG: Dashboard partial fail: {e}")

    return DashboardStats(
        total_students=total_students,
        active_students=active_students,
        total_groups=total_groups,
        today_attendance=today_attendance,
        students_with_debts=students_with_debts,
        expiring_subscriptions=expiring_subscriptions,
        expiring_insurance=expiring_insurance,
        expired_insurance=expired_insurance
    )

@router.get("/attendance", response_model=List[AttendanceStats])
async def get_attendance_stats(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання статистики відвідувань по учнях"""
    try:
        query = db.query(
            Student.id.label("student_id"),
            Student.first_name,
            Student.last_name,
            func.coalesce(func.sum(case((Attendance.status == "present", 1), else_=0)), 0).label("total_present"),
            func.coalesce(func.sum(case((Attendance.status == "absent", 1), else_=0)), 0).label("total_absent"),
            func.coalesce(func.sum(case((Attendance.status == "sick", 1), else_=0)), 0).label("total_sick"),
            func.coalesce(func.count(Attendance.id), 0).label("total_classes")
        ).outerjoin(Attendance, Student.id == Attendance.student_id)\
         .filter(Student.is_active == True)\
         .group_by(Student.id, Student.first_name, Student.last_name)

        stats = query.order_by(func.count(Attendance.id).desc()).limit(limit).all()

        result = []
        for s in stats:
            total_classes = int(s.total_classes) if s.total_classes else 0
            total_present = int(s.total_present) if s.total_present else 0
            attendance_rate = round((total_present * 100.0 / total_classes), 2) if total_classes > 0 else 0.0

            result.append(AttendanceStats(
                student_id=s.student_id,
                first_name=s.first_name,
                last_name=s.last_name,
                total_present=total_present,
                total_absent=int(s.total_absent) if s.total_absent else 0,
                total_sick=int(s.total_sick) if s.total_sick else 0,
                total_classes=total_classes,
                attendance_rate=attendance_rate
            ))

        return result
    except Exception as e:
        print(f"Error in get_attendance_stats: {e}")
        return []
