/**
 * 📦 Tracking Routes - API para seguimiento de pedidos
 * Permite a los clientes ver el estado de su pedido sin autenticación
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const crypto = require('crypto');

// Secret para generar tokens (usa variable de entorno o fallback)
const TRACKING_SECRET = process.env.TRACKING_SECRET || 'kds-tracking-2024-secret';

/**
 * Genera un token de tracking único para un pedido
 * @param {string} tenantId - ID del tenant
 * @param {string} pedidoId - ID del pedido
 * @returns {string} Token de tracking (12 caracteres)
 */
function generateTrackingToken(tenantId, pedidoId) {
  const data = `${tenantId}:${pedidoId}:${TRACKING_SECRET}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  // Retornar los primeros 12 caracteres en mayúsculas
  return hash.substring(0, 12).toUpperCase();
}

/**
 * Busca un pedido por su token de tracking
 * @param {string} token - Token de tracking
 * @returns {Promise<{tenantId, pedidoKey, pedido}|null>}
 */
async function findPedidoByToken(token) {
  const db = admin.database();
  
  // Buscar en todos los tenants el pedido con este trackingToken
  const tenantsSnapshot = await db.ref('tenants').once('value');
  const tenants = tenantsSnapshot.val() || {};
  
  for (const [tenantId, tenant] of Object.entries(tenants)) {
    const pedidos = tenant.pedidos || {};
    
    for (const [pedidoKey, pedido] of Object.entries(pedidos)) {
      if (pedido.trackingToken === token) {
        return {
          tenantId,
          pedidoKey,
          pedido,
          restaurantName: tenant.config?.restaurantName || tenant.restaurant?.name || 'Restaurante'
        };
      }
    }
  }
  
  return null;
}

/**
 * GET /api/tracking/:token
 * Obtiene el estado de un pedido por su token de tracking
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token || token.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Token inválido'
      });
    }
    
    const result = await findPedidoByToken(token.toUpperCase());
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Pedido no encontrado'
      });
    }
    
    const { pedido, restaurantName } = result;
    
    // Mapear estados a información amigable
    const estadoInfo = getEstadoInfo(pedido.estado);
    
    // Calcular tiempo estimado
    // Usar timestamp si existe, sino usar fechaCreacion o fecha como fallback
    let timestampPedido = pedido.timestamp;
    if (!timestampPedido && pedido.fechaCreacion) {
      timestampPedido = new Date(pedido.fechaCreacion).getTime();
    } else if (!timestampPedido && pedido.fecha) {
      timestampPedido = new Date(pedido.fecha).getTime();
    }
    
    const tiempoTranscurrido = timestampPedido ? Date.now() - timestampPedido : 0;
    const minutosTranscurridos = Math.floor(tiempoTranscurrido / 60000);
    
    // Calcular subtotal si no existe (suma de items)
    let subtotal = pedido.subtotal;
    if (!subtotal && pedido.items) {
      subtotal = pedido.items.reduce((sum, item) => {
        return sum + ((item.precio || 0) * (item.cantidad || 1));
      }, 0);
    }
    
    // Obtener costo de envío (puede ser 0 si no aplica)
    const costoEnvio = pedido.costoEnvio || 0;
    
    res.json({
      success: true,
      order: {
        id: pedido.id,
        estado: pedido.estado,
        estadoInfo,
        restaurante: restaurantName,
        items: pedido.items?.map(item => ({
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio: item.precio
        })) || [],
        subtotal: subtotal,
        costoEnvio: costoEnvio,
        total: pedido.total,
        direccion: pedido.direccion,
        metodoPago: pedido.metodoPago || 'efectivo',
        fecha: pedido.fecha,
        timestamp: pedido.timestamp,
        minutosTranscurridos,
        // Timeline de estados
        timeline: buildTimeline(pedido)
      }
    });
    
  } catch (error) {
    console.error('❌ [Tracking] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el pedido'
    });
  }
});

/**
 * Obtiene información amigable del estado
 */
function getEstadoInfo(estado) {
  const estados = {
    'pendiente': {
      label: 'En Cola',
      description: 'Tu pedido está en la cola esperando ser preparado',
      icon: '⏳',
      color: '#f59e0b',
      step: 1
    },
    'preparando': {
      label: 'En Preparacion',
      description: 'El chef esta preparando tu pedido',
      icon: 'chef',
      color: '#3b82f6',
      step: 2
    },
    'cocinando': {
      label: 'En Preparacion',
      description: 'Tu pedido esta siendo preparado en cocina',
      icon: 'fire',
      color: '#f97316',
      step: 2
    },
    'listo': {
      label: 'Listo',
      description: 'Tu pedido está listo y será enviado pronto',
      icon: '✅',
      color: '#22c55e',
      step: 3
    },
    'enviado': {
      label: 'En Camino',
      description: 'El domiciliario está en camino con tu pedido',
      icon: '🛵',
      color: '#8b5cf6',
      step: 4
    },
    'entregado': {
      label: 'Entregado',
      description: '¡Tu pedido ha sido entregado! ¡Buen provecho!',
      icon: '🎉',
      color: '#10b981',
      step: 5
    },
    'cancelado': {
      label: 'Cancelado',
      description: 'Este pedido fue cancelado',
      icon: '❌',
      color: '#ef4444',
      step: -1
    }
  };
  
  return estados[estado] || estados['pendiente'];
}

/**
 * Construye el timeline de estados del pedido
 */
function buildTimeline(pedido) {
  const timeline = [
    {
      estado: 'pendiente',
      label: 'Pedido Recibido',
      icon: 'clipboard',
      completed: true,
      timestamp: pedido.timestamp
    },
    {
      estado: 'preparando',
      label: 'En Preparacion',
      icon: 'fire',
      completed: ['preparando', 'cocinando', 'listo', 'enviado', 'entregado'].includes(pedido.estado),
      timestamp: pedido.inicioCocinado || pedido.preparandoAt || null
    },
    {
      estado: 'listo',
      label: 'Listo para Envio',
      icon: 'check',
      completed: ['listo', 'enviado', 'entregado'].includes(pedido.estado),
      timestamp: pedido.horaListo || pedido.listoAt || null
    },
    {
      estado: 'enviado',
      label: 'En Camino',
      icon: 'truck',
      completed: ['enviado', 'entregado'].includes(pedido.estado),
      timestamp: pedido.enviadoAt || null
    },
    {
      estado: 'entregado',
      label: 'Entregado',
      icon: 'star',
      completed: pedido.estado === 'entregado',
      timestamp: pedido.entregadoAt || null
    }
  ];
  
  // Marcar el estado actual (cocinando equivale a preparando)
  const estadoActual = pedido.estado === 'cocinando' ? 'preparando' : pedido.estado;
  const currentIndex = timeline.findIndex(t => t.estado === estadoActual);
  if (currentIndex >= 0) {
    timeline[currentIndex].current = true;
  }
  
  return timeline;
}

// Exportar funciones para uso en otros módulos
module.exports = router;
module.exports.generateTrackingToken = generateTrackingToken;
module.exports.findPedidoByToken = findPedidoByToken;
