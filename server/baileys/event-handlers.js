/**
 * Baileys Event Handlers
 * Maneja los eventos de mensajes y conexión de Baileys
 */

const pino = require('pino');
const messageAdapter = require('./message-adapter');
const storage = require('./storage');

const logger = pino({ level: 'info' });

class EventHandlers {
  constructor() {
    this.messageCallbacks = new Map(); // tenantId -> callback
    this.statusCallbacks = new Map(); // tenantId -> callback
  }

  /**
   * Registra un callback para mensajes recibidos
   * @param {string} tenantId - ID del tenant o '*' para todos
   * @param {function} callback - Función a ejecutar cuando llegue un mensaje
   */
  onMessage(tenantId, callback) {
    this.messageCallbacks.set(tenantId, callback);
    logger.info(`[${tenantId}] Message callback registrado`);
  }

  /**
   * Registra un callback para cambios de estado
   * @param {string} tenantId - ID del tenant
   * @param {function} callback - Función a ejecutar cuando cambie el estado
   */
  onStatusChange(tenantId, callback) {
    this.statusCallbacks.set(tenantId, callback);
    logger.info(`[${tenantId}] Status callback registrado`);
  }

  /**
   * Maneja mensajes entrantes
   * @param {string} tenantId - ID del tenant
   * @param {object} baileysMessage - Mensaje en formato Baileys
   */
  async handleIncomingMessage(tenantId, baileysMessage) {
    console.log(`🔍 [DEBUG] handleIncomingMessage llamado para tenant ${tenantId}`);
    console.log(`🔍 [DEBUG] baileysMessage:`, JSON.stringify(baileysMessage, null, 2));
    
    try {
      // Ignorar mensajes del bot (evitar loops)
      if (messageAdapter.isFromBot(baileysMessage)) {
        console.log(`🔍 [DEBUG] Mensaje propio ignorado (isFromBot = true)`);
        logger.debug(`[${tenantId}] Mensaje propio ignorado`);
        return;
      }

      console.log(`🔍 [DEBUG] No es mensaje del bot, convirtiendo a formato interno`);
      
      // Convertir a formato interno
      const internalMessage = messageAdapter.baileysToInternal(baileysMessage);
      
      console.log(`🔍 [DEBUG] Mensaje convertido:`, JSON.stringify(internalMessage, null, 2));
      
      // Agregar tenantId al mensaje
      internalMessage.tenantId = tenantId;
      
      logger.info(`[${tenantId}] Mensaje recibido de ${internalMessage.from}: ${internalMessage.text?.substring(0, 50) || '[media]'}`);

      // Emitir evento WebSocket
      if (global.baileysWebSocket) {
        global.baileysWebSocket.emitMessageReceived(tenantId, internalMessage);
      }

      // Ejecutar callback específico del tenant o callback global
      let callback = this.messageCallbacks.get(tenantId);
      
      console.log(`🔍 [DEBUG] Callback específico para ${tenantId}:`, callback ? 'ENCONTRADO' : 'NO ENCONTRADO');
      
      if (!callback) {
        // Buscar callback global
        callback = this.messageCallbacks.get('*');
        console.log(`🔍 [DEBUG] Callback global (*):`, callback ? 'ENCONTRADO' : 'NO ENCONTRADO');
      }
      
      if (callback) {
        console.log(`🔍 [DEBUG] Ejecutando callback con mensaje:`, internalMessage.text);
        
        try {
          const response = await callback(internalMessage);
          
          console.log(`🔍 [DEBUG] Respuesta del callback:`, response);
          
          // Si el callback retorna null, significa que el bot está desactivado
          // y no debe responder. Simplemente marcar como leído.
          if (response === null || response === undefined) {
            console.log(`🔍 [DEBUG] Respuesta null/undefined, bot desactivado o sin respuesta`);
            logger.info(`[${tenantId}] Bot desactivado o sin respuesta, solo marcando como leído`);
            await messageAdapter.markAsRead(tenantId, baileysMessage.key);
            return;
          }
          
          console.log(`🔍 [DEBUG] Marcando mensaje como leído`);
          
          // Marcar como leído DESPUÉS de procesar (para dar tiempo a responder)
          await messageAdapter.markAsRead(tenantId, baileysMessage.key);
          logger.info(`[${tenantId}] Mensaje marcado como leído`);
        } catch (error) {
          console.error(`🔍 [DEBUG] Error en callback:`, error);
          logger.error(`[${tenantId}] Error en callback de mensaje:`, error);
        }
      } else {
        console.log(`🔍 [DEBUG] NO HAY CALLBACK REGISTRADO`);
        logger.warn(`[${tenantId}] No hay callback registrado para mensajes`);
        
        // Marcar como leído de todos modos
        await messageAdapter.markAsRead(tenantId, baileysMessage.key);
        logger.info(`[${tenantId}] Mensaje marcado como leído`);
      }

      // Guardar en Firebase si es necesario
      await this.saveMessageToFirebase(tenantId, internalMessage);

    } catch (error) {
      console.error(`🔍 [DEBUG] Error en handleIncomingMessage:`, error);
      logger.error(`[${tenantId}] Error manejando mensaje entrante:`, error);
    }
  }

