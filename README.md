# CRM для спортивної школи

Система управління учнями спортивної школи (акробатика/гімнастика) з контролем відвідувань, оплат, абонементів та страховок.

## Структура проєкту

```
First/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Конфігурація, БД, безпека
│   │   ├── models/   # SQLAlchemy моделі
│   │   └── schemas/  # Pydantic схеми
│   ├── main.py
│   ├── init_db.py
│   └── requirements.txt
├── frontend/          # HTML/CSS/JS frontend
│   ├── pages/        # HTML сторінки
│   ├── css/          # Стилі
│   └── js/           # JavaScript
├── DATABASE_SCHEMA.sql
├── TECHNICAL_PLAN.md
└── Требования.txt
```

## Швидкий старт

### Backend

1. Перейдіть в папку backend:
```bash
cd backend
```

2. Встановіть залежності:
```bash
pip install -r requirements.txt
```

3. Запустіть сервер (Windows):
```bash
start.bat
```

Або вручну:
```bash
python init_db.py
uvicorn main:app --reload
```

Backend буде доступний на http://localhost:8000
API документація: http://localhost:8000/docs

### Frontend

1. Відкрийте `frontend/pages/login.html` у браузері

Або запустіть локальний сервер:
```bash
cd frontend
python -m http.server 8080
```

Відкрийте http://localhost:8080/pages/login.html

## Тестові облікові записи

- **Адміністратор**: 
  - Логін: `admin`
  - Пароль: `admin123`

- **Тренер**:
  - Логін: `trainer1`
  - Пароль: `trainer123`

## Основні функції

✅ **Реалізовано:**
- Аутентифікація (JWT)
- Дашборд зі статистикою
- API для учнів
- API для відвідувань
- API для оплат
- API для статистики
- Розділення прав доступу (admin/trainer)

🚧 **В розробці:**
- Сторінки управління учнями
- Сторінки відміток відвідувань
- Сторінки оплат
- Система сповіщень (Telegram)
- Експорт даних

## Технології

**Backend:**
- FastAPI
- SQLAlchemy
- SQLite (можна змінити на PostgreSQL)
- JWT аутентифікація
- Pydantic валідація

**Frontend:**
- HTML5/CSS3
- Vanilla JavaScript
- Font Awesome іконки
- Адаптивний дизайн

## Документація

- [Технічний план](TECHNICAL_PLAN.md)
- [Схема бази даних](DATABASE_SCHEMA.sql)
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)

## Статус розробки

**Етап 1: Backend API** ✅ Завершено
- Моделі БД
- API endpoints
- Аутентифікація
- Статистика

**Етап 2: Frontend** 🚧 В процесі
- ✅ Сторінка входу
- ✅ Дашборд
- ⏳ Управління учнями
- ⏳ Відвідування
- ⏳ Оплати

**Етап 3: Інтеграції** ⏳ Заплановано
- Telegram Bot для сповіщень
- Експорт даних
- Email сповіщення

## Наступні кроки

1. Завершити frontend сторінки (учні, відвідування, оплати)
2. Додати модальні вікна для CRUD операцій
3. Реалізувати Telegram Bot для сповіщень
4. Додати експорт даних (Excel/PDF)
5. Тестування та виправлення багів
6. Деплой на сервер

## Контакт

Для питань та пропозицій звертайтеся до розробника.
