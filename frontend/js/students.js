// Students Page Logic

let allStudents = [];
let allGroups = [];
let allTrainers = [];

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    loadUserInfo();
    
    // Завантажуємо дані паралельно без блокуючого спінера
    Promise.all([
        loadGroups(),
        loadTrainers(),
        loadStudents()
    ]).then(() => {
        setupFilters();
        setupMobileMenu();
    }).catch(err => console.error('Помилка ініціалізації:', err));
});

// Функція розрахунку статусу страховки
function getInsuranceStatus(endDate) {
    if (!endDate) return { class: 'status-danger', icon: 'fa-exclamation-circle' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dateStr = endDate.includes('T') ? endDate : `${endDate}T00:00:00`;
    const expDate = new Date(dateStr);
    expDate.setHours(0, 0, 0, 0);
    
    const diffTime = expDate - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return { class: 'status-danger', icon: 'fa-exclamation-circle' }; // Прострочена
    if (diffDays <= 30) return { class: 'status-warning', icon: 'fa-exclamation-triangle' }; // Менше місяця
    return { class: 'status-success', icon: 'fa-shield-alt' }; // Все ок
}

function loadUserInfo() {
    try {
        const user = getUser();
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRoleDisplay');
        
        if (user && nameEl) nameEl.textContent = user.full_name;
        if (user && roleEl) roleEl.textContent = user.role === 'admin' ? 'Адміністратор' : 'Тренер';
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

async function loadGroups() {
    try {
        allGroups = await groupsAPI.getAll();

        // Заповнюємо вибір групи у модальному вікні
        const select = document.getElementById('groupId');
        if (select) {
            select.innerHTML = '<option value="">Без групи</option>' +
                allGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        }

        // Заповнюємо фільтр груп у заголовку
        const filterSelect = document.getElementById('groupFilter');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Всі групи</option>' +
                allGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

async function loadTrainers() {
    try {
        allTrainers = await trainersAPI.getAll();
    } catch (error) {
        console.error('Error loading trainers:', error);
    }
}

async function loadStudents() {
    try {
        allStudents = await studentsAPI.getAll();

        // Перевіряємо, чи передано groupId через URL (наприклад, students.html?groupId=5)
        const urlParams = new URLSearchParams(window.location.search);
        const urlGroupId = urlParams.get('groupId');

        if (urlGroupId) {
            const groupFilter = document.getElementById('groupFilter');
            if (groupFilter) groupFilter.value = urlGroupId;
            filterStudents(); // Автоматично фільтруємо список
        } else {
            renderStudents(allStudents);
        }
    } catch (error) {
        console.error('Error loading students:', error);
        document.getElementById('studentsTable').innerHTML =
            '<tr><td colspan="8" class="text-center">Помилка завантаження даних</td></tr>';
    }
}

function renderStudents(students) {
    const tbody = document.getElementById('studentsTable');

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Немає учнів</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(student => {
        const group = allGroups.find(g => g.id === student.group_id);
        const trainer = allTrainers.find(t => t.id === student.trainer_id);
        
        return `
        <tr>
            <td>${student.first_name} ${student.last_name}</td>
            <td>${formatDate(student.birth_date)}</td>
            <td>${student.phone_parent}</td>
            <td>${group ? group.name : '-'}</td>
            <td>${trainer ? `${trainer.first_name} ${trainer.last_name}` : '-'}</td>
            <td>
                <div class="student-docs-info">
                    <div class="${student.medical_certificate ? 'status-success' : 'status-danger'}" title="Медична довідка">
                        <i class="fas ${student.medical_certificate ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        <small>Довідка: ${student.medical_certificate ? 'Є' : 'Немає'}</small>
                    </div>
                    ${(function() {
                        const ins = getInsuranceStatus(student.insurance_end);
                        return `
                            <div class="${ins.class}" title="Страховка">
                                <i class="fas ${ins.icon}"></i>
                                <small>Страх. до: ${student.insurance_end ? formatDate(student.insurance_end) : 'Немає'}</small>
                            </div>
                        `;
                    })()}
                </div>
            </td>
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
    `}).join('');
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const groupFilter = document.getElementById('groupFilter');
    const statusFilter = document.getElementById('statusFilter');
    const insuranceFilter = document.getElementById('insuranceFilter'); // Додайте цей елемент в HTML

    searchInput.addEventListener('input', filterStudents);
    groupFilter.addEventListener('change', filterStudents);
    statusFilter.addEventListener('change', filterStudents);
    if (insuranceFilter) insuranceFilter.addEventListener('change', filterStudents);
}

function filterStudents() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const groupId = document.getElementById('groupFilter').value;
    const status = document.getElementById('statusFilter').value;
    const insuranceExpiring = document.getElementById('insuranceFilter')?.checked;

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

    if (insuranceExpiring) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthLater = new Date(today);
        monthLater.setDate(today.getDate() + 30);

        filtered = filtered.filter(s => 
            s.insurance_end && (function() {
                const sDate = new Date(s.insurance_end.includes('T') ? s.insurance_end : `${s.insurance_end}T00:00:00`);
                sDate.setHours(0, 0, 0, 0);
                return sDate <= monthLater; // Показуємо і прострочені, і ті, що скоро закінчаться
            })()
        );
    }

    renderStudents(filtered);
}

function openAddStudentModal() {
    document.getElementById('modalTitle').textContent = 'Додати учня';
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    // Явно скидаємо нові поля
    if (document.getElementById('insuranceStart')) document.getElementById('insuranceStart').value = '';
    if (document.getElementById('insuranceEnd')) document.getElementById('insuranceEnd').value = '';
    if (document.getElementById('medicalCertificate')) document.getElementById('medicalCertificate').checked = false;
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
        document.getElementById('insuranceStart').value = student.insurance_start || '';
        document.getElementById('insuranceEnd').value = student.insurance_end || '';
        document.getElementById('medicalCertificate').checked = student.medical_certificate || false;
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
        insurance_start: document.getElementById('insuranceStart').value || null,
        insurance_end: document.getElementById('insuranceEnd').value || null,
        medical_certificate: document.getElementById('medicalCertificate').checked,
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
