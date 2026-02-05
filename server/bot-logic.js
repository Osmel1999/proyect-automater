/**
 * Lógica del Bot de WhatsApp para Pedidos Automáticos (Multi-tenant)
 * Maneja conversaciones, carritos y confirmación de pedidos
 * Soporta múltiples restaurantes (tenants) con datos aislados
 */

const menuService = require('./menu-service');
const firebaseService = require('./firebase-service');
const tenantService = require('./tenant-service');
const membershipService = require('./membership-service');
const analyticsService = require('./analytics-service');
const notificationService = require('./notification-service');
const { parsearPedido, generarMensajeConfirmacion } = require('./pedido-parser');
const paymentService = require('./payment-service');
const paymentConfigService = require('./payments/payment-config-service');
const { generateTrackingToken } = require('./routes/tracking-routes');

// Almacenamiento en memoria de sesiones de usuario por tenant
// Formato: Map<tenantId_telefono, sesion>
const sesionesUsuarios = new Map();

// Caché de membresías por tenant (se verifica solo 1 vez al día)
// Formato: Map<tenantId, { result: Object, checkedAt: timestamp }>
const membershipCache = new Map();
const MEMBERSHIP_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas en ms

// Confirmaciones naturales que el bot entiende (constante a nivel de módulo)
const CONFIRMACIONES_NATURALES = [
  'confirmar', 'si', 'sí', 'ok', 'listo', 'correcto', 
  'dale', 'okay', 'va', 'claro', 'afirmativo', 'sale',
  'oki', 'okey', 'sep', 'yes', 'yep', 'ya', 'vale',
  'perfecto', 'exacto', 'eso', 'así es', 'por supuesto',
  'confirmo', 'confirm', 'está bien', 'esta bien'
];

/**
 * Formatea un precio con separadores de miles
 * @param {number} precio - Precio a formatear
 * @returns {string} Precio formateado (ej: 40000 → "40.000")
 */
function formatearPrecio(precio) {
  if (!precio || isNaN(precio)) return '0';
  return Number(precio).toLocaleString('es-CO');
}

/**
 * Agrupa items del carrito por producto y suma cantidades
 * @param {Array} carrito - Array de items del carrito
 * @returns {Array} Array de items agrupados con cantidades sumadas
 */
function agruparCarrito(carrito) {
  const itemsAgrupados = {};
  carrito.forEach(item => {
    const key = item.numero || item.nombre;
    if (!itemsAgrupados[key]) {
      itemsAgrupados[key] = { ...item, cantidad: 0 };
    }
    itemsAgrupados[key].cantidad += item.cantidad || 1;
  });
  return Object.values(itemsAgrupados);
}

/**
 * Obtiene el tiempo de entrega configurado para el restaurante
 * @param {string} tenantId - ID del restaurante
 * @returns {Promise<string>} Texto del tiempo estimado (ej: "30-40 minutos")
 */
async function obtenerTiempoEntrega(tenantId) {
  try {
    console.log(`🕒 [obtenerTiempoEntrega] Buscando tiempo para tenant: ${tenantId}`);
    const snapshot = await firebaseService.database.ref(`tenants/${tenantId}/config/deliveryTime`).once('value');
    const deliveryTime = snapshot.val();
    
    console.log(`🕒 [obtenerTiempoEntrega] Datos obtenidos:`, deliveryTime);
    
    if (deliveryTime && deliveryTime.min && deliveryTime.max) {
      const tiempo = `${deliveryTime.min}-${deliveryTime.max} minutos`;
      console.log(`✅ [obtenerTiempoEntrega] Tiempo personalizado: ${tiempo}`);
      return tiempo;
    }
    
    // Valor por defecto si no está configurado
    console.warn(`⚠️ [obtenerTiempoEntrega] No hay tiempo configurado, usando por defecto`);
    return '30-40 minutos';
  } catch (error) {
    console.error('❌ [obtenerTiempoEntrega] Error:', error);
    return '30-40 minutos';
  }
}

/**
 * Obtiene el costo de envío configurado para el restaurante
 * @param {string} tenantId - ID del restaurante
 * @param {number} subtotal - Subtotal del pedido (para calcular si aplica envío gratis)
 * @returns {Promise<{cost: number, freeDeliveryMin: number|null, isFree: boolean}>} Datos del envío
 */
async function obtenerCostoEnvio(tenantId, subtotal = 0) {
  try {
    console.log(`🚚 [obtenerCostoEnvio] Buscando costo para tenant: ${tenantId}, subtotal: $${subtotal}`);
    const snapshot = await firebaseService.database.ref(`tenants/${tenantId}/config/deliveryCost`).once('value');
    const deliveryCost = snapshot.val();
    
    console.log(`🚚 [obtenerCostoEnvio] Datos obtenidos:`, deliveryCost);
    
    if (deliveryCost) {
      const cost = deliveryCost.cost || 0;
      const freeDeliveryMin = deliveryCost.freeDeliveryMin || null;
      
      // Verificar si aplica envío gratis por monto mínimo
      const isFree = cost === 0 || (freeDeliveryMin && subtotal >= freeDeliveryMin);
      
      console.log(`✅ [obtenerCostoEnvio] Costo: $${cost}, Min gratis: $${freeDeliveryMin}, Es gratis: ${isFree}`);
      
      return {
        cost: isFree ? 0 : cost,
        freeDeliveryMin,
        isFree
      };
    }
    
    // Valor por defecto si no está configurado (sin costo de envío)
    console.warn(`⚠️ [obtenerCostoEnvio] No hay costo configurado, usando 0`);
    return { cost: 0, freeDeliveryMin: null, isFree: true };
  } catch (error) {
    console.error('❌ [obtenerCostoEnvio] Error:', error);
    return { cost: 0, freeDeliveryMin: null, isFree: true };
  }
}

/**
 * Crea una descripción natural de un item con cantidad
 * @param {string} nombreItem - Nombre del item en minúsculas
 * @param {number} cantidad - Cantidad del item
 * @returns {string} Descripción natural (ej: "una hamburguesa", "dos pizzas")
 */
function descripcionNaturalItem(nombreItem, cantidad) {
  if (cantidad === 1) {
    return `una ${nombreItem}`;
  } else if (cantidad === 2) {
    const nombrePlural = nombreItem.endsWith('s') ? nombreItem : `${nombreItem}s`;
    return `dos ${nombrePlural}`;
  } else {
    const nombrePlural = nombreItem.endsWith('s') ? nombreItem : `${nombreItem}s`;
    return `${cantidad} ${nombrePlural}`;
  }
}

/**
 * Genera clave única para sesión de usuario en un tenant
 */
function generarClaveSesion(tenantId, telefono) {
  return `${tenantId}_${telefono}`;
}

/**
 * Obtiene o crea una sesión de usuario para un tenant específico
 */
function obtenerSesion(tenantId, telefono) {
  const clave = generarClaveSesion(tenantId, telefono);
  
  if (!sesionesUsuarios.has(clave)) {
    sesionesUsuarios.set(clave, {
      tenantId,
      telefono,
      carrito: [],
      ultimaActividad: Date.now(),
      esperandoConfirmacion: false,
      pedidoPendiente: null,
      esperandoDireccion: false,
      direccion: null,
      esperandoTelefono: false,
      telefonoContacto: null,
      esperandoMetodoPago: false,
      metodoPago: null,
      // ✨ Nuevo: Estado para confirmación de pedido rápido
      esperandoConfirmacionRapida: false,
      pedidoRapidoPendiente: null
    });
  }
  
  const sesion = sesionesUsuarios.get(clave);
  sesion.ultimaActividad = Date.now();
  
  return sesion;
}

/**
 * Limpia sesiones inactivas (más de 30 minutos)
 */
function limpiarSesionesInactivas() {
  const ahora = Date.now();
  const TIMEOUT = 30 * 60 * 1000; // 30 minutos
  
  for (const [clave, sesion] of sesionesUsuarios.entries()) {
    if (ahora - sesion.ultimaActividad > TIMEOUT) {
      sesionesUsuarios.delete(clave);
      console.log(`🧹 Sesión limpiada: ${clave}`);
    }
  }
}

// Limpiar sesiones cada 10 minutos
setInterval(limpiarSesionesInactivas, 10 * 60 * 1000);

// ====================================
// CACHÉ DE MENÚ - OPTIMIZACIÓN
// Reduce lecturas de Firebase en ~30%
// ====================================
const menuCache = new Map();
const MENU_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene el menú del tenant con caché
 * El menú raramente cambia, así que lo cacheamos por 5 minutos
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<Array>} Array de items del menú
 */
async function obtenerMenuTenantCached(tenantId) {
  const cached = menuCache.get(tenantId);
  
  // Si hay caché válido, usarlo
  if (cached && Date.now() - cached.timestamp < MENU_CACHE_TTL) {
    console.log(`📦 [CACHÉ] Menú del tenant ${tenantId} desde caché (${cached.data.length} items)`);
    return cached.data;
  }
  
  // Si no hay caché o expiró, obtener de Firebase
  console.log(`🔄 [CACHÉ] Actualizando menú del tenant ${tenantId} desde Firebase`);
  const menu = await obtenerMenuTenant(tenantId);
  
  // Guardar en caché
  menuCache.set(tenantId, { 
    data: menu, 
    timestamp: Date.now() 
  });
  
  return menu;
}

/**
 * Invalida el caché del menú de un tenant
 * Llamar cuando se actualiza el menú desde el dashboard
 * @param {string} tenantId - ID del tenant
 */
function invalidarCacheMenu(tenantId) {
  if (menuCache.has(tenantId)) {
    menuCache.delete(tenantId);
    console.log(`🗑️ [CACHÉ] Menú del tenant ${tenantId} invalidado`);
  }
}

// Limpiar cachés expirados cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [tenantId, cached] of menuCache.entries()) {
    if (now - cached.timestamp > MENU_CACHE_TTL) {
      menuCache.delete(tenantId);
      console.log(`🧹 [CACHÉ] Menú expirado eliminado: ${tenantId}`);
    }
  }
}, 10 * 60 * 1000);

/**
 * Obtiene el menú del tenant desde Firebase en formato para el parser
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<Array>} Array de items del menú en formato parser
 */
async function obtenerMenuTenant(tenantId) {
  try {
    // Usar el nuevo menu-service
    const items = await menuService.obtenerTodos(tenantId);
    console.log(`✅ Menú del tenant ${tenantId} cargado: ${items.length} items`);
    return items;
  } catch (error) {
    console.error(`❌ Error obteniendo menú del tenant ${tenantId}:`, error);
    // Fallback: usar menú de ejemplo
    return menuService.obtenerMenuEjemplo();
  }
}

// ====================================
// MODO PEDIDO RÁPIDO
// Sistema de formulario para pedidos eficientes
// ====================================

/**
 * Genera los mensajes de saludo y formulario para el modo pedido rápido
 * Retorna un array con dos mensajes: saludo y formulario
 * @param {string} tenantId - ID del tenant
 * @param {boolean} incluirSaludo - Si incluir mensaje de bienvenida
 * @returns {Promise<string[]>} Array con los mensajes a enviar
 */
