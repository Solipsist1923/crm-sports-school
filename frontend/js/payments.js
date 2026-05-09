// Payments Page Logic

let allStudents = [];
let allPayments = [];

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    loadUserInfo();

    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDate').value = today;

    await Promise.all([
        loadStudents(),
        loadPayments()
    ]).then(() => {
        setupFilters();
        setupMobileMenu();
    });
});

function loadUserInfo() {
    try {
        const user = getUser();
        if (!user) return;
        
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRoleDisplay');
        
        if (nameEl) nameEl.textContent = user.full_name || 'Користувач';
        if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Адміністратор' : 'Тренер';
    } catch (err) {
        console.error('Error loading user info:', err);
    }
}

function setupMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle && sidebar && overlay) {
        const toggleMenu = () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        };

        toggle.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                }
            });
        });
    }
}

async function loadStudents() {
    try {
        allStudents = await studentsAPI.getAll({ is_active: true });

        // Populate student selects
        const studentFilter = document.getElementById('studentFilter');
        const datalist = document.getElementById('studentsDatalist');

        const filterOptions = allStudents.map(s =>
            `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`
        ).join('');

        const datalistOptions = allStudents.map(s =>
            `<option value="${s.first_name} ${s.last_name} (ID: ${s.id})">`
        ).join('');

        if (studentFilter) studentFilter.innerHTML = '<option value="">Всі учні</option>' + filterOptions;
        if (datalist) datalist.innerHTML = datalistOptions;
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

async function loadPayments() {
    try {
        allPayments = await paymentsAPI.getAll({ limit: 100 });
        renderPayments(allPayments);
    } catch (error) {
        console.error('Error loading payments:', error);
        document.getElementById('paymentsTable').innerHTML =
            '<tr><td colspan="7" class="text-center">Помилка завантаження даних</td></tr>';
    }
}

function renderPayments(payments) {
    const tbody = document.getElementById('paymentsTable');

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Немає оплат</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(p => {
        const student = allStudents.find(s => s.id === p.student_id);
        const studentName = student ? `${student.first_name} ${student.last_name}` : `ID: ${p.student_id}`;

        return `
            <tr>
                <td>${studentName}</td>
                <td>${p.amount} грн</td>
                <td>
                    <span class="badge ${getTypeBadgeClass(p.payment_type)}">
                        ${getTypeText(p.payment_type)}
                    </span>
                </td>
                <td>${formatDate(p.payment_date)}</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(p.status)}">
                        ${getStatusText(p.status)}
                    </span>
                </td>
                <td>
                    <button class="btn-icon btn-danger" onclick="deletePayment(${p.id})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getTypeBadgeClass(type) {
    switch (type) {
        case 'single': return 'badge-info';
        case 'subscription': return 'badge-success';
        case 'insurance': return 'badge-warning';
        case 'fund': return 'badge-info';
        default: return '';
    }
}

function getTypeText(type) {
    switch (type) {
        case 'single': return 'Разова оплата';
        case 'subscription': return 'Абонемент';
        default: return type;
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'paid': return 'badge-success';
        case 'pending': return 'badge-warning';
        case 'overdue': return 'badge-danger';
        default: return '';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'paid': return 'Оплачено';
        case 'pending': return 'Очікується';
        case 'overdue': return 'Прострочено';
        default: return status;
    }
}

function setupFilters() {
    document.getElementById('studentFilter').addEventListener('change', filterPayments);
    document.getElementById('typeFilter').addEventListener('change', filterPayments);
    document.getElementById('statusFilter').addEventListener('change', filterPayments);
}

function filterPayments() {
    const studentId = document.getElementById('studentFilter').value;
    const type = document.getElementById('typeFilter').value;
    const status = document.getElementById('statusFilter').value;

    let filtered = allPayments;

    if (studentId) {
        filtered = filtered.filter(p => p.student_id == studentId);
    }

    if (type) {
        filtered = filtered.filter(p => p.payment_type === type);
    }

    if (status) {
        filtered = filtered.filter(p => p.status === status);
    }

    renderPayments(filtered);
}

async function showOverdue() {
    try {
        const overdue = await paymentsAPI.getOverdue();
        renderPayments(overdue);
    } catch (error) {
        console.error('Error loading overdue payments:', error);
        alert('Помилка завантаження прострочених оплат');
    }
}

function openAddPaymentModal() {
    document.getElementById('paymentForm').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDate').value = today;
    document.getElementById('paymentModal').classList.add('show');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('show');
}

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const searchValue = document.getElementById('paymentStudentSearch').value;
    const idMatch = searchValue.match(/\(ID: (\d+)\)$/);
    const studentId = idMatch ? parseInt(idMatch[1]) : null;

    if (!studentId) {
        alert('Будь ласка, оберіть учня зі списку запропонованих');
        return;
    }

    const paymentData = {
        student_id: studentId,
        amount: parseFloat(document.getElementById('paymentAmount').value),
        payment_type: document.getElementById('paymentType').value,
        payment_date: document.getElementById('paymentDate').value,
        status: 'paid',
        notes: document.getElementById('paymentNotes').value || null
    };

    try {
        await paymentsAPI.create(paymentData);
        alert('Оплату додано');
        closePaymentModal();
        const updatedPayments = await loadPayments();
        renderPayments(updatedPayments);
    } catch (error) {
        console.error('Error creating payment:', error);
        alert('Помилка: ' + (error.message || 'Не вдалося додати оплату'));
    }
});

async function deletePayment(id) {
    if (!confirm('Ви впевнені, що хочете видалити цю оплату?')) {
        return;
    }

    try {
        await paymentsAPI.delete(id);
        await loadPayments();
        alert('Оплату видалено');
    } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Помилка видалення');
    }
}

function logout() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        authAPI.logout();
    }
}

function setupMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle && sidebar && overlay) {
        const toggleMenu = () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        };

        toggle.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                }
            });
        });
    }
}
