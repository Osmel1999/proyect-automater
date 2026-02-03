/**
 * 🌐 Proxy Manager para Baileys
 * Gestiona proxies únicos para cada sesión de WhatsApp (Anti-Ban)
 * 
 * IMPORTANTE: Este servicio permite que cada restaurante tenga su propia IP
 * para evitar que WhatsApp detecte múltiples bots en una sola IP.
 */

const pino = require('pino');
const logger = pino({ level: 'info' });
const { HttpsProxyAgent } = require('https-proxy-agent');
const admin = require('firebase-admin');

class ProxyManager {
  constructor() {
    // Cache de proxies asignados a cada tenant
    // Formato: Map<tenantId, proxyConfig>
    this.tenantProxies = new Map();
    
    // URL base del proxy (sin sesión específica)
    this.baseProxyUrl = null;
    
    // Tipo de proxy
    this.proxyType = 'residential';
  }

  /**
   * Inicializa el proxy manager cargando configuración
   */
  async initialize() {
    try {
      logger.info('🌐 Inicializando Proxy Manager...');
      
      // Cargar configuración del proxy base
      await this.loadProxies();
      
      if (this.baseProxyUrl) {
        logger.info(`✅ Proxy Manager inicializado - Sistema AUTO-ESCALABLE`);
        logger.info(`🎯 Cada nuevo restaurante obtendrá automáticamente una IP única`);
      } else {
        logger.warn(`⚠️ Sin proxies - Todos los bots compartirán la IP del servidor`);
      }
    } catch (error) {
      logger.error('❌ Error inicializando Proxy Manager:', error);
      logger.warn('⚠️ Continuando sin proxies - RIESGO DE BAN AUMENTADO');
    }
  }

  /**
   * Carga la lista de proxies desde configuración
   * Soporta: Firebase Config, Variables de Entorno, o lista hardcodeada
   * 
   * ESTRATEGIA AUTO-ESCALABLE:
   * - Se configura UN SOLO proxy base en PROXY_LIST
   * - El sistema automáticamente crea sesiones únicas por tenant
   * - Cada restaurante obtiene su propia IP única
   */
  async loadProxies() {
    // OPCIÓN 1: Cargar desde Firebase (recomendado para producción)
    try {
      const db = admin.database();
      const proxySnapshot = await db.ref('system/proxies').once('value');
      const proxyConfig = proxySnapshot.val();
      
      if (proxyConfig && proxyConfig.enabled && proxyConfig.baseUrl) {
        this.baseProxyUrl = proxyConfig.baseUrl;
        this.proxyType = proxyConfig.type || 'residential';
        logger.info(`📡 Proxy base cargado desde Firebase`);
        logger.info(`🌐 Sistema AUTO-ESCALABLE activado - IPs únicas por tenant`);
        return;
      }
    } catch (error) {
      logger.warn('⚠️ No se pudieron cargar proxies desde Firebase:', error.message);
    }

    // OPCIÓN 2: Cargar desde variable de entorno (RECOMENDADO)
    // Formato: PROXY_LIST=http://username:password@host:port
    // El sistema automáticamente agregará -session-{tenantId} al username
    if (process.env.PROXY_LIST) {
      const proxyUrl = process.env.PROXY_LIST.trim();
      
      // Extraer componentes del proxy URL
      const urlMatch = proxyUrl.match(/^(https?):\/\/([^:]+):([^@]+)@([^:]+):(\d+)/);
      
      if (urlMatch) {
        this.baseProxyUrl = proxyUrl;
        this.proxyType = 'residential';
        logger.info(`📡 Proxy base cargado desde ENV`);
        logger.info(`🌐 Sistema AUTO-ESCALABLE activado`);
        logger.info(`💡 Cada restaurante obtendrá una IP única automáticamente`);
        return;
      } else {
        logger.error('❌ Formato de PROXY_LIST inválido. Usa: http://username:password@host:port');
      }
    }

    // Si no hay proxy configurado
    logger.warn('⚠️ No hay proxies configurados - todos los bots usarán la IP del servidor');
    logger.warn('💡 Configura PROXY_LIST para activar el sistema anti-ban');
  }

  /**
   * Asigna un proxy único a un tenant con sesión dedicada
   * SISTEMA AUTO-ESCALABLE: Genera automáticamente una sesión única por tenant
   * 
   * @param {string} tenantId - ID del tenant (restaurante)
   * @returns {object|null} Configuración del proxy o null si no hay disponibles
   */
  assignProxyToTenant(tenantId) {
    // Si no hay proxy base configurado, retornar null
    if (!this.baseProxyUrl) {
      return null;
    }

    // Si el tenant ya tiene un proxy asignado, reutilizarlo
    if (this.tenantProxies.has(tenantId)) {
      const existingProxy = this.tenantProxies.get(tenantId);
      logger.info(`[${tenantId}] Reutilizando sesión: ${existingProxy.session}`);
      return existingProxy;
    }

    // Crear URL de proxy con sesión única para este tenant
    // Formato: http://username-session-TENANT_ID:password@host:port
    const proxyUrl = this.createSessionUrl(tenantId);
    
    const proxyConfig = {
      id: `session-${tenantId}`,
      url: proxyUrl,
      session: tenantId,
      type: this.proxyType,
      enabled: true
    };

    // Guardar asignación
    this.tenantProxies.set(tenantId, proxyConfig);
    
    logger.info(`[${tenantId}] ✅ Nueva sesión de proxy creada automáticamente`);
    logger.info(`[${tenantId}] 🎯 Este restaurante ahora tiene su propia IP única`);
    
    return proxyConfig;
  }

