// Attendance Page Logic

let allStudents = [];
let allAttendance = [];
let allTrainers = [];

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    loadUserInfo();

    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    document.getElementById('attendanceDate2').value = today;

    await Promise.all([
        loadStudents(),
        loadTrainers(),
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

async function loadStudents() {
    try {
        allStudents = await studentsAPI.getAll({ is_active: true });

        const datalist = document.getElementById('studentsDatalist');
        if (datalist) {
            datalist.innerHTML = allStudents.map(s =>
                `<option value="${s.first_name} ${s.last_name} (ID: ${s.id})">`
            ).join('');
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

async function loadTrainers() {
    try {
        allTrainers = await trainersAPI.getAll();
    } catch (error) {
        console.error('Error loading trainers:', error);
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

        // Знаходимо тренера, чий user_id збігається з тим, хто зробив відмітку
        const trainer = allTrainers.find(t => t.user_id === a.marked_by);
        const trainerName = trainer ? `${trainer.first_name} ${trainer.last_name}` : `ID: ${a.marked_by || '-'}`;

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
                <td>${trainerName}</td>
                <td>
                    <button class="btn-icon" onclick="openEditAttendanceModal(${a.id})" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
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
    document.getElementById('modalTitle').textContent = 'Відмітити відвідування';
    document.getElementById('attendanceForm').reset();
    document.getElementById('attendanceId').value = '';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate2').value = today;
    document.getElementById('attendanceModal').classList.add('show');
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal').classList.remove('show');
}

async function openEditAttendanceModal(id) {
    const attendance = allAttendance.find(a => a.id === id);
    if (!attendance) return;

    const student = allStudents.find(s => s.id === attendance.student_id);
    
    document.getElementById('modalTitle').textContent = 'Редагувати відвідування';
    document.getElementById('attendanceId').value = attendance.id;
    document.getElementById('attendanceStudentSearch').value = student ? `${student.first_name} ${student.last_name} (ID: ${student.id})` : `ID: ${attendance.student_id}`;
    document.getElementById('attendanceDate2').value = attendance.date;
    document.getElementById('statusSelect').value = attendance.status;
    document.getElementById('attendanceNotes').value = attendance.notes || '';
    
    document.getElementById('attendanceModal').classList.add('show');
}

document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const attendanceId = document.getElementById('attendanceId').value;
    const searchValue = document.getElementById('attendanceStudentSearch').value;
    const idMatch = searchValue.match(/\(ID: (\d+)\)$/);
    const studentId = idMatch ? parseInt(idMatch[1]) : null;

    if (!studentId) {
        alert('Будь ласка, оберіть учня зі списку');
        return;
    }

    const attendanceData = {
        student_id: studentId,
        date: document.getElementById('attendanceDate2').value,
        status: document.getElementById('statusSelect').value,
        notes: document.getElementById('attendanceNotes').value || null
    };

    try {
        if (attendanceId) {
            await attendanceAPI.update(attendanceId, attendanceData);
            alert('Відвідування оновлено');
        } else {
            await attendanceAPI.mark(attendanceData);
            alert('Відвідування відмічено');
        }
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
