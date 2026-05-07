# CRM для спортивної школи - Технічний план

## Огляд проєкту
CRM-система для управління учнями спортивної школи (акробатика/гімнастика) з контролем відвідувань, оплат, абонементів та страховок.

## Технологічний стек

### Backend
- **Framework**: FastAPI (швидкий, сучасний, async, автодокументація)
- **База даних**: SQLite (для початку) / PostgreSQL (для production)
- **ORM**: SQLAlchemy
- **Аутентифікація**: JWT tokens
- **Сповіщення**: 
  - Telegram Bot API (для нагадувань)
  - Email (опціонально через SMTP)

### Frontend
- **Framework**: HTML/CSS/JavaScript (vanilla) або React (якщо потрібна складніша логіка)
- **UI**: Bootstrap 5 або Tailwind CSS
- **Адаптивність**: Mobile-first підхід
- **API клієнт**: Fetch API / Axios

### Deployment
- **Backend**: Можна розгорнути на VPS, Heroku, або Railway
- **Frontend**: Netlify, Vercel або разом з backend
- **База даних**: SQLite для локального, PostgreSQL для production

## Архітектура системи

```
┌─────────────────┐
│   Frontend      │
│  (Web Interface)│
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│   Backend API   │
│    (FastAPI)    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│Database│ │Telegram  │
│(SQLite)│ │Bot       │
└────────┘ └──────────┘
```

## Структура бази даних

### Таблиці:

1. **users** (користувачі системи - адміни/тренери)
   - id, username, password_hash, role, full_name, created_at

2. **students** (учні)
   - id, first_name, last_name, birth_date, phone_parent, telegram_parent
   - group_id, trainer_id, photo, notes, created_at, updated_at

3. **groups** (групи)
   - id, name, schedule, trainer_id, max_students, created_at

4. **trainers** (тренери)
   - id, user_id, first_name, last_name, phone, specialization

5. **attendance** (відвідування)
   - id, student_id, date, status (присутній/відсутній/хвороба), notes

6. **payments** (оплати)
   - id, student_id, amount, payment_date, next_payment_date
   - payment_type (абонемент/страховка/фонд), status, notes

7. **subscriptions** (абонементи)
   - id, student_id, total_classes, remaining_classes
   - start_date, end_date, is_active

8. **insurance** (страховки)
   - id, student_id, start_date, end_date, is_active, insurance_company

9. **fund_payments** (фонд/додаткові збори)
   - id, student_id, amount, purpose, payment_date, is_paid

10. **notifications** (сповіщення)
    - id, student_id, type, message, sent_date, is_sent

## Основні функції (API endpoints)

### Аутентифікація
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Учні
- GET /api/students (з фільтрами)
- GET /api/students/{id}
- POST /api/students
- PUT /api/students/{id}
- DELETE /api/students/{id}

### Відвідування
- GET /api/attendance
- POST /api/attendance (відмітити відвідування)
- GET /api/attendance/student/{id}
- GET /api/attendance/date/{date}

### Оплати
- GET /api/payments
- POST /api/payments
- GET /api/payments/student/{id}
- GET /api/payments/overdue (прострочені)

### Абонементи
- GET /api/subscriptions
- POST /api/subscriptions
- PUT /api/subscriptions/{id}
- GET /api/subscriptions/expiring (що закінчуються)

### Страховки
- GET /api/insurance
- POST /api/insurance
- PUT /api/insurance/{id}
- GET /api/insurance/expiring (що закінчуються)

### Групи
- GET /api/groups
- POST /api/groups
- PUT /api/groups/{id}
- GET /api/groups/{id}/students

### Статистика
- GET /api/stats/attendance
- GET /api/stats/payments
- GET /api/stats/students

### Сповіщення
- POST /api/notifications/send
- GET /api/notifications/pending

## Ключові фічі

### 1. Дашборд
- Загальна статистика (кількість учнів, відвідування за день)
- Швидкі фільтри (борги, закінчуються абонементи, немає страховки)
- Календар занять

### 2. Картка учня
- Повна анкета
- Історія відвідувань
- Історія оплат
- Статус абонемента
- Статус страховки
- Фонд/додаткові збори

### 3. Відмітка відвідувань
- Швидка відмітка по групі
- Можливість додати примітку
- Автоматичне списування занять з абонемента

### 4. Контроль оплат
- Автоматичний розрахунок боргів
- Історія всіх платежів
- Дата наступної оплати
- Фільтр боржників

### 5. Система сповіщень
- Автоматичні нагадування за 3 дні до закінчення абонемента
- Нагадування про оплату
- Нагадування про закінчення страховки
- Відправка через Telegram Bot

### 6. Ролі та доступи
- **Адміністратор**: повний доступ
- **Тренер**: перегляд своїх груп, відмітка відвідувань, перегляд оплат

## Етапи розробки

### Етап 1: Backend (3-4 дні)
1. Налаштування проєкту FastAPI
2. Створення моделей БД
3. Реалізація API endpoints
4. Аутентифікація JWT
5. Тестування API

### Етап 2: Frontend (3-4 дні)
1. Створення макетів інтерфейсу
2. Сторінка логіну
3. Дашборд
4. Список учнів з фільтрами
5. Картка учня
6. Відмітка відвідувань
7. Управління оплатами
8. Адаптивність для мобільних

### Етап 3: Інтеграції (2 дні)
1. Telegram Bot для сповіщень
2. Автоматичні нагадування
3. Експорт даних (Excel/PDF)

### Етап 4: Тестування та деплой (1-2 дні)
1. Тестування всіх функцій
2. Виправлення багів
3. Деплой на сервер
4. Навчання клієнта

**Загальний час: 9-12 днів**

## Безпека
- Хешування паролів (bcrypt)
- JWT токени з expiration
- HTTPS для production
- Валідація всіх вхідних даних
- SQL injection захист (через ORM)
- CORS налаштування

## Масштабованість
- Можливість додати більше груп/тренерів
- Експорт/імпорт даних
- Резервне копіювання БД
- Логування всіх дій

## Вартість та терміни
- **Термін**: 10-14 днів
- **Вартість**: залежить від домовленості з клієнтом
- **Підтримка**: можлива після запуску

## Наступні кроки
1. ✅ Створити технічний план
2. ⏳ Узгодити з клієнтом
3. ⏳ Створити структуру проєкту
4. ⏳ Розробити backend
5. ⏳ Розробити frontend
6. ⏳ Інтеграції та тестування
7. ⏳ Деплой
