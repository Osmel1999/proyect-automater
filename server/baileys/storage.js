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
      // Verificar primero en Firestore (más confiable en Railway)
      if (firebaseService) {
        try {
          const db = firebaseService.db;
          const sessionRef = db.collection('baileys_sessions').doc(tenantId);
          const doc = await sessionRef.get();
          
          if (doc.exists && doc.data().creds) {
            logger.debug(`[${tenantId}] Sesión encontrada en Firestore`);
            return true;
          }
        } catch (firestoreError) {
          logger.warn(`[${tenantId}] Error verificando Firestore:`, firestoreError.message);
        }
      }

      // Fallback: verificar archivos locales
      const sessionDir = path.join(this.sessionsPath, tenantId);
      const credsPath = path.join(sessionDir, 'creds.json');
      
      try {
        await fs.access(credsPath);
        logger.debug(`[${tenantId}] Sesión encontrada en archivos locales`);
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
   * @param {object} sessionData - Datos de la sesión (credenciales de Baileys)
   */
  async saveSessionToFirebase(tenantId, sessionData) {
    if (!firebaseService) {
      logger.warn(`[${tenantId}] Firebase service not available, skipping cloud backup`);
      return;
    }

    try {
      const db = firebaseService.db;
      const sessionRef = db.collection('baileys_sessions').doc(tenantId);

      // Guardar credenciales completas
      await sessionRef.set({
        creds: sessionData.creds || sessionData,
        keys: sessionData.keys || {},
        updatedAt: new Date().toISOString(),
        savedAt: Date.now()
      }, { merge: true });

      logger.info(`[${tenantId}] ✅ Credenciales guardadas en Firestore`);
      
      // También actualizar flag en Realtime Database
      await firebaseService.database.ref(`tenants/${tenantId}/restaurant/whatsappConnected`).set(true);
      await firebaseService.database.ref(`tenants/${tenantId}/restaurant/connectedAt`).set(new Date().toISOString());
      
    } catch (error) {
      logger.error(`[${tenantId}] ❌ Error guardando sesión en Firebase:`, error);
      throw error;
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
      const sessionRef = db.collection('baileys_sessions').doc(tenantId);
      const doc = await sessionRef.get();

      if (doc.exists) {
        const data = doc.data();
        logger.info(`[${tenantId}] ✅ Credenciales recuperadas de Firestore`);
        logger.debug(`[${tenantId}]    Guardadas: ${new Date(data.savedAt).toLocaleString()}`);
        return {
          creds: data.creds,
          keys: data.keys || {}
        };
      }

      logger.warn(`[${tenantId}] ⚠️ No hay credenciales guardadas en Firestore`);
      return null;
    } catch (error) {
      logger.error(`[${tenantId}] ❌ Error cargando sesión desde Firebase:`, error);
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

      // Eliminar de Firestore (nueva ubicación)
      if (firebaseService) {
        const db = firebaseService.db;
        const sessionRef = db.collection('baileys_sessions').doc(tenantId);
        await sessionRef.delete();
        logger.info(`[${tenantId}] ✅ Credenciales eliminadas de Firestore`);
        
        // Actualizar flag en Realtime Database
        await firebaseService.database.ref(`tenants/${tenantId}/restaurant/whatsappConnected`).set(false);
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

  /**
   * Implementación de AuthState compatible con Baileys usando Firestore
   * Similar a useMultiFileAuthState pero con persistencia en Firestore
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<object>} { state, saveCreds }
   */
  async getAuthState(tenantId) {
    const logger = pino({ level: 'info' });
    
    // 🔥 FIX: Inicializar state con estructura completa y válida
    let state = {
      creds: undefined,
      keys: {
        get: async (type, ids) => {
          const data = {};
          if (!firebaseService) return data;
          
          try {
            const db = firebaseService.db;
            const sessionRef = db.collection('baileys_sessions').doc(tenantId);
            const doc = await sessionRef.get();
            
            if (!doc.exists) return data;
            
            const sessionData = doc.data();
            const keys = sessionData.keys || {};
            
            for (const id of ids) {
              const key = `${type}-${id}`;
              if (keys[key]) {
                data[id] = keys[key];
              }
            }
          } catch (error) {
            logger.error(`[${tenantId}] Error obteniendo keys desde Firestore:`, error);
          }
          
          return data;
        },
        set: async (data) => {
          if (!firebaseService) return;
          
          try {
            const db = firebaseService.db;
            const sessionRef = db.collection('baileys_sessions').doc(tenantId);
            
            // Convertir data a formato plano
            const keysUpdate = {};
            for (const category in data) {
              for (const id in data[category]) {
                const key = `${category}-${id}`;
                keysUpdate[`keys.${key}`] = data[category][id];
              }
            }
            
            await sessionRef.set(keysUpdate, { merge: true });
            logger.debug(`[${tenantId}] Keys guardadas en Firestore`);
          } catch (error) {
            logger.error(`[${tenantId}] Error guardando keys en Firestore:`, error);
          }
        }
      }
    };
    
    // Intentar cargar credenciales existentes
    try {
      const sessionData = await this.loadSessionFromFirebase(tenantId);
      
      // 🔥 VALIDACIÓN: Verificar que las credenciales son válidas
      if (sessionData && 
          sessionData.creds && 
          typeof sessionData.creds === 'object' && 
          Object.keys(sessionData.creds).length > 0) {
        
        state.creds = sessionData.creds;
        logger.info(`[${tenantId}] ✅ Credenciales válidas cargadas desde Firestore`);
        logger.info(`[${tenantId}]    📋 Propiedades en creds: ${Object.keys(sessionData.creds).length}`);
        
      } else {
        logger.warn(`[${tenantId}] ⚠️  Credenciales en Firestore vacías o inválidas`);
        // state.creds permanecerá undefined
      }
    } catch (error) {
      logger.warn(`[${tenantId}] ℹ️  No hay credenciales previas en Firestore:`, error.message);
      // state.creds permanecerá undefined (nueva sesión)
    }
    
    // Función para guardar credenciales
    const saveCreds = async () => {
      // 🔥 VALIDACIÓN: Solo guardar si state y creds son válidos
      if (!firebaseService) {
        logger.warn(`[${tenantId}] ⚠️  Firebase no disponible, no se pueden guardar credenciales`);
        return;
      }
      
      if (!state || !state.creds) {
        logger.warn(`[${tenantId}] ⚠️  State o creds undefined, no se puede guardar`);
        return;
      }
      
      if (typeof state.creds !== 'object' || Object.keys(state.creds).length === 0) {
        logger.warn(`[${tenantId}] ⚠️  Creds vacío o inválido, no se puede guardar`);
        return;
      }
      
      try {
        const db = firebaseService.db;
        const sessionRef = db.collection('baileys_sessions').doc(tenantId);
        
        await sessionRef.set({
          creds: state.creds,
          updatedAt: new Date().toISOString(),
          savedAt: Date.now()
        }, { merge: true });
        
        logger.info(`[${tenantId}] ✅ Credenciales guardadas en Firestore (${Object.keys(state.creds).length} propiedades)`);
        
        // Actualizar flag en Realtime Database
        await firebaseService.database.ref(`tenants/${tenantId}/restaurant/whatsappConnected`).set(true);
        await firebaseService.database.ref(`tenants/${tenantId}/restaurant/connectedAt`).set(new Date().toISOString());
      } catch (error) {
        logger.error(`[${tenantId}] ❌ Error guardando credenciales:`, error);
      }
    };
    
    return { state, saveCreds };
  }

  /**
   * Guarda el estado de conexión en Firebase
   * @param {string} tenantId - ID del tenant
   * @param {object} state - Estado de conexión
   */
  async saveConnectionState(tenantId, state) {
    if (!firebaseService) {
      return;
    }

    try {
      const db = firebaseService.db;
      const whatsappRef = db.collection('tenants').doc(tenantId).collection('whatsapp').doc('config');

      await whatsappRef.set({
        provider: 'baileys',
        baileys: {
          connected: state.connected,
          phoneNumber: state.phoneNumber || null,
          lastSeen: state.lastSeen || new Date().toISOString(),
          messageCount: state.messageCount || 0,
          dailyLimit: state.dailyLimit || 1000,
          updatedAt: new Date().toISOString()
        }
      }, { merge: true });

      logger.info(`[${tenantId}] Estado de conexión guardado en Firebase`);
    } catch (error) {
      logger.error(`[${tenantId}] Error guardando estado de conexión en Firebase:`, error);
    }
  }
}

// Singleton instance
const storage = new Storage();

module.exports = storage;
