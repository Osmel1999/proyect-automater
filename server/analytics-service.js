/**
 * 📊 Analytics Service - Minimal Data Collection
 * 
 * Solo recolecta datos esenciales para análisis futuro:
 * - order_completed: pedidos completados exitosamente
 * - order_lost: pedidos perdidos por límite del plan
 * 
 * NO hace análisis en tiempo real, solo almacena datos raw.
 * 
 * Estructura en Firebase:
 * analytics/{tenantId}/{date}/{orders_completed|orders_lost}/{pushId}
 */

const admin = require('firebase-admin');

/**
 * Genera la fecha en formato DD-MM-YY
 * @returns {string} Fecha formateada
 */
function getDateKey() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

/**
 * Registra un pedido completado exitosamente
 * @param {string} tenantId - ID del tenant
 * @param {string} userPhone - Teléfono del usuario que hizo el pedido
 * @param {Object} orderData - Datos del pedido
 */
async function trackOrderCompleted(tenantId, userPhone, orderData) {
  try {
    const db = admin.database();
    const dateKey = getDateKey();
    
    // Estructura: analytics/{tenantId}/{date}/orders_completed/{pushId}
    const analyticsRef = db.ref(`analytics/${tenantId}/${dateKey}/orders_completed`).push();
    
    await analyticsRef.set({
      userPhone: userPhone || 'unknown',
      contactPhone: orderData.contactPhone || null,
      address: orderData.address || null,
      paymentMethod: orderData.paymentMethod || 'unknown',
      total: orderData.total || 0,
      orderId: orderData.orderId || null,
      items: (orderData.items || []).map(item => ({
        nombre: item.nombre || item.name || 'unknown',
        precio: item.precio || item.price || 0,
        cantidad: item.cantidad || item.quantity || 1
      })),
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
    
    console.log(`📊 Analytics: order_completed tracked for tenant ${tenantId} [${dateKey}]`);
  } catch (error) {
    console.error('⚠️ Analytics trackOrderCompleted error:', error.message);
  }
}

/**
 * Registra un pedido perdido porque el usuario alcanzó el límite del plan
 * @param {string} tenantId - ID del tenant
 * @param {string} userPhone - Teléfono del usuario que intentó hacer pedido
 * @param {Object} orderCheck - Datos del chequeo de límite
 */
async function trackOrderLost(tenantId, userPhone, orderCheck) {
  try {
    const db = admin.database();
    const dateKey = getDateKey();
    
    // Estructura: analytics/{tenantId}/{date}/orders_lost/{pushId}
    const analyticsRef = db.ref(`analytics/${tenantId}/${dateKey}/orders_lost`).push();
    
    await analyticsRef.set({
      userPhone: userPhone || 'unknown',
      plan: orderCheck.plan || 'unknown',
      ordersToday: orderCheck.ordersToday || 0,
      ordersLimit: orderCheck.ordersLimit || 0,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
    
    console.log(`📊 Analytics: order_lost tracked for tenant ${tenantId} [${dateKey}]`);
  } catch (error) {
    console.error('⚠️ Analytics trackOrderLost error:', error.message);
  }
}

module.exports = {
  trackOrderCompleted,
  trackOrderLost
};
