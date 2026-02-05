/**
 * 🤝 Partner Service - Gestión de Socios Comerciales y Comisiones
 * 
 * Maneja:
 * - Generación de comisiones por referidos
 * - Actualización de estadísticas de partners
 * - Cálculo de ingresos por comisiones
 * - Tracking de tenants referidos
 */

const admin = require('firebase-admin');

// Configuración de comisiones (porcentajes)
const COMISION_CONFIG = {
  registro: 10,           // 10% del primer pago
  pago_membresia: 10,     // 10% de cada pago mensual
  renovacion: 10          // 10% de cada renovación
};

/**
 * Genera una comisión para un partner cuando un tenant realiza un pago
 * @param {string} tenantId - ID del tenant que realizó el pago
 * @param {string} tenantNombre - Nombre del restaurante/tenant
 * @param {number} valorBase - Valor del pago (en pesos)
 * @param {string} plan - Plan contratado
 * @param {string} transaccionId - ID de la transacción de Wompi
 * @returns {Promise<Object|null>} Datos de la comisión generada o null
 */
async function generarComision(tenantId, tenantNombre, valorBase, plan, transaccionId) {
  try {
    console.log(`💰 [PartnerService] Generando comisión para tenant ${tenantId}`);
    
    // 1. Obtener datos del tenant para saber si tiene partner
    const tenantSnapshot = await admin.database()
      .ref(`tenants/${tenantId}`)
      .once('value');
    
    if (!tenantSnapshot.exists()) {
      console.warn(`⚠️ [PartnerService] Tenant ${tenantId} no encontrado`);
      return null;
    }
    
    const tenantData = tenantSnapshot.val();
    const partnerId = tenantData.partnerId;
    
    if (!partnerId) {
      console.log(`ℹ️ [PartnerService] Tenant ${tenantId} no tiene partner asociado`);
      return null;
    }
    
    // 2. Obtener datos del partner
    const partnerSnapshot = await admin.database()
      .ref(`partners/${partnerId}`)
      .once('value');
    
    if (!partnerSnapshot.exists()) {
      console.warn(`⚠️ [PartnerService] Partner ${partnerId} no encontrado`);
      return null;
    }
    
    const partnerData = partnerSnapshot.val();
    
    // 3. Verificar si ya existe una comisión para esta transacción (evitar duplicados)
    const existingComisionSnapshot = await admin.database()
      .ref(`comisiones_referidos/${partnerId}`)
      .orderByChild('transaccionId')
      .equalTo(transaccionId)
      .once('value');
    
    if (existingComisionSnapshot.exists()) {
      console.warn(`⚠️ [PartnerService] Ya existe comisión para transacción ${transaccionId}`);
      return null;
    }
    
    // 4. Determinar tipo de comisión (primera vez o recurrente)
    const paymentsSnapshot = await admin.database()
      .ref(`tenants/${tenantId}/payments`)
      .once('value');
    
    const payments = paymentsSnapshot.val() || {};
    const paymentCount = Object.keys(payments).length;
    const tipo = paymentCount <= 1 ? 'registro' : 'pago_membresia';
    
    // 5. Calcular comisión
    const porcentajeComision = COMISION_CONFIG[tipo];
    const valorComision = Math.round(valorBase * (porcentajeComision / 100));
    
    // 6. Crear registro de comisión
    const comisionData = {
      tipo: tipo,
      tenantId: tenantId,
      tenantNombre: tenantNombre,
      valorBase: valorBase,
      porcentajeComision: porcentajeComision,
      valorComision: valorComision,
      plan: plan,
      transaccionId: transaccionId,
      estado: 'pendiente',  // pendiente, pagada, cancelada
      fechaCreacion: admin.database.ServerValue.TIMESTAMP,
      // Datos del partner (por referencia)
      partnerNombre: partnerData.nombre || partnerData.email,
      partnerEmail: partnerData.email
    };
    
    const comisionRef = await admin.database()
      .ref(`comisiones_referidos/${partnerId}`)
      .push(comisionData);
    
    // 7. Actualizar estadísticas del partner
    await actualizarEstadisticasPartner(partnerId, valorComision);
    
    console.log(`✅ [PartnerService] Comisión generada: $${valorComision} para partner ${partnerData.nombre}`);
    
    return {
      comisionId: comisionRef.key,
      partnerId: partnerId,
      partnerNombre: partnerData.nombre || partnerData.email,
      valorComision: valorComision,
      tipo: tipo,
      ...comisionData
    };
    
  } catch (error) {
    console.error('❌ [PartnerService] Error generando comisión:', error);
    throw error;
  }
}

/**
 * Actualiza las estadísticas de un partner después de generar una comisión
 * @param {string} partnerId - ID del partner
 * @param {number} valorComision - Valor de la comisión generada
 */
async function actualizarEstadisticasPartner(partnerId, valorComision) {
  try {
    const statsRef = admin.database().ref(`partners/${partnerId}/estadisticas`);
    
    // Usar transacción para actualizar contadores de forma atómica
    await statsRef.transaction((stats) => {
      if (!stats) {
        // Primera comisión
        return {
          totalComisiones: valorComision,
          totalReferidos: 1,
          comisionesGeneradas: 1,
          ultimaActualizacion: Date.now()
        };
      }
      
      // Incrementar valores existentes
      return {
        ...stats,
        totalComisiones: (stats.totalComisiones || 0) + valorComision,
        comisionesGeneradas: (stats.comisionesGeneradas || 0) + 1,
        ultimaActualizacion: Date.now()
      };
    });
    
    console.log(`✅ [PartnerService] Estadísticas actualizadas para partner ${partnerId}`);
    
  } catch (error) {
    console.error('❌ [PartnerService] Error actualizando estadísticas:', error);
    // No lanzar error para no bloquear el webhook
  }
}

