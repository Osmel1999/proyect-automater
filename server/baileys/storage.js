/**
 * Baileys Storage
 * Maneja la persistencia de sesiones y datos de Baileys en Firebase
 */

const path = require('node:path');
const fs = require('node:fs').promises;
const pino = require('pino');

const logger = pino({ level: 'info' });

// Importar Firebase service si existe
let firebaseService;
try {
  firebaseService = require('../firebase-service');
} catch {
  // Firebase service not available, will use file-only storage
  logger.warn('Firebase service not found, using file-only storage');
}

class Storage {
  constructor() {
    this.sessionsPath = path.join(__dirname, '../../sessions');
  }

  /**
   * Verifica si existen datos de sesión para un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<boolean>}
   */
  async hasSessionData(tenantId) {
    try {
      const sessionDir = path.join(this.sessionsPath, tenantId);
      const credsPath = path.join(sessionDir, 'creds.json');
      
      try {
        await fs.access(credsPath);
        return true;
      } catch {
        return false;
      }
    } catch (error) {
      logger.error(`[${tenantId}] Error verificando datos de sesión:`, error);
      return false;
    }
  }

  /**
   * Guarda los datos de sesión de un tenant en Firebase
   * @param {string} tenantId - ID del tenant
   * @param {object} sessionData - Datos de la sesión
   */
  async saveSessionToFirebase(tenantId, sessionData) {
    if (!firebaseService) {
      logger.warn(`[${tenantId}] Firebase service not available, skipping cloud backup`);
      return;
    }

    try {
      const db = firebaseService.db;
      const sessionRef = db.collection('tenants').doc(tenantId).collection('whatsapp').doc('baileys_session');

      await sessionRef.set({
        ...sessionData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      logger.info(`[${tenantId}] Sesión guardada en Firebase`);
    } catch (error) {
      logger.error(`[${tenantId}] Error guardando sesión en Firebase:`, error);
    }
  }

  /**
   * Recupera los datos de sesión de un tenant desde Firebase
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<object|null>}
   */
  async loadSessionFromFirebase(tenantId) {
    if (!firebaseService) {
      return null;
    }

    try {
      const db = firebaseService.db;
      const sessionRef = db.collection('tenants').doc(tenantId).collection('whatsapp').doc('baileys_session');
      const doc = await sessionRef.get();

      if (doc.exists) {
        logger.info(`[${tenantId}] Sesión recuperada de Firebase`);
        return doc.data();
      }

      return null;
    } catch (error) {
      logger.error(`[${tenantId}] Error cargando sesión desde Firebase:`, error);
      return null;
    }
  }

  /**
   * Actualiza el estado de conexión en Firebase
   * @param {string} tenantId - ID del tenant
   * @param {object} status - Estado de conexión
   */
  async updateConnectionStatus(tenantId, status) {
    if (!firebaseService) {
      return;
    }

    try {
      const db = firebaseService.db;
      const whatsappRef = db.collection('tenants').doc(tenantId).collection('whatsapp').doc('config');

      await whatsappRef.set({
        provider: 'baileys',
        baileys: {
          connected: status.connected,
          phoneNumber: status.phoneNumber || null,
          lastSeen: status.lastSeen || new Date().toISOString(),
          messageCount: status.messageCount || 0,
          dailyLimit: status.dailyLimit || 1000,
          updatedAt: new Date().toISOString()
        }
      }, { merge: true });

      logger.info(`[${tenantId}] Estado de conexión actualizado en Firebase`);
    } catch (error) {
      logger.error(`[${tenantId}] Error actualizando estado en Firebase:`, error);
    }
  }

  /**
   * Obtiene la configuración de WhatsApp de un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<object|null>}
   */
  async getWhatsAppConfig(tenantId) {
    if (!firebaseService) {
      return null;
    }

    try {
      const db = firebaseService.db;
      const whatsappRef = db.collection('tenants').doc(tenantId).collection('whatsapp').doc('config');
      const doc = await whatsappRef.get();

      if (doc.exists) {
        return doc.data();
      }

      return null;
    } catch (error) {
      logger.error(`[${tenantId}] Error obteniendo configuración:`, error);
      return null;
    }
  }

  /**
   * Elimina los datos de sesión de un tenant (local y Firebase)
   * @param {string} tenantId - ID del tenant
   */
  async deleteSessionData(tenantId) {
    try {
      // Eliminar archivos locales
      const sessionDir = path.join(this.sessionsPath, tenantId);
      await fs.rm(sessionDir, { recursive: true, force: true });
      logger.info(`[${tenantId}] Archivos de sesión locales eliminados`);

      // Eliminar de Firebase
      if (firebaseService) {
        const db = firebaseService.db;
        const sessionRef = db.collection('tenants').doc(tenantId).collection('whatsapp').doc('baileys_session');
        await sessionRef.delete();
        logger.info(`[${tenantId}] Sesión eliminada de Firebase`);
      }

      return true;
    } catch (error) {
      logger.error(`[${tenantId}] Error eliminando datos de sesión:`, error);
      throw error;
    }
  }

  /**
   * Crea un backup de la sesión actual
   * @param {string} tenantId - ID del tenant
   */
  async backupSession(tenantId) {
    try {
      const sessionDir = path.join(this.sessionsPath, tenantId);
      const backupDir = path.join(this.sessionsPath, `${tenantId}_backup_${Date.now()}`);

      // Copiar directorio completo
      await fs.cp(sessionDir, backupDir, { recursive: true });
      
      logger.info(`[${tenantId}] Backup de sesión creado: ${backupDir}`);
      return backupDir;
    } catch (error) {
      logger.error(`[${tenantId}] Error creando backup:`, error);
      throw error;
    }
  }

  /**
   * Restaura una sesión desde un backup
   * @param {string} tenantId - ID del tenant
   * @param {string} backupPath - Ruta del backup
   */
  async restoreSession(tenantId, backupPath) {
    try {
      const sessionDir = path.join(this.sessionsPath, tenantId);

      // Eliminar sesión actual si existe
      await fs.rm(sessionDir, { recursive: true, force: true });

      // Copiar backup
      await fs.cp(backupPath, sessionDir, { recursive: true });

      logger.info(`[${tenantId}] Sesión restaurada desde backup`);
      return true;
    } catch (error) {
      logger.error(`[${tenantId}] Error restaurando sesión:`, error);
      throw error;
    }
  }

  /**
   * Lista todos los backups disponibles para un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Array>}
   */
  async listBackups(tenantId) {
    try {
      const files = await fs.readdir(this.sessionsPath);
      const backups = files.filter(f => f.startsWith(`${tenantId}_backup_`));
      
      const backupInfo = await Promise.all(
        backups.map(async (backup) => {
          const backupPath = path.join(this.sessionsPath, backup);
          const stats = await fs.stat(backupPath);
          return {
            name: backup,
            path: backupPath,
            created: stats.birthtime,
            size: stats.size
          };
        })
      );

      return backupInfo.sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error(`[${tenantId}] Error listando backups:`, error);
      return [];
    }
  }

  /**
   * Limpia backups antiguos (mantiene solo los últimos N)
   * @param {string} tenantId - ID del tenant
   * @param {number} keep - Número de backups a mantener
   */
  async cleanOldBackups(tenantId, keep = 3) {
    try {
      const backups = await this.listBackups(tenantId);
      
      if (backups.length <= keep) {
        return;
      }

      // Eliminar backups antiguos
      const toDelete = backups.slice(keep);
      for (const backup of toDelete) {
        await fs.rm(backup.path, { recursive: true, force: true });
        logger.info(`[${tenantId}] Backup antiguo eliminado: ${backup.name}`);
      }

      logger.info(`[${tenantId}] Limpieza de backups completada. Mantenidos: ${keep}`);
    } catch (error) {
      logger.error(`[${tenantId}] Error limpiando backups:`, error);
    }
  }

  /**
   * Obtiene el tamaño total de los archivos de sesión
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<number>} Tamaño en bytes
   */
  async getSessionSize(tenantId) {
    try {
      const sessionDir = path.join(this.sessionsPath, tenantId);
      let totalSize = 0;

      async function calculateSize(dir) {
        const files = await fs.readdir(dir, { withFileTypes: true });
        
        for (const file of files) {
          const filePath = path.join(dir, file.name);
          if (file.isDirectory()) {
            await calculateSize(filePath);
          } else {
            const stats = await fs.stat(filePath);
            totalSize += stats.size;
          }
        }
      }

      await calculateSize(sessionDir);
      return totalSize;
    } catch (error) {
      logger.error(`[${tenantId}] Error calculando tamaño de sesión:`, error);
      return 0;
    }
  }
}

// Singleton instance
const storage = new Storage();

module.exports = storage;
