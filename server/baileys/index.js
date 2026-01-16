/**
 * Baileys Main Module
 * Punto de entrada principal para la integración de Baileys
 */

const sessionManager = require('./session-manager');
const authHandler = require('./auth-handler');
const messageAdapter = require('./message-adapter');
const eventHandlers = require('./event-handlers');
const antiBanService = require('./anti-ban');
const storage = require('./storage');
const pino = require('pino');

const logger = pino({ level: 'info' });

class BaileysService {
  initialized = false;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Configura listeners globales de eventos
   * @private
   */
  setupEventListeners() {
    // Conectar session-manager con event-handlers
    sessionManager.on('message', (tenantId, message) => {
      eventHandlers.handleIncomingMessage(tenantId, message);
    });

    sessionManager.on('connected', async (tenantId, phoneNumber) => {
      await eventHandlers.handleConnectionChange(tenantId, 'open', { phoneNumber });
      
      // Inicializar anti-ban para este tenant
      antiBanService.initTenant(tenantId, {
        isNewNumber: false // Determinar según datos reales
      });
    });

    sessionManager.on('disconnected', async (tenantId) => {
      await eventHandlers.handleConnectionChange(tenantId, 'close');
    });

    logger.info('Baileys event listeners configurados');
  }

  /**
   * Inicializa una sesión de WhatsApp para un tenant
   * @param {string} tenantId - ID del tenant
   * @param {object} options - Opciones adicionales
   * @returns {Promise<object>}
   */
  async initializeSession(tenantId, options = {}) {
    try {
      logger.info(`[${tenantId}] Inicializando sesión Baileys...`);

      // Verificar si ya existe sesión guardada
      const hasSessionData = await storage.hasSessionData(tenantId);

      if (hasSessionData && !options.forceNew) {
        // Reconectar con credenciales existentes
        logger.info(`[${tenantId}] Credenciales encontradas, reconectando...`);
        const success = await authHandler.reconnect(tenantId);
        
        if (success) {
          return {
            success: true,
            method: 'reconnect',
            message: 'Reconectado con credenciales existentes'
          };
        }
      }

      // Generar nuevo QR
      logger.info(`[${tenantId}] Generando nuevo QR...`);
      const qrData = await authHandler.generateQR(tenantId);

      return {
        success: true,
        method: 'qr',
        qrCode: qrData.qrCode,
        expiresAt: qrData.expiresAt,
        message: 'QR generado, escanear con WhatsApp'
      };

    } catch (error) {
      logger.error(`[${tenantId}] Error inicializando sesión:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envía un mensaje con protección anti-ban
   * @param {string} tenantId - ID del tenant
   * @param {string} to - Número destino
   * @param {object} message - Mensaje a enviar
   * @returns {Promise<object>}
   */
  async sendMessage(tenantId, to, message) {
    try {
      // Verificar si se puede enviar
      const check = antiBanService.canSendMessage(tenantId, to, message.text || '');
      
      if (!check.allowed) {
        logger.warn(`[${tenantId}] Mensaje bloqueado: ${check.reason}`);
        return {
          success: false,
          reason: check.reason,
          waitTime: check.waitTime,
          blocked: true
        };
      }

      // Aplicar delay anti-ban
      await antiBanService.applyDelay(tenantId);

      // Enviar mensaje
      const result = await messageAdapter.sendMessage(tenantId, to, message);

      // Registrar envío
      if (result.success) {
        antiBanService.recordMessageSent(tenantId, to, message.text || '');
      }

      return result;

    } catch (error) {
      logger.error(`[${tenantId}] Error enviando mensaje:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica si un tenant está conectado
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<boolean>}
   */
  async isConnected(tenantId) {
    try {
      return sessionManager.isConnected(tenantId);
    } catch (error) {
      logger.error(`[${tenantId}] Error verificando conexión:`, error);
      return false;
    }
  }

  /**
   * Obtiene el estado de conexión de un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<object>}
   */
  async getStatus(tenantId) {
    try {
      const connected = await this.isConnected(tenantId);
      const config = await storage.getWhatsAppConfig(tenantId);

      return {
        connected,
        phoneNumber: config?.baileys?.phoneNumber || null,
        lastSeen: config?.baileys?.lastSeen || null,
        messageCount: config?.baileys?.messageCount || 0
      };
    } catch (error) {
      logger.error(`[${tenantId}] Error obteniendo estado:`, error);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Obtiene estadísticas anti-ban de un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {object}
   */
  getAntiBanStats(tenantId) {
    return antiBanService.getUsageStats(tenantId);
  }

  /**
   * Desconecta un tenant
   * @param {string} tenantId - ID del tenant
   */
  async disconnect(tenantId) {
    try {
      await sessionManager.disconnect(tenantId);
      antiBanService.cleanup(tenantId);
      return { success: true };
    } catch (error) {
      logger.error(`[${tenantId}] Error desconectando:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cierra sesión permanentemente (elimina credenciales)
   * @param {string} tenantId - ID del tenant
   */
  async logout(tenantId) {
    try {
      await authHandler.logout(tenantId);
      antiBanService.cleanup(tenantId);
      eventHandlers.removeCallbacks(tenantId);
      return { success: true };
    } catch (error) {
      logger.error(`[${tenantId}] Error en logout:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene lista de sesiones activas
   * @returns {Array<string>}
   */
  getActiveSessions() {
    return sessionManager.getActiveSessions();
  }

  /**
   * Obtiene estadísticas generales
   * @returns {object}
   */
  getGlobalStats() {
    const sessions = sessionManager.getSessionStats();
    return {
      totalSessions: sessions.length,
      connectedSessions: sessions.filter(s => s.connected).length,
      sessions
    };
  }

  /**
   * Obtiene el sessionManager (para suscribirse a eventos)
   * @returns {SessionManager}
   */
  getSessionManager() {
    return sessionManager;
  }
}

// Singleton instance
const baileysService = new BaileysService();

module.exports = baileysService;