async function generarMensajePedidoRapido(tenantId, incluirSaludo = true) {
  try {
    // Obtener nombre del restaurante
    const tenantSnapshot = await firebaseService.database.ref(`tenants/${tenantId}/profile/businessName`).once('value');
    const nombreRestaurante = tenantSnapshot.val() || 'nuestro restaurante';
    
    // Obtener mensaje de bienvenida personalizado
    const messagesSnapshot = await firebaseService.database.ref(`tenants/${tenantId}/bot/messages`).once('value');
    const messages = messagesSnapshot.val();
    
    // Verificar si Wompi/pagos con tarjeta está habilitado
    let pagoTarjetaHabilitado = false;
    try {
      const paymentConfig = await paymentConfigService.getConfig(tenantId);
      pagoTarjetaHabilitado = paymentConfig && paymentConfig.enabled === true;
    } catch (e) {
      console.log(`[PedidoRapido] No se pudo verificar config de pagos: ${e.message}`);
    }
    
    // Mensaje 1: Saludo y explicación
    let saludoMsg = '';
    if (incluirSaludo) {
      saludoMsg = messages?.welcome || `👋 Hola! Bienvenido a ${nombreRestaurante}`;
    }
    
    const explicacionMsg = `${saludoMsg}

📋 Mira nuestro menu en el catalogo
(Toca el icono de tienda 🛒 en este chat)

⚡ Para hacer tu pedido de forma rapida:
1️⃣ Copia el formulario del siguiente mensaje
2️⃣ Completalo con tu pedido
3️⃣ Envialo de vuelta

Es muy facil! 😊`;

    // Mensaje 2: Formulario para copiar (con o sin opcion de tarjeta)
    const opcionPago = pagoTarjetaHabilitado ? 'Efectivo / Tarjeta' : 'Efectivo';
    
    const formularioMsg = `━━━━━━━━━━━━━━━━━━
📦 *MI PEDIDO:*
• (escribe aqui los productos)
• Puedes agregar notas: 1 Pizza (sin cebolla)

📍 *DIRECCION:*
• (tu direccion completa)

📞 *TELEFONO:*
• (numero de contacto)

 *PAGO:* ${opcionPago}
━━━━━━━━━━━━━━━━━━`;

    // Retornamos un objeto especial que indica múltiples mensajes
    return {
      type: 'multiple',
      messages: [explicacionMsg, formularioMsg]
    };
    
  } catch (error) {
    console.error('Error generando mensaje de pedido rapido:', error);
    // Fallback simple (solo efectivo por seguridad)
    return {
      type: 'multiple', 
      messages: [
        '👋 Hola! Bienvenido\n\n📋 Mira nuestro menu en el catalogo y copia el formulario del siguiente mensaje para hacer tu pedido.',
        `━━━━━━━━━━━━━━━━━━
📦 *MI PEDIDO:*
• (productos)
• Puedes agregar notas: 1 Pizza (sin cebolla)

📍 *DIRECCION:*
• (direccion)

📞 *TELEFONO:*
• (telefono)

 *PAGO:* Efectivo
━━━━━━━━━━━━━━━━━━`
      ]
    };
  }
}

/**
 * Detecta si un mensaje tiene el formato de pedido rápido estructurado
 * @param {string} texto - Mensaje a analizar
 * @returns {boolean} True si parece formato de pedido rápido
 */
function esFormatoPedidoRapido(texto) {
  const indicadores = [
    'mi pedido:',
    'pedido:',
    'dirección:',
    'direccion:',
    'teléfono:',
    'telefono:',
    'pago:'
  ];
  
  const textoLower = texto.toLowerCase();
  const coincidencias = indicadores.filter(ind => textoLower.includes(ind));
  
  // Si tiene al menos 2 indicadores, es formato de pedido rápido
  return coincidencias.length >= 2;
}

/**
 * Parsea un mensaje con formato de pedido rápido estructurado
 * @param {string} texto - Mensaje con formato estructurado
 * @returns {Object} Objeto con pedido, direccion, telefono, metodoPago
 */
function parsearPedidoRapido(texto) {
  const resultado = {
    pedidoTexto: null,
    direccion: null,
    telefono: null,
    comentario: null, // 📝 Nuevo campo para comentarios
    metodoPago: null,
    valido: false
  };
  
  const lineas = texto.split('\n');
  let seccionActual = null;
  let contenidoSeccion = [];
  
  for (const linea of lineas) {
    const lineaLower = linea.toLowerCase().trim();
    const lineaOriginal = linea.trim();
    
    // Detectar inicio de sección
    if (lineaLower.includes('pedido:') || lineaLower.includes('mi pedido:')) {
      // Guardar sección anterior si existe
      if (seccionActual && contenidoSeccion.length > 0) {
        guardarSeccion(resultado, seccionActual, contenidoSeccion.join(' '));
      }
      seccionActual = 'pedido';
      contenidoSeccion = [];
      // Extraer contenido de la misma línea si existe
      const match = lineaOriginal.match(/(?:mi )?pedido:\s*(.+)/i);
      if (match && match[1] && !match[1].startsWith('•') && match[1].trim() !== '') {
        contenidoSeccion.push(match[1].trim());
      }
    } else if (lineaLower.includes('dirección:') || lineaLower.includes('direccion:')) {
      if (seccionActual && contenidoSeccion.length > 0) {
        guardarSeccion(resultado, seccionActual, contenidoSeccion.join(' '));
      }
      seccionActual = 'direccion';
      contenidoSeccion = [];
      const match = lineaOriginal.match(/direcci[oó]n:\s*(.+)/i);
      if (match && match[1] && !match[1].startsWith('•') && match[1].trim() !== '') {
        contenidoSeccion.push(match[1].trim());
      }
    } else if (lineaLower.includes('teléfono:') || lineaLower.includes('telefono:')) {
      if (seccionActual && contenidoSeccion.length > 0) {
        guardarSeccion(resultado, seccionActual, contenidoSeccion.join(' '));
      }
      seccionActual = 'telefono';
      contenidoSeccion = [];
      const match = lineaOriginal.match(/tel[eé]fono:\s*(.+)/i);
      if (match && match[1] && !match[1].startsWith('•') && match[1].trim() !== '') {
        contenidoSeccion.push(match[1].trim());
      }
    } else if (lineaLower.includes('comentario:') || lineaLower.includes('nota:') || lineaLower.includes('observación:') || lineaLower.includes('observacion:')) {
      // 📝 Nueva sección para comentarios
      if (seccionActual && contenidoSeccion.length > 0) {
        guardarSeccion(resultado, seccionActual, contenidoSeccion.join(' '));
      }
      seccionActual = 'comentario';
      contenidoSeccion = [];
      const match = lineaOriginal.match(/(?:comentario|nota|observaci[oó]n):\s*(.+)/i);
      if (match && match[1] && !match[1].startsWith('•') && match[1].trim() !== '') {
        contenidoSeccion.push(match[1].trim());
      }
    } else if (lineaLower.includes('pago:')) {
      if (seccionActual && contenidoSeccion.length > 0) {
        guardarSeccion(resultado, seccionActual, contenidoSeccion.join(' '));
      }
      seccionActual = 'pago';
      contenidoSeccion = [];
      const match = lineaOriginal.match(/pago:\s*(.+)/i);
      if (match && match[1]) {
        contenidoSeccion.push(match[1].trim());
      }
    } else if (seccionActual && lineaOriginal && !lineaOriginal.match(/^[━═─]+$/)) {
      // Agregar contenido a la sección actual (ignorar líneas decorativas)
      let contenido = lineaOriginal.replace(/^[•\-\*]\s*/, '').trim();
      // Ignorar placeholders
      if (contenido && 
          !contenido.includes('escribe aquí') && 
          !contenido.includes('tu dirección') &&
          !contenido.includes('número de contacto') &&
          !contenido.includes('(productos)') &&
          !contenido.includes('(dirección)') &&
          !contenido.includes('(teléfono)') &&
          !contenido.includes('(opcional)') &&
          contenido !== '') {
        contenidoSeccion.push(contenido);
      }
    }
  }
  
  // Guardar última sección
  if (seccionActual && contenidoSeccion.length > 0) {
    guardarSeccion(resultado, seccionActual, contenidoSeccion.join(' '));
  }
  
  // Validar que tenga al menos pedido y dirección
  resultado.valido = resultado.pedidoTexto && resultado.direccion;
  
  // Detectar método de pago
  if (resultado.metodoPago) {
    const pagoLower = resultado.metodoPago.toLowerCase();
    if (pagoLower.includes('tarjeta') || pagoLower.includes('card') || pagoLower.includes('online')) {
      resultado.metodoPago = 'tarjeta';
    } else {
      resultado.metodoPago = 'efectivo';
    }
  } else {
    resultado.metodoPago = 'efectivo'; // Default
  }
  
  console.log('📋 Pedido rápido parseado:', resultado);
  return resultado;
}

/**
 * Helper para guardar contenido en la sección correspondiente
 */
function guardarSeccion(resultado, seccion, contenido) {
  if (!contenido || contenido.trim() === '') return;
  
  switch (seccion) {
    case 'pedido':
      resultado.pedidoTexto = contenido.trim();
      break;
    case 'direccion':
      resultado.direccion = contenido.trim();
      break;
    case 'telefono':
      resultado.telefono = contenido.trim();
      break;
    case 'comentario': // 📝 Nuevo caso para comentarios
      resultado.comentario = contenido.trim();
      break;
    case 'pago':
      resultado.metodoPago = contenido.trim();
      break;
  }
}

/**
 * Procesa un pedido rápido completo (formato estructurado) y lo confirma directamente
 * @param {string} tenantId - ID del tenant
 * @param {Object} sesion - Sesión del usuario
 * @param {string} textoOriginal - Mensaje original con el formato
 * @returns {Promise<string|Object>} Mensaje de confirmación o error
 */
