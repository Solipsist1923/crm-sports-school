from app.core.database import SessionLocal, engine
from sqlalchemy import text

def migrate_attendance_columns():
    """Додає колонки payment_choice та is_paid до таблиці attendance, якщо їх немає"""
    db = SessionLocal()

    try:
        if "postgresql" in str(engine.url):
            result = db.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='attendance' AND column_name='payment_choice'"
            ))
            exists = result.fetchone() is not None
        else:
            result = db.execute(text("PRAGMA table_info(attendance)"))
            columns = [row[1] for row in result.fetchall()]
            exists = 'payment_choice' in columns

        if not exists:
            print("Adding payment_choice column to attendance...")
            db.execute(text("ALTER TABLE attendance ADD COLUMN payment_choice VARCHAR(50)"))
            db.commit()
            print("Column payment_choice added!")
        else:
            print("Column payment_choice already exists")

        if "postgresql" in str(engine.url):
            result = db.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='attendance' AND column_name='is_paid'"
            ))
            exists = result.fetchone() is not None
        else:
            result = db.execute(text("PRAGMA table_info(attendance)"))
            columns = [row[1] for row in result.fetchall()]
            exists = 'is_paid' in columns

        if not exists:
            print("Adding is_paid column to attendance...")
            db.execute(text("ALTER TABLE attendance ADD COLUMN is_paid BOOLEAN DEFAULT 0"))
            db.commit()
            print("Column is_paid added!")
        else:
            print("Column is_paid already exists")

    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_attendance_columns()
