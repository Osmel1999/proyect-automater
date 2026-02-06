/**
 * Connection Manager
 * Maneja auto-reconexión de sesiones de Baileys cuando Railway despierta
 */

const pino = require('pino');
const storage = require('./storage');
// Circular dependency fix: load session-manager lazily
// const sessionManager = require('./session-manager'); 

const logger = pino({ level: 'info' });

// Helper to get sessionManager instance lazily
function getSessionManager() {
  return require('./session-manager');
}

class ConnectionManager {
  constructor() {
    // Track de intentos de reconexión por tenant
    this.reconnectAttempts = new Map(); // tenantId -> { count, lastAttempt }
    this.connectionStates = new Map(); // tenantId -> boolean
    this.maxReconnectAttempts = 3;
    this.reconnectCooldown = 30000; // 30 segundos entre intentos
  }

  /**
   * Actualiza el estado de conexión de un tenant
   * @param {string} tenantId - ID del tenant
   * @param {boolean} connected - Estado de conexión
   */
  updateConnectionState(tenantId, connected) {
    this.connectionStates.set(tenantId, connected);
    logger.debug(`[${tenantId}] Estado de conexión actualizado: ${connected ? 'conectado' : 'desconectado'}`);
  }

  /**
   * Verifica si un tenant está conectado
   * @param {string} tenantId - ID del tenant
   * @returns {boolean}
   */
  isConnected(tenantId) {
    // Primero verificar el estado local
    const localState = this.connectionStates.get(tenantId);
    if (localState !== undefined) {
      return localState;
    }

    // Si no hay estado local, verificar session-manager
    const sessionManager = getSessionManager();
    const session = sessionManager.getSession(tenantId);
    const connected = session !== null && session !== undefined;
    
    // Actualizar estado local
    this.connectionStates.set(tenantId, connected);
    
    return connected;
  }

  /**
   * Asegura que un tenant esté conectado, reconectando si es necesario
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<boolean>} true si está conectado o se reconectó exitosamente
   */
  async ensureConnected(tenantId) {
    logger.info(`[${tenantId}] 🔍 Verificando conexión...`);

    // 1. Verificar si ya está conectado
    if (this.isConnected(tenantId)) {
      logger.info(`[${tenantId}] ✅ Ya está conectado`);
      return true;
    }

    logger.warn(`[${tenantId}] ⚠️ No está conectado, intentando reconexión automática...`);

    // 2. Verificar cooldown y límite de intentos
    if (!this.canRetryReconnect(tenantId)) {
      logger.error(`[${tenantId}] ❌ Demasiados intentos de reconexión, esperando cooldown`);
      return false;
    }

    // 3. Intentar cargar credenciales
    const credentials = await storage.loadSessionFromFirebase(tenantId);

    if (!credentials || !credentials.creds) {
      logger.error(`[${tenantId}] ❌ No hay credenciales guardadas - necesita escanear QR`);
      await this.markReconnectNeeded(tenantId);
      return false;
    }

    // 4. Intentar reconectar con credenciales
    try {
      logger.info(`[${tenantId}] 🔄 Reconectando con credenciales guardadas...`);
      const success = await this.reconnectWithCredentials(tenantId, credentials);

      if (success) {
        logger.info(`[${tenantId}] ✅ Reconexión exitosa!`);
        this.resetReconnectAttempts(tenantId);
        return true;
      } else {
        logger.error(`[${tenantId}] ❌ Falló la reconexión`);
        this.recordReconnectAttempt(tenantId);
        return false;
      }
    } catch (error) {
      logger.error(`[${tenantId}] ❌ Error en reconexión:`, error);
      this.recordReconnectAttempt(tenantId);
      return false;
    }
  }

  /**
   * Reconecta usando credenciales guardadas
   * @param {string} tenantId - ID del tenant
   * @param {object} credentials - Credenciales de Baileys
   * @returns {Promise<boolean>}
   */
  async reconnectWithCredentials(tenantId, credentials) {
    try {
      logger.info(`[${tenantId}] 🔄 Iniciando reconexión con credenciales...`);
      
      // Usar sessionManager para reconectar
      await getSessionManager().initSession(tenantId);
      
      // Esperar un momento para que se conecte
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verificar si se conectó
      const connected = this.isConnected(tenantId);
      
      if (connected) {
        logger.info(`[${tenantId}] ✅ Reconexión exitosa`);
        await this.clearReconnectNeeded(tenantId);
        return true;
      } else {
        logger.warn(`[${tenantId}] ⚠️ Reconexión iniciada, esperando confirmación...`);
        return false;
      }
    } catch (error) {
      logger.error(`[${tenantId}] ❌ Error reconectando:`, error);
      return false;
    }
  }

