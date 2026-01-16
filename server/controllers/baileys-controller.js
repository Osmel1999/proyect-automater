/**
 * Baileys Controller
 * Maneja las peticiones HTTP para operaciones de WhatsApp con Baileys
 */

const baileys = require('../baileys');
const logger = require('pino')({ level: 'info' });

// Store para QR codes temporales (en memoria)
const qrStore = new Map();

// Store para estado de conexión
const connectionStore = new Map();

// Suscribirse a eventos de QR del SessionManager
const sessionManager = baileys.getSessionManager();

// Escuchar eventos de QR
sessionManager.on('qr', (tenantId, qr) => {
  logger.info(`[${tenantId}] QR recibido en controller, almacenando...`);
  qrStore.set(tenantId, {
    qr,
    timestamp: Date.now()
  });
});

// Escuchar eventos de conexión
sessionManager.on('connected', (tenantId, phoneNumber) => {
  logger.info(`[${tenantId}] Conexión establecida en controller`);
  connectionStore.set(tenantId, {
    phoneNumber,
    timestamp: Date.now(),
    reason: 'connected'
  });
  // Limpiar QR al conectar
  qrStore.delete(tenantId);
});

// Escuchar eventos de desconexión
sessionManager.on('disconnected', (tenantId) => {
  logger.info(`[${tenantId}] Desconexión en controller`);
  connectionStore.set(tenantId, {
    phoneNumber: null,
    timestamp: Date.now(),
    reason: 'disconnected'
  });
});

class BaileysController {
  /**
   * POST /api/baileys/connect
   * Inicia una nueva sesión Baileys para un tenant
   */
  async connect(req, res) {
    try {
      const { tenantId } = req.body;

      if (!tenantId) {
        return res.status(400).json({ 
          error: 'tenantId es requerido' 
        });
      }

      logger.info(`[${tenantId}] Iniciando conexión Baileys desde API`);

      // Verificar si ya está conectado
      const isConnected = await baileys.isConnected(tenantId);
      if (isConnected) {
        return res.json({ 
          success: true, 
          message: 'Ya estás conectado',
          connected: true 
        });
      }

      // Iniciar sesión (el QR se enviará por eventos)
      const result = await baileys.initializeSession(tenantId);

      if (!result.success) {
        throw new Error(result.error || 'Error al inicializar sesión');
      }

      // Nota: El QR se capturará por eventos, no aquí
      logger.info(`[${tenantId}] Sesión iniciada, esperando QR por eventos...`);

      res.json({ 
        success: true,
        message: result.message,
        method: result.method
      });

    } catch (error) {
      logger.error('Error en connect:', error);
      res.status(500).json({ 
        error: error.message || 'Error al conectar' 
      });
    }
  }

  /**
   * GET /api/baileys/qr
   * Obtiene el QR code actual para escanear
   */
  async getQR(req, res) {
    try {
      const { tenantId } = req.query;

      if (!tenantId) {
        return res.status(400).json({ 
          error: 'tenantId es requerido' 
        });
      }

      // Verificar si ya está conectado
      const isConnected = await baileys.isConnected(tenantId);
      if (isConnected) {
        return res.json({ 
          connected: true,
          message: 'Ya estás conectado'
        });
      }

      // Obtener QR del store
      const qrData = qrStore.get(tenantId);

      if (!qrData) {
        return res.json({ 
          qr: null,
          connected: false,
          message: 'QR no disponible. Inicia una conexión primero.'
        });
      }

      // Verificar si el QR no ha expirado (30 segundos)
      const age = Date.now() - qrData.timestamp;
      if (age > 30000) {
        qrStore.delete(tenantId);
        return res.json({ 
          qr: null,
          connected: false,
          expired: true,
          message: 'QR expirado. Se generará uno nuevo.'
        });
      }

      res.json({ 
        qr: qrData.qr,
        connected: false,
        expiresIn: Math.max(0, 30000 - age)
      });

    } catch (error) {
      logger.error('Error en getQR:', error);
      res.status(500).json({ 
        error: error.message || 'Error al obtener QR' 
      });
    }
  }

