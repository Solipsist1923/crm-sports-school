// Dashboard Page Logic

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    requireAuth();

    // Load user info
    loadUserInfo();

    // Set current date
    setCurrentDate();

    // Load dashboard data
    await loadDashboardStats();
    await loadAttendanceStats();
    setupMobileMenu();
});

function loadUserInfo() {
    const user = getUser();
    if (user) {
        document.getElementById('userName').textContent = user.full_name;
        document.getElementById('userRole').textContent = user.role === 'admin' ? 'Адміністратор' : 'Тренер';
    }
}

function setCurrentDate() {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateStr = new Date().toLocaleDateString('uk-UA', options);
    document.getElementById('currentDate').textContent = dateStr;
}

async function loadDashboardStats() {
    try {
        const stats = await statsAPI.getDashboard();

        // Update stat cards
        document.getElementById('totalStudents').textContent = stats.total_students;
        document.getElementById('activeStudents').textContent = stats.active_students;
        document.getElementById('todayAttendance').textContent = stats.today_attendance;
        document.getElementById('studentsWithDebts').textContent = stats.students_with_debts;

        // Show alerts if needed
        if (stats.expiring_subscriptions > 0) {
            document.getElementById('expiringSubscriptions').style.display = 'flex';
            document.getElementById('expiringSubs').textContent = stats.expiring_subscriptions;
        }

        const expiredIns = stats.expired_insurance || 0;
        const expiringIns = stats.expiring_insurance || 0;

        if (expiredIns > 0 || expiringIns > 0) {
            const insAlert = document.getElementById('expiringInsurance');
            insAlert.style.display = 'flex';
            document.getElementById('expiringIns').innerHTML = 
                `Прострочено: <strong class="text-danger">${expiredIns}</strong>, закінчуються: <strong class="text-warning">${expiringIns}</strong>`;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showError('Помилка завантаження статистики');
    }
}

async function loadAttendanceStats() {
    try {
        const stats = await statsAPI.getAttendance(10);
        const tbody = document.getElementById('attendanceStatsTable');

        if (stats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Немає даних</td></tr>';
            return;
        }

        tbody.innerHTML = stats.map(s => `
            <tr>
                <td>${s.first_name} ${s.last_name}</td>
                <td>${s.total_present}</td>
                <td>${s.total_absent}</td>
                <td>${s.total_sick}</td>
                <td>${s.total_classes}</td>
                <td>
                    <span style="color: ${s.attendance_rate >= 80 ? 'var(--secondary-color)' : s.attendance_rate >= 60 ? 'var(--warning-color)' : 'var(--danger-color)'}">
                        ${s.attendance_rate}%
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading attendance stats:', error);
        document.getElementById('attendanceStatsTable').innerHTML =
            '<tr><td colspan="6" class="text-center">Помилка завантаження даних</td></tr>';
    }
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

function logout() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        authAPI.logout();
    }
}
