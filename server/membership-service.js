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

// Límites por plan (MENSUALES - desde la fecha de pago, no del mes calendario)
// Los 30 días comienzan cuando el usuario paga
const PLAN_LIMITS = {
  trial: { ordersPerMonth: Infinity, ordersPerDay: Infinity, support: 'email' }, // Sin límites durante trial
  emprendedor: { ordersPerMonth: 750, ordersPerDay: 25, support: 'email' },      // ~25/día promedio
  profesional: { ordersPerMonth: 1500, ordersPerDay: 50, support: 'whatsapp' },  // ~50/día promedio
  empresarial: { ordersPerMonth: 3000, ordersPerDay: 100, support: 'whatsapp' }  // ~100/día promedio
};

// Información de planes para notificaciones
const PLAN_INFO = {
  emprendedor: { name: 'Emprendedor', price: 90000, ordersPerMonth: 750 },
  profesional: { name: 'Profesional', price: 120000, ordersPerMonth: 1500 },
  empresarial: { name: 'Empresarial', price: 150000, ordersPerMonth: 3000 }
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
// SISTEMA DE LÍMITES DE PEDIDOS MENSUALES
// Los 30 días comienzan desde que el usuario paga/activa el plan
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
 * Obtiene el timestamp de inicio del período de facturación actual
 * Para planes de pago: desde paidPlanStartDate
 * Para trials: desde trialStartDate o creación del tenant
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<number>} Timestamp del inicio del período
 */
async function getBillingPeriodStart(tenantId) {
  try {
    const membership = await getMembership(tenantId);
    if (!membership) return 0;
    
    // Plan de pago: usar fecha de inicio del plan
    if (membership.paidPlanStartDate) {
      return new Date(membership.paidPlanStartDate).getTime();
    }
    
    // Trial: usar fecha de inicio del trial
    if (membership.trialStartDate) {
      return new Date(membership.trialStartDate).getTime();
    }
    
    // Fallback: inicio del mes actual
    const now = new Date();
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  } catch (error) {
    console.error(`❌ [MembershipService] Error obteniendo inicio de período:`, error);
    return 0;
  }
}

/**
 * Cuenta los pedidos del día actual para un tenant (para estadísticas)
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<number>} Número de pedidos del día
 */
async function countTodayOrders(tenantId) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();
    
    const pedidosSnapshot = await firebaseService.database
      .ref(`tenants/${tenantId}/pedidos`)
      .orderByChild('timestamp')
      .startAt(todayStartTimestamp)
      .once('value');
    
    const pedidos = pedidosSnapshot.val();
    return pedidos ? Object.keys(pedidos).length : 0;
  } catch (error) {
    console.error(`❌ [MembershipService] Error contando pedidos del día:`, error);
    return 0;
  }
}

/**
 * Cuenta los pedidos del período de facturación actual (30 días desde pago)
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<number>} Número de pedidos en el período
 */
async function countPeriodOrders(tenantId) {
  try {
    const periodStart = await getBillingPeriodStart(tenantId);
    
    if (periodStart === 0) {
      console.warn(`⚠️ [MembershipService] No se encontró inicio de período para ${tenantId}`);
      return 0;
    }
    
    // Obtener pedidos desde el inicio del período
    const pedidosSnapshot = await firebaseService.database
      .ref(`tenants/${tenantId}/pedidos`)
      .orderByChild('timestamp')
      .startAt(periodStart)
      .once('value');
    
    const pedidos = pedidosSnapshot.val();
    const count = pedidos ? Object.keys(pedidos).length : 0;
    
    console.log(`📊 [MembershipService] Pedidos en período para tenant ${tenantId}: ${count}`);
    
    return count;
  } catch (error) {
    console.error(`❌ [MembershipService] Error contando pedidos del período:`, error);
    return 0; // En caso de error, permitir (fail-open)
  }
}