/**
 * Obtiene el resumen de comisiones de un partner
 * @param {string} partnerId - ID del partner
 * @returns {Promise<Object>} Resumen de comisiones
 */
async function obtenerResumenComisiones(partnerId) {
  try {
    const comisionesSnapshot = await admin.database()
      .ref(`comisiones_referidos/${partnerId}`)
      .once('value');
    
    const comisiones = comisionesSnapshot.val() || {};
    const comisionesArray = Object.entries(comisiones).map(([key, val]) => ({
      id: key,
      ...val
    }));
    
    // Calcular totales
    const total = comisionesArray.reduce((sum, c) => sum + (c.valorComision || 0), 0);
    const pendiente = comisionesArray
      .filter(c => c.estado === 'pendiente')
      .reduce((sum, c) => sum + (c.valorComision || 0), 0);
    const pagado = comisionesArray
      .filter(c => c.estado === 'pagada')
      .reduce((sum, c) => sum + (c.valorComision || 0), 0);
    
    return {
      total: total,
      pendiente: pendiente,
      pagado: pagado,
      cantidad: comisionesArray.length,
      comisiones: comisionesArray.sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0))
    };
    
  } catch (error) {
    console.error('❌ [PartnerService] Error obteniendo resumen:', error);
    throw error;
  }
}

/**
 * Marca una comisión como pagada
 * @param {string} partnerId - ID del partner
 * @param {string} comisionId - ID de la comisión
 * @param {Object} datosTransferencia - Datos de la transferencia realizada
 */
async function marcarComisionPagada(partnerId, comisionId, datosTransferencia = {}) {
  try {
    await admin.database()
      .ref(`comisiones_referidos/${partnerId}/${comisionId}`)
      .update({
        estado: 'pagada',
        fechaPago: admin.database.ServerValue.TIMESTAMP,
        ...datosTransferencia
      });
    
    console.log(`✅ [PartnerService] Comisión ${comisionId} marcada como pagada`);
    
  } catch (error) {
    console.error('❌ [PartnerService] Error marcando comisión como pagada:', error);
    throw error;
  }
}

/**
 * Obtiene todos los tenants referidos por un partner que están activos
 * @param {string} partnerId - ID del partner
 * @returns {Promise<Array>} Lista de tenants activos
 */
async function obtenerTenantActivos(partnerId) {
  try {
    // Buscar todos los tenants que tienen este partnerId
    const tenantsSnapshot = await admin.database()
      .ref('tenants')
      .orderByChild('partnerId')
      .equalTo(partnerId)
      .once('value');
    
    const tenants = tenantsSnapshot.val() || {};
    const tenantsArray = Object.entries(tenants).map(([key, val]) => ({
      id: key,
      ...val
    }));
    
    // Filtrar solo los activos
    const activos = tenantsArray.filter(t => {
      const membership = t.membership;
      if (!membership) return false;
      
      // Verificar si el plan está activo
      if (membership.status === 'cancelled' || membership.status === 'expired') {
        return false;
      }
      
      // Verificar si no ha expirado
      const now = new Date();
      if (membership.paidPlanEndDate) {
        const endDate = new Date(membership.paidPlanEndDate);
        if (now > endDate) return false;
      }
      if (membership.trialEndDate) {
        const trialEnd = new Date(membership.trialEndDate);
        if (now > trialEnd) return false;
      }
      
      return true;
    });
    
    return activos;
    
  } catch (error) {
    console.error('❌ [PartnerService] Error obteniendo tenants activos:', error);
    throw error;
  }
}

/**
 * Calcula las comisiones proyectadas para el próximo mes
 * basado en los tenants activos
 * @param {string} partnerId - ID del partner
 * @returns {Promise<Object>} Proyección de comisiones
 */
async function calcularComisionesProyectadas(partnerId) {
  try {
    const tenantsActivos = await obtenerTenantActivos(partnerId);
    
    let proyeccion = {
      emprendedor: 0,
      profesional: 0,
      empresarial: 0,
      total: 0
    };
    
    // Precios de planes
    const precios = {
      emprendedor: 90000,
      profesional: 120000,
      empresarial: 150000
    };
    
    tenantsActivos.forEach(tenant => {
      const plan = tenant.membership?.plan;
      if (plan && precios[plan]) {
        const comision = Math.round(precios[plan] * 0.1); // 10%
        proyeccion[plan] += comision;
        proyeccion.total += comision;
      }
    });
    
    return {
      tenantsActivos: tenantsActivos.length,
      proyeccion: proyeccion
    };
    
  } catch (error) {
    console.error('❌ [PartnerService] Error calculando proyección:', error);
    throw error;
  }
}

module.exports = {
  generarComision,
  actualizarEstadisticasPartner,
  obtenerResumenComisiones,
  marcarComisionPagada,
  obtenerTenantActivos,
  calcularComisionesProyectadas,
  COMISION_CONFIG
};
