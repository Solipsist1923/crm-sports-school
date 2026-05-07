# Деплой CRM на Railway.app

## Крок 1: Підготовка GitHub репозиторію

1. Відкрий термінал в папці проєкту:
```bash
cd "D:\My_Progect\Frilance\First"
```

2. Ініціалізуй Git (якщо ще не зроблено):
```bash
git init
git add .
git commit -m "Initial commit: CRM for sports school"
```

3. Підключи до GitHub:
```bash
git remote add origin https://github.com/Solipsist1923/crm-sports-school.git
git branch -M main
git push -u origin main
```

## Крок 2: Створення репозиторію на GitHub

1. Зайди на https://github.com/Solipsist1923
2. Натисни "New repository"
3. Назва: `crm-sports-school`
4. Опис: `CRM система для спортивної школи`
5. Public або Private (на твій вибір)
6. **НЕ** додавай README, .gitignore, license
7. Натисни "Create repository"

## Крок 3: Деплой на Railway

1. Зайди на https://railway.app
2. Натисни "Login" → "Login with GitHub"
3. Авторизуйся через GitHub (Solipsist1923)
4. Натисни "New Project"
5. Вибери "Deploy from GitHub repo"
6. Вибери репозиторій `crm-sports-school`
7. Railway автоматично:
   - Виявить Python проєкт
   - Встановить залежності з requirements.txt
   - Запустить через Procfile

## Крок 4: Налаштування змінних оточення

1. В Railway проєкті відкрий свій сервіс
2. Перейди в "Variables"
3. Додай змінні:
   - `SECRET_KEY` = `your-super-secret-key-change-this-in-production-12345`
   - `DATABASE_URL` = `sqlite:///./crm.db`

## Крок 5: Ініціалізація бази даних

1. В Railway перейди в "Settings"
2. Знайди "Custom Start Command"
3. Додай команду перед запуском:
```bash
python backend/init_db.py && uvicorn main:app --host 0.0.0.0 --port $PORT
```

АБО використай Railway CLI:
```bash
railway run python backend/init_db.py
```

## Крок 6: Отримання URL

1. Railway автоматично створить URL типу: `https://crm-sports-school-production.up.railway.app`
2. Відкрий цей URL в браузері
3. Маєш побачити сторінку логіну

## Тестові дані:

**Адміністратор:**
- Логін: `admin`
- Пароль: `admin123`

**Тренер 1:**
- Логін: `trainer1`
- Пароль: `trainer123`

**Тренер 2:**
- Логін: `kovalenko`
- Пароль: `kovalenko123`

## Що робити якщо щось не працює:

### Помилка: "Application failed to respond"
- Перевір логи в Railway (вкладка "Deployments" → "View Logs")
- Переконайся, що всі залежності встановлені

### Помилка: "Database not found"
- Запусти `init_db.py` через Railway CLI
- Або додай команду ініціалізації в start command

### Помилка: "Module not found"
- Перевір, що всі файли запушені в GitHub
- Перевір requirements.txt

## Оновлення проєкту:

Після змін в коді:
```bash
git add .
git commit -m "Опис змін"
git push
```

Railway автоматично задеплоїть нову версію!

## Моніторинг використання:

1. В Railway Dashboard бачиш використання $5 кредитів
2. Якщо закінчаться - сервіс зупиниться до наступного місяця
3. Для production - додай картку (але платити не треба, якщо в межах $5)

## Корисні посилання:

- Railway Dashboard: https://railway.app/dashboard
- GitHub Repo: https://github.com/Solipsist1923/crm-sports-school
- Документація Railway: https://docs.railway.app

---

**Готово!** Тепер замовник може тестувати систему за URL від Railway.