  /**
   * POST /api/baileys/disconnect
   * Desconecta la sesión de WhatsApp
   */
  async disconnect(req, res) {
    try {
      const { tenantId } = req.body;

      if (!tenantId) {
        return res.status(400).json({ 
          error: 'tenantId es requerido' 
        });
      }

      logger.info(`[${tenantId}] Desconectando desde API`);

      await baileys.disconnect(tenantId);

      // Limpiar stores
      qrStore.delete(tenantId);
      connectionStore.delete(tenantId);

      res.json({ 
        success: true,
        message: 'Desconectado exitosamente'
      });

    } catch (error) {
      logger.error('Error en disconnect:', error);
      res.status(500).json({ 
        error: error.message || 'Error al desconectar' 
      });
    }
  }

  /**
   * GET /api/baileys/status
   * Obtiene el estado actual de la conexión
   */
  async getStatus(req, res) {
    try {
      const { tenantId } = req.query;

      if (!tenantId) {
        return res.status(400).json({ 
          error: 'tenantId es requerido' 
        });
      }

      const isConnected = await baileys.isConnected(tenantId);
      const connectionData = connectionStore.get(tenantId);

      const status = {
        connected: isConnected,
        phoneNumber: connectionData?.phoneNumber || null,
        lastUpdate: connectionData?.timestamp || null,
        reason: connectionData?.reason || null
      };

      res.json(status);

    } catch (error) {
      logger.error('Error en getStatus:', error);
      res.status(500).json({ 
        error: error.message || 'Error al obtener estado' 
      });
    }
  }

  /**
   * GET /api/baileys/stats
   * Obtiene estadísticas de uso y anti-ban
   */
  async getStats(req, res) {
    try {
      const { tenantId } = req.query;

      if (!tenantId) {
        return res.status(400).json({ 
          error: 'tenantId es requerido' 
        });
      }

      const stats = baileys.getAntiBanStats(tenantId);

      res.json(stats);

    } catch (error) {
      logger.error('Error en getStats:', error);
      res.status(500).json({ 
        error: error.message || 'Error al obtener estadísticas' 
      });
    }
  }

  /**
   * POST /api/baileys/send
   * Envía un mensaje a través de WhatsApp
   */
  async sendMessage(req, res) {
    try {
      const { tenantId, to, text, type = 'text', mediaUrl, caption } = req.body;

      if (!tenantId || !to || !text) {
        return res.status(400).json({ 
          error: 'tenantId, to y text son requeridos' 
        });
      }

      // Verificar conexión
      const isConnected = await baileys.isConnected(tenantId);
      if (!isConnected) {
        return res.status(400).json({ 
          error: 'WhatsApp no está conectado. Conecta primero.' 
        });
      }

      // Enviar mensaje
      const message = {
        to,
        text,
        type,
        mediaUrl,
        caption
      };

      const result = await baileys.sendMessage(tenantId, message);

      res.json({ 
        success: true,
        messageId: result.key?.id,
        timestamp: result.messageTimestamp
      });

    } catch (error) {
      logger.error('Error en sendMessage:', error);
      
      // Mensaje específico si es por anti-ban
      if (error.message.includes('Cooldown') || error.message.includes('Límite')) {
        return res.status(429).json({ 
          error: 'Rate limit alcanzado',
          message: error.message,
          retryAfter: error.waitTime || 60000
        });
      }

      res.status(500).json({ 
        error: error.message || 'Error al enviar mensaje' 
      });
    }
  }

  /**
   * GET /api/baileys/chats
   * Lista todos los chats activos
   */
  async getChats(req, res) {
    try {
      const { tenantId, limit = 50 } = req.query;

      if (!tenantId) {
        return res.status(400).json({ 
          error: 'tenantId es requerido' 
        });
      }

      // Por ahora retornamos estructura vacía
      // NOTA: Se implementará en Fase 4 (Integración con Firebase)
      const chats = [];

      res.json({ 
        chats,
        count: chats.length,
        limit: Number.parseInt(limit, 10)
      });

    } catch (error) {
      logger.error('Error en getChats:', error);
      res.status(500).json({ 
        error: error.message || 'Error al obtener chats' 
      });
    }
  }

