from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import User, Trainer

def cleanup_users():
    """Видалення зайвих тренерів, залишаємо тільки admin і kovalenko"""
    db = SessionLocal()

    try:
        # Видаляємо trainer1
        trainer1_user = db.query(User).filter(User.username == "trainer1").first()
        if trainer1_user:
            # Спочатку видаляємо профіль тренера
            trainer1_profile = db.query(Trainer).filter(Trainer.user_id == trainer1_user.id).first()
            if trainer1_profile:
                db.delete(trainer1_profile)
            # Потім видаляємо користувача
            db.delete(trainer1_user)
            db.commit()
            print("Trainer1 видалено")
        else:
            print("Trainer1 не знайдено")

        # Показуємо залишених користувачів
        users = db.query(User).all()
        print("\nЗалишені користувачі:")
        for user in users:
            print(f"- {user.username} ({user.full_name}) - {user.role}")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_users()
