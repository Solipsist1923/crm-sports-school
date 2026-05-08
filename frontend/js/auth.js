// Login Page Logic

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Hide previous errors
        errorMessage.classList.remove('show');
        errorMessage.textContent = '';

        // Disable submit button
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Вхід...</span>';

        try {
            console.log('Attempting login with:', username);
            await authAPI.login(username, password);
            const user = await authAPI.getMe();
            console.log('User data saved:', user);
            console.log('User info retrieved, redirecting...');
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'Невірний логін або пароль: ' + (error.message || error);
            errorMessage.classList.add('show');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Увійти</span><i class="fas fa-arrow-right"></i>';
        }
    });
});
