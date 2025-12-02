/**
 * CONFIG.JS ATUALIZADO
 * Remover data de início global - será por projeto
 */

class ConfigManager {
  constructor() {
    this.storageKey = "sizing-calculator-config";
    this.defaults = {
      workDays: [1, 2, 3, 4, 5], // Segunda a Sexta (0=Dom, 1=Seg, etc)
      hoursPerDay: 8,
      // ❌ REMOVIDO: projectStartDate - agora é por projeto
      theme: "light",
      autoSave: true,
      autoSaveInterval: 5000,
    };
    this.config = this.loadConfig();
  }

  loadConfig() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? { ...this.defaults, ...JSON.parse(saved) } : this.defaults;
  }

  saveConfig() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.config));
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.triggerChange();
  }

  getWorkDays() {
    return this.config.workDays;
  }

  setWorkDays(days) {
    this.config.workDays = days;
    this.saveConfig();
    this.triggerChange();
  }

  getHoursPerDay() {
    return this.config.hoursPerDay;
  }

  setHoursPerDay(hours) {
    this.config.hoursPerDay = Math.max(1, Math.min(24, hours));
    this.saveConfig();
    this.triggerChange();
  }

  // ❌ REMOVIDO: getProjectStartDate() e setProjectStartDate()
  // Agora será armazenado no objeto do projeto

  getWorkingHoursPerWeek() {
    return this.config.workDays.length * this.config.hoursPerDay;
  }

  /**
   * Calcula data final baseado em dias úteis
   * @param {Date} startDate - Data de início
   * @param {number} duration - Duração em dias
   * @returns {Date} Data final
   */
  calculateEndDate(startDate, duration) {
    let current = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < duration) {
      current.setDate(current.getDate() + 1);
      if (this.config.workDays.includes(current.getDay())) {
        daysAdded++;
      }
    }

    return current;
  }

  /**
   * Calcula diferença em dias úteis entre duas datas
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {number} Dias úteis
   */
  calculateWorkingDays(startDate, endDate) {
    let current = new Date(startDate);
    let workingDays = 0;

    while (current < endDate) {
      if (this.config.workDays.includes(current.getDay())) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  }

  /**
   * Listeners de mudança
   */
  listeners = [];

  onChange(callback) {
    this.listeners.push(callback);
  }

  triggerChange() {
    this.listeners.forEach((callback) => callback(this.config));
  }

  resetToDefaults() {
    this.config = { ...this.defaults };
    this.saveConfig();
    this.triggerChange();
  }
}

// Exportar instância global
const configManager = new ConfigManager();
