const toggle = document.getElementById("theme-toggle");
const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  toggle.textContent = theme === "dark" ? "☀️ Claro" : "🌙 Escuro";
  localStorage.setItem("theme", theme);
};
toggle.addEventListener("click", () =>
  applyTheme(
    document.documentElement.getAttribute("data-theme") === "light"
      ? "dark"
      : "light"
  )
);
applyTheme(localStorage.getItem("theme") || "light");
const tasks = [];
const colors = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#f472b6",
];
const ctx = document.getElementById("chart").getContext("2d");
let chart;

function calcularDuracaoTotal(tarefas, unidade) {
  if (unidade === "hours") {
    return tarefas.reduce((sum, t) => sum + t.amount, 0);
  }

  const intervalos = tarefas.map((t) => [t.start, t.start + t.amount]);
  intervalos.sort((a, b) => a[0] - b[0]);

  const mesclados = [];
  for (const [start, end] of intervalos) {
    if (!mesclados.length || start > mesclados[mesclados.length - 1][1]) {
      mesclados.push([start, end]);
    } else {
      mesclados[mesclados.length - 1][1] = Math.max(
        mesclados[mesclados.length - 1][1],
        end
      );
    }
  }

  return mesclados.reduce((sum, [start, end]) => sum + (end - start), 0);
}

function updateOverview() {
  const unit = document.getElementById("task-unit").value;
  const total = calcularDuracaoTotal(tasks, unit);

  const totalDisplay = document.getElementById("total-days");
  if (unit === "hours") {
    const totalHoras = total * 8; // converte dias para horas
    const horas = Math.floor(totalHoras);
    const minutos = Math.round((totalHoras - horas) * 60);
    totalDisplay.textContent = `${String(horas).padStart(2, "0")}:${String(
      minutos
    ).padStart(2, "0")}h`;
  } else {
    totalDisplay.textContent = `${total.toFixed(2)}`;
  }

  const labels = tasks.map((t) => t.name);
  const dataVals = tasks.map((t) => ({
    x: [t.start, t.start + t.amount],
    y: t.name,
  }));
  const bgColors = tasks.map((_, i) => colors[i % colors.length]);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      datasets: [
        {
          label: "Tarefas",
          data: dataVals,
          backgroundColor: bgColors,
          barThickness: 20,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      scales: { x: { beginAtZero: true }, y: { type: "category", labels } },
      plugins: { legend: { display: false } },
    },
  });
}

