// API Helper Functions

// Get token from localStorage
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Set token to localStorage
function setTokens(accessToken, refreshToken) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

// Remove token from localStorage
function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// Get user from localStorage
function getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

// Set user to localStorage
function setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// Оновлення токена доступу
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('Відсутній токен оновлення');

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!response.ok) throw new Error('Не вдалося оновити токен');

        const data = await response.json();
        setTokens(data.access_token, data.refresh_token);
        console.log('Токен успішно оновлено');
        return data.access_token;
    } catch (error) {
        console.error('Помилка оновлення сесії:', error);
        removeToken();
        window.location.href = 'login.html';
        throw error;
    }
}

// API Request wrapper
async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        // Якщо 401 і це НЕ запит на авторизацію/оновлення
        if (response.status === 401 && !options._retry && !endpoint.includes('/auth/')) {
            options._retry = true;
            try {
                const newAccessToken = await refreshAccessToken();
                const retryHeaders = {
                    ...headers,
                    'Authorization': `Bearer ${newAccessToken}`
                };
                return await apiRequest(endpoint, { ...options, headers: retryHeaders });
            } catch (refreshError) {
                return;
            }
        }

        // Якщо 204 No Content - не парсимо JSON
        if (response.status === 204) {
            return null;
        }

        // Безпечний парсинг JSON
        let data;
        const contentType = response.headers.get("content-type");
        try {
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                data = { detail: await response.text() || response.statusText };
            }
        } catch (e) { data = { detail: "Error parsing response" }; }

        if (!response.ok) {
            throw new Error(data.detail || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth API
const authAPI = {
    async login(username, password) {
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        setTokens(data.access_token, data.refresh_token);
        return data;
    },

    async getMe() {
        const user = await apiRequest('/api/auth/me');
        setUser(user);
        return user;
    },

    logout() {
        removeToken();
        window.location.href = 'login.html';
    }
};

// Students API
const studentsAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await apiRequest(`/api/students?${queryString}`);
    },

    async getById(id) {
        return await apiRequest(`/api/students/${id}`);
    },

    async create(student) {
        return await apiRequest('/api/students', {
            method: 'POST',
            body: JSON.stringify(student)
        });
    },

    async update(id, student) {
        return await apiRequest(`/api/students/${id}`, {
            method: 'PUT',
            body: JSON.stringify(student)
        });
    },

    async delete(id) {
        return await apiRequest(`/api/students/${id}`, {
            method: 'DELETE'
        });
    }
};

// Attendance API
const attendanceAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await apiRequest(`/api/attendance?${queryString}`);
    },

    async getByDate(date) {
        return await apiRequest(`/api/attendance/date/${date}`);
    },

    async getByStudent(studentId) {
        return await apiRequest(`/api/attendance/student/${studentId}`);
    },

    async mark(attendance) {
        return await apiRequest('/api/attendance', {
            method: 'POST',
            body: JSON.stringify(attendance)
        });
    },

    async update(id, attendance) {
        return await apiRequest(`/api/attendance/${id}`, {
            method: 'PUT',
            body: JSON.stringify(attendance)
        });
    },

    async delete(id) {
        return await apiRequest(`/api/attendance/${id}`, {
            method: 'DELETE'
        });
    }
};

// Payments API
const paymentsAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await apiRequest(`/api/payments?${queryString}`);
    },

    async getOverdue() {
        return await apiRequest('/api/payments/overdue');
    },

    async getByStudent(studentId) {
        return await apiRequest(`/api/payments/student/${studentId}`);
    },

    async create(payment) {
        return await apiRequest('/api/payments', {
            method: 'POST',
            body: JSON.stringify(payment)
        });
    },

    async update(id, payment) {
        return await apiRequest(`/api/payments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payment)
        });
    },

    async delete(id) {
        return await apiRequest(`/api/payments/${id}`, {
            method: 'DELETE'
        });
    }
};

// Stats API
const statsAPI = {
    async getDashboard() {
        return await apiRequest('/api/stats/dashboard');
    },

    async getAttendance(limit = 50) {
        return await apiRequest(`/api/stats/attendance?limit=${limit}`);
    }
};

// Groups API
const groupsAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await apiRequest(`/api/groups?${queryString}`);
    },

    async getById(id) {
        return await apiRequest(`/api/groups/${id}`);
    },

    async create(group) {
        return await apiRequest('/api/groups', {
            method: 'POST',
            body: JSON.stringify(group)
        });
    },

    async update(id, group) {
        return await apiRequest(`/api/groups/${id}`, {
            method: 'PUT',
            body: JSON.stringify(group)
        });
    },

    async delete(id) {
        return await apiRequest(`/api/groups/${id}`, {
            method: 'DELETE'
        });
    }
};

// Trainers API
const trainersAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await apiRequest(`/api/trainers?${queryString}`);
    },

    async getById(id) {
        return await apiRequest(`/api/trainers/${id}`);
    }
};

// Utility Functions
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('uk-UA');
}

function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('uk-UA');
}

function showError(message) {
    alert(message);
}

function showSuccess(message) {
    alert(message);
}

// Show users menu for admin
function showUsersMenuForAdmin() {
    const user = getUser();
    if (user && user.role === 'admin') {
        const usersLink = document.getElementById('usersLink');
        if (usersLink) {
            usersLink.style.display = 'flex';
        }
    }
}

// Call this on page load
document.addEventListener('DOMContentLoaded', function() {
    showUsersMenuForAdmin();
});
