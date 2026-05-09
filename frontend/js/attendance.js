// Attendance Page Logic

let allStudents = [];
let allAttendance = [];

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    loadUserInfo();

    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    document.getElementById('attendanceDate2').value = today;

    await Promise.all([
        loadStudents(),
        loadAttendance()
    ]).then(() => {
        setupMobileMenu();
    });

    // Date filter
    document.getElementById('attendanceDate').addEventListener('change', loadAttendance);
});

function loadUserInfo() {
    try {
        const user = getUser();
        if (!user) return;
        
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRoleDisplay');
        
        if (nameEl) nameEl.textContent = user.full_name || 'Користувач';
        if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Адміністратор' : 'Тренер';
    } catch (err) {
        console.error('Error loading user info:', err);
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

async function loadStudents() {
    try {
        allStudents = await studentsAPI.getAll({ is_active: true });

        // Populate student select
        const select = document.getElementById('studentSelect');
        select.innerHTML = '<option value="">Оберіть учня</option>' +
            allStudents.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('');
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

async function loadAttendance() {
    try {
        const date = document.getElementById('attendanceDate').value;
        if (date) {
            allAttendance = await attendanceAPI.getByDate(date);
        } else {
            allAttendance = await attendanceAPI.getAll({ limit: 100 });
        }
        renderAttendance(allAttendance);
    } catch (error) {
        console.error('Error loading attendance:', error);
        document.getElementById('attendanceTable').innerHTML =
            '<tr><td colspan="6" class="text-center">Помилка завантаження даних</td></tr>';
    }
}

function renderAttendance(attendance) {
    const tbody = document.getElementById('attendanceTable');

    if (attendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Немає відміток</td></tr>';
        return;
    }

    tbody.innerHTML = attendance.map(a => {
        const student = allStudents.find(s => s.id === a.student_id);
        const studentName = student ? `${student.first_name} ${student.last_name}` : `ID: ${a.student_id}`;

        return `
            <tr>
                <td>${studentName}</td>
                <td>${formatDate(a.date)}</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(a.status)}">
                        ${getStatusText(a.status)}
                    </span>
                </td>
                <td>${a.notes || '-'}</td>
                <td>ID: ${a.marked_by || '-'}</td>
                <td>
                    <button class="btn-icon btn-danger" onclick="deleteAttendance(${a.id})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'present': return 'badge-success';
        case 'absent': return 'badge-danger';
        case 'sick': return 'badge-warning';
        case 'excused': return 'badge-warning';
        default: return '';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'present': return 'Присутній';
        case 'absent': return 'Відсутній';
        case 'sick': return 'Хворів';
        case 'excused': return 'Поважна причина';
        default: return status;
    }
}

function openMarkAttendanceModal() {
    document.getElementById('attendanceForm').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate2').value = today;
    document.getElementById('attendanceModal').classList.add('show');
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal').classList.remove('show');
}

document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const attendanceData = {
        student_id: parseInt(document.getElementById('studentSelect').value),
        date: document.getElementById('attendanceDate2').value,
        status: document.getElementById('statusSelect').value,
        notes: document.getElementById('attendanceNotes').value || null
    };

    try {
        await attendanceAPI.mark(attendanceData);
        alert('Відвідування відмічено');
        closeAttendanceModal();
        await loadAttendance();
    } catch (error) {
        console.error('Error marking attendance:', error);
        alert('Помилка: ' + (error.message || 'Не вдалося відмітити відвідування'));
    }
});

async function deleteAttendance(id) {
    if (!confirm('Ви впевнені, що хочете видалити цю відмітку?')) {
        return;
    }

    try {
        await attendanceAPI.delete(id);
        await loadAttendance();
        alert('Відмітку видалено');
    } catch (error) {
        console.error('Error deleting attendance:', error);
        alert('Помилка видалення');
    }
}

function logout() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        authAPI.logout();
    }
}
