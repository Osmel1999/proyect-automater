/**
 * Baileys Event Handlers
 * Maneja los eventos de mensajes y conexión de Baileys
 */

const pino = require('pino');
const messageAdapter = require('./message-adapter');
const storage = require('./storage');
const connectionManager = require('./connection-manager');
const messageQueue = require('./message-queue');

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
    console.log(`🔍 [DEBUG] baileysMessage.key:`, JSON.stringify(baileysMessage.key, null, 2));
    console.log(`🔍 [DEBUG] baileysMessage.message:`, JSON.stringify(baileysMessage.message, null, 2));
    
    try {
      // 🛡️ FILTRO 1: Ignorar mensajes del bot (evitar loops)
      const isFromBot = messageAdapter.isFromBot(baileysMessage);
      console.log(`🔍 [DEBUG] isFromBot result: ${isFromBot}`);
      
      if (isFromBot) {
        console.log(`🔄 [ANTI-LOOP] Mensaje propio ignorado - fromMe=true`);
        logger.debug(`[${tenantId}] Mensaje propio ignorado`);
        return;
      }

      // 🛡️ FILTRO 2: Ignorar mensajes de protocolo de WhatsApp (notificaciones de sistema)
      if (baileysMessage.message?.protocolMessage) {
        const protocolType = baileysMessage.message.protocolMessage.type;
        console.log(`🔄 [PROTOCOL-MSG] Mensaje de protocolo ignorado - type=${protocolType}`);
        logger.debug(`[${tenantId}] Mensaje de protocolo ignorado: ${protocolType}`);
        return;
      }

      // 🛡️ FILTRO 3: Ignorar mensajes vacíos (sin texto ni media)
      const messageContent = baileysMessage.message;
      const hasContent = messageContent && (
        messageContent.conversation ||
        messageContent.extendedTextMessage ||
        messageContent.imageMessage ||
        messageContent.videoMessage ||
        messageContent.audioMessage ||
        messageContent.documentMessage ||
        messageContent.stickerMessage ||
        messageContent.locationMessage ||
        messageContent.contactMessage
      );
      
      if (!hasContent) {
        console.log(`🔄 [EMPTY-MSG] Mensaje vacío ignorado - sin contenido válido`);
        logger.debug(`[${tenantId}] Mensaje vacío ignorado`);
        return;
      }

      console.log(`✅ [DEBUG] No es mensaje del bot, convirtiendo a formato interno`);
      
      // Convertir a formato interno
      const internalMessage = messageAdapter.baileysToInternal(baileysMessage);
      
      console.log(`🔍 [DEBUG] Mensaje convertido:`, JSON.stringify(internalMessage, null, 2));
      
      // Agregar tenantId al mensaje
      internalMessage.tenantId = tenantId;
      
      logger.info(`[${tenantId}] Mensaje recibido de ${internalMessage.from}: ${internalMessage.text?.substring(0, 50) || '[media]'}`);

      // 🧪 COMANDO DE PRUEBA DEL TÚNEL
      if (internalMessage.text?.trim().toLowerCase() === '/test-tunel') {
        logger.info(`[${tenantId}] 🧪 Comando /test-tunel recibido - enviando imagen de prueba`);
        
        try {
          const sessionManager = require('./session-manager');
          const socket = sessionManager.getSession(tenantId);
          
          if (socket) {
            // URL de una imagen pública para probar
            const testImageUrl = 'https://picsum.photos/800/600';
            
            logger.info(`[${tenantId}] 📤 Descargando imagen de prueba: ${testImageUrl}`);
            
            // Enviar imagen (esto forzará uso del fetchAgent y el túnel)
            await socket.sendMessage(internalMessage.from, {
              image: { url: testImageUrl },
              caption: '🧪 Test del Túnel\n\n✅ Si ves esta imagen, el túnel está funcionando!\n\n📊 Verifica los logs del servidor para confirmar que la petición HTTP se hizo vía túnel.'
            });
            
            logger.info(`[${tenantId}] ✅ Imagen de prueba enviada con éxito`);
          }
        } catch (error) {
          logger.error(`[${tenantId}] ❌ Error enviando imagen de prueba:`, error.message);
          logger.error(`[${tenantId}] ❌ Stack trace:`, error.stack);
          
          // Intentar enviar mensaje de error al usuario
          try {
            const sessionManager = require('./session-manager');
            const socket = sessionManager.getSession(tenantId);
            if (socket) {
              await socket.sendMessage(internalMessage.from, {
                text: `❌ Error en test del túnel:\n\n${error.message}\n\nVerifica los logs del servidor.`
              });
            }
          } catch (e) {
            logger.error(`[${tenantId}] No se pudo enviar mensaje de error`);
          }
        }
        
        return; // No procesar más este mensaje
      }

      // 🚀 AUTO-RECONEXIÓN: Verificar conexión antes de procesar
      const isConnected = await connectionManager.ensureConnected(tenantId);
      
      if (!isConnected) {
        logger.warn(`[${tenantId}] Bot desconectado, agregando mensaje a la cola`);
        
        // Agregar mensaje a la cola si no está conectado
        await messageQueue.enqueue(tenantId, internalMessage);
        
        // Marcar como leído para no parecer ignorado
        await messageAdapter.markAsRead(tenantId, baileysMessage.key, true);
        return;
      }

      // Emitir evento WebSocket
      if (globalThis.baileysWebSocket) {
        globalThis.baileysWebSocket.emitMessageReceived(tenantId, internalMessage);
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
          
          // Si el callback retorna null/undefined, significa que el bot está desactivado
          // o no pudo procesar el mensaje. Solo marcar como leído con humanización.
          // Si retorna true, significa que se procesó y envió correctamente.
          if (response === null || response === undefined) {
            console.log(`🔍 [DEBUG] Respuesta null/undefined, bot desactivado o sin respuesta`);
            logger.info(`[${tenantId}] Bot desactivado o sin respuesta, solo marcando como leído con humanización`);
            
            // Marcar como leído con delay humanizado
            await messageAdapter.markAsRead(tenantId, baileysMessage.key, true);
            return;
          }
          
          console.log(`🔍 [DEBUG] Mensaje procesado correctamente`);
          
          // NOTA: El marcado como leído y la humanización ahora se manejan
          // dentro de messageAdapter.sendMessage() si se pasa messageKey en las opciones.
          // Ya no marcamos aquí para evitar duplicados.
          
          logger.info(`[${tenantId}] Mensaje procesado con éxito`);
        } catch (error) {
          console.error(`🔍 [DEBUG] Error en callback:`, error);
          logger.error(`[${tenantId}] Error en callback de mensaje:`, error);
        }
      } else {
        console.log(`🔍 [DEBUG] NO HAY CALLBACK REGISTRADO`);
        logger.warn(`[${tenantId}] No hay callback registrado para mensajes`);
        
        // Marcar como leído con delay humanizado de todos modos
        await messageAdapter.markAsRead(tenantId, baileysMessage.key, true);
        logger.info(`[${tenantId}] Mensaje marcado como leído (humanizado)`);
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
   * Procesa la cola de mensajes pendientes después de reconectar
   * @param {string} tenantId - ID del tenant
   */
  async processQueuedMessages(tenantId) {
    try {
      const queueSize = messageQueue.getQueueSize(tenantId);
      
      if (queueSize === 0) {
        logger.debug(`[${tenantId}] No hay mensajes en cola para procesar`);
        return;
      }

      logger.info(`[${tenantId}] Procesando ${queueSize} mensajes en cola...`);

      // Obtener callback registrado
      let callback = this.messageCallbacks.get(tenantId);
      if (!callback) {
        callback = this.messageCallbacks.get('*');
      }

      if (!callback) {
        logger.warn(`[${tenantId}] No hay callback registrado, limpiando cola`);
        await messageQueue.clearQueue(tenantId);
        return;
      }

      // Procesar todos los mensajes en cola
      await messageQueue.processQueue(tenantId, async (message) => {
        logger.info(`[${tenantId}] Procesando mensaje en cola de ${message.from}`);
        
        // Ejecutar callback
        const response = await callback(message);
        
        // Si hay respuesta, no necesitamos hacer nada más
        // (el callback ya envió la respuesta)
        if (response === null || response === undefined) {
          logger.info(`[${tenantId}] Mensaje en cola procesado (sin respuesta)`);
        } else {
          logger.info(`[${tenantId}] Mensaje en cola procesado exitosamente`);
        }
      });

      logger.info(`[${tenantId}] Cola procesada completamente`);
    } catch (error) {
      logger.error(`[${tenantId}] Error procesando cola de mensajes:`, error);
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
      if (globalThis.baileysWebSocket) {
        const status = state === 'open' ? 'connected' : 'disconnected';
        globalThis.baileysWebSocket.emitConnectionStatus(tenantId, status, info);
      }

      // Guardar estado en Firebase
      await storage.saveConnectionState(tenantId, {
        connected: state === 'open',
        phoneNumber: info.phoneNumber || null,
        lastSeen: new Date().toISOString(),
        messageCount: info.messageCount || 0
      });

      // 🚀 Procesar mensajes en cola si la conexión es reestablecida
      if (state === 'open') {
        logger.info(`[${tenantId}] Conexión reestablecida, procesando mensajes en cola...`);
        
        // Procesar cola en segundo plano (no bloqueante)
        setImmediate(async () => {
          try {
            await this.processQueuedMessages(tenantId);
          } catch (error) {
            logger.error(`[${tenantId}] Error procesando cola después de reconexión:`, error);
          }
        });
      }

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
