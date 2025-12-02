class SizingCalculator {
  constructor() {
    this.currentProject = this.createEmptyProject();
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 10;
    this.chart = null;
    this.autoSaveTimeout = null;

    // Sample data
    this.sampleData = {
      categories: [
        "Backend",
        "Frontend",
        "Design",
        "QA",
        "DevOps",
        "Gestão",
        "Pesquisa",
        "Marketing",
      ],
      priorities: [
        { value: "low", label: "Baixa", color: "#10b981" },
        { value: "medium", label: "Média", color: "#f59e0b" },
        { value: "high", label: "Alta", color: "#ef4444" },
      ],
      colors: [
        "#ef4444",
        "#f59e0b",
        "#10b981",
        "#3b82f6",
        "#8b5cf6",
        "#d946ef",
        "#f472b6",
        "#06b6d4",
      ],
      templates: [
        {
          name: "Projeto Web Básico",
          tasks: [
            {
              name: "Planejamento",
              duration: 3,
              priority: "high",
              category: "Gestão",
            },
            {
              name: "Design",
              duration: 5,
              priority: "high",
              category: "Design",
            },
            {
              name: "Desenvolvimento",
              duration: 10,
              priority: "high",
              category: "Backend",
            },
            { name: "Testes", duration: 4, priority: "medium", category: "QA" },
            {
              name: "Deploy",
              duration: 2,
              priority: "high",
              category: "DevOps",
            },
          ],
        },
        {
          name: "App Mobile",
          tasks: [
            {
              name: "Pesquisa",
              duration: 2,
              priority: "medium",
              category: "Pesquisa",
            },
            {
              name: "Wireframes",
              duration: 3,
              priority: "high",
              category: "Design",
            },
            {
              name: "Desenvolvimento",
              duration: 12,
              priority: "high",
              category: "Backend",
            },
            { name: "Testes", duration: 4, priority: "medium", category: "QA" },
          ],
        },
        {
          name: "Sistema Corporativo",
          tasks: [
            {
              name: "Requisitos",
              duration: 5,
              priority: "high",
              category: "Gestão",
            },
            {
              name: "Arquitetura",
              duration: 3,
              priority: "high",
              category: "Backend",
            },
            {
              name: "Backend API",
              duration: 15,
              priority: "high",
              category: "Backend",
            },
            {
              name: "Frontend",
              duration: 12,
              priority: "high",
              category: "Frontend",
            },
            {
              name: "Integração",
              duration: 5,
              priority: "medium",
              category: "DevOps",
            },
            { name: "Testes", duration: 8, priority: "medium", category: "QA" },
            {
              name: "Deploy",
              duration: 3,
              priority: "high",
              category: "DevOps",
            },
          ],
        },
      ],
    };

    this.init();
  }

  init() {
    this.loadSavedProjects();
    this.setupEventListeners();
    this.populateCategories();
    this.populateTemplates();
    this.updateUI();
    this.initChart();

    // Load theme preference
    this.storage = new StorageManager();
    const savedTheme =
      localStorage.getItem("sizing-calculator-theme") || "light";
    this.setTheme(savedTheme);
  }

  createEmptyProject() {
    return {
      id: calculateUtils.generateId(),
      name: "Novo Projeto",
      created: Date.now(),
      modified: Date.now(),
      unit: "days",
      // ✨ NOVO: Data de início do projeto
      startDate: new Date().toISOString().split("T")[0], // Data de hoje no formato YYYY-MM-DD
      settings: {
        theme: "light",
        autoSave: true,
      },
      tasks: [],
    };
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  setupEventListeners() {
    // Theme toggle - Fixed
    document.getElementById("theme-toggle").addEventListener("click", () => {
      const currentTheme = document.body.getAttribute("data-theme") || "light";
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      this.setTheme(newTheme);
    });

    document
      .getElementById("project-start-date")
      .addEventListener("change", (e) => {
        this.currentProject.startDate = e.target.value;
        this.updateUI(); // Recalcular datas
        this.autoSave();
      });

    // New project
    document.getElementById("new-project-btn").addEventListener("click", () => {
      this.confirmAction(
        "Criar Novo Projeto",
        "Tem certeza? O projeto atual será perdido se não foi salvo.",
        () => {
          this.newProject();
        }
      );
    });

    // Undo/Redo
    document
      .getElementById("undo-btn")
      .addEventListener("click", () => this.undo());
    document
      .getElementById("redo-btn")
      .addEventListener("click", () => this.redo());

    // Form inputs - Fixed validation
    document.getElementById("project-name").addEventListener(
      "input",
      this.debounce((e) => {
        const value = e.target.value.trim();
        this.currentProject.name = value || "Novo Projeto";
        this.validateProjectName();
        this.updateBreadcrumb();
        this.autoSave();
      }, 300)
    );

    document.getElementById("task-unit").addEventListener("change", (e) => {
      this.currentProject.unit = e.target.value;
      this.updateUI();
      this.saveState();
      this.autoSave();
    });

    // Task form
    document
      .getElementById("add-task-btn")
      .addEventListener("click", () => this.addTask());

    // Form validation - Fixed
    ["task-name", "task-duration", "task-start"].forEach((id) => {
      const element = document.getElementById(id);
      element.addEventListener("input", () => this.validateTaskForm());
      element.addEventListener("blur", () => this.validateTaskForm());
      element.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (this.validateTaskForm()) {
            this.addTask();
          }
        }
      });
    });

    // Search and filter
    document.getElementById("search-tasks").addEventListener(
      "input",
      this.debounce(() => {
        this.filterTasks();
      }, 300)
    );

    document
      .getElementById("filter-priority")
      .addEventListener("change", () => {
        this.filterTasks();
      });

    // Export buttons - Fixed
    document
      .getElementById("save-project-btn")
      .addEventListener("click", () => this.saveProject());
    document
      .getElementById("export-csv-btn")
      .addEventListener("click", () => this.exportCSV());
    document
      .getElementById("export-json-btn")
      .addEventListener("click", () => this.exportJSON());
    document
      .getElementById("export-image-btn")
      .addEventListener("click", () => this.exportImage());

    // Gallery
    document
      .getElementById("clear-all-projects")
      .addEventListener("click", () => {
        this.confirmAction(
          "Limpar Todos os Projetos",
          "Esta ação não pode ser desfeita. Todos os projetos salvos serão removidos.",
          () => {
            this.clearAllProjects();
          }
        );
      });

    // Modal
    document
      .getElementById("modal-cancel")
      .addEventListener("click", () => this.hideModal());
    document
      .getElementById("modal-confirm")
      .addEventListener("click", () => this.confirmModalAction());
    document
      .getElementById("confirmation-modal")
      .addEventListener("click", (e) => {
        if (e.target.id === "confirmation-modal") this.hideModal();
      });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              this.redo();
            } else {
              this.undo();
            }
            break;
          case "y":
            e.preventDefault();
            this.redo();
            break;
          case "s":
            e.preventDefault();
            this.saveProject();
            break;
          case "n":
            e.preventDefault();
            this.newProject();
            break;
        }
      }
    });

    // Auto-resize chart on window resize
    window.addEventListener(
      "resize",
      this.debounce(() => {
        if (this.chart) {
          this.chart.resize();
        }
      }, 300)
    );
  }

  setTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("sizing-calculator-theme", theme);

    const themeIcon = document.querySelector(".theme-icon");
    themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";

    this.currentProject.settings.theme = theme;

    // Update chart colors if chart exists
    if (this.chart) {
      setTimeout(() => this.updateChart(), 100);
    }
  }

  newProject() {
    this.currentProject = this.createEmptyProject();
    this.history = [];
    this.historyIndex = -1;
    this.updateUI();
    this.updateChart();
    this.updateBreadcrumb();

    // ✨ NOVO: Limpar campo de nome
    document.getElementById("project-name").value = "";

    // ✨ NOVO: Atualizar campo de data
    this.updateProjectStartDateField();

    this.resetForm();
    this.showToast("success", "Novo Projeto", "Projeto criado com sucesso!");
  }

  validateProjectName() {
    const input = document.getElementById("project-name");
    const error = document.getElementById("project-name-error");
    const value = input.value.trim();

    if (value.length > 0 && value.length < 2) {
      this.showError(input, error, "Nome deve ter pelo menos 2 caracteres");
      return false;
    }

    this.clearError(input, error);
    return true;
  }

  validateTaskForm() {
    const nameValid = this.validateTaskName();
    const durationValid = this.validateTaskDuration();
    const startValid = this.validateTaskStart();

    const addBtn = document.getElementById("add-task-btn");
    addBtn.disabled = !(nameValid && durationValid && startValid);

    return nameValid && durationValid && startValid;
  }

  validateTaskName() {
    const input = document.getElementById("task-name");
    const error = document.getElementById("task-name-error");
    const value = input.value.trim();

    if (!value) {
      this.showError(input, error, "Nome da tarefa é obrigatório");
      return false;
    }

    if (value.length < 2) {
      this.showError(input, error, "Nome deve ter pelo menos 2 caracteres");
      return false;
    }

    if (
      this.currentProject.tasks.some(
        (task) => task.name.toLowerCase() === value.toLowerCase()
      )
    ) {
      this.showError(input, error, "Já existe uma tarefa com este nome");
      return false;
    }

    this.clearError(input, error);
    return true;
  }

  validateTaskDuration() {
    const input = document.getElementById("task-duration");
    const error = document.getElementById("task-duration-error");
    const value = parseFloat(input.value);

    if (isNaN(value) || value <= 0) {
      this.showError(input, error, "Duração deve ser maior que zero");
      return false;
    }

    if (value > 365) {
      this.showError(input, error, "Duração muito alta (máx: 365)");
      return false;
    }

    this.clearError(input, error);
    return true;
  }

  validateTaskStart() {
    const input = document.getElementById("task-start");
    const error = document.getElementById("task-start-error");
    const value = parseFloat(input.value);

    if (isNaN(value) || value < 0) {
      this.showError(input, error, "Início não pode ser negativo");
      return false;
    }

    this.clearError(input, error);
    return true;
  }

  showError(input, errorElement, message) {
    input.classList.add("error");
    errorElement.textContent = message;
  }

  clearError(input, errorElement) {
    input.classList.remove("error");
    errorElement.textContent = "";
  }

  addTask() {
    if (!this.validateTaskForm()) {
      this.showToast(
        "error",
        "Erro",
        "Corrija os erros no formulário antes de continuar."
      );
      return;
    }

    const task = {
      id: this.generateId(),
      name: document.getElementById("task-name").value.trim(),
      start: parseFloat(document.getElementById("task-start").value) || 0,
      duration: parseFloat(document.getElementById("task-duration").value),
      unit: this.currentProject.unit,
      dependencies: Array.from(
        document.getElementById("task-dependencies").selectedOptions
      )
        .map((o) => o.value)
        .filter((v) => v),
      priority: document.getElementById("task-priority").value,
      category:
        document.getElementById("task-category").value.trim() || "Geral",
      completed: false,
      color: this.getRandomColor(),
    };

    // Validate dependencies don't create cycles
    if (!this.validateDependencies(task)) {
      this.showToast(
        "error",
        "Erro",
        "Dependências criariam um ciclo. Verifique as dependências selecionadas."
      );
      return;
    }

    // Recalculate start time based on dependencies
    task.start = this.calculateTaskStart(task);

    this.currentProject.tasks.push(task);
    this.saveState();
    this.updateUI();
    this.updateChart();
    this.resetForm();
    this.autoSave();

    this.showToast(
      "success",
      "Tarefa Adicionada",
      `"${task.name}" foi adicionada com sucesso!`
    );
  }

  validateDependencies(newTask) {
    // Simple cycle detection using DFS
    const visited = new Set();
    const recStack = new Set();

    const hasCycle = (taskId) => {
      if (recStack.has(taskId)) return true;
      if (visited.has(taskId)) return false;

      visited.add(taskId);
      recStack.add(taskId);

      const task =
        taskId === newTask.id
          ? newTask
          : this.currentProject.tasks.find((t) => t.id === taskId);
      if (task) {
        for (const depId of task.dependencies) {
          if (hasCycle(depId)) return true;
        }
      }

      recStack.delete(taskId);
      return false;
    };

    return !hasCycle(newTask.id);
  }

  calculateTaskStart(task) {
    if (!task.dependencies.length) {
      return task.start || 0;
    }

    let maxEnd = 0;
    for (const depId of task.dependencies) {
      const depTask = this.currentProject.tasks.find((t) => t.id === depId);
      if (depTask) {
        const depEnd = depTask.start + depTask.duration;
        maxEnd = Math.max(maxEnd, depEnd);
      }
    }

    return Math.max(task.start || 0, maxEnd);
  }

  getRandomColor() {
    return this.sampleData.colors[
      Math.floor(Math.random() * this.sampleData.colors.length)
    ];
  }

  resetForm() {
    document.getElementById("task-name").value = "";
    document.getElementById("task-start").value = "0";
    document.getElementById("task-duration").value = "1";
    document.getElementById("task-priority").value = "medium";
    document.getElementById("task-category").value = "";
    document.getElementById("task-dependencies").selectedIndex = -1;

    // Clear errors
    document
      .querySelectorAll(".error-message")
      .forEach((el) => (el.textContent = ""));
    document
      .querySelectorAll(".form-control.error")
      .forEach((el) => el.classList.remove("error"));

    document.getElementById("add-task-btn").disabled = true;
  }

  updateProjectStartDateField() {
    const dateInput = document.getElementById("project-start-date");
    if (dateInput && this.currentProject.startDate) {
      dateInput.value = this.currentProject.startDate;
    }
  }

  updateUI() {
    this.updateOverview();
    this.updateTasksList();
    this.updateDependenciesSelect();
    this.updateUnitLabels();
    this.updateUndoRedoButtons();

    // ✨ NOVO: Atualizar campo de data na UI
    this.updateProjectStartDateField();
  }

  updateOverview() {
    const totalDuration = this.currentProject.tasks.reduce(
      (sum, task) => sum + task.duration,
      0
    );
    const totalTasks = this.currentProject.tasks.length;

    document.getElementById("total-duration").textContent =
      totalDuration.toFixed(1);
    document.getElementById("total-tasks").textContent = totalTasks;

    document.getElementById("duration-unit").textContent =
      this.currentProject.unit === "days" ? "dias" : "horas";

    // ✅ CORRETO: Calcular com dias úteis
    if (totalTasks > 0) {
      const maxEnd = Math.max(
        ...this.currentProject.tasks.map((task) => task.start + task.duration)
      );

      // ✨ NOVO: Parsear data corretamente para evitar erro de timezone
      const parseProjectDate = (dateString) => {
        if (!dateString) return new Date();

        // Formato esperado: "2025-12-08"
        const [year, month, day] = dateString.split("-");
        // Criar sem timezone (evita UTC)
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      };

      const projectStartDate = parseProjectDate(this.currentProject.startDate);

      let completionDate;

      if (this.currentProject.unit === "days") {
        // Se em dias, use o ConfigManager para respeitar dias úteis
        // ✅ NOVO: Usar cálculo de dias úteis
        completionDate = configManager.calculateEndDate(
          projectStartDate,
          Math.ceil(maxEnd)
        );
      } else {
        // Se em HORAS: Converter para dias úteis primeiro
        // ✅ NOVO: Converter horas para dias úteis
        const hoursPerDay = configManager.getHoursPerDay();
        const daysNeeded = Math.ceil(maxEnd / hoursPerDay);

        completionDate = configManager.calculateEndDate(
          projectStartDate,
          daysNeeded
        );
      }

      document.getElementById("completion-date").textContent =
        calculateUtils.formatDate(completionDate);
    } else {
      document.getElementById("completion-date").textContent = "-";
    }
  }

  updateTasksList() {
    const tbody = document.getElementById("tasks-tbody");
    const emptyState = document.getElementById("tasks-empty");

    if (this.currentProject.tasks.length === 0) {
      tbody.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    const searchTerm = document
      .getElementById("search-tasks")
      .value.toLowerCase();
    const priorityFilter = document.getElementById("filter-priority").value;

    let filteredTasks = this.currentProject.tasks;

    if (searchTerm) {
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.name.toLowerCase().includes(searchTerm) ||
          task.category.toLowerCase().includes(searchTerm)
      );
    }

    if (priorityFilter) {
      filteredTasks = filteredTasks.filter(
        (task) => task.priority === priorityFilter
      );
    }

    tbody.innerHTML = filteredTasks
      .map(
        (task) => `
            <tr data-task-id="${task.id}">
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 12px; height: 12px; background: ${
                          task.color
                        }; border-radius: 50%;"></div>
                        <strong>${task.name}</strong>
                    </div>
                </td>
                <td>${task.start} ${this.getUnitLabel()}</td>
                <td>${task.duration} ${this.getUnitLabel()}</td>
                <td><span class="priority-badge priority-badge--${
                  task.priority
                }">${this.getPriorityLabel(task.priority)}</span></td>
                <td>${task.category}</td>
                <td>${this.getDependenciesText(task)}</td>
                <td>
                    <button class="btn btn--sm btn--secondary" onclick="app.editTask('${
                      task.id
                    }')" title="Editar">✏️</button>
                    <button class="btn btn--sm btn--secondary" onclick="app.duplicateTask('${
                      task.id
                    }')" title="Duplicar">📋</button>
                    <button class="btn btn--sm btn--outline" onclick="app.removeTask('${
                      task.id
                    }')" title="Remover">🗑️</button>
                </td>
            </tr>
        `
      )
      .join("");
  }

  updateDependenciesSelect() {
    const select = document.getElementById("task-dependencies");
    const currentOptions = Array.from(select.selectedOptions).map(
      (o) => o.value
    );

    if (this.currentProject.tasks.length === 0) {
      select.innerHTML =
        '<option value="" disabled>Nenhuma tarefa disponível</option>';
      return;
    }

    select.innerHTML = this.currentProject.tasks
      .map((task) => `<option value="${task.id}">${task.name}</option>`)
      .join("");

    // Restore previous selections that still exist
    currentOptions.forEach((value) => {
      const option = select.querySelector(`option[value="${value}"]`);
      if (option) option.selected = true;
    });
  }

  updateUnitLabels() {
    const unit = this.currentProject.unit;
    const startGroup = document.getElementById("task-start-group");

    if (unit === "hours") {
      startGroup.style.display = "none";
    } else {
      startGroup.style.display = "block";
    }
  }

  updateUndoRedoButtons() {
    document.getElementById("undo-btn").disabled = this.historyIndex < 0;
    document.getElementById("redo-btn").disabled =
      this.historyIndex >= this.history.length - 1;
  }

  updateBreadcrumb() {
    document.getElementById(
      "breadcrumb"
    ).innerHTML = `<span>${this.currentProject.name}</span>`;
  }

  getUnitLabel() {
    return this.currentProject.unit === "days" ? "dias" : "horas";
  }

  getPriorityLabel(priority) {
    const priorityObj = this.sampleData.priorities.find(
      (p) => p.value === priority
    );
    return priorityObj ? priorityObj.label : priority;
  }

  getDependenciesText(task) {
    if (!task.dependencies.length) return "-";

    return task.dependencies
      .map((depId) => {
        const depTask = this.currentProject.tasks.find((t) => t.id === depId);
        return depTask ? depTask.name : "Tarefa removida";
      })
      .join(", ");
  }

  filterTasks() {
    this.updateTasksList();
  }

  editTask(taskId) {
    const task = this.currentProject.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Fill form with task data
    document.getElementById("task-name").value = task.name;
    document.getElementById("task-start").value = task.start;
    document.getElementById("task-duration").value = task.duration;
    document.getElementById("task-priority").value = task.priority;
    document.getElementById("task-category").value = task.category;

    // Select dependencies
    const dependenciesSelect = document.getElementById("task-dependencies");
    Array.from(dependenciesSelect.options).forEach((option) => {
      option.selected = task.dependencies.includes(option.value);
    });

    // Remove current task and change button
    this.removeTask(taskId, false);

    const addBtn = document.getElementById("add-task-btn");
    addBtn.textContent = "✏️ Atualizar Tarefa";
    addBtn.disabled = false;

    // Override the click handler temporarily
    const originalHandler = addBtn.onclick;
    addBtn.onclick = () => {
      this.addTask();
      addBtn.textContent = "➕ Adicionar Tarefa";
      addBtn.onclick = originalHandler;
    };

    this.showToast(
      "info",
      "Edição",
      'Tarefa carregada para edição. Faça as alterações e clique em "Atualizar".'
    );
  }

  duplicateTask(taskId) {
    const task = this.currentProject.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const duplicatedTask = {
      ...task,
      id: this.generateId(),
      name: `${task.name} (Cópia)`,
      start: task.start + task.duration,
      dependencies: [], // Remove dependencies for duplicated task
    };

    this.currentProject.tasks.push(duplicatedTask);
    this.saveState();
    this.updateUI();
    this.updateChart();
    this.autoSave();

    this.showToast(
      "success",
      "Tarefa Duplicada",
      `"${duplicatedTask.name}" foi criada!`
    );
  }

  removeTask(taskId, showConfirmation = true) {
    const task = this.currentProject.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const performRemoval = () => {
      // Remove dependencies from other tasks
      this.currentProject.tasks.forEach((t) => {
        t.dependencies = t.dependencies.filter((depId) => depId !== taskId);
      });

      // Remove the task
      this.currentProject.tasks = this.currentProject.tasks.filter(
        (t) => t.id !== taskId
      );

      this.saveState();
      this.updateUI();
      this.updateChart();
      this.autoSave();

      this.showToast(
        "success",
        "Tarefa Removida",
        `"${task.name}" foi removida!`
      );
    };

    if (showConfirmation) {
      this.confirmAction(
        "Remover Tarefa",
        `Tem certeza que deseja remover "${task.name}"?`,
        performRemoval
      );
    } else {
      performRemoval();
    }
  }

  populateCategories() {
    const datalist = document.getElementById("categories-list");
    datalist.innerHTML = this.sampleData.categories
      .map((cat) => `<option value="${cat}">`)
      .join("");
  }

  populateTemplates() {
    const container = document.getElementById("template-buttons");
    container.innerHTML = this.sampleData.templates
      .map(
        (template) => `
            <button class="template-btn" onclick="app.applyTemplate('${template.name}')" title="Aplicar template ${template.name}">
                📋 ${template.name}
            </button>
        `
      )
      .join("");
  }

  applyTemplate(templateName) {
    const template = this.sampleData.templates.find(
      (t) => t.name === templateName
    );
    if (!template) return;

    this.confirmAction(
      "Aplicar Template",
      `Aplicar template "${templateName}"? As tarefas atuais serão removidas.`,
      () => {
        this.currentProject.tasks = [];

        let currentStart = 0;
        template.tasks.forEach((taskTemplate, index) => {
          const task = {
            id: this.generateId(),
            name: taskTemplate.name,
            start: currentStart,
            duration: taskTemplate.duration,
            unit: this.currentProject.unit,
            dependencies:
              index > 0 ? [this.currentProject.tasks[index - 1].id] : [],
            priority: taskTemplate.priority,
            category: taskTemplate.category,
            completed: false,
            color: this.getRandomColor(),
          };

          if (index > 0) {
            task.start =
              this.currentProject.tasks[index - 1].start +
              this.currentProject.tasks[index - 1].duration;
          }

          this.currentProject.tasks.push(task);
          currentStart = task.start + task.duration;
        });

        this.saveState();
        this.updateUI();
        this.updateChart();
        this.autoSave();

        this.showToast(
          "success",
          "Template Aplicado",
          `Template "${templateName}" aplicado com sucesso!`
        );
      }
    );
  }

  initChart() {
    const ctx = document.getElementById("timeline-chart").getContext("2d");

    this.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        scales: {
          x: {
            title: {
              display: true,
              text: "Tempo",
            },
            beginAtZero: true,
          },
          y: {
            title: {
              display: true,
              text: "Tarefas",
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              title: (context) => {
                const task = this.currentProject.tasks[context[0].dataIndex];
                return task ? task.name : "";
              },
              label: (context) => {
                const task = this.currentProject.tasks[context.dataIndex];
                if (!task) return "";

                const unit = this.getUnitLabel();
                return [
                  `Início: ${task.start} ${unit}`,
                  `Duração: ${task.duration} ${unit}`,
                  `Prioridade: ${this.getPriorityLabel(task.priority)}`,
                  `Categoria: ${task.category}`,
                ];
              },
            },
          },
        },
      },
    });

    this.updateChart();
  }

  updateChart() {
    if (!this.chart) return;

    const emptyState = document.getElementById("chart-empty");

    if (this.currentProject.tasks.length === 0) {
      emptyState.classList.remove("hidden");
      this.chart.data.labels = [];
      this.chart.data.datasets = [];
      this.chart.update();
      return;
    }

    emptyState.classList.add("hidden");

    const tasks = [...this.currentProject.tasks].sort(
      (a, b) => a.start - b.start
    );

    this.chart.data.labels = tasks.map((task) => task.name);
    this.chart.data.datasets = [
      {
        label: "Cronograma",
        data: tasks.map((task) => [task.start, task.start + task.duration]),
        backgroundColor: tasks.map((task) => task.color + "80"), // Add transparency
        borderColor: tasks.map((task) => task.color),
        borderWidth: 2,
        borderRadius: 4,
      },
    ];

    this.chart.update();
  }

  saveState() {
    // Remove old states if we're not at the end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Add new state
    this.history.push(JSON.parse(JSON.stringify(this.currentProject)));

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }

    this.updateUndoRedoButtons();
  }

  undo() {
    if (this.historyIndex < 0) return;

    if (this.historyIndex === this.history.length - 1) {
      // Save current state before undoing
      this.history.push(JSON.parse(JSON.stringify(this.currentProject)));
    }

    this.currentProject = JSON.parse(
      JSON.stringify(this.history[this.historyIndex])
    );
    this.historyIndex--;

    this.updateUI();
    this.updateChart();
    this.updateBreadcrumb();

    document.getElementById("project-name").value =
      this.currentProject.name === "Novo Projeto"
        ? ""
        : this.currentProject.name;
    document.getElementById("task-unit").value = this.currentProject.unit;

    this.showToast("info", "Desfeito", "Ação desfeita com sucesso!");
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;

    this.historyIndex++;
    this.currentProject = JSON.parse(
      JSON.stringify(this.history[this.historyIndex])
    );

    this.updateUI();
    this.updateChart();
    this.updateBreadcrumb();

    document.getElementById("project-name").value =
      this.currentProject.name === "Novo Projeto"
        ? ""
        : this.currentProject.name;
    document.getElementById("task-unit").value = this.currentProject.unit;

    this.showToast("info", "Refeito", "Ação refeita com sucesso!");
  }

  autoSave() {
    if (!this.currentProject.settings.autoSave) return;

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      this.saveToLocalStorage();
    }, 2000);
  }

  saveToLocalStorage() {
    try {
      const autoSaveData = {
        project: this.currentProject,
        timestamp: Date.now(),
      };
      localStorage.setItem(
        "sizing-calculator-autosave",
        JSON.stringify(autoSaveData)
      );
    } catch (error) {
      console.warn("Failed to auto-save:", error);
    }
  }

  loadFromAutoSave() {
    try {
      const autoSaveData = JSON.parse(
        localStorage.getItem("sizing-calculator-autosave")
      );
      if (autoSaveData && autoSaveData.project) {
        this.currentProject = autoSaveData.project;
        this.updateUI();
        this.updateChart();
        this.updateBreadcrumb();

        document.getElementById("project-name").value =
          this.currentProject.name === "Novo Projeto"
            ? ""
            : this.currentProject.name;
        document.getElementById("task-unit").value = this.currentProject.unit;

        this.showToast("info", "Auto-save", "Projeto restaurado do auto-save!");
        return true;
      }
    } catch (error) {
      console.warn("Failed to load auto-save:", error);
    }
    return false;
  }

  saveProject() {
    const projectName = document.getElementById("project-name").value.trim();
    const displayName =
      projectName || this.currentProject.name || "Novo Projeto";

    this.currentProject.name = displayName;
    this.currentProject.modified = Date.now();

    // ✨ Garantir que a data está salva
    const dateInput = document.getElementById("project-start-date");
    if (dateInput && dateInput.value) {
      this.currentProject.startDate = dateInput.value;
    }

    // ✨ Salvar diretamente no localStorage (sem StorageManager)
    try {
      const savedProjects = this.getSavedProjects();
      const existingIndex = savedProjects.findIndex(
        (p) => p.id === this.currentProject.id
      );

      if (existingIndex >= 0) {
        savedProjects[existingIndex] = { ...this.currentProject };
      } else {
        savedProjects.push({ ...this.currentProject });
      }

      localStorage.setItem(
        "sizing-calculator-projects",
        JSON.stringify(savedProjects)
      );

      this.updateGallery();
      this.updateBreadcrumb();
      this.showToast(
        "success",
        "Projeto Salvo",
        `"${displayName}" foi salvo com sucesso!`
      );
    } catch (error) {
      console.error("Erro ao salvar:", error);
      this.showToast("error", "Erro", "Falha ao salvar o projeto.");
    }
  }

  getSavedProjects() {
    try {
      const data = localStorage.getItem("sizing-calculator-projects");

      // ✨ NOVO: Se não existe, retorna array vazio
      if (!data) {
        return [];
      }

      // ✨ NOVO: Parsear JSON
      let projects = JSON.parse(data);

      // ✨ NOVO: Se não for array, retorna vazio
      if (!Array.isArray(projects)) {
        console.warn("Dados salvos não são um array válido");
        localStorage.removeItem("sizing-calculator-projects");
        return [];
      }

      // ✨ NOVO: Se algum item é string, tentar parsear
      projects = projects
        .map((project) => {
          if (typeof project === "string") {
            try {
              return JSON.parse(project);
            } catch (e) {
              console.warn("Não foi possível parsear projeto string:", project);
              return null;
            }
          }
          return project;
        })
        .filter((p) => p !== null); // Remove itens que falharam

      return projects;
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
      return [];
    }
  }

  loadSavedProjects() {
    this.updateGallery();

    // Try to load from auto-save if no current project
    if (this.currentProject.tasks.length === 0) {
      this.loadFromAutoSave();
    }
  }

  updateGallery() {
    const gallery = document.getElementById("gallery-grid");
    const emptyState = document.getElementById("gallery-empty");
    const savedProjects = this.getSavedProjects();

    if (savedProjects.length === 0) {
      emptyState.classList.remove("hidden");
      gallery.innerHTML = "";
      gallery.appendChild(emptyState);
      return;
    }

    emptyState.classList.add("hidden");

    gallery.innerHTML = savedProjects
      .map(
        (project) => `
            <div class="project-card" onclick="app.loadProject('${
              project.id
            }')">
                <div class="project-card-header">
                    <div>
                        <h3 class="project-card-title">${project.name}</h3>
                        <div class="project-card-meta">
                            Modificado: ${new Date(
                              project.modified
                            ).toLocaleDateString("pt-BR")}
                        </div>
                    </div>
                    <div class="project-card-actions">
                        <button class="btn btn--sm btn--secondary" onclick="event.stopPropagation(); app.duplicateProject('${
                          project.id
                        }')" title="Duplicar">📋</button>
                        <button class="btn btn--sm btn--outline" onclick="event.stopPropagation(); app.deleteProject('${
                          project.id
                        }')" title="Excluir">🗑️</button>
                    </div>
                </div>
                <div class="project-card-preview">
                    ${this.generateProjectPreview(project)}
                </div>
                <div class="project-card-stats">
                    <span>${project.tasks.length} tarefas</span>
                    <span>${project.tasks.reduce(
                      (sum, task) => sum + task.duration,
                      0
                    )} ${project.unit === "days" ? "dias" : "horas"}</span>
                </div>
            </div>
        `
      )
      .join("");
  }

  generateProjectPreview(project) {
    if (project.tasks.length === 0) {
      return '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-text-secondary); font-size: 12px;">Sem tarefas</div>';
    }

    const maxDuration = Math.max(
      ...project.tasks.map((task) => task.start + task.duration)
    );
    return project.tasks
      .slice(0, 5)
      .map((task) => {
        const width = Math.max(5, (task.duration / maxDuration) * 100);
        const left = (task.start / maxDuration) * 100;
        return `<div style="position: absolute; left: ${left}%; width: ${width}%; height: 8px; background: ${
          task.color
        }; border-radius: 4px; top: ${
          project.tasks.indexOf(task) * 12
        }px;"></div>`;
      })
      .join("");
  }

  loadProject(projectId) {
    try {
      const savedProjects = this.getSavedProjects();

      // ✨ NOVO: Buscar projeto com verificação de tipo
      let project = savedProjects.find((p) => {
        if (!p || !p.id) return false;
        return p.id === projectId;
      });

      if (!project) {
        this.showToast("error", "Erro", "Projeto não encontrado.");
        return;
      }

      // ✨ NOVO: Se ainda for string (por algum motivo), parsear
      if (typeof project === "string") {
        try {
          project = JSON.parse(project);
        } catch (e) {
          this.showToast("error", "Erro", "Falha ao carregar projeto.");
          return;
        }
      }

      // ✨ NOVO: Deep clone para evitar referências
      this.currentProject = JSON.parse(JSON.stringify(project));

      // ✨ NOVO: Garantir que startDate existe
      if (!this.currentProject.startDate) {
        this.currentProject.startDate = new Date().toISOString().split("T")[0];
      }

      // Reset history
      this.history = [];
      this.historyIndex = -1;

      // Atualizar UI
      this.updateUI();
      this.updateChart();
      this.updateBreadcrumb();

      // Atualizar inputs
      document.getElementById("project-name").value =
        this.currentProject.name || "Novo Projeto";
      document.getElementById("task-unit").value = this.currentProject.unit;

      // ✨ NOVO: Atualizar campo de data
      const dateInput = document.getElementById("project-start-date");
      if (dateInput) {
        dateInput.value = this.currentProject.startDate || "";
      }

      this.showToast(
        "success",
        "Projeto Carregado",
        `Projeto "${this.currentProject.name}" carregado com sucesso!`
      );
    } catch (error) {
      console.error("Erro ao carregar projeto:", error);
      this.showToast("error", "Erro", "Falha ao carregar o projeto.");
    }
  }

  cleanupCorruptedProjects() {
    try {
      const data = localStorage.getItem("sizing-calculator-projects");

      if (!data) {
        console.log("Nenhum dado salvo.");
        return;
      }

      let projects = JSON.parse(data);

      // Limpar itens inválidos
      projects = projects
        .map((p) => {
          if (typeof p === "string") {
            try {
              return JSON.parse(p);
            } catch {
              return null;
            }
          }
          return p;
        })
        .filter((p) => p && p.id && p.name); // Remover inválidos

      if (projects.length === 0) {
        localStorage.removeItem("sizing-calculator-projects");
        console.log("Todos os projetos corrompidos foram removidos.");
        this.updateGallery();
        return;
      }

      localStorage.setItem(
        "sizing-calculator-projects",
        JSON.stringify(projects)
      );

      console.log(`${projects.length} projetos válidos mantidos.`);
      this.updateGallery();
    } catch (error) {
      console.error("Erro ao limpar projetos:", error);
    }
  }

  calculateTaskEnd(task) {
    // ✨ Usar data do projeto
    if (!this.currentProject.startDate) {
      this.currentProject.startDate = new Date().toISOString().split("T")[0];
    }

    const startDate = new Date(this.currentProject.startDate);
    startDate.setDate(startDate.getDate() + task.start);

    // Calcular com dias úteis
    const endDate = configManager.calculateEndDate(startDate, task.duration);
    return endDate;
  }

  getProjectTimeline() {
    const timeline = {
      projectName: this.currentProject.name,
      startDate: this.currentProject.startDate,
      tasks: this.currentProject.tasks.map((task) => ({
        name: task.name,
        startDate: this.calculateTaskStart(task),
        endDate: this.calculateTaskEnd(task), // ✨ Usa a data do projeto
        duration: task.duration,
        priority: task.priority,
      })),
    };
    return timeline;
  }

  duplicateProject(projectId) {
    const savedProjects = this.getSavedProjects();
    const project = savedProjects.find((p) => p.id === projectId);

    if (!project) return;

    const duplicatedProject = {
      ...project,
      id: this.generateId(),
      name: `${project.name} (Cópia)`,
      created: Date.now(),
      modified: Date.now(),
    };

    savedProjects.push(duplicatedProject);
    localStorage.setItem(
      "sizing-calculator-projects",
      JSON.stringify(savedProjects)
    );
    this.updateGallery();

    this.showToast(
      "success",
      "Projeto Duplicado",
      `"${duplicatedProject.name}" foi criado!`
    );
  }

  deleteProject(projectId) {
    this.confirmAction(
      "Excluir Projeto",
      `Tem certeza que deseja excluir este projeto?`,
      () => {
        // Lê os projetos DIRETAMENTE do localStorage no momento da confirmação
        const currentProjects = this.getSavedProjects();

        // Encontra o projeto ANTES de filtrar para manter a referência
        const project = currentProjects.find((p) => p.id === projectId);
        if (!project) return;

        // Filtra os projetos atualizados
        const updatedProjects = currentProjects.filter(
          (p) => p.id !== projectId
        );

        localStorage.setItem(
          "sizing-calculator-projects",
          JSON.stringify(updatedProjects)
        );

        // Atualiza a lista de projetos na memória
        this.projects = updatedProjects; // Adicione esta linha se tiver uma propriedade this.projects

        this.updateGallery();
        this.showToast(
          "success",
          "Projeto Excluído",
          `"${project.name}" foi excluído!`
        );
      }
    );
  }

  clearAllProjects() {
    localStorage.removeItem("sizing-calculator-projects");
    this.updateGallery();
    this.showToast(
      "success",
      "Projetos Limpos",
      "Todos os projetos foram removidos!"
    );
  }

  exportCSV() {
    if (this.currentProject.tasks.length === 0) {
      this.showToast("warning", "Aviso", "Não há tarefas para exportar.");
      return;
    }

    const headers = [
      "Nome",
      "Início",
      "Duração",
      "Unidade",
      "Prioridade",
      "Categoria",
      "Dependências",
    ];
    const rows = this.currentProject.tasks.map((task) => [
      task.name,
      task.start,
      task.duration,
      this.currentProject.unit,
      this.getPriorityLabel(task.priority),
      task.category,
      this.getDependenciesText(task).replace("-", ""),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    this.downloadFile(
      csvContent,
      `${this.currentProject.name.replace(/[^a-z0-9]/gi, "_")}.csv`,
      "text/csv"
    );
    this.showToast("success", "Exportado", "Arquivo CSV baixado com sucesso!");
  }

  exportJSON() {
    const exportData = {
      ...this.currentProject,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    this.downloadFile(
      jsonContent,
      `${this.currentProject.name.replace(/[^a-z0-9]/gi, "_")}.json`,
      "application/json"
    );
    this.showToast("success", "Exportado", "Arquivo JSON baixado com sucesso!");
  }

  exportImage() {
    if (!this.chart || this.currentProject.tasks.length === 0) {
      this.showToast("warning", "Aviso", "Não há gráfico para exportar.");
      return;
    }

    this.showLoading();

    setTimeout(() => {
      try {
        const canvas = this.chart.canvas;
        const url = canvas.toDataURL("image/png");

        const link = document.createElement("a");
        link.download = `${this.currentProject.name.replace(
          /[^a-z0-9]/gi,
          "_"
        )}_cronograma.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.hideLoading();
        this.showToast(
          "success",
          "Exportado",
          "Imagem do cronograma baixada com sucesso!"
        );
      } catch (error) {
        this.hideLoading();
        this.showToast("error", "Erro", "Falha ao exportar imagem.");
      }
    }, 500);
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  showToast(type, title, message) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;

    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };

    toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${icons[type] || "ℹ️"}</div>
                <div class="toast-message">
                    <div class="toast-title">${title}</div>
                    <p class="toast-description">${message}</p>
                </div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  }

  confirmAction(title, message, callback) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-message").textContent = message;

    this.modalCallback = callback;
    document.getElementById("confirmation-modal").classList.remove("hidden");
  }

  confirmModalAction() {
    if (this.modalCallback) {
      this.modalCallback();
      this.modalCallback = null;
    }
    this.hideModal();
  }

  hideModal() {
    document.getElementById("confirmation-modal").classList.add("hidden");
    this.modalCallback = null;
  }

  showLoading() {
    document.getElementById("loading-overlay").classList.remove("hidden");
  }

  hideLoading() {
    document.getElementById("loading-overlay").classList.add("hidden");
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize the application
const app = new SizingCalculator();

const settingsUI = new SettingsUI(configManager);

// Adicionar listener ao botão
document.getElementById("settings-btn").addEventListener("click", () => {
  settingsUI.openSettings();
});

// Sincronizar tema ao carregar
const savedTheme = configManager.getConfig().theme;
app.setTheme(savedTheme);
// Make app available globally for inline event handlers
window.app = app;
