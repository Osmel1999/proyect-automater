/**
 * Baileys Session Manager
 * Maneja la inicialización, conexión y gestión de sesiones de WhatsApp usando Baileys
 */

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('node:path');
const fs = require('node:fs').promises;
const EventEmitter = require('node:events');

const logger = pino({ level: 'info' });

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map(); // tenantId -> socket
    this.sessionStates = new Map(); // tenantId -> connection state
  }

  /**
   * Obtiene la sesión activa de un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {object|null} Socket de Baileys o null
   */
  getSession(tenantId) {
    return this.sessions.get(tenantId) || null;
  }

  /**
   * Verifica si un tenant tiene sesión activa
   * @param {string} tenantId - ID del tenant
   * @returns {boolean}
   */
  hasSession(tenantId) {
    return this.sessions.has(tenantId);
  }

  /**
   * Obtiene el estado de conexión de un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {object}
   */
  getSessionState(tenantId) {
    return this.sessionStates.get(tenantId) || { connected: false, qr: null };
  }

  /**
   * Inicializa una nueva sesión de WhatsApp para un tenant
   * @param {string} tenantId - ID del tenant
   * @param {object} options - Opciones adicionales
   * @returns {Promise<object>} Socket de Baileys
   */
  async initSession(tenantId, options = {}) {
    try {
      logger.info(`[${tenantId}] Inicializando sesión...`);

      // Si ya existe una sesión, cerrarla primero
      if (this.sessions.has(tenantId)) {
        logger.info(`[${tenantId}] Cerrando sesión existente...`);
        await this.closeSession(tenantId);
      }

      // Crear directorio de sesión si no existe
      const sessionDir = path.join(__dirname, '../../sessions', tenantId);
      await fs.mkdir(sessionDir, { recursive: true });

      // Cargar o crear estado de autenticación
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      // Configurar socket de Baileys
      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: options.printQR || false,
        logger: pino({ level: 'silent' }), // Silenciar logs internos de Baileys
        browser: ['KDS Bot', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 30000,
        emitOwnEvents: true,
        getMessage: async (key) => {
          // Implementar recuperación de mensajes si es necesario
          return { conversation: '' };
        }
      });

      // Guardar sesión
      this.sessions.set(tenantId, socket);
      this.sessionStates.set(tenantId, { 
        connected: false, 
        qr: null,
        lastSeen: null,
        phoneNumber: null
      });

      // Event: Actualización de credenciales
      socket.ev.on('creds.update', async () => {
        logger.info(`[${tenantId}] Credenciales actualizadas, guardando...`);
        await saveCreds();
        this.emit('creds-updated', tenantId);
      });

      // Event: Actualización de conexión
      socket.ev.on('connection.update', async (update) => {
        await this.handleConnectionUpdate(tenantId, update);
      });

      // Event: Mensajes recibidos
      socket.ev.on('messages.upsert', async ({ messages, type }) => {
        await this.handleIncomingMessages(tenantId, messages, type);
      });

      // Event: Actualización de estado de mensajes
      socket.ev.on('messages.update', async (updates) => {
        await this.handleMessageUpdates(tenantId, updates);
      });

      logger.info(`[${tenantId}] Sesión inicializada exitosamente`);
      return socket;

    } catch (error) {
      logger.error(`[${tenantId}] Error al inicializar sesión:`, error);
      throw error;
    }
  }

  /**
   * Maneja actualizaciones de conexión
   * @private
   */
  async handleConnectionUpdate(tenantId, update) {
    const { connection, lastDisconnect, qr } = update;

    // Actualizar estado con QR
    if (qr) {
      logger.info(`[${tenantId}] QR Code generado`);
      const state = this.sessionStates.get(tenantId);
      state.qr = qr;
      this.sessionStates.set(tenantId, state);
      this.emit('qr', tenantId, qr);
    }

    // Manejar cambios de conexión
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true;

      logger.info(`[${tenantId}] Conexión cerrada. Reconectar: ${shouldReconnect}`);

      if (shouldReconnect) {
        logger.info(`[${tenantId}] Intentando reconectar...`);
        setTimeout(() => {
          this.initSession(tenantId);
        }, 3000);
      } else {
        logger.info(`[${tenantId}] Sesión cerrada permanentemente (logout)`);
        await this.closeSession(tenantId);
        this.emit('logged-out', tenantId);
      }

      // Actualizar estado
      const state = this.sessionStates.get(tenantId);
      state.connected = false;
      this.sessionStates.set(tenantId, state);
      this.emit('disconnected', tenantId);

    } else if (connection === 'open') {
      logger.info(`[${tenantId}] Conexión establecida exitosamente`);

      // Obtener información del número
      const socket = this.sessions.get(tenantId);
      const phoneNumber = socket.user?.id?.split(':')[0] || null;

      // Actualizar estado
      const state = this.sessionStates.get(tenantId);
      state.connected = true;
      state.qr = null;
      state.lastSeen = new Date();
      state.phoneNumber = phoneNumber;
      this.sessionStates.set(tenantId, state);

      this.emit('connected', tenantId, phoneNumber);
    }
  }

  /**
   * Maneja mensajes entrantes
   * @private
   */
  async handleIncomingMessages(tenantId, messages, type) {
    for (const message of messages) {
      if (type === 'notify') {
        logger.info(`[${tenantId}] Mensaje recibido de ${message.key.remoteJid}`);
        this.emit('message', tenantId, message);
      }
    }
  }

  /**
   * Maneja actualizaciones de estado de mensajes
   * @private
   */
  async handleMessageUpdates(tenantId, updates) {
    for (const update of updates) {
      logger.info(`[${tenantId}] Actualización de mensaje:`, update.key.id);
      this.emit('message-update', tenantId, update);
    }
  }

  /**
   * Cierra una sesión de WhatsApp
   * @param {string} tenantId - ID del tenant
   */
  async closeSession(tenantId) {
    try {
      const socket = this.sessions.get(tenantId);
      if (socket) {
        await socket.logout();
        this.sessions.delete(tenantId);
        this.sessionStates.delete(tenantId);
        logger.info(`[${tenantId}] Sesión cerrada`);
      }
    } catch (error) {
      logger.error(`[${tenantId}] Error al cerrar sesión:`, error);
    }
  }

  /**
   * Desconecta una sesión sin hacer logout (mantiene credenciales)
   * @param {string} tenantId - ID del tenant
   */
  async disconnectSession(tenantId) {
    try {
      const socket = this.sessions.get(tenantId);
      if (socket) {
        await socket.end();
        this.sessions.delete(tenantId);
        logger.info(`[${tenantId}] Sesión desconectada (credenciales preservadas)`);
      }
    } catch (error) {
      logger.error(`[${tenantId}] Error al desconectar sesión:`, error);
    }
  }

  /**
   * Elimina los archivos de sesión de un tenant
   * @param {string} tenantId - ID del tenant
   */
  async deleteSessionFiles(tenantId) {
    try {
      const sessionDir = path.join(__dirname, '../../sessions', tenantId);
      await fs.rm(sessionDir, { recursive: true, force: true });
      logger.info(`[${tenantId}] Archivos de sesión eliminados`);
    } catch (error) {
      logger.error(`[${tenantId}] Error al eliminar archivos de sesión:`, error);
    }
  }

  /**
   * Verifica si un tenant está conectado
   * @param {string} tenantId - ID del tenant
   * @returns {boolean}
   */
  isConnected(tenantId) {
    const state = this.sessionStates.get(tenantId);
    return state?.connected || false;
  }

  /**
   * Obtiene lista de todos los tenants con sesión activa
   * @returns {Array<string>}
   */
  getActiveSessions() {
    return Array.from(this.sessions.keys());
  }

  /**
   * Obtiene estadísticas de todas las sesiones
   * @returns {Array<object>}
   */
  getSessionStats() {
    const stats = [];
    for (const [tenantId, state] of this.sessionStates.entries()) {
      stats.push({
        tenantId,
        connected: state.connected,
        phoneNumber: state.phoneNumber,
        lastSeen: state.lastSeen
      });
    }
    return stats;
  }
}

// Singleton instance
const sessionManager = new SessionManager();

module.exports = sessionManager;