  /**
   * GET /api/baileys/messages
   * Obtiene mensajes de un chat específico
   */
  async getMessages(req, res) {
    try {
      const { tenantId, chatId, limit = 50 } = req.query;

      if (!tenantId || !chatId) {
        return res.status(400).json({ 
          error: 'tenantId y chatId son requeridos' 
        });
      }

      // Por ahora retornamos estructura vacía
      // NOTA: Se implementará en Fase 4 (Integración con Firebase)
      const messages = [];

      res.json({ 
        messages,
        count: messages.length,
        chatId,
        limit: Number.parseInt(limit, 10)
      });

    } catch (error) {
      logger.error('Error en getMessages:', error);
      res.status(500).json({ 
        error: error.message || 'Error al obtener mensajes' 
      });
    }
  }

  /**
   * GET /api/baileys/conversations
   * Obtiene lista de conversaciones activas de un tenant
   */
  async getConversations(req, res) {
    try {
      const { tenantId, limit = 50 } = req.query;

      if (!tenantId) {
        return res.status(400).json({ 
          error: 'tenantId es requerido' 
        });
      }

      // Por ahora retornamos estructura vacía
      // NOTA: Se implementará en Fase 4 (Integración con Firebase)
      const conversations = [];

      res.json({ 
        conversations,
        count: conversations.length,
        limit: Number.parseInt(limit, 10)
      });

    } catch (error) {
      logger.error('Error en getConversations:', error);
      res.status(500).json({ 
        error: error.message || 'Error al obtener conversaciones' 
      });
    }
  }

  /**
   * POST /api/baileys/send-message
   * Envía un mensaje manual desde el dashboard
   */
  async sendManualMessage(req, res) {
    try {
      const { tenantId, to, message, type = 'text' } = req.body;

      if (!tenantId || !to || !message) {
        return res.status(400).json({ 
          error: 'tenantId, to y message son requeridos' 
        });
      }

      logger.info(`[${tenantId}] Enviando mensaje manual a ${to}`);

      // Verificar conexión
      const isConnected = await baileys.isConnected(tenantId);
      if (!isConnected) {
        return res.status(400).json({ 
          error: 'No hay conexión activa de WhatsApp' 
        });
      }

      // Enviar mensaje
      const result = await baileys.sendMessage(tenantId, to, {
        text: message,
        type
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al enviar mensaje');
      }

      res.json({ 
        success: true,
        message: 'Mensaje enviado exitosamente',
        messageId: result.messageId,
        timestamp: result.timestamp
      });

    } catch (error) {
      logger.error('Error en sendManualMessage:', error);
      res.status(500).json({ 
        error: error.message || 'Error al enviar mensaje' 
      });
    }
  }

  /**
   * GET /api/baileys/profile
   * Obtiene información del perfil de WhatsApp conectado
   */
  async getProfile(req, res) {
    try {
      const { tenantId } = req.query;

      if (!tenantId) {
        return res.status(400).json({ 
          error: 'tenantId es requerido' 
        });
      }

      // Verificar conexión
      const isConnected = await baileys.isConnected(tenantId);
      if (!isConnected) {
        return res.json({ 
          connected: false,
          message: 'No hay conexión activa'
        });
      }

      // Obtener información del perfil
      const session = baileys.getSessionManager().getSession(tenantId);
      const phoneNumber = session?.user?.id?.split(':')[0] || null;
      const name = session?.user?.name || null;

      res.json({ 
        connected: true,
        phoneNumber,
        name,
        profilePic: null // Se puede implementar con session.profilePictureUrl
      });

    } catch (error) {
      logger.error('Error en getProfile:', error);
      res.status(500).json({ 
        error: error.message || 'Error al obtener perfil' 
      });
    }
  }

  /**
   * GET /api/baileys/health
   * Health check para verificar que la API de Baileys está funcionando
   */
  async healthCheck(req, res) {
    try {
      const sessionManager = baileys.getSessionManager();
      const activeSessions = sessionManager.getAllSessions().length;

      res.json({
        status: 'ok',
        service: 'baileys-api',
        timestamp: new Date().toISOString(),
        activeSessions,
        version: '1.0.0'
      });

    } catch (error) {
      logger.error('Error en healthCheck:', error);
      res.status(500).json({ 
        status: 'error',
        error: error.message || 'Error en health check' 
      });
    }
  }
}

// Exportar instancia única
module.exports = new BaileysController();
