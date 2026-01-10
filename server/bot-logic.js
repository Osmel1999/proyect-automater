/**
 * Lógica del Bot de WhatsApp para Pedidos Automáticos (Multi-tenant)
 * Maneja conversaciones, carritos y confirmación de pedidos
 * Soporta múltiples restaurantes (tenants) con datos aislados
 */

const menu = require('./menu');
const firebaseService = require('./firebase-service');
const tenantService = require('./tenant-service');
const { parsearPedido, generarMensajeConfirmacion } = require('./pedido-parser');

// Almacenamiento en memoria de sesiones de usuario por tenant
// Formato: Map<tenantId_telefono, sesion>
const sesionesUsuarios = new Map();

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
      pedidoPendiente: null
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

/**
 * Procesa un mensaje entrante y retorna la respuesta
 * @param {string} tenantId - ID del tenant (restaurante)
 * @param {string} from - Número de teléfono del cliente
 * @param {string} texto - Mensaje recibido
 * @returns {Promise<string>} Respuesta a enviar
 */
async function processMessage(tenantId, from, texto) {
  // Limpiar el prefijo whatsapp: del número si existe
  const telefono = from.replace('whatsapp:', '').replace(/\D/g, '');
  const sesion = obtenerSesion(tenantId, telefono);
  
  // Normalizar texto
  const textoOriginal = texto.trim();
  texto = textoOriginal.toLowerCase();
  
  console.log(`📩 Procesando mensaje en tenant ${tenantId}`);
  console.log(`   Cliente: ${telefono}`);
  console.log(`   Mensaje: "${textoOriginal}"`);
  
  // ====================================
  // COMANDOS PRINCIPALES
  // ====================================
  
  // Saludo inicial o ayuda
  if (texto === 'hola' || texto === 'menu' || texto === 'empezar' || texto === 'start') {
    sesion.esperandoConfirmacion = false;
    sesion.pedidoPendiente = null;
    return mostrarMenu();
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
  
  // Confirmar pedido
  if (texto === 'confirmar' || texto === 'si' || texto === 'ok' || texto === 'listo') {
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
      
      // Enviar directamente a cocina
      return await confirmarPedido(sesion);
    }
    
    // Confirmación final del pedido
    return await confirmarPedido(sesion);
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
    const resultado = parsearPedido(textoOriginal);
    
    if (resultado.exitoso && resultado.items.length > 0) {
      // Guardar items parseados para confirmación
      sesion.esperandoConfirmacion = true;
      sesion.pedidoPendiente = resultado.items;
      
      return generarMensajeConfirmacion(resultado);
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
 * Muestra el menú completo
 */
function mostrarMenu() {
  const items = menu.obtenerTodos();
  
  let mensaje = '🍽️ *MENÚ DISPONIBLE*\n\n';
  
  // Agrupar por categoría
  const categorias = {};
  items.forEach(item => {
    if (!categorias[item.categoria]) {
      categorias[item.categoria] = [];
    }
    categorias[item.categoria].push(item);
  });
  
  // Mostrar por categorías
  for (const [categoria, items] of Object.entries(categorias)) {
    mensaje += `*${categoria.toUpperCase()}*\n`;
    items.forEach(item => {
      mensaje += `${item.numero}. ${item.nombre} - $${item.precio}\n`;
      mensaje += `   _${item.descripcion}_\n`;
    });
    mensaje += '\n';
  }
  
  mensaje += '━'.repeat(30) + '\n\n';
  mensaje += '📝 *¿Cómo ordenar?*\n\n';
  mensaje += '*Opción 1 - Lenguaje Natural:*\n';
  mensaje += 'Escribe tu pedido directamente:\n';
  mensaje += '_"Quiero 2 hamburguesas y 1 coca cola"_\n\n';
  mensaje += '*Opción 2 - Por Número:*\n';
  mensaje += 'Envía el número del item que deseas.\n';
  mensaje += 'Ejemplo: *1* para agregar item #1\n\n';
  mensaje += '━'.repeat(30) + '\n\n';
  mensaje += '💡 Luego escribe *ver* para revisar\n';
  mensaje += 'y *confirmar* para finalizar tu pedido.';
  
  return mensaje;
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
function agregarAlCarrito(sesion, texto) {
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
  
  const item = menu.obtenerItem(numero);
  
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
         `${item.nombre} - $${item.precio}\n\n` +
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
  
  let mensaje = '🛒 *TU PEDIDO ACTUAL*\n\n';
  let total = 0;
  
  // Agrupar items repetidos
  const itemsAgrupados = {};
  sesion.carrito.forEach(item => {
    const key = item.numero;
    if (!itemsAgrupados[key]) {
      itemsAgrupados[key] = { ...item, cantidad: 0 };
    }
    itemsAgrupados[key].cantidad += 1;
  });
  
  // Mostrar items
  Object.values(itemsAgrupados).forEach(item => {
    const subtotal = item.precio * item.cantidad;
    mensaje += `• ${item.cantidad}x ${item.nombre}\n`;
    mensaje += `  $${item.precio} c/u = $${subtotal}\n\n`;
    total += subtotal;
  });
  
  mensaje += '━'.repeat(30) + '\n';
  mensaje += `💰 *TOTAL: $${total}*\n`;
  mensaje += '━'.repeat(30) + '\n\n';
  mensaje += '¿Confirmas tu pedido?\n\n';
  mensaje += '• *confirmar* - Enviar pedido a la cocina\n';
  mensaje += '• *cancelar* - Cancelar todo\n';
  mensaje += '• *eliminar* - Quitar último item\n';
  mensaje += '• *[número]* - Agregar más items';
  
  return mensaje;
}

/**
 * Confirma y envía el pedido a Firebase (aislado por tenant)
 */
async function confirmarPedido(sesion) {
  if (sesion.carrito.length === 0) {
    return '❌ *Tu carrito está vacío*\n\n' +
           'Escribe *menu* para ver el menú y empezar a ordenar.';
  }
  
  try {
    // Obtener información del tenant
    const tenant = await tenantService.getTenantById(sesion.tenantId);
    const restaurantName = tenant.restaurant?.name || 'Restaurante';
    
    // Calcular total
    const total = sesion.carrito.reduce((sum, item) => sum + item.precio, 0);
    
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
    
    // Crear pedido con aislamiento por tenant
    const pedido = {
      id: numeroHex,
      tenantId: sesion.tenantId, // ✨ Aislamiento multi-tenant
      cliente: sesion.telefono,
      telefono: sesion.telefono,
      items: Object.values(itemsAgrupados),
      total: total,
      estado: 'pendiente',
      timestamp: Date.now(),
      fecha: new Date().toISOString(),
      fuente: 'whatsapp',
      restaurante: restaurantName
    };
    
    // Guardar en Firebase bajo el path del tenant
    const pedidoRef = firebaseService.database.ref(`tenants/${sesion.tenantId}/pedidos`);
    await pedidoRef.push(pedido);
    
    console.log(`✅ Pedido guardado para tenant ${sesion.tenantId}: #${numeroHex}`);
    
    // Incrementar estadísticas del tenant
    await tenantService.incrementOrderStats(sesion.tenantId);
    
    // Limpiar carrito
    sesion.carrito = [];
    
    // Respuesta de confirmación
    let mensaje = '🎉 *¡PEDIDO CONFIRMADO!*\n\n';
    mensaje += `🏪 ${restaurantName}\n`;
    mensaje += `📋 Número de pedido: #${numeroHex}\n`;
    mensaje += `💰 Total: $${total}\n`;
    mensaje += `📱 Cliente: ${sesion.telefono}\n\n`;
    mensaje += '━'.repeat(30) + '\n\n';
    mensaje += '✅ Tu pedido fue enviado a la cocina\n';
    mensaje += 'Te notificaremos cuando esté listo.\n\n';
    mensaje += '🕒 Tiempo estimado: 15-20 minutos\n\n';
    mensaje += '¿Quieres hacer otro pedido?\n';
    mensaje += 'Escribe *menu* para empezar.';
    
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
 * Elimina el último item del carrito
 */
function eliminarUltimoItem(sesion) {
  if (sesion.carrito.length === 0) {
    return '🛒 *Tu carrito está vacío*\n\n' +
           'No hay items para eliminar.';
  }
  
  const itemEliminado = sesion.carrito.pop();
  
  let mensaje = `🗑️ *Item eliminado*\n\n`;
  mensaje += `${itemEliminado.nombre} - $${itemEliminado.precio}\n\n`;
  
  if (sesion.carrito.length > 0) {
    mensaje += `🛒 Items restantes: ${sesion.carrito.length}\n\n`;
    mensaje += 'Escribe *ver* para revisar tu carrito.';
  } else {
    mensaje += '🛒 Tu carrito está vacío ahora.\n\n';
    mensaje += 'Escribe *menu* para empezar de nuevo.';
  }
  
  return mensaje;
}

module.exports = {
  processMessage, // Nuevo nombre para multi-tenant
  procesarMensaje: processMessage // Alias para compatibilidad
};
