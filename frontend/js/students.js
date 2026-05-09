// Students Page Logic

let allStudents = [];
let allGroups = [];
let allTrainers = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        requireAuth();
        loadUserInfo();
        
        // Ініціалізуємо меню негайно, не чекаючи завантаження даних
        if (typeof setupMobileMenu === 'function') {
            setupMobileMenu();
        }
        
        // Показуємо індикатор завантаження
        const tbody = document.getElementById('studentsTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Завантаження...</td></tr>';
        }
        
        // Завантажуємо дані паралельно з обробкою кожного результату окремо
        const results = await Promise.allSettled([
            loadGroups(),
            loadTrainers(),
            loadStudents()
        ]);
        
        // Відображаємо учнів, навіть якщо групи або тренери не завантажились
        const studentsResult = results[2];
        if (studentsResult.status === 'fulfilled') {
            renderStudents(allStudents);
        } else {
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">Помилка завантаження учнів.</td></tr>';
            }
        }
        
        setupFilters();

        const urlParams = new URLSearchParams(window.location.search);
        const urlGroupId = urlParams.get('groupId');
        if (urlGroupId) {
            const groupFilter = document.getElementById('groupFilter');
            if (groupFilter) groupFilter.value = urlGroupId;
            filterStudents();
        }
    } catch (err) {
        console.error('Критична помилка ініціалізації:', err);
    }
});

// Функція розрахунку статусу страховки
function loadUserInfo() {
    try {
        const user = getUser();
        if (!user) return;

        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRoleDisplay');
        
        if (nameEl && user.full_name) {
            nameEl.textContent = user.full_name;
        }
        if (roleEl) {
            roleEl.textContent = user.role === 'admin' ? 'Адміністратор' : 'Тренер';
        }
    } catch (err) {
        console.warn('Не вдалося завантажити інфо користувача:', err);
    }
}

async function loadGroups() {
    try {
        allGroups = await groupsAPI.getAll();
        console.log('Завантажено груп:', allGroups.length);

        const select = document.getElementById('groupId');
        if (select) {
            select.innerHTML = '<option value="">Без групи</option>' +
                allGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        }

        const filterSelect = document.getElementById('groupFilter');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Всі групи</option>' +
                allGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading groups:', error);
        allGroups = [];
        throw error;
    }
}

async function loadTrainers() {
    try {
        allTrainers = await trainersAPI.getAll();
        console.log('Завантажено тренерів:', allTrainers.length);
    } catch (error) {
        console.error('Error loading trainers:', error);
        allTrainers = [];
        throw error;
    }
}

async function loadStudents() {
    try {
        allStudents = await studentsAPI.getAll();
        console.log('Завантажено учнів:', allStudents.length);
        return allStudents;
    } catch (error) {
        console.error('Error loading students:', error);
        allStudents = [];
        throw error;
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
            <td>${student.phone_parent || '-'}</td>
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

    if (searchInput) searchInput.addEventListener('input', filterStudents);
    if (groupFilter) groupFilter.addEventListener('change', filterStudents);
    if (statusFilter) statusFilter.addEventListener('change', filterStudents);
    if (insuranceFilter) insuranceFilter.addEventListener('change', filterStudents);
}

function filterStudents() {
    const searchInput = document.getElementById('searchInput');
    const groupFilter = document.getElementById('groupFilter');
    const statusFilter = document.getElementById('statusFilter');
    const insuranceFilter = document.getElementById('insuranceFilter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const groupId = groupFilter ? groupFilter.value : '';
    const status = statusFilter ? statusFilter.value : '';
    const insuranceExpiring = insuranceFilter ? insuranceFilter.checked : false;

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
        const updatedStudents = await loadStudents();
        renderStudents(updatedStudents);
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
