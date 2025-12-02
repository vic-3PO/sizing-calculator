/**
 * Módulo de Validações de Tarefas e Projeto
 */

class TaskValidator {
  static validateTaskName(name, existingTasks = []) {
    const trimmed = name.trim();

    if (!trimmed) {
      return { valid: false, error: "Nome da tarefa é obrigatório" };
    }

    if (trimmed.length < 2) {
      return {
        valid: false,
        error: "Nome deve ter pelo menos 2 caracteres",
      };
    }

    if (trimmed.length > 100) {
      return {
        valid: false,
        error: "Nome não pode exceder 100 caracteres",
      };
    }

    if (
      existingTasks.some(
        (task) => task.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      return { valid: false, error: "Já existe uma tarefa com este nome" };
    }

    return { valid: true };
  }

  static validateTaskDuration(duration) {
    const value = parseFloat(duration);

    if (isNaN(value)) {
      return { valid: false, error: "Duração deve ser um número" };
    }

    if (value <= 0) {
      return { valid: false, error: "Duração deve ser maior que zero" };
    }

    if (value > 365) {
      return {
        valid: false,
        error: "Duração muito alta (máximo: 365 dias)",
      };
    }

    return { valid: true };
  }

  static validateTaskStart(start) {
    const value = parseFloat(start);

    if (isNaN(value)) {
      return { valid: false, error: "Início deve ser um número" };
    }

    if (value < 0) {
      return { valid: false, error: "Início não pode ser negativo" };
    }

    return { valid: true };
  }

  static validateDependencies(taskId, dependencies, allTasks) {
    // Verificar ciclos
    const visited = new Set();
    const recStack = new Set();

    const hasCycle = (id) => {
      if (recStack.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      recStack.add(id);

      const task = allTasks.find((t) => t.id === id);
      if (task) {
        for (const depId of task.dependencies || []) {
          if (hasCycle(depId)) return true;
        }
      }

      recStack.delete(id);
      return false;
    };

    for (const depId of dependencies) {
      if (hasCycle(depId)) {
        return {
          valid: false,
          error:
            "Dependências criariam um ciclo. Verifique as dependências selecionadas.",
        };
      }
    }

    return { valid: true };
  }

  static validateProjectName(name) {
    const trimmed = name.trim();

    if (trimmed.length > 0 && trimmed.length < 2) {
      return {
        valid: false,
        error: "Nome deve ter pelo menos 2 caracteres",
      };
    }

    if (trimmed.length > 100) {
      return {
        valid: false,
        error: "Nome não pode exceder 100 caracteres",
      };
    }

    return { valid: true };
  }

  static validateCategory(category) {
    const trimmed = category.trim();

    if (trimmed.length > 50) {
      return {
        valid: false,
        error: "Categoria não pode exceder 50 caracteres",
      };
    }

    return { valid: true };
  }
}

/**
 * Módulo de Armazenamento e Persistência
 */

class StorageManager {
  constructor(projectId = "default") {
    this.projectId = projectId;
    this.projectKey = `sizing-calculator-project-${projectId}`;
    this.projectsListKey = "sizing-calculator-projects-list";
  }

  /**
   * Salva projeto no localStorage
   */
  saveProject(project) {
    try {
      localStorage.setItem(this.projectKey, JSON.stringify(project));
      this.updateProjectsList(project.id, project.name);
      return true;
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
      return false;
    }
  }

  /**
   * Carrega projeto do localStorage
   */
  loadProject() {
    try {
      const data = localStorage.getItem(this.projectKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Erro ao carregar projeto:", error);
      return null;
    }
  }

  /**
   * Deleta projeto do localStorage
   */
  deleteProject() {
    try {
      localStorage.removeItem(this.projectKey);
      this.removeFromProjectsList(this.projectId);
      return true;
    } catch (error) {
      console.error("Erro ao deletar projeto:", error);
      return false;
    }
  }

  /**
   * Atualiza lista de projetos
   */
  updateProjectsList(projectId, projectName) {
    try {
      let projects = JSON.parse(
        localStorage.getItem(this.projectsListKey) || "[]"
      );
      const index = projects.findIndex((p) => p.id === projectId);

      if (index >= 0) {
        projects[index] = {
          id: projectId,
          name: projectName,
          modified: Date.now(),
        };
      } else {
        projects.push({
          id: projectId,
          name: projectName,
          created: Date.now(),
          modified: Date.now(),
        });
      }

      localStorage.setItem(this.projectsListKey, JSON.stringify(projects));
    } catch (error) {
      console.error("Erro ao atualizar lista de projetos:", error);
    }
  }

  /**
   * Remove projeto da lista
   */
  removeFromProjectsList(projectId) {
    try {
      let projects = JSON.parse(
        localStorage.getItem(this.projectsListKey) || "[]"
      );
      projects = projects.filter((p) => p.id !== projectId);
      localStorage.setItem(this.projectsListKey, JSON.stringify(projects));
    } catch (error) {
      console.error("Erro ao remover projeto da lista:", error);
    }
  }

  /**
   * Carrega lista de todos os projetos
   */
  getAllProjects() {
    try {
      return JSON.parse(localStorage.getItem(this.projectsListKey) || "[]");
    } catch (error) {
      console.error("Erro ao carregar lista de projetos:", error);
      return [];
    }
  }

  /**
   * Limpa todos os dados
   */
  clearAll() {
    try {
      const projects = this.getAllProjects();
      projects.forEach((project) => {
        localStorage.removeItem(`sizing-calculator-project-${project.id}`);
      });
      localStorage.removeItem(this.projectsListKey);
      return true;
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      return false;
    }
  }

  /**
   * Exporta dados em JSON
   */
  exportToJSON(project) {
    return JSON.stringify(project, null, 2);
  }

  /**
   * Importa dados de JSON
   */
  importFromJSON(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Erro ao importar JSON:", error);
      return null;
    }
  }

  /**
   * Exporta para CSV
   */
  exportToCSV(project) {
    if (!project.tasks || project.tasks.length === 0) {
      return "Nenhuma tarefa para exportar";
    }

    const headers = [
      "Nome",
      "Início",
      "Duração",
      "Prioridade",
      "Categoria",
      "Dependências",
      "Concluído",
    ];
    const rows = project.tasks.map((task) => [
      task.name,
      task.start,
      task.duration,
      task.priority,
      task.category,
      (task.dependencies || []).join(";"),
      task.completed ? "Sim" : "Não",
    ]);

    const csv = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");

    return csv;
  }
}
