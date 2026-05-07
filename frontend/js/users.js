// Перевірка ролі користувача
function checkUserRole() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const usersLink = document.getElementById('usersLink');

    if (user.role === 'admin') {
        usersLink.style.display = 'flex';
    } else {
        window.location.href = 'dashboard.html';
    }
}

// Завантаження користувачів
async function loadUsers() {
    try {
        const response = await apiRequest('/api/users');
        const users = response.users || [];

        const tbody = document.getElementById('usersTable');

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Користувачів не знайдено</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.full_name}</td>
                <td>
                    <span class="badge ${user.role === 'admin' ? 'badge-success' : 'badge-info'}">
                        ${user.role === 'admin' ? 'Адміністратор' : 'Тренер'}
                    </span>
                </td>
                <td>
                    <span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">
                        ${user.is_active ? 'Активний' : 'Неактивний'}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString('uk-UA')}</td>
                <td>
                    <button class="btn-icon btn-danger" onclick="deleteUser(${user.id}, '${user.username}')" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Помилка завантаження користувачів', 'error');
    }
}

// Відкрити модальне вікно додавання користувача
function openAddUserModal() {
    document.getElementById('modalTitle').textContent = 'Додати користувача';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('password').required = true;

    // За замовчуванням роль тренер і показуємо поля тренера
    document.getElementById('userRole').value = 'trainer';
    document.getElementById('trainerFieldsGroup').style.display = 'block';

    document.getElementById('userModal').style.display = 'flex';
}

// Закрити модальне вікно
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

// Обробка зміни ролі
document.getElementById('userRole').addEventListener('change', function() {
    const trainerFields = document.getElementById('trainerFieldsGroup');
    if (this.value === 'trainer') {
        trainerFields.style.display = 'block';
    } else {
        trainerFields.style.display = 'none';
    }
});

// Обробка форми користувача
document.getElementById('userForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('password').value;

    if (password.length < 6) {
        showNotification('Пароль повинен містити мінімум 6 символів', 'error');
        return;
    }

    const userData = {
        username,
        full_name: fullName,
        role,
        password,
        is_active: true
    };

    // Якщо роль тренер, додаємо дані тренера
    if (role === 'trainer') {
        const trainerFirstName = document.getElementById('trainerFirstName').value.trim();
        const trainerLastName = document.getElementById('trainerLastName').value.trim();
        const trainerPhone = document.getElementById('trainerPhone').value.trim();
        const trainerSpecialization = document.getElementById('trainerSpecialization').value.trim();

        userData.trainer_data = {
            first_name: trainerFirstName || '',
            last_name: trainerLastName || '',
            phone: trainerPhone || '',
            specialization: trainerSpecialization || ''
        };
    }

    try {
        await apiRequest('/api/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        showNotification('Користувача успішно створено', 'success');
        closeUserModal();
        loadUsers();
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification(error.message || 'Помилка створення користувача', 'error');
    }
});

// Видалення користувача
async function deleteUser(userId, username) {
    if (!confirm(`Ви впевнені, що хочете видалити користувача "${username}"?`)) {
        return;
    }

    try {
        await apiRequest(`/api/users/${userId}`, {
            method: 'DELETE'
        });

        showNotification('Користувача успішно видалено', 'success');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(error.message || 'Помилка видалення користувача', 'error');
    }
}

// Показати повідомлення
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Закриття модального вікна при кліку поза ним
window.onclick = function(event) {
    const modal = document.getElementById('userModal');
    if (event.target === modal) {
        closeUserModal();
    }
};

// Завантаження інформації про користувача
function loadUserInfo() {
    const user = getUser();
    if (user) {
        document.getElementById('userName').textContent = user.full_name;
        document.getElementById('userRole').textContent = user.role === 'admin' ? 'Адміністратор' : 'Тренер';
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    checkUserRole();
    loadUsers();
    loadUserInfo();
});
