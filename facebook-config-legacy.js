/**
 * Configuración LEGACY de Facebook/Meta para Embedded Signup
 * Portfolio ID: 1473689432774278
 * 
 * ⚠️ CONFIGURACIÓN DE BACKUP
 * Esta es la configuración antigua que se puede usar como respaldo
 * La configuración principal está en facebook-config.js
 * 
 * Fecha: 14 de enero de 2026
 */

const facebookConfigLegacy = {
  // ====================================
  // CREDENCIALES DE FACEBOOK APP (LEGACY)
  // ====================================
  
  appId: '1860852208127086',
  
  apiVersion: 'v21.0',
  
  embeddedSignupConfigId: '1609237700430950',
  
  locale: 'es_LA',
  
  // ====================================
  // CONFIGURACIÓN ADICIONAL
  // ====================================
  
  /**
   * URL de callback después del onboarding
   * Ubicación: WhatsApp → Embedded Signup → Configuration
   * IMPORTANTE: Esta URL debe estar whitelisteada en Meta Dashboard
   */
  callbackUrl: window.location.origin.includes('localhost') 
    ? 'http://localhost:3000/api/whatsapp/callback-legacy'
    : 'https://api.kdsapp.site/api/whatsapp/callback-legacy',
  
  /**
   * URL de éxito después del onboarding
   * Página a la que redirigir después de completar el setup
   */
  successUrl: window.location.origin + '/onboarding-success.html?legacy=true',
  
  /**
   * Portfolio ID - Pre-fill para Embedded Signup
   * LEGACY Portfolio: 1473689432774278
   */
  portfolioId: '1473689432774278',
  
  // ====================================
  // CONFIGURACIÓN DE DEBUG
  // ====================================
  
  /**
   * Habilitar logs de debug
   * Muestra información detallada en la consola
   */
  debug: true,
  
  /**
   * Información de la configuración
   */
  info: {
    name: 'KDS Platform (Legacy)',
    type: 'backup',
    created: '2025',
    updated: '2026-01-14',
    description: 'Configuración legacy como backup del sistema principal'
  }
};

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.facebookConfigLegacy = facebookConfigLegacy;
}
