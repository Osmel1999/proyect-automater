/**
 * SISTEMA DUAL DE CONFIGURACIÓN
 * Permite usar dos portfolios simultáneamente:
 * - Configuración PRINCIPAL (nueva) - Portfolio: 880566844730976
 * - Configuración LEGACY (antigua) - Portfolio: 1473689432774278
 * 
 * Fecha: 14 de enero de 2026
 */

const dualConfig = {
  // ====================================
  // CONFIGURACIÓN PRINCIPAL (ACTUAL)
  // ====================================
  primary: {
    name: 'KDS Platform (Principal)',
    portfolio: {
      id: '880566844730976',
      name: 'KDS'
    },
    facebook: {
      appId: '849706941272247',
      appSecret: process.env.WHATSAPP_APP_SECRET || '',
      apiVersion: 'v21.0',
      embeddedSignupConfigId: '849873494548110'
    },
    whatsapp: {
      businessAccountId: '1230720492271251',
      phoneNumberId: '985474321308699'
    },
    callbackUrl: `${process.env.BASE_URL || 'https://kds-webapp-production.up.railway.app'}/api/whatsapp/callback`,
    webhookUrl: `${process.env.BASE_URL || 'https://kds-webapp-production.up.railway.app'}/webhook/whatsapp`,
    status: 'active', // active, backup, disabled
    description: 'Configuración principal verificada - Activación instantánea'
  },

  // ====================================
  // CONFIGURACIÓN LEGACY (BACKUP)
  // ====================================
  legacy: {
    name: 'KDS Platform (Legacy)',
    portfolio: {
      id: '1473689432774278',
      name: 'KDS Legacy'
    },
    facebook: {
      appId: '1860852208127086',
      appSecret: process.env.WHATSAPP_APP_SECRET_LEGACY || '',
      apiVersion: 'v21.0',
      embeddedSignupConfigId: '1609237700430950'
    },
    whatsapp: {
      businessAccountId: '', // Llenar con los datos antiguos si los tienes
      phoneNumberId: ''
    },
    callbackUrl: `${process.env.BASE_URL || 'https://kds-webapp-production.up.railway.app'}/api/whatsapp/callback-legacy`,
    webhookUrl: `${process.env.BASE_URL || 'https://kds-webapp-production.up.railway.app'}/webhook/whatsapp-legacy`,
    status: 'backup', // active, backup, disabled
    description: 'Configuración legacy como backup - Requiere verificación'
  }
};

/**
 * Obtener configuración por tipo
 * @param {string} type - 'primary' o 'legacy'
 * @returns {object} Configuración solicitada
 */
function getConfig(type = 'primary') {
  if (type === 'legacy') {
    return dualConfig.legacy;
  }
  return dualConfig.primary;
}

/**
 * Obtener configuración por portfolio ID
 * @param {string} portfolioId - ID del portfolio
 * @returns {object} Configuración correspondiente
 */
function getConfigByPortfolio(portfolioId) {
  if (portfolioId === dualConfig.legacy.portfolio.id) {
    return { type: 'legacy', config: dualConfig.legacy };
  }
  return { type: 'primary', config: dualConfig.primary };
}

/**
 * Verificar si una configuración está activa
 * @param {string} type - 'primary' o 'legacy'
 * @returns {boolean}
 */
function isConfigActive(type = 'primary') {
  const config = getConfig(type);
  return config.status === 'active' || config.status === 'backup';
}

/**
 * Obtener todas las configuraciones activas
 * @returns {array} Array de configuraciones activas
 */
function getActiveConfigs() {
  const configs = [];
  if (isConfigActive('primary')) {
    configs.push({ type: 'primary', config: dualConfig.primary });
  }
  if (isConfigActive('legacy')) {
    configs.push({ type: 'legacy', config: dualConfig.legacy });
  }
  return configs;
}

// Exportar para uso en Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    dualConfig,
    getConfig,
    getConfigByPortfolio,
    isConfigActive,
    getActiveConfigs
  };
}

// Exportar para uso en navegador (frontend)
if (typeof window !== 'undefined') {
  window.dualConfig = dualConfig;
  window.getConfig = getConfig;
  window.getConfigByPortfolio = getConfigByPortfolio;
  window.isConfigActive = isConfigActive;
  window.getActiveConfigs = getActiveConfigs;
}
