/**
 * Baileys Session Manager
 * Maneja la inicialización, conexión y gestión de sesiones de WhatsApp usando Baileys
 */

const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('node:path');
const fs = require('node:fs').promises;
const EventEmitter = require('node:events');
const proxyManager = require('./proxy-manager'); // 🌐 Importar Proxy Manager
const tunnelManager = require('../tunnel-manager'); // 🔧 Importar Tunnel Manager

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

/**
 * Crear un proxy de fetch que usa el túnel del navegador si está disponible
 * @param {string} tenantId - ID del tenant
 * @param {Function} originalFetch - Función fetch original
 * @returns {Function} Función fetch con soporte de túnel
 */
function createTunnelProxyFetch(tenantId, originalFetch) {
  return async function(url, options = {}) {
    // Log de debug: fetchAgent está siendo llamado
    logger.info(`[${tenantId}] 🔍 fetchAgent llamado para: ${url.toString().substring(0, 80)}`);
    
    // Verificar si hay túnel activo
    const hasTunnel = tunnelManager.hasTunnel(tenantId);
    
    if (!hasTunnel) {
      // Sin túnel: usar fetch normal (Railway)
      logger.info(`[${tenantId}] 📡 Request directo Railway (sin túnel activo)`);
      return originalFetch(url, options);
    }

    try {
      // Con túnel: enviar request a través del navegador
      logger.info(`[${tenantId}] 🌐 Request VIA TÚNEL - IP del restaurante será usada`);
      
      const response = await tunnelManager.proxyRequest(tenantId, {
        url: url.toString(),
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body
      });

      // Convertir respuesta del túnel a formato fetch Response compatible
      const headers = new Map(Object.entries(response.headers || {}));
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText || 'OK',
        headers: headers,
        
        // Métodos para leer el body
        text: async () => response.body || '',
        
        json: async () => {
          try {
            return JSON.parse(response.body || '{}');
          } catch (error) {
            logger.error(`[${tenantId}] Error parsing JSON response:`, error);
            return {};
          }
        },
        
        arrayBuffer: async () => {
          if (typeof response.body === 'string') {
            const buffer = Buffer.from(response.body, 'utf-8');
            return buffer.buffer;
          } else if (Buffer.isBuffer(response.body)) {
            return response.body.buffer;
          } else {
            return new ArrayBuffer(0);
          }
        },
        
        blob: async () => {
          const text = response.body || '';
          return new Blob([text], { type: headers.get('content-type') || 'text/plain' });
        },
        
        // Para compatibilidad con Baileys
        get url() {
          return url.toString();
        },
        
        get redirected() {
          return false;
        },
        
        get type() {
          return 'basic';
        },
        
        clone: function() {
          return { ...this };
        }
      };

    } catch (error) {
      // Error en túnel: fallback automático a Railway
      logger.warn(`[${tenantId}] ⚠️ Error en túnel, fallback a Railway:`, error.message);
      return originalFetch(url, options);
    }
  };
}

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map(); // tenantId -> socket
    this.sessionStates = new Map(); // tenantId -> connection state
    this.originalFetchByTenant = new Map(); // tenantId -> original fetch function
    
    // 🔧 Escuchar eventos del túnel
    this.setupTunnelListeners();
  }

  /**
   * Configurar listeners para eventos del túnel
   */
  setupTunnelListeners() {
    // Cuando un túnel se conecta
    tunnelManager.on('tunnel:connected', ({ tenantId }) => {
      logger.info(`[${tenantId}] 🔧 Túnel conectado - requests usarán IP del restaurante`);
      
      // Si hay sesión activa, actualizar para usar túnel
      if (this.sessions.has(tenantId)) {
        this.updateSessionWithTunnel(tenantId);
      }
    });

    // Cuando un túnel se desconecta
    tunnelManager.on('tunnel:disconnected', ({ tenantId, reason }) => {
      logger.warn(`[${tenantId}] ⚠️ Túnel desconectado: ${reason}`);
      logger.info(`[${tenantId}] 🔄 Fallback a Railway - Sesión WhatsApp persiste`);
      
      // NO hacer nada con la sesión de Baileys
      // El fetch proxy automáticamente usará Railway
      // La sesión NO se desconecta
    });

    // Cuando un túnel no está saludable
    tunnelManager.on('tunnel:unhealthy', ({ tenantId }) => {
      logger.warn(`[${tenantId}] ⚠️ Túnel no saludable - puede haber latencia`);
    });
  }

  /**
   * Actualizar sesión para usar túnel (re-crear proxy fetch si es necesario)
   */
  updateSessionWithTunnel(tenantId) {
    const socket = this.sessions.get(tenantId);
    if (!socket) {
      return;
    }

    // Crear nuevo fetch proxy con túnel
    const tunnelProxyFetch = createTunnelProxyFetch(tenantId, global.fetch || fetch);
    
    // Actualizar fetchAgent en el socket
    if (socket.fetchAgent) {
      socket.fetchAgent.fetch = tunnelProxyFetch;
      logger.info(`[${tenantId}] ✅ Túnel actualizado en sesión activa, próximos requests lo usarán`);
    } else {
      // Si no existe fetchAgent, crearlo
      socket.fetchAgent = {
        fetch: tunnelProxyFetch
      };
      logger.info(`[${tenantId}] ✅ FetchAgent creado con túnel para sesión activa`);
    }
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

      // 🌐 ESTRATEGIA ANTI-BAN - SISTEMA CONFIGURABLE
      // ================================================
      // Hay 3 modos de operación:
      // 1. TUNNEL: Usa el navegador del restaurante como proxy (IP real del local)
      // 2. PROXY: Usa Bright Data (IPs residenciales/ISP pagadas)
      // 3. DIRECT: Sin protección (IP de Railway - RIESGO DE BAN)
      //
      // Configurar via variable de entorno ANTI_BAN_MODE:
      // - 'tunnel' (default): Sistema de túnel por navegador (GRATIS)
      // - 'proxy': Sistema Bright Data (PAGO ~$0.21-0.42/restaurante)
      // - 'direct': Sin protección (NO RECOMENDADO)
      
      const ANTI_BAN_MODE = process.env.ANTI_BAN_MODE || 'tunnel';
      const TUNNEL_ENABLED = ANTI_BAN_MODE === 'tunnel';
      const PROXY_ENABLED = ANTI_BAN_MODE === 'proxy';
      const PROXY_TYPE = process.env.PROXY_TYPE || 'isp';
      const USE_HYBRID_PROXY = true; // Siempre híbrido por ahora
      
      logger.info(`[${tenantId}] 🛡️ Modo Anti-Ban: ${ANTI_BAN_MODE.toUpperCase()}`);
      
      let proxyAgent = null;
      let useHybridMode = false;
      let tunnelProxyFetch = null;
      
      // 🔧 MODO TÚNEL: Usar navegador del restaurante
      if (TUNNEL_ENABLED) {
        tunnelProxyFetch = createTunnelProxyFetch(tenantId, global.fetch || fetch);
        logger.info(`[${tenantId}] 🔧 Sistema de TÚNEL activado - requests vía navegador del restaurante`);
      }
      // 🌐 MODO PROXY: Usar Bright Data desde el inicio (IP única por restaurante)
      else if (PROXY_ENABLED) {
        // Obtener proxy agent AHORA para WebSocket
        proxyAgent = proxyManager.getProxyAgent(tenantId);
        
        if (proxyAgent) {
          logger.info(`[${tenantId}] 🌐 Proxy ${PROXY_TYPE.toUpperCase()}: IP única desde el inicio`);
          logger.info(`[${tenantId}] 📍 WhatsApp verá IP residencial de Bright Data`);
          logger.info(`[${tenantId}] 🔐 WebSocket + HTTP usarán proxy`);
        } else {
          logger.warn(`[${tenantId}] ⚠️ No se pudo obtener proxy agent`);
        }
      }
      // ⚠️ MODO DIRECTO: Sin protección
      else {
        logger.warn(`[${tenantId}] ⚠️ MODO DIRECTO - Sin protección anti-ban (IP de Railway)`);
      }

      // Configurar socket de Baileys con timeouts aumentados para proxy
      const socketConfig = {
        auth: state,
        printQRInTerminal: options.printQR || false,
        logger: pino({ level: 'silent' }), // Silenciar logs internos de Baileys
        browser: ['KDS', 'Chrome', '1.0.0'],
        // ⏱️ Timeouts aumentados para proxy residencial (latencia mayor)
        connectTimeoutMs: PROXY_ENABLED ? 120000 : 60000,     // 2 min con proxy, 1 min sin proxy
        defaultQueryTimeoutMs: PROXY_ENABLED ? 90000 : 60000, // 1.5 min con proxy, 1 min sin proxy
        keepAliveIntervalMs: 30000,
        qrTimeout: PROXY_ENABLED ? 90000 : 60000,             // 1.5 min con proxy, 1 min sin proxy
        emitOwnEvents: true,
        getMessage: async (key) => {
          // Implementar recuperación de mensajes si es necesario
          return { conversation: '' };
        }
      };
      
      if (PROXY_ENABLED) {
        logger.info(`[${tenantId}] ⏱️ Timeouts aumentados para proxy residencial:`);
        logger.info(`[${tenantId}]    - Connect: 120s, Query: 90s, QR: 90s`);
      }

      // 🔧 CONFIGURAR FETCH AGENT SEGÚN MODO ANTI-BAN
      if (TUNNEL_ENABLED && tunnelProxyFetch) {
        // Baileys usa fetchAgent para todos los HTTP requests a WhatsApp
        socketConfig.fetchAgent = { fetch: tunnelProxyFetch };
        logger.info(`[${tenantId}] 🔧 FetchAgent configurado con sistema de TÚNEL`);
      }
      // 🌐 MODO PROXY: Para bots de SOLO TEXTO, NO necesitamos proxy en HTTP
      // Los mensajes de texto van por WebSocket (no HTTP)
      // Solo imágenes/videos/audios usan HTTP requests
      else if (PROXY_ENABLED) {
        logger.info(`[${tenantId}] 📝 Bot de SOLO TEXTO - FetchAgent directo (sin proxy HTTP)`);
        // NO configurar fetchAgent con proxy - usar directo
      }

      // 🌐 Agregar agente proxy para WebSocket si está disponible (solo modo no-híbrido)
      if (proxyAgent) {
        socketConfig.agent = proxyAgent;
        logger.info(`[${tenantId}] 🌐 WebSocket Agent configurado con sistema de PROXY`);
      }

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
          logger.info(`[${tenantId}] 🎉 Conexión establecida exitosamente`);

          // ⚠️ NOTA: NO aplicar proxy post-conexión
          // El WebSocket ya está establecido, cambiar el agent no funciona correctamente
          // Para bots de SOLO TEXTO, no se necesita proxy en HTTP requests
          
          if (PROXY_ENABLED) {
            logger.info(`[${tenantId}] 🛡️ Sistema Anti-Ban: ${PROXY_TYPE.toUpperCase()} Proxy configurado`);
            logger.info(`[${tenantId}] 📝 WebSocket: Directo (Railway)`);
            logger.info(`[${tenantId}] 📨 Mensajes: Sin multimedia - No requiere proxy HTTP`);
          }

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
        
        // 🌐 Liberar proxy asignado (Anti-Ban)
        proxyManager.releaseProxy(tenantId);
        
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
        
        // 🌐 Liberar proxy asignado (Anti-Ban)
        proxyManager.releaseProxy(tenantId);
        
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
        lastSeen: state.lastSeen,
        hasTunnel: tunnelManager.hasTunnel(tenantId),
        tunnelHealthy: tunnelManager.isTunnelHealthy(tenantId)
      });
    }
    return stats;
  }

  /**
   * Obtiene información del túnel para un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {object|null}
   */
  getTunnelInfo(tenantId) {
    if (!tunnelManager.hasTunnel(tenantId)) {
      return null;
    }

    return {
      active: true,
      healthy: tunnelManager.isTunnelHealthy(tenantId),
      stats: tunnelManager.getTunnelStats(tenantId)
    };
  }
}

// Singleton instance
const sessionManager = new SessionManager();

module.exports = sessionManager;
