/**
 * Configuración de Facebook/Meta para Embedded Signup
 * 
 * INSTRUCCIONES:
 * 1. Ve a https://developers.facebook.com/apps
 * 2. Selecciona tu app "KDS WhatsApp Platform"
 * 3. Obtén las credenciales necesarias
 * 4. Reemplaza los valores placeholder aquí
 */

const facebookConfig = {
  // ====================================
  // CREDENCIALES DE FACEBOOK APP
  // ====================================
  
  /**
   * App ID de Facebook
   * Ubicación: Configuración → Básica → Identificador de la app
   * Ejemplo: "123456789012345"
   */
  appId: '1860852208127086',
  
  /**
   * Versión de la API de Facebook
   * Versión actual recomendada: 'v21.0'
   * Actualiza según las novedades de Meta
   */
  apiVersion: 'v21.0',
  
  /**
   * Configuration ID de Embedded Signup
   * Ubicación: WhatsApp → Embedded Signup → Configurations
   * Configuration Name: "ES Config"
   * 
   * IMPORTANTE: Este ID se obtiene después de crear una "Configuration"
   * en la sección de Embedded Signup de tu app de WhatsApp
   */
  embeddedSignupConfigId: '1609237700430950',
  
  /**
   * Idioma del SDK
   * Opciones: 'es_LA' (Español), 'en_US' (Inglés), etc.
   */
  locale: 'es_LA',
  
  // ====================================
  // CONFIGURACIÓN ADICIONAL
  // ====================================
  
  /**
   * Habilitar cookies (recomendado para mantener sesión)
   */
  cookie: true,
  
  /**
   * Habilitar XFBML (para plugins sociales de Facebook)
   */
  xfbml: true,
  
  /**
   * Habilitar Google Analytics para tracking
   */
  enableAnalytics: false,
  
  // ====================================
  // URLS DE CALLBACK (BACKEND)
  // ====================================
  
  /**
   * URL del callback que maneja el código de autorización
   * Esta URL debe estar configurada en:
   * Facebook Login → Configuración → URI de redireccionamiento OAuth válidos
   */
  callbackUrl: '/api/whatsapp/callback',
  
  /**
   * URL base de tu aplicación (para producción)
   * Ejemplo: 'https://tu-dominio.com'
   */
  baseUrl: window.location.origin
};

// Validación de configuración
function validateConfig() {
  const errors = [];
  
  if (facebookConfig.appId === '{your-app-id}') {
    errors.push('❌ Debes configurar tu App ID de Facebook');
  }
  
  if (facebookConfig.embeddedSignupConfigId === '{your-config-id}') {
    errors.push('⚠️ Debes configurar tu Configuration ID de Embedded Signup');
  }
  
  if (errors.length > 0) {
    console.warn('🔧 Configuración pendiente:');
    errors.forEach(error => console.warn(error));
    console.warn('\nEdita el archivo facebook-config.js con tus credenciales reales.');
    return false;
  }
  
  console.log('✅ Configuración de Facebook validada correctamente');
  return true;
}

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
  // Para Node.js (si se usa en el backend)
  module.exports = facebookConfig;
} else {
  // Para el navegador
  window.facebookConfig = facebookConfig;
  
  // Validar al cargar
  document.addEventListener('DOMContentLoaded', function() {
    validateConfig();
  });
}

/**
 * CHECKLIST PARA CONFIGURAR FACEBOOK/META:
 * 
 * □ 1. Crear app en https://developers.facebook.com/apps
 * □ 2. Agregar producto "WhatsApp" a la app
 * □ 3. Agregar producto "Facebook Login" a la app
 * □ 4. Crear WhatsApp Business Account (WABA)
 * □ 5. Configurar Embedded Signup:
 *      - Ir a WhatsApp → Embedded Signup
 *      - Crear una nueva "Configuration"
 *      - Copiar el Configuration ID
 * □ 6. Configurar URLs de redirección:
 *      - Facebook Login → Configuración
 *      - Agregar: https://tu-dominio.com/api/whatsapp/callback
 * □ 7. Agregar URLs de política y términos:
 *      - Configuración → Básica
 *      - URL de política de privacidad
 *      - URL de términos de servicio
 * □ 8. Solicitar revisión de la app:
 *      - Permisos: whatsapp_business_management
 *      - Permisos: whatsapp_business_messaging
 * □ 9. Copiar credenciales a este archivo
 * □ 10. Probar con usuarios de prueba antes del lanzamiento
 */
