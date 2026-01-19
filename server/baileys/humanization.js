/**
 * Humanization Service
 * Simula comportamiento humano en WhatsApp para evitar detección de bots
 * - Delays variables antes de marcar como leído
 * - Estado de "escribiendo..." con duración proporcional
 * - Variabilidad en tiempos de respuesta
 */

const pino = require('pino');
const logger = pino({ level: 'info' });

class HumanizationService {
  constructor() {
    // Configuración de tiempos (en milisegundos)
    // Valores por defecto que pueden ser sobrescritos por variables de entorno
    this.config = {
      // Delay antes de marcar como leído
      readDelay: {
        min: Number.parseInt(process.env.HUMANIZATION_READ_DELAY_MIN, 10) || 800,    // 0.8 segundos
        max: Number.parseInt(process.env.HUMANIZATION_READ_DELAY_MAX, 10) || 5000    // 5 segundos
      },
      
      // Delay de "pensamiento" antes de empezar a escribir
      thinkingDelay: {
        min: Number.parseInt(process.env.HUMANIZATION_THINKING_DELAY_MIN, 10) || 500,    // 0.5 segundos
        max: Number.parseInt(process.env.HUMANIZATION_THINKING_DELAY_MAX, 10) || 2500    // 2.5 segundos
      },
      
      // Velocidad de escritura simulada (caracteres por minuto)
      typingSpeed: {
        min: Number.parseInt(process.env.HUMANIZATION_TYPING_SPEED_MIN, 10) || 40,     // Escritura lenta (pensando)
        max: Number.parseInt(process.env.HUMANIZATION_TYPING_SPEED_MAX, 10) || 80      // Escritura rápida
      },
      
      // Variabilidad adicional (jitter) en porcentaje
      jitter: Number.parseFloat(process.env.HUMANIZATION_JITTER) || 0.3,  // ±30% del valor calculado
      
      // Duración mínima y máxima del estado "escribiendo"
      typingDuration: {
        min: Number.parseInt(process.env.HUMANIZATION_TYPING_DURATION_MIN, 10) || 1000,   // 1 segundo mínimo
        max: Number.parseInt(process.env.HUMANIZATION_TYPING_DURATION_MAX, 10) || 15000   // 15 segundos máximo
      },
      
      // Activar/desactivar globalmente
      enabled: process.env.HUMANIZATION_ENABLED !== 'false'  // true por defecto
    };
    
    // Log de configuración al inicializar
    logger.info('🎭 Humanization Service inicializado con configuración:');
    logger.info(`   Read delay: ${this.config.readDelay.min}-${this.config.readDelay.max}ms`);
    logger.info(`   Thinking delay: ${this.config.thinkingDelay.min}-${this.config.thinkingDelay.max}ms`);
    logger.info(`   Typing speed: ${this.config.typingSpeed.min}-${this.config.typingSpeed.max} cpm`);
    logger.info(`   Jitter: ±${this.config.jitter * 100}%`);
    logger.info(`   Enabled: ${this.config.enabled}`);
  }

  /**
   * Genera un número aleatorio entre min y max
   * @private
   */
  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Genera un número aleatorio con distribución más natural (gaussiana aproximada)
   * @private
   */
  randomGaussian(min, max) {
    // Suma de 3 valores aleatorios da una distribución más natural
    const u1 = Math.random();
    const u2 = Math.random();
    const u3 = Math.random();
    const avg = (u1 + u2 + u3) / 3;
    
    return Math.floor(min + avg * (max - min));
  }

  /**
   * Calcula el delay antes de marcar un mensaje como leído
   * @returns {number} Delay en milisegundos
   */
  calculateReadDelay() {
    const delay = this.randomGaussian(
      this.config.readDelay.min,
      this.config.readDelay.max
    );
    
    logger.debug(`📖 Read delay calculado: ${delay}ms`);
    return delay;
  }

  /**
   * Calcula el delay de "pensamiento" antes de empezar a escribir
   * @returns {number} Delay en milisegundos
   */
  calculateThinkingDelay() {
    const delay = this.randomBetween(
      this.config.thinkingDelay.min,
      this.config.thinkingDelay.max
    );
    
    logger.debug(`💭 Thinking delay calculado: ${delay}ms`);
    return delay;
  }

  /**
   * Calcula la duración del estado "escribiendo..." basado en la longitud del mensaje
   * @param {string} messageText - Texto del mensaje a enviar
   * @returns {number} Duración en milisegundos
   */
  calculateTypingDuration(messageText) {
    // Obtener longitud del mensaje
    const length = messageText.length;
    
    // Seleccionar velocidad de escritura aleatoria
    const charsPerMinute = this.randomBetween(
      this.config.typingSpeed.min,
      this.config.typingSpeed.max
    );
    
    // Calcular tiempo base de escritura
    const baseTypingTime = (length / charsPerMinute) * 60000;
    
    // Agregar variabilidad (jitter)
    const jitterPercent = (Math.random() * 2 - 1) * this.config.jitter; // -30% a +30%
    const jitter = baseTypingTime * jitterPercent;
    
    // Calcular duración total
    let duration = Math.floor(baseTypingTime + jitter);
    
    // Aplicar límites mínimos y máximos
    duration = Math.max(this.config.typingDuration.min, duration);
    duration = Math.min(this.config.typingDuration.max, duration);
    
    logger.debug(`⌨️  Typing duration: ${duration}ms (${length} chars, ${charsPerMinute} cpm)`);
    return duration;
  }

