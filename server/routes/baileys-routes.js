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
 * Body: { tenantId, to, text, type?, mediaUrl?, caption? }
 */
router.post('/send', (req, res) => {
  baileysController.sendMessage(req, res);
});

/**
 * GET /api/baileys/chats
 * Lista todos los chats
 * Query: ?tenantId=xxx&limit=50
 */
router.get('/chats', (req, res) => {
  baileysController.getChats(req, res);
});

/**
 * GET /api/baileys/messages
 * Obtiene mensajes de un chat
 * Query: ?tenantId=xxx&chatId=xxx&limit=50
 */
router.get('/messages', (req, res) => {
  baileysController.getMessages(req, res);
});

module.exports = router;