async function procesarPedidoRapidoCompleto(tenantId, sesion, textoOriginal) {
  // Parsear el formulario
  const datosPedido = parsearPedidoRapido(textoOriginal);
  
  if (!datosPedido.valido) {
    return `⚠️ *Formulario incompleto*

Parece que faltan datos en tu pedido. Asegúrate de incluir:
• Los productos que deseas
• Tu dirección de entrega

📝 Escribe *hola* para recibir el formulario de nuevo.`;
  }
  
  // Parsear los productos del texto del pedido
  const menuTenant = await obtenerMenuTenantCached(tenantId);
  const { parsearPedido } = require('./pedido-parser');
  
  console.log(`🔍 [Pedido Rápido] Texto a parsear: "${datosPedido.pedidoTexto}"`);
  console.log(`🔍 [Pedido Rápido] Items en menú: ${menuTenant.length}`);
  
  const resultadoParseo = parsearPedido(datosPedido.pedidoTexto, menuTenant);
  
  console.log(`🔍 [Pedido Rápido] Resultado parseo:`, JSON.stringify(resultadoParseo, null, 2));
  
  if (!resultadoParseo.exitoso || resultadoParseo.items.length === 0) {
    return `⚠️ *No encontré los productos*

No pude identificar los productos en tu pedido:
"${datosPedido.pedidoTexto}"

💡 Revisa el catálogo y asegúrate de escribir los nombres correctamente.
📝 Escribe *hola* para recibir el formulario de nuevo.`;
  }
  
  // LIMPIAR CARRITO ANTES de agregar nuevos items
  console.log(`🧹 [Pedido Rápido] Limpiando carrito anterior (tenía ${sesion.carrito?.length || 0} items)`);
  sesion.carrito = [];
  
  resultadoParseo.items.forEach(item => {
    for (let i = 0; i < item.cantidad; i++) {
      sesion.carrito.push({
        numero: item.numero,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: 1
      });
    }
  });
  
  console.log(`📦 [Pedido Rápido] Nuevo carrito:`, JSON.stringify(sesion.carrito, null, 2));
  
  // Guardar dirección, teléfono, comentario y método de pago
  sesion.direccion = datosPedido.direccion;
  sesion.telefonoContacto = datosPedido.telefono || sesion.telefono;
  // 📝 Usar notas del parseo si existen, si no usar el comentario del pedido rápido
  sesion.comentario = resultadoParseo.notas || datosPedido.comentario || null;
  sesion.metodoPago = datosPedido.metodoPago || 'efectivo';
  
  // Calcular totales
  const itemsAgrupados = agruparCarrito(sesion.carrito);
  const subtotal = sesion.carrito.reduce((sum, item) => sum + item.precio, 0);
  
  // Obtener costo de envío
  const envioData = await obtenerCostoEnvio(tenantId, subtotal);
  const costoEnvio = envioData.cost;
  const total = subtotal + costoEnvio;
  
  // Generar resumen para confirmación
  let resumenItems = itemsAgrupados.map(item => 
    `- ${item.cantidad}x ${item.nombre} - $${formatearPrecio(item.precio * item.cantidad)}`
  ).join('\n');
  
  // Linea de envio
  let lineaEnvio = '';
  if (envioData.isFree && envioData.freeDeliveryMin && subtotal >= envioData.freeDeliveryMin) {
    lineaEnvio = `Envio: GRATIS! (pedido mayor a $${formatearPrecio(envioData.freeDeliveryMin)})`;
  } else if (costoEnvio === 0) {
    lineaEnvio = `Envio: GRATIS!`;
  } else {
    lineaEnvio = `Envio: $${formatearPrecio(costoEnvio)}`;
  }
  
  // Guardar datos del pedido y esperar confirmacion del cliente
  sesion.esperandoConfirmacionRapida = true;
  sesion.pedidoRapidoPendiente = {
    items: itemsAgrupados,
    subtotal: subtotal,
    costoEnvio: costoEnvio,
    total: total,
    direccion: sesion.direccion,
    telefono: sesion.telefonoContacto,
    metodoPago: sesion.metodoPago
  };
  
  // Mostrar resumen y pedir confirmación
  return `📋 *Resumen de tu pedido:*

${resumenItems}
${sesion.comentario ? `\n📝 *Nota:* ${sesion.comentario}\n` : ''}
----------------------
💰 Subtotal: $${formatearPrecio(subtotal)}
${lineaEnvio}
💳 *Total:* $${formatearPrecio(total)}
📍 Direccion: ${sesion.direccion}
📱 Telefono: ${sesion.telefonoContacto}
💵 Pago: ${sesion.metodoPago === 'tarjeta' ? 'Tarjeta 💳' : 'Efectivo 💵'}
----------------------

✅ Todo esta correcto?

*Confirmar* - Escribe *si* o *confirmar*
✏️ *Editar* - Escribe *editar* o *cambiar*
❌ *Cancelar* - Escribe *cancelar* o *no*`;
}

/**
 * Procesa la confirmación del pedido rápido (cuando el cliente responde si/no/editar)
 */
async function procesarConfirmacionRapida(tenantId, sesion, texto) {
  const textoLower = texto.toLowerCase().trim();
  
  // Palabras para CONFIRMAR
  const palabrasConfirmar = ['si', 'sí', 'confirmar', 'confirmo', 'ok', 'dale', 'listo', 'va', 'correcto', 'perfecto'];
  
  // Palabras para CANCELAR
  const palabrasCancelar = ['no', 'cancelar', 'cancela', 'anular', 'nada', 'olvidalo', 'olvídalo'];
  
  // Palabras para EDITAR
  const palabrasEditar = ['editar', 'cambiar', 'modificar', 'corregir', 'cambio', 'edito'];
  
  // CONFIRMAR PEDIDO
  if (palabrasConfirmar.some(p => textoLower === p || textoLower.startsWith(p + ' '))) {
    const pedido = sesion.pedidoRapidoPendiente;
    
    // Limpiar estado de espera
    sesion.esperandoConfirmacionRapida = false;
    
    // Si es pago con tarjeta, generar link
    if (pedido.metodoPago === 'tarjeta') {
      try {
        const paymentConfig = await paymentConfigService.getConfig(tenantId);
        
        if (paymentConfig.enabled) {
          // Generar ID de pedido para el pago
          const numeroHex = Date.now().toString(16).slice(-6).toUpperCase();
          const orderId = `${tenantId}_${numeroHex}_${Date.now()}`;
          
          // Crear pedido temporal (como en flujo conversacional)
          const pedidoTemporal = {
            id: numeroHex,
            orderId: orderId,
            tenantId: tenantId,
            cliente: sesion.telefono,
            telefono: sesion.telefono,
            telefonoContacto: pedido.telefono || sesion.telefono,
            direccion: pedido.direccion || 'No especificada',
            items: pedido.items,
            subtotal: pedido.subtotal,
            costoEnvio: pedido.costoEnvio,
            total: pedido.total,
            estado: 'awaiting_payment',
            timestamp: Date.now(),
            fecha: new Date().toISOString(),
            fuente: 'whatsapp',
            paymentStatus: 'PENDING',
            metodoPago: 'tarjeta',
            creadoPor: 'pedido_rapido'
          };
          
          // Guardar pedido temporal
          await firebaseService.database.ref(`orders/${orderId}`).set(pedidoTemporal);
          
          // Llamar a createPaymentLink con el formato correcto
          const paymentResult = await paymentService.createPaymentLink({
            restaurantId: tenantId,
            orderId: orderId,
            amount: pedido.total * 100, // Total en centavos (incluye envio)
            customerPhone: sesion.telefono,
            customerName: `Cliente ${sesion.telefono}`,
            customerEmail: `${sesion.telefono}@kdsapp.site`,
            orderDetails: {
              items: pedido.items.map(i => ({
                name: i.nombre,
                quantity: i.cantidad,
                price: i.precio,
              })),
              deliveryAddress: pedido.direccion,
              contactPhone: pedido.telefono,
              orderNumber: numeroHex,
              deliveryCost: pedido.costoEnvio,
            },
          });
          
          if (paymentResult.success) {
            sesion.esperandoPago = true;
            sesion.paymentData = {
              items: pedido.items,
              subtotal: pedido.subtotal,
              costoEnvio: pedido.costoEnvio,
              total: pedido.total,
              direccion: pedido.direccion,
              telefono: pedido.telefono,
              paymentUrl: paymentResult.paymentLink,
              orderId: orderId
            };
            
            sesion.pedidoRapidoPendiente = null;
            
            let resumenItems = pedido.items.map(item => 
              `- ${item.cantidad}x ${item.nombre}`
            ).join('\n');
            
            // Linea de envio
            let lineaEnvioMsg = pedido.costoEnvio > 0 ? `Envio: $${formatearPrecio(pedido.costoEnvio)}` : 'Envio: GRATIS';
            
            return `✅ *Pedido confirmado!*

${resumenItems}

💰 Subtotal: $${formatearPrecio(pedido.subtotal)}
${lineaEnvioMsg}
💳 *Total: $${formatearPrecio(pedido.total)}*

💳 *Pagar con tarjeta:*
${paymentResult.paymentLink}

⏳ Una vez realices el pago, tu pedido sera enviado a cocina automaticamente.`;
          } else {
            // Si falla crear el link, eliminar pedido temporal y continuar con efectivo
            await firebaseService.database.ref(`orders/${orderId}`).remove();
            console.error('Error generando link de pago:', paymentResult.error);
            pedido.metodoPago = 'efectivo';
          }
        } else {
          // Wompi desactivado - continuar con efectivo
          console.log('[PedidoRapido] Wompi desactivado, cambiando a efectivo');
          pedido.metodoPago = 'efectivo';
        }
      } catch (error) {
        console.error('Error generando link de pago:', error);
        pedido.metodoPago = 'efectivo';
      }
    }
    
    // Pago en efectivo - finalizar pedido
    sesion.pedidoRapidoPendiente = null;
    return await finalizarPedidoRapido(tenantId, sesion, pedido.items, pedido.subtotal, pedido.costoEnvio, pedido.total);
  }
  
  // ❌ CANCELAR PEDIDO
  if (palabrasCancelar.some(p => textoLower === p || textoLower.startsWith(p + ' '))) {
    // Limpiar todo
    sesion.esperandoConfirmacionRapida = false;
    sesion.pedidoRapidoPendiente = null;
    sesion.carrito = [];
    sesion.direccion = null;
    sesion.telefonoContacto = null;
    sesion.metodoPago = null;
    
    return `❌ *Pedido cancelado*

No te preocupes, tu pedido ha sido cancelado. 😊

Escribe *hola* 👋 cuando quieras hacer un nuevo pedido.`;
  }
  
  // EDITAR PEDIDO
  if (palabrasEditar.some(p => textoLower === p || textoLower.startsWith(p + ' '))) {
    // Limpiar estado pero mantener info para nuevo intento
    sesion.esperandoConfirmacionRapida = false;
    sesion.pedidoRapidoPendiente = null;
    sesion.carrito = [];
    
    return `✏️ *Vamos a editar tu pedido*

Por favor, envia nuevamente el formulario con los cambios que deseas:

━━━━━━━━━━━━━━━━━━
📦 *MI PEDIDO:*
• (escribe aqui los productos)
• Puedes agregar notas: 1 Pizza (sin cebolla)

📍 *DIRECCION:*
• ${sesion.direccion || 'tu direccion'}

📞 *TELEFONO:*
• ${sesion.telefonoContacto || 'tu numero'}

 *PAGO:* Efectivo
━━━━━━━━━━━━━━━━━━

📝 Copia, edita y envia el formulario con tus cambios.`;
  }
  
  // No entendió la respuesta
  return `🤔 No entendi tu respuesta.

Por favor responde:
✅ *si* o *confirmar* - para confirmar el pedido
✏️ *editar* o *cambiar* - para modificar el pedido  
❌ *cancelar* o *no* - para cancelar el pedido`;
}

/**
 * Finaliza un pedido rápido y lo guarda en Firebase
 */
