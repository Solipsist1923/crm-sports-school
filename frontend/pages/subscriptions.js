document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthAndRedirect();
    await loadUserInfo();
    updateSidebarActiveLink();
    await loadSubscriptions();

    document.getElementById('addSubscriptionBtn').addEventListener('click', openAddSubscriptionModal);
    document.getElementById('subscriptionForm').addEventListener('submit', handleSubscriptionFormSubmit);
    document.getElementById('searchSubscriptions').addEventListener('input', filterSubscriptions);

    // Initial check for admin role to manage button visibility
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        document.getElementById('addSubscriptionBtn').style.display = 'none';
        // Trainer can only view, so disable editing fields in modal if it's opened for view
        // This will be handled when opening the modal for edit/view
    }
});

let allSubscriptions = [];
let allStudents = [];
let allPricelistItems = [];

async function loadSubscriptions() {
    showLoadingSpinner();
    try {
        const subscriptions = await apiGet('/subscriptions/');
        allSubscriptions = subscriptions;
        displaySubscriptions(allSubscriptions);
    } catch (error) {
        console.error('Error loading subscriptions:', error);
        showNotification('Помилка завантаження абонементів.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

function displaySubscriptions(subscriptions) {
    const tbody = document.getElementById('subscriptionsTableBody');
    tbody.innerHTML = '';

    if (subscriptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Абонементів не знайдено.</td></tr>';
        return;
    }

    const userRole = localStorage.getItem('userRole');

    subscriptions.forEach(sub => {
        const row = tbody.insertRow();
        row.insertCell().textContent = sub.student_name;
        row.insertCell().textContent = sub.pricelist_item_name;

        const classesCell = row.insertCell();
        classesCell.textContent = sub.classes_remaining;
        if (sub.classes_remaining === 0) {
            classesCell.classList.add('text-danger'); // Highlight in red
        }
        row.insertCell().textContent = sub.is_active ? 'Активний' : 'Неактивний';

        const actionsCell = row.insertCell();
        actionsCell.classList.add('text-right');

        if (userRole === 'admin') {
            const editBtn = document.createElement('button');
            editBtn.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Редагувати';
            editBtn.onclick = () => openEditSubscriptionModal(sub.id);
            actionsCell.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Видалити';
            deleteBtn.onclick = () => deleteSubscription(sub.id);
            actionsCell.appendChild(deleteBtn);
        } else {
            // Trainer can only view, no actions
            actionsCell.textContent = '—';
        }
    });
}

async function openAddSubscriptionModal() {
    document.getElementById('subscriptionForm').reset();
    document.getElementById('subscriptionId').value = '';
    document.getElementById('subscriptionModalTitle').textContent = 'Додати абонемент';
    document.getElementById('saveSubscriptionBtn').textContent = 'Зберегти';

    await populateStudentAndPricelistDropdowns();

    // Ensure fields are enabled for admin
    document.getElementById('studentSelect').disabled = false;
    document.getElementById('pricelistItemSelect').disabled = false;
    document.getElementById('classesRemaining').disabled = false;
    document.getElementById('saveSubscriptionBtn').style.display = 'inline-block';

    document.getElementById('subscriptionModal').classList.add('active');
}

async function openEditSubscriptionModal(subscriptionId) {
    showLoadingSpinner();
    try {
        const subscription = await apiGet(`/subscriptions/${subscriptionId}`);
        document.getElementById('subscriptionId').value = subscription.id;
        document.getElementById('subscriptionModalTitle').textContent = 'Редагувати абонемент';
        document.getElementById('saveSubscriptionBtn').textContent = 'Оновити';

        await populateStudentAndPricelistDropdowns();

        document.getElementById('studentSelect').value = subscription.student_id;
        document.getElementById('pricelistItemSelect').value = subscription.pricelist_item_id;
        document.getElementById('classesRemaining').value = subscription.classes_remaining;

        const userRole = localStorage.getItem('userRole');
        if (userRole === 'admin') {
            document.getElementById('studentSelect').disabled = false;
            document.getElementById('pricelistItemSelect').disabled = false;
            document.getElementById('classesRemaining').disabled = false;
            document.getElementById('saveSubscriptionBtn').style.display = 'inline-block';
        } else {
            // Trainer can only view
            document.getElementById('studentSelect').disabled = true;
            document.getElementById('pricelistItemSelect').disabled = true;
            document.getElementById('classesRemaining').disabled = true;
            document.getElementById('saveSubscriptionBtn').style.display = 'none'; // Hide save button for trainer
        }

        document.getElementById('subscriptionModal').classList.add('active');
    } catch (error) {
        console.error('Error loading subscription for edit:', error);
        showNotification('Помилка завантаження даних абонемента.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

function closeSubscriptionModal() {
    document.getElementById('subscriptionModal').classList.remove('active');
}

async function populateStudentAndPricelistDropdowns() {
    if (allStudents.length === 0) {
        allStudents = await apiGet('/students_for_dropdown/');
    }
    if (allPricelistItems.length === 0) {
        allPricelistItems = await apiGet('/pricelist_subscriptions/');
    }

    const studentSelect = document.getElementById('studentSelect');
    studentSelect.innerHTML = '<option value="">Оберіть учня...</option>';
    allStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.first_name} ${student.last_name}`;
        studentSelect.appendChild(option);
    });

    const pricelistItemSelect = document.getElementById('pricelistItemSelect');
    pricelistItemSelect.innerHTML = '<option value="">Оберіть вид абонемента...</option>';
    allPricelistItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        pricelistItemSelect.appendChild(option);
    });
}

async function handleSubscriptionFormSubmit(event) {
    event.preventDefault();
    showLoadingSpinner();

    const subscriptionId = document.getElementById('subscriptionId').value;
    const studentId = document.getElementById('studentSelect').value;
    const pricelistItemId = document.getElementById('pricelistItemSelect').value;
    const classesRemaining = document.getElementById('classesRemaining').value;

    const subscriptionData = {
        student_id: parseInt(studentId),
        pricelist_item_id: parseInt(pricelistItemId),
        classes_remaining: parseInt(classesRemaining),
        // start_date and end_date can be added later if needed from the form
    };

    try {
        if (subscriptionId) {
            await apiPut(`/subscriptions/${subscriptionId}`, subscriptionData);
            showNotification('Абонемент успішно оновлено!', 'success');
        } else {
            await apiPost('/subscriptions/', subscriptionData);
            showNotification('Абонемент успішно додано!', 'success');
        }
        closeSubscriptionModal();
        await loadSubscriptions();
    } catch (error) {
        console.error('Error saving subscription:', error);
        showNotification('Помилка збереження абонемента.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

async function deleteSubscription(subscriptionId) {
    if (!confirm('Ви впевнені, що хочете видалити цей абонемент?')) {
        return;
    }
    showLoadingSpinner();
    try {
        await apiDelete(`/subscriptions/${subscriptionId}`);
        showNotification('Абонемент успішно видалено!', 'success');
        await loadSubscriptions();
    } catch (error) {
        console.error('Error deleting subscription:', error);
        showNotification('Помилка видалення абонемента.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

function filterSubscriptions() {
    const searchTerm = document.getElementById('searchSubscriptions').value.toLowerCase();
    const filtered = allSubscriptions.filter(sub =>
        sub.student_name.toLowerCase().includes(searchTerm) ||
        sub.pricelist_item_name.toLowerCase().includes(searchTerm)
    );
    displaySubscriptions(filtered);
}