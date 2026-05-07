"""
Тестовий скрипт для перевірки API endpoints
Запускай: python test_api.py
"""
import requests
import json

# Змінити на твій Railway URL
BASE_URL = "https://your-app.railway.app"  # ЗМІНИТИ НА СВІЙ URL
# Або для локального тесту:
# BASE_URL = "http://localhost:8000"

def test_login():
    """Тест логіну"""
    print("\n=== Testing Login ===")
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    return None

def test_create_student(token):
    """Тест створення учня"""
    print("\n=== Testing Create Student ===")
    headers = {"Authorization": f"Bearer {token}"}
    student_data = {
        "first_name": "Тест",
        "last_name": "Учень",
        "birth_date": "2010-01-01",
        "phone_parent": "+380501234567",
        "telegram_parent": None,
        "group_id": None,
        "trainer_id": None,
        "notes": "Тестовий учень"
    }

    response = requests.post(
        f"{BASE_URL}/api/students",
        json=student_data,
        headers=headers
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

def test_get_students(token):
    """Тест отримання списку учнів"""
    print("\n=== Testing Get Students ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/api/students",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

def test_health():
    """Тест health endpoint"""
    print("\n=== Testing Health ===")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    print("=" * 50)
    print("API Testing Script")
    print("=" * 50)

    # Перевірка здоров'я сервера
    test_health()

    # Логін
    token = test_login()

    if token:
        print(f"\nToken received: {token[:20]}...")

        # Тест отримання учнів
        test_get_students(token)

        # Тест створення учня
        test_create_student(token)

        # Перевірка чи додався
        test_get_students(token)
    else:
        print("\nLogin failed! Cannot continue tests.")