async function finalizarPedidoRapido(tenantId, sesion, itemsAgrupados, subtotal, costoEnvio, total) {
  try {
    console.log(`[finalizarPedidoRapido] Items a guardar:`, JSON.stringify(itemsAgrupados, null, 2));
    console.log(`[finalizarPedidoRapido] Subtotal: $${subtotal}, Envio: $${costoEnvio}, Total: $${total}`);
    
    // Generar ID de pedido corto
    const orderId = Math.random().toString(16).substring(2, 8).toUpperCase();
    
    // Generar token de tracking (pasando tenantId y orderId para token único)
    const trackingToken = generateTrackingToken(tenantId, orderId);
    
    console.log(`[finalizarPedidoRapido] OrderId: ${orderId}, TrackingToken: ${trackingToken}`);
    
    // Obtener nombre del restaurante
    const tenantSnapshot = await firebaseService.database.ref(`tenants/${tenantId}/profile/businessName`).once('value');
    const nombreRestaurante = tenantSnapshot.val() || 'Restaurante';
    
    // Crear objeto del pedido
    const pedido = {
      id: orderId,
      tenantId: tenantId,
      cliente: sesion.telefono,
      telefonoContacto: sesion.telefonoContacto || sesion.telefono,
      items: itemsAgrupados,
      subtotal: subtotal,
      costoEnvio: costoEnvio,
      total: total,
      direccion: sesion.direccion,
      metodoPago: sesion.metodoPago,
      estado: 'pendiente',
      trackingToken: trackingToken,
      timestamp: Date.now(),
      fecha: new Date().toISOString(),
      fechaCreacion: new Date().toISOString(),
      creadoPor: 'pedido_rapido'
    };
    
    // Guardar en Firebase
    await firebaseService.database.ref(`tenants/${tenantId}/pedidos/${orderId}`).set(pedido);
    
    console.log(`Pedido rapido creado: ${orderId} para tenant ${tenantId}`);
    
    // Emitir evento WebSocket para KDS
    if (global.baileysWebSocket) {
      global.baileysWebSocket.emitToTenant(tenantId, 'nuevo-pedido', pedido);
    }
    
    // Limpiar sesión
    sesion.carrito = [];
    sesion.esperandoConfirmacion = false;
    sesion.pedidoPendiente = null;
    sesion.direccion = null;
    sesion.telefonoContacto = null;
    sesion.metodoPago = null;
    
    // Obtener tiempo de entrega
    const tiempoEntrega = await obtenerTiempoEntrega(tenantId);
    
    // Generar mensaje de confirmación
    let resumenItems = itemsAgrupados.map(item => 
      `- ${item.cantidad}x ${item.nombre}`
    ).join('\n');
    
    // Linea de envio para el mensaje
    let lineaEnvioMsg = costoEnvio > 0 ? `🚚 Envio: $${formatearPrecio(costoEnvio)}` : '🚚 Envio: GRATIS';
    
    return `✅ *Pedido confirmado!*

📦 Numero de pedido: #${orderId}

${resumenItems}

💰 Subtotal: $${formatearPrecio(subtotal)}
${lineaEnvioMsg}
💳 *Total:* $${formatearPrecio(total)}
📍 Direccion: ${pedido.direccion}
💵 Pago: ${sesion.metodoPago === 'tarjeta' ? 'Tarjeta 💳' : 'Efectivo 💵'}

🔍 Sigue tu pedido aqui:
https://kdsapp.site/track/${trackingToken}

⏱️ Tiempo estimado: ${tiempoEntrega}

🙏 Gracias por tu pedido!`;
    
  } catch (error) {
    console.error('Error finalizando pedido rapido:', error);
    return 'Hubo un error al procesar tu pedido. Por favor intenta de nuevo o escribe *hola* para reiniciar.';
  }
}

/**
 * Procesa un mensaje entrante y retorna la respuesta
 * @param {string} tenantId - ID del tenant (restaurante)
 * @param {string} from - Número de teléfono del cliente
 * @param {string} texto - Mensaje recibido
 * @returns {Promise<string|null>} Respuesta a enviar (null si el bot está apagado)
 */
async function processMessage(tenantId, from, texto) {
  // Limpiar el prefijo whatsapp: del número si existe
  const telefono = from.replace('whatsapp:', '').replace(/\D/g, '');
  const sesion = obtenerSesion(tenantId, telefono);
  
  // Normalizar texto: eliminar tildes y convertir a minúsculas
  const textoOriginal = texto.trim();
  const normalizarTexto = (str) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Eliminar tildes
  };
  texto = normalizarTexto(textoOriginal);
  
  console.log(`📩 Procesando mensaje en tenant ${tenantId}`);
  console.log(`   Cliente: ${telefono}`);
  console.log(`   Mensaje: "${textoOriginal}"`);
  console.log(`   Normalizado: "${texto}"`);
  
  // ====================================
  // VALIDAR ESTADO DEL BOT (SOLO TOGGLE)
  // ====================================
  try {
    // Verificar si el bot está activo (toggle en dashboard)
    const botConfig = await firebaseService.database.ref(`tenants/${tenantId}/bot/config`).once('value');
    const config = botConfig.val();
    
    console.log(`🔍 Debug - config obtenido:`, config);
    
    // El bot solo responde si active === true (explícitamente)
    // Si no existe config o active no es true, el bot NO responde
    const botActive = config?.active === true;
    
    console.log(`🔍 Debug - botActive calculado: ${botActive}`);
    console.log(`🔍 Debug - config?.active: ${config?.active}`);
    console.log(`🔍 Debug - typeof config?.active: ${typeof config?.active}`);
    
    if (!botActive) {
      console.log(`🔴 Bot desactivado para tenant ${tenantId}. Ignorando mensaje.`);
      return null; // No responder nada
    }
    
    console.log(`🟢 Bot activo para tenant ${tenantId} - Procesando mensaje`);
  } catch (error) {
    console.error(`⚠️ Error verificando estado del bot para tenant ${tenantId}:`, error);
    // En caso de error, NO responder (fail-safe)
    return null;
  }
  
  // ====================================
  // VALIDAR MEMBRESÍA DEL TENANT (1 vez al día)
  // ====================================
  try {
    let membershipResult;
    const cached = membershipCache.get(tenantId);
    const now = Date.now();
    
    // Verificar si hay caché válido (menos de 24 horas)
    if (cached && (now - cached.checkedAt) < MEMBERSHIP_CACHE_TTL) {
      membershipResult = cached.result;
      console.log(`📋 [Membresía] Usando caché para tenant ${tenantId} (verificado hace ${Math.round((now - cached.checkedAt) / 1000 / 60)} min)`);
    } else {
      // Verificar membresía y guardar en caché
      membershipResult = await membershipService.verifyMembership(tenantId);
      membershipCache.set(tenantId, { result: membershipResult, checkedAt: now });
      console.log(`📋 [Membresía] Verificación fresca para tenant ${tenantId}:`, membershipResult);
    }
    
    if (!membershipResult.isValid) {
      console.log(`🔴 Membresía no válida para tenant ${tenantId}: ${membershipResult.reason}`);
      
      // No responder al cliente - simplemente ignorar el mensaje
      return null;
    }
    
    // Log de membresía activa (solo si es verificación fresca)
    if (!cached && membershipResult.daysRemaining && membershipResult.daysRemaining <= 5) {
      console.log(`⚠️ [Membresía] Tenant ${tenantId} - Solo ${membershipResult.daysRemaining} días restantes`);
    }
    
  } catch (error) {
    console.error(`⚠️ Error verificando membresía para tenant ${tenantId}:`, error);
    // En caso de error, permitir el acceso (fail-open)
  }
  
  // ====================================
  // 🚪 VERIFICAR LÍMITE DE PEDIDOS DIARIOS
  // Solo para conversaciones NUEVAS (sin sesión activa)
  // Las conversaciones en curso pueden completarse normalmente
  // ====================================
  const esConversacionNueva = 
    sesion.carrito.length === 0 && 
    !sesion.esperandoConfirmacion && 
    !sesion.esperandoDireccion && 
    !sesion.esperandoTelefono && 
    !sesion.esperandoMetodoPago && 
    !sesion.pedidoPendiente;
  
  if (esConversacionNueva) {
    try {
      const orderCheck = await membershipService.canCreateOrder(tenantId);
      
      // Verificar límite mensual (antes era diario)
      if (!orderCheck.allowed && orderCheck.reason === 'monthly_limit_reached') {
        console.log(`🚫 [Límite] Tenant ${tenantId} alcanzó límite mensual (${orderCheck.ordersThisPeriod}/${orderCheck.ordersLimit}). Ignorando mensaje de nueva conversación.`);
        
        // 📊 Registrar pedido perdido por límite
        analyticsService.trackOrderLost(tenantId, telefono, orderCheck)
          .catch(err => console.error('⚠️ Error tracking pedido perdido:', err));
        
        // 🔔 Notificar al dueño sobre pedido perdido (con enlace de pago)
        notificationService.notifyLostOrderWithPaymentLink(tenantId, orderCheck)
          .catch(err => console.error('⚠️ Error enviando notificación de pedido perdido:', err));
        
        // No responder - simplemente ignorar el mensaje
        // Esto evita que inicien nuevas conversaciones cuando el límite está alcanzado
        return null;
      }
      
      // Log informativo del estado del límite
      if (orderCheck.ordersLimit !== Infinity && orderCheck.ordersRemaining <= 100) {
        console.log(`⚠️ [Límite] Tenant ${tenantId} - Quedan ${orderCheck.ordersRemaining} pedidos este mes (${orderCheck.usagePercent}% usado)`);
        
        // 🔔 Notificar cuando se acercan al 90% del límite mensual
        if (orderCheck.usagePercent >= 90) {
          notificationService.notifyApproachingMonthlyLimit(tenantId, orderCheck)
            .catch(err => console.error('⚠️ Error enviando notificación de límite:', err));
        }
      }
      
    } catch (error) {
      console.error(`⚠️ Error verificando límite de pedidos para tenant ${tenantId}:`, error);
      // Fail-open: permitir en caso de error para no bloquear restaurantes
    }
  } else {
    console.log(`🔄 [Límite] Conversación en curso para ${telefono} - No verificar límite`);
  }
  
  // ====================================
  // COMANDOS PRINCIPALES
  // ====================================
  
  // Saludos y comandos de inicio (con normalización, ahora acepta tildes)
  const saludosInicio = [
    'hola', 'menu', 'empezar', 'start', 'iniciar',
    'buenas', 'buenos dias', 'buenas tardes', 'buenas noches',
    'hola buenas', 'hola buenos dias', 'que tal', 'saludos',
    'holi', 'ola', 'hey', 'hi', 'hello', 'buenas!', 'holaa'
  ];
  
  // Verificar si el mensaje coincide con algún saludo
  const esSaludo = saludosInicio.some(saludo => {
    // Match exacto o que empiece con el saludo
    return texto === saludo || texto.startsWith(saludo + ' ');
  });
  
  if (esSaludo) {
    // Limpiar cualquier estado pendiente
    sesion.esperandoConfirmacion = false;
    sesion.pedidoPendiente = null;
    sesion.esperandoConfirmacionRapida = false;
    sesion.pedidoRapidoPendiente = null;
    sesion.carrito = [];
    sesion.direccion = null;
    sesion.telefonoContacto = null;
    sesion.metodoPago = null;
    
    // Verificar si el modo pedido rápido está activado
    try {
      const quickOrderSnapshot = await firebaseService.database.ref(`tenants/${tenantId}/bot/quickOrderMode`).once('value');
      const quickOrderMode = quickOrderSnapshot.val() === true;
      
      if (quickOrderMode) {
        // Modo Pedido Rápido: enviar saludo + formulario separado
        return await generarMensajePedidoRapido(tenantId, texto === 'hola');
      }
    } catch (error) {
      console.error('Error verificando modo pedido rápido:', error);
      // Continuar con modo normal si hay error
    }
    
    // Modo Conversacional (original)
    // Obtener mensaje de bienvenida personalizado
    try {
      const messagesSnapshot = await firebaseService.database.ref(`tenants/${tenantId}/bot/messages`).once('value');
      const messages = messagesSnapshot.val();
      
      console.log(`🔍 Debug - Mensajes configurados:`, messages);
      
      let welcomeMessage = '';
      
      // Si el usuario escribió "hola", usar el mensaje de bienvenida
      if (texto === 'hola') {
        welcomeMessage = messages?.welcome || '👋 *¡Hola! Bienvenido a nuestro restaurante*\n\n';
      }
      
      // Obtener el menú
      const menuMessage = await mostrarMenu(tenantId);
      
      // Combinar bienvenida + menú
      return welcomeMessage + menuMessage;
    } catch (error) {
      console.error(`⚠️ Error obteniendo mensajes personalizados:`, error);
      // Fallback: solo mostrar menú
      return await mostrarMenu(tenantId);
    }
  }
  
  if (texto === 'ayuda' || texto === 'help' || texto === '?') {
    return mostrarAyuda();
  }
  
  // Ver carrito
  if (texto === 'ver' || texto === 'carrito' || texto === 'pedido') {
    return verCarrito(sesion);
  }
  
  // Cancelar pedido
  if (texto === 'cancelar' || texto === 'no' || texto === 'borrar') {
    sesion.carrito = [];
    sesion.esperandoConfirmacion = false;
    sesion.pedidoPendiente = null;
    return '❌ *Pedido cancelado*\n\n' +
           'Tu carrito ha sido vaciado.\n\n' +
           'Escribe *menu* para empezar de nuevo.';
  }
  
  // Si está esperando dirección, validar y guardar
  if (sesion.esperandoDireccion) {
    return await procesarDireccion(sesion, textoOriginal);
  }
  
  // Si está esperando teléfono, validar y guardar
  if (sesion.esperandoTelefono) {
    return await procesarTelefono(sesion, textoOriginal);
  }
  
  // ✨ Si está esperando método de pago, procesar respuesta
  if (sesion.esperandoMetodoPago) {
    return await procesarMetodoPago(sesion, texto, textoOriginal);
  }
  
  // ✨ NUEVO: Si está esperando confirmación de pedido rápido
  if (sesion.esperandoConfirmacionRapida) {
    console.log('⚡ [Pedido Rápido] Esperando confirmación del cliente');
    return await procesarConfirmacionRapida(tenantId, sesion, textoOriginal);
  }
  
  // ====================================
  // ⚡ DETECCIÓN DE FORMATO PEDIDO RÁPIDO
  // Si el mensaje tiene el formato estructurado, procesarlo directamente
  // ====================================
  if (esFormatoPedidoRapido(textoOriginal)) {
    console.log('⚡ [Pedido Rápido] Formato estructurado detectado');
    return await procesarPedidoRapidoCompleto(tenantId, sesion, textoOriginal);
  }
  
  // Confirmar pedido - Reconocer lenguaje natural para confirmación
  if (CONFIRMACIONES_NATURALES.includes(texto)) {
    // Si hay pedido pendiente de confirmación, agregarlo al carrito
    if (sesion.esperandoConfirmacion && sesion.pedidoPendiente) {
      sesion.pedidoPendiente.forEach(item => {
        for (let i = 0; i < item.cantidad; i++) {
          sesion.carrito.push({
            numero: item.numero,
            nombre: item.nombre,
            precio: item.precio,
            cantidad: 1
          });
        }
      });
      
      sesion.esperandoConfirmacion = false;
      sesion.pedidoPendiente = null;
      
      // Solicitar dirección antes de confirmar
      return solicitarDireccion(sesion);
    }
    
    // Confirmación final del pedido (también solicita dirección)
    if (sesion.carrito.length > 0) {
      return solicitarDireccion(sesion);
    }
  }
  
  // Eliminar último item
  if (texto === 'eliminar' || texto === 'quitar') {
    return eliminarUltimoItem(sesion);
  }
  
  // ====================================
  // INTENTAR PARSEAR COMO PEDIDO NATURAL
  // ====================================
  
  // Si contiene palabras clave de pedido o múltiples items, intentar parsear
  const palabrasClavePedido = ['quiero', 'dame', 'pedir', 'agregar', 'con', 'y', ','];
  const tieneMultiplesNumeros = (texto.match(/\d+/g) || []).length >= 2;
  const tienePalabrasClave = palabrasClavePedido.some(p => texto.includes(p));
  
  // Si parece un pedido en lenguaje natural o tiene múltiples números
  if (tienePalabrasClave || tieneMultiplesNumeros || texto.length > 15) {
    // Obtener el menú del tenant para el parser (OPTIMIZADO con caché)
    const menuTenant = await obtenerMenuTenantCached(tenantId);
    console.log(`📋 Menú del tenant obtenido: ${menuTenant.length} items`);
    
    const resultado = parsearPedido(textoOriginal, menuTenant);
    
    if (resultado.exitoso && resultado.items.length > 0) {
      // Guardar items parseados para confirmación
      sesion.esperandoConfirmacion = true;
      sesion.pedidoPendiente = resultado.items;
      // 📝 NUEVO: Guardar notas del pedido si existen
      sesion.comentario = resultado.notas || sesion.comentario || null;
      
      // Calcular costo de envío para mostrar el desglose
      const subtotal = resultado.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
      const envioData = await obtenerCostoEnvio(tenantId, subtotal);
      const costoEnvio = envioData.cost || 0;
      
      return generarMensajeConfirmacion(resultado, costoEnvio, envioData);
    }
  }
  
  // ====================================
  // AGREGAR ITEM POR NÚMERO (método anterior)
  // ====================================
  
  // Si es solo un número, agregar directamente al carrito (modo simple)
  if (/^\d+$/.test(texto)) {
    sesion.esperandoConfirmacion = false;
    sesion.pedidoPendiente = null;
    return agregarAlCarrito(sesion, texto);
  }
  
  // ====================================
  // NO ENTENDIÓ EL COMANDO
  // ====================================
  
  return '❓ *No entendí tu mensaje*\n\n' +
         '💡 *Puedes ordenar de estas formas:*\n\n' +
         '*Opción 1 - Lenguaje natural:*\n' +
         '• "Quiero 2 hamburguesas y 1 coca cola"\n' +
         '• "1 pizza con 3 cervezas"\n' +
         '• "Dame una milanesa y papas"\n\n' +
         '*Opción 2 - Por número:*\n' +
         '• Escribe *menu* para ver opciones\n' +
         '• Envía el número del item (ej: *1*)\n\n' +
         '*Otros comandos:*\n' +
         '• *ver* - Ver tu carrito\n' +
         '• *confirmar* - Finalizar pedido\n' +
         '• *cancelar* - Cancelar todo\n' +
         '• *ayuda* - Ver ayuda completa';
}

