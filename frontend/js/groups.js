// Groups Page Logic

let allGroups = [];
let allStudents = [];
let allTrainers = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        requireAuth();
        loadUserInfo();
        
        // Налаштовуємо меню відразу
        setupMobileMenu();
        
        // Чекаємо завантаження даних, але продовжуємо навіть при помилці в одному з них
        await Promise.allSettled([
            loadStudents(),
            loadGroups()
        ]);
        
        // Малюємо те, що вдалося завантажити
        renderGroups(allGroups);
        setupScheduleBuilder();
    } catch (err) {
        console.error('Помилка ініціалізації сторінки груп:', err);
    }
});

async function loadStudents() {
    try {
        allStudents = await studentsAPI.getAll();
    } catch (error) {
        console.error('Error loading students:', error);
        allStudents = [];
    }
}

async function loadGroups() {
    try {
        allGroups = await groupsAPI.getAll();
        renderGroups(allGroups);
        return allGroups;
    } catch (error) {
        console.error('Error loading groups:', error);
        document.getElementById('groupsGrid').innerHTML =
            '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Помилка завантаження груп</div>';
        allGroups = [];
        throw error;
    }
}

function renderGroups(groups) {
    const grid = document.getElementById('groupsGrid');
    if (!grid) return;

    if (!groups || groups.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Немає груп</div>';
        return;
    }

    grid.innerHTML = groups.map(group => {
        const typeName = group.lesson_type === 'acrobatics' ? 'Акробатика' : 'Гімнастика';

        return `
            <div class="group-card">
                <div class="group-header">
                    <h3>${group.name}</h3>
                </div>
                <div class="group-info">
                    <div class="info-item">
                        <i class="fas fa-star"></i>
                        <span>${typeName} ${group.is_individual ? '(Інд.)' : ''}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <span>${group.schedule || 'Розклад не вказано'}</span>
                    </div>
                </div>
                <div class="group-actions">
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
            const timeInputs = document.querySelectorAll(`.time-input[data-day="${day}"]`);
            timeInputs.forEach(input => {
                input.disabled = !this.checked;
                if (!this.checked) input.value = '';
            });
        });
    });
}

function getScheduleFromBuilder() {
    const schedule = [];
    document.querySelectorAll('.day-checkbox:checked').forEach(checkbox => {
        const day = checkbox.value;
        const start = document.querySelector(`.time-input.start-time[data-day="${day}"]`).value;
        const end = document.querySelector(`.time-input.end-time[data-day="${day}"]`).value;
        if (start && end) {
            schedule.push(`${day} ${start}-${end}`);
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

    // Parse schedule like "Понеділок 16:00-17:30, Середа 16:00-17:30"
    const parts = scheduleText.split(',').map(s => s.trim());
    parts.forEach(part => {
        const match = part.match(/^(.+?)\s+(\d{2}:\d{2})(?:-(\d{2}:\d{2}))?/);
        if (match) {
            const day = match[1];
            const start = match[2];
            const end = match[3];
            const checkbox = document.querySelector(`.day-checkbox[value="${day}"]`);
            const startInput = document.querySelector(`.time-input.start-time[data-day="${day}"]`);
            const endInput = document.querySelector(`.time-input.end-time[data-day="${day}"]`);
            if (checkbox && startInput) {
                checkbox.checked = true;
                startInput.disabled = false;
                startInput.value = start;
                if (endInput && end) {
                    endInput.disabled = false;
                    endInput.value = end;
                }
            }
        }
    });
}

function openAddGroupModal() {
    document.getElementById('modalTitle').textContent = 'Додати групу';
    document.getElementById('groupForm').reset();
    document.getElementById('groupId').value = '';
    
    document.getElementById('lessonType').value = 'gymnastics';
    document.getElementById('isIndividual').checked = false;

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
        
        document.getElementById('lessonType').value = group.lesson_type || 'gymnastics';
        document.getElementById('isIndividual').checked = group.is_individual || false;

        setScheduleToBuilder(group.schedule);

        document.getElementById('groupModal').classList.add('show');
    } catch (error) {
        console.error('Error loading group:', error);
        alert('Помилка завантаження даних групи');
    }
}

async function deleteGroup(id) {
    if (!confirm('Ви впевнені, що хочете видалити цю групу?')) {
        return;
    }

    try {
        await groupsAPI.delete(id);
        await loadGroups();
        alert('Групу видалено');
    } catch (error) {
        console.error('Помилка при видаленні групи:', error);
        alert('Не вдалося видалити групу');
    }
}

document.getElementById('groupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const groupId = document.getElementById('groupId').value;
    const schedule = getScheduleFromBuilder();

    const groupData = {
        name: document.getElementById('groupName').value,
        schedule: schedule || null,
        lesson_type: document.getElementById('lessonType').value,
        is_individual: document.getElementById('isIndividual').checked
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
        const updatedGroups = await loadGroups();
        renderGroups(updatedGroups);
    } catch (error) {
        console.error('Error saving group:', error);
        alert('Помилка збереження даних');
    }
});
