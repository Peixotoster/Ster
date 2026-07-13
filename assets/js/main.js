// ============================================
// STER - Sistema de Gestão
// Arquivo JavaScript Único com Supabase
// ============================================

// ============================================
// SUPABASE CONFIG
// ============================================

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sua-chave-anon';

// Criar cliente Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// STER - OBJETO PRINCIPAL
// ============================================

const STER = {
    // ===== DADOS GLOBAIS =====
    user: null,
    currentUser: null,
    session: null,

    // ============================================
    // AUTENTICAÇÃO
    // ============================================

    async init() {
        await this.loadSession();
        this.loadUser();
        this.setupEventListeners();
    },

    async loadSession() {
        try {
            const { data, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            this.session = data.session;
            if (this.session) {
                this.currentUser = this.session.user;
                this.user = this.session.user;
            }
        } catch (error) {
            console.error('Erro ao carregar sessão:', error);
        }
    },

    loadUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.user = JSON.parse(userData);
        }
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

    async loginUser() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            this.showError('Preencha todos os campos');
            return;
        }

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (data.user) {
                this.currentUser = data.user;
                this.user = data.user;
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                window.location.href = '/dashboard.html';
            }
        } catch (error) {
            this.showError(error.message || 'Erro ao fazer login');
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

    async registerUser() {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

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

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name }
                }
            });

            if (error) throw error;

            if (data.user) {
                this.currentUser = data.user;
                this.user = data.user;
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                window.location.href = '/dashboard.html';
            }
        } catch (error) {
            this.showError(error.message || 'Erro ao cadastrar');
        }
    },

    // ===== DASHBOARD =====
    async initDashboard() {
        this.loadUser();
        await this.loadSession();
        this.updateDashboard();
        this.updateDate();
        this.setupLogout();
        await this.loadDashboardStats();
    },

    async loadDashboardStats() {
        try {
            if (!this.currentUser) return;

            // Buscar tarefas
            const { data: tasks, error: tasksError } = await supabaseClient
                .from('tasks')
                .select('*')
                .eq('user_id', this.currentUser.id);

            if (tasksError) throw tasksError;

            // Buscar hábitos
            const { data: habits, error: habitsError } = await supabaseClient
                .from('habits')
                .select('*')
                .eq('user_id', this.currentUser.id);

            if (habitsError) throw habitsError;

            // Buscar finanças
            const { data: finances, error: financesError } = await supabaseClient
                .from('finances')
                .select('*')
                .eq('user_id', this.currentUser.id);

            if (financesError) throw financesError;

            // Atualizar UI
            this.updateStats(tasks, habits, finances);
            this.loadRecentActivities(tasks, habits);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    },

    updateStats(tasks, habits, finances) {
        const taskCount = tasks ? tasks.length : 0;
        const habitCount = habits ? habits.length : 0;
        const total = finances ? finances.reduce((sum, f) => sum + f.amount, 0) : 0;

        document.getElementById('taskCount').textContent = taskCount;
        document.getElementById('habitCount').textContent = habitCount;
        document.getElementById('balanceCount').textContent = `R$ ${total.toFixed(2)}`;

        // Progresso
        const done = tasks ? tasks.filter(t => t.completed).length : 0;
        const progress = taskCount > 0 ? Math.round((done / taskCount) * 100) : 0;
        document.getElementById('progressCount').textContent = progress + '%';
    },

    loadRecentActivities(tasks, habits) {
        const list = document.getElementById('activityList');
        if (!list) return;

        let activities = [];

        if (tasks) {
            tasks.slice(0, 3).forEach(t => {
                activities.push({
                    icon: '📋',
                    message: `Tarefa: ${t.title}`,
                    date: t.created_at
                });
            });
        }

        if (habits) {
            habits.slice(0, 3).forEach(h => {
                activities.push({
                    icon: '🔥',
                    message: `Hábito: ${h.name}`,
                    date: h.created_at
                });
            });
        }

        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        activities = activities.slice(0, 5);

        if (activities.length === 0) {
            list.innerHTML = '<p style="color:#999;">Nenhuma atividade recente</p>';
        } else {
            list.innerHTML = activities.map(act => `
                <div class="task-item">
                    <span>${act.icon}</span>
                    <span>${act.message}</span>
                    <small style="color:#999;margin-left:auto;">
                        ${new Date(act.date).toLocaleDateString('pt-BR')}
                    </small>
                </div>
            `).join('');
        }
    },

    // ===== TAREFAS =====
    async initTasks() {
        this.loadUser();
        await this.loadSession();
        await this.loadTasks();
        this.renderTasks();
        this.setupTaskFilters();
        this.setupTaskModal();
    },

    async loadTasks() {
        try {
            if (!this.currentUser) return;

            const { data, error } = await supabaseClient
                .from('tasks')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.tasks = data || [];
        } catch (error) {
            console.error('Erro ao carregar tarefas:', error);
            this.tasks = [];
        }
    },

    renderTasks(filter = 'all') {
        const list = document.getElementById('taskList');
        if (!list) return;

        let filtered = this.tasks || [];

        if (filter === 'pending') {
            filtered = this.tasks.filter(t => !t.completed);
        } else if (filter === 'done') {
            filtered = this.tasks.filter(t => t.completed);
        } else if (filter === 'high') {
            filtered = this.tasks.filter(t => t.priority === 'high');
        }

        if (filtered.length === 0) {
            list.innerHTML = `
                <div style="text-align:center;padding:40px;color:#999;">
                    <p>📭 Nenhuma tarefa encontrada</p>
                    <button onclick="STER.showAddTask()" class="btn btn-primary" style="margin-top:12px;">
                        Criar primeira tarefa
                    </button>
                </div>
            `;
            return;
        }

        list.innerHTML = filtered.map(task => `
            <div class="task-item" data-id="${task.id}">
                <div class="task-check">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="STER.toggleTask('${task.id}')">
                </div>
                <div class="task-content">
                    <span class="task-title" style="${task.completed ? 'text-decoration:line-through;color:#999;' : ''}">
                        ${task.title}
                    </span>
                    <span class="task-category">📁 ${task.category || 'Geral'}</span>
                </div>
                <div class="task-actions">
                    <span class="task-priority ${task.priority || 'medium'}">${task.priority || 'Média'}</span>
                    <button onclick="STER.deleteTask('${task.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    },

    async toggleTask(id) {
        try {
            const task = this.tasks.find(t => t.id === id);
            if (!task) return;

            const { error } = await supabaseClient
                .from('tasks')
                .update({ completed: !task.completed })
                .eq('id', id);

            if (error) throw error;

            await this.loadTasks();
            this.renderTasks();
        } catch (error) {
            console.error('Erro ao atualizar tarefa:', error);
        }
    },

    async deleteTask(id) {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

        try {
            const { error } = await supabaseClient
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await this.loadTasks();
            this.renderTasks();
        } catch (error) {
            console.error('Erro ao excluir tarefa:', error);
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

        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        };
    },

    async addTask() {
        const title = document.getElementById('taskTitle').value;
        const category = document.getElementById('taskCategory').value;
        const priority = document.getElementById('taskPriority').value;
        const deadline = document.getElementById('taskDeadline').value;

        if (!title) {
            alert('Digite um título para a tarefa');
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .insert({
                    user_id: this.currentUser.id,
                    title,
                    category,
                    priority,
                    deadline: deadline || null,
                    completed: false
                });

            if (error) throw error;

            await this.loadTasks();
            this.renderTasks();

            document.getElementById('taskModal').style.display = 'none';
            document.getElementById('taskForm').reset();
        } catch (error) {
            console.error('Erro ao adicionar tarefa:', error);
            alert('Erro ao salvar tarefa');
        }
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

    // ============================================
    // WORKOUT (TREINO)
    // ============================================

    Workout: {
        currentDay: null,
        workouts: [],
        exercises: [],
        allExercises: [],

        async init() {
            await STER.loadSession();
            if (!STER.currentUser) {
                window.location.href = '/login.html';
                return;
            }
            await this.loadWorkouts();
            await this.loadExercises();
            this.renderDaySelector();
            this.renderStats();
            this.setupModal();
        },

        async loadWorkouts() {
            try {
                const { data, error } = await supabaseClient
                    .from('workouts')
                    .select('*')
                    .eq('user_id', STER.currentUser.id)
                    .order('day_of_week');

                if (error) throw error;
                this.workouts = data || [];
            } catch (error) {
                console.error('Erro ao carregar treinos:', error);
                this.workouts = [];
            }
        },

        async loadExercises(workoutId = null) {
            try {
                let query = supabaseClient
                    .from('exercises')
                    .select('*')
                    .eq('user_id', STER.currentUser.id);

                if (workoutId) {
                    query = query.eq('workout_id', workoutId);
                }

                const { data, error } = await query.order('order_number');

                if (error) throw error;
                this.allExercises = data || [];
                
                if (workoutId) {
                    this.exercises = data || [];
                } else {
                    this.exercises = this.allExercises;
                }
            } catch (error) {
                console.error('Erro ao carregar exercícios:', error);
                this.exercises = [];
            }
        },

        renderDaySelector() {
            const container = document.getElementById('daySelector');
            if (!container) return;

            const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
            const today = new Date().getDay();

            container.innerHTML = this.workouts.map((workout, index) => {
                const dayNum = workout.day_of_week || index;
                const isActive = dayNum === today;
                const isRest = workout.focus?.toLowerCase() === 'descanso';

                return `
                    <button class="day-btn ${isActive ? 'active' : ''} ${isRest ? 'rest-day' : ''}"
                            onclick="STER.Workout.selectDay('${workout.id}')"
                            ${isRest ? 'disabled' : ''}>
                        ${workout.day_name || days[dayNum]}
                        ${isRest ? '🛌' : ''}
                        ${this.isDayCompleted(workout.id) ? '✅' : ''}
                    </button>
                `;
            }).join('');

            // Selecionar primeiro dia se nenhum estiver ativo
            if (this.workouts.length > 0) {
                const activeDay = this.workouts.find(w => w.day_of_week === today);
                if (activeDay) {
                    this.selectDay(activeDay.id);
                } else {
                    this.selectDay(this.workouts[0].id);
                }
            }
        },

        isDayCompleted(workoutId) {
            const dayExercises = this.allExercises.filter(e => e.workout_id === workoutId);
            if (dayExercises.length === 0) return false;
            return dayExercises.every(e => e.completed);
        },

        async selectDay(workoutId) {
            this.currentDay = workoutId;
            
            // Atualizar botões
            document.querySelectorAll('.day-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const btns = document.querySelectorAll('.day-btn');
            const index = this.workouts.findIndex(w => w.id === workoutId);
            if (btns[index]) btns[index].classList.add('active');

            await this.loadExercises(workoutId);
            this.renderExercises();
            this.renderStats();
        },

        renderExercises() {
            const container = document.getElementById('exerciseList');
            if (!container) return;

            const loading = document.getElementById('loadingIndicator');
            const addBtn = document.getElementById('addExerciseBtn');
            
            if (loading) loading.style.display = 'none';
            if (addBtn) addBtn.style.display = 'block';

            if (!this.exercises || this.exercises.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:40px;color:#999;">
                        <p>💪 Nenhum exercício neste dia</p>
                        <button onclick="STER.Workout.showAddModal()" class="btn btn-primary" style="margin-top:12px;">
                            Adicionar exercício
                        </button>
                    </div>
                `;
                container.style.display = 'block';
                return;
            }

            container.innerHTML = this.exercises.map((ex, index) => `
                <div class="exercise-card ${ex.completed ? 'completed' : ''}">
                    <div class="exercise-header">
                        <div class="exercise-info">
                            <div class="exercise-name">
                                ${index + 1}. ${ex.name}
                                ${ex.completed ? '<span class="completed-icon">✅</span>' : ''}
                            </div>
                            ${ex.note ? `<div class="exercise-note">${ex.note}</div>` : ''}
                        </div>
                        <div class="exercise-actions">
                            <button class="complete-btn" onclick="STER.Workout.toggleComplete('${ex.id}')" title="Marcar como concluído">
                                ${ex.completed ? '↩️' : '✅'}
                            </button>
                            <button class="edit-btn" onclick="STER.Workout.editExercise('${ex.id}')" title="Editar">✏️</button>
                            <button class="delete-btn" onclick="STER.Workout.deleteExercise('${ex.id}')" title="Excluir">🗑️</button>
                        </div>
                    </div>
                    <div class="exercise-details">
                        <div class="detail-item">
                            <label>Séries</label>
                            <span class="value-display">${ex.sets || 4}</span>
                        </div>
                        <div class="detail-item">
                            <label>Repetições</label>
                            <span class="value-display">${ex.reps || 'Falha (mín. 7-8)'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Descanso</label>
                            <span class="value-display">${ex.rest || '60-90s'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Carga (kg)</label>
                            <span class="value-display">${ex.weight_kg || 0}</span>
                        </div>
                    </div>
                </div>
            `).join('');
            container.style.display = 'block';
        },

        renderStats() {
            const total = document.getElementById('totalExercises');
            const sets = document.getElementById('totalSets');
            const progress = document.getElementById('workoutProgress');

            if (total) total.textContent = this.exercises.length;
            if (sets) {
                const totalSets = this.exercises.reduce((sum, ex) => sum + (ex.sets || 4), 0);
                sets.textContent = totalSets;
            }
            if (progress) {
                const completed = this.exercises.filter(e => e.completed).length;
                const pct = this.exercises.length > 0 ? Math.round((completed / this.exercises.length) * 100) : 0;
                progress.textContent = pct + '%';
            }
        },

        async toggleComplete(exerciseId) {
            try {
                const exercise = this.exercises.find(e => e.id === exerciseId);
                if (!exercise) return;

                const { error } = await supabaseClient
                    .from('exercises')
                    .update({ completed: !exercise.completed })
                    .eq('id', exerciseId);

                if (error) throw error;

                // Registrar no log
                if (!exercise.completed) {
                    await supabaseClient
                        .from('workout_logs')
                        .insert({
                            user_id: STER.currentUser.id,
                            exercise_id: exerciseId,
                            workout_id: exercise.workout_id,
                            weight_kg: exercise.weight_kg || 0,
                            reps_done: parseInt(exercise.reps) || 0,
                            sets_done: exercise.sets || 4
                        });
                }

                await this.loadExercises(this.currentDay);
                this.renderExercises();
                this.renderStats();
                this.renderDaySelector();
            } catch (error) {
                console.error('Erro ao atualizar exercício:', error);
            }
        },

        showAddModal() {
            document.getElementById('modalTitle').textContent = 'Novo Exercício';
            document.getElementById('editExerciseId').value = '';
            document.getElementById('exName').value = '';
            document.getElementById('exNote').value = '';
            document.getElementById('exSets').value = '4';
            document.getElementById('exReps').value = 'Falha (mín. 7-8)';
            document.getElementById('exRest').value = '60-90s';
            document.getElementById('exWeight').value = '0';
            document.getElementById('exerciseModal').classList.add('show');
        },

        editExercise(id) {
            const ex = this.exercises.find(e => e.id === id);
            if (!ex) return;

            document.getElementById('modalTitle').textContent = 'Editar Exercício';
            document.getElementById('editExerciseId').value = ex.id;
            document.getElementById('exName').value = ex.name;
            document.getElementById('exNote').value = ex.note || '';
            document.getElementById('exSets').value = ex.sets || 4;
            document.getElementById('exReps').value = ex.reps || 'Falha (mín. 7-8)';
            document.getElementById('exRest').value = ex.rest || '60-90s';
            document.getElementById('exWeight').value = ex.weight_kg || 0;
            document.getElementById('exerciseModal').classList.add('show');
        },

        closeModal() {
            document.getElementById('exerciseModal').classList.remove('show');
        },

        setupModal() {
            const form = document.getElementById('exerciseForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveExercise();
                });
            }

            // Fechar ao clicar fora
            document.getElementById('exerciseModal').addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeModal();
                }
            });
        },

        async saveExercise() {
            const id = document.getElementById('editExerciseId').value;
            const name = document.getElementById('exName').value;
            const note = document.getElementById('exNote').value;
            const sets = parseInt(document.getElementById('exSets').value) || 4;
            const reps = document.getElementById('exReps').value;
            const rest = document.getElementById('exRest').value;
            const weight_kg = parseFloat(document.getElementById('exWeight').value) || 0;

            if (!name) {
                alert('Digite o nome do exercício');
                return;
            }

            try {
                const data = {
                    user_id: STER.currentUser.id,
                    workout_id: this.currentDay,
                    name,
                    note: note || null,
                    sets,
                    reps,
                    rest: rest || null,
                    weight_kg,
                    order_number: this.exercises.length + 1
                };

                let error;
                if (id) {
                    // Atualizar
                    const result = await supabaseClient
                        .from('exercises')
                        .update(data)
                        .eq('id', id);
                    error = result.error;
                } else {
                    // Criar
                    const result = await supabaseClient
                        .from('exercises')
                        .insert(data);
                    error = result.error;
                }

                if (error) throw error;

                this.closeModal();
                await this.loadExercises(this.currentDay);
                this.renderExercises();
                this.renderStats();
                this.renderDaySelector();
            } catch (error) {
                console.error('Erro ao salvar exercício:', error);
                alert('Erro ao salvar exercício');
            }
        },

        async deleteExercise(id) {
            if (!confirm('Tem certeza que deseja excluir este exercício?')) return;

            try {
                const { error } = await supabaseClient
                    .from('exercises')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                await this.loadExercises(this.currentDay);
                this.renderExercises();
                this.renderStats();
                this.renderDaySelector();
            } catch (error) {
                console.error('Erro ao excluir exercício:', error);
            }
        },

        async resetWorkout() {
            if (!confirm('Resetar todo o progresso do treino?')) return;

            try {
                const { error } = await supabaseClient
                    .from('exercises')
                    .update({ completed: false })
                    .eq('user_id', STER.currentUser.id);

                if (error) throw error;

                await this.loadExercises(this.currentDay);
                this.renderExercises();
                this.renderStats();
                this.renderDaySelector();
            } catch (error) {
                console.error('Erro ao resetar treino:', error);
            }
        },

        exportWorkout() {
            if (!this.exercises || this.exercises.length === 0) {
                alert('Nenhum exercício para exportar');
                return;
            }

            const workout = this.workouts.find(w => w.id === this.currentDay);
            const text = [
                `💪 TREINO: ${workout?.name || 'Dia'}`,
                `📅 ${workout?.day_name || ''} - ${workout?.focus || ''}`,
                '',
                ...this.exercises.map((ex, i) => 
                    `${i+1}. ${ex.name} - ${ex.sets}x ${ex.reps} | Descanso: ${ex.rest} | Carga: ${ex.weight_kg}kg`
                ),
                '',
                `✅ Progresso: ${this.exercises.filter(e => e.completed).length}/${this.exercises.length} concluídos`
            ].join('\n');

            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `treino_${workout?.day_name || 'dia'}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        }
    },

    // ============================================
    // HÁBITOS
    // ============================================

    Habits: {
        habits: [],

        async init() {
            await STER.loadSession();
            if (!STER.currentUser) {
                window.location.href = '/login.html';
                return;
            }
            await this.loadHabits();
            this.renderHabits();
            this.renderStats();
            this.setupModal();
        },

        async loadHabits() {
            try {
                const { data, error } = await supabaseClient
                    .from('habits')
                    .select('*')
                    .eq('user_id', STER.currentUser.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.habits = data || [];
            } catch (error) {
                console.error('Erro ao carregar hábitos:', error);
                this.habits = [];
            }
        },

        renderHabits() {
            const container = document.getElementById('habitList');
            const loading = document.getElementById('loadingIndicator');
            const addBtn = document.getElementById('addHabitBtn');

            if (loading) loading.style.display = 'none';
            if (addBtn) addBtn.style.display = 'block';

            if (!container) return;

            if (!this.habits || this.habits.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:40px;color:#999;">
                        <p>🔥 Nenhum hábito cadastrado</p>
                        <button onclick="STER.Habits.showAddModal()" class="btn btn-primary" style="margin-top:12px;">
                            Criar primeiro hábito
                        </button>
                    </div>
                `;
                container.style.display = 'block';
                return;
            }

            container.innerHTML = this.habits.map(habit => `
                <div class="habit-card ${habit.completed_today ? 'completed' : ''}">
                    <div class="habit-check">
                        <input type="checkbox" ${habit.completed_today ? 'checked' : ''} 
                               onchange="STER.Habits.toggleComplete('${habit.id}')">
                    </div>
                    <div class="habit-info">
                        <div class="habit-name">
                            ${habit.name}
                            ${habit.completed_today ? '<span class="completed-text">✅ Feito hoje</span>' : ''}
                        </div>
                        ${habit.description ? `<div class="habit-desc">${habit.description}</div>` : ''}
                        <div class="habit-stats">
                            <span class="streak">🔥 Sequência: ${habit.current_streak || 0} dias</span>
                            <span class="best">🏆 Melhor: ${habit.best_streak || 0} dias</span>
                            <span>🎯 Meta: ${habit.target_count || 1}/dia</span>
                        </div>
                    </div>
                    <div class="habit-actions">
                        <button class="edit-btn" onclick="STER.Habits.editHabit('${habit.id}')" title="Editar">✏️</button>
                        <button class="delete-btn" onclick="STER.Habits.deleteHabit('${habit.id}')" title="Excluir">🗑️</button>
                    </div>
                </div>
            `).join('');
            container.style.display = 'block';
        },

        renderStats() {
            const total = document.getElementById('totalHabits');
            const completed = document.getElementById('completedToday');
            const best = document.getElementById('bestStreak');

            if (total) total.textContent = this.habits.length;
            if (completed) {
                const done = this.habits.filter(h => h.completed_today).length;
                completed.textContent = done;
            }
            if (best) {
                const maxStreak = this.habits.reduce((max, h) => Math.max(max, h.best_streak || 0), 0);
                best.textContent = maxStreak;
            }
        },

        async toggleComplete(habitId) {
            try {
                const habit = this.habits.find(h => h.id === habitId);
                if (!habit) return;

                const newStatus = !habit.completed_today;
                const today = new Date().toISOString().split('T')[0];

                // Atualizar hábito
                const { error } = await supabaseClient
                    .from('habits')
                    .update({ 
                        completed_today: newStatus,
                        current_streak: newStatus ? (habit.current_streak || 0) + 1 : 0,
                        best_streak: newStatus ? Math.max(habit.best_streak || 0, (habit.current_streak || 0) + 1) : habit.best_streak
                    })
                    .eq('id', habitId);

                if (error) throw error;

                // Registrar log
                if (newStatus) {
                    await supabaseClient
                        .from('habit_log')
                        .insert({
                            user_id: STER.currentUser.id,
                            habit_id: habitId,
                            completed: true,
                            date: today
                        });
                }

                await this.loadHabits();
                this.renderHabits();
                this.renderStats();
            } catch (error) {
                console.error('Erro ao atualizar hábito:', error);
            }
        },

        showAddModal() {
            document.getElementById('modalTitle').textContent = 'Novo Hábito';
            document.getElementById('editHabitId').value = '';
            document.getElementById('habitName').value = '';
            document.getElementById('habitDesc').value = '';
            document.getElementById('habitFrequency').value = 'daily';
            document.getElementById('habitTarget').value = '1';
            document.getElementById('habitModal').classList.add('show');
        },

        editHabit(id) {
            const habit = this.habits.find(h => h.id === id);
            if (!habit) return;

            document.getElementById('modalTitle').textContent = 'Editar Hábito';
            document.getElementById('editHabitId').value = habit.id;
            document.getElementById('habitName').value = habit.name;
            document.getElementById('habitDesc').value = habit.description || '';
            document.getElementById('habitFrequency').value = habit.frequency || 'daily';
            document.getElementById('habitTarget').value = habit.target_count || 1;
            document.getElementById('habitModal').classList.add('show');
        },

        closeModal() {
            document.getElementById('habitModal').classList.remove('show');
        },

        setupModal() {
            const form = document.getElementById('habitForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveHabit();
                });
            }

            document.getElementById('habitModal').addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeModal();
                }
            });
        },

        async saveHabit() {
            const id = document.getElementById('editHabitId').value;
            const name = document.getElementById('habitName').value;
            const description = document.getElementById('habitDesc').value;
            const frequency = document.getElementById('habitFrequency').value;
            const target_count = parseInt(document.getElementById('habitTarget').value) || 1;

            if (!name) {
                alert('Digite o nome do hábito');
                return;
            }

            try {
                const data = {
                    user_id: STER.currentUser.id,
                    name,
                    description: description || null,
                    frequency,
                    target_count
                };

                let error;
                if (id) {
                    const result = await supabaseClient
                        .from('habits')
                        .update(data)
                        .eq('id', id);
                    error = result.error;
                } else {
                    const result = await supabaseClient
                        .from('habits')
                        .insert(data);
                    error = result.error;
                }

                if (error) throw error;

                this.closeModal();
                await this.loadHabits();
                this.renderHabits();
                this.renderStats();
            } catch (error) {
                console.error('Erro ao salvar hábito:', error);
                alert('Erro ao salvar hábito');
            }
        },

        async deleteHabit(id) {
            if (!confirm('Tem certeza que deseja excluir este hábito?')) return;

            try {
                const { error } = await supabaseClient
                    .from('habits')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                await this.loadHabits();
                this.renderHabits();
                this.renderStats();
            } catch (error) {
                console.error('Erro ao excluir hábito:', error);
            }
        }
    },

    // ============================================
    // FINANÇAS
    // ============================================

    Finances: {
        finances: [],
        filter: 'all',

        async init() {
            await STER.loadSession();
            if (!STER.currentUser) {
                window.location.href = '/login.html';
                return;
            }
            await this.loadFinances();
            this.renderFinances();
            this.renderSummary();
            this.setupModal();
            this.setupFilters();
        },

        async loadFinances() {
            try {
                const { data, error } = await supabaseClient
                    .from('finances')
                    .select('*')
                    .eq('user_id', STER.currentUser.id)
                    .order('date', { ascending: false });

                if (error) throw error;
                this.finances = data || [];
            } catch (error) {
                console.error('Erro ao carregar finanças:', error);
                this.finances = [];
            }
        },

        renderFinances() {
            const container = document.getElementById('financeList');
            const loading = document.getElementById('loadingIndicator');
            const addBtn = document.getElementById('addFinanceBtn');

            if (loading) loading.style.display = 'none';
            if (addBtn) addBtn.style.display = 'block';

            if (!container) return;

            let filtered = this.finances;
            if (this.filter === 'income') {
                filtered = this.finances.filter(f => f.type === 'income');
            } else if (this.filter === 'expense') {
                filtered = this.finances.filter(f => f.type === 'expense');
            }

            if (!filtered || filtered.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:40px;color:#999;">
                        <p>💰 Nenhum registro financeiro</p>
                        <button onclick="STER.Finances.showAddModal()" class="btn btn-primary" style="margin-top:12px;">
                            Adicionar transação
                        </button>
                    </div>
                `;
                container.style.display = 'block';
                return;
            }

            container.innerHTML = filtered.map(finance => `
                <div class="finance-item">
                    <span class="type-badge ${finance.type}">${finance.type === 'income' ? '💰 Entrada' : '💸 Saída'}</span>
                    <div class="info">
                        <div class="desc">${finance.description}</div>
                        <div class="category">📁 ${finance.category || 'outros'}</div>
                    </div>
                    <div class="amount ${finance.type === 'income' ? 'positive' : 'negative'}">
                        ${finance.type === 'income' ? '+' : '-'} R$ ${finance.amount.toFixed(2)}
                    </div>
                    <div class="actions">
                        <button class="delete-btn" onclick="STER.Finances.deleteFinance('${finance.id}')" title="Excluir">🗑️</button>
                    </div>
                </div>
            `).join('');
            container.style.display = 'block';
        },

        renderSummary() {
            const totalIn = this.finances.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
            const totalOut = this.finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
            const balance = totalIn - totalOut;

            document.getElementById('totalIncome').textContent = `R$ ${totalIn.toFixed(2)}`;
            document.getElementById('totalExpense').textContent = `R$ ${totalOut.toFixed(2)}`;
            document.getElementById('balance').textContent = `R$ ${balance.toFixed(2)}`;
            document.getElementById('balance').className = `amount ${balance >= 0 ? 'positive' : 'negative'}`;
        },

        setupFilters() {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.filter = btn.dataset.filter;
                    this.renderFinances();
                });
            });
        },

        showAddModal() {
            document.getElementById('modalTitle').textContent = 'Nova Transação';
            document.getElementById('editFinanceId').value = '';
            document.getElementById('financeDesc').value = '';
            document.getElementById('financeAmount').value = '';
            document.getElementById('financeType').value = 'expense';
            document.getElementById('financeCategory').value = 'outros';
            document.getElementById('financeDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('financeModal').classList.add('show');
        },

        closeModal() {
            document.getElementById('financeModal').classList.remove('show');
        },

        setupModal() {
            const form = document.getElementById('financeForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveFinance();
                });
            }

            document.getElementById('financeModal').addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeModal();
                }
            });
        },

        async saveFinance() {
            const id = document.getElementById('editFinanceId').value;
            const description = document.getElementById('financeDesc').value;
            const amount = parseFloat(document.getElementById('financeAmount').value);
            const type = document.getElementById('financeType').value;
            const category = document.getElementById('financeCategory').value;
            const date = document.getElementById('financeDate').value;

            if (!description || !amount) {
                alert('Preencha a descrição e o valor');
                return;
            }

            try {
                const data = {
                    user_id: STER.currentUser.id,
                    description,
                    amount,
                    type,
                    category: category || 'outros',
                    date: date || new Date().toISOString().split('T')[0]
                };

                let error;
                if (id) {
                    const result = await supabaseClient
                        .from('finances')
                        .update(data)
                        .eq('id', id);
                    error = result.error;
                } else {
                    const result = await supabaseClient
                        .from('finances')
                        .insert(data);
                    error = result.error;
                }

                if (error) throw error;

                this.closeModal();
                await this.loadFinances();
                this.renderFinances();
                this.renderSummary();
            } catch (error) {
                console.error('Erro ao salvar transação:', error);
                alert('Erro ao salvar transação');
            }
        },

        async deleteFinance(id) {
            if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

            try {
                const { error } = await supabaseClient
                    .from('finances')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                await this.loadFinances();
                this.renderFinances();
                this.renderSummary();
            } catch (error) {
                console.error('Erro ao excluir transação:', error);
            }
        }
    },

    // ============================================
    // SETTINGS (Configurações)
    // ============================================

    Settings: {
        settings: null,
        profile: null,

        async init() {
            await STER.loadSession();
            if (!STER.currentUser) {
                window.location.href = '/login.html';
                return;
            }
            await this.loadSettings();
            await this.loadProfile();
            this.renderSettings();
            this.setupForms();
        },

        async loadSettings() {
            try {
                const { data, error } = await supabaseClient
                    .from('user_settings')
                    .select('*')
                    .eq('user_id', STER.currentUser.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;
                this.settings = data || {};
            } catch (error) {
                console.error('Erro ao carregar configurações:', error);
                this.settings = {};
            }
        },

        async loadProfile() {
            try {
                const { data, error } = await supabaseClient
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', STER.currentUser.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;
                this.profile = data || {};
            } catch (error) {
                console.error('Erro ao carregar perfil:', error);
                this.profile = {};
            }
        },

        renderSettings() {
            // Perfil
            document.getElementById('profileName').value = this.profile?.full_name || '';
            document.getElementById('profileBio').value = this.profile?.bio || '';
            document.getElementById('profileGoal').value = this.profile?.fitness_goal || '';

            // Configurações
            document.getElementById('themeSelect').value = this.settings?.theme || 'dark';
            document.getElementById('notificationsToggle').checked = this.settings?.notifications !== false;
            document.getElementById('workoutReminder').value = this.settings?.workout_reminder || '07:00';

            // Email
            document.getElementById('userEmail').textContent = STER.currentUser?.email || '';
            document.getElementById('userName').textContent = this.profile?.full_name || STER.currentUser?.email || 'Usuário';
        },

        setupForms() {
            // Formulário de perfil
            const profileForm = document.getElementById('profileForm');
            if (profileForm) {
                profileForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveProfile();
                });
            }

            // Formulário de configurações
            const settingsForm = document.getElementById('settingsForm');
            if (settingsForm) {
                settingsForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveSettings();
                });
            }
        },

        async saveProfile() {
            const full_name = document.getElementById('profileName').value;
            const bio = document.getElementById('profileBio').value;
            const fitness_goal = document.getElementById('profileGoal').value;

            try {
                const { error } = await supabaseClient
                    .from('user_profiles')
                    .upsert({
                        user_id: STER.currentUser.id,
                        full_name,
                        bio: bio || null,
                        fitness_goal: fitness_goal || null,
                        updated_at: new Date().toISOString()
                    });

                if (error) throw error;

                alert('Perfil atualizado com sucesso!');
                await this.loadProfile();
            } catch (error) {
                console.error('Erro ao salvar perfil:', error);
                alert('Erro ao salvar perfil');
            }
        },

        async saveSettings() {
            const theme = document.getElementById('themeSelect').value;
            const notifications = document.getElementById('notificationsToggle').checked;
            const workout_reminder = document.getElementById('workoutReminder').value;

            try {
                const { error } = await supabaseClient
                    .from('user_settings')
                    .upsert({
                        user_id: STER.currentUser.id,
                        theme,
                        notifications,
                        workout_reminder: workout_reminder || '07:00',
                        updated_at: new Date().toISOString()
                    });

                if (error) throw error;

                // Aplicar tema
                document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';

                alert('Configurações salvas com sucesso!');
                await this.loadSettings();
            } catch (error) {
                console.error('Erro ao salvar configurações:', error);
                alert('Erro ao salvar configurações');
            }
        },

        async logout() {
            if (!confirm('Tem certeza que deseja sair?')) return;

            try {
                await supabaseClient.auth.signOut();
                localStorage.removeItem('currentUser');
                window.location.href = '/login.html';
            } catch (error) {
                console.error('Erro ao sair:', error);
            }
        }
    },

    // ============================================
    // UTILITÁRIOS
    // ============================================

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
        // Logout já está nos botões
    },

    async logout() {
        if (!confirm('Tem certeza que deseja sair?')) return;

        try {
            await supabaseClient.auth.signOut();
            localStorage.removeItem('currentUser');
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Erro ao sair:', error);
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

    // ============================================
    // INICIALIZAÇÃO AUTOMÁTICA
    // ============================================

    async autoInit() {
        await this.init();

        const path = window.location.pathname;
        
        if (path.includes('dashboard')) {
            await this.initDashboard();
        } else if (path.includes('login')) {
            this.initLogin();
        } else if (path.includes('register')) {
            this.initRegister();
        } else if (path.includes('tasks')) {
            await this.initTasks();
        } else if (path.includes('habits')) {
            await this.Habits.init();
        } else if (path.includes('finances')) {
            await this.Finances.init();
        } else if (path.includes('workout')) {
            await this.Workout.init();
        } else if (path.includes('settings')) {
            await this.Settings.init();
        } else if (path.includes('index') || path === '/') {
            // Página inicial
        }
    }
};

// ============================================
// INICIALIZAR QUANDO O DOM ESTIVER PRONTO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Carregar Supabase
    if (typeof supabase === 'undefined') {
        console.error('Supabase não carregado. Verifique a tag de script.');
        return;
    }

    await STER.autoInit();
});

// ============================================
// EXPORTAR PARA USO GLOBAL
// ============================================

window.STER = STER;