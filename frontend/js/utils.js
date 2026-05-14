// Спільні утиліти для всього проекту

function formatDate(dateString) {
    if (!dateString) return '-';
    // Забезпечуємо сумісність з Safari (заміна дефісів на косу риску для YYYY-MM-DD)
    const safeDateString = dateString.includes('-') && !dateString.includes('T') 
        ? dateString.replace(/-/g, '/') 
        : dateString;
    const date = new Date(safeDateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('uk-UA');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleString('uk-UA');
}

function getInsuranceStatus(endDate) {
    if (!endDate) return { class: 'status-danger', icon: 'fa-exclamation-circle' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = endDate.includes('T') ? endDate : `${endDate}T00:00:00`;
    const expDate = new Date(dateStr);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { class: 'status-danger', icon: 'fa-exclamation-circle' };
    if (diffDays <= 30) return { class: 'status-warning', icon: 'fa-exclamation-triangle' };
    return { class: 'status-success', icon: 'fa-shield-alt' };
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `position:fixed;top:20px;right:20px;padding:15px 20px;background:${type==='success'?'#10b981':type==='error'?'#ef4444':'#3b82f6'};color:white;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:10000;animation:slideIn 0.3s ease;`;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function setupMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle && sidebar && overlay) {
        const toggleMenu = () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        };

        toggle.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                }
            });
        });
    }
}

function loadUserInfo() {
    try {
        const user = getUser(); // Функція з api.js
        if (!user) return;

        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRoleDisplay');
        
        if (nameEl) nameEl.textContent = user.full_name || user.username;
        if (roleEl) {
            roleEl.textContent = user.role === 'admin' ? 'Адміністратор' : 'Тренер';
        }
    } catch (err) {
        console.warn('Помилка завантаження інфо користувача:', err);
    }
}

function logout() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        authAPI.logout();
        // Примусовий редирект, якщо authAPI.logout() затримався
        window.location.replace('login.html');
    }
}

// Уніфікована функція для ініціалізації сторінки
async function initPage(loadDataCallback) {
    try {
        requireAuth();
        loadUserInfo();
        setupMobileMenu();
        if (loadDataCallback) await loadDataCallback();
    } catch (err) {
        console.error('Помилка ініціалізації сторінки:', err);
    }
}

// Допоміжна функція для блокування кнопок при завантаженні
function setBtnLoading(btnId, isLoading, originalHtml = '') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Зачекайте...';
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalContent || originalHtml;
    }
}