  /**
   * Verifica si se puede intentar reconectar (cooldown y límite)
   * @param {string} tenantId - ID del tenant
   * @returns {boolean}
   */
  canRetryReconnect(tenantId) {
    const attempts = this.reconnectAttempts.get(tenantId);

    if (!attempts) {
      return true; // Primera vez
    }

    // Verificar si está en cooldown
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    if (timeSinceLastAttempt < this.reconnectCooldown) {
      const remainingTime = Math.ceil((this.reconnectCooldown - timeSinceLastAttempt) / 1000);
      logger.warn(`[${tenantId}] En cooldown, esperar ${remainingTime}s`);
      return false;
    }

    // Verificar límite de intentos
    if (attempts.count >= this.maxReconnectAttempts) {
      logger.warn(`[${tenantId}] Límite de intentos alcanzado (${this.maxReconnectAttempts})`);
      
      // Reset después de 5 minutos
      if (timeSinceLastAttempt > 300000) {
        logger.info(`[${tenantId}] Reseteando contador después de 5 minutos`);
        this.resetReconnectAttempts(tenantId);
        return true;
      }
      
      return false;
    }

    return true;
  }

  /**
   * Registra un intento de reconexión
   * @param {string} tenantId - ID del tenant
   */
  recordReconnectAttempt(tenantId) {
    const current = this.reconnectAttempts.get(tenantId) || { count: 0, lastAttempt: 0 };
    
    this.reconnectAttempts.set(tenantId, {
      count: current.count + 1,
      lastAttempt: Date.now()
    });

    logger.info(`[${tenantId}] Intentos de reconexión: ${current.count + 1}/${this.maxReconnectAttempts}`);
  }

  /**
   * Resetea el contador de intentos
   * @param {string} tenantId - ID del tenant
   */
  resetReconnectAttempts(tenantId) {
    this.reconnectAttempts.delete(tenantId);
    logger.debug(`[${tenantId}] Contador de intentos reseteado`);
  }

  /**
   * Marca que un tenant necesita reconexión manual
   * @param {string} tenantId - ID del tenant
   */
  async markReconnectNeeded(tenantId) {
    try {
      const firebaseService = require('../firebase-service');
      
      // Guardar en Realtime Database
      await firebaseService.database.ref(`tenants/${tenantId}/restaurant`)
        .update({
          whatsappConnected: false,
          reconnectNeeded: true,
          reconnectNeededAt: new Date().toISOString()
        });

      // Guardar notificación
      await firebaseService.database.ref(`tenants/${tenantId}/notifications`)
        .push({
          type: 'reconnect_needed',
          message: 'WhatsApp desconectado. Por favor escanea el QR para reconectar.',
          priority: 'high',
          read: false,
          createdAt: new Date().toISOString()
        });

      logger.info(`[${tenantId}] 📢 Notificación de reconexión creada`);
    } catch (error) {
      logger.error(`[${tenantId}] Error marcando reconexión:`, error);
    }
  }

  /**
   * Limpia el flag de reconexión necesaria
   * @param {string} tenantId - ID del tenant
   */
  async clearReconnectNeeded(tenantId) {
    try {
      const firebaseService = require('../firebase-service');
      
      await firebaseService.database.ref(`tenants/${tenantId}/restaurant`)
        .update({
          reconnectNeeded: false,
          reconnectNeededAt: null
        });

      logger.info(`[${tenantId}] ✅ Flag de reconexión limpiado`);
    } catch (error) {
      logger.error(`[${tenantId}] Error limpiando flag:`, error);
    }
  }

  /**
   * Obtiene estadísticas de conexión
   * @param {string} tenantId - ID del tenant
   * @returns {object}
   */
  getConnectionStats(tenantId) {
    const attempts = this.reconnectAttempts.get(tenantId);
    
    return {
      connected: this.isConnected(tenantId),
      reconnectAttempts: attempts?.count || 0,
      lastAttempt: attempts?.lastAttempt || null,
      canRetry: this.canRetryReconnect(tenantId)
    };
  }
}

// Singleton instance
const connectionManager = new ConnectionManager();

// ====================================
// HEARTBEAT: Monitoreo de salud de sesiones
// ====================================

/**
 * Verifica periódicamente la salud de todas las sesiones activas
 * Detecta y reconecta sesiones caídas automáticamente
 */