function renderTasks() {
  const ul = document.getElementById("tasks-ul");
  ul.innerHTML = "";
  tasks.forEach((t, i) => {
    const li = document.createElement("li");
    li.style.color = colors[i % colors.length];

    const text = document.createElement("span");
    const unit = document.getElementById("task-unit").value;

    if (unit === "hours") {
      const totalHoras = t.amount * 8;
      const horas = Math.floor(totalHoras);
      const minutos = Math.round((totalHoras - horas) * 60);
      text.textContent = `${t.name} · ${String(horas).padStart(
        2,
        "0"
      )}:${String(minutos).padStart(2, "0")}h`;
    } else {
      text.textContent = `${t.name} · Início: ${t.start}d · ${t.amount.toFixed(
        2
      )}d`;
    }

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.className = "btn";
    editBtn.style.marginLeft = "10px";
    editBtn.addEventListener("click", () => {
      document.getElementById("task-name").value = t.name;
      document.getElementById("task-start").value = t.start;
      document.getElementById("task-value").value = t.amount;
      tasks.splice(i, 1);
      updateOverview();
      renderTasks();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.className = "btn";
    deleteBtn.style.marginLeft = "5px";
    deleteBtn.addEventListener("click", () => {
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

function clearAll() {
  tasks.length = 0;

  const ids = [
    "sizing-name",
    "task-name",
    "task-start",
    "task-value",
    "task-hours",
    "task-minutes",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = id === "task-start" ? "" : "";
  });

  updateOverview();
  renderTasks();
}

document.getElementById("new-btn").addEventListener("click", clearAll);

function updateGallery() {
  const ul = document.getElementById("gallery-ul");
  ul.innerHTML = "";
  const storage = JSON.parse(localStorage.getItem("sizings") || "{}");
  Object.entries(storage).forEach(([name, arr]) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");

    const title = document.createElement("span");
    title.className = "item-title";
    title.textContent = name;

    const preview = document.createElement("div");
    preview.className = "preview";
    const data = arr; // arr agora é um objeto com { unit, tasks }
    (data.tasks || []).forEach((t, i) => {
      const span = document.createElement("span");
      span.style.backgroundColor = colors[i % colors.length];
      preview.appendChild(span);
    });

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.style.marginLeft = "auto";

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.className = "btn";
    editBtn.style.padding = "4px 8px";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      loadSizing(name);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.className = "btn";
    deleteBtn.style.padding = "4px 8px";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Deseja excluir o sizing "${name}"?`)) {
        deleteSizing(name);
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    btn.append(title, preview, actions);

    btn.addEventListener("click", () => loadSizing(name));
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function deleteSizing(name) {
  const storage = JSON.parse(localStorage.getItem("sizings") || "{}");
  delete storage[name];
  localStorage.setItem("sizings", JSON.stringify(storage));
  updateGallery();
  if (document.getElementById("sizing-name").value === name) {
    clearAll();
  }
}

function loadSizing(name) {
  const storage = JSON.parse(localStorage.getItem("sizings") || "{}");
  const data = storage[name];
  if (!data) return;

  document.getElementById("task-unit").value = data.unit || "days";
  document.getElementById("task-unit").dispatchEvent(new Event("change"));

  tasks.length = 0;
  data.tasks.forEach((t) => tasks.push(t));

  document.getElementById("sizing-name").value = name;
  updateOverview();
  renderTasks();
}

document.getElementById("task-unit").addEventListener("change", (e) => {
  const isDays = e.target.value === "days";
  document.getElementById("task-start").style.display = isDays
    ? "block"
    : "none";
  document.getElementById("label-start").style.display = isDays
    ? "block"
    : "none";

  const durationDiv = document.getElementById("duration-container");

  if (!isDays) {
    durationDiv.innerHTML = `
      <label for="task-hours">Duração</label>
      <div style="display: flex; gap: 4px;">
        <input type="number" id="task-hours" min="0" value="1" style="width: 60px;" placeholder="Horas" />
        <span>:</span>
        <input type="number" id="task-minutes" min="0" max="59" value="0" style="width: 60px;" placeholder="Minutos" />
      </div>
    `;
  } else {
    durationDiv.innerHTML = `
      <label for="task-value">Duração</label>
      <input type="number" id="task-value" min="1" value="1" />
    `;
  }
});

document.getElementById("add-btn").addEventListener("click", () => {
  const name = document.getElementById("task-name").value.trim();
  const unit = document.getElementById("task-unit").value;

  let start =
    parseFloat(document.getElementById("task-start").value) ||
    parseFloat(document.getElementById("task-start").placeholder);

  let amount = 0;
  if (unit === "days") {
    amount = parseFloat(document.getElementById("task-value").value);
    if (tasks.length === 0) start = 0;
    if (!name || amount <= 0 || start < 0) return;
  } else {
    const hours = parseInt(document.getElementById("task-hours").value) || 0;
    const minutes =
      parseInt(document.getElementById("task-minutes").value) || 0;
    amount = (hours + minutes / 60) / 8; // convertendo para fração de dias
    if (!name || amount <= 0) return;
    start = 0;
  }

  tasks.push({ name, start, amount });

  document.getElementById("task-name").value = "";
  if (unit === "days") {
    document.getElementById("task-value").value = "1";
  } else {
    document.getElementById("task-hours").value = "1";
    document.getElementById("task-minutes").value = "0";
  }

  updateOverview();
  renderTasks();
});

document.getElementById("save-btn").addEventListener("click", () => {
  const name = document.getElementById("sizing-name").value.trim();
  if (!name) return;
  const storage = JSON.parse(localStorage.getItem("sizings") || "{}");
  storage[name] = {
    unit: document.getElementById("task-unit").value,
    tasks: tasks.slice(),
  };
  localStorage.setItem("sizings", JSON.stringify(storage));
  updateGallery();
});
document.getElementById("export-btn").addEventListener("click", () => {
  let csv = "Name,Start (days),Duration (days)\n";
  tasks.forEach(
    (t) => (csv += `${t.name},${t.start},${t.amount.toFixed(2)}\n`)
  );
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tasks.csv";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("export-img-btn").addEventListener("click", () => {
  if (!chart) return;

  const theme = document.documentElement.getAttribute("data-theme");
  const bgColor = theme === "dark" ? "#1e1e1e" : "#ffffff";
  const textColor = theme === "dark" ? "#ffffff" : "#000000";

  const canvas = document.getElementById("chart");
  const ctx = canvas.getContext("2d");

  const originalDraw = chart.draw;
  chart.draw = function () {
    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    originalDraw.call(this);
  };

  chart.update();
  const url = canvas.toDataURL("image/png");

  const a = document.createElement("a");
  a.href = url;
  a.download = `${document.getElementById("sizing-name").value || "chart"}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  chart.draw = originalDraw; // restaura o draw original
});

// init
updateGallery();
updateOverview();