/**
 * Muestra el menú completo del tenant
 */
async function mostrarMenu(tenantId) {
  try {
    // Obtener nombre del restaurante
    const tenantSnapshot = await firebaseService.database.ref(`tenants/${tenantId}/profile/businessName`).once('value');
    const nombreRestaurante = tenantSnapshot.val() || 'nuestro restaurante';
    
    console.log(`📋 Mostrando instrucciones de catalogo para tenant ${tenantId}`);
    
    // En lugar de mostrar el menu como texto, sugerimos ver el catalogo con imagenes
    let mensaje = `📱 *VER MENU DE ${nombreRestaurante.toUpperCase()}*\n\n`;
    mensaje += '👆 *Toca el icono de tienda* en la parte superior de este chat para ver nuestro catalogo con fotos.\n\n';
    mensaje += '━'.repeat(25) + '\n\n';
    mensaje += '📝 *¿Como ordenar?*\n\n';
    mensaje += '*Opcion 1 - Lenguaje Natural:*\n';
    mensaje += 'Escribe tu pedido directamente:\n';
    mensaje += '_"Quiero 2 hamburguesas y 1 coca cola"_\n\n';
    mensaje += '*Opcion 2 - Por Nombre:*\n';
    mensaje += 'Envia el nombre del producto.\n';
    mensaje += 'Ejemplo: *pizza* para agregar una pizza\n\n';
    mensaje += '📝 *Agregar notas:*\n';
    mensaje += 'Usa parentesis para notas especiales:\n';
    mensaje += '_"2 hamburguesas (sin cebolla)"_\n\n';
    mensaje += '━'.repeat(25) + '\n\n';
    mensaje += '💡 Escribe *ver* para revisar tu carrito\n';
    mensaje += 'y *confirmar* para finalizar tu pedido.';
    
    return mensaje;
  } catch (error) {
    console.error(`❌ Error en mostrarMenu para tenant ${tenantId}:`, error);
    return '📱 *VER MENU*\n\n👆 Toca el icono de tienda en este chat para ver el catalogo con fotos.\n\nEscribe tu pedido cuando estes listo.';
  }
}

/**
 * Muestra comandos disponibles
 */
function mostrarAyuda() {
  return '❓ *AYUDA - CÓMO ORDENAR*\n\n' +
         '🎯 *OPCIÓN 1: Lenguaje Natural (RECOMENDADO)*\n' +
         'Escribe tu pedido de forma natural:\n\n' +
         '✅ Ejemplos:\n' +
         '• "Quiero 2 hamburguesas y 1 coca cola"\n' +
         '• "1 pizza muzzarella con 3 cervezas"\n' +
         '• "Dame una milanesa napolitana y papas"\n' +
         '• "2 empanadas de carne con fernet"\n\n' +
         '━'.repeat(30) + '\n\n' +
         '� *OPCIÓN 2: Por Número*\n' +
         '1. Escribe *menu* para ver opciones\n' +
         '2. Envía el número del item (ej: *1*)\n' +
         '3. Envía más números para agregar items\n' +
         '4. Escribe *ver* para revisar\n' +
         '5. Escribe *confirmar* para finalizar\n\n' +
         '━'.repeat(30) + '\n\n' +
         '⚙️ *OTROS COMANDOS:*\n' +
         '• *ver* - Ver tu carrito\n' +
         '• *confirmar* - Enviar tu pedido\n' +
         '• *cancelar* - Cancelar pedido\n' +
         '• *eliminar* - Quitar último item\n' +
         '• *menu* - Ver menú completo\n\n' +
         '¿Listo para ordenar? 🍽️\n' +
         'Escribe tu pedido o *menu* para ver opciones.';
}

/**
 * Agrega un item al carrito
 */
async function agregarAlCarrito(sesion, texto) {
  // Extraer número del item
  let numero;
  
  if (/^\d+$/.test(texto)) {
    // Solo número: "1"
    numero = texto;
  } else {
    // Con texto: "agregar 1"
    const match = texto.match(/(\d+)/);
    if (!match) {
      return '❌ *Formato incorrecto*\n\n' +
             'Envía el número del item.\n' +
             'Ejemplo: *1*\n\n' +
             'Escribe *menu* para ver las opciones.';
    }
    numero = match[1];
  }
  
  const item = await menuService.obtenerItem(sesion.tenantId, numero);
  
  if (!item) {
    return `❌ *Item #${numero} no encontrado*\n\n` +
           'Escribe *menu* para ver las opciones disponibles.';
  }
  
  // Agregar al carrito
  sesion.carrito.push({
    ...item,
    cantidad: 1
  });
  
  return `✅ *Agregado al carrito*\n\n` +
         `${item.nombre} - $${formatearPrecio(item.precio)}\n\n` +
         `🛒 Total de items: ${sesion.carrito.length}\n\n` +
         'Opciones:\n' +
         '• Envía otro número para agregar más\n' +
         '• Escribe *ver* para revisar tu pedido\n' +
         '• Escribe *confirmar* para finalizar';
}

/**
 * Muestra el carrito actual
 */
function verCarrito(sesion) {
  if (sesion.carrito.length === 0) {
    return '🛒 *Tu carrito está vacío*\n\n' +
           'Escribe *menu* para ver el menú y empezar a ordenar.';
  }
  
  // Agrupar items repetidos
  const items = agruparCarrito(sesion.carrito);
  
  // Construir lista natural de items
  let listaItems = '';
  const numItems = items.length;
  
  items.forEach((item, index) => {
    const nombreItem = item.nombre.toLowerCase();
    const descripcionItem = descripcionNaturalItem(nombreItem, item.cantidad);
    
    if (index === 0) {
      listaItems += descripcionItem;
    } else if (index === numItems - 1) {
      listaItems += ` y ${descripcionItem}`;
    } else {
      listaItems += `, ${descripcionItem}`;
    }
  });
  
  let mensaje = `Perfecto, llevas en tu pedido:\n\n`;
  mensaje += `${listaItems}\n\n`;
  
  mensaje += '*Detalle:*\n';
  let total = 0;
  items.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    mensaje += `• ${item.cantidad}x ${item.nombre} - $${formatearPrecio(subtotal)}\n`;
    total += subtotal;
  });
  
  // 📝 Mostrar notas del pedido si existen
  if (sesion.comentario) {
    mensaje += `\n📝 *Nota:* ${sesion.comentario}\n`;
  }
  
  mensaje += `\n💰 Total: $${formatearPrecio(total)}\n\n`;
  mensaje += '¿Está todo correcto?\n\n';
  mensaje += 'Responde *sí* para confirmar, *editar* o *cambiar* si quieres modificar algo, o *cancelar* para empezar de nuevo.';
  
  return mensaje;
}

