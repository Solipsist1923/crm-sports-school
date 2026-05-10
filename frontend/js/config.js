// API Configuration - FORCE HTTPS
const protocol = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? window.location.protocol
    : 'https:'; // На Railway завжди https
const API_BASE_URL = protocol + '//' + window.location.hostname + (window.location.port && protocol === 'http:' ? ':' + window.location.port : '');

console.log('API_BASE_URL:', API_BASE_URL);

// Local Storage Keys
const TOKEN_KEY = 'crm_token';
const REFRESH_TOKEN_KEY = 'crm_refresh_token';
const USER_KEY = 'crm_user';
