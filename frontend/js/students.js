// Students Page Logic

let allStudents = [];
let allGroups = [];

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    loadUserInfo();
    await loadGroups();
    await loadStudents();
    setupFilters();
});

function loadUserInfo() {
    const user = getUser();
    if (user) {
        document.getElementById('userName').textContent = user.full_name;
        document.getElementById('userRole').textContent = user.role === 'admin' ? 'Адміністратор' : 'Тренер';
    }
}

async function loadGroups() {
    try {
        // TODO: Додати API для груп
        allGroups = [];
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

async function loadStudents() {
    try {
        allStudents = await studentsAPI.getAll();
        renderStudents(allStudents);
    } catch (error) {
        console.error('Error loading students:', error);
        document.getElementById('studentsTable').innerHTML =
            '<tr><td colspan="7" class="text-center">Помилка завантаження даних</td></tr>';
    }
}

function renderStudents(students) {
    const tbody = document.getElementById('studentsTable');

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Немає учнів</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.first_name} ${student.last_name}</td>
            <td>${formatDate(student.birth_date)}</td>
            <td>${student.phone_parent}</td>
            <td>${student.group_id || '-'}</td>
            <td>${student.trainer_id || '-'}</td>
            <td>
                <span class="badge ${student.is_active ? 'badge-success' : 'badge-danger'}">
                    ${student.is_active ? 'Активний' : 'Неактивний'}
                </span>
            </td>
            <td>
                <button class="btn-icon" onclick="editStudent(${student.id})" title="Редагувати">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteStudent(${student.id})" title="Видалити">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const groupFilter = document.getElementById('groupFilter');
    const statusFilter = document.getElementById('statusFilter');

    searchInput.addEventListener('input', filterStudents);
    groupFilter.addEventListener('change', filterStudents);
    statusFilter.addEventListener('change', filterStudents);
}

function filterStudents() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const groupId = document.getElementById('groupFilter').value;
    const status = document.getElementById('statusFilter').value;

    let filtered = allStudents;

    if (searchTerm) {
        filtered = filtered.filter(s =>
            s.first_name.toLowerCase().includes(searchTerm) ||
            s.last_name.toLowerCase().includes(searchTerm)
        );
    }

    if (groupId) {
        filtered = filtered.filter(s => s.group_id == groupId);
    }

    if (status === 'active') {
        filtered = filtered.filter(s => s.is_active);
    } else if (status === 'inactive') {
        filtered = filtered.filter(s => !s.is_active);
    }

    renderStudents(filtered);
}

function openAddStudentModal() {
    document.getElementById('modalTitle').textContent = 'Додати учня';
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    document.getElementById('studentModal').classList.add('show');
}

function closeStudentModal() {
    document.getElementById('studentModal').classList.remove('show');
}

async function editStudent(id) {
    try {
        const student = await studentsAPI.getById(id);

        document.getElementById('modalTitle').textContent = 'Редагувати учня';
        document.getElementById('studentId').value = student.id;
        document.getElementById('firstName').value = student.first_name;
        document.getElementById('lastName').value = student.last_name;
        document.getElementById('birthDate').value = student.birth_date;
        document.getElementById('phoneParent').value = student.phone_parent;
        document.getElementById('telegramParent').value = student.telegram_parent || '';
        document.getElementById('groupId').value = student.group_id || '';
        document.getElementById('notes').value = student.notes || '';

        document.getElementById('studentModal').classList.add('show');
    } catch (error) {
        console.error('Error loading student:', error);
        alert('Помилка завантаження даних учня');
    }
}

async function deleteStudent(id) {
    if (!confirm('Ви впевнені, що хочете видалити цього учня?')) {
        return;
    }

    try {
        await studentsAPI.delete(id);
        await loadStudents();
        alert('Учня видалено');
    } catch (error) {
        console.error('Error deleting student:', error);
        alert('Помилка видалення учня');
    }
}

document.getElementById('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentId = document.getElementById('studentId').value;
    const studentData = {
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        birth_date: document.getElementById('birthDate').value,
        phone_parent: document.getElementById('phoneParent').value,
        telegram_parent: document.getElementById('telegramParent').value || null,
        group_id: document.getElementById('groupId').value ? parseInt(document.getElementById('groupId').value) : null,
        notes: document.getElementById('notes').value || null
    };

    try {
        if (studentId) {
            await studentsAPI.update(studentId, studentData);
            alert('Учня оновлено');
        } else {
            await studentsAPI.create(studentData);
            alert('Учня додано');
        }

        closeStudentModal();
        await loadStudents();
    } catch (error) {
        console.error('Error saving student:', error);
        alert('Помилка збереження даних');
    }
});

function logout() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        authAPI.logout();
    }
}
