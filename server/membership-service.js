/**
 * Servicio de Membresías para KDS
 * Maneja la verificación de planes, estados y expiración
 */

const firebaseService = require('./firebase-service');

// Tipos de planes disponibles
const MEMBERSHIP_PLANS = {
  TRIAL: 'trial',
  EMPRENDEDOR: 'emprendedor',
  PROFESIONAL: 'profesional',
  EMPRESARIAL: 'empresarial'
};

// Estados de membresía
const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

// Límites por plan (para uso futuro)
const PLAN_LIMITS = {
  trial: { ordersPerDay: Infinity, support: 'email' }, // Sin límites durante trial
  emprendedor: { ordersPerDay: 25, support: 'email' },
  profesional: { ordersPerDay: 50, support: 'whatsapp' },
  empresarial: { ordersPerDay: 100, support: 'whatsapp' }
};

/**
 * Obtiene la información de membresía de un tenant
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<Object|null>} Datos de membresía o null
 */
async function getMembership(tenantId) {
  try {
    const snapshot = await firebaseService.database
      .ref(`tenants/${tenantId}/membership`)
      .once('value');
    
    return snapshot.val();
  } catch (error) {
    console.error(`❌ [MembershipService] Error obteniendo membresía de ${tenantId}:`, error);
    return null;
  }
}

/**
 * Verifica si la membresía de un tenant está activa
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<Object>} Resultado de la verificación
 */
async function verifyMembership(tenantId) {
  try {
    const membership = await getMembership(tenantId);
    
    if (!membership) {
      console.warn(`⚠️ [MembershipService] No se encontró membresía para tenant ${tenantId}`);
      return {
        isValid: false,
        reason: 'no_membership',
        message: 'No se encontró información de membresía'
      };
    }
    
    const now = new Date();
    const plan = membership.plan || MEMBERSHIP_PLANS.TRIAL;
    const status = membership.status || MEMBERSHIP_STATUS.ACTIVE;
    
    // Si está cancelado, no es válido
    if (status === MEMBERSHIP_STATUS.CANCELLED) {
      return {
        isValid: false,
        reason: 'cancelled',
        plan: plan,
        message: 'La membresía ha sido cancelada'
      };
    }
    
    // Verificar expiración según el tipo de plan
    if (plan === MEMBERSHIP_PLANS.TRIAL) {
      // Verificar fecha de expiración del trial
      if (membership.trialEndDate) {
        const trialEnd = new Date(membership.trialEndDate);
        
        if (now > trialEnd) {
          // Actualizar estado a expired en Firebase
          await updateMembershipStatus(tenantId, MEMBERSHIP_STATUS.EXPIRED);
          
          return {
            isValid: false,
            reason: 'trial_expired',
            plan: plan,
            expiredAt: membership.trialEndDate,
            message: 'El período de prueba ha expirado'
          };
        }
        
        // Calcular días restantes
        const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        
        return {
          isValid: true,
          plan: plan,
          status: MEMBERSHIP_STATUS.ACTIVE,
          daysRemaining: daysRemaining,
          expiresAt: membership.trialEndDate,
          message: `Trial activo - ${daysRemaining} días restantes`
        };
      }
    } else {
      // Plan de pago - verificar fecha de pago
      if (membership.paidPlanEndDate) {
        const planEnd = new Date(membership.paidPlanEndDate);
        
        if (now > planEnd) {
          await updateMembershipStatus(tenantId, MEMBERSHIP_STATUS.EXPIRED);
          
          return {
            isValid: false,
            reason: 'plan_expired',
            plan: plan,
            expiredAt: membership.paidPlanEndDate,
            message: 'El plan ha expirado. Por favor renueva tu suscripción.'
          };
        }
        
        const daysRemaining = Math.ceil((planEnd - now) / (1000 * 60 * 60 * 24));
        
        return {
          isValid: true,
          plan: plan,
          status: MEMBERSHIP_STATUS.ACTIVE,
          daysRemaining: daysRemaining,
          expiresAt: membership.paidPlanEndDate,
          message: `Plan ${plan} activo - ${daysRemaining} días restantes`
        };
      }
    }
    
    // Si no hay fecha de expiración, asumir activo (legacy)
    console.warn(`⚠️ [MembershipService] Tenant ${tenantId} sin fecha de expiración configurada`);
    return {
      isValid: true,
      plan: plan,
      status: status,
      message: 'Membresía activa (sin fecha de expiración)'
    };
    
  } catch (error) {
    console.error(`❌ [MembershipService] Error verificando membresía de ${tenantId}:`, error);
    // En caso de error, permitir acceso (fail-open para no bloquear restaurantes)
    return {
      isValid: true,
      reason: 'error',
      message: 'Error verificando membresía - acceso permitido temporalmente'
    };
  }
}

