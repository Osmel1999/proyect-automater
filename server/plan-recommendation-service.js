/**
 * 📊 Plan Recommendation Service
 * 
 * Analiza los datos de analytics para recomendar el plan óptimo.
 * Solo se ejecuta cuando el usuario va a realizar un pago.
 * 
 * Datos que analiza:
 * - orders_completed: pedidos completados por día
 * - orders_lost: pedidos perdidos por límite del plan
 */

const admin = require('firebase-admin');

// Definición de planes y sus límites (MENSUALES)
const PLANS = {
  emprendedor: {
    id: 'emprendedor',
    name: 'Plan Emprendedor',
    ordersPerMonth: 750,
    ordersPerDay: 25, // Promedio diario (750/30)
    price: 90000,
    priceFormatted: '$90.000 COP/mes'
  },
  profesional: {
    id: 'profesional',
    name: 'Plan Profesional',
    ordersPerMonth: 1500,
    ordersPerDay: 50, // Promedio diario (1500/30)
    price: 120000,
    priceFormatted: '$120.000 COP/mes'
  },
  empresarial: {
    id: 'empresarial',
    name: 'Plan Empresarial',
    ordersPerMonth: 3000,
    ordersPerDay: 100, // Promedio diario (3000/30)
    price: 150000,
    priceFormatted: '$150.000 COP/mes'
  }
};

/**
 * Obtiene las fechas de los últimos N días en formato DD-MM-YY
 * @param {number} days - Número de días a obtener
 * @returns {string[]} Array de fechas
 */
function getLastNDays(days = 7) {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    dates.push(`${day}-${month}-${year}`);
  }
  return dates;
}

/**
 * Obtiene estadísticas de analytics de los últimos N días
 * @param {string} tenantId - ID del tenant
 * @param {number} days - Días a analizar (default 7)
 */
async function getAnalyticsStats(tenantId, days = 7) {
  const db = admin.database();
  const dates = getLastNDays(days);
  
  let totalOrdersCompleted = 0;
  let totalOrdersLost = 0;
  let dailyOrders = [];
  let maxOrdersInOneDay = 0;
  let daysWithLostOrders = 0;
  
  for (const dateKey of dates) {
    try {
      // Contar pedidos completados
      const completedSnapshot = await db
        .ref(`analytics/${tenantId}/${dateKey}/orders_completed`)
        .once('value');
      
      const completedCount = completedSnapshot.exists() 
        ? Object.keys(completedSnapshot.val()).length 
        : 0;
      
      totalOrdersCompleted += completedCount;
      dailyOrders.push(completedCount);
      
      if (completedCount > maxOrdersInOneDay) {
        maxOrdersInOneDay = completedCount;
      }
      
      // Contar pedidos perdidos
      const lostSnapshot = await db
        .ref(`analytics/${tenantId}/${dateKey}/orders_lost`)
        .once('value');
      
      const lostCount = lostSnapshot.exists() 
        ? Object.keys(lostSnapshot.val()).length 
        : 0;
      
      totalOrdersLost += lostCount;
      
      if (lostCount > 0) {
        daysWithLostOrders++;
      }
      
    } catch (error) {
      console.error(`⚠️ Error leyendo analytics para ${dateKey}:`, error.message);
    }
  }
  
  // Calcular promedio diario
  const avgOrdersPerDay = dailyOrders.length > 0 
    ? Math.round(totalOrdersCompleted / dailyOrders.length) 
    : 0;
  
  return {
    period: `${days} días`,
    totalOrdersCompleted,
    totalOrdersLost,
    avgOrdersPerDay,
    maxOrdersInOneDay,
    daysWithLostOrders,
    daysAnalyzed: dates.length
  };
}

/**
 * Genera una recomendación de plan basada en analytics
 * @param {string} tenantId - ID del tenant
 * @param {string} currentPlan - Plan actual del tenant
 */
