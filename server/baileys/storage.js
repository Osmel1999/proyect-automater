/**
 * Baileys Storage
 * Maneja la persistencia de sesiones y datos de Baileys en Firebase
 */

const path = require('node:path');
const fs = require('node:fs').promises;
const pino = require('pino');

const logger = pino({ level: 'info' });

// =====================================================================
// 🔑 CRITICAL: BufferJSON serialization for Baileys credentials
// 
// Baileys credentials contain Buffer/Uint8Array objects (crypto keys,
// noise keys, signing keys, etc.). Firebase Realtime Database CANNOT
// store raw Buffer objects — it silently converts them to numbered
// key-value objects like { 0: 123, 1: 45, ... } which corrupts the
// data. On reconnection, Baileys receives broken credentials and the
// WebSocket handshake fails immediately, causing an infinite
// reconnection loop.
//
// Solution: Use JSON.stringify with BufferJSON.replacer before saving
// to Firebase, and JSON.parse with BufferJSON.reviver when loading.
// This converts Buffers to { type: 'Buffer', data: '<base64>' }
// objects that Firebase can store safely, and restores them on read.
// =====================================================================

// BufferJSON — same logic Baileys uses internally for file auth state
const BufferJSON = {
  replacer: (k, value) => {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array || value?.type === 'Buffer') {
      return { type: 'Buffer', data: Buffer.from(value?.data || value).toString('base64') };
    }
    return value;
  },
  reviver: (_, value) => {
    if (typeof value === 'object' && value !== null && value.type === 'Buffer') {
      // Case 1: data is base64 string (our new format after proper serialization)
      if (typeof value.data === 'string') {
        return Buffer.from(value.data, 'base64');
      }
      // Case 2: data is array of numbers (Firebase stored format / legacy)
      // Firebase converts Buffer({ type:'Buffer', data:[176,102,...] }) keeping array intact
      if (Array.isArray(value.data)) {
        return Buffer.from(value.data);
      }
      // Case 3: data is object with numeric keys (Firebase mangled array to object)
      // e.g. { "0": 176, "1": 102, ... }
      if (typeof value.data === 'object' && value.data !== null) {
        const keys = Object.keys(value.data);
        if (keys.length > 0 && keys.every(k => !isNaN(parseInt(k, 10)))) {
          return Buffer.from(Object.values(value.data));
        }
      }
    }
    // Case 4: Plain object with only numeric keys (deeply mangled Buffer)
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

/**
 * Serializes creds/keys so all Buffers become Firebase-safe JSON objects
 * @param {object} data - raw Baileys creds or keys object
 * @returns {object} serialized copy safe for Firebase
 */
function serializeForFirebase(data) {
  return JSON.parse(JSON.stringify(data, BufferJSON.replacer));
}

/**
 * Deserializes creds/keys restoring Buffers from their JSON representation
 * @param {object} data - Firebase-stored data
 * @returns {object} deserialized copy with real Buffer instances
 */
function deserializeFromFirebase(data) {
  return JSON.parse(JSON.stringify(data), BufferJSON.reviver);
}

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
      // ✅ Verificar en la ruta del tenant (mejor aislamiento)
      if (firebaseService) {
        try {
          const snapshot = await firebaseService.database
            .ref(`tenants/${tenantId}/baileys_session/creds`)
            .once('value');
          
          if (snapshot.exists()) {
            logger.debug(`[${tenantId}] Sesión encontrada en tenant data`);
            return true;
          }
        } catch (dbError) {
          logger.warn(`[${tenantId}] Error verificando Realtime Database:`, dbError.message);
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
   * Guarda los datos de sesión de un tenant en Firebase Realtime Database
   * DENTRO de la estructura del tenant para mejor aislamiento
   * @param {string} tenantId - ID del tenant
   * @param {object} sessionData - Datos de la sesión (credenciales de Baileys)
   */
  async saveSessionToFirebase(tenantId, sessionData) {
    if (!firebaseService) {
      logger.warn(`[${tenantId}] Firebase service not available, skipping cloud backup`);
      return;
    }

    try {
      // ✅ Guardar DENTRO del tenant (mejor organización y seguridad)
      const sessionRef = firebaseService.database.ref(`tenants/${tenantId}/baileys_session`);

      // 🔑 Serialize Buffers before saving to Firebase
      const serializedCreds = serializeForFirebase(sessionData.creds || sessionData);
      const serializedKeys = sessionData.keys ? serializeForFirebase(sessionData.keys) : {};

      await sessionRef.set({
        creds: serializedCreds,
        keys: serializedKeys,
        updatedAt: new Date().toISOString(),
        savedAt: Date.now()
      });

      logger.info(`[${tenantId}] ✅ Credenciales guardadas en tenant data (serialized, aislado)`);
      
      // También actualizar flag en tenants
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
      // ✅ Cargar desde la ruta del tenant
      const snapshot = await firebaseService.database
        .ref(`tenants/${tenantId}/baileys_session`)
        .once('value');

      if (snapshot.exists()) {
        const data = snapshot.val();
        logger.info(`[${tenantId}] ✅ Credenciales recuperadas de tenant data`);
        logger.debug(`[${tenantId}]    Guardadas: ${new Date(data.savedAt).toLocaleString()}`);
        
        // 🔑 Deserialize Buffers after loading from Firebase
        const creds = data.creds ? deserializeFromFirebase(data.creds) : null;
        const keys = data.keys ? deserializeFromFirebase(data.keys) : {};
        
        return { creds, keys };
      }

      logger.warn(`[${tenantId}] ⚠️ No hay credenciales guardadas en tenant`);
      return null;
    } catch (error) {
      logger.error(`[${tenantId}] ❌ Error cargando sesión desde Firebase:`, error);
      return null;
    }
  }

  /**
   * Actualiza el estado de conexión en Firebase Realtime Database
   * @param {string} tenantId - ID del tenant
   * @param {object} status - Estado de conexión
   */
  async updateConnectionStatus(tenantId, status) {
    if (!firebaseService) {
      return;
    }

    try {
      // 🔥 FIX: Actualizar en Realtime Database (no Firestore)
      const whatsappRef = firebaseService.database
        .ref(`tenants/${tenantId}/whatsapp/baileys`);

      await whatsappRef.update({
        provider: 'baileys',
        connected: status.connected,
        phoneNumber: status.phoneNumber || null,
        lastSeen: status.lastSeen || new Date().toISOString(),
        messageCount: status.messageCount || 0,
        dailyLimit: status.dailyLimit || 1000,
        updatedAt: new Date().toISOString()
      });

      logger.info(`[${tenantId}] Estado de conexión actualizado en Realtime Database`);
    } catch (error) {
      logger.error(`[${tenantId}] Error actualizando estado en Firebase:`, error);
    }
  }

  /**
   * Obtiene la configuración de WhatsApp de un tenant desde Realtime Database
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<object|null>}
   */
  async getWhatsAppConfig(tenantId) {
    if (!firebaseService) {
      return null;
    }

    try {
      // 🔥 FIX: Obtener desde Realtime Database (no Firestore)
      const snapshot = await firebaseService.database
        .ref(`tenants/${tenantId}/whatsapp/baileys`)
        .once('value');

      if (snapshot.exists()) {
        return snapshot.val();
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

      // ✅ Eliminar desde la ruta del tenant
      if (firebaseService) {
        await firebaseService.database.ref(`tenants/${tenantId}/baileys_session`).remove();
        logger.info(`[${tenantId}] ✅ Credenciales eliminadas de tenant data`);
        
        // Actualizar flag en tenants
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
   * Implementación de AuthState compatible con Baileys usando Realtime Database
   * Similar a useMultiFileAuthState pero con persistencia dentro del tenant
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<object>} { state, saveCreds }
   */
  async getAuthState(tenantId) {
    const logger = pino({ level: 'info' });
    
    // ✅ Inicializar state con estructura completa y válida
    let state = {
      creds: undefined,
      keys: {
        get: async (type, ids) => {
          const data = {};
          if (!firebaseService) return data;
          
          try {
            // Obtener desde la ruta del tenant
            const snapshot = await firebaseService.database
              .ref(`tenants/${tenantId}/baileys_session`)
              .once('value');
            
            if (!snapshot.exists()) return data;
            
            const sessionData = snapshot.val();
            const keys = sessionData.keys || {};
            
            for (const id of ids) {
              const key = `${type}-${id}`;
              if (keys[key]) {
                // 🔑 Deserialize Buffer fields in keys
                data[id] = deserializeFromFirebase(keys[key]);
              }
            }
          } catch (error) {
            logger.error(`[${tenantId}] Error obteniendo keys:`, error);
          }
          
          return data;
        },
        set: async (data) => {
          if (!firebaseService) return;
          
          try {
            // Guardar en la ruta del tenant
            const keysRef = firebaseService.database
              .ref(`tenants/${tenantId}/baileys_session/keys`);
            
            // Convertir data a formato plano
            const keysUpdate = {};
            for (const category in data) {
              for (const id in data[category]) {
                const key = `${category}-${id}`;
                // 🔑 Serialize Buffer fields in keys before saving
                keysUpdate[key] = data[category][id] != null
                  ? serializeForFirebase(data[category][id])
                  : null;
              }
            }
            
            await keysRef.update(keysUpdate);
            logger.debug(`[${tenantId}] Keys guardadas en tenant data`);
          } catch (error) {
            logger.error(`[${tenantId}] Error guardando keys:`, error);
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
        logger.info(`[${tenantId}] ✅ Credenciales válidas cargadas desde tenant data`);
        logger.info(`[${tenantId}]    📋 Propiedades en creds: ${Object.keys(sessionData.creds).length}`);
        
      } else {
        logger.warn(`[${tenantId}] ⚠️  Credenciales en tenant vacías o inválidas`);
        // state.creds permanecerá undefined
      }
    } catch (error) {
      logger.warn(`[${tenantId}] ℹ️  No hay credenciales previas en tenant:`, error.message);
      // state.creds permanecerá undefined (nueva sesión)
    }
    
    // Función para guardar credenciales
    const saveCreds = async () => {
      // ✅ VALIDACIÓN: Solo guardar si state y creds son válidos
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
        // ✅ Guardar en la ruta del tenant (serializado para Firebase)
        const sessionRef = firebaseService.database
          .ref(`tenants/${tenantId}/baileys_session`);
        
        const serializedCreds = serializeForFirebase(state.creds);
        
        await sessionRef.update({
          creds: serializedCreds,
          updatedAt: new Date().toISOString(),
          savedAt: Date.now()
        });
        
        logger.info(`[${tenantId}] ✅ Credenciales guardadas en tenant data (serialized, ${Object.keys(state.creds).length} propiedades)`);
        
        // Actualizar flag de conexión
        await firebaseService.database.ref(`tenants/${tenantId}/restaurant/whatsappConnected`).set(true);
        await firebaseService.database.ref(`tenants/${tenantId}/restaurant/connectedAt`).set(new Date().toISOString());
      } catch (error) {
        logger.error(`[${tenantId}] ❌ Error guardando credenciales:`, error);
      }
    };
    
    return { state, saveCreds };
  }

  /**
   * Guarda el estado de conexión en Firebase (dentro del tenant)
   * @param {string} tenantId - ID del tenant
   * @param {object} state - Estado de conexión
   */
  async saveConnectionState(tenantId, state) {
    if (!firebaseService) {
      return;
    }

    try {
      // ✅ Guardar en la ruta del tenant
      const whatsappRef = firebaseService.database
        .ref(`tenants/${tenantId}/whatsapp/baileys`);

      await whatsappRef.update({
        provider: 'baileys',
        connected: state.connected,
        phoneNumber: state.phoneNumber || null,
        lastSeen: state.lastSeen || new Date().toISOString(),
        messageCount: state.messageCount || 0,
        dailyLimit: state.dailyLimit || 1000,
        updatedAt: new Date().toISOString()
      });

      logger.info(`[${tenantId}] Estado de conexión guardado en tenant data`);
    } catch (error) {
      logger.error(`[${tenantId}] Error guardando estado de conexión:`, error);
    }
  }
}

// Singleton instance
const storage = new Storage();

module.exports = storage;