/**
 * Confirma y envía el pedido a Firebase (aislado por tenant)
 * 🔥 NUEVO FLUJO: Si el pago es con tarjeta, NO crea el pedido hasta que el pago sea confirmado
 * Solo genera enlace de pago y guarda datos temporales
 */
async function confirmarPedido(sesion) {
  if (sesion.carrito.length === 0) {
    return '❌ *Tu carrito está vacío*\n\n' +
           'Escribe *menu* para ver el menú y empezar a ordenar.';
  }
  
  try {
    // Nota: La verificación de límites se hace al inicio de la conversación
    // Las conversaciones en curso pueden completarse normalmente
    
    // Obtener información del tenant
    const tenant = await tenantService.getTenantById(sesion.tenantId);
    const restaurantName = tenant.restaurant?.name || 'Restaurante';
    
    // Calcular subtotal
    const subtotal = sesion.carrito.reduce((sum, item) => sum + item.precio, 0);
    
    // Obtener costo de envío
    const envioData = await obtenerCostoEnvio(sesion.tenantId, subtotal);
    const costoEnvio = envioData.cost;
    const total = subtotal + costoEnvio;
    
    // Agrupar items para Firebase
    const itemsAgrupados = {};
    sesion.carrito.forEach(item => {
      const key = item.numero;
      if (!itemsAgrupados[key]) {
        itemsAgrupados[key] = { ...item, cantidad: 0 };
      }
      itemsAgrupados[key].cantidad += 1;
    });
    
    // Generar número de pedido hexadecimal (ej: A3F5B2)
    const numeroHex = Date.now().toString(16).slice(-6).toUpperCase();
    const orderId = `${sesion.tenantId}_${numeroHex}_${Date.now()}`;
    
    // ====================================
    // FLUJO: PAGO CON TARJETA
    // ====================================
    if (sesion.metodoPago === 'tarjeta') {
      console.log(`[confirmarPedido] Cliente eligio pagar con tarjeta`);
      console.log(`   NO se creara el pedido en KDS hasta que el pago sea confirmado`);
      console.log(`   Generando enlace de pago...`);
      
      // Crear objeto temporal del pedido (NO guardarlo en KDS aún)
      const pedidoTemporal = {
        id: numeroHex,
        orderId: orderId,
        tenantId: sesion.tenantId,
        cliente: sesion.telefono,
        telefono: sesion.telefono,
        telefonoContacto: sesion.telefonoContacto || sesion.telefono,
        direccion: sesion.direccion || 'No especificada',
        comentario: sesion.comentario || null, // 📝 Comentario del cliente
        items: Object.values(itemsAgrupados),
        subtotal: subtotal,
        costoEnvio: costoEnvio,
        total: total,
        estado: 'awaiting_payment',
        timestamp: Date.now(),
        fecha: new Date().toISOString(),
        fuente: 'whatsapp',
        restaurante: restaurantName,
        paymentStatus: 'PENDING',
        metodoPago: 'tarjeta',
      };
      
      // Guardar temporalmente en /orders (no en KDS del restaurante)
      await firebaseService.database.ref(`orders/${orderId}`).set(pedidoTemporal);
      
      console.log(`[confirmarPedido] Pedido temporal guardado: ${orderId}`);
      
      // Generar enlace de pago
      const paymentResult = await paymentService.createPaymentLink({
        restaurantId: sesion.tenantId,
        orderId: orderId,
        amount: total * 100, // Convertir a centavos
        customerPhone: sesion.telefono, // 🔥 Número de WhatsApp del chat (para notificaciones)
        customerName: `Cliente ${sesion.telefono}`,
        customerEmail: `${sesion.telefono}@kdsapp.site`,
        orderDetails: {
          items: Object.values(itemsAgrupados).map(i => ({
            name: i.nombre,
            quantity: i.cantidad,
            price: i.precio,
          })),
          deliveryAddress: sesion.direccion,
          contactPhone: sesion.telefonoContacto, // Teléfono de contacto para entrega
          orderNumber: numeroHex,
        },
      });
      
      if (!paymentResult.success) {
        console.error(`❌ [confirmarPedido] Error generando enlace de pago:`, paymentResult.error);
        
        // Eliminar pedido temporal
        await firebaseService.database.ref(`orders/${orderId}`).remove();
        
        return '❌ *Error generando enlace de pago*\n\n' +
               `Hubo un problema: ${paymentResult.error}\n\n` +
               'Por favor, intenta nuevamente o contacta al restaurante.';
      }
      
      console.log(`✅ [confirmarPedido] Enlace de pago generado: ${paymentResult.paymentLink}`);
      
      // Limpiar sesión
      sesion.carrito = [];
      const direccionEntrega = sesion.direccion;
      const telefonoContacto = sesion.telefonoContacto;
      const comentarioPedido = sesion.comentario;
      sesion.direccion = null;
      sesion.telefonoContacto = null;
      sesion.metodoPago = null;
      sesion.comentario = null;
      
      const telefonoFormateado = telefonoContacto.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
      
      // Mensaje con enlace de pago (SIN confirmar pedido aún)
      let mensaje = '🎉 *¡Tu pedido está casi listo!*\n\n';
      mensaje += `📋 Número de pedido: #${numeroHex}\n`;
      mensaje += `📍 Dirección: ${direccionEntrega}\n`;
      mensaje += `📱 Teléfono de contacto: ${telefonoFormateado}\n`;
      mensaje += `💰 Total a pagar: $${formatearPrecio(total)}\n\n`;
      mensaje += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      mensaje += '💳 *PAGO SEGURO EN LÍNEA*\n\n';
      mensaje += '👉 *Haz clic aquí para pagar ahora:*\n';
      mensaje += `${paymentResult.paymentLink}\n\n`;
      mensaje += '✅ Puedes pagar con tarjeta de crédito/débito, PSE o Nequi\n';
      mensaje += '🔒 Pago 100% seguro y encriptado\n\n';
      mensaje += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      mensaje += `⚠️ *Una vez confirmes el pago, ${restaurantName} empezará a preparar tu pedido.*\n\n`;
      
      // Obtener tiempo de entrega configurado
      const tiempoEntrega = await obtenerTiempoEntrega(tenantId);
      mensaje += `🕒 Tiempo estimado: ${tiempoEntrega}\n\n`;
      mensaje += '_Te avisaremos cuando el pago sea confirmado_ ✅';
      
      return mensaje;
    }
    
    // ====================================
    // FLUJO NORMAL: PAGO EN EFECTIVO
    // ====================================
    console.log(`\n💵 [confirmarPedido] Cliente eligió pagar en efectivo`);
    console.log(`   Creando pedido en KDS inmediatamente...`);
    
    // Generar tracking token para seguimiento del pedido
    const trackingToken = generateTrackingToken(sesion.tenantId, numeroHex + Date.now());
    
    // Crear pedido normal
    const pedido = {
      id: numeroHex,
      tenantId: sesion.tenantId,
      cliente: sesion.telefono,
      telefono: sesion.telefono,
      telefonoContacto: sesion.telefonoContacto || sesion.telefono,
      direccion: sesion.direccion || 'No especificada',
      comentario: sesion.comentario || null, // 📝 Comentario del cliente
      items: Object.values(itemsAgrupados),
      total: total,
      estado: 'pendiente', // Estado normal
      timestamp: Date.now(),
      fecha: new Date().toISOString(),
      fuente: 'whatsapp',
      restaurante: restaurantName,
      paymentStatus: 'PENDING',
      metodoPago: 'efectivo',
      trackingToken: trackingToken, // 📦 Token para seguimiento
    };
    
    // Guardar en Firebase bajo el path del tenant
    const pedidoRef = firebaseService.database.ref(`tenants/${sesion.tenantId}/pedidos`);
    const pedidoSnapshot = await pedidoRef.push(pedido);
    const pedidoKey = pedidoSnapshot.key;
    
    console.log(`✅ Pedido guardado para tenant ${sesion.tenantId}: #${numeroHex} (${pedidoKey})`);
    
    // 📊 Registrar pedido completado (efectivo desde confirmarPedido)
    analyticsService.trackOrderCompleted(sesion.tenantId, sesion.telefono, {
      id: numeroHex,
      key: pedidoKey,
      items: Object.values(itemsAgrupados),
      total: total,
      direccion: sesion.direccion,
      metodoPago: 'efectivo',
      telefonoContacto: sesion.telefonoContacto,
    }).catch(err => console.error('⚠️ Error tracking order completed:', err));
    
    // Incrementar estadísticas del tenant
    await tenantService.incrementOrderStats(sesion.tenantId);
    
    // Limpiar carrito
    sesion.carrito = [];
    const direccionEntrega = sesion.direccion;
    const telefonoContacto = sesion.telefonoContacto;
    const comentarioPedido = sesion.comentario;
    sesion.direccion = null;
    sesion.telefonoContacto = null;
    sesion.metodoPago = null;
    sesion.comentario = null;
    
    const telefonoFormateado = telefonoContacto.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    
    // Respuesta de confirmación con desglose
    let mensaje = '🎉 *Tu pedido está confirmado*\n\n';
    mensaje += `📋 Número de pedido: #${numeroHex}\n`;
    mensaje += `📍 Dirección: ${direccionEntrega}\n`;
    mensaje += `📱 Teléfono de contacto: ${telefonoFormateado}\n\n`;
    
    // Desglose de costos
    mensaje += '*Detalle del pedido:*\n';
    Object.values(itemsAgrupados).forEach(item => {
      const itemTotal = item.precio * item.cantidad;
      mensaje += `• ${item.cantidad}x ${item.nombre} - $${formatearPrecio(itemTotal)}\n`;
    });
    
    if (comentarioPedido) {
      mensaje += `\n📝 *Nota:* ${comentarioPedido}\n`;
    }
    
    mensaje += `\n💰 Subtotal: $${formatearPrecio(subtotal)}\n`;
    if (costoEnvio === 0) {
      mensaje += `🚚 Envío: GRATIS\n`;
    } else {
      mensaje += `🚚 Envío: $${formatearPrecio(costoEnvio)}\n`;
    }
    mensaje += `💳 *Total:* $${formatearPrecio(total)}\n`;
    mensaje += `💵 Método de pago: Efectivo\n\n`;
    
    // 📦 Link de seguimiento del pedido
    mensaje += `📦 *Sigue tu pedido aquí:*\n`;
    mensaje += `👉 https://kdsapp.site/track/${trackingToken}\n\n`;
    
    mensaje += `Ya lo enviamos a la cocina de ${restaurantName}. 🛵\n\n`;
    
    // Obtener tiempo de entrega configurado
    const tiempoEntrega = await obtenerTiempoEntrega(sesion.tenantId);
    mensaje += `🕒 Tiempo estimado: ${tiempoEntrega}\n\n`;
    mensaje += '_Te avisaremos cuando esté listo para entrega_ ✅';
    
    return mensaje;
    
  } catch (error) {
    console.error('❌ Error confirmando pedido:', error);
    
    return '⚠️ *Error al procesar tu pedido*\n\n' +
           'Hubo un problema al guardar tu pedido.\n' +
           'Por favor intenta de nuevo en un momento.\n\n' +
           'Si el problema persiste, contacta a soporte.';
  }
}

