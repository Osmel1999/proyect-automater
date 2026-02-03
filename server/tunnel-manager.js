/**
 * 🌐 Tunnel Manager
 * Gestiona túneles WebSocket desde navegadores de restaurantes
 * Permite que WhatsApp vea la IP real del restaurante
 * 
 * VENTAJAS:
 * - $0 costo (reemplaza Bright Data)
 * - IP real del restaurante (mejor anti-ban)
 * - Sin instalación de apps
 * - Fallback automático a conexión directa
 */

const pino = require('pino');
const logger = pino({ level: 'info' });
const EventEmitter = require('events');

class TunnelManager extends EventEmitter {
  constructor() {
    super();
    
    // Mapa de túneles activos: tenantId -> WebSocket connection
    this.tunnels = new Map();
    
    // Mapa de peticiones pendientes: requestId -> { resolve, reject, timeout }
    this.pendingRequests = new Map();
    
    // Timeout para peticiones (30 segundos)
    this.requestTimeout = 30000;
    
    // Contador para IDs únicos de peticiones
    this.requestIdCounter = 0;
    
    logger.info('🌐 Tunnel Manager inicializado');
  }

  /**
   * Registra un nuevo túnel WebSocket de un navegador
   * @param {string} tenantId - ID del tenant
   * @param {WebSocket} ws - Conexión WebSocket
   */
  registerTunnel(tenantId, ws) {
    // Si ya existe un túnel para este tenant, cerrar el anterior
    if (this.tunnels.has(tenantId)) {
      logger.info(`[${tenantId}] Cerrando túnel anterior...`);
      const oldWs = this.tunnels.get(tenantId);
      try {
        oldWs.close();
      } catch (error) {
        logger.warn(`[${tenantId}] Error cerrando túnel anterior:`, error.message);
      }
    }

    // Registrar nuevo túnel
    this.tunnels.set(tenantId, ws);
    logger.info(`[${tenantId}] ✅ Túnel WebSocket registrado desde navegador`);
    logger.info(`[${tenantId}] 🌐 WhatsApp ahora usará la IP del restaurante`);

    // Configurar handlers del WebSocket
    ws.on('message', (data) => this.handleTunnelMessage(tenantId, data));
    
    ws.on('close', () => {
      this.tunnels.delete(tenantId);
      logger.info(`[${tenantId}] ⚠️ Túnel cerrado - Fallback a conexión directa`);
      this.emit('tunnel:closed', tenantId);
    });

    ws.on('error', (error) => {
      logger.error(`[${tenantId}] ❌ Error en túnel:`, error.message);
      this.tunnels.delete(tenantId);
      this.emit('tunnel:error', tenantId, error);
    });

    // Emitir evento de túnel activo
    this.emit('tunnel:active', tenantId);
  }