/**
 * Actualiza el estado de la membresía
 * @param {string} tenantId - ID del tenant
 * @param {string} status - Nuevo estado
 */
async function updateMembershipStatus(tenantId, status) {
  try {
    await firebaseService.database
      .ref(`tenants/${tenantId}/membership`)
      .update({
        status: status,
        statusUpdatedAt: new Date().toISOString()
      });
    
    console.log(`✅ [MembershipService] Estado actualizado a '${status}' para tenant ${tenantId}`);
  } catch (error) {
    console.error(`❌ [MembershipService] Error actualizando estado:`, error);
  }
}

/**
 * Activa un plan de pago para un tenant
 * @param {string} tenantId - ID del tenant
 * @param {string} plan - Plan a activar (emprendedor, profesional, empresarial)
 * @param {number} durationDays - Duración en días (default 30)
 */
async function activatePaidPlan(tenantId, plan, durationDays = 30) {
  try {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    
    await firebaseService.database
      .ref(`tenants/${tenantId}/membership`)
      .update({
        plan: plan,
        status: MEMBERSHIP_STATUS.ACTIVE,
        paidPlanStartDate: now.toISOString(),
        paidPlanEndDate: endDate.toISOString(),
        lastPaymentDate: now.toISOString(),
        statusUpdatedAt: now.toISOString()
      });
    
    console.log(`✅ [MembershipService] Plan '${plan}' activado para tenant ${tenantId} hasta ${endDate.toISOString()}`);
    
    return {
      success: true,
      plan: plan,
      startDate: now.toISOString(),
      endDate: endDate.toISOString()
    };
  } catch (error) {
    console.error(`❌ [MembershipService] Error activando plan:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene los límites del plan actual
 * @param {string} plan - Nombre del plan
 * @returns {Object} Límites del plan
 */
function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
}

// ====================================
// SISTEMA DE LÍMITES DE PEDIDOS DIARIOS
// ====================================

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (timezone local Colombia)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function getTodayDateString() {
  const now = new Date();
  // Ajustar a timezone Colombia (UTC-5)
  const colombiaOffset = -5 * 60; // minutos
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const colombiaTime = new Date(utc + (colombiaOffset * 60000));
  
  return colombiaTime.toISOString().split('T')[0];
}

/**
 * Cuenta los pedidos del día actual para un tenant
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<number>} Número de pedidos del día
 */
async function countTodayOrders(tenantId) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();
    
    // Obtener pedidos del tenant desde el inicio del día
    const pedidosSnapshot = await firebaseService.database
      .ref(`tenants/${tenantId}/pedidos`)
      .orderByChild('timestamp')
      .startAt(todayStartTimestamp)
      .once('value');
    
    const pedidos = pedidosSnapshot.val();
    const count = pedidos ? Object.keys(pedidos).length : 0;
    
    console.log(`📊 [MembershipService] Pedidos hoy para tenant ${tenantId}: ${count}`);
    
    return count;
  } catch (error) {
    console.error(`❌ [MembershipService] Error contando pedidos del día:`, error);
    return 0; // En caso de error, permitir (fail-open)
  }
}

/**
 * Verifica si un tenant puede crear un nuevo pedido según su plan
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<Object>} Resultado de la verificación
 */
async function canCreateOrder(tenantId) {
  try {
    // 1. Verificar que la membresía esté activa
    const membershipStatus = await verifyMembership(tenantId);
    
    if (!membershipStatus.isValid) {
      return {
        allowed: false,
        reason: 'membership_invalid',
        message: membershipStatus.message,
        membershipStatus
      };
    }
    
    // 2. Obtener el plan y sus límites
    const plan = membershipStatus.plan || MEMBERSHIP_PLANS.TRIAL;
    const limits = getPlanLimits(plan);
    
    // 3. Si el límite es Infinity, siempre permitir
    if (limits.ordersPerDay === Infinity) {
      return {
        allowed: true,
        plan,
        ordersToday: 0, // No contamos si no hay límite
        ordersLimit: Infinity,
        message: 'Sin límite de pedidos'
      };
    }
    
    // 4. Contar pedidos del día
    const ordersToday = await countTodayOrders(tenantId);
    
    // 5. Verificar si está dentro del límite
    if (ordersToday >= limits.ordersPerDay) {
      console.warn(`⚠️ [MembershipService] Tenant ${tenantId} alcanzó límite diario: ${ordersToday}/${limits.ordersPerDay}`);
      
      return {
        allowed: false,
        reason: 'daily_limit_reached',
        plan,
        ordersToday,
        ordersLimit: limits.ordersPerDay,
        message: `Has alcanzado el límite de ${limits.ordersPerDay} pedidos diarios de tu plan ${plan}. Actualiza tu plan para recibir más pedidos.`
      };
    }
    
    // 6. Calcular pedidos restantes
    const ordersRemaining = limits.ordersPerDay - ordersToday;
    
    return {
      allowed: true,
      plan,
      ordersToday,
      ordersLimit: limits.ordersPerDay,
      ordersRemaining,
      message: `Puedes crear ${ordersRemaining} pedidos más hoy`
    };
    
  } catch (error) {
    console.error(`❌ [MembershipService] Error verificando límite de pedidos:`, error);
    // Fail-open: permitir en caso de error para no bloquear restaurantes
    return {
      allowed: true,
      reason: 'error',
      message: 'Error verificando límites - pedido permitido temporalmente'
    };
  }
}

/**
 * Obtiene el uso actual del plan de un tenant
 * Útil para mostrar en dashboard
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<Object>} Información de uso del plan
 */
async function getPlanUsage(tenantId) {
  try {
    const membership = await getMembership(tenantId);
    const plan = membership?.plan || MEMBERSHIP_PLANS.TRIAL;
    const limits = getPlanLimits(plan);
    const ordersToday = await countTodayOrders(tenantId);
    
    const ordersRemaining = limits.ordersPerDay === Infinity 
      ? Infinity 
      : Math.max(0, limits.ordersPerDay - ordersToday);
    
    const usagePercent = limits.ordersPerDay === Infinity 
      ? 0 
      : Math.round((ordersToday / limits.ordersPerDay) * 100);
    
    return {
      plan,
      limits,
      usage: {
        ordersToday,
        ordersLimit: limits.ordersPerDay,
        ordersRemaining,
        usagePercent,
        isAtLimit: ordersToday >= limits.ordersPerDay && limits.ordersPerDay !== Infinity
      },
      membership: {
        status: membership?.status || MEMBERSHIP_STATUS.ACTIVE,
        expiresAt: membership?.trialEndDate || membership?.paidPlanEndDate
      }
    };
    
  } catch (error) {
    console.error(`❌ [MembershipService] Error obteniendo uso del plan:`, error);
    return null;
  }
}

module.exports = {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_STATUS,
  PLAN_LIMITS,
  getMembership,
  verifyMembership,
  updateMembershipStatus,
  activatePaidPlan,
  getPlanLimits,
  // Nuevas funciones de límites
  countTodayOrders,
  canCreateOrder,
  getPlanUsage,
  getTodayDateString
};
