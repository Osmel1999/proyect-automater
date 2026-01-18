/**
 * Baileys Routes
 * Define las rutas de la API para operaciones de WhatsApp con Baileys
 */

const express = require('express');
const baileysController = require('../controllers/baileys-controller');

const router = express.Router();

// ==================== CONEXIÓN ====================

/**
 * POST /api/baileys/connect
 * Inicia una nueva sesión Baileys
 * Body: { tenantId: string }
 */
router.post('/connect', (req, res) => {
  baileysController.connect(req, res);
});

/**
 * GET /api/baileys/qr
 * Obtiene el QR code actual
 * Query: ?tenantId=xxx
 */
router.get('/qr', (req, res) => {
  baileysController.getQR(req, res);
});

/**
 * POST /api/baileys/disconnect
 * Desconecta la sesión
 * Body: { tenantId: string }
 */
router.post('/disconnect', (req, res) => {
  baileysController.disconnect(req, res);
});

/**
 * POST /api/baileys/clean-session
 * Limpia completamente una sesión corrupta
 * Body: { tenantId: string }
 */
router.post('/clean-session', (req, res) => {
  baileysController.cleanSession(req, res);
});

/**
 * GET /api/baileys/status
 * Obtiene el estado de conexión
 * Query: ?tenantId=xxx
 */
router.get('/status', (req, res) => {
  baileysController.getStatus(req, res);
});

// ==================== ESTADÍSTICAS ====================

/**
 * GET /api/baileys/stats
 * Obtiene estadísticas anti-ban
 * Query: ?tenantId=xxx
 */
router.get('/stats', (req, res) => {
  baileysController.getStats(req, res);
});

// ==================== MENSAJERÍA ====================

/**
 * POST /api/baileys/send
 * Envía un mensaje
 * Body: { tenantId, to, message }
 */
router.post('/send', (req, res) => {
  baileysController.sendMessage(req, res);
});

/**
 * GET /api/baileys/conversations
 * Obtiene lista de conversaciones activas
 * Query: ?tenantId=xxx&limit=50
 */
router.get('/conversations', (req, res) => {
  baileysController.getConversations(req, res);
});

/**
 * GET /api/baileys/messages
 * Obtiene mensajes de un chat específico
 * Query: ?tenantId=xxx&chatId=xxx&limit=50
 */
router.get('/messages', (req, res) => {
  baileysController.getMessages(req, res);
});

/**
 * POST /api/baileys/send-message
 * Envía un mensaje manual desde el dashboard
 * Body: { tenantId, to, message, type }
 */
router.post('/send-message', (req, res) => {
  baileysController.sendManualMessage(req, res);
});

/**
 * GET /api/baileys/profile
 * Obtiene información del perfil conectado
 * Query: ?tenantId=xxx
 */
router.get('/profile', (req, res) => {
  baileysController.getProfile(req, res);
});

// ==================== HEALTH CHECK ====================

/**
 * GET /api/baileys/health
 * Verifica el estado de la API de Baileys
 * Query: ?tenantId=xxx
 */
router.get('/health', (req, res) => {
  baileysController.healthCheck(req, res);
});

// ==================== TEST ENDPOINT ====================

/**
 * POST /api/baileys/test-message
 * Simula un mensaje entrante para pruebas (solo desarrollo)
 * Body: { tenantId, from, message }
 */
router.post('/test-message', async (req, res) => {
  try {
    const { tenantId, from, message } = req.body;
    
    if (!tenantId || !from || !message) {
      return res.status(400).json({
        success: false,
        error: 'tenantId, from y message son requeridos'
      });
    }
    
    console.log(`🧪 [TEST] Simulando mensaje entrante:`);
    console.log(`   Tenant: ${tenantId}`);
    console.log(`   From: ${from}`);
    console.log(`   Message: ${message}`);
    
    // Obtener event handlers
    const baileys = require('../baileys');
    const eventHandlers = baileys.getEventHandlers();
    
    // Simular mensaje en formato interno
    const testMessage = {
      tenantId,
      from,
      text: message,
      timestamp: Date.now(),
      messageId: `test-${Date.now()}`,
      type: 'text'
    };
    
    console.log(`🧪 [TEST] Mensaje simulado:`, testMessage);
    
    // Buscar callback
    let callback = eventHandlers.messageCallbacks.get(tenantId);
    if (!callback) {
      callback = eventHandlers.messageCallbacks.get('*');
    }
    
    if (!callback) {
      console.log(`🧪 [TEST] ❌ No hay callback registrado`);
      return res.status(500).json({
        success: false,
        error: 'No hay callback registrado para procesar mensajes'
      });
    }
    
    console.log(`🧪 [TEST] Ejecutando callback...`);
    
    // Ejecutar callback
    const response = await callback(testMessage);
    
    console.log(`🧪 [TEST] Respuesta del bot:`, response);
    
    res.json({
      success: true,
      message: testMessage,
      response
    });
    
  } catch (error) {
    console.error(`🧪 [TEST] Error:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