  /**
   * Maneja mensajes recibidos del túnel
   * @param {string} tenantId - ID del tenant
   * @param {Buffer|string} data - Datos recibidos
   */
  handleTunnelMessage(tenantId, data) {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'tunnel.init':
          // Confirmación de inicialización del túnel
          logger.info(`[${tenantId}] Túnel inicializado desde navegador`);
          if (message.deviceInfo) {
            logger.info(`[${tenantId}] Dispositivo: ${message.deviceInfo.userAgent}`);
          }
          break;

        case 'proxy.response':
          // Respuesta a una petición proxy
          this.handleProxyResponse(message);
          break;

        case 'proxy.error':
          // Error en una petición proxy
          this.handleProxyError(message);
          break;

        case 'ping':
          // Keep-alive ping
          const ws = this.tunnels.get(tenantId);
          if (ws && ws.readyState === 1) { // OPEN
            ws.send(JSON.stringify({ type: 'pong' }));
          }
          break;

        default:
          logger.warn(`[${tenantId}] Tipo de mensaje desconocido: ${message.type}`);
      }
    } catch (error) {
      logger.error(`[${tenantId}] Error procesando mensaje del túnel:`, error);
    }
  }

  /**
   * Maneja respuesta exitosa de una petición proxy
   * @param {object} message - Mensaje con la respuesta
   */
  handleProxyResponse(message) {
    const { requestId, status, headers, body } = message;
    
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      logger.warn(`Respuesta recibida para petición desconocida: ${requestId}`);
      return;
    }

    // Limpiar timeout
    clearTimeout(pending.timeout);
    
    // Resolver promesa
    pending.resolve({
      status,
      headers,
      body
    });

    // Limpiar de pendientes
    this.pendingRequests.delete(requestId);
  }

  /**
   * Maneja error en una petición proxy
   * @param {object} message - Mensaje con el error
   */
  handleProxyError(message) {
    const { requestId, error } = message;
    
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      logger.warn(`Error recibido para petición desconocida: ${requestId}`);
      return;
    }

    // Limpiar timeout
    clearTimeout(pending.timeout);
    
    // Rechazar promesa
    pending.reject(new Error(error));

    // Limpiar de pendientes
    this.pendingRequests.delete(requestId);
  }

  /**
   * Verifica si hay un túnel activo para un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {boolean}
   */
  hasTunnel(tenantId) {
    const ws = this.tunnels.get(tenantId);
    return !!(ws && ws.readyState === 1); // 1 = OPEN
  }

  /**
   * Ejecuta una petición HTTP a través del túnel del navegador
   * La petición se ejecuta desde el navegador del restaurante (usa su IP)
   * 
   * @param {string} tenantId - ID del tenant
   * @param {string} url - URL a la que hacer la petición
   * @param {object} options - Opciones de la petición (method, headers, body)
   * @returns {Promise<object>} Respuesta de la petición
   */
  async proxyRequest(tenantId, url, options = {}) {
    // Verificar que hay túnel activo
    const ws = this.tunnels.get(tenantId);
    if (!ws || ws.readyState !== 1) {
      throw new Error(`No hay túnel activo para tenant ${tenantId}`);
    }

    // Generar ID único para esta petición
    // Usando crypto.randomUUID() para evitar colisiones en alta concurrencia
    const requestId = `${tenantId}-${crypto.randomUUID()}`;

    // Preparar mensaje de petición
    const request = {
      type: 'proxy.request',
      requestId,
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body || null
    };

    // Crear promesa para esperar respuesta
    return new Promise((resolve, reject) => {
      // Configurar timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Timeout esperando respuesta del túnel (${this.requestTimeout}ms)`));
      }, this.requestTimeout);

      // Guardar en pendientes
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
        tenantId,
        url,
        timestamp: Date.now()
      });

      // Enviar petición al navegador
      try {
        ws.send(JSON.stringify(request));
        logger.debug(`[${tenantId}] Petición enviada al túnel: ${options.method || 'GET'} ${url}`);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(new Error(`Error enviando petición al túnel: ${error.message}`));
      }
    });
  }

  /**
   * Obtiene estadísticas de túneles activos
   * @returns {object}
   */
  getStats() {
    const stats = {
      activeTunnels: this.tunnels.size,
      pendingRequests: this.pendingRequests.size,
      tunnels: []
    };

    // Listar túneles activos
    for (const [tenantId, ws] of this.tunnels.entries()) {
      stats.tunnels.push({
        tenantId,
        readyState: ws.readyState,
        active: ws.readyState === 1
      });
    }

    return stats;
  }

  /**
   * Cierra el túnel de un tenant
   * @param {string} tenantId - ID del tenant
   */
  closeTunnel(tenantId) {
    const ws = this.tunnels.get(tenantId);
    if (ws) {
      try {
        ws.close();
        this.tunnels.delete(tenantId);
        logger.info(`[${tenantId}] Túnel cerrado manualmente`);
      } catch (error) {
        logger.error(`[${tenantId}] Error cerrando túnel:`, error.message);
      }
    }
  }

  /**
   * Cierra todos los túneles
   */
  closeAll() {
    logger.info('Cerrando todos los túneles...');
    for (const [tenantId, ws] of this.tunnels.entries()) {
      try {
        ws.close();
      } catch (error) {
        logger.error(`[${tenantId}] Error cerrando túnel:`, error.message);
      }
    }
    this.tunnels.clear();
    this.pendingRequests.clear();
  }

  /**
   * Limpia peticiones pendientes que hayan expirado
   */
  cleanupExpiredRequests() {
    const now = Date.now();
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > this.requestTimeout) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Petición expirada'));
        this.pendingRequests.delete(requestId);
        logger.warn(`[${pending.tenantId}] Petición expirada: ${pending.url}`);
      }
    }
  }
}

// Crear instancia singleton
const tunnelManager = new TunnelManager();

// Limpiar peticiones expiradas cada minuto
setInterval(() => {
  tunnelManager.cleanupExpiredRequests();
}, 60000);

module.exports = tunnelManager;
