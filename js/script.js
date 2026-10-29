class SizingCalculator {
  constructor() {
    this.currentProject = this.createEmptyProject();
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 10;
    this.chart = null;
    this.autoSaveTimeout = null;
    this.dslParser = new DSLParser();

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
      unit: "hours",
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

    // Task form
    document
      .getElementById("add-task-btn")
      .addEventListener("click", () => this.addTask());
    document
      .getElementById("add-another-btn")
      .addEventListener("click", () => this.addTask(true));

    // Drawer
    document
      .getElementById("open-drawer-btn")
      .addEventListener("click", () => this.openDrawer());
    document
      .getElementById("drawer-close")
      .addEventListener("click", () => this.requestCloseDrawer());
    document
      .getElementById("drawer-cancel")
      .addEventListener("click", () => this.closeDrawer());
    document
      .getElementById("drawer-backdrop")
      .addEventListener("click", () => this.requestCloseDrawer());
    document
      .getElementById("task-drawer")
      .addEventListener("keydown", (e) => this.trapFocus(e));

    // Popover menus (templates + row actions)
    document.getElementById("templates-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeRowMenu();
      const menu = document.getElementById("templates-menu");
      const open = !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", open);
      e.currentTarget.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", () => this.closeMenus());
    window.addEventListener("scroll", () => this.closeRowMenu(), true);
    window.addEventListener("resize", () => this.closeRowMenu());

    // Form validation - Fixed
    document
      .getElementById("add-form-subtask-btn")
      .addEventListener("click", () => this.addFormSubtask());
    document
      .getElementById("toggle-expand-btn")
      .addEventListener("click", () => this.toggleExpandAll());

    ["task-name", "task-duration"].forEach((id) => {
      const element = document.getElementById(id);
      element.addEventListener("input", () => this.validateTaskForm());
      element.addEventListener("blur", () => this.validateTaskForm());
      element.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (this.validateTaskForm()) {
            this.addTask(e.shiftKey);
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
      .getElementById("export-xlsx-btn")
      .addEventListener("click", () => this.exportXLSX());
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
      if (e.key === "Escape") {
        if (this.closeMenus()) return;
        if (this.isDrawerOpen()) this.requestCloseDrawer();
        return;
      }

      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(
        (e.target && e.target.tagName) || ""
      );
      const modalOpen = document.querySelector(".modal-overlay:not(.hidden)");
      if (
        e.key.toLowerCase() === "n" &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        !typing && !modalOpen && !this.isDrawerOpen()
      ) {
        e.preventDefault();
        this.openDrawer();
        return;
      }

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

    // DSL Mode toggles
    document
      .getElementById("form-mode-btn")
      .addEventListener("click", () => this.showFormTab());

    document.getElementById("dsl-mode-btn").addEventListener("click", () => {
      document.getElementById("dsl-container").classList.remove("hidden");
      document.getElementById("form-container").classList.add("hidden");
      document.getElementById("dsl-mode-btn").classList.add("active");
      document.getElementById("form-mode-btn").classList.remove("active");
      document.getElementById("task-drawer").classList.add("drawer--dsl");

      // Sync editor with current tasks
      this.updateDSLEditor();
    });

    document.getElementById("apply-dsl-btn").addEventListener("click", () => {
      this.applyDSL();
    });
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
    this.editingTaskId = null;
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

    const valid = nameValid && durationValid;
    document.getElementById("add-task-btn").disabled = !valid;
    document.getElementById("add-another-btn").disabled = !valid;
    this.updateDrawerSummary();

    return valid;
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
        (task) =>
          task.id !== this.editingTaskId &&
          task.name.toLowerCase() === value.toLowerCase()
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
    const value = this.getFormHours();

    if (isNaN(value) || value <= 0) {
      this.showError(input, error, "Informe as horas (maior que zero)");
      return false;
    }

    if (value > 10000) {
      this.showError(input, error, "Horas muito altas (máx: 10.000)");
      return false;
    }

    this.clearError(input, error);
    return true;
  }

  /** Hours typed in the form, or the sum of the subtasks when there are any. */
  getFormHours() {
    const subs = this.formSubtasks || [];
    if (subs.length) {
      return subs.reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
    }
    return parseFloat(document.getElementById("task-duration").value);
  }

  getFormPriority() {
    const checked = document.querySelector('input[name="task-priority"]:checked');
    return checked ? checked.value : "medium";
  }

  setFormPriority(value) {
    const radio = document.querySelector(
      `input[name="task-priority"][value="${value}"]`
    );
    if (radio) radio.checked = true;
  }

  // ---- Subtasks inside the "new task" form ---------------------------------

  addFormSubtask() {
    this.formSubtasks = this.formSubtasks || [];
    this.formSubtasks.push({
      id: this.generateId(),
      name: "",
      description: "",
      hours: 1,
      done: false,
    });
    this.renderFormSubtasks(this.formSubtasks.length - 1);
    const names = document.querySelectorAll("#form-subtasks .fs-name");
    if (names.length) names[names.length - 1].focus();
  }

  removeFormSubtask(index) {
    const item = document.querySelectorAll("#form-subtasks .fs-item")[index];
    const remove = () => {
      this.formSubtasks.splice(index, 1);
      this.renderFormSubtasks();
    };
    if (!item || this.prefersReducedMotion()) return remove();
    if (item.classList.contains("is-leaving")) return;
    item.classList.add("is-leaving");
    setTimeout(remove, 180);
  }

  updateFormSubtask(index, field, value) {
    const sub = this.formSubtasks[index];
    if (!sub) return;
    sub[field] = field === "hours" ? Math.max(0, parseFloat(value) || 0) : value;
    this.syncFormHours(); // no re-render: keeps focus in the input
  }

  /** With subtasks the hours field becomes a read-only automatic sum. */
  syncFormHours() {
    const subs = this.formSubtasks || [];
    const input = document.getElementById("task-duration");
    const help = document.getElementById("task-duration-help");
    const total = document.getElementById("form-subtask-total");

    if (subs.length) {
      const sum = this.getFormHours();
      input.value = this.formatHours(sum);
      input.readOnly = true;
      help.textContent = "Soma automática das subtarefas.";
      total.textContent = `${this.formatHours(sum)}h`;
    } else {
      input.readOnly = false;
      help.textContent = "Ou divida em subtarefas abaixo.";
      total.textContent = "";
    }
    this.validateTaskForm();
  }

  renderFormSubtasks(newIndex = -1) {
    document.getElementById("form-subtasks").innerHTML = (this.formSubtasks || [])
      .map(
        (s, i) => `
        <div class="fs-item ${i === newIndex ? "is-new" : ""}">
          <div class="fs-row">
            <input type="text" class="form-control form-control--sm fs-name" maxlength="100"
              placeholder="Subtarefa ${i + 1}" value="${this.escapeHtml(s.name)}"
              oninput="app.updateFormSubtask(${i}, 'name', this.value)" />
            <div class="input-suffix fs-hours">
              <input type="number" class="form-control form-control--sm" min="0" step="0.5"
                value="${s.hours}" aria-label="Horas"
                oninput="app.updateFormSubtask(${i}, 'hours', this.value)" />
              <span class="input-suffix-text">h</span>
            </div>
            <button type="button" class="fs-remove" title="Remover subtarefa" aria-label="Remover"
              onclick="app.removeFormSubtask(${i})">×</button>
          </div>
          <input type="text" class="form-control form-control--sm" placeholder="Descrição (opcional)"
            value="${this.escapeHtml(s.description)}"
            oninput="app.updateFormSubtask(${i}, 'description', this.value)" />
        </div>`
      )
      .join("");
    this.syncFormHours();
  }

  showError(input, errorElement, message) {
    input.classList.add("error");
    errorElement.textContent = message;
  }

  clearError(input, errorElement) {
    input.classList.remove("error");
    errorElement.textContent = "";
  }

  addTask(keepOpen = false) {
    if (!this.validateTaskForm()) {
      this.showToast(
        "error",
        "Erro",
        "Corrija os erros no formulário antes de continuar."
      );
      return;
    }

    const subtasks = (this.formSubtasks || [])
      .filter((st) => st.name.trim())
      .map((st) => ({ ...st, name: st.name.trim(), description: st.description.trim() }));

    const fields = {
      name: document.getElementById("task-name").value.trim(),
      duration: subtasks.length
        ? subtasks.reduce((sum, st) => sum + st.hours, 0)
        : parseFloat(document.getElementById("task-duration").value),
      dependencies: Array.from(
        document.getElementById("task-dependencies").selectedOptions
      )
        .map((o) => o.value)
        .filter((v) => v),
      priority: this.getFormPriority(),
      category:
        document.getElementById("task-category").value.trim() || "Geral",
      description: document.getElementById("task-description").value.trim(),
      subtasks,
    };

    // Editing keeps everything the form doesn't show (id, color, logic, done flag...)
    const editingIndex = this.currentProject.tasks.findIndex(
      (t) => t.id === this.editingTaskId
    );
    const editing = editingIndex >= 0;
    const task = editing
      ? {
          ...this.currentProject.tasks[editingIndex],
          ...fields,
          completed: subtasks.length
            ? false
            : this.currentProject.tasks[editingIndex].completed,
        }
      : {
          id: this.generateId(),
          start: 0,
          unit: "hours",
          completed: false,
          color: this.getRandomColor(),
          ...fields,
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

    if (editing) {
      this.currentProject.tasks[editingIndex] = task;
    } else {
      this.currentProject.tasks.push(task);
    }
    this.lastAddedId = task.id;
    this.saveState();
    this.updateUI();
    this.updateChart();
    this.autoSave();

    this.showToast(
      "success",
      editing ? "Tarefa Atualizada" : "Tarefa Adicionada",
      `"${this.escapeHtml(task.name)}" ${editing ? "foi atualizada" : "foi adicionada"} com sucesso!`
    );

    if (keepOpen && !editing) {
      this.resetForm();
      this.formSnapshot = this.getFormState();
      document.getElementById("task-name").focus();
    } else {
      this.closeDrawer();
    }
  }

  // ---- Drawer ---------------------------------------------------------------

  prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  isDrawerOpen() {
    return document.getElementById("task-drawer").classList.contains("is-open");
  }

  /** Open the drawer empty (new task) or filled with an existing task. */
  openDrawer(taskId = null) {
    if (this.isDrawerOpen()) return;
    const task = taskId
      ? this.currentProject.tasks.find((t) => t.id === taskId)
      : null;

    this.closeMenus();
    this.drawerOpener = document.activeElement;
    this.editingTaskId = task ? task.id : null;

    this.showFormTab();
    this.updateDependenciesSelect();
    if (task) this.loadTaskIntoForm(task);
    else this.resetForm();
    this.updateDrawerMode();
    this.formSnapshot = this.getFormState();

    document.getElementById("task-drawer").classList.add("is-open");
    document.getElementById("task-drawer").setAttribute("aria-hidden", "false");
    document.getElementById("drawer-backdrop").classList.add("is-open");
    document.body.classList.add("drawer-open");

    const name = document.getElementById("task-name");
    requestAnimationFrame(() => name.focus({ preventScroll: true }));
  }

  closeDrawer() {
    const drawer = document.getElementById("task-drawer");
    if (!drawer.classList.contains("is-open")) return;

    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.getElementById("drawer-backdrop").classList.remove("is-open");
    document.body.classList.remove("drawer-open");
    this.editingTaskId = null;

    const opener = this.drawerOpener;
    this.drawerOpener = null;
    if (opener && document.contains(opener) && opener.focus) opener.focus();
  }

  /** Esc / backdrop / X: refuse to throw away typed data by accident. */
  requestCloseDrawer() {
    const dirty =
      !document.getElementById("task-drawer").classList.contains("drawer--dsl") &&
      this.getFormState() !== this.formSnapshot;
    if (!dirty) return this.closeDrawer();

    const drawer = document.getElementById("task-drawer");
    drawer.classList.remove("drawer--shake");
    void drawer.offsetWidth; // restart the animation
    drawer.classList.add("drawer--shake");
    setTimeout(() => drawer.classList.remove("drawer--shake"), 450);
    this.showToast(
      "info",
      "Alterações não salvas",
      "Salve a tarefa ou use “Cancelar” para descartar."
    );
  }

  trapFocus(e) {
    if (e.key !== "Tab") return;
    const focusable = Array.from(
      document
        .getElementById("task-drawer")
        .querySelectorAll(
          'button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'
        )
    ).filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  showFormTab() {
    document.getElementById("form-container").classList.remove("hidden");
    document.getElementById("dsl-container").classList.add("hidden");
    document.getElementById("form-mode-btn").classList.add("active");
    document.getElementById("dsl-mode-btn").classList.remove("active");
    document.getElementById("task-drawer").classList.remove("drawer--dsl");
  }

  updateDrawerMode() {
    const editing = !!this.editingTaskId;
    document.getElementById("form-title").textContent = editing
      ? "Editando tarefa"
      : "Nova tarefa";
    document.getElementById("add-task-label").textContent = editing
      ? "Salvar alterações"
      : "Adicionar tarefa";
    document
      .getElementById("task-drawer")
      .classList.toggle("drawer--editing", editing);
  }

  getFormState() {
    return JSON.stringify({
      n: document.getElementById("task-name").value,
      d: document.getElementById("task-description").value,
      h: document.getElementById("task-duration").value,
      p: this.getFormPriority(),
      c: document.getElementById("task-category").value,
      s: this.formSubtasks || [],
      dep: Array.from(
        document.getElementById("task-dependencies").selectedOptions
      ).map((o) => o.value),
    });
  }

  loadTaskIntoForm(task) {
    document.getElementById("task-name").value = task.name;
    document.getElementById("task-description").value = task.description || "";
    document.getElementById("task-duration").value = task.duration;
    this.setFormPriority(task.priority);
    document.getElementById("task-category").value = task.category;
    this.formSubtasks = (task.subtasks || []).map((st) => ({ ...st }));
    this.renderFormSubtasks();

    const select = document.getElementById("task-dependencies");
    Array.from(select.options).forEach((option) => {
      option.selected = (task.dependencies || []).includes(option.value);
    });
    const hasDeps = (task.dependencies || []).length > 0;
    select.closest("details").open = hasDeps;

    document.querySelectorAll(".error-message").forEach((el) => (el.textContent = ""));
    this.validateTaskForm();
  }

  updateDrawerSummary() {
    const subs = (this.formSubtasks || []).length;
    const hours = this.getFormHours();
    const label = `${this.formatHours(isNaN(hours) ? 0 : hours)}h`;
    document.getElementById("drawer-summary").textContent = subs
      ? `${label} · ${subs} subtarefa${subs > 1 ? "s" : ""}`
      : label;
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
      if (task && task.dependencies) {
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
    if (!task.dependencies || !task.dependencies.length) {
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
    document.getElementById("task-description").value = "";
    document.getElementById("task-duration").value = "1";
    this.setFormPriority("medium");
    document.getElementById("task-category").value = "";
    document.getElementById("task-dependencies").selectedIndex = -1;
    this.formSubtasks = [];
    this.renderFormSubtasks();

    // Clear errors
    document
      .querySelectorAll(".error-message")
      .forEach((el) => (el.textContent = ""));
    document
      .querySelectorAll(".form-control.error")
      .forEach((el) => el.classList.remove("error"));

    document.getElementById("add-task-btn").disabled = true;
    document.getElementById("add-another-btn").disabled = true;
  }

  updateProjectStartDateField() {
    const dateInput = document.getElementById("project-start-date");
    if (dateInput && this.currentProject.startDate) {
      dateInput.value = this.currentProject.startDate;
    }
  }

  updateUI() {
    this.recalculateSchedule();
    this.updateOverview();
    this.updateTasksList();
    this.updateDependenciesSelect();
    this.updateUndoRedoButtons();
    this.updateDSLEditor();

    // ✨ NOVO: Atualizar campo de data na UI
    this.updateProjectStartDateField();
  }

  /**
   * Everything is derived from the checklist: a task with subtasks takes the
   * sum of their hours, and a task starts when its dependencies end (or right
   * after the previous task when it has none).
   */
  recalculateSchedule() {
    const tasks = this.currentProject.tasks;

    tasks.forEach((task) => {
      if (task.subtasks && task.subtasks.length) {
        const sum = this.getTaskHours(task);
        if (sum > 0) task.duration = sum;
      }
    });

    for (let pass = 0; pass < tasks.length; pass++) {
      let changed = false;
      tasks.forEach((task, i) => {
        let start;
        if (task.dependencies && task.dependencies.length) {
          start = this.calculateTaskStart({ ...task, start: 0 });
        } else {
          const prev = tasks[i - 1];
          start = prev ? prev.start + prev.duration : 0;
        }
        if (task.start !== start) {
          task.start = start;
          changed = true;
        }
      });
      if (!changed) break;
    }
  }

  /** Count the number up/down to its new value (instant on first paint). */
  animateStat(id, value, format) {
    const el = document.getElementById(id);
    const from = el._stat;
    el._stat = value;
    if (el._raf) cancelAnimationFrame(el._raf);

    if (from == null || from === value || this.prefersReducedMotion()) {
      el.textContent = format(value);
      return;
    }

    const start = performance.now();
    const duration = 450;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(from + (value - from) * eased);
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  updateOverview() {
    const tasks = this.currentProject.tasks;
    const hoursPerDay = configManager.getHoursPerDay();
    const totalHours = this.getTotalHours();
    const doneHours = this.getDoneHours();
    const percent = totalHours > 0 ? (doneHours / totalHours) * 100 : 0;

    const round1 = (v) => this.formatHours(Math.round(v * 10) / 10);
    this.animateStat("total-duration", totalHours / hoursPerDay, round1);
    document.getElementById("duration-unit").textContent =
      `dias úteis (${hoursPerDay}h/dia)`;
    this.animateStat("total-tasks", tasks.length, (v) => String(Math.round(v)));
    this.animateStat("total-hours", totalHours, round1);
    this.animateStat("total-progress", percent, (v) => `${Math.round(v)}%`);
    document.getElementById("progress-label").textContent =
      `${this.formatHours(doneHours)}h de ${this.formatHours(totalHours)}h`;
    document.getElementById("total-progress-bar").style.width = `${percent}%`;

    if (tasks.length === 0) {
      document.getElementById("completion-date").textContent = "-";
      return;
    }

    const maxEnd = Math.max(...tasks.map((t) => t.start + t.duration));
    const [year, month, day] = (this.currentProject.startDate || "").split("-");
    const projectStartDate = year
      ? new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      : new Date();
    const completionDate = configManager.calculateEndDate(
      projectStartDate,
      Math.ceil(maxEnd / hoursPerDay)
    );
    document.getElementById("completion-date").textContent =
      calculateUtils.formatDate(completionDate);
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

    this.expandedTasks = this.expandedTasks || new Set();
    const e = (v) => this.escapeHtml(v);

    const opening = this.animateOpenId;
    this.animateOpenId = null;
    const added = this.lastAddedId;
    this.lastAddedId = null;

    tbody.innerHTML = filteredTasks
      .map((task) => {
        const open = this.expandedTasks.has(task.id);
        const justOpening = open && task.id === opening;
        const subCount = (task.subtasks || []).length;
        const main = `
            <tr class="task-row ${open && !justOpening ? "is-open" : ""} ${task.id === added ? "row-new" : ""}" data-task-id="${task.id}" onclick="app.toggleExpand('${task.id}')">
                <td>
                    <div class="task-name-cell">
                        <span class="expand-chevron" aria-hidden="true">▸</span>
                        <div class="task-color-dot" style="background: ${task.color};"></div>
                        <strong>${e(task.name)}</strong>
                        ${subCount ? `<span class="sub-count">${subCount} sub</span>` : ""}
                    </div>
                </td>
                <td>${this.formatHours(this.getTaskHours(task))}h</td>
                <td>${this.renderTaskProgress(task)}</td>
                <td><span class="priority-badge priority-badge--${task.priority}">${this.getPriorityLabel(task.priority)}</span></td>
                <td>${e(task.category)}</td>
                <td>${e(this.getDependenciesText(task))}</td>
                <td onclick="event.stopPropagation()">
                    <div class="task-actions">
                        <button class="btn btn--sm btn--secondary" onclick="app.openDrawer('${task.id}')" title="Editar tarefa">Editar</button>
                        <button class="btn btn--sm btn--ghost btn--icon row-more" onclick="app.openRowMenu(event, '${task.id}')" aria-label="Mais ações" aria-haspopup="true" title="Mais ações">⋯</button>
                    </div>
                </td>
            </tr>`;
        return open ? main + this.renderTaskDetail(task, justOpening) : main;
      })
      .join("");

    this.updateExpandAllLabel();

    if (opening) {
      // Two frames so the browser paints the collapsed state first
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          tbody
            .querySelectorAll(".task-detail-row.is-closed")
            .forEach((r) => r.classList.remove("is-closed"));
          const row = tbody.querySelector(`.task-row[data-task-id="${opening}"]`);
          if (row) row.classList.add("is-open");
        })
      );
    }

    const fresh = tbody.querySelector(".row-new");
    if (fresh && fresh.scrollIntoView) {
      fresh.scrollIntoView({
        block: "nearest",
        behavior: this.prefersReducedMotion() ? "auto" : "smooth",
      });
    }
  }

  // ---- Row actions menu ----------------------------------------------------

  openRowMenu(event, taskId) {
    event.stopPropagation();
    const menu = document.getElementById("row-menu");
    if (menu.classList.contains("is-open") && this.rowMenuTaskId === taskId) {
      return this.closeRowMenu();
    }
    this.closeMenus();
    this.rowMenuTaskId = taskId;

    const act = (call) => `app.closeRowMenu(); ${call}`;
    menu.innerHTML = `
      <button role="menuitem" onclick="${act(`app.showChecklistModal('${taskId}')`)}">Subtarefas (detalhado)</button>
      <button role="menuitem" onclick="${act(`app.showLogicModal('${taskId}')`)}">Lógica</button>
      <button role="menuitem" onclick="${act(`app.duplicateTask('${taskId}')`)}">Copiar</button>
      <hr />
      <button role="menuitem" class="is-danger" onclick="${act(`app.removeTask('${taskId}')`)}">Remover</button>`;

    const rect = event.currentTarget.getBoundingClientRect();
    menu.classList.add("is-open");
    const width = menu.offsetWidth || 200;
    const height = menu.offsetHeight || 150;
    const flip = rect.bottom + height + 8 > window.innerHeight;
    menu.style.top = `${flip ? rect.top - height - 4 : rect.bottom + 4}px`;
    menu.style.left = `${Math.max(8, rect.right - width)}px`;
    menu.classList.toggle("is-flipped", flip);
  }

  closeRowMenu() {
    const menu = document.getElementById("row-menu");
    const was = menu.classList.contains("is-open");
    menu.classList.remove("is-open");
    this.rowMenuTaskId = null;
    return was;
  }

  /** Close every popover; true when something was actually open. */
  closeMenus() {
    const tpl = document.getElementById("templates-menu");
    const tplWas = tpl.classList.contains("is-open");
    tpl.classList.remove("is-open");
    document.getElementById("templates-btn").setAttribute("aria-expanded", "false");
    const rowWas = this.closeRowMenu();
    return tplWas || rowWas;
  }

  renderTaskDetail(task, closed = false) {
    const e = (v) => this.escapeHtml(v);
    const subs = task.subtasks || [];

    const body = subs.length
      ? `<ul class="detail-subtasks">${subs
          .map(
            (s) => `
          <li class="${s.done ? "is-done" : ""}">
            <label class="detail-check">
              <input type="checkbox" ${s.done ? "checked" : ""}
                onchange="app.toggleSubtask('${task.id}', '${s.id}', this.checked)" />
              <span class="detail-sub-name">${e(s.name)}</span>
            </label>
            <span class="detail-sub-desc">${e(s.description)}</span>
            <span class="detail-sub-hours">${this.formatHours(Number(s.hours) || 0)}h</span>
          </li>`
          )
          .join("")}</ul>`
      : `<label class="detail-check detail-whole">
           <input type="checkbox" ${task.completed ? "checked" : ""}
             onchange="app.toggleTaskCompleted('${task.id}', this.checked)" />
           <span>Tarefa concluída</span>
           <small>(sem subtarefas — edite a tarefa para dividir)</small>
         </label>`;

    return `
      <tr class="task-detail-row ${closed ? "is-closed" : ""}" data-for="${task.id}">
        <td colspan="7">
          <div class="task-detail-wrap">
            <div class="task-detail">
              <div class="task-detail-inner">
                ${task.description ? `<p class="detail-desc">${e(task.description)}</p>` : ""}
                ${body}
              </div>
            </div>
          </div>
        </td>
      </tr>`;
  }

  toggleExpand(taskId) {
    this.expandedTasks = this.expandedTasks || new Set();

    if (!this.expandedTasks.has(taskId)) {
      this.expandedTasks.add(taskId);
      this.animateOpenId = this.prefersReducedMotion() ? null : taskId;
      this.updateTasksList();
      return;
    }

    this.expandedTasks.delete(taskId);
    const tbody = document.getElementById("tasks-tbody");
    const detail = tbody.querySelector(`.task-detail-row[data-for="${taskId}"]`);
    if (!detail || this.prefersReducedMotion()) return this.updateTasksList();

    detail.classList.add("is-closing");
    const row = tbody.querySelector(`.task-row[data-task-id="${taskId}"]`);
    if (row) row.classList.remove("is-open");
    setTimeout(() => this.updateTasksList(), 260);
  }

  toggleExpandAll() {
    this.expandedTasks = this.expandedTasks || new Set();
    const tasks = this.currentProject.tasks;
    const allOpen = tasks.every((t) => this.expandedTasks.has(t.id));
    this.expandedTasks = allOpen ? new Set() : new Set(tasks.map((t) => t.id));
    this.updateTasksList();
  }

  updateExpandAllLabel() {
    const tasks = this.currentProject.tasks;
    const allOpen =
      tasks.length > 0 && tasks.every((t) => this.expandedTasks.has(t.id));
    document.querySelector("#toggle-expand-btn span").textContent = allOpen
      ? "Recolher tudo"
      : "Expandir tudo";
  }

  /** Ticking an item in the expanded row updates progress everywhere. */
  toggleSubtask(taskId, subId, done) {
    const task = this.currentProject.tasks.find((t) => t.id === taskId);
    const sub = task && task.subtasks.find((s) => s.id === subId);
    if (!sub) return;
    sub.done = done;
    this.afterChecklistChange();
  }

  toggleTaskCompleted(taskId, done) {
    const task = this.currentProject.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.completed = done;
    this.afterChecklistChange();
  }

  afterChecklistChange() {
    this.saveState();
    this.updateUI();
    this.updateChart();
    this.autoSave();
  }

  updateDependenciesSelect() {
    const select = document.getElementById("task-dependencies");
    const currentOptions = Array.from(select.selectedOptions).map(
      (o) => o.value
    );

    const candidates = this.currentProject.tasks.filter(
      (t) => t.id !== this.editingTaskId
    );
    if (candidates.length === 0) {
      select.innerHTML =
        '<option value="" disabled>Nenhuma tarefa disponível</option>';
      return;
    }

    select.innerHTML = candidates
      .map(
        (task) =>
          `<option value="${task.id}">${this.escapeHtml(task.name)}</option>`
      )
      .join("");

    // Restore previous selections that still exist
    currentOptions.forEach((value) => {
      const option = select.querySelector(`option[value="${value}"]`);
      if (option) option.selected = true;
    });
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
    return "h";
  }

  getPriorityLabel(priority) {
    const priorityObj = this.sampleData.priorities.find(
      (p) => p.value === priority
    );
    return priorityObj ? priorityObj.label : priority;
  }

  getDependenciesText(task) {
    if (!task.dependencies || !task.dependencies.length) return "-";

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
    this.openDrawer(taskId);
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
      completed: false,
      subtasks: (task.subtasks || []).map((s) => ({
        ...s,
        id: this.generateId(),
        done: false,
      })),
    };

    this.currentProject.tasks.push(duplicatedTask);
    this.lastAddedId = duplicatedTask.id;
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
    const html = this.sampleData.templates
      .map(
        (template) => `
            <button class="template-btn" role="menuitem" onclick="app.applyTemplate('${template.name}')" title="Aplicar template ${template.name}">
                ${template.name}
                <small>${template.tasks.length} tarefas</small>
            </button>
        `
      )
      .join("");
    document.getElementById("template-buttons").innerHTML = html;
    document.getElementById("empty-templates").innerHTML = html;
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
            duration: taskTemplate.duration * configManager.getHoursPerDay(),
            unit: "hours",
            description: "",
            subtasks: [],
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

  applyDSL() {
    const code = document.getElementById("dsl-editor").value;
    if (!code.trim()) return;

    try {
      const tasks = this.dslParser.parse(code);
      if (tasks.length === 0) {
        this.showToast("warning", "DSL Vazia", "Nenhuma tarefa válida encontrada no código.");
        return;
      }

      // Confirm before replacing all tasks
      this.confirmAction(
        "Aplicar Código",
        `Isso substituirá as ${this.currentProject.tasks.length} tarefas atuais por ${tasks.length} novas tarefas. Continuar?`,
        () => {
          // Process tasks to add IDs and colors, and resolve "after" dependencies
          // Checklist data isn't expressed in the DSL: carry it over by task name
          const previous = new Map(
            this.currentProject.tasks.map((t) => [t.name.toLowerCase(), t])
          );
          const processedTasks = tasks.map(task => {
            const old = previous.get(task.name.toLowerCase());
            return {
              ...task,
              id: this.generateId(),
              unit: "hours",
              completed: old ? !!old.completed : false,
              description: old ? old.description || "" : "",
              subtasks: old ? old.subtasks || [] : [],
              color: this.getRandomColor(),
              dependencies: []
            };
          });

          // Resolve dependencies based on names
          processedTasks.forEach(task => {
            if (task.afterTaskName) {
              const depTask = processedTasks.find(t => t.name.toLowerCase() === task.afterTaskName.toLowerCase());
              if (depTask) {
                task.dependencies = [depTask.id];
              }
              delete task.afterTaskName;
            }
          });

          this.currentProject.tasks = processedTasks;
          
          // Recalculate starts based on dependencies
          this.currentProject.tasks.forEach(task => {
            task.start = this.calculateTaskStart(task);
          });

          this.saveState();
          this.updateUI();
          this.updateChart();
          this.autoSave();

          this.showToast(
            "success",
            "Código Aplicado",
            `${tasks.length} tarefas foram criadas a partir do código.`
          );
        }
      );
    } catch (error) {
      console.error("DSL Parsing error:", error);
      this.showToast("error", "Erro no Código", "Não foi possível processar o código. Verifique a sintaxe.");
    }
  }

  updateDSLEditor() {
    const editor = document.getElementById("dsl-editor");
    // Only update if not currently focused to avoid interrupting user typing
    if (document.activeElement !== editor) {
      editor.value = this.dslParser.generate(this.currentProject.tasks);
    }
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
              text: "Horas",
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

  normalizeProject(project) {
    if (!project) return project;

    // Ensure basic project properties
    if (!project.tasks) project.tasks = [];
    if (project.unit !== "hours") {
      // Older projects were in days: the app is hours-only now
      const hoursPerDay = configManager.getHoursPerDay();
      project.tasks.forEach((task) => {
        task.duration = (Number(task.duration) || 0) * hoursPerDay;
        task.start = (Number(task.start) || 0) * hoursPerDay;
        task.unit = "hours";
      });
      project.unit = "hours";
    }
    if (!project.settings) project.settings = { theme: "light", autoSave: true };
    if (!project.startDate) {
      project.startDate = new Date().toISOString().split("T")[0];
    }

    // Ensure all tasks have dependencies and logic property
    project.tasks.forEach((task) => {
      if (!task.dependencies) {
        task.dependencies = [];
      }
      if (task.logic === undefined) {
        task.logic = "";
      }
      if (task.description === undefined) {
        task.description = "";
      }
      if (!Array.isArray(task.subtasks)) {
        task.subtasks = [];
      }
    });

    return project;
  }

  // ---- Hours & progress ----------------------------------------------------

  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  formatHours(hours) {
    return String(Math.round(hours * 100) / 100);
  }

  /** Duration of a task without subtasks (the project is always in hours). */
  getDurationInHours(task) {
    return task.duration;
  }

  /** Subtasks (when present) drive the hours; otherwise the task duration does. */
  getTaskHours(task) {
    if (task.subtasks && task.subtasks.length) {
      return task.subtasks.reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
    }
    return this.getDurationInHours(task);
  }

  getTaskDoneHours(task) {
    if (task.subtasks && task.subtasks.length) {
      return task.subtasks
        .filter((s) => s.done)
        .reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
    }
    return task.completed ? this.getDurationInHours(task) : 0;
  }

  getTaskProgress(task) {
    const subs = task.subtasks || [];
    const total = this.getTaskHours(task);
    const doneCount = subs.filter((s) => s.done).length;
    let percent;
    if (total > 0) percent = (this.getTaskDoneHours(task) / total) * 100;
    else if (subs.length) percent = (doneCount / subs.length) * 100;
    else percent = task.completed ? 100 : 0;
    return { percent, doneCount, count: subs.length };
  }

  getTotalHours() {
    return this.currentProject.tasks.reduce(
      (sum, t) => sum + this.getTaskHours(t),
      0
    );
  }

  getDoneHours() {
    return this.currentProject.tasks.reduce(
      (sum, t) => sum + this.getTaskDoneHours(t),
      0
    );
  }

  renderTaskProgress(task) {
    const { percent, doneCount, count } = this.getTaskProgress(task);
    const label = count
      ? `${doneCount}/${count} · ${Math.round(percent)}%`
      : `${Math.round(percent)}%`;
    return `<div class="progress-cell">
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${percent}%"></div></div>
        <span>${label}</span>
      </div>`;
  }

  // ---- Checklist modal -----------------------------------------------------

  showChecklistModal(taskId) {
    const task = this.currentProject.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.checklistDraft = {
      taskId,
      description: task.description || "",
      completed: !!task.completed,
      subtasks: (task.subtasks || []).map((s) => ({ ...s })),
    };

    document.getElementById(
      "checklist-modal-title"
    ).textContent = `Checklist: ${task.name}`;
    document.getElementById("checklist-description").value =
      this.checklistDraft.description;
    document.getElementById("checklist-completed").checked =
      this.checklistDraft.completed;
    document.getElementById("checklist-completed").onchange = (e) => {
      this.checklistDraft.completed = e.target.checked;
      this.renderChecklistSummary();
    };
    document.getElementById("checklist-description").oninput = (e) => {
      this.checklistDraft.description = e.target.value;
    };
    document.getElementById("checklist-modal-save").onclick = () =>
      this.saveChecklist();

    this.renderChecklist();
    document.getElementById("checklist-modal").classList.remove("hidden");
  }

  hideChecklistModal() {
    document.getElementById("checklist-modal").classList.add("hidden");
    this.checklistDraft = null;
  }

  renderChecklist() {
    const draft = this.checklistDraft;
    if (!draft) return;

    document.getElementById("checklist-tbody").innerHTML = draft.subtasks
      .map(
        (s, i) => `
        <tr>
          <td class="col-ok"><input type="checkbox" ${s.done ? "checked" : ""}
              onchange="app.updateSubtask(${i}, 'done', this.checked)" aria-label="OK" /></td>
          <td class="col-name"><input type="text" class="form-control form-control--sm" maxlength="100"
              value="${this.escapeHtml(s.name)}" placeholder="Nome da subtarefa"
              oninput="app.updateSubtask(${i}, 'name', this.value)" /></td>
          <td class="col-desc"><textarea class="form-control form-control--sm" rows="1"
              placeholder="Descrição detalhada"
              oninput="app.updateSubtask(${i}, 'description', this.value)">${this.escapeHtml(s.description)}</textarea></td>
          <td class="col-hours"><input type="number" class="form-control form-control--sm" min="0" step="0.5"
              value="${s.hours}" oninput="app.updateSubtask(${i}, 'hours', this.value)" /></td>
          <td class="col-del"><button class="btn btn--sm btn--outline" title="Remover"
              onclick="app.removeSubtaskRow(${i})">×</button></td>
        </tr>`
      )
      .join("");

    const hasSubtasks = draft.subtasks.length > 0;
    document
      .getElementById("checklist-empty-hint")
      .classList.toggle("hidden", hasSubtasks);
    document
      .getElementById("checklist-whole-wrap")
      .classList.toggle("hidden", hasSubtasks);
    this.renderChecklistSummary();
  }

  renderChecklistSummary() {
    const draft = this.checklistDraft;
    if (!draft) return;

    const task = this.currentProject.tasks.find((t) => t.id === draft.taskId);
    const probe = { ...task, subtasks: draft.subtasks, completed: draft.completed };
    const total = this.getTaskHours(probe);
    const { percent, doneCount, count } = this.getTaskProgress(probe);

    document.getElementById("checklist-summary").innerHTML = `
      <span><strong>${this.formatHours(total)}h</strong> no total</span>
      <span><strong>${this.formatHours(this.getTaskDoneHours(probe))}h</strong> concluídas</span>
      <span><strong>${count ? `${doneCount}/${count}` : "—"}</strong> subtarefas OK</span>
      <span><strong>${Math.round(percent)}%</strong> completo</span>`;
  }

  addSubtaskRow() {
    if (!this.checklistDraft) return;
    this.checklistDraft.subtasks.push({
      id: this.generateId(),
      name: "",
      description: "",
      hours: 1,
      done: false,
    });
    this.renderChecklist();
    const names = document.querySelectorAll("#checklist-tbody .col-name input");
    if (names.length) names[names.length - 1].focus();
  }

  removeSubtaskRow(index) {
    if (!this.checklistDraft) return;
    this.checklistDraft.subtasks.splice(index, 1);
    this.renderChecklist();
  }

  updateSubtask(index, field, value) {
    const sub = this.checklistDraft && this.checklistDraft.subtasks[index];
    if (!sub) return;
    sub[field] = field === "hours" ? Math.max(0, parseFloat(value) || 0) : value;
    // No re-render here: it would steal focus from the input being typed in
    this.renderChecklistSummary();
  }

  saveChecklist() {
    const draft = this.checklistDraft;
    if (!draft) return;
    const task = this.currentProject.tasks.find((t) => t.id === draft.taskId);
    if (!task) return;

    const subtasks = draft.subtasks.filter((s) => s.name.trim());
    task.description = draft.description.trim();
    task.subtasks = subtasks.map((s) => ({ ...s, name: s.name.trim() }));
    task.completed = subtasks.length ? false : draft.completed;

    this.saveState();
    this.updateUI();
    this.autoSave();
    this.hideChecklistModal();
    this.showToast(
      "success",
      "Checklist Salvo",
      `"${task.name}": ${this.formatHours(this.getTaskHours(task))}h em ${subtasks.length} subtarefa(s).`
    );
  }

  showLogicModal(taskId) {
    const task = this.currentProject.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.currentLogicTaskId = taskId;
    const editor = document.getElementById("task-logic-editor");
    editor.value = task.logic || "";

    document.getElementById("logic-modal-title").textContent = `Lógica: ${task.name}`;
    document.getElementById("logic-modal").classList.remove("hidden");

    // Save button handler
    const saveBtn = document.getElementById("logic-modal-save");
    saveBtn.onclick = () => {
      task.logic = editor.value;
      this.saveState();
      this.autoSave();
      this.hideLogicModal();
      this.showToast("success", "Lógica Salva", `A lógica da tarefa "${task.name}" foi atualizada.`);
    };
  }

  hideLogicModal() {
    document.getElementById("logic-modal").classList.add("hidden");
    this.currentLogicTaskId = null;
  }

  loadFromAutoSave() {
    try {
      const autoSaveData = JSON.parse(
        localStorage.getItem("sizing-calculator-autosave")
      );
      if (autoSaveData && autoSaveData.project) {
        this.currentProject = this.normalizeProject(autoSaveData.project);
        this.updateUI();
        this.updateChart();
        this.updateBreadcrumb();

        document.getElementById("project-name").value =
          this.currentProject.name === "Novo Projeto"
            ? ""
            : this.currentProject.name;

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
                        <button class="btn btn--sm btn--secondary" onclick="event.stopPropagation(); app.duplicateProject('${project.id}')" title="Duplicar">Copiar</button>
                        <button class="btn btn--sm btn--outline" onclick="event.stopPropagation(); app.deleteProject('${project.id}')" title="Excluir">Excluir</button>
                    </div>
                </div>
                <div class="project-card-preview">
                    ${this.generateProjectPreview(project)}
                </div>
                <div class="project-card-stats">
                    <span>${project.tasks.length} tarefas</span>
                    <span>${this.formatHours(this.getProjectHours(project))} horas</span>
                </div>
            </div>
        `
      )
      .join("");
  }

  /** Total hours of a saved project (old ones may still be in days). */
  getProjectHours(project) {
    const factor = project.unit === "days" ? configManager.getHoursPerDay() : 1;
    return project.tasks.reduce((sum, t) => {
      const subs = t.subtasks || [];
      const hours = subs.length
        ? subs.reduce((n, st) => n + (Number(st.hours) || 0), 0)
        : (Number(t.duration) || 0) * factor;
      return sum + hours;
    }, 0);
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

      // ✨ NOVO: Deep clone para evitar referências e normalizar
      this.currentProject = this.normalizeProject(JSON.parse(JSON.stringify(project)));

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

    const hoursPerDay = configManager.getHoursPerDay();
    const startDate = new Date(this.currentProject.startDate);
    startDate.setDate(startDate.getDate() + Math.floor(task.start / hoursPerDay));

    // Calcular com dias úteis
    const endDate = configManager.calculateEndDate(
      startDate,
      Math.ceil(task.duration / hoursPerDay)
    );
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
      "Horas",
      "Progresso (%)",
      "Prioridade",
      "Categoria",
      "Dependências",
    ];
    const rows = this.currentProject.tasks.map((task) => [
      task.name,
      this.formatHours(this.getTaskHours(task)),
      Math.round(this.getTaskProgress(task).percent),
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

  async exportXLSX() {
    const tasks = this.currentProject.tasks;
    if (tasks.length === 0) {
      this.showToast("warning", "Aviso", "Não há tarefas para exportar.");
      return;
    }
    if (typeof ExcelJS === "undefined") {
      this.showToast("error", "Erro", "Biblioteca de Excel não carregou (verifique a conexão).");
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sizing");
    ws.columns = [
      { width: 40 },
      { width: 70 },
      { width: 10 },
      { width: 10 },
      { width: 8, hidden: true }, // E: 1 on rows that count toward the totals
    ];

    const HEADER_ROW = 6;
    const FIRST = HEADER_ROW + 1;
    const border = { style: "thin", color: { argb: "FFD0D5DD" } };
    const box = { top: border, left: border, bottom: border, right: border };
    const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

    ws.mergeCells("A1:D1");
    ws.getCell("A1").value = this.currentProject.name;
    ws.getCell("A1").font = { bold: true, size: 16 };

    // Build rows first so the summary formulas know the data range
    const rows = [];
    tasks.forEach((task) => {
      const subs = task.subtasks || [];
      if (subs.length) {
        rows.push({ kind: "group", task, subs });
        subs.forEach((s) => rows.push({ kind: "sub", s }));
      } else {
        rows.push({ kind: "single", task });
      }
    });
    const LAST = FIRST + rows.length - 1;

    const totalHours = this.getTotalHours();
    const doneHours = this.getDoneHours();
    const labelStyle = { bold: true };
    const hoursPerDay = configManager.getHoursPerDay();
    ws.getCell("A5").value = `Dias úteis (${hoursPerDay}h/dia)`;
    ws.getCell("A5").font = labelStyle;
    ws.getCell("B5").value = { formula: `B3/${hoursPerDay}`, result: totalHours / hoursPerDay };
    ws.getCell("B5").numFmt = "0.0";
    ws.getCell("B5").font = { bold: true, size: 12 };
    ws.getCell("B5").alignment = { horizontal: "left" };
    [
      [2, "Progresso", `IFERROR(B4/B3,0)`, totalHours ? doneHours / totalHours : 0, "0%"],
      [3, "Horas totais", `SUMIF(E${FIRST}:E${LAST},1,C${FIRST}:C${LAST})`, totalHours, "0.##"],
      [4, "Horas concluídas", `SUMIFS(C${FIRST}:C${LAST},E${FIRST}:E${LAST},1,D${FIRST}:D${LAST},"OK")`, doneHours, "0.##"],
    ].forEach(([r, label, formula, result, numFmt]) => {
      ws.getCell(`A${r}`).value = label;
      ws.getCell(`A${r}`).font = labelStyle;
      const cell = ws.getCell(`B${r}`);
      cell.value = { formula, result };
      cell.numFmt = numFmt;
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: "left" };
    });

    const header = ws.getRow(HEADER_ROW);
    header.values = ["Tarefa", "Descrição detalhada", "Horas", "OK", "Contar"];
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = fill("FF1F4E79");
      cell.border = box;
      cell.alignment = { vertical: "middle" };
    });

    const okFill = fill("FFC6EFCE");
    rows.forEach((item, i) => {
      const r = FIRST + i;
      const row = ws.getRow(r);

      if (item.kind === "group") {
        const first = r + 1;
        const last = r + item.subs.length;
        const doneCount = item.subs.filter((s) => s.done).length;
        const allDone = doneCount === item.subs.length;
        row.getCell(1).value = item.task.name;
        row.getCell(2).value = item.task.description || "";
        row.getCell(3).value = {
          formula: `SUM(C${first}:C${last})`,
          result: this.getTaskHours(item.task),
        };
        row.getCell(4).value = {
          formula: `IF(COUNTIF(D${first}:D${last},"OK")=ROWS(D${first}:D${last}),"OK",COUNTIF(D${first}:D${last},"OK")&"/"&ROWS(D${first}:D${last}))`,
          result: allDone ? "OK" : `${doneCount}/${item.subs.length}`,
        };
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          if (col > 4) return;
          cell.font = { bold: true };
          cell.fill = fill(allDone ? "FFC6EFCE" : "FFDDEBF7");
          cell.border = box;
        });
      } else {
        const isSub = item.kind === "sub";
        const name = isSub ? item.s.name : item.task.name;
        const description = isSub ? item.s.description : item.task.description;
        const hours = isSub ? Number(item.s.hours) || 0 : this.getDurationInHours(item.task);
        const done = isSub ? item.s.done : item.task.completed;

        row.getCell(1).value = name;
        row.getCell(1).alignment = { indent: isSub ? 2 : 0, vertical: "top" };
        row.getCell(2).value = description || "";
        row.getCell(3).value = hours;
        row.getCell(4).value = done ? "OK" : "";
        row.getCell(5).value = 1;
        row.getCell(4).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"OK"'],
        };
        for (let c = 1; c <= 4; c++) {
          const cell = row.getCell(c);
          cell.border = box;
          if (!isSub) cell.font = { bold: true };
          if (done && c === 4) cell.fill = okFill;
        }
      }

      row.getCell(2).alignment = { wrapText: true, vertical: "top" };
      row.getCell(3).alignment = { horizontal: "center", vertical: "top" };
      row.getCell(4).alignment = { horizontal: "center", vertical: "top" };
      row.getCell(3).numFmt = "0.##";
    });

    // "OK" cells turn green when ticked in Excel too
    ws.addConditionalFormatting({
      ref: `D${FIRST}:D${LAST}`,
      rules: [
        {
          type: "cellIs",
          operator: "equal",
          formulae: ['"OK"'],
          style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFC6EFCE" } } },
        },
      ],
    });

    ws.views = [{ state: "frozen", ySplit: HEADER_ROW }];

    try {
      const buffer = await wb.xlsx.writeBuffer();
      this.downloadFile(
        buffer,
        `${this.currentProject.name.replace(/[^a-z0-9]/gi, "_")}.xlsx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      this.showToast("success", "Exportado", "Arquivo Excel baixado com sucesso!");
    } catch (error) {
      console.error("XLSX export error:", error);
      this.showToast("error", "Erro", "Falha ao gerar o Excel.");
    }
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

    toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon"></div>
                <div class="toast-message">
                    <div class="toast-title">${title}</div>
                    <p class="toast-description">${message}</p>
                </div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Fechar">×</button>
        `;

    container.appendChild(toast);

    // Auto remove after 5 seconds (with a short exit animation)
    setTimeout(() => {
      if (!toast.parentElement) return;
      toast.classList.add("toast--leaving");
      setTimeout(() => toast.remove(), 220);
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
