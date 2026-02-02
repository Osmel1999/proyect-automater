/**
 * 💳 Rutas de Wompi - API para pagos de membresías
 * 
 * Endpoints:
 * - POST /api/membership/checkout - Crear checkout para pago
 * - POST /api/membership/webhook - Webhook de Wompi
 * - GET /api/membership/transaction/:id - Verificar transacción
 * - GET /api/membership/plans - Obtener planes disponibles
 * - GET /api/membership/recommend/:tenantId - Recomendación de plan
 */

const express = require('express');
const router = express.Router();

const wompiService = require('../wompi-service');
const membershipService = require('../membership-service');
const planRecommendationService = require('../plan-recommendation-service');
const notificationService = require('../notification-service');

/**
 * GET /api/membership/plans
 * Obtiene todos los planes disponibles
 */
router.get('/plans', (req, res) => {
  try {
    const plans = wompiService.getAllPlans();
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/membership/recommend/:tenantId
 * Obtiene recomendación de plan basada en analytics
 * Solo se llama cuando el usuario va a hacer el pago
 */
router.get('/recommend/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'tenantId requerido' });
    }
    
    // Obtener plan actual
    const membership = await membershipService.getMembership(tenantId);
    const currentPlan = membership?.plan || 'trial';
    
    // Generar recomendación basada en analytics
    const recommendation = await planRecommendationService.getRecommendation(tenantId, currentPlan);
    
    res.json(recommendation);
    
  } catch (error) {
    console.error('❌ Error obteniendo recomendación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/membership/compare/:tenantId
 * Compara todos los planes para el tenant
 */
router.get('/compare/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const comparison = await planRecommendationService.comparePlans(tenantId);
    
    res.json({ success: true, plans: comparison });
    
  } catch (error) {
    console.error('❌ Error comparando planes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/membership/checkout
 * Crea un checkout/enlace de pago para una membresía
 * 
 * Body: { tenantId, plan, email }
 */
router.post('/checkout', async (req, res) => {
  try {
    const { tenantId, plan, email } = req.body;
    
    if (!tenantId || !plan) {
      return res.status(400).json({ 
        success: false, 
        error: 'tenantId y plan son requeridos' 
      });
    }
    
    // Validar que el plan existe
    const planInfo = wompiService.getPlanInfo(plan);
    if (!planInfo) {
      return res.status(400).json({ 
        success: false, 
        error: `Plan no válido: ${plan}` 
      });
    }
    
    // Verificar si Wompi está configurado
    if (!wompiService.isConfigured()) {
      // Modo desarrollo: devolver datos de checkout para widget
      const checkoutData = wompiService.createCheckoutData(tenantId, plan);
      
      return res.json({
        success: true,
        mode: 'widget',
        checkout: checkoutData,
        message: 'Usa estos datos para el widget de Wompi'
      });
    }
    
    // Crear enlace de pago
    const redirectUrl = `${req.protocol}://${req.get('host')}/payment-success.html`;
    const paymentLink = await wompiService.createPaymentLink(tenantId, plan, email, redirectUrl);
    
    res.json({
      success: true,
      mode: 'redirect',
      ...paymentLink
    });
    
  } catch (error) {
    console.error('❌ Error creando checkout:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/membership/webhook
 * Webhook de Wompi para confirmar pagos
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-event-checksum'];
    const payload = req.body;
    
    console.log('📨 [Webhook] Recibido de Wompi');
    
    const result = await wompiService.processWebhook(payload, signature, async (paymentData) => {
      // Callback cuando el pago es exitoso
      console.log(`✅ [Webhook] Pago exitoso - Tenant: ${paymentData.tenantId}, Plan: ${paymentData.plan}`);
      
      // Activar el plan pagado
      await membershipService.activatePaidPlan(
        paymentData.tenantId,
        paymentData.plan,
        30 // 30 días
      );
      
      // Guardar registro del pago
      const admin = require('firebase-admin');
      await admin.database()
        .ref(`tenants/${paymentData.tenantId}/payments`)
        .push({
          transactionId: paymentData.transactionId,
          plan: paymentData.plan,
          amount: paymentData.amount,
          reference: paymentData.reference,
          paymentMethod: paymentData.paymentMethod,
          status: 'APPROVED',
          createdAt: admin.database.ServerValue.TIMESTAMP
        });
      
      // 🔔 Notificar al dueño por WhatsApp
      notificationService.notifyPaymentSuccess(paymentData.tenantId, paymentData.plan)
        .catch(err => console.error('⚠️ Error enviando notificación de pago:', err));
      
      console.log(`✅ [Webhook] Plan ${paymentData.plan} activado para tenant ${paymentData.tenantId}`);
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/membership/transaction/:transactionId
 * Verifica el estado de una transacción
 */
router.get('/transaction/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    if (!wompiService.isConfigured()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Wompi no está configurado' 
      });
    }
    
    const transaction = await wompiService.getTransactionStatus(transactionId);
    
    res.json({ success: true, transaction });
    
  } catch (error) {
    console.error('❌ Error verificando transacción:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/membership/lost-orders/:tenantId
 * Obtiene resumen de pedidos perdidos (para alertas en dashboard)
 */
router.get('/lost-orders/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { days = 7 } = req.query;
    
    const summary = await planRecommendationService.getLostOrdersSummary(tenantId, parseInt(days));
    
    res.json({ success: true, ...summary });
    
  } catch (error) {
    console.error('❌ Error obteniendo resumen de pérdidas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/membership/activate-manual
 * Activa un plan manualmente (para admin/testing)
 */
router.post('/activate-manual', async (req, res) => {
  try {
    const { tenantId, plan, days = 30, adminKey } = req.body;
    
    // Verificar clave de admin (simple para desarrollo)
    if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'dev-admin-key') {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }
    
    if (!tenantId || !plan) {
      return res.status(400).json({ success: false, error: 'tenantId y plan requeridos' });
    }
    
    const result = await membershipService.activatePaidPlan(tenantId, plan, days);
    
    // Invalidar caché de membresía si existe
    try {
      const botLogic = require('../bot-logic');
      if (botLogic.invalidarCacheMembership) {
        botLogic.invalidarCacheMembership(tenantId);
      }
    } catch (e) {
      // Ignorar si no existe
    }
    
    res.json({ success: true, ...result });
    
  } catch (error) {
    console.error('❌ Error activando plan:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
