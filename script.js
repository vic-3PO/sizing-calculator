const toggle = document.getElementById('theme-toggle');
const applyTheme = theme => { document.documentElement.setAttribute('data-theme', theme); toggle.textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Escuro'; localStorage.setItem('theme', theme); };
toggle.addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));
applyTheme(localStorage.getItem('theme') || 'light');
const tasks = [];
const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#d946ef', '#f472b6'];
const ctx = document.getElementById('chart').getContext('2d'); let chart;
function updateOverview() {
    const total = tasks.reduce((sum, t) => sum + t.amount, 0);
    document.getElementById('total-days').textContent = total.toFixed(2);
    const labels = tasks.map(t => t.name);
    const dataVals = tasks.map(t => ({ x: [t.start, t.start + t.amount], y: t.name }));
    const bgColors = tasks.map((_, i) => colors[i % colors.length]);
    if (chart) chart.destroy();
    chart = new Chart(ctx, { type: 'bar', data: { datasets: [{ label: 'Tarefas', data: dataVals, backgroundColor: bgColors, barThickness: 20 }] }, "options": { indexAxis: 'y', responsive: true, scales: { x: { beginAtZero: true }, y: { type: 'category', labels } }, plugins: { legend: { display: false } } } });
}
function renderTasks() {
    const ul = document.getElementById('tasks-ul');
    ul.innerHTML = '';
    tasks.forEach((t, i) => {
        const li = document.createElement('li');
        li.style.color = colors[i % colors.length];

        const text = document.createElement('span');
        text.textContent = `${t.name} · Início: ${t.start}d · ${t.amount.toFixed(2)}d`;

        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️';
        editBtn.className = 'btn';
        editBtn.style.marginLeft = '10px';
        editBtn.addEventListener('click', () => {
            document.getElementById('task-name').value = t.name;
            document.getElementById('task-start').value = t.start;
            document.getElementById('task-value').value = t.amount;
            tasks.splice(i, 1);
            updateOverview();
            renderTasks();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'btn';
        deleteBtn.style.marginLeft = '5px';
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Remover tarefa "${t.name}"?`)) {
                tasks.splice(i, 1);
                updateOverview();
                renderTasks();
            }
        });

        li.appendChild(text);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
        ul.appendChild(li);
    });
}


function clearAll() { tasks.length = 0;['sizing-name', 'task-name', 'task-start', 'task-value'].forEach(id => document.getElementById(id).value = id === 'task-start' ? '' : ''); updateOverview(); renderTasks(); }
document.getElementById('new-btn').addEventListener('click', clearAll);

function updateGallery() {
    const ul = document.getElementById('gallery-ul');
    ul.innerHTML = '';
    const storage = JSON.parse(localStorage.getItem('sizings') || '{}');
    Object.entries(storage).forEach(([name, arr]) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');

        const title = document.createElement('span');
        title.className = 'item-title';
        title.textContent = name;

        const preview = document.createElement('div');
        preview.className = 'preview';
        arr.forEach((t, i) => {
            const span = document.createElement('span');
            span.style.backgroundColor = colors[i % colors.length];
            preview.appendChild(span);
        });

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '6px';
        actions.style.marginLeft = 'auto';

        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️';
        editBtn.className = 'btn';
        editBtn.style.padding = '4px 8px';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            loadSizing(name);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'btn';
        deleteBtn.style.padding = '4px 8px';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Deseja excluir o sizing "${name}"?`)) {
                deleteSizing(name);
            }
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        btn.append(title, preview, actions);

        btn.addEventListener('click', () => loadSizing(name));
        li.appendChild(btn);
        ul.appendChild(li);
    });
}

function deleteSizing(name) {
    const storage = JSON.parse(localStorage.getItem('sizings') || '{}');
    delete storage[name];
    localStorage.setItem('sizings', JSON.stringify(storage));
    updateGallery();
    if (document.getElementById('sizing-name').value === name) {
        clearAll();
    }
}

document.getElementById('save-as-btn').addEventListener('click', () => {
    const name = prompt("Nome para salvar cópia do sizing:");
    if (!name) return;
    const storage = JSON.parse(localStorage.getItem('sizings') || '{}');
    storage[name] = tasks.slice();
    localStorage.setItem('sizings', JSON.stringify(storage));
    updateGallery();
});


function loadSizing(name) { const storage = JSON.parse(localStorage.getItem('sizings') || '{}'); const arr = storage[name] || []; tasks.length = 0; arr.forEach(t => tasks.push(t)); document.getElementById('sizing-name').value = name; updateOverview(); renderTasks(); }
document.getElementById('task-unit').addEventListener('change', e => { const isDays = e.target.value === 'days'; document.getElementById('task-start').style.display = isDays ? 'block' : 'none'; document.getElementById('label-start').style.display = isDays ? 'block' : 'none'; updateSuggestion(); });

document.getElementById('add-btn').addEventListener('click', () => { const name = document.getElementById('task-name').value.trim(); const start = parseFloat(document.getElementById('task-start').value) || parseFloat(document.getElementById('task-start').placeholder); const value = parseFloat(document.getElementById('task-value').value); const unit = document.getElementById('task-unit').value; if (!name || value <= 0) return; if (unit === 'days' && start < 0) return; const amount = unit === 'hours' ? value / 8 : value; tasks.push({ name, start: unit === 'days' ? start : 0, amount }); document.getElementById('task-name').value = ''; document.getElementById('task-value').value = '1'; updateOverview(); renderTasks(); updateSuggestion(); });
document.getElementById('save-btn').addEventListener('click', () => { const name = document.getElementById('sizing-name').value.trim(); if (!name) return; const storage = JSON.parse(localStorage.getItem('sizings') || '{}'); storage[name] = tasks.slice(); localStorage.setItem('sizings', JSON.stringify(storage)); updateGallery(); });
document.getElementById('export-btn').addEventListener('click', () => { let csv = 'Name,Start (days),Duration (days)\n'; tasks.forEach(t => csv += `${t.name},${t.start},${t.amount.toFixed(2)}\n`); const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'tasks.csv'; a.click(); URL.revokeObjectURL(url); });
// init
updateGallery(); updateOverview(); updateSuggestion();