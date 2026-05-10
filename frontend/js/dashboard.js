// Dashboard Page Logic

document.addEventListener('DOMContentLoaded', async () => {
    try {
        requireAuth();
        loadUserInfo();
        setCurrentDate();
        
        setupMobileMenu();

        const results = await Promise.allSettled([
            loadDashboardStats(),
            loadAttendanceStats()
        ]);
        
        if (results[0].status === 'rejected') {
            console.error('Статистику не вдалося завантажити:', results[0].reason);
        }
    } catch (err) {
        console.error('Помилка дашборду:', err);
    }
});

function setCurrentDate() {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateStr = new Date().toLocaleDateString('uk-UA', options);
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = dateStr;
}

async function loadDashboardStats() {
    try {
        const stats = await statsAPI.getDashboard();

        // Оновлюємо картки статистики тільки якщо елементи існують
        const updateEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val !== undefined ? val : 0;
        };

        updateEl('totalStudents', stats.total_students);
        updateEl('activeStudents', stats.active_students);
        updateEl('todayAttendance', stats.today_attendance);
        updateEl('studentsWithDebts', stats.students_with_debts);

        // Show alerts if needed
        const expSubsEl = document.getElementById('expiringSubscriptions');
        if (expSubsEl && stats.expiring_subscriptions > 0) {
            expSubsEl.style.display = 'flex';
            const countEl = document.getElementById('expiringSubs');
            if (countEl) countEl.textContent = stats.expiring_subscriptions;
        }

        const expiredIns = stats.expired_insurance || 0;
        const expiringIns = stats.expiring_insurance || 0;

        const insAlert = document.getElementById('expiringInsurance');
        if (insAlert && (expiredIns > 0 || expiringIns > 0)) {
            insAlert.style.display = 'flex';
            const insTextEl = document.getElementById('expiringIns');
            if (insTextEl) insTextEl.innerHTML = 
                `Відсутня/Прострочена: <strong class="text-danger">${expiredIns}</strong>, закінчуються: <strong class="text-warning">${expiringIns}</strong>`;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Помилка завантаження статистики', 'error');
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
