from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.models import User, Trainer

def add_trainer():
    """Додавання нового тренера"""
    db = SessionLocal()

    try:
        # Перевірка, чи вже є такий користувач
        existing = db.query(User).filter(User.username == "kovalenko").first()
        if existing:
            print("Trainer already exists")
            return

        # Створення користувача
        trainer_user = User(
            username="kovalenko",
            password_hash=get_password_hash("kovalenko123"),
            role="trainer",
            full_name="Коваленко Олександр Олексійович",
            is_active=True
        )
        db.add(trainer_user)
        db.flush()

        # Створення профілю тренера
        trainer = Trainer(
            user_id=trainer_user.id,
            first_name="Олександр",
            last_name="Коваленко",
            phone="+380501234568",
            specialization="Гімнастика"
        )
        db.add(trainer)

        db.commit()
        print("Trainer added successfully!")
        print("\nCredentials:")
        print("Username: kovalenko")
        print("Password: kovalenko123")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_trainer()
