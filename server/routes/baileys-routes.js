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

module.exports = router;
