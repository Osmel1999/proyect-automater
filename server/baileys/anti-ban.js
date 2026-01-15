/**
 * Baileys Anti-Ban Service
 * Sistema de protección contra baneos de WhatsApp
 * Implementa rate limiting, delays y detección de patrones sospechosos
 */

const pino = require('pino');

const logger = pino({ level: 'info' });

class AntiBanService {
  constructor() {
    // Configuración por defecto
    this.config = {
      // Delays entre mensajes (milisegundos)
      minDelay: 2000,      // 2 segundos
      maxDelay: 5000,      // 5 segundos
      
      // Límites diarios por tenant
      dailyLimit: 1000,    // Máximo 1000 mensajes/día
      hourlyLimit: 150,    // Máximo 150 mensajes/hora
      minuteLimit: 25,     // Máximo 25 mensajes/minuto
      
      // Incremento gradual para números nuevos
      newNumberDailyLimit: 500,  // Límite más bajo para números nuevos
      
      // Cooldown después de alcanzar límites
      cooldownMinutes: 30,
      
      // Detección de spam
      maxSameMessage: 3,    // Máximo de mensajes idénticos consecutivos
      maxSameRecipient: 10  // Máximo de mensajes al mismo número en 1 hora
    };

    // Tracking de uso por tenant
    this.usage = new Map(); // tenantId -> usage stats
    this.messageQueue = new Map(); // tenantId -> queue
    this.lastMessages = new Map(); // tenantId -> last messages history
    this.recipientCounts = new Map(); // tenantId -> recipient counts
  }

  /**
   * Inicializa tracking para un tenant
   * @param {string} tenantId - ID del tenant
   * @param {object} options - Opciones de configuración
   */
  initTenant(tenantId, options = {}) {
    if (this.usage.has(tenantId)) {
      return;
    }

    this.usage.set(tenantId, {
      dailyCount: 0,
      hourlyCount: 0,
      minuteCount: 0,
      dailyResetTime: this.getNextDayTimestamp(),
      hourlyResetTime: this.getNextHourTimestamp(),
      minuteResetTime: this.getNextMinuteTimestamp(),
      isNewNumber: options.isNewNumber || false,
      createdAt: Date.now(),
      inCooldown: false,
      cooldownUntil: null
    });

    this.messageQueue.set(tenantId, []);
    this.lastMessages.set(tenantId, []);
    this.recipientCounts.set(tenantId, new Map());

    logger.info(`[${tenantId}] Anti-ban tracking inicializado`);
  }

  /**
   * Verifica si se puede enviar un mensaje
   * @param {string} tenantId - ID del tenant
   * @param {string} to - Número destino
   * @param {string} messageContent - Contenido del mensaje
   * @returns {object} { allowed, reason, waitTime }
   */
  canSendMessage(tenantId, to, messageContent) {
    // Inicializar si no existe
    if (!this.usage.has(tenantId)) {
      this.initTenant(tenantId);
    }

    const usage = this.usage.get(tenantId);

    // Reset de contadores si es necesario
    this.resetCountersIfNeeded(tenantId);

    // Verificar cooldown
    if (usage.inCooldown && Date.now() < usage.cooldownUntil) {
      const remainingMinutes = Math.ceil((usage.cooldownUntil - Date.now()) / 60000);
      return {
        allowed: false,
        reason: `Cooldown activo. Espera ${remainingMinutes} minutos.`,
        waitTime: usage.cooldownUntil - Date.now()
      };
    }

    // Verificar límites
    const dailyLimit = usage.isNewNumber ? this.config.newNumberDailyLimit : this.config.dailyLimit;

    if (usage.dailyCount >= dailyLimit) {
      return {
        allowed: false,
        reason: `Límite diario alcanzado (${dailyLimit} mensajes)`,
        waitTime: usage.dailyResetTime - Date.now()
      };
    }

    if (usage.hourlyCount >= this.config.hourlyLimit) {
      return {
        allowed: false,
        reason: `Límite por hora alcanzado (${this.config.hourlyLimit} mensajes)`,
        waitTime: usage.hourlyResetTime - Date.now()
      };
    }

    if (usage.minuteCount >= this.config.minuteLimit) {
      return {
        allowed: false,
        reason: `Límite por minuto alcanzado (${this.config.minuteLimit} mensajes)`,
        waitTime: usage.minuteResetTime - Date.now()
      };
    }

    // Detectar spam de mensajes idénticos
    const lastMessages = this.lastMessages.get(tenantId) || [];
    const identicalCount = lastMessages.filter(m => m.content === messageContent).length;
    
    if (identicalCount >= this.config.maxSameMessage) {
      return {
        allowed: false,
        reason: 'Patrón de spam detectado: mensajes idénticos consecutivos',
        waitTime: 60000 // 1 minuto
      };
    }

    // Detectar spam al mismo destinatario
    const recipientCounts = this.recipientCounts.get(tenantId);
    const recipientCount = recipientCounts.get(to) || 0;
    
    if (recipientCount >= this.config.maxSameRecipient) {
      return {
        allowed: false,
        reason: `Demasiados mensajes al mismo número (${recipientCount})`,
        waitTime: 3600000 // 1 hora
      };
    }

    return {
      allowed: true,
      reason: 'OK',
      waitTime: 0
    };
  }

