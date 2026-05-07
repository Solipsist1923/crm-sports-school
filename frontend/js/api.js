// API Helper Functions

// Get token from localStorage
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Set token to localStorage
function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

// Remove token from localStorage
function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
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

        if (response.status === 401) {
            // Unauthorized - redirect to login
            removeToken();
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();

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
        setToken(data.access_token);
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