  /**
   * Espera un tiempo específico (promesa)
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Simula el delay antes de marcar como leído
   * @returns {Promise<void>}
   */
  async simulateReadDelay() {
    const delay = this.calculateReadDelay();
    logger.info(`⏳ Esperando ${delay}ms antes de marcar como leído...`);
    await this.sleep(delay);
  }

  /**
   * Simula el delay de pensamiento antes de escribir
   * @returns {Promise<void>}
   */
  async simulateThinkingDelay() {
    const delay = this.calculateThinkingDelay();
    logger.info(`💭 Pensando respuesta (${delay}ms)...`);
    await this.sleep(delay);
  }

  /**
   * Simula el estado de "escribiendo..." por un tiempo calculado
   * @param {string} messageText - Texto del mensaje
   * @returns {Promise<number>} Duración del typing en ms
   */
  async simulateTyping(messageText) {
    const duration = this.calculateTypingDuration(messageText);
    logger.info(`⌨️  Escribiendo (${duration}ms)...`);
    await this.sleep(duration);
    return duration;
  }

  /**
   * Flujo completo de humanización para responder a un mensaje
   * @param {object} socket - Socket de Baileys
   * @param {string} jid - JID del destinatario
   * @param {object} messageKey - Key del mensaje recibido
   * @param {string} responseText - Texto de la respuesta a enviar
   * @param {object} options - Opciones adicionales
   * @returns {Promise<object>} Resultado del flujo
   */
  async humanizedResponse(socket, jid, messageKey, responseText, options = {}) {
    const startTime = Date.now();
    const stats = {
      readDelay: 0,
      thinkingDelay: 0,
      typingDuration: 0,
      totalTime: 0
    };

    try {
      // 1. Esperar antes de marcar como leído (simular tiempo de lectura)
      if (!options.skipReadDelay) {
        await this.simulateReadDelay();
        stats.readDelay = Date.now() - startTime;
        
        // Marcar como leído
        if (messageKey && socket.readMessages) {
          await socket.readMessages([messageKey]);
          logger.info(`✅ Mensaje marcado como leído`);
        }
      }

      // 2. Delay de pensamiento antes de empezar a escribir
      if (!options.skipThinkingDelay) {
        await this.simulateThinkingDelay();
        stats.thinkingDelay = Date.now() - startTime - stats.readDelay;
      }

      // 3. Enviar estado de "escribiendo..."
      if (!options.skipTypingIndicator && socket.sendPresenceUpdate) {
        await socket.sendPresenceUpdate('composing', jid);
        logger.info(`✍️  Estado "escribiendo..." activado`);
      }

      // 4. Simular tiempo de escritura
      if (!options.skipTypingDuration) {
        const typingStart = Date.now();
        await this.simulateTyping(responseText);
        stats.typingDuration = Date.now() - typingStart;
      }

      // 5. Enviar el mensaje
      const result = await socket.sendMessage(jid, { text: responseText });
      logger.info(`📤 Mensaje enviado`);

      // 6. Pausar el estado de "escribiendo..."
      if (!options.skipTypingIndicator && socket.sendPresenceUpdate) {
        await socket.sendPresenceUpdate('paused', jid);
        logger.info(`⏸️  Estado "escribiendo..." desactivado`);
      }

      stats.totalTime = Date.now() - startTime;

      logger.info(`📊 Stats de humanización: read=${stats.readDelay}ms, think=${stats.thinkingDelay}ms, type=${stats.typingDuration}ms, total=${stats.totalTime}ms`);

      return {
        success: true,
        stats,
        messageId: result.key.id
      };

    } catch (error) {
      logger.error('❌ Error en humanizedResponse:', error);
      
      // Intentar limpiar estado si hay error
      try {
        if (socket.sendPresenceUpdate) {
          await socket.sendPresenceUpdate('paused', jid);
        }
      } catch (cleanupError) {
        // Ignorar errores de cleanup - el socket podría estar desconectado
        logger.debug('Error en cleanup de presencia (ignorado):', cleanupError.message);
      }

      throw error;
    }
  }

  /**
   * Versión simplificada: solo marca como leído con delay humanizado
   * @param {object} socket - Socket de Baileys
   * @param {object} messageKey - Key del mensaje
   * @returns {Promise<void>}
   */
  async humanizedRead(socket, messageKey) {
    try {
      // Esperar antes de marcar como leído
      await this.simulateReadDelay();
      
      // Marcar como leído
      if (messageKey && socket.readMessages) {
        await socket.readMessages([messageKey]);
        logger.info(`✅ Mensaje marcado como leído (humanizado)`);
      }
    } catch (error) {
      logger.error('❌ Error en humanizedRead:', error);
      throw error;
    }
  }

  /**
   * Obtiene configuración actual
   * @returns {object}
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Actualiza configuración
   * @param {object} newConfig - Nueva configuración (parcial)
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    logger.info('⚙️  Configuración de humanización actualizada:', this.config);
  }
}

// Singleton instance
const humanizationService = new HumanizationService();

module.exports = humanizationService;
