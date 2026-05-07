from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import Student, User
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

    # Якщо користувач тренер, показуємо тільки його учнів
    if current_user.role == "trainer":
        trainer = db.query(User).filter(User.id == current_user.id).first()
        if trainer and trainer.trainer:
            query = query.filter(Student.trainer_id == trainer.trainer.id)

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
        trainer = db.query(User).filter(User.id == current_user.id).first()
        if trainer and trainer.trainer:
            if student.trainer_id != trainer.trainer.id:
                raise HTTPException(status_code=403, detail="Access denied")

    return student

@router.post("/", response_model=StudentResponse, status_code=201)
async def create_student(
    student: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Створення нового учня"""
    try:
        db_student = Student(**student.model_dump())
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
        trainer = db.query(User).filter(User.id == current_user.id).first()
        if trainer and trainer.trainer:
            if db_student.trainer_id != trainer.trainer.id:
                raise HTTPException(status_code=403, detail="Access denied")

    # Оновлення полів
    update_data = student_update.model_dump(exclude_unset=True)
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
