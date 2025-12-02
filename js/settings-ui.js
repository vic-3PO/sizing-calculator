/**
 * SETTINGS-UI.JS ATUALIZADO
 * Remover campo de data de início global
 */

class SettingsUI {
  constructor(configManager) {
    this.configManager = configManager;
    this.modal = null;
    this.initialized = false;
  }

  init() {
    this.createSettingsModal();
    this.setupEventListeners();
    this.initialized = true;
  }

  createSettingsModal() {
    const settingsHTML = `
      <div id="settings-modal" class="modal-overlay hidden">
        <div class="modal settings-modal">
          <div class="modal-header">
            <h3>⚙️ Configurações do Projeto</h3>
            <button class="modal-close" data-action="close-settings" aria-label="Fechar configurações">
              ✕
            </button>
          </div>

          <div class="modal-body settings-body">
            <!-- Dias de Trabalho -->
            <div class="settings-section">
              <h4>Dias de Trabalho</h4>
              <p class="setting-description">Selecione os dias úteis da semana</p>
              
              <div class="work-days-selector">
                <label class="day-checkbox">
                  <input type="checkbox" value="0" class="work-day-input" />
                  <span class="day-label">Domingo</span>
                </label>
                <label class="day-checkbox">
                  <input type="checkbox" value="1" class="work-day-input" checked />
                  <span class="day-label">Segunda</span>
                </label>
                <label class="day-checkbox">
                  <input type="checkbox" value="2" class="work-day-input" checked />
                  <span class="day-label">Terça</span>
                </label>
                <label class="day-checkbox">
                  <input type="checkbox" value="3" class="work-day-input" checked />
                  <span class="day-label">Quarta</span>
                </label>
                <label class="day-checkbox">
                  <input type="checkbox" value="4" class="work-day-input" checked />
                  <span class="day-label">Quinta</span>
                </label>
                <label class="day-checkbox">
                  <input type="checkbox" value="5" class="work-day-input" checked />
                  <span class="day-label">Sexta</span>
                </label>
                <label class="day-checkbox">
                  <input type="checkbox" value="6" class="work-day-input" />
                  <span class="day-label">Sábado</span>
                </label>
              </div>

              <div class="work-days-summary">
                <span id="work-days-count">5</span> dias de trabalho por semana
              </div>
            </div>

            <!-- Horas de Trabalho -->
            <div class="settings-section">
              <h4>Horas de Trabalho</h4>
              <p class="setting-description">Horas de trabalho por dia útil</p>
              
              <div class="form-group">
                <label for="hours-per-day" class="form-label">Horas por dia</label>
                <div class="input-group">
                  <input 
                    type="number" 
                    id="hours-per-day" 
                    class="form-control" 
                    min="1" 
                    max="24" 
                    value="8"
                  />
                  <span class="input-unit">horas</span>
                </div>
              </div>

              <div class="working-hours-summary">
                <small>Total: <strong id="total-weekly-hours">40</strong> horas/semana</small>
              </div>
            </div>

            <!-- ❌ REMOVIDO: Seção de Data de Início Padrão -->
            <!-- A data agora é definida por projeto na sidebar -->

            <!-- Tema -->
            <div class="settings-section">
              <h4>Aparência</h4>
              <p class="setting-description">Escolha o tema da aplicação</p>
              
              <div class="theme-selector">
                <label class="theme-option">
                  <input type="radio" name="theme" value="light" class="theme-input" />
                  <span class="theme-label">☀️ Claro</span>
                </label>
                <label class="theme-option">
                  <input type="radio" name="theme" value="dark" class="theme-input" />
                  <span class="theme-label">🌙 Escuro</span>
                </label>
              </div>
            </div>

            <!-- Auto-save -->
            <div class="settings-section">
              <h4>Salvamento Automático</h4>
              <p class="setting-description">Salve automaticamente seus projetos</p>
              
              <label class="toggle-checkbox">
                <input type="checkbox" id="auto-save-toggle" class="toggle-input" checked />
                <span class="toggle-label">Ativar salvamento automático</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--secondary" data-action="reset-settings">
              Restaurar Padrões
            </button>
            <button class="btn btn--primary" data-action="close-settings">
              Concluído
            </button>
          </div>
        </div>
      </div>
    `;

    // Inserir modal no DOM
    if (!document.getElementById("settings-modal")) {
      document.body.insertAdjacentHTML("beforeend", settingsHTML);
    }

    this.modal = document.getElementById("settings-modal");
  }