/**
 * Verifica si un tenant puede crear un nuevo pedido según su plan
 * AHORA USA LÍMITES MENSUALES (desde fecha de pago)
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
    
    // 3. Si el límite mensual es Infinity, siempre permitir (trial)
    if (limits.ordersPerMonth === Infinity) {
      return {
        allowed: true,
        plan,
        ordersThisPeriod: 0,
        ordersLimit: Infinity,
        message: 'Sin límite de pedidos (período de prueba)'
      };
    }
    
    // 4. Contar pedidos del período actual (30 días desde pago)
    const ordersThisPeriod = await countPeriodOrders(tenantId);
    
    // 5. Verificar si está dentro del límite mensual
    if (ordersThisPeriod >= limits.ordersPerMonth) {
      console.warn(`⚠️ [MembershipService] Tenant ${tenantId} alcanzó límite mensual: ${ordersThisPeriod}/${limits.ordersPerMonth}`);
      
      return {
        allowed: false,
        reason: 'monthly_limit_reached',
        plan,
        ordersThisPeriod,
        ordersLimit: limits.ordersPerMonth,
        daysRemaining: membershipStatus.daysRemaining || 0,
        message: `Has alcanzado el límite de ${limits.ordersPerMonth} pedidos de tu plan ${plan} este mes. Actualiza tu plan para seguir recibiendo pedidos.`
      };
    }
    
    // 6. Calcular pedidos restantes
    const ordersRemaining = limits.ordersPerMonth - ordersThisPeriod;
    const usagePercent = Math.round((ordersThisPeriod / limits.ordersPerMonth) * 100);
    
    return {
      allowed: true,
      plan,
      ordersThisPeriod,
      ordersLimit: limits.ordersPerMonth,
      ordersRemaining,
      usagePercent,
      daysRemaining: membershipStatus.daysRemaining || 0,
      message: `Te quedan ${ordersRemaining} pedidos este mes`
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
 * AHORA MUESTRA LÍMITES MENSUALES
 * Útil para mostrar en dashboard y notificaciones
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<Object>} Información de uso del plan
 */
async function getPlanUsage(tenantId) {
  try {
    const membership = await getMembership(tenantId);
    const plan = membership?.plan || MEMBERSHIP_PLANS.TRIAL;
    const limits = getPlanLimits(plan);
    
    // Pedidos de hoy (informativo)
    const ordersToday = await countTodayOrders(tenantId);
    
    // Pedidos del período (para el límite real)
    const ordersThisPeriod = await countPeriodOrders(tenantId);
    
    const ordersRemaining = limits.ordersPerMonth === Infinity 
      ? Infinity 
      : Math.max(0, limits.ordersPerMonth - ordersThisPeriod);
    
    const usagePercent = limits.ordersPerMonth === Infinity 
      ? 0 
      : Math.round((ordersThisPeriod / limits.ordersPerMonth) * 100);
    
    // Calcular días restantes del período
    let daysRemaining = 0;
    const expiresAt = membership?.trialEndDate || membership?.paidPlanEndDate;
    if (expiresAt) {
      const endDate = new Date(expiresAt);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
    }
    
    return {
      plan,
      limits,
      usage: {
        ordersToday,           // Pedidos de hoy (informativo)
        ordersThisPeriod,      // Pedidos del período actual
        ordersLimit: limits.ordersPerMonth,
        ordersRemaining,
        usagePercent,
        isAtLimit: ordersThisPeriod >= limits.ordersPerMonth && limits.ordersPerMonth !== Infinity,
        daysRemaining
      },
      membership: {
        status: membership?.status || MEMBERSHIP_STATUS.ACTIVE,
        expiresAt,
        startDate: membership?.paidPlanStartDate || membership?.trialStartDate
      }
    };
    
  } catch (error) {
    console.error(`❌ [MembershipService] Error obteniendo uso del plan:`, error);
    return null;
  }
}

/**
 * Sugiere el siguiente plan basado en el uso actual
 * @param {string} currentPlan - Plan actual
 * @returns {string|null} Nombre del siguiente plan o null si ya tiene el máximo
 */
function getNextPlan(currentPlan) {
  const planOrder = ['trial', 'emprendedor', 'profesional', 'empresarial'];
  const currentIndex = planOrder.indexOf(currentPlan);
  
  if (currentIndex === -1 || currentIndex >= planOrder.length - 1) {
    return null; // Ya tiene el plan máximo
  }
  
  return planOrder[currentIndex + 1];
}

module.exports = {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_STATUS,
  PLAN_LIMITS,
  PLAN_INFO,
  getMembership,
  verifyMembership,
  updateMembershipStatus,
  activatePaidPlan,
  getPlanLimits,
  getNextPlan,
  // Funciones de límites
  countTodayOrders,
  countPeriodOrders,
  getBillingPeriodStart,
  canCreateOrder,
  getPlanUsage,
  getTodayDateString
};
