# Інструкція деплою на PythonAnywhere

## Крок 1: Реєстрація

1. Зайди на https://www.pythonanywhere.com
2. Натисни "Start running Python online in less than a minute!"
3. Створи безкоштовний акаунт (Beginner account)

## Крок 2: Завантаження файлів

1. Після входу, перейди в розділ **Files**
2. Створи папку `crm` (натисни "New directory")
3. Завантаж туди всі файли з `D:\My_Progect\Frilance\First\backend\`

**АБО** використай Git:

1. Перейди в розділ **Consoles**
2. Натисни "Bash"
3. Виконай команди:
```bash
git clone https://github.com/твій-репозиторій/crm.git
cd crm/backend
```

## Крок 3: Встановлення залежностей

В Bash консолі:
```bash
cd ~/crm/backend
pip3.10 install --user -r requirements.txt
```

## Крок 4: Налаштування Web App

1. Перейди в розділ **Web**
2. Натисни "Add a new web app"
3. Вибери "Manual configuration"
4. Вибери **Python 3.10**
5. Натисни "Next"

## Крок 5: Налаштування WSGI файлу

1. В розділі **Web** знайди "WSGI configuration file"
2. Натисни на посилання (наприклад `/var/www/username_pythonanywhere_com_wsgi.py`)
3. Видали весь вміст і вставте:

```python
import sys
import os

# Додай шлях до проєкту
path = '/home/твій_username/crm/backend'
if path not in sys.path:
    sys.path.append(path)

# Встанови змінні оточення
os.environ['DATABASE_URL'] = 'sqlite:////home/твій_username/crm/backend/crm.db'

from main import app as application
```

**ВАЖЛИВО:** Заміни `твій_username` на свій username з PythonAnywhere!

## Крок 6: Ініціалізація бази даних

В Bash консолі:
```bash
cd ~/crm/backend
python3.10 init_db.py
```

## Крок 7: Налаштування Static Files

В розділі **Web**, в секції "Static files":

1. URL: `/static/`
   Path: `/home/твій_username/crm/frontend`

## Крок 8: Запуск

1. В розділі **Web** натисни зелену кнопку **Reload**
2. Твій сайт буде доступний за адресою: `https://твій_username.pythonanywhere.com`

## Крок 9: Налаштування Frontend

1. Відкрий файл `frontend/js/config.js`
2. Зміни `API_BASE_URL`:
```javascript
const API_BASE_URL = 'https://твій_username.pythonanywhere.com';
```

## Обмеження безкоштовного плану:

- ⚠️ Тільки HTTP (не HTTPS для API)
- ⚠️ Обмеження CPU (100 секунд на день)
- ⚠️ Треба перезавантажувати кожні 3 місяці
- ⚠️ Немає WebSocket

## Альтернатива (простіше):

Якщо складно, можу створити GitHub репозиторій і задеплоїти на **Railway.app** - там все автоматично, просто підключаєш GitHub і все працює.

Хочеш спробувати Railway замість PythonAnywhere?
