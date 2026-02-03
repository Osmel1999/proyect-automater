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
    
    // Lista de proxies disponibles (se cargan de Firebase o env vars)
    this.availableProxies = [];
    
    // Índice para rotación round-robin
    this.currentProxyIndex = 0;
  }

  /**
   * Inicializa el proxy manager cargando configuración
   */
  async initialize() {
    try {
      logger.info('🌐 Inicializando Proxy Manager...');
      
      // Cargar proxies desde variables de entorno o Firebase
      await this.loadProxies();
      
      logger.info(`✅ Proxy Manager inicializado con ${this.availableProxies.length} proxies disponibles`);
    } catch (error) {
      logger.error('❌ Error inicializando Proxy Manager:', error);
      // Continuar sin proxies (fallback)
      logger.warn('⚠️ Continuando sin proxies - TODOS los bots compartirán la misma IP');
    }
  }

  /**
   * Carga la lista de proxies desde configuración
   * Soporta: Firebase Config, Variables de Entorno, o lista hardcodeada
   */
  async loadProxies() {
    // OPCIÓN 1: Cargar desde Firebase (recomendado para producción)
    try {
      const db = admin.database();
      const proxySnapshot = await db.ref('system/proxies').once('value');
      const proxyConfig = proxySnapshot.val();
      
      if (proxyConfig && proxyConfig.enabled && proxyConfig.list) {
        this.availableProxies = proxyConfig.list.filter(p => p.enabled);
        logger.info(`📡 Cargados ${this.availableProxies.length} proxies desde Firebase`);
        return;
      }
    } catch (error) {
      logger.warn('⚠️ No se pudieron cargar proxies desde Firebase:', error.message);
    }

    // OPCIÓN 2: Cargar desde variable de entorno
    // Formato: PROXY_LIST=http://user:pass@ip1:port,http://user:pass@ip2:port
    if (process.env.PROXY_LIST) {
      const proxyUrls = process.env.PROXY_LIST.split(',').map(url => url.trim());
      this.availableProxies = proxyUrls.map((url, index) => ({
        id: `proxy-${index}`,
        url: url,
        enabled: true,
        type: 'residential' // o 'datacenter'
      }));
      logger.info(`📡 Cargados ${this.availableProxies.length} proxies desde ENV`);
      return;
    }

    // OPCIÓN 3: Lista de ejemplo (para testing)
    // ⚠️ REEMPLAZAR CON TUS PROXIES REALES
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ Usando proxies de ejemplo (SOLO PARA DESARROLLO)');
      this.availableProxies = [
        // Ejemplo: Bright Data (reemplazar con credenciales reales)
        // { id: 'brightdata-1', url: 'http://username:password@brd.superproxy.io:22225', enabled: true, type: 'residential' },
        
        // Ejemplo: Smartproxy (reemplazar con credenciales reales)
        // { id: 'smartproxy-1', url: 'http://username:password@gate.smartproxy.com:7000', enabled: true, type: 'residential' },
        
        // Por ahora, lista vacía para no causar errores
      ];
    }

    if (this.availableProxies.length === 0) {
      logger.warn('⚠️ No hay proxies configurados - todos los bots usarán la IP del servidor');
    }
  }

  /**
   * Asigna un proxy único a un tenant
   * Usa estrategia round-robin para distribución equitativa
   * 
   * @param {string} tenantId - ID del tenant
   * @returns {object|null} Configuración del proxy o null si no hay disponibles
   */
  assignProxyToTenant(tenantId) {
    // Si no hay proxies disponibles, retornar null (sin proxy)
    if (this.availableProxies.length === 0) {
      logger.warn(`[${tenantId}] No hay proxies disponibles - usando IP directa`);
      return null;
    }

    // Si el tenant ya tiene un proxy asignado, reutilizarlo
    if (this.tenantProxies.has(tenantId)) {
      const existingProxy = this.tenantProxies.get(tenantId);
      logger.info(`[${tenantId}] Reutilizando proxy: ${existingProxy.id}`);
      return existingProxy;
    }

    // Asignar siguiente proxy disponible (round-robin)
    const proxy = this.availableProxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.availableProxies.length;

    // Guardar asignación
    this.tenantProxies.set(tenantId, proxy);
    
    logger.info(`[${tenantId}] ✅ Proxy asignado: ${proxy.id} (${proxy.type})`);
    
    return proxy;
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
      // Crear agente con timeout y configuración de keep-alive
      const agent = new HttpsProxyAgent(proxyConfig.url, {
        keepAlive: true,
        keepAliveMsecs: 1000,
        timeout: 30000,
        rejectUnauthorized: false // Permitir certificados autofirmados
      });

      logger.info(`[${tenantId}] 🔗 Agente proxy creado para ${proxyConfig.id}`);
      
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
      totalProxies: this.availableProxies.length,
      assignedProxies: this.tenantProxies.size,
      proxyUsage: {}
    };

    // Contar cuántos tenants usan cada proxy
    for (const [tenantId, proxy] of this.tenantProxies.entries()) {
      if (!stats.proxyUsage[proxy.id]) {
        stats.proxyUsage[proxy.id] = [];
      }
      stats.proxyUsage[proxy.id].push(tenantId);
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
