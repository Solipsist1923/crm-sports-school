"""
Скрипт для видалення тестових даних
"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.models import User, Trainer, Group

def remove_test_data():
    """Видалення тестових даних"""
    db = SessionLocal()

    try:
        # Видалення тестового тренера
        trainer_user = db.query(User).filter(User.username == "trainer1").first()
        if trainer_user:
            print(f"Found trainer user: {trainer_user.username}")

            # Видалення профілю тренера
            if trainer_user.trainer:
                trainer = trainer_user.trainer
                print(f"Found trainer profile: {trainer.first_name} {trainer.last_name}")

                # Видалення груп тренера
                groups = db.query(Group).filter(Group.trainer_id == trainer.id).all()
                for group in groups:
                    print(f"Deleting group: {group.name}")
                    db.delete(group)

                # Видалення профілю тренера
                db.delete(trainer)

            # Видалення користувача
            db.delete(trainer_user)
            db.commit()
            print("Test trainer and related data removed successfully!")
        else:
            print("Test trainer not found")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    remove_test_data()
