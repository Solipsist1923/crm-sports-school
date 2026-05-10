let allAssignments = [];
let allGroups = [];
let allTrainers = [];
let allStudents = [];
let allPrices = [];
let selectedStudentsForLesson = []; // {id, name, payment_type}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        requireAuth();
        loadUserInfo();
        setupMobileMenu();

        const user = getUser();
        if (user && user.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('lessonDate').value = today;
        document.getElementById('lessonDate').min = today; // Заборона минулих дат

        await loadAllData();
        setupStudentSearch();
    } catch (err) {
        console.error('Помилка ініціалізації:', err);
    }
});

async function loadAllData() {
    const results = await Promise.allSettled([
        assignmentsAPI.getAll(),
        groupsAPI.getAll({ is_active: true }),
        trainersAPI.getAll(),
        studentsAPI.getAll({ is_active: true }),
        pricesAPI.getAll()
    ]);

    allAssignments = results[0].status === 'fulfilled' ? results[0].value : [];
    allGroups = results[1].status === 'fulfilled' ? results[1].value : [];
    allTrainers = results[2].status === 'fulfilled' ? results[2].value : [];
    allStudents = results[3].status === 'fulfilled' ? results[3].value : [];
    allPrices = results[4].status === 'fulfilled' ? results[4].value : [];

    renderAssignmentsCards(allAssignments);
    populateSelects();
}

function populateSelects() {
    document.getElementById('groupId').innerHTML = '<option value="">Оберіть групу...</option>' + 
        allGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

    document.getElementById('trainerId').innerHTML = '<option value="">Оберіть тренера...</option>' + 
        allTrainers.map(t => `<option value="${t.id}">${t.first_name} ${t.last_name}</option>`).join('');
}

function setupStudentSearch() {
    const input = document.getElementById('studentSearch');
    const suggestions = document.getElementById('searchSuggestions');

    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 2) { suggestions.innerHTML = ''; return; }

        const matches = allStudents.filter(s => 
            `${s.first_name} ${s.last_name}`.toLowerCase().includes(query) &&
            !selectedStudentsForLesson.find(sel => sel.id === s.id)
        );

        suggestions.innerHTML = matches.map(s => `
            <div class="suggestion-item" onclick="addStudentToLesson(${s.id}, '${s.first_name} ${s.last_name}')">
                ${s.first_name} ${s.last_name}
            </div>
        `).join('');
    });
}

function addStudentToLesson(id, name) {
    selectedStudentsForLesson.push({ id, name, payment_choice: 'subscription' });
    document.getElementById('studentSearch').value = '';
    document.getElementById('searchSuggestions').innerHTML = '';
    renderSelectedStudents();
}

function removeStudentFromLesson(id) {
    selectedStudentsForLesson = selectedStudentsForLesson.filter(s => s.id !== id);
    renderSelectedStudents();
}

function renderSelectedStudents() {
    const container = document.getElementById('selectedStudentsList');
    if (selectedStudentsForLesson.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--text-secondary); padding: 10px;">Нікого не обрано</p>';
        return;
    }

    container.innerHTML = selectedStudentsForLesson.map(s => `
        <div class="schedule-row" style="align-items: center; justify-content: space-between;">
            <span><strong>${s.name}</strong></span>
            <div style="display: flex; gap: 10px; align-items: center;">
                <select onchange="updateStudentPayment(${s.id}, this.value)" style="width: 150px; padding: 5px;">
                    <option value="subscription" ${s.payment_choice === 'subscription' ? 'selected' : ''}>Абонемент</option>
                    ${allPrices.map(p => `<option value="${p.id}" ${s.payment_choice == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
                <button type="button" class="btn-icon btn-danger" onclick="removeStudentFromLesson(${s.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateStudentPayment(id, value) {
    const student = selectedStudentsForLesson.find(s => s.id === id);
    if (student) student.payment_choice = value;
}

function renderAssignmentsCards(assignments) {
    const grid = document.getElementById('assignmentsGrid');
    if (!assignments || assignments.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Журнал порожній. Створіть призначення!</div>';
        return;
    }

    grid.innerHTML = assignments.map(a => `
        <div class="group-card">
            <div class="group-header">
                <h3>${a.group?.name || 'Без назви'}</h3>
                <span class="badge badge-info">${formatDate(a.lesson_date)}</span>
            </div>
            <div class="group-info">
                <div class="info-item"><i class="fas fa-user-tie"></i><span>Тренер: ${a.trainer?.first_name} ${a.trainer?.last_name}</span></div>
                <div class="info-item"><i class="fas fa-users"></i><span>Учнів: ${a.students?.length || 0}</span></div>
            </div>
            <div class="group-actions">
                <button class="btn btn-secondary btn-sm" onclick="viewJournal(${a.id})"><i class="fas fa-book"></i> Журнал</button>
                <button class="btn-icon btn-danger" onclick="deleteAssignment(${a.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openAddAssignmentModal() {
    selectedStudentsForLesson = []; // Скидаємо обраних учнів
    renderSelectedStudents();
    document.getElementById('assignmentForm').reset();
    document.getElementById('assignmentModal').classList.add('show');
}

function closeAssignmentModal() {
    document.getElementById('assignmentModal').classList.remove('show');
}

document.getElementById('assignmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (selectedStudentsForLesson.length === 0) {
        alert('Будь ласка, виберіть хоча б одного учня');
        return;
    }

    // Формуємо дані: список об'єктів {student_id, payment_choice}
    const studentAssignments = selectedStudentsForLesson.map(s => ({
        student_id: s.id,
        payment_choice: s.payment_choice // 'subscription' або ID з прайсу
    }));

    const data = {
        group_id: parseInt(document.getElementById('groupId').value),
        trainer_id: parseInt(document.getElementById('trainerId').value),
        students_data: studentAssignments, // Відправляємо розширені дані
        lesson_date: document.getElementById('lessonDate').value
    };

    try {
        await assignmentsAPI.create(data);
        closeAssignmentModal();
        loadAllData();
        showNotification('Призначення створено', 'success');
    } catch (err) {
        alert('Помилка: ' + err.message);
    }
});

async function deleteAssignment(id) {
    if (confirm('Видалити це призначення?')) {
        try {
            await assignmentsAPI.delete(id);
            loadAllData();
        } catch (err) { alert('Помилка'); }
    }
}