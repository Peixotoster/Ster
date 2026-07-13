// ============================================
// STER - Sistema de Gestão
// Arquivo JavaScript Único
// ============================================

const LifeOS = {
    // ===== DADOS GLOBAIS =====
    user: null,
    tasks: [],
    habits: [],
    finances: [],

    // ===== INICIALIZAÇÃO =====
    init() {
        this.loadUser();
        this.loadData();
        this.setupEventListeners();
    },

    // ===== HOME =====
    initHome() {
        console.log('🏠 Página inicial carregada');
    },

    // ===== LOGIN =====
    initLogin() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.loginUser();
            });
        }
    },

    loginUser() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Validação básica
        if (!email || !password) {
            this.showError('Preencha todos os campos');
            return;
        }

        // Simular login
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            window.location.href = '/dashboard.html';
        } else {
            this.showError('E-mail ou senha inválidos');
        }
    },

    // ===== REGISTER =====
    initRegister() {
        const form = document.getElementById('registerForm');
        const passwordInput = document.getElementById('password');

        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                this.checkPasswordStrength(passwordInput.value);
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.registerUser();
            });
        }
    },

    registerUser() {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

        // Validações
        if (!name || !email || !password || !confirm) {
            this.showError('Preencha todos os campos');
            return;
        }

        if (password.length < 6) {
            this.showError('A senha deve ter no mínimo 6 caracteres');