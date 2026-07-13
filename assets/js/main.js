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
            return;
        }

        if (password !== confirm) {
            this.showError('As senhas não coincidem');
            return;
        }

        if (!terms) {
            this.showError('Você precisa aceitar os termos');
            return;
        }

        // Verificar se usuário já existe
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.find(u => u.email === email)) {
            this.showError('Este e-mail já está cadastrado');
            return;
        }

        // Salvar usuário
        const newUser = {
            id: Date.now(),
            name,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(newUser));

        // Redirecionar
        window.location.href = '/dashboard.html';
    },

    // ===== DASHBOARD =====
    initDashboard() {
        this.loadUser();
        this.loadData();
        this.updateDashboard();
        this.updateDate();
        this.setupLogout();
    },

    updateDashboard() {
        // Atualizar nome do usuário
        const userNameEl = document.getElementById('userName');
        if (userNameEl && this.user) {
            userNameEl.textContent = this.user.name;
        }

        // Atualizar estatísticas
        this.updateStats();
        this.loadRecentActivities();
    },

    updateStats() {
        // Contar tarefas
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        document.getElementById('taskCount').textContent = tasks.length;

        // Contar hábitos
        const habits = JSON.parse(localStorage.getItem('habits') || '[]');
        document.getElementById('habitCount').textContent = habits.length;

        // Calcular progresso (exemplo)
        const total = tasks.length + habits.length;
        const done = tasks.filter(t => t.done).length + habits.filter(h => h.done).length;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;
        document.getElementById('progressCount').textContent = progress + '%';
    },

    loadRecentActivities() {
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        const list = document.getElementById('activityList');

        if (list) {
            if (activities.length === 0) {
                list.innerHTML = '<p style="color:#999;">Nenhuma atividade recente</p>';
            } else {
                list.innerHTML = activities.slice(0, 5).map(act => `
                    <div class="task-item">
                        <span>${act.icon || '📌'}</span>
                        <span>${act.message}</span>
                        <small style="color:#999;margin-left:auto;">${new Date(act.date).toLocaleDateString()}</small>
                    </div>
                `).join('');
            }
        }
    },

    // ===== TAREFAS =====
    initTasks() {
        this.loadUser();
        this.loadTasks();
        this.renderTasks();
        this.setupTaskFilters();
        this.setupTaskModal();
    },

    loadTasks() {
        this.tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    },

    renderTasks(filter = 'all') {
        const list = document.getElementById('taskList');
        if (!list) return;

        let filtered = this.tasks;

        if (filter === 'pending') {
            filtered = this.tasks.filter(t => !t.done);
        } else if (filter === 'done') {
            filtered = this.tasks.filter(t => t.done);
        } else if (filter === 'high') {
            filtered = this.tasks.filter(t => t.priority === 'alta');
        }

        if (filtered.length === 0) {
            list.innerHTML = `
                <div style="text-align:center;padding:40px;color:#999;">
                    <p>📭 Nenhuma tarefa encontrada</p>
                    <button onclick="LifeOS.showAddTask()" class="btn btn-primary" style="margin-top:12px;">
                        Criar primeira tarefa
                    </button>
                </div>
            `;
            return;
        }

        list.innerHTML = filtered.map(task => `
            <div class="task-item" data-id="${task.id}">
                <div class="task-check">
                    <input type="checkbox" ${task.done ? 'checked' : ''} 
                           onchange="LifeOS.toggleTask(${task.id})">
                </div>
                <div class="task-content">
                    <span class="task-title" style="${task.done ? 'text-decoration:line-through;color:#999;' : ''}">
                        ${task.title}
                    </span>
                    <span class="task-category">📁 ${task.category}</span>
                </div>
                <div class="task-actions">
                    <span class="task-priority ${task.priority}">${task.priority}</span>
                    <button onclick="LifeOS.deleteTask(${task.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    },

    toggleTask(id) {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.done = !task.done;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            this.loadTasks();
            this.renderTasks();
            this.addActivity('✅', `Tarefa "${task.title}" ${task.done ? 'concluída' : 'reaberta'}`);
        }
    },

    deleteTask(id) {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const task = tasks.find(t => t.id === id);
        const filtered = tasks.filter(t => t.id !== id);
        localStorage.setItem('tasks', JSON.stringify(filtered));
        this.loadTasks();
        this.renderTasks();

        if (task) {
            this.addActivity('🗑️', `Tarefa "${task.title}" foi excluída`);
        }
    },

    showAddTask() {
        document.getElementById('taskModal').style.display = 'flex';
    },

    closeModal(id) {
        document.getElementById(id).style.display = 'none';
    },

    setupTaskModal() {
        const form = document.getElementById('taskForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addTask();
            });
        }

        // Fechar modal ao clicar fora
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        };
    },

    addTask() {
        const title = document.getElementById('taskTitle').value;
        const category = document.getElementById('taskCategory').value;
        const priority = document.getElementById('taskPriority').value;
        const deadline = document.getElementById('taskDeadline').value;

        if (!title) {
            alert('Digite um título para a tarefa');
            return;
        }

        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const newTask = {
            id: Date.now(),
            title,
            category,
            priority,
            deadline,
            done: false,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        this.loadTasks();
        this.renderTasks();

        // Fechar modal e limpar formulário
        document.getElementById('taskModal').style.display = 'none';
        document.getElementById('taskForm').reset();

        this.addActivity('📋', `Nova tarefa "${title}" criada`);
    },

    setupTaskFilters() {
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderTasks(btn.dataset.filter);
            });
        });
    },

    // ===== HÁBITOS =====
    // (Funções similares para hábitos - podem ser adicionadas depois)

    // ===== FINANÇAS =====
    // (Funções similares para finanças - podem ser adicionadas depois)

    // ===== UTILITÁRIOS =====
    loadUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.user = JSON.parse(userData);
        } else {
            // Redirecionar para login se não estiver logado
            if (!window.location.pathname.includes('login') && 
                !window.location.pathname.includes('register') &&
                !window.location.pathname.includes('index')) {
                window.location.href = '/login.html';
            }
        }
    },

    loadData() {
        // Carregar dados do localStorage
        this.tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        this.habits = JSON.parse(localStorage.getItem('habits') || '[]');
        this.finances = JSON.parse(localStorage.getItem('finances') || '[]');
    },

    updateDate() {
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            const now = new Date();
            dateEl.textContent = now.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }
    },

    setupLogout() {
        // O logout já está no onclick do botão
    },

    logout() {
        if (confirm('Tem certeza que deseja sair?')) {
            localStorage.removeItem('currentUser');
            window.location.href = '/login.html';
        }
    },

    togglePassword(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.type = field.type === 'password' ? 'text' : 'password';
        }
    },

    checkPasswordStrength(password) {
        const el = document.getElementById('passwordStrength');
        if (!el) return;

        if (password.length === 0) {
            el.textContent = '';
            el.style.color = '';
            return;
        }

        let strength = 'Fraca';
        let color = '#ff4444';

        if (password.length >= 6) {
            strength = 'Média';
            color = '#ffbb33';
        }
        if (password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password)) {
            strength = 'Forte';
            color = '#4caf50';
        }

        el.textContent = `Força da senha: ${strength}`;
        el.style.color = color;
    },

    showError(message) {
        const errorEl = document.getElementById('loginError') || document.getElementById('registerError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';

            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    },

    addActivity(icon, message) {
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        activities.unshift({
            icon,
            message,
            date: new Date().toISOString()
        });

        // Manter apenas últimas 50 atividades
        if (activities.length > 50) {
            activities.length = 50;
        }

        localStorage.setItem('activities', JSON.stringify(activities));
    },

    // ===== INICIALIZAÇÃO AUTOMÁTICA =====
    // Esta função é chamada quando a página carrega
    autoInit() {
        this.init();

        // Detectar página atual e inicializar
        const path = window.location.pathname;
        if (path.includes('dashboard')) {
            this.initDashboard();
        } else if (path.includes('login')) {
            this.initLogin();
        } else if (path.includes('register')) {
            this.initRegister();
        } else if (path.includes('tasks')) {
            this.initTasks();
        } else if (path.includes('index') || path === '/') {
            this.initHome();
        }
    }
};

// ===== INICIALIZAR QUANDO O DOM ESTIVER PRONTO =====
document.addEventListener('DOMContentLoaded', () => {
    LifeOS.autoInit();
});

// ===== EXPORTAR PARA USO GLOBAL =====
window.LifeOS = LifeOS;