  /**
   * Crea una URL de proxy con sesión única para un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {string} URL del proxy con sesión
   */
  createSessionUrl(tenantId) {
    // Extraer componentes del proxy URL base
    const urlMatch = this.baseProxyUrl.match(/^(https?):\/\/([^:]+):([^@]+)@([^:]+):(\d+)/);
    
    if (!urlMatch) {
      logger.error('❌ Error: formato de proxy URL inválido');
      return this.baseProxyUrl;
    }

    const [, protocol, username, password, host, port] = urlMatch;
    
    // Agregar sufijo de sesión al username
    // Formato Bright Data: username-session-TENANT_ID
    const sessionUsername = `${username}-session-${tenantId}`;
    
    // Construir nueva URL con sesión
    const sessionUrl = `${protocol}://${sessionUsername}:${password}@${host}:${port}`;
    
    return sessionUrl;
  }

  /**
   * Crea un agente HTTP/HTTPS configurado con el proxy del tenant
   * Este agente se usa en las peticiones de Baileys
   * 
   * @param {string} tenantId - ID del tenant
   * @returns {object|null} HttpsProxyAgent o null si no hay proxy
   */
  getProxyAgent(tenantId) {
    const proxyConfig = this.assignProxyToTenant(tenantId);
    
    if (!proxyConfig) {
      return null; // Sin proxy - conexión directa
    }

    try {
      // Crear agente con timeout extendido para conexiones internacionales
      const agent = new HttpsProxyAgent(proxyConfig.url, {
        keepAlive: true,
        keepAliveMsecs: 5000, // 5 segundos entre keep-alives
        timeout: 90000, // 90 segundos - extendido para proxies internacionales
        rejectUnauthorized: false // Permitir certificados autofirmados
      });

      logger.info(`[${tenantId}] 🔗 Agente proxy creado para ${proxyConfig.id}`);
      logger.info(`[${tenantId}] ⏱️ Timeout configurado: 90 segundos`);
      
      return agent;
    } catch (error) {
      logger.error(`[${tenantId}] ❌ Error creando agente proxy:`, error.message);
      return null;
    }
  }

  /**
   * Obtiene estadísticas de uso de proxies
   * Útil para monitoreo y balanceo de carga
   */
  getProxyStats() {
    const stats = {
      baseProxyConfigured: !!this.baseProxyUrl,
      activeSessions: this.tenantProxies.size,
      proxyType: this.proxyType,
      sessions: []
    };

    // Listar todas las sesiones activas
    for (const [tenantId, proxy] of this.tenantProxies.entries()) {
      stats.sessions.push({
        tenantId: tenantId,
        session: proxy.session,
        type: proxy.type
      });
    }

    return stats;
  }

  /**
   * Libera el proxy asignado a un tenant
   * Se llama cuando se cierra una sesión
   * 
   * @param {string} tenantId - ID del tenant
   */
  releaseProxy(tenantId) {
    if (this.tenantProxies.has(tenantId)) {
      const proxy = this.tenantProxies.get(tenantId);
      this.tenantProxies.delete(tenantId);
      logger.info(`[${tenantId}] 🔓 Proxy liberado: ${proxy.id}`);
    }
  }

  /**
   * Reasigna un nuevo proxy a un tenant
   * Útil si un proxy falla o está baneado
   * 
   * @param {string} tenantId - ID del tenant
   * @returns {object|null} Nueva configuración del proxy
   */
  reassignProxy(tenantId) {
    logger.warn(`[${tenantId}] 🔄 Reasignando proxy...`);
    
    // Liberar proxy actual
    this.releaseProxy(tenantId);
    
    // Asignar nuevo proxy
    return this.assignProxyToTenant(tenantId);
  }

  /**
   * Valida si un proxy está funcionando
   * Hace una petición de prueba para verificar
   * 
   * @param {object} proxyConfig - Configuración del proxy
   * @returns {Promise<boolean>} true si funciona, false si falla
   */
  async validateProxy(proxyConfig) {
    try {
      const axios = require('axios');
      const agent = new HttpsProxyAgent(proxyConfig.url);
      
      // Hacer petición de prueba a un servicio de verificación de IP
      const response = await axios.get('https://api.ipify.org?format=json', {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 10000
      });

      logger.info(`✅ Proxy ${proxyConfig.id} válido - IP: ${response.data.ip}`);
      return true;
    } catch (error) {
      logger.error(`❌ Proxy ${proxyConfig.id} inválido:`, error.message);
      return false;
    }
  }
}

// Exportar instancia singleton
const proxyManager = new ProxyManager();
module.exports = proxyManager;
