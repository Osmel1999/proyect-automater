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

// =====================================================================
// 🔑 BufferJSON: Serialization for Baileys credentials
// Baileys creds contain Buffer/Uint8Array crypto keys that Firebase
// Realtime Database cannot store directly. This serializer converts
// them to { type: 'Buffer', data: '<base64>' } for safe storage.
// =====================================================================
const BufferJSON = {
  replacer: (k, value) => {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array || value?.type === 'Buffer') {
      return { type: 'Buffer', data: Buffer.from(value?.data || value).toString('base64') };
    }
    return value;
  },
  reviver: (_, value) => {
    if (typeof value === 'object' && value !== null && value.type === 'Buffer') {
      if (typeof value.data === 'string') {
        return Buffer.from(value.data, 'base64');
      }
      if (Array.isArray(value.data)) {
        return Buffer.from(value.data);
      }
      if (typeof value.data === 'object' && value.data !== null) {
        const keys = Object.keys(value.data);
        if (keys.length > 0 && keys.every(k => !isNaN(parseInt(k, 10)))) {
          return Buffer.from(Object.values(value.data));
        }
      }
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && value.type !== 'Buffer') {
      const keys = Object.keys(value);
      if (keys.length > 0 && keys.every(k => !isNaN(parseInt(k, 10)))) {
        const values = Object.values(value);
        if (values.every(v => typeof v === 'number')) {
          return Buffer.from(values);
        }
      }
    }
    return value;
  }
};

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

      // Si ya existe una sesión, desconectarla primero (SIN logout, preservar creds)
      if (this.sessions.has(tenantId)) {
        logger.info(`[${tenantId}] Cerrando sesión existente...`);
        try {
          const oldSocket = this.sessions.get(tenantId);
          if (oldSocket) {
            // Use .end() to close the WebSocket without invalidating the session
            oldSocket.end(undefined);
          }
        } catch (err) {
          logger.warn(`[${tenantId}] Error cerrando socket anterior: ${err.message}`);
        }
        this.sessions.delete(tenantId);
      }

      // Crear directorio de sesión si no existe
      const sessionDir = path.join(__dirname, '../../sessions', tenantId);
      await fs.mkdir(sessionDir, { recursive: true });

      // ✅ Cargar estado de autenticación: Firebase primero, luego archivos locales
      const storage = require('./storage');
      
      // PASO 1: Usar useMultiFileAuthState como base (Baileys lo requiere)
      const { state: localState, saveCreds: saveCredsLocal } = await useMultiFileAuthState(sessionDir);
      let state = localState;
      
      // PASO 2: Si hay credenciales en Firebase, sobreescribir las locales
      try {
        logger.info(`[${tenantId}] 🔥 Verificando credenciales en Firebase...`);
        const firebaseSession = await storage.loadSessionFromFirebase(tenantId);
        
        if (firebaseSession?.creds && 
            typeof firebaseSession.creds === 'object' && 
            Object.keys(firebaseSession.creds).length > 0) {
          // 🔑 loadSessionFromFirebase already deserializes via BufferJSON.reviver
          state.creds = firebaseSession.creds;
          logger.info(`[${tenantId}] ✅ Credenciales cargadas desde Firebase (deserialized, ${Object.keys(firebaseSession.creds).length} props)`);
        } else {
          logger.info(`[${tenantId}] 🆕 No hay credenciales en Firebase - se generará QR`);
        }
      } catch (fbError) {
        logger.warn(`[${tenantId}] ⚠️ Error cargando desde Firebase: ${fbError.message}`);
      }
      
      // PASO 3: saveCreds SIEMPRE guarda en Firebase + archivos locales
      // 🔑 Serialize Buffers (crypto keys, noise keys etc.) before saving to Firebase.
      // Firebase RTDB cannot store raw Buffer objects — it silently corrupts them.
      const saveCreds = async () => {
        try {
          // 1. Guardar localmente (para Baileys) — uses BufferJSON internally
          await saveCredsLocal();
          
          // 2. Guardar en Firebase Realtime Database (dentro del tenant)
          if (state.creds && typeof state.creds === 'object' && Object.keys(state.creds).length > 0) {
            const firebaseService = require('../firebase-service');
            if (firebaseService?.database) {
              // 🔑 CRITICAL: Serialize Buffers to { type:'Buffer', data:'<base64>' }
              const serializedCreds = JSON.parse(JSON.stringify(state.creds, BufferJSON.replacer));
              
              await firebaseService.database
                .ref(`tenants/${tenantId}/baileys_session`)
                .update({
                  creds: serializedCreds,
                  updatedAt: new Date().toISOString(),
                  savedAt: Date.now()
                });
              
              // Marcar como conectado
              await firebaseService.database.ref(`tenants/${tenantId}/restaurant/whatsappConnected`).set(true);
              await firebaseService.database.ref(`tenants/${tenantId}/restaurant/connectedAt`).set(new Date().toISOString());
              
              logger.info(`[${tenantId}] ✅ Credenciales guardadas en Firebase (serialized) - ${Object.keys(state.creds).length} props`);
            } else {
              logger.warn(`[${tenantId}] ⚠️ Firebase no disponible, solo se guardó localmente`);
            }
          } else {
            logger.warn(`[${tenantId}] ⚠️ Creds vacío, no se guarda en Firebase`);
          }
        } catch (error) {
          logger.error(`[${tenantId}] ❌ Error guardando credenciales:`, error.message);
        }
      };

      // Configurar socket de Baileys
      const socketConfig = {
        auth: state,
        printQRInTerminal: options.printQR || false,
        logger: pino({ level: 'silent' }), // Silenciar logs internos de Baileys
        browser: ['KDS', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        emitOwnEvents: true,
        getMessage: async (key) => {
          // Implementar recuperación de mensajes si es necesario
          return { conversation: '' };
        }
      };

      const socket = makeWASocket(socketConfig);

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
      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Actualizar estado con QR
        if (qr) {
          logger.info(`[${tenantId}] QR Code generado`);
          const currentState = this.sessionStates.get(tenantId);
          if (currentState) {
            currentState.qr = qr;
            this.sessionStates.set(tenantId, currentState);
          }
          this.emit('qr', tenantId, qr);
        }

        // Manejar cambios de conexión
        if (connection === 'close') {
          // Cargar Baileys para obtener DisconnectReason
          const { DisconnectReason } = await loadBaileys();
          
          const statusCode = (lastDisconnect?.error instanceof Boom)
            ? lastDisconnect.error.output.statusCode
            : 500;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          logger.info(`[${tenantId}] Conexión cerrada (code=${statusCode}). Reconectar: ${shouldReconnect}`);

          if (shouldReconnect) {
            // Exponential backoff: track attempts per tenant
            const attempts = (this._reconnectAttempts?.get(tenantId) || 0) + 1;
            if (!this._reconnectAttempts) this._reconnectAttempts = new Map();
            this._reconnectAttempts.set(tenantId, attempts);

            if (attempts > 10) {
              logger.error(`[${tenantId}] ❌ Demasiados intentos de reconexión (${attempts}), deteniendo. Se necesita nuevo QR.`);
              this.sessionStates.set(tenantId, { connected: false, qr: null, reconnectFailed: true });
              this.emit('disconnected', tenantId);
              return;
            }

            // Backoff: 3s, 5s, 8s, 13s, 20s, 30s, 30s, ...
            const delay = Math.min(3000 * Math.pow(1.5, attempts - 1), 30000);
            logger.info(`[${tenantId}] Intentando reconectar en ${Math.round(delay/1000)}s (intento ${attempts}/10)...`);
            setTimeout(() => {
              this.initSession(tenantId);
            }, delay);
          } else {
            logger.info(`[${tenantId}] Sesión cerrada permanentemente (logout)`);
            await this.closeSession(tenantId);
            this.emit('logged-out', tenantId);
          }

          // Actualizar estado solo si aún existe
          const currentState = this.sessionStates.get(tenantId);
          if (currentState) {
            currentState.connected = false;
            this.sessionStates.set(tenantId, currentState);
          }
          this.emit('disconnected', tenantId);

        } else if (connection === 'open') {
          logger.info(`[${tenantId}] 🎉 Conexión establecida exitosamente`);

          // Reset reconnect attempts on successful connection
          if (this._reconnectAttempts) this._reconnectAttempts.delete(tenantId);

          // Obtener información del número
          const currentSocket = this.sessions.get(tenantId);
          let phoneNumber = null;
          
          if (currentSocket?.user?.id) {
            phoneNumber = currentSocket.user.id.split(':')[0] || null;
            logger.info(`[${tenantId}] Número de teléfono: ${phoneNumber}`);
          } else {
            logger.warn(`[${tenantId}] Socket o user info no disponible aún, será actualizado después`);
          }

          // Actualizar estado solo si existe
          const currentState = this.sessionStates.get(tenantId);
          if (currentState) {
            currentState.connected = true;
            currentState.qr = null;
            currentState.lastSeen = new Date();
            currentState.phoneNumber = phoneNumber;
            currentState.reconnectFailed = false;
            this.sessionStates.set(tenantId, currentState);
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
      // 🛡️ FILTRO 1: Ignorar estados/historias de WhatsApp
      if (message.key.remoteJid === 'status@broadcast') {
        console.log(`🔍 [DEBUG] Estado/Historia de WhatsApp ignorado (status@broadcast)`);
        logger.info(`[${tenantId}] Estado/Historia de WhatsApp ignorado - no se procesará`);
        continue; // Saltar este mensaje
      }
      
      // 🛡️ FILTRO 2: Ignorar mensajes enviados por el bot mismo (ANTI-LOOP)
      if (message.key.fromMe === true) {
        console.log(`🔄 [ANTI-LOOP] Mensaje propio ignorado - fromMe=true, messageId=${message.key.id}`);
        logger.info(`[${tenantId}] Mensaje propio ignorado (fromMe=true) - no se procesará`);
        continue; // Saltar este mensaje
      }
      
      if (type === 'notify') {
        console.log(`✅ [DEBUG] Mensaje tipo notify de ${message.key.remoteJid}, fromMe=${message.key.fromMe}`);
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
        
        // 🔥 FIX: Limpiar estado de conexión para forzar nuevo QR
        this.sessionStates.delete(tenantId);
        
        logger.info(`[${tenantId}] Sesión desconectada (credenciales preservadas, estado limpiado)`);
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