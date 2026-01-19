/**
 * Message Queue Manager
 * Gestiona la cola de mensajes pendientes cuando el bot está desconectado
 * Persiste los mensajes en Firestore para sobrevivir a reinicios
 */

const pino = require('pino');
const firebaseService = require('../firebase-service');

const logger = pino({ level: 'info' });

class MessageQueue {
  constructor() {
    this.queues = new Map(); // tenantId -> array de mensajes
    this.processing = new Map(); // tenantId -> boolean
    this.initialized = false;
  }

  /**
   * Inicializa la cola, cargando mensajes pendientes desde Firestore
   */
  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Inicializando cola de mensajes desde Firestore...');
      const db = firebaseService.db;
      const snapshot = await db.collection('message_queue').get();

      let totalMessages = 0;
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const tenantId = data.tenantId;
        const messages = data.messages || [];

        if (messages.length > 0) {
          this.queues.set(tenantId, messages);
          totalMessages += messages.length;
          logger.info(`[${tenantId}] ${messages.length} mensajes pendientes cargados`);
        }
      }

      this.initialized = true;
      logger.info(`Cola inicializada: ${totalMessages} mensajes pendientes en total`);
    } catch (error) {
      logger.error('Error inicializando cola de mensajes:', error);
      this.initialized = true; // Continuar de todas formas
    }
  }

  /**
   * Agrega un mensaje a la cola
   * @param {string} tenantId - ID del tenant
   * @param {object} message - Mensaje en formato interno
   */
  async enqueue(tenantId, message) {
    try {
      // Asegurar que esté inicializado
      await this.initialize();

      // Obtener cola existente o crear nueva
      let queue = this.queues.get(tenantId) || [];

      // Agregar metadata del mensaje
      const queuedMessage = {
        ...message,
        queuedAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3
      };

      queue.push(queuedMessage);
      this.queues.set(tenantId, queue);

      // Persistir en Firestore
      await this.persistQueue(tenantId);

      logger.info(`[${tenantId}] Mensaje agregado a la cola (${queue.length} total)`);
    } catch (error) {
      logger.error(`[${tenantId}] Error agregando mensaje a la cola:`, error);
    }
  }

  /**
   * Procesa todos los mensajes pendientes de un tenant
   * @param {string} tenantId - ID del tenant
   * @param {function} processCallback - Función para procesar cada mensaje
   */
  async processQueue(tenantId, processCallback) {
    // Prevenir procesamiento concurrente
    if (this.processing.get(tenantId)) {
      logger.debug(`[${tenantId}] Cola ya en procesamiento, omitiendo`);
      return;
    }

    try {
      this.processing.set(tenantId, true);

      const queue = this.queues.get(tenantId) || [];
      if (queue.length === 0) {
        logger.debug(`[${tenantId}] No hay mensajes en cola`);
        return;
      }

      logger.info(`[${tenantId}] Procesando ${queue.length} mensajes en cola...`);

      const processedMessages = [];
      const failedMessages = [];

      for (const message of queue) {
        try {
          logger.info(`[${tenantId}] Procesando mensaje de ${message.from}: ${message.text?.substring(0, 50) || '[media]'}`);

          // Ejecutar callback de procesamiento
          await processCallback(message);

          processedMessages.push(message);
          logger.info(`[${tenantId}] Mensaje procesado exitosamente`);

        } catch (error) {
          logger.error(`[${tenantId}] Error procesando mensaje:`, error);

          // Incrementar intentos
          message.attempts = (message.attempts || 0) + 1;

          // Si no ha superado el máximo de intentos, mantener en cola
          if (message.attempts < message.maxAttempts) {
            failedMessages.push(message);
            logger.warn(`[${tenantId}] Mensaje reintentará (${message.attempts}/${message.maxAttempts})`);
          } else {
            logger.error(`[${tenantId}] Mensaje descartado después de ${message.attempts} intentos`);
            // Opcional: Guardar en cola de mensajes fallidos para revisión manual
            await this.saveToDeadLetterQueue(tenantId, message, error);
          }
        }
      }

      // Actualizar cola solo con mensajes fallidos
      this.queues.set(tenantId, failedMessages);
      await this.persistQueue(tenantId);

      logger.info(`[${tenantId}] Procesamiento completo: ${processedMessages.length} exitosos, ${failedMessages.length} pendientes`);

    } catch (error) {
      logger.error(`[${tenantId}] Error procesando cola:`, error);
    } finally {
      this.processing.set(tenantId, false);
    }
  }

  /**
   * Guarda la cola en Firestore
   * @private
   */
  async persistQueue(tenantId) {
    try {
      const db = firebaseService.db;
      const queue = this.queues.get(tenantId) || [];

      if (queue.length === 0) {
        // Si la cola está vacía, eliminar el documento
        await db.collection('message_queue').doc(tenantId).delete();
      } else {
        // Guardar cola actualizada
        await db.collection('message_queue').doc(tenantId).set({
          tenantId,
          messages: queue,
          updatedAt: new Date().toISOString()
        });
      }

      logger.debug(`[${tenantId}] Cola persistida en Firestore`);
    } catch (error) {
      logger.error(`[${tenantId}] Error persistiendo cola:`, error);
    }
  }

  /**
   * Guarda mensajes fallidos en una cola especial para revisión
   * @private
   */
  async saveToDeadLetterQueue(tenantId, message, error) {
    try {
      const db = firebaseService.db;
      await db.collection('dead_letter_queue').add({
        tenantId,
        message,
        error: error.message,
        stack: error.stack,
        failedAt: new Date().toISOString()
      });

      logger.info(`[${tenantId}] Mensaje guardado en dead letter queue`);
    } catch (err) {
      logger.error(`[${tenantId}] Error guardando en dead letter queue:`, err);
    }
  }

  /**
   * Obtiene el número de mensajes pendientes
   * @param {string} tenantId - ID del tenant
   * @returns {number}
   */
  getQueueSize(tenantId) {
    const queue = this.queues.get(tenantId) || [];
    return queue.length;
  }

  /**
   * Limpia la cola de un tenant
   * @param {string} tenantId - ID del tenant
   */
  async clearQueue(tenantId) {
    try {
      this.queues.delete(tenantId);
      await this.persistQueue(tenantId);
      logger.info(`[${tenantId}] Cola limpiada`);
    } catch (error) {
      logger.error(`[${tenantId}] Error limpiando cola:`, error);
    }
  }

  /**
   * Obtiene estadísticas de todas las colas
   * @returns {object}
   */
  getStats() {
    const stats = {
      totalQueues: this.queues.size,
      totalMessages: 0,
      queues: []
    };

    for (const [tenantId, queue] of this.queues.entries()) {
      stats.totalMessages += queue.length;
      stats.queues.push({
        tenantId,
        messageCount: queue.length,
        processing: this.processing.get(tenantId) || false
      });
    }

    return stats;
  }
}

// Singleton instance
const messageQueue = new MessageQueue();

module.exports = messageQueue;
