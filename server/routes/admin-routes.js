/**
 * 🔐 Admin Routes - Rutas protegidas para administración
 * Solo accesible para administradores verificados
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const membershipService = require('../membership-service');

// Email del administrador (el único que puede acceder)
const ADMIN_EMAIL = 'odfarakm@gmail.com';
// PIN de verificación (hasheado para seguridad básica)
const ADMIN_PIN_HASH = '0221'; // En producción deberías usar bcrypt

/**
 * Middleware para verificar que es admin
 */
function verifyAdmin(req, res, next) {
  const { email } = req.body;
  
  if (email !== ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      error: 'No autorizado'
    });
  }
  
  next();
}

/**
 * POST /api/admin/verify-pin
 * Verifica el PIN del administrador
 */
router.post('/verify-pin', (req, res) => {
  try {
    const { email, pin } = req.body;
    
    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        error: 'No autorizado'
      });
    }
    
    if (pin !== ADMIN_PIN_HASH) {
      return res.status(401).json({
        success: false,
        error: 'PIN incorrecto'
      });
    }
    
    // Generar token de sesión admin (simple, válido por 1 hora)
    const adminToken = Buffer.from(`${ADMIN_EMAIL}:${Date.now()}`).toString('base64');
    
    res.json({
      success: true,
      adminToken,
      expiresIn: 3600000 // 1 hora
    });
    
  } catch (error) {
    console.error('❌ [Admin] Error verificando PIN:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Middleware para verificar token de admin
 */
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token no proporcionado'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [email, timestamp] = decoded.split(':');
    
    // Verificar que es el admin
    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        error: 'No autorizado'
      });
    }
    
    // Verificar que no ha expirado (1 hora)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 3600000) {
      return res.status(401).json({
        success: false,
        error: 'Token expirado'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
}

/**
 * GET /api/admin/stats
 * Obtiene estadísticas globales
 */
router.get('/stats', verifyAdminToken, async (req, res) => {
  try {
    const db = admin.database();
    
    // Obtener todos los tenants
    const tenantsSnapshot = await db.ref('tenants').once('value');
    const tenants = tenantsSnapshot.val() || {};
    
    const tenantList = Object.entries(tenants);
    const now = new Date();
    
    let stats = {
      totalTenants: tenantList.length,
      activeTenants: 0,
      trialTenants: 0,
      paidTenants: 0,
      expiredTenants: 0,
      connectedBots: 0,
      expiringIn7Days: 0,
      totalOrdersToday: 0,
      totalOrdersMonth: 0,
      revenue: {
        thisMonth: 0,
        lastMonth: 0
      }
    };
    
    for (const [tenantId, tenant] of tenantList) {
      const membership = tenant.membership || {};
      const plan = membership.plan || 'trial';
      const status = membership.status || 'active';
      
      // Contar por tipo de plan
      if (plan === 'trial') {
        stats.trialTenants++;
      } else {
        stats.paidTenants++;
      }
      
      // Verificar si está activo o expirado
      const expiresAt = membership.paidPlanEndDate || membership.trialEndDate;
      if (expiresAt) {
        const expDate = new Date(expiresAt);
        if (expDate < now) {
          stats.expiredTenants++;
        } else {
          stats.activeTenants++;
          
          // Verificar si expira en 7 días
          const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
            stats.expiringIn7Days++;
          }
        }
      } else {
        stats.activeTenants++;
      }
      
      // Verificar conexión de bot
      if (tenant.whatsapp?.connected) {
        stats.connectedBots++;
      }
    }
    
    // Obtener pagos del mes
    const paymentsSnapshot = await db.ref('payments').once('value');
    const payments = paymentsSnapshot.val() || {};
    
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    for (const [, payment] of Object.entries(payments)) {
      if (payment.status === 'APPROVED' && payment.paidAt) {
        const paymentDate = new Date(payment.paidAt);
        if (paymentDate.getMonth() === thisMonth && paymentDate.getFullYear() === thisYear) {
          stats.revenue.thisMonth += payment.amount || 0;
        }
        if (paymentDate.getMonth() === thisMonth - 1 && paymentDate.getFullYear() === thisYear) {
          stats.revenue.lastMonth += payment.amount || 0;
        }
      }
    }
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ [Admin] Error obteniendo stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/tenants
 * Lista todos los tenants con su información
 */
router.get('/tenants', verifyAdminToken, async (req, res) => {
  try {
    const db = admin.database();
    const tenantsSnapshot = await db.ref('tenants').once('value');
    const tenants = tenantsSnapshot.val() || {};
    
    const now = new Date();
    const tenantList = [];
    
    for (const [tenantId, tenant] of Object.entries(tenants)) {
      const membership = tenant.membership || {};
      const config = tenant.config || {};
      
      // Calcular días restantes
      const expiresAt = membership.paidPlanEndDate || membership.trialEndDate;
      let daysRemaining = null;
      let isExpired = false;
      
      if (expiresAt) {
        const expDate = new Date(expiresAt);
        daysRemaining = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        isExpired = daysRemaining < 0;
      }
      
      // Contar pedidos del período actual
      let ordersThisPeriod = 0;
      try {
        const usage = await membershipService.getPlanUsage(tenantId);
        ordersThisPeriod = usage?.usage?.ordersThisPeriod || 0;
      } catch (e) {
        // Ignorar errores
      }
      
      tenantList.push({
        id: tenantId,
        name: config.restaurantName || config.businessName || tenantId,
        email: config.email || tenant.user?.email || 'N/A',
        phone: tenant.whatsapp?.phoneNumber || 'N/A',
        plan: membership.plan || 'trial',
        status: isExpired ? 'expired' : (membership.status || 'active'),
        daysRemaining: isExpired ? 0 : daysRemaining,
        expiresAt,
        ordersThisPeriod,
        ordersLimit: membershipService.PLAN_LIMITS[membership.plan]?.ordersPerMonth || Infinity,
        whatsappConnected: !!tenant.whatsapp?.connected,
        createdAt: tenant.createdAt || membership.trialStartDate
      });
    }
    
    // Ordenar por días restantes (los que expiran pronto primero)
    tenantList.sort((a, b) => {
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      return a.daysRemaining - b.daysRemaining;
    });
    
    res.json({
      success: true,
      tenants: tenantList,
      total: tenantList.length
    });
    
  } catch (error) {
    console.error('❌ [Admin] Error listando tenants:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/tenant/:tenantId
 * Obtiene detalles de un tenant específico
 */
router.get('/tenant/:tenantId', verifyAdminToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const db = admin.database();
    
    const tenantSnapshot = await db.ref(`tenants/${tenantId}`).once('value');
    const tenant = tenantSnapshot.val();
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant no encontrado'
      });
    }
    
    // Obtener uso del plan
    const usage = await membershipService.getPlanUsage(tenantId);
    
    // Obtener historial de pagos
    const paymentsSnapshot = await db.ref('payments')
      .orderByChild('tenantId')
      .equalTo(tenantId)
      .once('value');
    const payments = paymentsSnapshot.val() || {};
    
    res.json({
      success: true,
      tenant: {
        id: tenantId,
        config: tenant.config || {},
        membership: tenant.membership || {},
        whatsapp: {
          connected: !!tenant.whatsapp?.connected,
          phoneNumber: tenant.whatsapp?.phoneNumber
        },
        usage,
        payments: Object.values(payments)
      }
    });
    
  } catch (error) {
    console.error('❌ [Admin] Error obteniendo tenant:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/tenant/:tenantId/extend
 * Extiende o activa el plan de un tenant
 */
router.post('/tenant/:tenantId/extend', verifyAdminToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { plan, days, reason } = req.body;
    
    if (!plan || !days) {
      return res.status(400).json({
        success: false,
        error: 'Plan y días son requeridos'
      });
    }
    
    // Activar el plan
    const result = await membershipService.activatePaidPlan(tenantId, plan, parseInt(days));
    
    if (result.success) {
      // Registrar la acción manual
      const db = admin.database();
      await db.ref(`admin_actions`).push({
        action: 'extend_plan',
        tenantId,
        plan,
        days,
        reason: reason || 'Extensión manual por admin',
        adminEmail: ADMIN_EMAIL,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
      
      res.json({
        success: true,
        message: `Plan ${plan} activado por ${days} días`,
        result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ [Admin] Error extendiendo plan:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/tenant/:tenantId/notify
 * Envía una notificación manual a un tenant
 */
router.post('/tenant/:tenantId/notify', verifyAdminToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { message, type } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Mensaje es requerido'
      });
    }
    
    const notificationService = require('../notification-service');
    const sent = await notificationService.sendNotification(tenantId, message, type || 'info');
    
    res.json({
      success: sent,
      message: sent ? 'Notificación enviada' : 'No se pudo enviar (bot desconectado?)'
    });
    
  } catch (error) {
    console.error('❌ [Admin] Error enviando notificación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/check
 * Verifica si un email es admin (para mostrar botón en dashboard)
 */
router.get('/check/:email', (req, res) => {
  const { email } = req.params;
  res.json({
    isAdmin: email === ADMIN_EMAIL
  });
});

module.exports = router;