  /**
   * Registra un mensaje enviado
   * @param {string} tenantId - ID del tenant
   * @param {string} to - Número destino
   * @param {string} messageContent - Contenido del mensaje
   */
  recordMessageSent(tenantId, to, messageContent) {
    const usage = this.usage.get(tenantId);
    if (!usage) return;

    // Incrementar contadores
    usage.dailyCount++;
    usage.hourlyCount++;
    usage.minuteCount++;

    // Actualizar historial de mensajes
    const lastMessages = this.lastMessages.get(tenantId);
    lastMessages.push({
      content: messageContent,
      to,
      timestamp: Date.now()
    });

    // Mantener solo últimos 10 mensajes
    if (lastMessages.length > 10) {
      lastMessages.shift();
    }

    // Actualizar contador de destinatario
    const recipientCounts = this.recipientCounts.get(tenantId);
    recipientCounts.set(to, (recipientCounts.get(to) || 0) + 1);

    // Limpiar contadores de destinatarios antiguos (>1 hora)
    this.cleanOldRecipientCounts(tenantId);

    logger.debug(`[${tenantId}] Mensaje registrado. Totales: día=${usage.dailyCount}, hora=${usage.hourlyCount}, min=${usage.minuteCount}`);

    // Verificar si se alcanzaron límites críticos
    if (usage.dailyCount >= this.config.dailyLimit * 0.9) {
      logger.warn(`[${tenantId}] ⚠️  Cerca del límite diario: ${usage.dailyCount}/${this.config.dailyLimit}`);
    }
  }

  /**
   * Calcula el delay aleatorio entre mensajes
   * @param {string} tenantId - ID del tenant
   * @returns {number} Delay en milisegundos
   */
  calculateDelay(tenantId) {
    const usage = this.usage.get(tenantId);
    
    // Delay base aleatorio
    let delay = Math.floor(
      Math.random() * (this.config.maxDelay - this.config.minDelay) + this.config.minDelay
    );

    // Aumentar delay si se está cerca de límites
    if (usage) {
      const dailyLimit = usage.isNewNumber ? this.config.newNumberDailyLimit : this.config.dailyLimit;
      const dailyUsage = usage.dailyCount / dailyLimit;
      
      if (dailyUsage > 0.8) {
        delay *= 1.5; // 50% más de delay si está al 80%
      }
      
      if (usage.minuteCount > this.config.minuteLimit * 0.7) {
        delay *= 2; // Doble delay si está al 70% del límite por minuto
      }
    }

    return Math.floor(delay);
  }

