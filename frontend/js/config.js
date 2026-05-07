// API Configuration
// Завжди використовуємо HTTPS на production, HTTP тільки для localhost
let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = window.location.origin;
} else {
    // На production завжди HTTPS
    API_BASE_URL = 'https://' + window.location.hostname;
}

// Local Storage Keys
const TOKEN_KEY = 'crm_token';
const USER_KEY = 'crm_user';

// Version: 3.0 - Force HTTPS on production
