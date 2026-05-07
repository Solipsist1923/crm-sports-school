from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import User, Trainer, Group

def init_db():
    """Ініціалізація бази даних з тестовими даними"""
    # Створення всіх таблиць
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

    db = SessionLocal()

    try:
        # Перевірка, чи вже є користувачі
        existing_user = db.query(User).first()
        if existing_user:
            print("Database already initialized with test data")
            return

        # Створення адміністратора
        admin = User(
            username="admin",
            password_hash=get_password_hash("admin123"),
            role="admin",
            full_name="Адміністратор",
            is_active=True
        )
        db.add(admin)

        # Створення тренера
        trainer_user = User(
            username="trainer1",
            password_hash=get_password_hash("trainer123"),
            role="trainer",
            full_name="Іван Петренко",
            is_active=True
        )
        db.add(trainer_user)
        db.flush()

        # Створення профілю тренера
        trainer = Trainer(
            user_id=trainer_user.id,
            first_name="Іван",
            last_name="Петренко",
            phone="+380501234567",
            specialization="Акробатика"
        )
        db.add(trainer)
        db.flush()

        # Створення груп
        group1 = Group(
            name="Початківці 6-8 років",
            schedule="Понеділок, Середа, П'ятниця 16:00-17:30",
            trainer_id=trainer.id,
            max_students=12,
            is_active=True
        )
        db.add(group1)

        group2 = Group(
            name="Середній рівень 9-12 років",
            schedule="Вівторок, Четвер 17:00-18:30",
            trainer_id=trainer.id,
            max_students=15,
            is_active=True
        )
        db.add(group2)

        db.commit()
        print("Database initialized successfully!")
        print("\nTest credentials:")
        print("Admin: username='admin', password='admin123'")
        print("Trainer: username='trainer1', password='trainer123'")

    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
