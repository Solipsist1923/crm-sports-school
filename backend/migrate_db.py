from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from sqlalchemy import text

def migrate_db():
    """Міграція бази даних: перейменування hashed_password на password_hash"""
    db = SessionLocal()

    try:
        # Перевірка чи існує колонка hashed_password
        result = db.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in result.fetchall()]

        if 'hashed_password' in columns and 'password_hash' not in columns:
            print("Migrating database: renaming hashed_password to password_hash...")

            # SQLite не підтримує ALTER COLUMN, тому створюємо нову таблицю
            db.execute(text("""
                CREATE TABLE users_new (
                    id INTEGER PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(20) NOT NULL,
                    full_name VARCHAR(100) NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP,
                    CONSTRAINT check_user_role CHECK (role IN ('admin', 'trainer'))
                )
            """))

            # Копіюємо дані
            db.execute(text("""
                INSERT INTO users_new (id, username, password_hash, role, full_name, is_active, created_at, updated_at)
                SELECT id, username, hashed_password, role, full_name, is_active, created_at, updated_at
                FROM users
            """))

            # Видаляємо стару таблицю
            db.execute(text("DROP TABLE users"))

            # Перейменовуємо нову таблицю
            db.execute(text("ALTER TABLE users_new RENAME TO users"))

            db.commit()
            print("Migration completed successfully!")
        else:
            print("Database already migrated or password_hash column exists")

    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_db()
