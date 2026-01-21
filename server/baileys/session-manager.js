/**
 * Baileys Session Manager
 * Maneja la inicialización, conexión y gestión de sesiones de WhatsApp usando Baileys
 */

const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('node:path');
const fs = require('node:fs').promises;
const EventEmitter = require('node:events');

const logger = pino({ level: 'info' });

// Remove top-level require to avoid circular dependency
// let connectionManager = null;
// try {
//   connectionManager = require('./connection-manager');
// } catch (error) {
//   logger.warn('Connection Manager no disponible:', error.message);
// }

// Helper to get connectionManager lazily
function getConnectionManager() {
  try {
    return require('./connection-manager');
  } catch (error) {
    logger.warn('Connection Manager no disponible lazily:', error.message);
    return null;
  }
}

// Baileys es ESM, se carga dinámicamente
let baileys = null;
let baileysPromise = null;

async function loadBaileys() {
  if (baileys) return baileys;
  if (!baileysPromise) {
    baileysPromise = import('@whiskeysockets/baileys').then((module) => {
      baileys = module;
      return module;
    });
  }
  return baileysPromise;
}

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

      // Cargar Baileys si no está cargado
      const { default: makeWASocket, useMultiFileAuthState } = await loadBaileys();

      // Si ya existe una sesión, cerrarla primero
      if (this.sessions.has(tenantId)) {
        logger.info(`[${tenantId}] Cerrando sesión existente...`);
        await this.closeSession(tenantId);
      }

      // Crear directorio de sesión si no existe
      const sessionDir = path.join(__dirname, '../../sessions', tenantId);
      await fs.mkdir(sessionDir, { recursive: true });

      // Intentar cargar estado de autenticación
      let state, saveCreds;
      try {
        const authState = await useMultiFileAuthState(sessionDir);
        state = authState.state;
        saveCreds = authState.saveCreds;
      } catch (authError) {
        logger.warn(`[${tenantId}] Error al cargar estado de autenticación: ${authError.message}`);
        logger.info(`[${tenantId}] Limpiando sesión corrupta y creando nueva...`);
        
        // Limpiar carpeta de sesión corrupta
        try {
          const files = await fs.readdir(sessionDir);
          for (const file of files) {
            await fs.unlink(path.join(sessionDir, file));
          }
        } catch (cleanError) {
          logger.error(`[${tenantId}] Error al limpiar sesión:`, cleanError);
        }
        
        // Intentar crear nuevo estado
        const authState = await useMultiFileAuthState(sessionDir);
        state = authState.state;
        saveCreds = authState.saveCreds;
      }

      // Configurar socket de Baileys
      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: options.printQR || false,
        logger: pino({ level: 'silent' }), // Silenciar logs internos de Baileys
        browser: ['KDS', 'Chrome', '1.0.0'],
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
        lastSeen: new Date()
      });

      // Actualizar connection manager
      const connManager = getConnectionManager();
      if (connManager) {
        connManager.updateConnectionState(tenantId, false);
      }

      // Escuchar eventos de conexión
      sock.ev.on('connection.update', async (update) => {
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
          // Cargar Baileys para obtener DisconnectReason
          const { DisconnectReason } = await loadBaileys();
          
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

          // Actualizar estado solo si aún existe
          const state = this.sessionStates.get(tenantId);
          if (state) {
            state.connected = false;
            this.sessionStates.set(tenantId, state);
          }
          this.emit('disconnected', tenantId);

        } else if (connection === 'open') {
          logger.info(`[${tenantId}] Conexión establecida exitosamente`);

          // Obtener información del número
          const socket = this.sessions.get(tenantId);
          let phoneNumber = null;
          
          if (socket?.user?.id) {
            phoneNumber = socket.user.id.split(':')[0] || null;
            logger.info(`[${tenantId}] Número de teléfono: ${phoneNumber}`);
          } else {
            logger.warn(`[${tenantId}] Socket o user info no disponible aún, será actualizado después`);
          }

          // Actualizar estado solo si existe
          const state = this.sessionStates.get(tenantId);
          if (state) {
            state.connected = true;
            state.qr = null;
            state.lastSeen = new Date();
            state.phoneNumber = phoneNumber;
            this.sessionStates.set(tenantId, state);
          }

          // Actualizar estado en connection-manager
          const connManager = getConnectionManager();
          if (connManager) {
            connManager.updateConnectionState(tenantId, true);
          }

          this.emit('connected', tenantId, phoneNumber);
        }
      });

      // Guardar credenciales cuando se actualicen
      socket.ev.on('creds.update', async () => {
        logger.info(`[${tenantId}] Credenciales actualizadas, guardando...`);
        await saveCreds();
        this.emit('creds-updated', tenantId);
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
      // Cargar Baileys para obtener DisconnectReason
      const { DisconnectReason } = await loadBaileys();
      
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

      // Actualizar estado solo si aún existe
      const state = this.sessionStates.get(tenantId);
      if (state) {
        state.connected = false;
        this.sessionStates.set(tenantId, state);
      }
      this.emit('disconnected', tenantId);

    } else if (connection === 'open') {
      logger.info(`[${tenantId}] Conexión establecida exitosamente`);

      // Obtener información del número
      const socket = this.sessions.get(tenantId);
      let phoneNumber = null;
      
      if (socket?.user?.id) {
        phoneNumber = socket.user.id.split(':')[0] || null;
        logger.info(`[${tenantId}] Número de teléfono: ${phoneNumber}`);
      } else {
        logger.warn(`[${tenantId}] Socket o user info no disponible aún, será actualizado después`);
      }

      // Actualizar estado solo si existe
      const state = this.sessionStates.get(tenantId);
      if (state) {
        state.connected = true;
        state.qr = null;
        state.lastSeen = new Date();
        state.phoneNumber = phoneNumber;
        this.sessionStates.set(tenantId, state);
      }

      // Actualizar estado en connection-manager
      const connManager = getConnectionManager();
      if (connManager) {
        connManager.updateConnectionState(tenantId, true);
      }

      this.emit('connected', tenantId, phoneNumber);
    }
  }

  /**
   * Maneja mensajes entrantes
   * @private
   */
  async handleIncomingMessages(tenantId, messages, type) {
    console.log(`🔍 [DEBUG] handleIncomingMessages llamado para tenant ${tenantId}, type: ${type}, mensajes: ${messages.length}`);
    
    for (const message of messages) {
      // 🛡️ FILTRO: Ignorar estados/historias de WhatsApp
      if (message.key.remoteJid === 'status@broadcast') {
        console.log(`🔍 [DEBUG] Estado/Historia de WhatsApp ignorado (status@broadcast)`);
        logger.info(`[${tenantId}] Estado/Historia de WhatsApp ignorado - no se procesará`);
        continue; // Saltar este mensaje
      }
      
      if (type === 'notify') {
        console.log(`🔍 [DEBUG] Mensaje tipo notify de ${message.key.remoteJid}`);
        logger.info(`[${tenantId}] Mensaje recibido de ${message.key.remoteJid}`);
        
        console.log(`🔍 [DEBUG] Emitiendo evento 'message' para tenant ${tenantId}`);
        this.emit('message', tenantId, message);
        console.log(`🔍 [DEBUG] Evento 'message' emitido`);
      } else {
        console.log(`🔍 [DEBUG] Mensaje ignorado, type: ${type}`);
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
