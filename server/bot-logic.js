/**
 * Lógica del Bot de WhatsApp para Pedidos Automáticos (Multi-tenant)
 * Maneja conversaciones, carritos y confirmación de pedidos
 * Soporta múltiples restaurantes (tenants) con datos aislados
 */

const menuService = require('./menu-service');
const firebaseService = require('./firebase-service');
const tenantService = require('./tenant-service');
const { parsearPedido, generarMensajeConfirmacion } = require('./pedido-parser');

// Almacenamiento en memoria de sesiones de usuario por tenant
// Formato: Map<tenantId_telefono, sesion>
const sesionesUsuarios = new Map();

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
      direccion: null
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
  
  // Normalizar texto
  const textoOriginal = texto.trim();
  texto = textoOriginal.toLowerCase();
  
  console.log(`📩 Procesando mensaje en tenant ${tenantId}`);
  console.log(`   Cliente: ${telefono}`);
  console.log(`   Mensaje: "${textoOriginal}"`);
  
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
  // COMANDOS PRINCIPALES
  // ====================================
  
  // Saludo inicial o ayuda
  if (texto === 'hola' || texto === 'menu' || texto === 'empezar' || texto === 'start') {
    sesion.esperandoConfirmacion = false;
    sesion.pedidoPendiente = null;
    
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
    // Obtener el menú del tenant para el parser
    const menuTenant = await obtenerMenuTenant(tenantId);
    console.log(`📋 Menú del tenant obtenido: ${menuTenant.length} items`);
    
    const resultado = parsearPedido(textoOriginal, menuTenant);
    
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
 * Muestra el menú completo del tenant
 */
async function mostrarMenu(tenantId) {
  try {
    // Obtener menú del tenant desde Firebase
    const menuSnapshot = await firebaseService.database.ref(`tenants/${tenantId}/menu/items`).once('value');
    const menuItems = menuSnapshot.val();
    
    console.log(`📋 Generando menú para tenant ${tenantId}`);
    console.log(`   Items en Firebase:`, menuItems ? Object.keys(menuItems).length : 0);
    
    // Si no hay menú en Firebase, usar el menú hardcodeado como fallback
    let items = [];
    
    if (menuItems && Object.keys(menuItems).length > 0) {
      // Convertir objeto de Firebase a array
      items = Object.values(menuItems).filter(item => item.available !== false);
      console.log(`   ✅ Usando menú de Firebase: ${items.length} items`);
    } else {
      // Fallback: usar menú hardcodeado
      items = menu.obtenerTodos();
      console.log(`   ⚠️  Usando menú hardcodeado (fallback): ${items.length} items`);
    }
    
    if (items.length === 0) {
      return '❌ *Lo sentimos*\n\nEl menú aún no está disponible. Por favor contacta al restaurante.';
    }
    
    let mensaje = '🍽️ *MENÚ DISPONIBLE*\n\n';
    
    // Agrupar por categoría
    const categorias = {};
    items.forEach((item, index) => {
      const categoria = item.category || item.categoria || 'Otros';
      if (!categorias[categoria]) {
        categorias[categoria] = [];
      }
      // Agregar número si no tiene
      if (!item.numero && !item.number) {
        item.numero = String(index + 1);
      }
      categorias[categoria].push(item);
    });
    
    // Mostrar por categorías
    for (const [categoria, itemsCategoria] of Object.entries(categorias)) {
      mensaje += `*${categoria.toUpperCase()}*\n`;
      itemsCategoria.forEach(item => {
        const numero = item.numero || item.number || '?';
        const nombre = item.name || item.nombre || 'Sin nombre';
        const precio = item.price || item.precio || 0;
        const descripcion = item.description || item.descripcion || '';
        
        mensaje += `${numero}. ${nombre} - $${formatearPrecio(precio)}\n`;
        if (descripcion) {
          mensaje += `   _${descripcion}_\n`;
        }
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
    
    console.log(`✅ Menú generado. Longitud: ${mensaje.length} caracteres`);
    
    return mensaje;
  } catch (error) {
    console.error(`❌ Error generando menú para tenant ${tenantId}:`, error);
    // Fallback en caso de error
    return '❌ *Error temporal*\n\nNo pudimos cargar el menú. Por favor intenta de nuevo en un momento.';
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
  const itemsAgrupados = {};
  sesion.carrito.forEach(item => {
    const key = item.numero;
    if (!itemsAgrupados[key]) {
      itemsAgrupados[key] = { ...item, cantidad: 0 };
    }
    itemsAgrupados[key].cantidad += 1;
  });
  
  // Construir lista natural de items
  const items = Object.values(itemsAgrupados);
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
  
  mensaje += `\n💰 Total: $${formatearPrecio(total)}\n\n`;
  mensaje += '¿Está todo correcto?\n\n';
  mensaje += 'Responde *sí* para confirmar o *cancelar* si quieres modificar algo.';
  
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
      direccion: sesion.direccion || 'No especificada', // ✨ Dirección de entrega
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
    
    // Limpiar carrito y dirección
    sesion.carrito = [];
    const direccionEntrega = sesion.direccion;
    sesion.direccion = null;
    
    // Respuesta de confirmación más natural y humana
    let mensaje = '🎉 *¡Listo! Tu pedido está confirmado*\n\n';
    mensaje += `📋 Número de pedido: #${numeroHex}\n`;
    mensaje += `📍 Dirección: ${direccionEntrega}\n`;
    mensaje += `💰 Total: $${formatearPrecio(total)}\n\n`;
    mensaje += `Ya lo enviamos a la cocina de ${restaurantName}.\n`;
    mensaje += 'Te avisaremos cuando el domiciliario esté en camino. 🛵\n\n';
    mensaje += '🕒 Tiempo estimado: 30-40 minutos\n\n';
    mensaje += '¿Quieres pedir algo más? Escribe *menu* cuando quieras.';
    
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
  mensaje += '📝 *Formato:* Calle/Carrera + # + número\n';
  mensaje += '*Ejemplo:* Calle 80 #12-34\n\n';
  mensaje += '¿A dónde enviamos tu pedido? 🏠';
  
  return mensaje;
}

/**
 * Valida y procesa la dirección ingresada
 */
async function procesarDireccion(sesion, direccion) {
  const direccionLimpia = direccion.trim();
  
  // Validación simple: debe contener # y al menos un número
  const tieneNumeral = direccionLimpia.includes('#');
  const tieneNumeros = /\d/.test(direccionLimpia);
  const longitudAdecuada = direccionLimpia.length >= 8;
  
  if (!tieneNumeral || !tieneNumeros || !longitudAdecuada) {
    return '⚠️ *Dirección no válida*\n\n' +
           'Por favor envía la dirección en el formato correcto:\n\n' +
           '📝 *Ejemplos válidos:*\n' +
           '• Calle 80 #12-34\n' +
           '• Carrera 15 #45-67\n' +
           '• Avenida 68 #23-45\n' +
           '• Kr 45 #76-115\n\n' +
           '¿Cuál es tu dirección? 🏠';
  }
  
  // Guardar dirección
  sesion.direccion = direccionLimpia;
  sesion.esperandoDireccion = false;
  
  // Confirmar pedido con dirección
  return await confirmarPedido(sesion);
}

module.exports = {
  processMessage, // Nuevo nombre para multi-tenant
  procesarMensaje: processMessage // Alias para compatibilidad
};