/**
 * ✨ NUEVO: Confirma pedido con pago en efectivo/transferencia (sin enlace de pago)
 */
async function confirmarPedidoEfectivo(sesion, pedidoKey = null, numeroHex = null, itemsAgrupados = null) {
  if (sesion.carrito.length === 0) {
    return '❌ *Tu carrito está vacío*\n\n' +
           'Escribe *menu* para ver el menú y empezar a ordenar.';
  }
  
  try {
    // Nota: La verificación de límites se hace al inicio de la conversación
    // Las conversaciones en curso pueden completarse normalmente
    
    // Obtener información del tenant
    const tenant = await tenantService.getTenantById(sesion.tenantId);
    const restaurantName = tenant.restaurant?.name || 'Restaurante';
    
    // Calcular subtotal
    const subtotal = sesion.carrito.reduce((sum, item) => sum + item.precio, 0);
    
    // Obtener costo de envío
    const envioData = await obtenerCostoEnvio(sesion.tenantId, subtotal);
    const costoEnvio = envioData.cost;
    const total = subtotal + costoEnvio;
    
    // Si no se pasaron itemsAgrupados, generarlos
    if (!itemsAgrupados) {
      itemsAgrupados = {};
      sesion.carrito.forEach(item => {
        const key = item.numero;
        if (!itemsAgrupados[key]) {
          itemsAgrupados[key] = { ...item, cantidad: 0 };
        }
        itemsAgrupados[key].cantidad += 1;
      });
    }
    
    // Si no se pasó numeroHex, generarlo
    if (!numeroHex) {
      numeroHex = Date.now().toString(16).slice(-6).toUpperCase();
    }
    
    const pedidoRef = firebaseService.database.ref(`tenants/${sesion.tenantId}/pedidos`);
    
    // Generar tracking token para seguimiento del pedido
    let trackingToken = null;
    
    // Si no se pasó pedidoKey, crear el pedido ahora
    if (!pedidoKey) {
      // Generar tracking token único
      trackingToken = generateTrackingToken(sesion.tenantId, numeroHex + Date.now());
      
      const pedido = {
        id: numeroHex,
        tenantId: sesion.tenantId,
        cliente: sesion.telefono,
        telefono: sesion.telefono,
        telefonoContacto: sesion.telefonoContacto || sesion.telefono,
        direccion: sesion.direccion || 'No especificada',
        comentario: sesion.comentario || null, // 📝 Comentario del cliente
        items: Object.values(itemsAgrupados),
        subtotal: subtotal,
        costoEnvio: costoEnvio,
        total: total,
        estado: 'pendiente',
        timestamp: Date.now(),
        fecha: new Date().toISOString(),
        fuente: 'whatsapp',
        restaurante: restaurantName,
        paymentStatus: 'CASH',
        metodoPago: sesion.metodoPago || 'efectivo',
        trackingToken: trackingToken,
      };
      
      const pedidoSnapshot = await pedidoRef.push(pedido);
      pedidoKey = pedidoSnapshot.key;
      
      console.log(`✅ Pedido guardado (efectivo) para tenant ${sesion.tenantId}: #${numeroHex} (${pedidoKey})`);
      
      // 📊 Registrar pedido completado (efectivo)
      analyticsService.trackOrderCompleted(sesion.tenantId, sesion.telefono, {
        id: numeroHex,
        key: pedidoKey,
        items: Object.values(itemsAgrupados),
        total: total,
        direccion: sesion.direccion,
        metodoPago: sesion.metodoPago || 'efectivo',
        telefonoContacto: sesion.telefonoContacto,
      }).catch(err => console.error('⚠️ Error tracking order completed:', err));
    } else {
      // Si ya existe el pedido, solo actualizar el estado
      await pedidoRef.child(pedidoKey).update({ 
        estado: 'pendiente',
        paymentStatus: 'CASH',
        metodoPago: sesion.metodoPago || 'efectivo',
      });
      
      console.log(`✅ Pedido actualizado a efectivo: #${numeroHex} (${pedidoKey})`);
    }
    
    // Incrementar estadísticas del tenant
    await tenantService.incrementOrderStats(sesion.tenantId);
    
    // Limpiar carrito, dirección y teléfono
    sesion.carrito = [];
    const direccionEntrega = sesion.direccion;
    const telefonoContacto = sesion.telefonoContacto;
    const comentarioPedido = sesion.comentario;
    sesion.direccion = null;
    sesion.telefonoContacto = null;
    sesion.metodoPago = null;
    sesion.comentario = null;
    
    // Formatear teléfono para mostrar: 300 123 4567
    const telefonoFormateado = telefonoContacto.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    
    // Linea de envio para mensaje
    let lineaEnvioMsg = costoEnvio > 0 ? `Envio: $${formatearPrecio(costoEnvio)}` : 'Envio: GRATIS';
    
    // Respuesta de confirmacion para pago en efectivo/transferencia
    let mensaje = '*Listo! Tu pedido esta confirmado*\n\n';
    mensaje += `Numero de pedido: #${numeroHex}\n`;
    mensaje += `Direccion: ${direccionEntrega}\n`;
    mensaje += `Telefono de contacto: ${telefonoFormateado}\n`;
    mensaje += `Subtotal: $${formatearPrecio(subtotal)}\n`;
    mensaje += `${lineaEnvioMsg}\n`;
    mensaje += `*Total: $${formatearPrecio(total)}*\n`;
    mensaje += `Forma de pago: *${sesion.metodoPago === 'efectivo' ? 'Efectivo' : 'Efectivo/Transferencia'}*\n\n`;
    
    // Link de seguimiento del pedido
    if (trackingToken) {
      mensaje += `Sigue tu pedido aqui:\n`;
      mensaje += `https://kdsapp.site/track/${trackingToken}\n\n`;
    }
    
    mensaje += '----------------------\n\n';
    mensaje += `Ya lo enviamos a la cocina de ${restaurantName}.\n\n`;
    mensaje += '*Pago:*\n';
    mensaje += '- Puedes pagar en efectivo al domiciliario\n';
    mensaje += '- O si prefieres transferencia, pregunta los datos al domiciliario\n\n';
    mensaje += '----------------------\n\n';
    mensaje += 'Te llamaremos al numero que nos diste cuando el domiciliario este en camino.\n\n';
    
    // Obtener tiempo de entrega configurado
    const tiempoEntrega = await obtenerTiempoEntrega(sesion.tenantId);
    mensaje += `Tiempo estimado: ${tiempoEntrega}\n\n`;
    mensaje += 'Quieres pedir algo mas? Escribe *menu* cuando quieras.';
    
    return mensaje;
    
  } catch (error) {
    console.error('❌ Error confirmando pedido en efectivo:', error);
    
    return '⚠️ *Error al procesar tu pedido*\n\n' +
           'Hubo un problema al guardar tu pedido.\n' +
           'Por favor intenta de nuevo en un momento.\n\n' +
           'Si el problema persiste, contacta a soporte.';
  }
}

/**
 * Elimina el último item del carrito
 */
function eliminarUltimoItem(sesion) {
  if (sesion.carrito.length === 0) {
    return '🛒 *Tu carrito está vacío*\n\n' +
           'No hay items para eliminar.';
  }
  
  const itemEliminado = sesion.carrito.pop();
  
  let mensaje = `🗑️ *Item eliminado*\n\n`;
  mensaje += `${itemEliminado.nombre} - $${formatearPrecio(itemEliminado.precio)}\n\n`;
  
  if (sesion.carrito.length > 0) {
    mensaje += `🛒 Items restantes: ${sesion.carrito.length}\n\n`;
    mensaje += 'Escribe *ver* para revisar tu carrito.';
  } else {
    mensaje += '🛒 Tu carrito está vacío ahora.\n\n';
    mensaje += 'Escribe *menu* para empezar de nuevo.';
  }
  
  return mensaje;
}

/**
 * Solicita la dirección de entrega al cliente
 */
function solicitarDireccion(sesion) {
  sesion.esperandoDireccion = true;
  
  let mensaje = '📍 *¡Perfecto! Solo necesitamos tu dirección*\n\n';
  mensaje += 'Por favor envíanos la dirección completa de entrega.\n\n';
  mensaje += '📝 *Formato:* Dirección + Tipo de vivienda\n\n';
  mensaje += '🏠 *Ejemplos:*\n';
  mensaje += '• Calle 80 #12-34 *casa*\n';
  mensaje += '• Carrera 45 #76-115 *edificio Perdiz apto 102*\n';
  mensaje += '• Av. 68 #23-45 *conjunto Castellana casa 12*\n';
  mensaje += '• Kr 15 #34-56 *edificio Torre B apto 301*\n\n';
  mensaje += '⚠️ *Es importante especificar:*\n';
  mensaje += '• Si es casa o conjunto/edificio\n';
  mensaje += '• Número de apartamento/casa si aplica\n';
  mensaje += '• Torre/bloque si aplica\n\n';
  mensaje += '¿A dónde enviamos tu pedido? 🏠';
  
  return mensaje;
}

/**
 * Valida y procesa la dirección ingresada
 */
async function procesarDireccion(sesion, direccion) {
  const direccionLimpia = direccion.trim();
  
  // Validación 1: debe contener # y al menos un número
  const tieneNumeral = direccionLimpia.includes('#');
  const tieneNumeros = /\d/.test(direccionLimpia);
  const longitudAdecuada = direccionLimpia.length >= 8;
  
  if (!tieneNumeral || !tieneNumeros || !longitudAdecuada) {
    return '⚠️ *Dirección no válida*\n\n' +
           'Por favor envía la dirección en el formato correcto:\n\n' +
           '📝 *Ejemplos válidos:*\n' +
           '• Calle 80 #12-34 casa\n' +
           '• Carrera 15 #45-67 edificio Perdiz apto 102\n' +
           '• Avenida 68 #23-45 conjunto Castellana casa 5\n' +
           '• Kr 45 #76-115 torre B apto 301\n\n' +
           '⚠️ *No olvides especificar si es casa o conjunto/edificio*\n\n' +
           '¿Cuál es tu dirección completa? 🏠';
  }
  
  // Validación 2: debe especificar tipo de vivienda (casa, conjunto, edificio, etc.)
  const textoLower = direccionLimpia.toLowerCase();
  
  // Patrones para detectar tipo de vivienda
  const tieneCasa = /\bcasa\b/.test(textoLower);
  const tieneConjunto = /\b(conjunto|condominio)\b/.test(textoLower);
  const tieneEdificio = /\b(edificio|edifisio|edif\.?)\b/.test(textoLower);
  const tieneApartamento = /\b(apto\.?|apartamento|apt\.?|dpt\.?|departamento|depto\.?)\b/.test(textoLower);
  const tieneTorre = /\b(torre|bloque|block)\b/.test(textoLower);
  
  // Verificar si tiene al menos un tipo de vivienda
  const tieneVivienda = tieneCasa || tieneConjunto || tieneEdificio || tieneApartamento || tieneTorre;
  
  if (!tieneVivienda) {
    return '⚠️ *Información incompleta*\n\n' +
           'Por favor especifica el tipo de vivienda:\n\n' +
           '🏠 *¿Es una casa o un conjunto/edificio?*\n\n' +
           '📝 *Ejemplos:*\n' +
           '• Calle 80 #12-34 *casa*\n' +
           '• Carrera 45 #76-115 *edificio Perdiz apto 102*\n' +
           '• Av. 68 #23-45 *conjunto Castellana casa 12*\n\n' +
           'Envía la dirección completa nuevamente con esta información. 📍';
  }
  
  // Si es edificio/conjunto, verificar que tenga número de apartamento/casa
  if ((tieneEdificio || tieneConjunto) && !tieneApartamento && !tieneCasa) {
    return '⚠️ *Información incompleta*\n\n' +
           'Indicaste que es un edificio o conjunto, pero no especificaste el número de apartamento/casa.\n\n' +
           '📝 *Por favor incluye:*\n' +
           '• Número de apartamento (apto, apt, dpt)\n' +
           '• O número de casa\n' +
           '• Torre/bloque si aplica\n\n' +
           '*Ejemplos:*\n' +
           '• Carrera 45 #76-115 edificio Perdiz *apto 102*\n' +
           '• Av. 68 #23-45 conjunto Castellana *casa 12*\n' +
           '• Kr 15 #34-56 edificio Torre B *apto 301*\n\n' +
           'Envía la dirección completa nuevamente. 📍';
  }
  
  // ✅ Dirección válida - guardar y solicitar teléfono
  sesion.direccion = direccionLimpia;
  sesion.esperandoDireccion = false;
  
  // Solicitar número de teléfono
  return solicitarTelefono(sesion);
}