  /**
   * Espera el delay calculado
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<void>}
   */
  async applyDelay(tenantId) {
    const delay = this.calculateDelay(tenantId);
    logger.debug(`[${tenantId}] Aplicando delay de ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Activa cooldown para un tenant
   * @param {string} tenantId - ID del tenant
   * @param {number} minutes - Minutos de cooldown
   */
  activateCooldown(tenantId, minutes = null) {
    const usage = this.usage.get(tenantId);
    if (!usage) return;

    const cooldownMinutes = minutes || this.config.cooldownMinutes;
    usage.inCooldown = true;
    usage.cooldownUntil = Date.now() + (cooldownMinutes * 60000);

    logger.warn(`[${tenantId}] ⚠️  Cooldown activado por ${cooldownMinutes} minutos`);
  }

  /**
   * Desactiva cooldown para un tenant
   * @param {string} tenantId - ID del tenant
   */
  deactivateCooldown(tenantId) {
    const usage = this.usage.get(tenantId);
    if (!usage) return;

    usage.inCooldown = false;
    usage.cooldownUntil = null;

    logger.info(`[${tenantId}] Cooldown desactivado`);
  }

  /**
   * Obtiene estadísticas de uso de un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {object}
   */
  getUsageStats(tenantId) {
    const usage = this.usage.get(tenantId);
    if (!usage) {
      return { error: 'Tenant not initialized' };
    }

    const dailyLimit = usage.isNewNumber ? this.config.newNumberDailyLimit : this.config.dailyLimit;

    return {
      daily: {
        count: usage.dailyCount,
        limit: dailyLimit,
        percentage: Math.round((usage.dailyCount / dailyLimit) * 100),
        remaining: dailyLimit - usage.dailyCount
      },
      hourly: {
        count: usage.hourlyCount,
        limit: this.config.hourlyLimit,
        percentage: Math.round((usage.hourlyCount / this.config.hourlyLimit) * 100),
        remaining: this.config.hourlyLimit - usage.hourlyCount
      },
      minute: {
        count: usage.minuteCount,
        limit: this.config.minuteLimit,
        percentage: Math.round((usage.minuteCount / this.config.minuteLimit) * 100),
        remaining: this.config.minuteLimit - usage.minuteCount
      },
      cooldown: {
        active: usage.inCooldown,
        until: usage.cooldownUntil,
        remainingMinutes: usage.cooldownUntil ? Math.ceil((usage.cooldownUntil - Date.now()) / 60000) : 0
      },
      isNewNumber: usage.isNewNumber,
      accountAge: Math.floor((Date.now() - usage.createdAt) / 86400000) // días
    };
  }

  /**
   * Actualiza configuración de un tenant
   * @param {string} tenantId - ID del tenant
   * @param {object} config - Nueva configuración
   */
  updateConfig(tenantId, config) {
    // Actualizar configuración global o por tenant
    // Por ahora solo actualizamos global
    Object.assign(this.config, config);
    logger.info(`[${tenantId}] Configuración actualizada`);
  }

  /**
   * Incrementa gradualmente los límites de un número nuevo
   * @param {string} tenantId - ID del tenant
   */
  graduateNumber(tenantId) {
    const usage = this.usage.get(tenantId);
    if (!usage) return;

    const accountAgeDays = (Date.now() - usage.createdAt) / 86400000;

    // Después de 7 días, ya no es "nuevo"
    if (accountAgeDays >= 7) {
      usage.isNewNumber = false;
      logger.info(`[${tenantId}] Número graduado a límites completos`);
    }
  }

  /**
   * Reset de contadores si es necesario
   * @private
   */
  resetCountersIfNeeded(tenantId) {
    const usage = this.usage.get(tenantId);
    const now = Date.now();

    if (now >= usage.dailyResetTime) {
      usage.dailyCount = 0;
      usage.dailyResetTime = this.getNextDayTimestamp();
      logger.info(`[${tenantId}] Reset contador diario`);
      
      // Graduar número si es necesario
      this.graduateNumber(tenantId);
    }

    if (now >= usage.hourlyResetTime) {
      usage.hourlyCount = 0;
      usage.hourlyResetTime = this.getNextHourTimestamp();
      logger.debug(`[${tenantId}] Reset contador horario`);
    }

    if (now >= usage.minuteResetTime) {
      usage.minuteCount = 0;
      usage.minuteResetTime = this.getNextMinuteTimestamp();
    }

    // Desactivar cooldown si expiró
    if (usage.inCooldown && now >= usage.cooldownUntil) {
      this.deactivateCooldown(tenantId);
    }
  }

  /**
   * Limpia contadores de destinatarios antiguos
   * @private
   */
  cleanOldRecipientCounts(tenantId) {
    // Implementación simple: limpiar todos cada hora
    // En producción, deberías guardar timestamps y limpiar selectivamente
    const usage = this.usage.get(tenantId);
    if (Date.now() >= usage.hourlyResetTime) {
      const recipientCounts = this.recipientCounts.get(tenantId);
      recipientCounts.clear();
      logger.debug(`[${tenantId}] Contadores de destinatarios limpiados`);
    }
  }

  /**
   * Utilidades de timestamp
   * @private
   */
  getNextDayTimestamp() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  getNextHourTimestamp() {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    return nextHour.getTime();
  }

  getNextMinuteTimestamp() {
    const nextMinute = new Date();
    nextMinute.setMinutes(nextMinute.getMinutes() + 1, 0, 0);
    return nextMinute.getTime();
  }

  /**
   * Limpia datos de un tenant
   * @param {string} tenantId - ID del tenant
   */
  cleanup(tenantId) {
    this.usage.delete(tenantId);
    this.messageQueue.delete(tenantId);
    this.lastMessages.delete(tenantId);
    this.recipientCounts.delete(tenantId);
    logger.info(`[${tenantId}] Datos de anti-ban limpiados`);
  }
}

// Singleton instance
const antiBanService = new AntiBanService();

module.exports = antiBanService;
