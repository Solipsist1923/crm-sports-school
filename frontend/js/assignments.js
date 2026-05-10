let allAssignments = [];
let allGroups = [];
let allTrainers = [];
let allStudents = [];
let allPrices = [];

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
        setupPriceToggle();
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

    renderAssignments(allAssignments);
    populateSelects();
}

function populateSelects() {
    const groupSelect = document.getElementById('groupId');
    const trainerSelect = document.getElementById('trainerId');
    const priceSelect = document.getElementById('priceId');
    const studentList = document.getElementById('studentsChecklist');

    groupSelect.innerHTML = '<option value="">Оберіть групу...</option>' + 
        allGroups.map(g => `<option value="${g.id}">${g.name} (${g.schedule || ''})</option>`).join('');

    trainerSelect.innerHTML = '<option value="">Оберіть тренера...</option>' + 
        allTrainers.map(t => `<option value="${t.id}">${t.first_name} ${t.last_name}</option>`).join('');

    priceSelect.innerHTML = '<option value="">Оберіть послугу...</option>' + 
        allPrices.map(p => `<option value="${p.id}">${p.name} - ${p.price} грн</option>`).join('');

    studentList.innerHTML = allStudents.map(s => `
        <label class="checkbox-label" style="display: flex; margin-bottom: 8px;">
            <input type="checkbox" name="student" value="${s.id}">
            <span style="margin-left: 10px;">${s.first_name} ${s.last_name}</span>
        </label>
    `).join('');
}

function setupPriceToggle() {
    const isSub = document.getElementById('isSubscription');
    const priceGroup = document.getElementById('priceSelectionGroup');
    isSub.addEventListener('change', () => {
        priceGroup.style.display = isSub.checked ? 'none' : 'block';
    });
}

function renderAssignments(assignments) {
    const tbody = document.getElementById('assignmentsTable');
    if (!assignments || assignments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Журнал порожній. Створіть перше призначення!</td></tr>';
        return;
    }

    tbody.innerHTML = assignments.map(a => `
        <tr>
            <td><strong>${formatDate(a.lesson_date)}</strong></td>
            <td>${a.group?.name || 'Видалена група'}</td>
            <td>${a.trainer?.first_name} ${a.trainer?.last_name}</td>
            <td><span class="badge badge-info">${a.students?.length || 0} учнів</span></td>
            <td>${a.is_subscription ? 'Абонемент' : 'Разово'}</td>
            <td>
                <button class="btn-icon btn-danger" onclick="deleteAssignment(${a.id})" title="Видалити">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openAddAssignmentModal() {
    document.getElementById('assignmentForm').reset();
    document.getElementById('priceSelectionGroup').style.display = 'none';
    document.getElementById('assignmentModal').classList.add('show');
}

function closeAssignmentModal() {
    document.getElementById('assignmentModal').classList.remove('show');
}

document.getElementById('assignmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const selectedStudents = Array.from(document.querySelectorAll('input[name="student"]:checked'))
        .map(cb => parseInt(cb.value));

    if (selectedStudents.length === 0) {
        alert('Будь ласка, виберіть хоча б одного учня');
        return;
    }

    const data = {
        group_id: parseInt(document.getElementById('groupId').value),
        trainer_id: parseInt(document.getElementById('trainerId').value),
        student_ids: selectedStudents,
        lesson_date: document.getElementById('lessonDate').value,
        is_subscription: document.getElementById('isSubscription').checked,
        price_id: document.getElementById('isSubscription').checked ? null : parseInt(document.getElementById('priceId').value)
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