/**
 * Baileys Auth Handler
 * Maneja la autenticación, generación de QR y gestión de credenciales
 */

const QRCode = require('qrcode');
const sessionManager = require('./session-manager');
const storage = require('./storage');
const pino = require('pino');

const logger = pino({ level: 'info' });

class AuthHandler {
  constructor() {
    this.qrTimeouts = new Map(); // tenantId -> timeout
    this.QR_EXPIRATION_TIME = 60000; // 60 segundos
  }

  /**
   * Genera un código QR para autenticación de un tenant
   * @param {string} tenantId - ID del tenant
   * @param {object} options - Opciones de generación
   * @returns {Promise<object>} { qrCode, expiresAt }
   */
  async generateQR(tenantId, options = {}) {
    try {
      logger.info(`[${tenantId}] Generando QR Code...`);

      // Limpiar timeout anterior si existe
      this.clearQRTimeout(tenantId);

      // Inicializar sesión (esto generará el QR)
      return new Promise((resolve, reject) => {
        // Escuchar evento de QR
        const onQR = async (tid, qr) => {
          if (tid === tenantId) {
            try {
              // Generar QR code como imagen base64
              const qrCodeDataURL = await QRCode.toDataURL(qr, {
                width: 300,
                margin: 2,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                }
              });

              const expiresAt = Date.now() + this.QR_EXPIRATION_TIME;

              logger.info(`[${tenantId}] QR Code generado exitosamente`);

              // Establecer timeout de expiración
              this.setQRTimeout(tenantId, expiresAt);

              // Remover listener
              sessionManager.off('qr', onQR);

              resolve({
                qrCode: qrCodeDataURL,
                qrRaw: qr,
                expiresAt,
                expiresIn: this.QR_EXPIRATION_TIME
              });
            } catch (error) {
              sessionManager.off('qr', onQR);
              reject(error);
            }
          }
        };

        // Escuchar evento de conexión exitosa
        const onConnected = async (tid, phoneNumber) => {
          if (tid === tenantId) {
            sessionManager.off('qr', onQR);
            sessionManager.off('connected', onConnected);
            this.clearQRTimeout(tenantId);
          }
        };

        sessionManager.on('qr', onQR);
        sessionManager.on('connected', onConnected);

        // Inicializar sesión
        sessionManager.initSession(tenantId, { printQR: false })
          .catch((error) => {
            sessionManager.off('qr', onQR);
            sessionManager.off('connected', onConnected);
            reject(error);
          });

        // Timeout de seguridad (90 segundos)
        setTimeout(() => {
          sessionManager.off('qr', onQR);
          sessionManager.off('connected', onConnected);
          reject(new Error('QR generation timeout'));
        }, 90000);
      });

    } catch (error) {
      logger.error(`[${tenantId}] Error al generar QR:`, error);
      throw error;
    }
  }

  /**
   * Verifica el estado de autenticación de un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<object>}
   */
  async checkAuthStatus(tenantId) {
    try {
      const sessionState = sessionManager.getSessionState(tenantId);
      const hasSession = sessionManager.hasSession(tenantId);

      // Verificar si hay credenciales guardadas
      const hasStoredCreds = await storage.hasSessionData(tenantId);

      return {
        connected: sessionState.connected,
        hasSession,
        hasStoredCredentials: hasStoredCreds,
        phoneNumber: sessionState.phoneNumber,
        lastSeen: sessionState.lastSeen,
        qrExpired: sessionState.qr && this.isQRExpired(tenantId)
      };

    } catch (error) {
      logger.error(`[${tenantId}] Error al verificar estado de autenticación:`, error);
      throw error;
    }
  }

  /**
   * Reconecta un tenant usando credenciales guardadas
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<boolean>}
   */
  async reconnect(tenantId) {
    try {
      logger.info(`[${tenantId}] Intentando reconectar con credenciales guardadas...`);

      // Verificar si hay credenciales guardadas
      const hasStoredCreds = await storage.hasSessionData(tenantId);
      
      if (!hasStoredCreds) {
        throw new Error('No stored credentials found');
      }

      // Inicializar sesión (usará credenciales guardadas)
      await sessionManager.initSession(tenantId);

      // Esperar hasta 30 segundos por la conexión
      return new Promise((resolve) => {
        const onConnected = (tid) => {
          if (tid === tenantId) {
            sessionManager.off('connected', onConnected);
            sessionManager.off('logged-out', onLoggedOut);
            logger.info(`[${tenantId}] Reconexión exitosa`);
            resolve(true);
          }
        };

        const onLoggedOut = (tid) => {
          if (tid === tenantId) {
            sessionManager.off('connected', onConnected);
            sessionManager.off('logged-out', onLoggedOut);
            logger.info(`[${tenantId}] Reconexión fallida - sesión cerrada`);
            resolve(false);
          }
        };

        sessionManager.on('connected', onConnected);
        sessionManager.on('logged-out', onLoggedOut);

        // Timeout de 30 segundos
        setTimeout(() => {
          sessionManager.off('connected', onConnected);
          sessionManager.off('logged-out', onLoggedOut);
          logger.warn(`[${tenantId}] Timeout al reconectar`);
          resolve(false);
        }, 30000);
      });

    } catch (error) {
      logger.error(`[${tenantId}] Error al reconectar:`, error);
      return false;
    }
  }

  /**
   * Cierra sesión (logout) de un tenant
   * @param {string} tenantId - ID del tenant
   */
  async logout(tenantId) {
    try {
      logger.info(`[${tenantId}] Cerrando sesión...`);

      // Cerrar sesión
      await sessionManager.closeSession(tenantId);

      // Eliminar credenciales guardadas
      await storage.deleteSessionData(tenantId);

      // Limpiar timeout de QR
      this.clearQRTimeout(tenantId);

      logger.info(`[${tenantId}] Logout exitoso`);
      return true;

    } catch (error) {
      logger.error(`[${tenantId}] Error al hacer logout:`, error);
      throw error;
    }
  }

  /**
   * Desconecta temporalmente un tenant (mantiene credenciales)
   * 🔥 ACTUALIZACIÓN: Ahora elimina credenciales para forzar nuevo QR
   * @param {string} tenantId - ID del tenant
   */
  async disconnect(tenantId) {
    try {
      logger.info(`[${tenantId}] Desconectando y eliminando credenciales...`);
      
      // Desconectar sesión activa
      await sessionManager.disconnectSession(tenantId);
      
      // 🔥 FIX: Eliminar credenciales para forzar nuevo QR
      await storage.deleteSessionData(tenantId);
      
      // Limpiar timeout de QR
      this.clearQRTimeout(tenantId);
      
      logger.info(`[${tenantId}] Desconexión completa (sesión y credenciales eliminadas)`);
      return true;
    } catch (error) {
      logger.error(`[${tenantId}] Error al desconectar:`, error);
      throw error;
    }
  }

  /**
   * Establece timeout de expiración del QR
   * @private
   */
  setQRTimeout(tenantId, expiresAt) {
    const timeoutDuration = expiresAt - Date.now();
    const timeout = setTimeout(() => {
      logger.info(`[${tenantId}] QR Code expirado`);
      this.qrTimeouts.delete(tenantId);
    }, timeoutDuration);
    
    this.qrTimeouts.set(tenantId, { timeout, expiresAt });
  }

  /**
   * Limpia timeout de QR
   * @private
   */
  clearQRTimeout(tenantId) {
    const qrTimeout = this.qrTimeouts.get(tenantId);
    if (qrTimeout) {
      clearTimeout(qrTimeout.timeout);
      this.qrTimeouts.delete(tenantId);
    }
  }

  /**
   * Verifica si el QR de un tenant ha expirado
   * @private
   */
  isQRExpired(tenantId) {
    const qrTimeout = this.qrTimeouts.get(tenantId);
    if (!qrTimeout) return true;
    return Date.now() > qrTimeout.expiresAt;
  }

  /**
   * Obtiene información de la sesión actual
   * @param {string} tenantId - ID del tenant
   */
  getSessionInfo(tenantId) {
    const session = sessionManager.getSession(tenantId);
    if (!session) return null;

    return {
      connected: Boolean(session.user),
      phoneNumber: session.user?.id?.split(':')[0] || null,
      name: session.user?.name || null,
      platform: session.user?.platform || null
    };
  }
}

// Singleton instance
const authHandler = new AuthHandler();

module.exports = authHandler;
