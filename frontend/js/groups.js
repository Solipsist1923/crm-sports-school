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

function openAddGroupModal() {
    document.getElementById('modalTitle').textContent = 'Додати групу';
    document.getElementById('groupForm').reset();
    document.getElementById('groupId').value = '';
    
    document.getElementById('lessonType').value = 'gymnastics';
    document.getElementById('isIndividual').checked = false;
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