/**
 * Solicita el número de teléfono de contacto al cliente
 */
function solicitarTelefono(sesion) {
  sesion.esperandoTelefono = true;
  
  let mensaje = '📱 *¡Genial! Ahora necesitamos tu número de contacto*\n\n';
  mensaje += 'Por favor envíanos un número de teléfono al cual podamos llamarte para avisar cuando el pedido llegue.\n\n';
  mensaje += '📝 *Formato:* 10 dígitos (puede incluir espacios o guiones)\n';
  mensaje += '*Ejemplos:*\n';
  mensaje += '• 3001234567\n';
  mensaje += '• 300 123 4567\n';
  mensaje += '• 300-123-4567\n\n';
  mensaje += '¿Cuál es tu número de contacto? ☎️';
  
  return mensaje;
}

/**
 * Valida y procesa el teléfono de contacto ingresado
 */
async function procesarTelefono(sesion, telefono) {
  // Limpiar teléfono: remover espacios, guiones, paréntesis
  const telefonoLimpio = telefono.replaceAll(/[\s\-()]/g, '');
  
  // Validación: debe tener 10 dígitos y solo números
  const soloNumeros = /^\d+$/.test(telefonoLimpio);
  const longitudCorrecta = telefonoLimpio.length === 10;
  
  if (!soloNumeros || !longitudCorrecta) {
    return '⚠️ *Número de teléfono no válido*\n\n' +
           'Por favor envía un número de teléfono válido de 10 dígitos.\n\n' +
           '📝 *Ejemplos válidos:*\n' +
           '• 3001234567\n' +
           '• 300 123 4567\n' +
           '• 300-123-4567\n\n' +
           '¿Cuál es tu número de contacto? ☎️';
  }
  
  // Guardar teléfono
  sesion.telefonoContacto = telefonoLimpio;
  sesion.esperandoTelefono = false;
  
  // ✨ Verificar si el restaurante tiene pagos configurados
  const gatewayConfig = await paymentConfigService.getConfig(sesion.tenantId, false);
  
  // Si NO tiene gateway configurado o no está habilitado, ir directo a confirmar (flujo tradicional)
  if (!gatewayConfig || !gatewayConfig.enabled || !gatewayConfig.hasCredentials) {
    return await confirmarPedido(sesion);
  }
  
  // Si SÍ tiene gateway configurado, solicitar método de pago
  return solicitarMetodoPago(sesion);
}

/**
 * 📝 Solicita comentarios opcionales del cliente para el pedido
 * ⚠️ OBSOLETO: Las notas ahora se agregan directamente con el pedido usando paréntesis
 * Ejemplo: "2 hamburguesas (sin cebolla)"
 * Mantenido comentado por retrocompatibilidad
 */
/*
function solicitarComentario(sesion) {
  sesion.esperandoComentario = true;
  
  let mensaje = '📝 *¿Algún comentario sobre tu pedido?*\n\n';
  mensaje += '💡 *Ejemplos:*\n';
  mensaje += '• "Sin cebolla en la hamburguesa"\n';
  mensaje += '• "Extra salsa por favor"\n';
  mensaje += '• "Bien cocido el termo de la carne"\n';
  mensaje += '• "Sin verduras"\n\n';
  mensaje += '━'.repeat(30) + '\n\n';
  mensaje += 'Escribe tu comentario o responde *no* si no tienes ninguno.';
  
  return mensaje;
}
*/

/**
 * 📝 Procesa el comentario del cliente (opcional)
 * ⚠️ OBSOLETO: Las notas ahora se agregan directamente con el pedido usando paréntesis
 * Mantenido comentado por retrocompatibilidad
 */
/*
async function procesarComentario(sesion, textoOriginal) {
  const texto = textoOriginal.toLowerCase().trim();
  
  // Si responde "no" o similar, continuar sin comentario
  const respuestasNegativas = ['no', 'nada', 'ninguno', 'no tengo', 'skip', 'omitir', 'continuar'];
  
  if (respuestasNegativas.includes(texto)) {
    sesion.esperandoComentario = false;
    sesion.comentario = null;
  } else {
    // Guardar el comentario
    sesion.esperandoComentario = false;
    sesion.comentario = textoOriginal.trim();
  }
  
  // ✨ NUEVO: Verificar si el restaurante tiene pagos configurados usando el nuevo servicio
  const gatewayConfig = await paymentConfigService.getConfig(sesion.tenantId, false);
  
  // Si NO tiene gateway configurado o no está habilitado, ir directo a confirmar (flujo tradicional)
  if (!gatewayConfig || !gatewayConfig.enabled || !gatewayConfig.hasCredentials) {
    return await confirmarPedido(sesion);
  }
  
  // Si tiene gateway configurado, preguntar método de pago
  return solicitarMetodoPago(sesion);
}
*/

/**
 * ✨ NUEVO: Solicita al cliente cómo desea pagar
 */
async function solicitarMetodoPago(sesion) {
  sesion.esperandoMetodoPago = true;
  
  // Calcular total del carrito para mostrarlo
  const subtotal = sesion.carrito.reduce((sum, item) => sum + item.precio, 0);
  
  // Obtener costo de envío y verificar si califica para domicilio gratis
  const envioData = await obtenerCostoEnvio(sesion.tenantId, subtotal);
  const costoEnvio = envioData.cost;
  const total = subtotal + costoEnvio;
  
  let mensaje = '💳 *¿Cómo deseas pagar tu pedido?*\n\n';
  mensaje += `💰 Total a pagar: *$${formatearPrecio(total)}*\n\n`;
  
  // 🎁 NUEVO: Recomendación de domicilio gratis
  if (envioData.isFreeShipping && envioData.freeShippingThreshold) {
    const diferencia = envioData.freeShippingThreshold - subtotal;
    
    if (diferencia > 0 && diferencia <= envioData.freeShippingThreshold * 0.3) {
      // Si está cerca del monto de domicilio gratis (dentro del 30%)
      mensaje += `🎁 *¡Estás cerca del domicilio gratis!*\n`;
      mensaje += `   Solo te faltan *$${formatearPrecio(diferencia)}* para obtener envío sin costo.\n`;
      mensaje += `   ¿Quieres agregar algo más? 😊\n\n`;
      mensaje += `   Escribe *menu* para ver opciones o continúa con tu pago.\n\n`;
      mensaje += '━'.repeat(30) + '\n\n';
    }
  } else if (envioData.isFreeShipping && envioData.freeShippingThreshold && subtotal >= envioData.freeShippingThreshold) {
    // Ya calificó para domicilio gratis
    mensaje += `🎉 *¡Felicidades! Tu domicilio es GRATIS*\n`;
    mensaje += `   Tu pedido supera los $${formatearPrecio(envioData.freeShippingThreshold)} ✨\n\n`;
    mensaje += '━'.repeat(30) + '\n\n';
  }
  
  mensaje += '📱 Selecciona una opción:\n\n';
  mensaje += '1️⃣ *Tarjeta* - Pago seguro en línea\n';
  mensaje += '   • Tarjeta de crédito/débito\n';
  mensaje += '   • PSE (transferencia bancaria)\n';
  mensaje += '   • Nequi\n';
  mensaje += '   🔒 100% seguro y encriptado\n\n';
  mensaje += '2️⃣ *Efectivo/Transferencia* - Al recibir\n';
  mensaje += '   • Paga en efectivo al domiciliario\n';
  mensaje += '   • O confirma tu transferencia después\n\n';
  mensaje += '━'.repeat(30) + '\n\n';
  mensaje += 'Responde *tarjeta* o *efectivo* para continuar.';
  
  return mensaje;
}

/**
 * ✨ NUEVO: Procesa la respuesta sobre el método de pago
 */
async function procesarMetodoPago(sesion, texto, textoOriginal) {
  // Normalizar respuesta
  const respuesta = texto.toLowerCase().trim();
  
  // Opciones válidas para tarjeta
  const opcionesTarjeta = [
    'tarjeta', '1', 'tarjetas', 'credito', 'crédito', 'debito', 
    'débito', 'pse', 'nequi', 'online', 'en linea', 'en línea',
    'pago en linea', 'pago en línea', 'pago online'
  ];
  
  // Opciones válidas para efectivo
  const opcionesEfectivo = [
    'efectivo', '2', 'cash', 'transferencia', 'contraentrega',
    'al recibir', 'cuando llegue', 'en efectivo'
  ];
  
  // Verificar si eligió tarjeta
  if (opcionesTarjeta.some(opt => respuesta.includes(opt))) {
    sesion.metodoPago = 'tarjeta';
    sesion.esperandoMetodoPago = false;
    
    // Confirmar pedido CON generación de enlace de pago
    return await confirmarPedido(sesion);
  }
  
  // Verificar si eligió efectivo
  if (opcionesEfectivo.some(opt => respuesta.includes(opt))) {
    sesion.metodoPago = 'efectivo';
    sesion.esperandoMetodoPago = false;
    
    // Confirmar pedido SIN generación de enlace (flujo tradicional)
    return await confirmarPedidoEfectivo(sesion);
  }
  
  // No entendió la respuesta
  return '❓ *No entendí tu respuesta*\n\n' +
         'Por favor indica cómo deseas pagar:\n\n' +
         '• Responde *tarjeta* para pago en línea\n' +
         '• Responde *efectivo* para pago al recibir\n\n' +
         '¿Cómo deseas pagar? 💳';
}

/**
 * Invalida el caché de membresía para un tenant específico
 * Útil cuando se activa/cambia un plan desde el dashboard
 * @param {string} tenantId - ID del tenant
 */
function invalidarCacheMembership(tenantId) {
  if (tenantId) {
    membershipCache.delete(tenantId);
    console.log(`🔄 [Membresía] Caché invalidado para tenant ${tenantId}`);
  } else {
    membershipCache.clear();
    console.log(`🔄 [Membresía] Caché completo invalidado`);
  }
}

module.exports = {
  processMessage, // Nuevo nombre para multi-tenant
  procesarMensaje: processMessage, // Alias para compatibilidad
  invalidarCacheMenu, // Para invalidar caché cuando se actualiza el menú desde dashboard
  invalidarCacheMembership // Para invalidar caché de membresía cuando se activa/cambia plan
};