async function getRecommendation(tenantId, currentPlan = 'trial') {
  try {
    // Obtener estadísticas de los últimos 7 días
    const stats = await getAnalyticsStats(tenantId, 7);
    
    // Calcular el plan recomendado basado en el uso
    let recommendedPlan = 'emprendedor';
    let reasons = [];
    let savings = null;
    let lostRevenue = null;
    
    // Lógica de recomendación
    
    // 1. Si tiene pedidos perdidos, necesita upgrade urgente
    if (stats.totalOrdersLost > 0) {
      reasons.push(`Perdiste ${stats.totalOrdersLost} pedidos potenciales esta semana por límite de plan`);
      
      // Estimar ingreso perdido (asumiendo ticket promedio de $30,000)
      const avgTicket = 30000;
      lostRevenue = stats.totalOrdersLost * avgTicket;
      reasons.push(`Ingreso estimado perdido: $${lostRevenue.toLocaleString()} COP`);
    }
    
    // 2. Recomendar basado en el máximo de pedidos en un día
    if (stats.maxOrdersInOneDay > 75) {
      recommendedPlan = 'empresarial';
      reasons.push(`Tuviste días con ${stats.maxOrdersInOneDay} pedidos (necesitas capacidad para picos)`);
    } else if (stats.maxOrdersInOneDay > 40) {
      recommendedPlan = 'profesional';
      reasons.push(`Tu pico fue de ${stats.maxOrdersInOneDay} pedidos en un día`);
    } else if (stats.maxOrdersInOneDay > 20) {
      recommendedPlan = 'emprendedor';
      reasons.push(`Promedio de ${stats.avgOrdersPerDay} pedidos/día (~${Math.round(stats.avgOrdersPerDay * 30)} pedidos/mes) - perfecto para empezar`);
    }
    
    // 3. Si el promedio está cerca del límite del plan actual
    const currentLimit = PLANS[currentPlan]?.ordersPerMonth || 0;
    const estimatedMonthlyOrders = stats.avgOrdersPerDay * 30;
    if (currentLimit > 0 && estimatedMonthlyOrders > currentLimit * 0.8) {
      reasons.push(`Estás usando el ${Math.round((estimatedMonthlyOrders / currentLimit) * 100)}% de tu límite mensual`);
    }
    
    // 4. Si no hay suficientes datos, dar recomendación conservadora
    if (stats.totalOrdersCompleted === 0 && stats.totalOrdersLost === 0) {
      recommendedPlan = 'emprendedor';
      reasons = ['Plan inicial recomendado para nuevos negocios'];
    }
    
    // Obtener info del plan recomendado
    const planInfo = PLANS[recommendedPlan];
    
    // Calcular si hay ahorro potencial vs pérdidas
    if (lostRevenue && lostRevenue > planInfo.price) {
      savings = lostRevenue - planInfo.price;
      reasons.push(`ROI positivo: recuperarías $${savings.toLocaleString()} COP más de lo que pagas`);
    }
    
    return {
      success: true,
      currentPlan,
      recommendedPlan,
      planInfo,
      reasons,
      stats: {
        ordersPerDay: stats.avgOrdersPerDay,
        maxOrders: stats.maxOrdersInOneDay,
        lostOrders: stats.totalOrdersLost,
        period: stats.period
      },
      financials: {
        lostRevenue,
        planCost: planInfo.price,
        potentialSavings: savings
      },
      urgency: stats.totalOrdersLost > 5 ? 'high' : (stats.totalOrdersLost > 0 ? 'medium' : 'low')
    };
    
  } catch (error) {
    console.error('❌ [PlanRecommendation] Error generando recomendación:', error);
    
    // Fallback: recomendar plan básico
    return {
      success: false,
      error: error.message,
      currentPlan,
      recommendedPlan: 'emprendedor',
      planInfo: PLANS.emprendedor,
      reasons: ['Recomendación por defecto - no hay suficientes datos'],
      stats: null,
      financials: null,
      urgency: 'low'
    };
  }
}

/**
 * Obtiene un resumen rápido de pérdidas por límite (para mostrar alertas)
 * @param {string} tenantId - ID del tenant
 * @param {number} days - Días a revisar
 */
async function getLostOrdersSummary(tenantId, days = 7) {
  try {
    const stats = await getAnalyticsStats(tenantId, days);
    
    if (stats.totalOrdersLost === 0) {
      return {
        hasLostOrders: false,
        message: null
      };
    }
    
    const avgTicket = 30000;
    const estimatedLoss = stats.totalOrdersLost * avgTicket;
    
    return {
      hasLostOrders: true,
      lostCount: stats.totalOrdersLost,
      daysWithLosses: stats.daysWithLostOrders,
      estimatedLoss,
      message: `⚠️ Perdiste ${stats.totalOrdersLost} pedidos esta semana (~$${estimatedLoss.toLocaleString()} COP)`
    };
    
  } catch (error) {
    console.error('❌ [PlanRecommendation] Error obteniendo resumen:', error);
    return { hasLostOrders: false, error: error.message };
  }
}

/**
 * Compara todos los planes y muestra cuál es mejor para el tenant
 * @param {string} tenantId - ID del tenant
 */
async function comparePlans(tenantId) {
  const stats = await getAnalyticsStats(tenantId, 7);
  
  return Object.values(PLANS).map(plan => {
    const coversNeeds = plan.ordersPerMonth >= stats.maxOrdersInOneDay * 30;
    const utilizationPercent = Math.round(((stats.avgOrdersPerDay * 30) / plan.ordersPerMonth) * 100);
    
    return {
      ...plan,
      coversNeeds,
      utilizationPercent: Math.min(utilizationPercent, 100),
      recommendation: coversNeeds 
        ? (utilizationPercent > 70 ? 'óptimo' : 'holgado')
        : 'insuficiente'
    };
  });
}

module.exports = {
  getRecommendation,
  getAnalyticsStats,
  getLostOrdersSummary,
  comparePlans,
  PLANS
};
