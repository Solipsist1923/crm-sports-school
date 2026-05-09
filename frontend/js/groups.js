// Groups Page Logic

let allGroups = [];
let allStudents = [];
let allTrainers = [];

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    loadUserInfo();
    
    Promise.all([
        loadTrainers(),
        loadStudents(),
        loadGroups()
    ]).then(() => {
        setupScheduleBuilder();
        setupMobileMenu();
    }).catch(err => console.error('Помилка завантаження груп:', err));
});

function loadUserInfo() {
    const user = getUser();
    if (user) {
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRoleDisplay');
        
        if (nameEl) nameEl.textContent = user.full_name;
        if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Адміністратор' : 'Тренер';
    }
}

async function loadTrainers() {
    try {
        allTrainers = await trainersAPI.getAll();

        // Populate trainer select
        const select = document.getElementById('trainerId');
        select.innerHTML = '<option value="">Без тренера</option>' +
            allTrainers.map(t => `<option value="${t.id}">${t.first_name} ${t.last_name}</option>`).join('');
    } catch (error) {
        console.error('Error loading trainers:', error);
    }
}

async function loadStudents() {
    try {
        allStudents = await studentsAPI.getAll();
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

async function loadGroups() {
    try {
        allGroups = await groupsAPI.getAll();
        renderGroups(allGroups);
    } catch (error) {
        console.error('Error loading groups:', error);
        document.getElementById('groupsGrid').innerHTML =
            '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Помилка завантаження груп</div>';
    }
}

function renderGroups(groups) {
    const grid = document.getElementById('groupsGrid');

    if (groups.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Немає груп</div>';
        return;
    }

    // Створюємо мапу кількості учнів заздалегідь (це швидше)
    const studentCounts = allStudents.reduce((acc, s) => {
        if (s.group_id) acc[s.group_id] = (acc[s.group_id] || 0) + 1;
        return acc;
    }, {});

    grid.innerHTML = groups.map(group => {
        const studentsInCount = studentCounts[group.id] || 0;
        const trainer = allTrainers.find(t => t.id === group.trainer_id);
        const trainerName = trainer ? `${trainer.first_name} ${trainer.last_name}` : 'Не призначено';

        return `
            <div class="group-card">
                <div class="group-header">
                    <h3>${group.name}</h3>
                    <span class="badge ${group.is_active ? 'badge-success' : 'badge-danger'}">
                        ${group.is_active ? 'Активна' : 'Неактивна'}
                    </span>
                </div>
                <div class="group-info">
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <span>${group.schedule || 'Розклад не вказано'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <span>Тренер: ${trainerName}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users"></i>
                        <span>Учнів: ${studentsInCount} / ${group.max_students}</span>
                    </div>
                </div>
                <div class="group-actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewGroupStudents(${group.id})">
                        <i class="fas fa-eye"></i>
                        Переглянути
                    </button>
                    <button class="btn-icon" onclick="editGroup(${group.id})" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteGroup(${group.id})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function setupScheduleBuilder() {
    // Enable/disable time inputs based on checkbox
    document.querySelectorAll('.day-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const day = this.value;
            const timeInput = document.querySelector(`.time-input[data-day="${day}"]`);
            timeInput.disabled = !this.checked;
            if (!this.checked) {
                timeInput.value = '';
            }
        });
    });
}

function getScheduleFromBuilder() {
    const schedule = [];
    document.querySelectorAll('.day-checkbox:checked').forEach(checkbox => {
        const day = checkbox.value;
        const timeInput = document.querySelector(`.time-input[data-day="${day}"]`);
        if (timeInput.value) {
            schedule.push(`${day} ${timeInput.value}`);
        }
    });
    return schedule.join(', ');
}

function setScheduleToBuilder(scheduleText) {
    // Reset all
    document.querySelectorAll('.day-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.time-input').forEach(input => {
        input.disabled = true;
        input.value = '';
    });

    if (!scheduleText) return;

    // Parse schedule like "Понеділок 16:00, Середа 16:00"
    const parts = scheduleText.split(',').map(s => s.trim());
    parts.forEach(part => {
        const match = part.match(/^(.+?)\s+(\d{2}:\d{2})/);
        if (match) {
            const day = match[1];
            const time = match[2];
            const checkbox = document.querySelector(`.day-checkbox[value="${day}"]`);
            const timeInput = document.querySelector(`.time-input[data-day="${day}"]`);
            if (checkbox && timeInput) {
                checkbox.checked = true;
                timeInput.disabled = false;
                timeInput.value = time;
            }
        }
    });
}

function openAddGroupModal() {
    document.getElementById('modalTitle').textContent = 'Додати групу';
    document.getElementById('groupForm').reset();
    document.getElementById('groupId').value = '';

    // Reset schedule builder
    document.querySelectorAll('.day-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.time-input').forEach(input => {
        input.disabled = true;
        input.value = '';
    });

    document.getElementById('groupModal').classList.add('show');
}


function closeGroupModal() {
    document.getElementById('groupModal').classList.remove('show');
}

async function editGroup(id) {
    try {
        const group = await groupsAPI.getById(id);

        document.getElementById('modalTitle').textContent = 'Редагувати групу';
        document.getElementById('groupId').value = group.id;
        document.getElementById('groupName').value = group.name;
        document.getElementById('trainerId').value = group.trainer_id || '';
        document.getElementById('maxStudents').value = group.max_students;

        setScheduleToBuilder(group.schedule);

        document.getElementById('groupModal').classList.add('show');
    } catch (error) {
        console.error('Error loading group:', error);
        alert('Помилка завантаження даних групи');
    }
}

async function deleteGroup(id) {
    const studentsInGroup = allStudents.filter(s => s.group_id === id).length;

    if (studentsInGroup > 0) {
        if (!confirm(`У цій групі ${studentsInGroup} учнів. Ви впевнені, що хочете видалити групу?`)) {
            return;
        }
    } else {
        if (!confirm('Ви впевнені, що хочете видалити цю групу?')) {
            return;
        }
    }

    try {
        console.log('Deleting group:', id);
        await groupsAPI.delete(id);
        console.log('Group deleted successfully');
        await loadGroups();
        alert('Групу видалено');
    } catch (error) {
        console.error('Error deleting group:', error);
        alert(`Помилка видалення групи: ${error.message || 'Невідома помилка'}`);
    }
}

function viewGroupStudents(groupId) {
    window.location.href = `students.html?groupId=${groupId}`;
}

document.getElementById('groupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const groupId = document.getElementById('groupId').value;
    const schedule = getScheduleFromBuilder();

    const groupData = {
        name: document.getElementById('groupName').value,
        schedule: schedule || null,
        trainer_id: document.getElementById('trainerId').value ? parseInt(document.getElementById('trainerId').value) : null,
        max_students: parseInt(document.getElementById('maxStudents').value)
    };

    try {
        if (groupId) {
            await groupsAPI.update(groupId, groupData);
            alert('Групу оновлено');
        } else {
            await groupsAPI.create(groupData);
            alert('Групу додано');
        }

        closeGroupModal();
        await loadGroups();
    } catch (error) {
        console.error('Error saving group:', error);
        alert('Помилка збереження даних');
    }
});

function logout() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        authAPI.logout();
    }
}
