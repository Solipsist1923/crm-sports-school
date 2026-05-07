# CRM для спортивної школи - Backend

## Встановлення

1. Встановіть Python 3.9+
2. Встановіть залежності:
```bash
pip install -r requirements.txt
```

3. Створіть файл `.env` на основі `.env.example`:
```bash
cp .env.example .env
```

4. Ініціалізуйте базу даних:
```bash
python init_db.py
```

5. Запустіть сервер:
```bash
uvicorn main:app --reload
```

Або просто запустіть `start.bat` на Windows.

## Тестові облікові записи

Після ініціалізації БД доступні:

- **Адміністратор**: 
  - username: `admin`
  - password: `admin123`

- **Тренер**:
  - username: `trainer1`
  - password: `trainer123`

## API Документація

Після запуску сервера документація доступна за адресою:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Основні ендпоінти

### Аутентифікація
- `POST /api/auth/login` - Вхід в систему
- `GET /api/auth/me` - Інформація про поточного користувача

### Учні
- `GET /api/students` - Список учнів (з фільтрами)
- `GET /api/students/{id}` - Інформація про учня
- `POST /api/students` - Створити учня
- `PUT /api/students/{id}` - Оновити учня
- `DELETE /api/students/{id}` - Видалити учня (тільки admin)

### Відвідування
- `GET /api/attendance` - Список відвідувань
- `GET /api/attendance/date/{date}` - Відвідування за дату
- `GET /api/attendance/student/{id}` - Історія відвідувань учня
- `POST /api/attendance` - Відмітити відвідування
- `PUT /api/attendance/{id}` - Оновити відвідування
- `DELETE /api/attendance/{id}` - Видалити відвідування

### Оплати
- `GET /api/payments` - Список оплат
- `GET /api/payments/overdue` - Прострочені оплати
- `GET /api/payments/student/{id}` - Історія оплат учня
- `POST /api/payments` - Створити оплату
- `PUT /api/payments/{id}` - Оновити оплату
- `DELETE /api/payments/{id}` - Видалити оплату (тільки admin)

### Статистика
- `GET /api/stats/dashboard` - Статистика для дашборду
- `GET /api/stats/attendance` - Статистика відвідувань

## Структура проєкту

```
backend/
├── app/
│   ├── api/           # API endpoints
│   │   ├── auth.py
│   │   ├── students.py
│   │   ├── attendance.py
│   │   ├── payments.py
│   │   └── stats.py
│   ├── core/          # Конфігурація
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── models/        # SQLAlchemy моделі
│   │   └── models.py
│   └── schemas/       # Pydantic схеми
│       └── schemas.py
├── main.py           # FastAPI додаток
├── init_db.py        # Ініціалізація БД
├── requirements.txt  # Залежності
└── .env.example      # Приклад конфігурації
```

## Безпека

- Паролі хешуються за допомогою bcrypt
- JWT токени для аутентифікації
- Ролі: admin (повний доступ), trainer (доступ до своїх учнів)
- CORS налаштований для frontend

## База даних

За замовчуванням використовується SQLite (`crm.db`).
Для production рекомендується PostgreSQL.

Змініть `DATABASE_URL` в `.env`:
```
DATABASE_URL=postgresql://user:password@localhost/crm_db
```
