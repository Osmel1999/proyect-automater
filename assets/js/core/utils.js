/**
 * Utility Functions
 * Funciones de utilidad reutilizables
 */

const Utils = {
  /**
   * Mostrar loader
   */
  showLoading(message = 'Cargando...') {
    let loader = document.getElementById('global-loader');
    
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.className = 'loading';
      loader.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text">${message}</div>
      `;
      document.body.appendChild(loader);
    } else {
      const text = loader.querySelector('.loading-text');
      if (text) text.textContent = message;
      loader.style.display = 'flex';
    }
  },

  /**
   * Ocultar loader
   */
  hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.style.display = 'none';
    }
  },

  /**
   * Mostrar toast notification
   */
  showToast(message, type = 'info', duration = 3000) {
    // Crear container si no existe
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    // Crear toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };
    
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto-remover
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
    
    return toast;
  },

  /**
   * Mostrar alerta
   */
  showAlert(message, type = 'info') {
    alert(message); // Temporal, se puede mejorar con modal personalizado
  },

  /**
   * Confirmar acción
   */
  async confirm(message, title = '¿Estás seguro?') {
    return confirm(`${title}\n\n${message}`); // Temporal, se puede mejorar con modal personalizado
  },

  /**
   * Formatear moneda (pesos colombianos)
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  /**
   * Formatear fecha
   */
  formatDate(timestamp, includeTime = true) {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return new Date(timestamp).toLocaleDateString('es-CO', options);
  },

  /**
   * Formatear fecha relativa (hace X tiempo)
   */
  formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Hace unos segundos';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 30) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    
    return this.formatDate(timestamp, false);
  },

  /**
   * Validar email
   */
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Validar teléfono (colombiano)
   */
  isValidPhone(phone) {
    // Remover espacios y guiones
    const cleaned = phone.replace(/[\s-]/g, '');
    
    // Validar formato colombiano: +57 o 57 seguido de 10 dígitos
    const regex = /^(\+?57)?[1-9]\d{9}$/;
    return regex.test(cleaned);
  },

  /**
   * Formatear teléfono para WhatsApp
   */
  formatPhoneForWhatsApp(phone) {
    let cleaned = phone.replace(/[\s-+]/g, '');
    
    // Si no empieza con 57, agregarlo
    if (!cleaned.startsWith('57')) {
      cleaned = '57' + cleaned;
    }
    
    return cleaned;
  },

  /**
   * Redirigir a otra página
   */
  redirectTo(page, delay = 0) {
    setTimeout(() => {
      window.location.href = page;
    }, delay);
  },

  /**
   * Copiar al portapapeles
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copiado al portapapeles', 'success', 2000);
      return true;
    } catch (error) {
      console.error('Error al copiar:', error);
      this.showToast('Error al copiar', 'error', 2000);
      return false;
    }
  },

  /**
   * Generar ID único
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Debounce function (útil para búsquedas)
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Hacer scroll suave a un elemento
   */
  scrollTo(elementOrSelector, offset = 0) {
    const element = typeof elementOrSelector === 'string' 
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;
    
    if (element) {
      const top = element.offsetTop - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  },

  /**
   * Obtener parámetros de URL
   */
  getURLParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of searchParams) {
      params[key] = value;
    }
    return params;
  },

  /**
   * Actualizar parámetro de URL sin recargar
   */
  updateURLParam(key, value) {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    window.history.replaceState({}, '', url);
  },

  /**
   * Sanitizar HTML para prevenir XSS
   */
  sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  },

  /**
   * Capitalizar primera letra
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Truncar texto
   */
  truncate(str, length = 50, ending = '...') {
    if (str.length > length) {
      return str.substring(0, length - ending.length) + ending;
    }
    return str;
  },

  /**
   * Detectar si es móvil
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  /**
   * Guardar en localStorage (con manejo de errores)
   */
  saveToLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
      return false;
    }
  },

  /**
   * Obtener de localStorage
   */
  getFromLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error leyendo de localStorage:', error);
      return defaultValue;
    }
  },

  /**
   * Remover de localStorage
   */
  removeFromLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removiendo de localStorage:', error);
      return false;
    }
  }
};

// Exportar como variable global
window.Utils = Utils;

console.log('🛠️ Utils cargado correctamente');
