from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import date, timedelta

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import Student, User, Trainer, Group
from app.schemas.schemas import StudentCreate, StudentUpdate, StudentResponse

router = APIRouter(prefix="/api/students", tags=["Students"])

@router.get("/", response_model=List[StudentResponse])
async def get_students(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    group_id: Optional[int] = None,
    trainer_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    insurance_expiring: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання списку учнів з фільтрами"""
    query = db.query(Student)

    # Фільтр за пошуком (ім'я або прізвище)
    if search:
        query = query.filter(
            or_(
                Student.first_name.ilike(f"%{search}%"),
                Student.last_name.ilike(f"%{search}%")
            )
        )

    # Фільтр за групою
    if group_id is not None:
        query = query.filter(Student.group_id == group_id)

    # Фільтр за тренером
    if trainer_id is not None:
        query = query.filter(Student.trainer_id == trainer_id)

    # Фільтр за активністю
    if is_active is not None:
        query = query.filter(Student.is_active == is_active)

    # Фільтр за страховкою, що закінчується протягом найближчих 14 днів
    if insurance_expiring:
        today = date.today()
        month_later = today + timedelta(days=30)
        query = query.filter(
            Student.insurance_end >= today,
            Student.insurance_end <= month_later
        )

    # Якщо користувач тренер, показуємо тільки його учнів
    if current_user.role == "trainer":
        trainer_profile = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if trainer_profile:
            query = query.filter(Student.trainer_id == trainer_profile.id)
        else:
            return []

    students = query.offset(skip).limit(limit).all()
    return students

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримання інформації про конкретного учня"""
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Перевірка доступу для тренера
    if current_user.role == "trainer":
        trainer_profile = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if not trainer_profile or student.trainer_id != trainer_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Доступ заборонено до цього учня"
            )

    return student

@router.post("/", response_model=StudentResponse, status_code=201)
async def create_student(
    student: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Створення нового учня"""
    try:
        student_data = student.model_dump()
        
        # Автоматично підтягуємо тренера з обраної групи
        if student_data.get("group_id"):
            group = db.query(Group).filter(Group.id == student_data["group_id"]).first()
            if group:
                student_data["trainer_id"] = group.trainer_id

        db_student = Student(**student_data)
        db.add(db_student)
        db.commit()
        db.refresh(db_student)
        return db_student
    except Exception as e:
        db.rollback()
        print(f"Error creating student: {e}")
        raise HTTPException(status_code=400, detail=f"Помилка збереження даних: {str(e)}")

@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    student_update: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Оновлення інформації про учня"""
    db_student = db.query(Student).filter(Student.id == student_id).first()

    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Перевірка доступу для тренера
    if current_user.role == "trainer":
        trainer_profile = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if not trainer_profile or db_student.trainer_id != trainer_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Ви не можете редагувати цього учня"
            )

    # Оновлення полів
    update_data = student_update.model_dump(exclude_unset=True)
    
    # Якщо змінюється група, автоматично оновлюємо тренера
    if "group_id" in update_data:
        group_id = update_data["group_id"]
        if group_id:
            group = db.query(Group).filter(Group.id == group_id).first()
            update_data["trainer_id"] = group.trainer_id if group else None
        else:
            update_data["trainer_id"] = None

    for field, value in update_data.items():
        setattr(db_student, field, value)

    db.commit()
    db.refresh(db_student)
    return db_student

@router.delete("/{student_id}", status_code=204)
async def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Видалення учня (тільки для адміністратора)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete students")

    db_student = db.query(Student).filter(Student.id == student_id).first()

    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    db.delete(db_student)
    db.commit()
    return None
