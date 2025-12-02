/**
 * Módulo de Utilitários Gerais
 */

const calculateUtils = {
  /**
   * Gera ID único
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Debounce para funções
   */
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * Formata data para string locale
   */
  formatDate(date) {
    return new Date(date).toLocaleDateString("pt-BR");
  },

  /**
   * Converte data string para objeto Date
   */
  parseDate(dateString) {
    const [year, month, day] = dateString.split("-");
    return new Date(year, month - 1, day);
  },

  /**
   * Calcula cores com base em prioridade
   */
  getPriorityColor(priority) {
    const colors = {
      low: "#10b981",
      medium: "#f59e0b",
      high: "#ef4444",
    };
    return colors[priority] || "#6b7280";
  },

  /**
   * Calcula cor aleatória de um conjunto
   */
  getRandomColor() {
    const colors = [
      "#ef4444",
      "#f59e0b",
      "#10b981",
      "#3b82f6",
      "#8b5cf6",
      "#d946ef",
      "#f472b6",
      "#06b6d4",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  /**
   * Converte array de bytes para string hex
   */
  bytesToHex(bytes) {
    return Array.from(bytes, (byte) =>
      ("0" + byte.toString(16)).slice(-2)
    ).join("");
  },

  /**
   * Cria blob e faz download
   */
  downloadFile(content, filename, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Copia texto para clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Falha ao copiar:", err);
      return false;
    }
  },

  /**
   * Validações gerais
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Formata número com separadores
   */
  formatNumber(num, decimals = 0) {
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  /**
   * Calcula estatísticas de array
   */
  calculateStats(arr) {
    if (!arr.length) return { mean: 0, median: 0, min: 0, max: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    return {
      mean: Math.round(mean * 100) / 100,
      median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  },

  /**
   * Clona objeto profundamente
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Mescla arrays e remove duplicatas
   */
  mergeArrays(...arrays) {
    return [...new Set(arrays.flat())];
  },
};