function startSessionHealthMonitor() {
  const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutos
  const INITIAL_DELAY = 30 * 1000; // Esperar 30s después del startup antes del primer heartbeat

  logger.info('[Heartbeat] 💓 Monitor de salud de sesiones iniciado');
  logger.info(`[Heartbeat]    Intervalo: ${HEARTBEAT_INTERVAL / 1000}s`);
  logger.info(`[Heartbeat]    Delay inicial: ${INITIAL_DELAY / 1000}s`);

  setTimeout(() => {
    setInterval(async () => {
      const timestamp = new Date().toISOString();
      logger.info(`[${timestamp}] [Heartbeat] 🩺 Verificando salud de sesiones...`);

      try {
        const sessionManager = getSessionManager();
        
        // Safety check if sessionManager is not ready yet due to circular dependency or other issues
        if (!sessionManager || !sessionManager.sessions) {
           logger.warn('[Heartbeat] ⚠️ SessionManager not fully initialized yet.');
           return;
        }

        // Obtener todas las sesiones activas - PREFER activeSessions method
        let activeSessions = [];
        if (typeof sessionManager.getActiveSessions === 'function') {
            activeSessions = sessionManager.getActiveSessions();
        } else if (typeof sessionManager.getAllSessions === 'function') {
           activeSessions = sessionManager.getAllSessions();
        } else if (sessionManager.sessions) {
           activeSessions = Array.from(sessionManager.sessions.keys());
        }

        if (activeSessions.length === 0) {
          logger.debug('[Heartbeat] 📝 No hay sesiones activas que verificar');
          return;
        }

        logger.info(`[Heartbeat] 📊 Verificando ${activeSessions.length} sesiones...`);

        let healthyCount = 0;
        let unhealthyCount = 0;
        let reconnectedCount = 0;

        // Verificar cada sesión
        for (const tenantId of activeSessions) {
          try {
            const sock = sessionManager.getSession(tenantId);

            if (!sock) {
              logger.warn(`[Heartbeat] ⚠️ [${tenantId}] Sesión no encontrada en memory`);
              unhealthyCount++;
              continue;
            }

            // Verificar estado de conexión usando sessionStates (fuente de verdad)
            // sock.ws.readyState no es accesible en Baileys moderno
            const sessionState = sessionManager.sessionStates 
              ? sessionManager.sessionStates.get(tenantId)
              : null;
            const isHealthy = sessionState?.connected === true;
            
            // Verificación secundaria: sock.user existe si está autenticado
            const hasUser = !!sock.user;

            if (isHealthy && hasUser) {
              logger.debug(`[Heartbeat] ✅ [${tenantId}] Sesión saludable (connected + user.id: ${sock.user?.id})`);
              healthyCount++;
            } else if (isHealthy && !hasUser) {
              // Conectado pero sin user info todavía (puede pasar brevemente)
              logger.debug(`[Heartbeat] ⏳ [${tenantId}] Sesión conectada pero sin user info aún`);
              healthyCount++;
            } else {
              logger.warn(`[Heartbeat] ⚠️ [${tenantId}] Sesión no saludable (connected=${sessionState?.connected}, hasUser=${hasUser})`);
              unhealthyCount++;

              // Intentar reconectar
              logger.info(`[Heartbeat] 🔄 [${tenantId}] Intentando reconexión automática...`);

              try {
                const reconnected = await connectionManager.ensureConnected(tenantId);

                if (reconnected) {
                  logger.info(`[Heartbeat] ✅ [${tenantId}] Reconexión exitosa`);
                  reconnectedCount++;
                  healthyCount++;
                  unhealthyCount--;
                } else {
                  logger.error(`[Heartbeat] ❌ [${tenantId}] Falló reconexión`);
                }
              } catch (reconnectError) {
                logger.error(`[Heartbeat] ❌ [${tenantId}] Error en reconexión:`, reconnectError.message);
              }
            }
          } catch (error) {
            logger.error(`[Heartbeat] ❌ [${tenantId}] Error verificando sesión:`, error.message);
            unhealthyCount++;
          }
        }

        // Resumen del heartbeat
        logger.info('[Heartbeat] 📊 Resumen:');
        logger.info(`[Heartbeat]    ✅ Saludables: ${healthyCount}/${activeSessions.length}`);
        logger.info(`[Heartbeat]    ⚠️ No saludables: ${unhealthyCount}/${activeSessions.length}`);
        if (reconnectedCount > 0) {
          logger.info(`[Heartbeat]    🔄 Reconectadas: ${reconnectedCount}`);
        }

      } catch (error) {
        logger.error('[Heartbeat] ❌ Error en monitor de salud:', error);
        logger.error(error.stack);
      }
    }, HEARTBEAT_INTERVAL);

    logger.info('[Heartbeat] ⏰ Primer heartbeat programado');
  }, INITIAL_DELAY);
}

// Iniciar heartbeat automáticamente
startSessionHealthMonitor();

module.exports = connectionManager;
