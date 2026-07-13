// ============================================
// STER - API Backend
// Arquivo único com todas as rotas
// ============================================

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// ===== DADOS EM MEMÓRIA (simulando banco) =====
let users = [];
let tasks = [];
let habits = [];
let finances = [];

// ===== ROTAS DE USUÁRIOS =====
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;

    // Validar
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verificar se já existe
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    // Criar usuário
    const user = {
        id: users.length + 1,
        name,
        email,
        password, // Em produção, usar hash!
        createdAt: new Date().toISOString()
    };

    users.push(user);
    res.status(201).json({ message: 'Usuário criado com sucesso', user: { id: user.id, name, email } });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    res.json({ message: 'Login realizado', user: { id: user.id, name: user.name, email: user.email } });
});

// ===== ROTAS DE TAREFAS =====
app.get('/api/tasks', (req, res) => {
    res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
    const { title, category, priority, deadline } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Título é obrigatório' });
    }

    const task = {
        id: tasks.length + 1,
        title,
        category: category || 'pessoal',
        priority: priority || 'media',
        deadline: deadline || null,
        done: false,
        createdAt: new Date().toISOString()
    };

    tasks.push(task);
    res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find(t => t.id === id);

    if (!task) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    task.done = req.body.done !== undefined ? req.body.done : task.done;
    task.title = req.body.title || task.title;
    task.category = req.body.category || task.category;
    task.priority = req.body.priority || task.priority;

    res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = tasks.findIndex(t => t.id === id);

    if (index === -1) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    tasks.splice(index, 1);
    res.json({ message: 'Tarefa excluída com sucesso' });
});

// ===== ROTAS DE HÁBITOS =====
app.get('/api/habits', (req, res) => {
    res.json(habits);
});

app.post('/api/habits', (req, res) => {
    const { name, frequency } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nome do hábito é obrigatório' });
    }

    const habit = {
        id: habits.length + 1,
        name,
        frequency: frequency || 'daily',
        done: false,
        streak: 0,
        createdAt: new Date().toISOString()
    };

    habits.push(habit);
    res.status(201).json(habit);
});

// ===== ROTAS DE FINANÇAS =====
app.get('/api/finances', (req, res) => {
    res.json(finances);
});

app.post('/api/finances', (req, res) => {
    const { description, amount, type, category } = req.body;

    if (!description || !amount) {
        return res.status(400).json({ error: 'Descrição e valor são obrigatórios' });
    }

    const finance = {
        id: finances.length + 1,
        description,
        amount: parseFloat(amount),
        type: type || 'expense',
        category: category || 'outros',
        date: new Date().toISOString()
    };

    finances.push(finance);
    res.status(201).json(finance);
});

// ===== ROTA DE ESTATÍSTICAS =====
app.get('/api/stats', (req, res) => {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.done).length;
    const totalHabits = habits.length;
    const totalFinances = finances.reduce((sum, f) => sum + f.amount, 0);

    res.json({
        tasks: { total: totalTasks, done: doneTasks, pending: totalTasks - doneTasks },
        habits: { total: totalHabits },
        finances: { total: totalFinances },
        progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
    });
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'STER API funcionando!' });
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, () => {
    console.log(`🚀 STER API rodando em http://localhost:${PORT}`);
    console.log(`📊 Endpoints disponíveis:`);
    console.log(`   - POST /api/register`);
    console.log(`   - POST /api/login`);
    console.log(`   - GET  /api/tasks`);
    console.log(`   - POST /api/tasks`);
    console.log(`   - PUT  /api/tasks/:id`);
    console.log(`   - DELETE /api/tasks/:id`);
    console.log(`   - GET  /api/habits`);
    console.log(`   - GET  /api/finances`);
    console.log(`   - GET  /api/stats`);
});