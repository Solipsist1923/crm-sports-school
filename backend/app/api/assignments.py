from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import User, Assignment, Student, Group
from app.schemas.schemas import AssignmentCreate, AssignmentResponse

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])

@router.get("", response_model=List[AssignmentResponse])
async def get_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримати всі призначення (з авто-очищенням)"""
    # Авто-очищення: видаляємо все, що було більше тижня тому
    one_week_ago = date.today() - timedelta(days=7)
    db.query(Assignment).filter(Assignment.lesson_date < one_week_ago).delete()
    db.commit()

    query = db.query(Assignment)
    # Тренер бачить лише свої призначення
    if current_user.role == "trainer":
        if current_user.trainer:
            query = query.filter(Assignment.trainer_id == current_user.trainer.id)
    
    return query.order_by(Assignment.lesson_date.asc()).all()

@router.post("", response_model=AssignmentResponse, status_code=201)
async def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Створення призначення (тільки адмін)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Тільки адміністратор може створювати призначення")

    # Перевірка на минулу дату
    if data.lesson_date < date.today():
        raise HTTPException(status_code=400, detail="Не можна призначати заняття на минулу дату")

    try:
        db_assignment = Assignment(
            group_id=data.group_id,
            trainer_id=data.trainer_id,
            lesson_date=data.lesson_date,
        )
        db.add(db_assignment)
        db.flush()

        # Зберігаємо учнів та їх вибір оплати
        for item in data.students_data:
            stmt = assignment_students.insert().values(
                assignment_id=db_assignment.id,
                student_id=item.student_id,
                payment_choice=item.payment_choice
            )
            db.execute(stmt)
        
        db.commit()
        db.refresh(db_assignment)
        return db_assignment
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Помилка створення призначення: {str(e)}")

@router.delete("/{id}", status_code=204)
async def delete_assignment(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Немає прав")
    
    db_item = db.query(Assignment).filter(Assignment.id == id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
    return None