  /**
   * Maneja actualizaciones de estado de mensajes
   * @param {string} tenantId - ID del tenant
   * @param {object} update - Actualización del mensaje
   */
  async handleMessageUpdate(tenantId, update) {
    try {
      const { key, update: messageUpdate } = update;
      
      // Estados posibles: 'pending', 'sent', 'delivered', 'read'
      const status = messageUpdate.status;
      const messageId = key.id;

      logger.info(`[${tenantId}] Mensaje ${messageId} actualizado: ${status}`);

      // Aquí puedes actualizar el estado en tu base de datos
      // await this.updateMessageStatus(tenantId, messageId, status);

    } catch (error) {
      logger.error(`[${tenantId}] Error manejando actualización de mensaje:`, error);
    }
  }

  /**
   * Maneja cambio de estado de conexión
   * @param {string} tenantId - ID del tenant
   * @param {string} state - Estado (open, close)
   * @param {object} info - Información adicional
   */
  async handleConnectionChange(tenantId, state, info = {}) {
    try {
      logger.info(`[${tenantId}] Cambio de estado de conexión: ${state}`);

      // Emitir evento WebSocket
      if (global.baileysWebSocket) {
        const status = state === 'open' ? 'connected' : 'disconnected';
        global.baileysWebSocket.emitConnectionStatus(tenantId, status, info);
      }

      // Guardar estado en Firebase
      await storage.saveConnectionState(tenantId, {
        connected: state === 'open',
        phoneNumber: info.phoneNumber || null,
        lastSeen: new Date().toISOString(),
        messageCount: info.messageCount || 0
      });

      // Ejecutar callback registrado
      const callback = this.statusCallbacks.get(tenantId);
      if (callback) {
        try {
          await callback(state, info);
        } catch (error) {
          logger.error(`[${tenantId}] Error en callback de estado:`, error);
        }
      }

    } catch (error) {
      logger.error(`[${tenantId}] Error manejando cambio de conexión:`, error);
    }
  }

  /**
   * Guarda un mensaje en Firebase
   * @private
   */
  async saveMessageToFirebase(tenantId, message) {
    try {
      // Opcional: Implementar guardado de mensajes en Firebase
      // const db = firebaseService.db;
      // await db.collection('tenants').doc(tenantId)
      //   .collection('messages').add(message);
      
      logger.debug(`[${tenantId}] Mensaje guardado (placeholder)`);
    } catch (error) {
      logger.error(`[${tenantId}] Error guardando mensaje:`, error);
    }
  }

  /**
   * Procesa mensajes multimedia
   * @param {string} tenantId - ID del tenant
   * @param {object} baileysMessage - Mensaje con media
   * @returns {Promise<string|null>} URL del archivo descargado
   */
  async processMediaMessage(tenantId, baileysMessage) {
    try {
      const messageType = messageAdapter.getMessageType(baileysMessage);
      
      if (['image', 'video', 'audio', 'document', 'sticker'].includes(messageType)) {
        logger.info(`[${tenantId}] Descargando ${messageType}...`);
        
        const buffer = await messageAdapter.downloadMedia(baileysMessage);
        
        // Aquí puedes subir el archivo a un storage (Firebase Storage, S3, etc.)
        // const url = await uploadToStorage(buffer, messageType);
        
        logger.info(`[${tenantId}] Media descargado: ${buffer.length} bytes`);
        
        // Por ahora retornamos null, implementar upload según necesidad
        return null;
      }
      
      return null;
    } catch (error) {
      logger.error(`[${tenantId}] Error procesando media:`, error);
      return null;
    }
  }

  /**
   * Maneja mensajes de presencia (escribiendo, en línea, etc.)
   * @param {string} tenantId - ID del tenant
   * @param {object} presence - Información de presencia
   */
  handlePresenceUpdate(tenantId, presence) {
    // available, composing, recording, paused
    logger.debug(`[${tenantId}] Presencia actualizada:`, presence);
  }

  /**
   * Limpia callbacks de un tenant
   * @param {string} tenantId - ID del tenant
   */
  removeCallbacks(tenantId) {
    this.messageCallbacks.delete(tenantId);
    this.statusCallbacks.delete(tenantId);
    logger.info(`[${tenantId}] Callbacks eliminados`);
  }

  /**
   * Obtiene estadísticas de eventos
   * @param {string} tenantId - ID del tenant
   * @returns {object}
   */
  getStats(tenantId) {
    return {
      hasMessageCallback: this.messageCallbacks.has(tenantId),
      hasStatusCallback: this.statusCallbacks.has(tenantId)
    };
  }
}

// Singleton instance
const eventHandlers = new EventHandlers();

module.exports = eventHandlers;
