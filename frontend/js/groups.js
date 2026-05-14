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
        
        // Налаштовуємо перемикання time-inputs при кліку на день
        document.querySelectorAll('.day-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                const day = this.value;
                const startInput = document.querySelector(`.start-time[data-day="${day}"]`);
                const endInput = document.querySelector(`.end-time[data-day="${day}"]`);
                if (startInput) startInput.disabled = !this.checked;
                if (endInput) endInput.disabled = !this.checked;
            });
        });
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
        const groupTypeText = group.is_individual ? 'Індивідуальне' : 'Групове';

        return `
            <div class="group-card">
                <div class="group-header">
                    <h3>${group.name}</h3>
                </div>
                <div class="group-info">
                    <div class="info-item">
                        <i class="fas fa-star"></i>
                        <span>${groupTypeText}</span>
                    </div>
                    ${group.schedule ? `
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>${group.schedule}</span>
                    </div>` : ''}
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

function collectScheduleFromUI() {
    const days = [];
    document.querySelectorAll('.day-checkbox').forEach(cb => {
        if (cb.checked) {
            const day = cb.value;
            const start = document.querySelector(`.start-time[data-day="${day}"]`).value;
            const end = document.querySelector(`.end-time[data-day="${day}"]`).value;
            if (start && end) {
                days.push(`${day} ${start}-${end}`);
            } else {
                days.push(day);
            }
        }
    });
    return days.length > 0 ? days.join(', ') : null;
}

function populateScheduleUI(scheduleStr) {
    document.querySelectorAll('.day-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.time-input').forEach(inp => { inp.value = ''; inp.disabled = true; });

    if (!scheduleStr) return;

    scheduleStr.split(', ').forEach(part => {
        const parts = part.trim().split(' ');
        const day = parts[0];
        if (parts.length >= 3) {
            const timeRange = parts[1];
            const timeEnd = parts.slice(2).join(' ');
            const timeStr = parts.slice(1).join('');
            const match = timeStr.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
            if (match) {
                const start = match[1];
                const end = match[2];
                const cb = document.querySelector(`.day-checkbox[value="${day}"]`);
                if (cb) cb.checked = true;
                const startInput = document.querySelector(`.start-time[data-day="${day}"]`);
                const endInput = document.querySelector(`.end-time[data-day="${day}"]`);
                if (startInput) { startInput.value = start; startInput.disabled = false; }
                if (endInput) { endInput.value = end; endInput.disabled = false; }
                return;
            }
        }
        const cb = document.querySelector(`.day-checkbox[value="${day}"]`);
        if (cb) cb.checked = true;
    });
}

function openAddGroupModal() {
    document.getElementById('modalTitle').textContent = 'Додати групу';
    document.getElementById('groupForm').reset();
    document.getElementById('groupId').value = '';
    
    document.getElementById('lessonType').value = 'gymnastics';
    document.getElementById('isIndividual').checked = false;
    populateScheduleUI(null);
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
        populateScheduleUI(group.schedule);

        document.getElementById('groupModal').classList.add('show');
    } catch (error) {
        console.error('Error loading group:', error);
        showNotification('Помилка завантаження даних групи', 'error');
    }
}

async function deleteGroup(id) {
    if (!confirm('Ви впевнені, що хочете видалити цю групу?')) {
        return;
    }

    try {
        await groupsAPI.delete(id);
        await loadGroups();
        showNotification('Групу видалено', 'success');
    } catch (error) {
        console.error('Помилка при видаленні групи:', error);
        showNotification('Не вдалося видалити групу', 'error');
    }
}

document.getElementById('groupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const groupId = document.getElementById('groupId').value;

    const groupData = {
        name: document.getElementById('groupName').value,
        schedule: collectScheduleFromUI(),
        lesson_type: document.getElementById('lessonType').value,
        is_individual: document.getElementById('isIndividual').checked
    };

    try {
        if (groupId) {
            await groupsAPI.update(groupId, groupData);
            showNotification('Групу оновлено', 'success');
        } else {
            await groupsAPI.create(groupData);
            showNotification('Групу додано', 'success');
        }

        closeGroupModal();
        const updatedGroups = await loadGroups();
        renderGroups(updatedGroups);
    } catch (error) {
        console.error('Error saving group:', error);
        showNotification('Помилка збереження даних', 'error');
    }
});
