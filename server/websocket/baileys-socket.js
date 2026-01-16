/**
 * Baileys WebSocket Handler
 * Maneja comunicación en tiempo real entre servidor y clientes
 */

const logger = require('pino')({ level: 'info' });

class BaileysWebSocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map(); // tenantId -> Set of socket IDs
    this.setupSocketServer();
  }

  /**
   * Configura el servidor de WebSocket
   */
  setupSocketServer() {
    this.io.on('connection', (socket) => {
      logger.info(`Cliente WebSocket conectado: ${socket.id}`);

      // Registrar tenant
      socket.on('register', (tenantId) => {
        this.registerClient(tenantId, socket);
      });

      // Desconexión
      socket.on('disconnect', () => {
        this.unregisterClient(socket);
      });
    });

    logger.info('Servidor WebSocket configurado');
  }

  /**
   * Registra un cliente para recibir eventos de un tenant
   * @param {string} tenantId - ID del tenant
   * @param {object} socket - Socket del cliente
   */
  registerClient(tenantId, socket) {
    if (!this.connectedClients.has(tenantId)) {
      this.connectedClients.set(tenantId, new Set());
    }

    this.connectedClients.get(tenantId).add(socket.id);
    socket.tenantId = tenantId;

    logger.info(`[${tenantId}] Cliente registrado: ${socket.id}`);
    socket.emit('registered', { tenantId, socketId: socket.id });
  }

  /**
   * Desregistra un cliente
   * @param {object} socket - Socket del cliente
   */
  unregisterClient(socket) {
    const tenantId = socket.tenantId;
    
    if (tenantId && this.connectedClients.has(tenantId)) {
      this.connectedClients.get(tenantId).delete(socket.id);
      
      if (this.connectedClients.get(tenantId).size === 0) {
        this.connectedClients.delete(tenantId);
      }

      logger.info(`[${tenantId}] Cliente desconectado: ${socket.id}`);
    }
  }

  /**
   * Emite un evento a todos los clientes de un tenant
   * @param {string} tenantId - ID del tenant
   * @param {string} event - Nombre del evento
   * @param {object} data - Datos del evento
   */
  emitToTenant(tenantId, event, data) {
    const clients = this.connectedClients.get(tenantId);
    
    if (clients && clients.size > 0) {
      clients.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });

      logger.info(`[${tenantId}] Evento emitido: ${event} a ${clients.size} clientes`);
    }
  }

  /**
   * Emite evento de mensaje recibido
   * @param {string} tenantId - ID del tenant
   * @param {object} message - Mensaje en formato interno
   */
  emitMessageReceived(tenantId, message) {
    this.emitToTenant(tenantId, 'message:received', {
      tenantId,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * Emite evento de mensaje enviado
   * @param {string} tenantId - ID del tenant
   * @param {object} message - Mensaje en formato interno
   */
  emitMessageSent(tenantId, message) {
    this.emitToTenant(tenantId, 'message:sent', {
      tenantId,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * Emite evento de cambio de estado de conexión
   * @param {string} tenantId - ID del tenant
   * @param {string} status - Estado (connected, disconnected, connecting)
   * @param {object} details - Detalles adicionales
   */
  emitConnectionStatus(tenantId, status, details = {}) {
    this.emitToTenant(tenantId, 'connection:status', {
      tenantId,
      status,
      details,
      timestamp: Date.now()
    });
  }

  /**
   * Emite evento de nuevo QR generado
   * @param {string} tenantId - ID del tenant
   * @param {string} qr - Código QR
   */
  emitQRUpdated(tenantId, qr) {
    this.emitToTenant(tenantId, 'qr:updated', {
      tenantId,
      qr,
      timestamp: Date.now()
    });
  }

  /**
   * Emite evento de actualización de estado de mensaje
   * @param {string} tenantId - ID del tenant
   * @param {string} messageId - ID del mensaje
   * @param {string} status - Nuevo estado (sent, delivered, read)
   */
  emitMessageStatus(tenantId, messageId, status) {
    this.emitToTenant(tenantId, 'message:status', {
      tenantId,
      messageId,
      status,
      timestamp: Date.now()
    });
  }

  /**
   * Obtiene estadísticas de clientes conectados
   * @returns {object}
   */
  getStats() {
    const stats = {
      totalClients: 0,
      tenants: []
    };

    this.connectedClients.forEach((clients, tenantId) => {
      stats.totalClients += clients.size;
      stats.tenants.push({
        tenantId,
        clients: clients.size
      });
    });

    return stats;
  }
}

module.exports = BaileysWebSocketHandler;
