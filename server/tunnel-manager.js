/**
 * 🔧 Tunnel Manager - Sistema de Túnel por Navegador
 * 
 * Gestiona conexiones WebSocket desde los navegadores de los restaurantes
 * para crear un túnel que permite usar la IP real del dispositivo.
 * 
 * VENTAJAS:
 * - WhatsApp ve la IP del restaurante, no la de Railway
 * - Sin instalación de apps
 * - Fallback automático a Railway si túnel falla
 * - Sesión WhatsApp persiste durante cambios de túnel
 * 
 * @module tunnel-manager
 * @version 1.0.0
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class TunnelManager extends EventEmitter {
  constructor() {
    super();
    
    /**
     * Mapa de túneles activos
     * Key: tenantId
     * Value: { socket, deviceInfo, connectedAt, stats }
     */
    this.tunnels = new Map();
    
    /**
     * Mapa de requests pendientes
     * Key: requestId
     * Value: { resolve, reject, timeout }
     */
    this.pendingRequests = new Map();
    
    /**
     * Configuración
     */
    this.config = {
      requestTimeout: 30000,      // 30 segundos para respuestas
      heartbeatInterval: 20000,   // 20 segundos entre heartbeats (más frecuente)
      reconnectWindow: 60000,     // 1 minuto para reconectar antes de fallback
      maxPendingRequests: 100,    // Máximo de requests pendientes por túnel
      heartbeatTimeout: 60000     // 60 segundos sin heartbeat antes de considerar muerto (3x intervalo)
    };
    
    /**
     * Estadísticas globales
     */
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      requestsSent: 0,
      requestsSuccess: 0,
      requestsFailed: 0,
      bytesProxied: 0
    };
    
    console.log('✅ [TunnelManager] Inicializado');
  }

  /**
   * Registrar un túnel WebSocket
   * @param {WebSocket} socket - Socket del cliente
   * @param {Object} deviceInfo - Información del dispositivo
   */
  registerTunnel(socket, deviceInfo = {}) {
    const { tenantId } = deviceInfo;
    
    if (!tenantId) {
      console.warn('⚠️ [TunnelManager] Túnel registrado sin tenantId inicial (se esperará registro tardío)');
      return true;  // Permitir conexión, esperar tenantId después
    }

    // Si ya existe un túnel, cerrar el anterior
    if (this.tunnels.has(tenantId)) {
      console.log(`🔄 [TunnelManager] Reemplazando túnel existente para ${tenantId}`);
      console.log(`   ⚠️ Esto puede indicar múltiples Service Workers o pestañas`);
      const oldTunnel = this.tunnels.get(tenantId);
      try {
        oldTunnel.socket.close(1000, 'Nueva conexión establecida');
      } catch (error) {
        console.error(`   ❌ Error cerrando túnel anterior: ${error.message}`);
      }
    }

    const tunnelInfo = {
      socket,
      deviceInfo,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      stats: {
        requestsSent: 0,
        requestsSuccess: 0,
        requestsFailed: 0,
        bytesProxied: 0
      }
    };

    this.tunnels.set(tenantId, tunnelInfo);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    console.log(`✅ [TunnelManager] Túnel registrado: ${tenantId}`);
    console.log(`   📱 Dispositivo: ${deviceInfo.userAgent || 'Unknown'}`);
    console.log(`   📄 Página: ${deviceInfo.page || 'Unknown'}`);
    console.log(`   🌐 Túneles activos: ${this.tunnels.size}`);

    // Configurar heartbeat
    this.startHeartbeat(tenantId);

    // Emitir evento
    this.emit('tunnel:connected', {
      tenantId,
      deviceInfo,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Desregistrar un túnel
   * @param {string} tenantId - ID del tenant
   * @param {string} reason - Razón de desconexión
   */
  unregisterTunnel(tenantId, reason = 'unknown') {
    if (!this.tunnels.has(tenantId)) {
      return false;
    }

    const tunnel = this.tunnels.get(tenantId);
    
    // Rechazar todos los requests pendientes
    this.pendingRequests.forEach((request, requestId) => {
      if (requestId.startsWith(tenantId)) {
        clearTimeout(request.timeout);
        request.reject(new Error('Túnel desconectado'));
        this.pendingRequests.delete(requestId);
      }
    });

    // Limpiar heartbeat
    if (tunnel.heartbeatInterval) {
      clearInterval(tunnel.heartbeatInterval);
    }

    this.tunnels.delete(tenantId);
    this.stats.activeConnections--;

    console.log(`❌ [TunnelManager] Túnel desregistrado: ${tenantId}`);
    console.log(`   💡 Razón: ${reason}`);
    console.log(`   🌐 Túneles activos: ${this.tunnels.size}`);

    // Emitir evento
    this.emit('tunnel:disconnected', {
      tenantId,
      reason,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Verificar si un tenant tiene túnel activo
   * @param {string} tenantId - ID del tenant
   * @returns {boolean}
   */
  hasTunnel(tenantId) {
    return this.tunnels.has(tenantId);
  }

  /**
   * Obtener información del túnel
   * @param {string} tenantId - ID del tenant
   * @returns {Object|null}
   */
  getTunnelInfo(tenantId) {
    if (!this.tunnels.has(tenantId)) {
      return null;
    }

    const tunnel = this.tunnels.get(tenantId);
    return {
      tenantId,
      deviceInfo: tunnel.deviceInfo,
      connectedAt: tunnel.connectedAt,
      uptime: Date.now() - tunnel.connectedAt,
      stats: tunnel.stats,
      isHealthy: this.isTunnelHealthy(tenantId)
    };
  }

  /**
   * Verificar salud del túnel
   * @param {string} tenantId - ID del tenant
   * @returns {boolean}
   */
  isTunnelHealthy(tenantId) {
    if (!this.tunnels.has(tenantId)) {
      return false;
    }

    const tunnel = this.tunnels.get(tenantId);
    const timeSinceHeartbeat = Date.now() - tunnel.lastHeartbeat;
    
    // Túnel saludable si último heartbeat fue hace menos de heartbeatTimeout
    return timeSinceHeartbeat < this.config.heartbeatTimeout;
  }

  /**
   * Obtener estadísticas del túnel
   * @param {string} tenantId - ID del tenant
   * @returns {Object} - Estadísticas del túnel
   */
  getTunnelStats(tenantId) {
    if (!this.tunnels.has(tenantId)) {
      return null;
    }

    const tunnel = this.tunnels.get(tenantId);
    return {
      requestsSent: tunnel.stats.requestsSent,
      requestsSuccess: tunnel.stats.requestsSuccess,
      requestsFailed: tunnel.stats.requestsFailed,
      bytesProxied: tunnel.stats.bytesProxied,
      uptime: Date.now() - tunnel.connectedAt,
      lastHeartbeat: tunnel.lastHeartbeat,
      timeSinceHeartbeat: Date.now() - tunnel.lastHeartbeat
    };
  }

  /**
   * Hacer request HTTP a través del túnel
   * @param {string} tenantId - ID del tenant
   * @param {Object} options - Opciones del request
   * @returns {Promise<Object>} - Respuesta del request
   */
  async proxyRequest(tenantId, options) {
    if (!this.hasTunnel(tenantId)) {
      throw new Error(`No hay túnel activo para ${tenantId}`);
    }

    const tunnel = this.tunnels.get(tenantId);
    const requestId = `${tenantId}_${uuidv4()}`;

    // Verificar límite de requests pendientes
    const pendingCount = Array.from(this.pendingRequests.keys())
      .filter(id => id.startsWith(tenantId))
      .length;

    if (pendingCount >= this.config.maxPendingRequests) {
      throw new Error(`Demasiados requests pendientes para ${tenantId}`);
    }

    console.log(`📤 [TunnelManager] Enviando request a través de túnel ${tenantId}`);
    console.log(`   🆔 Request ID: ${requestId}`);
    console.log(`   🌐 URL: ${options.url}`);

    return new Promise((resolve, reject) => {
      // Configurar timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        tunnel.stats.requestsFailed++;
        this.stats.requestsFailed++;
        reject(new Error('Request timeout'));
      }, this.config.requestTimeout);

      // Guardar request pendiente
      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // Enviar request al navegador
      try {
        tunnel.socket.send(JSON.stringify({
          type: 'proxy.request',
          requestId,
          url: options.url,
          method: options.method || 'GET',
          headers: options.headers || {},
          body: options.body
        }));

        tunnel.stats.requestsSent++;
        this.stats.requestsSent++;

      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        tunnel.stats.requestsFailed++;
        this.stats.requestsFailed++;
        reject(error);
      }
    });
  }

  /**
   * Manejar respuesta de request proxy
   * @param {string} requestId - ID del request
   * @param {Object} response - Respuesta del navegador
   */
  handleProxyResponse(requestId, response) {
    if (!this.pendingRequests.has(requestId)) {
      console.warn(`⚠️ [TunnelManager] Respuesta para request desconocido: ${requestId}`);
      return;
    }

    const request = this.pendingRequests.get(requestId);
    clearTimeout(request.timeout);
    this.pendingRequests.delete(requestId);

    // Actualizar estadísticas
    const tenantId = requestId.split('_')[0];
    if (this.tunnels.has(tenantId)) {
      const tunnel = this.tunnels.get(tenantId);
      tunnel.stats.requestsSuccess++;
      tunnel.stats.bytesProxied += (response.body?.length || 0);
      this.stats.requestsSuccess++;
      this.stats.bytesProxied += (response.body?.length || 0);
    }

    console.log(`📥 [TunnelManager] Respuesta recibida: ${requestId}`);
    console.log(`   📊 Status: ${response.status}`);

    request.resolve(response);
  }

  /**
   * Manejar error de request proxy
   * @param {string} requestId - ID del request
   * @param {string} error - Mensaje de error
   */
  handleProxyError(requestId, error) {
    if (!this.pendingRequests.has(requestId)) {
      console.warn(`⚠️ [TunnelManager] Error para request desconocido: ${requestId}`);
      return;
    }

    const request = this.pendingRequests.get(requestId);
    clearTimeout(request.timeout);
    this.pendingRequests.delete(requestId);

    // Actualizar estadísticas
    const tenantId = requestId.split('_')[0];
    if (this.tunnels.has(tenantId)) {
      const tunnel = this.tunnels.get(tenantId);
      tunnel.stats.requestsFailed++;
      this.stats.requestsFailed++;
    }

    console.error(`❌ [TunnelManager] Error en request: ${requestId}`);
    console.error(`   💥 Error: ${error}`);

    request.reject(new Error(error));
  }

  /**
   * Iniciar heartbeat para un túnel
   * @param {string} tenantId - ID del tenant
   */
  startHeartbeat(tenantId) {
    if (!this.tunnels.has(tenantId)) {
      return;
    }

    const tunnel = this.tunnels.get(tenantId);

    // Limpiar heartbeat anterior si existe
    if (tunnel.heartbeatInterval) {
      clearInterval(tunnel.heartbeatInterval);
    }

    // Enviar ping cada 30 segundos
    tunnel.heartbeatInterval = setInterval(() => {
      if (!this.tunnels.has(tenantId)) {
        clearInterval(tunnel.heartbeatInterval);
        return;
      }

      try {
        // Verificar si el socket está abierto antes de enviar ping
        if (tunnel.socket.readyState !== 1) { // 1 = OPEN
          console.warn(`⚠️ [TunnelManager] Socket no está abierto para ${tenantId}, estado: ${tunnel.socket.readyState}`);
          return; // No cerrar aún, solo advertir
        }

        tunnel.socket.send(JSON.stringify({ type: 'ping' }));
        
        // Verificar si túnel está saludable (solo advertir, no cerrar)
        if (!this.isTunnelHealthy(tenantId)) {
          const timeSinceHeartbeat = Date.now() - tunnel.lastHeartbeat;
          console.warn(`⚠️ [TunnelManager] Túnel sin heartbeat reciente: ${tenantId} (${Math.round(timeSinceHeartbeat/1000)}s)`);
          this.emit('tunnel:unhealthy', { tenantId, timeSinceHeartbeat });
          
          // Solo cerrar si excede el timeout máximo (90 segundos)
          if (timeSinceHeartbeat > this.config.heartbeatTimeout) {
            console.error(`❌ [TunnelManager] Túnel muerto por timeout: ${tenantId}`);
            this.unregisterTunnel(tenantId, 'heartbeat_timeout');
          }
        }
      } catch (error) {
        console.error(`❌ [TunnelManager] Error en heartbeat: ${error.message}`);
        // Solo cerrar si el error es fatal
        if (error.message.includes('not open') || error.message.includes('closed')) {
          this.unregisterTunnel(tenantId, 'heartbeat_failed');
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Actualizar timestamp de último heartbeat
   * @param {string} tenantId - ID del tenant
   */
  updateHeartbeat(tenantId) {
    if (!this.tunnels.has(tenantId)) {
      return;
    }

    const tunnel = this.tunnels.get(tenantId);
    tunnel.lastHeartbeat = Date.now();
  }

  /**
   * Obtener estadísticas globales
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      activeTunnels: this.tunnels.size,
      pendingRequests: this.pendingRequests.size,
      tunnels: Array.from(this.tunnels.keys()).map(tenantId => ({
        tenantId,
        ...this.getTunnelInfo(tenantId)
      }))
    };
  }

  /**
   * Limpiar recursos
   */
  cleanup() {
    console.log('🧹 [TunnelManager] Limpiando recursos...');

    // Cerrar todos los túneles
    for (const [tenantId, tunnel] of this.tunnels) {
      if (tunnel.heartbeatInterval) {
        clearInterval(tunnel.heartbeatInterval);
      }
      tunnel.socket.close(1000, 'Server shutdown');
    }

    // Limpiar requests pendientes
    for (const [requestId, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Server shutdown'));
    }

    this.tunnels.clear();
    this.pendingRequests.clear();

    console.log('✅ [TunnelManager] Recursos limpiados');
  }
}

// Singleton
const tunnelManager = new TunnelManager();

module.exports = tunnelManager;