  setupEventListeners() {
    // Dias de trabalho
    document.querySelectorAll(".work-day-input").forEach((checkbox) => {
      checkbox.addEventListener("change", () => this.handleWorkDaysChange());
    });

    // Horas por dia
    const hoursInput = document.getElementById("hours-per-day");
    if (hoursInput) {
      hoursInput.addEventListener("change", () => this.handleHoursChange());
    }

    // ❌ REMOVIDO: listener para data de início

    // Tema
    document.querySelectorAll(".theme-input").forEach((radio) => {
      radio.addEventListener("change", () => this.handleThemeChange());
    });

    // Auto-save
    const autoSaveToggle = document.getElementById("auto-save-toggle");
    if (autoSaveToggle) {
      autoSaveToggle.addEventListener("change", () =>
        this.handleAutoSaveChange()
      );
    }

    // Botões
    document.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleAction(e));
    });
  }

  handleWorkDaysChange() {
    const checked = Array.from(
      document.querySelectorAll(".work-day-input:checked")
    )
      .map((el) => parseInt(el.value))
      .sort();

    this.configManager.setWorkDays(checked);
    this.updateWorkDaysSummary(checked);
    this.updateWeeklyHoursSummary();
  }

  handleHoursChange() {
    const hoursInput = document.getElementById("hours-per-day");
    const hours = parseFloat(hoursInput.value);
    this.configManager.setHoursPerDay(hours);
    this.updateWeeklyHoursSummary();
  }

  // ❌ REMOVIDO: handleDateChange()

  handleThemeChange() {
    const checked = document.querySelector(".theme-input:checked");
    if (checked) {
      const theme = checked.value;
      this.configManager.updateConfig({ theme });
      this.applyTheme(theme);
    }
  }

  handleAutoSaveChange() {
    const toggle = document.getElementById("auto-save-toggle");
    this.configManager.updateConfig({ autoSave: toggle.checked });
  }

  handleAction(event) {
    const action = event.target.getAttribute("data-action");

    switch (action) {
      case "close-settings":
        this.closeSettings();
        break;
      case "reset-settings":
        this.resetSettings();
        break;
    }
  }

  updateWorkDaysSummary(workDays) {
    const count = document.getElementById("work-days-count");
    if (count) {
      count.textContent = workDays.length;
    }
  }

  updateWeeklyHoursSummary() {
    const totalHours = this.configManager.getWorkingHoursPerWeek();
    const summaryEl = document.getElementById("total-weekly-hours");
    if (summaryEl) {
      summaryEl.textContent = totalHours;
    }
  }

  applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("sizing-calculator-theme", theme);
  }

  openSettings() {
    if (!this.initialized) {
      this.init();
    }

    const config = this.configManager.getConfig();

    // Carregar dias de trabalho
    document.querySelectorAll(".work-day-input").forEach((checkbox) => {
      checkbox.checked = config.workDays.includes(parseInt(checkbox.value));
    });

    // Carregar horas por dia
    document.getElementById("hours-per-day").value = config.hoursPerDay;

    // ❌ REMOVIDO: carregar data de início

    // Carregar tema
    document.querySelector(
      `.theme-input[value="${config.theme}"]`
    ).checked = true;

    // Carregar auto-save
    document.getElementById("auto-save-toggle").checked = config.autoSave;

    // Atualizar resumos
    this.updateWorkDaysSummary(config.workDays);
    this.updateWeeklyHoursSummary();

    // Mostrar modal
    this.modal.classList.remove("hidden");
  }

  closeSettings() {
    this.modal.classList.add("hidden");
  }

  resetSettings() {
    if (
      confirm(
        "Tem certeza que deseja restaurar as configurações padrão? Esta ação não pode ser desfeita."
      )
    ) {
      this.configManager.resetToDefaults();
      this.openSettings();
    }
  }
}
