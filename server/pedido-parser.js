/**
 * Parser de Lenguaje Natural para Pedidos
 * Permite interpretar pedidos escritos en lenguaje natural
 * Ejemplo: "Quiero 2 hamburguesas y 3 coca colas"
 */

const { menu: menuDefault } = require('./menu');
const fuzz = require('fuzzball');

// Variable para almacenar el menú activo (puede ser el default o el del tenant)
let menuActivo = menuDefault;

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
 * Normaliza texto para comparación
 */
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^\w\s]/g, '') // Quitar puntuación
    .trim();
}

/**
 * Normaliza plurales comunes en español
 */
function normalizarPlural(texto) {
  let normalizado = texto;
  
  // Plurales terminados en "s"
  if (normalizado.endsWith('s') && normalizado.length > 3) {
    // No quitar la "s" si es parte del nombre (ej: "papas fritas")
    const excepciones = ['papas', 'fritas', 'migas'];
    const palabras = normalizado.split(/\s+/);
    
    normalizado = palabras.map(palabra => {
      if (!excepciones.includes(palabra) && palabra.endsWith('s') && palabra.length > 3) {
        return palabra.slice(0, -1); // Quitar la "s" final
      }
      return palabra;
    }).join(' ');
  }
  
  return normalizado;
}

/**
 * Normalización fonética para español
 * Convierte palabras con errores ortográficos comunes a su forma fonética
 */
function normalizarFonetica(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    // Errores comunes en español
    .replace(/[sz]/g, 's')           // z → s (mossarela, mosarela)
    .replace(/j/g, 'h')              // j → h (jamburguesa → hamburguesa)
    .replace(/h/g, '')               // Quitar h (hamurguesa → amurguesa)
    .replace(/ll/g, 'y')             // ll → y (yave → llave)
    .replace(/y/g, 'i')              // y → i (i griega)
    .replace(/v/g, 'b')              // v → b (baca → vaca)
    .replace(/c([ei])/g, 's$1')      // ce/ci → se/si (sereza → cerveza)
    .replace(/qu/g, 'k')             // qu → k (keso → queso)
    .replace(/[ck]/g, 'k')           // c/k → k
    .replace(/[gj]u([ae])/g, 'gu$1') // gua/gue → gua/gue
    .replace(/gu([ei])/g, 'g$1')     // güe/güi → ge/gi
    .replace(/x/g, 'ks')             // x → ks
    .replace(/w/g, 'u')              // w → u (uisqui → whisky)
    .trim();
}

/**
 * Calcula la distancia de Levenshtein usando fuzzball
 */
function calcularSimilitud(texto1, texto2) {
  // Usar ratio de fuzzball (0-100)
  return fuzz.ratio(texto1, texto2);
}

/**
 * Crea variaciones y sinónimos de nombres de productos
 */
function obtenerVariaciones(producto) {
  const nombre = normalizarTexto(producto.nombre);
  const variaciones = [nombre];
  
  // Agregar nombre sin espacios
  variaciones.push(nombre.replace(/\s+/g, ''));
  
  // Agregar palabras individuales significativas (más de 4 letras)
  const palabras = nombre.split(/\s+/).filter(p => p.length > 4);
  variaciones.push(...palabras);
  
  // Sinónimos comunes y errores ortográficos comunes
  const sinonimos = {
    'hamburguesa': ['burger', 'burguer', 'hambur', 'burguesa', 'jamburguesa', 'amburguesa', 'hamburgueza', 'hamburguessa', 'jamburgueza', 'hamurguesa', 'amburgesa', 'hamburguwsa'],
    'pizza': ['piza', 'pitsa', 'pissa', 'pitza', 'pisa'],
    'muzzarella': ['mozzarella', 'mosarela', 'mossarela', 'mozarela', 'musarela', 'muzarela', 'mosarella', 'mozarella', 'mozarella'],
    'coca cola': ['coca', 'cocacola', 'coke', 'koka', 'koka kola', 'kokas'],
    'empanadas': ['empanada', 'empanadita', 'empanaditas', 'empanadas de carne', 'empanadaz', 'empanada de carne'],
    'papas fritas': ['papas', 'fritas', 'patatas', 'papaz', 'papaz fritas', 'papaz fritaz', 'papas fritaz'],
    'milanesa': ['mila', 'milaneza', 'milanese', 'millanesa', 'milanessa', 'milanesita', 'milanesaa'],
    'cerveza': ['birra', 'chela', 'cereza', 'serveza', 'cerbeza', 'servesa', 'serbesa', 'servezza', 'cervezz', 'servezzas', 'cervezes'],
    'agua mineral': ['agua', 'aguita', 'botella de agua', 'botellita de agua', 'botella agua', 'aguaminerall', 'agwa', 'botella de agwa'],
    'flan': ['flanito', 'flan casero'],
    'tacos': ['taco', 'takos', 'tako', 'jako', 'jakos'],
    'brownie': ['brauni', 'brouni', 'browni', 'bronie'],
    'pastor': ['paztor', 'pastur']
  };
  
  // Agregar sinónimos si existen
  Object.entries(sinonimos).forEach(([original, sins]) => {
    if (nombre.includes(original)) {
      variaciones.push(...sins);
    }
  });
  
  return [...new Set(variaciones)]; // Eliminar duplicados
}

/**
 * Busca un producto por nombre o variación con sistema de puntuación
 * Evalúa TODOS los productos y retorna el de mayor score
 * @param {string} textoProducto - Texto del producto a buscar
 * @param {Array} menuCustom - Menú personalizado (opcional, usa menuActivo por defecto)
 */
function buscarProducto(textoProducto, menuCustom = null) {
  const menuAUsar = menuCustom || menuActivo;
  const textoNormalizado = normalizarTexto(textoProducto);
  const textoSinPlural = normalizarPlural(textoNormalizado);
  const textoFonetico = normalizarFonetica(textoProducto);
  const palabrasTexto = textoNormalizado.split(/\s+/).filter(p => p.length > 2);
  
  // Log para debugging
  console.log(`🔎 [buscarProducto] Buscando: "${textoProducto}"`);
  console.log(`   → Normalizado: "${textoNormalizado}"`);
  console.log(`   → Sin plural: "${textoSinPlural}"`);
  
  // Sistema de puntuación: evaluar TODOS los productos
  let mejorProducto = null;
  let mejorScore = 0;
  let segundoMejor = null;
  let segundoScore = 0;
  const UMBRAL_MINIMO = 50; // Score mínimo para considerar un match
  
  for (const producto of menuAUsar) {
    const nombreNormalizado = normalizarTexto(producto.nombre);
    const nombreSinPlural = normalizarPlural(nombreNormalizado);
    const nombreFonetico = normalizarFonetica(producto.nombre);
    const palabrasProducto = nombreNormalizado.split(/\s+/).filter(p => p.length > 2);
    let score = 0;
    
    // ==========================================
    // NIVEL 1: Match exacto (100 puntos)
    // ==========================================
    if (textoNormalizado === nombreNormalizado || textoSinPlural === nombreSinPlural) {
      console.log(`✅ [buscarProducto] Match EXACTO: "${textoProducto}" → "${producto.nombre}"`);
      return producto; // Match perfecto, retornar inmediatamente
    }
    
    // ==========================================
    // NIVEL 2: Similitud del texto completo (0-40 puntos)
    // Incluir comparación sin plural
    // ==========================================
    const similitudCompleta = calcularSimilitud(textoNormalizado, nombreNormalizado);
    const similitudSinPlural = calcularSimilitud(textoSinPlural, nombreSinPlural);
    const mejorSimilitud = Math.max(similitudCompleta, similitudSinPlural);
    score += (mejorSimilitud / 100) * 40; // Max 40 puntos
    
    // ==========================================
    // NIVEL 3: Match por palabras individuales (0-35 puntos)
    // Cada palabra del cliente que hace match suma puntos
    // ==========================================
    let palabrasMatcheadas = 0;
    let sumaSimilitudPalabras = 0;
    
    for (const palabraCliente of palabrasTexto) {
      let mejorMatchPalabra = 0;
      
      for (const palabraProducto of palabrasProducto) {
        const similitudPalabra = calcularSimilitud(palabraCliente, palabraProducto);
        if (similitudPalabra > mejorMatchPalabra) {
          mejorMatchPalabra = similitudPalabra;
        }
      }
      
      if (mejorMatchPalabra >= 70) { // Umbral para considerar match de palabra
        palabrasMatcheadas++;
        sumaSimilitudPalabras += mejorMatchPalabra;
      }
    }
    
    // Puntaje por palabras: proporción de palabras matcheadas * calidad del match
    if (palabrasTexto.length > 0) {
      const proporcionMatch = palabrasMatcheadas / palabrasTexto.length;
      const calidadMatch = palabrasMatcheadas > 0 ? (sumaSimilitudPalabras / palabrasMatcheadas / 100) : 0;
      score += proporcionMatch * calidadMatch * 35; // Max 35 puntos
    }
    
    // ==========================================
    // NIVEL 4: Match fonético (0-15 puntos)
    // ==========================================
    const similitudFonetica = calcularSimilitud(textoFonetico, nombreFonetico);
    score += (similitudFonetica / 100) * 15; // Max 15 puntos
    
    // ==========================================
    // NIVEL 5: Bonus por contención (0-10 puntos)
    // Si el texto está contenido en el nombre o viceversa
    // ==========================================
    if (nombreNormalizado.includes(textoNormalizado)) {
      score += 10; // El producto contiene exactamente lo que busca el cliente
    } else if (textoNormalizado.includes(nombreNormalizado)) {
      score += 5; // El cliente escribió más de lo que es el producto
    }
    
    // ==========================================
    // Penalización por diferencia de longitud
    // ==========================================
    const diffLongitud = Math.abs(textoNormalizado.length - nombreNormalizado.length);
    const penalizacionLongitud = Math.min(diffLongitud * 0.5, 10); // Max 10 puntos de penalización
    score -= penalizacionLongitud;
    
    // Actualizar mejor y segundo mejor producto
    if (score > mejorScore) {
      segundoScore = mejorScore;
      segundoMejor = mejorProducto;
      mejorScore = score;
      mejorProducto = producto;
    } else if (score > segundoScore) {
      segundoScore = score;
      segundoMejor = producto;
    }
  }
  
  // Retornar si el score supera el umbral mínimo
  if (mejorProducto && mejorScore >= UMBRAL_MINIMO) {
    console.log(`✅ [buscarProducto] Match por SCORE: "${textoProducto}" → "${mejorProducto.nombre}" (score: ${mejorScore.toFixed(1)})`);
    if (segundoMejor && segundoScore >= UMBRAL_MINIMO - 10) {
      console.log(`   Segundo lugar: "${segundoMejor.nombre}" (score: ${segundoScore.toFixed(1)})`);
    }
    return mejorProducto;
  }
  
  // Logging mejorado cuando no encuentra
  console.log(`❌ [buscarProducto] No encontrado: "${textoProducto}"`);
  console.log(`   Mejor candidato: "${mejorProducto?.nombre || 'ninguno'}" (score: ${mejorScore.toFixed(1)}/${UMBRAL_MINIMO})`);
  if (segundoMejor) {
    console.log(`   Segundo lugar: "${segundoMejor.nombre}" (score: ${segundoScore.toFixed(1)})`);
  }
  
  return null;
}

/**
 * Extrae cantidad de un texto
 * Ejemplos: "2 pizzas", "dos hamburguesas", "una hamburguesa"
 */
function extraerCantidad(texto) {
  const textoNormalizado = texto.toLowerCase().trim();
  
  // Números en palabras (con y sin espacios después)
  const numerosTexto = {
    'un ': 1, 'una ': 1, 'uno ': 1,
    'dos ': 2, 'tres ': 3, 'cuatro ': 4, 'cinco ': 5,
    'seis ': 6, 'siete ': 7, 'ocho ': 8, 'nueve ': 9, 'diez ': 10,
    'media ': 0.5, 'medio ': 0.5
  };
  
  // Buscar número escrito al inicio del texto
  for (const [palabra, numero] of Object.entries(numerosTexto)) {
    if (textoNormalizado.startsWith(palabra)) {
      return numero;
    }
  }
  
  // Buscar número escrito en cualquier parte
  for (const [palabra, numero] of Object.entries(numerosTexto)) {
    if (textoNormalizado.includes(palabra)) {
      return numero;
    }
  }
  
  // Buscar número
  const match = textoNormalizado.match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  
  return 1; // Por defecto 1
}

/**
 * Parsea un pedido en lenguaje natural
 * Ejemplos:
 * - "Quiero 2 hamburguesas y 3 coca colas"
 * - "1 pizza muzzarella con 2 cervezas"
 * - "Dame una milanesa napolitana y papas fritas"
 */
/**
 * Parsea un pedido en lenguaje natural
 * @param {string} textoPedido - Texto del pedido
 * @param {Array} menuCustom - Menú personalizado del tenant (opcional)
 * @returns {Object} Objeto con items parseados y errores
 */
function parsearPedido(textoPedido, menuCustom = null) {
  const menuAUsar = menuCustom || menuActivo;
  const items = [];
  const errores = [];
  let notasPedido = null; // 📝 NUEVO: Notas a nivel de pedido completo
  
  // Normalizar texto
  let texto = textoPedido.toLowerCase();
  
  // PASO 0.5: Extraer notas entre paréntesis del pedido completo
  // Las notas se extraen primero y se eliminan del texto antes de parsear
  const matchNotasPedido = texto.match(/\(([^)]+)\)/);
  if (matchNotasPedido && matchNotasPedido[1]) {
    notasPedido = matchNotasPedido[1].trim();
    // Eliminar las notas del texto para que no interfieran con el parsing
    texto = texto.replace(/\([^)]+\)/g, '').trim();
  }
  
  // PASO 0: Limpiar palabras de cortesía al final del mensaje
  // Esto evita que "por favor" interfiera con la búsqueda
  const cortesiaFinal = /\s+(por\s*favor|porfa|porfavor|porfi|porfis|plis|please|plz|gracias|grax|thanks|thx|xfa|xfavor|x\s*favor)[\s!.]*$/gi;
  texto = texto.replace(cortesiaFinal, '');
  
  // PASO 1: Separar números pegados a palabras (muy importante para "2hamburguesas")
  // Esto convierte "2hamburguesas" → "2 hamburguesas"
  texto = texto.replace(/(\d+)([a-záéíóúñ])/gi, '$1 $2');
  
  // PASO 2: Separar palabras pegadas con "y" implícito
  // Esto ayuda con casos como "hamburguesaypizza" pero necesita cuidado
  // Solo lo hacemos si detectamos patrones específicos después del análisis inicial
  
  // PASO 3: Normalizar errores ortográficos comunes en separadores
  texto = texto
    .replace(/\bkon\b/g, ' con ')     // kon → con
    .replace(/\bkiero\b/g, '')        // kiero → (eliminar)
    .replace(/\skiero\s/g, ' ')       // kiero → (eliminar)
    .replace(/\ski\b/g, ' ')          // ki → (eliminar)
    .replace(/\bdos+\b/g, 'dos');     // dosss → dos
  
  // Palabras de conexión a ignorar (incluyendo variaciones con errores)
  const conectores = [
    'quiero', 'kiero', 'dame', 'queria', 'quisiera', 'me das', 'me traes',
    'con', 'kon', 'y', 'tambien', 'también', 'mas', 'más', 'ademas', 'además',
    // Palabras amables y cortesía (punto 3)
    'porfa', 'porfavor', 'por favor', 'porfis', 'plis', 'please', 'plz', 
    'x favor', 'xfavor', 'xfa', 'porfi', 'porfiiis',
    'gracias', 'grax', 'thx', 'thanks', 'muchas gracias'
  ];
  
  // Dividir por separadores comunes (incluyendo variaciones con errores)
  const separadores = /[,;]|\sy\s|\scon\s|\skon\s|\stambien\s|\stambién\s|\smas\s|\smás\s/i;
  let fragmentos = texto.split(separadores).map(f => f.trim()).filter(f => f.length > 0);
  
  // PASO 4: Intentar dividir fragmentos muy largos que puedan tener múltiples productos
  // PERO primero verificar si el fragmento completo ya es un producto válido
  const fragmentosProcesados = [];
  for (const fragmento of fragmentos) {
    // PRIMERO: Intentar buscar el producto con el texto completo (sin dividir)
    // Esto evita que "salchipapa chiribita" se divida incorrectamente
    const productoCompleto = buscarProducto(fragmento, menuAUsar);
    
    if (productoCompleto) {
      // Si encontramos el producto completo, usarlo directamente
      fragmentosProcesados.push(fragmento);
    } else if (fragmento.length > 20 && fragmento.includes(' ')) {
      // Solo dividir si es muy largo (>20 chars) y NO se encontró como producto completo
      // Esto maneja casos como "hamburguesa y pizza" que no son un solo producto
      const palabras = fragmento.split(/\s+/);
      let fragmentoActual = '';
      
      for (let i = 0; i < palabras.length; i++) {
        fragmentoActual += (fragmentoActual ? ' ' : '') + palabras[i];
        
        // Verificar si lo que llevamos hasta ahora es un producto válido
        const productoEncontrado = buscarProducto(fragmentoActual, menuAUsar);
        
        if (productoEncontrado && i < palabras.length - 1) {
          // Encontramos un producto, guardarlo y empezar uno nuevo
          fragmentosProcesados.push(fragmentoActual);
          fragmentoActual = '';
        }
      }
      
      // Agregar lo que queda
      if (fragmentoActual) {
        fragmentosProcesados.push(fragmentoActual);
      }
    } else {
      fragmentosProcesados.push(fragmento);
    }
  }
  
  fragmentos = fragmentosProcesados;
  
  for (const fragmento of fragmentos) {
    // 🧹 Limpiar palabras de cortesía del fragmento
    let fragmentoLimpio = fragmento.trim();
    
    // Eliminar cortesías en medio o al final del fragmento
    const palabrasCortesia = ['por favor', 'porfavor', 'porfa', 'porfis', 'porfi', 'plis', 'please', 'plz', 'gracias', 'grax', 'thanks', 'thx'];
    for (const cortesia of palabrasCortesia) {
      // Eliminar si está al final
      const regexFinal = new RegExp(`\\s+${cortesia}\\s*$`, 'i');
      fragmentoLimpio = fragmentoLimpio.replace(regexFinal, '');
      
      // Eliminar si está en medio (con espacios alrededor)
      const regexMedio = new RegExp(`\\s+${cortesia}\\s+`, 'gi');
      fragmentoLimpio = fragmentoLimpio.replace(regexMedio, ' ');
    }
    
    // Extraer cantidad
    const cantidad = extraerCantidad(fragmentoLimpio);
    
    // Limpiar fragmento de números y conectores
    let nombreProducto = fragmentoLimpio
      .replace(/\d+/g, '') // Quitar números
      .trim();
    
    // Quitar palabras de cantidad al inicio
    const palabrasCantidad = ['un ', 'una ', 'uno ', 'dos ', 'tres ', 'cuatro ', 'cinco ', 
                               'seis ', 'siete ', 'ocho ', 'nueve ', 'diez ', 'media ', 'medio '];
    
    for (const palabraCant of palabrasCantidad) {
      if (nombreProducto.toLowerCase().startsWith(palabraCant)) {
        nombreProducto = nombreProducto.substring(palabraCant.length).trim();
        break; // Solo quitar la primera coincidencia
      }
    }
    
    // Quitar conectores al inicio
    for (const conector of conectores) {
      if (nombreProducto.startsWith(conector + ' ')) {
        nombreProducto = nombreProducto.substring(conector.length).trim();
      }
    }
    
    // Buscar producto
    const producto = buscarProducto(nombreProducto, menuAUsar);
    
    if (producto) {
      // Verificar si ya existe en el carrito (sin considerar notas)
      const itemExistente = items.find(i => i.numero === producto.numero);
      
      if (itemExistente) {
        itemExistente.cantidad += cantidad;
      } else {
        const item = {
          numero: producto.numero,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: cantidad
        };
        items.push(item);
      }
    } else if (nombreProducto.length > 3) {
      // Solo agregar error si el fragmento tiene contenido significativo
      errores.push(nombreProducto);
    }
  }
  
  return {
    items,
    errores,
    notas: notasPedido, // 📝 NUEVO: Retornar notas del pedido completo
    exitoso: items.length > 0
  };
}

/**
 * Genera un mensaje de confirmación del pedido parseado
 * @param {Object} resultado - Resultado del parseo con items, errores y notas
 * @param {Number} costoEnvio - Costo de envío (opcional)
 * @param {Object} envioData - Datos del envío con información de envío gratis (opcional)
 */
function generarMensajeConfirmacion(resultado, costoEnvio = 0, envioData = null) {
  if (!resultado.exitoso || resultado.items.length === 0) {
    let mensaje = '❌ No pude entender tu pedido.\n\n';
    
    if (resultado.errores.length > 0) {
      mensaje += '🤔 No encontré: ' + resultado.errores.join(', ') + '\n\n';
    }
    
    mensaje += '💡 *Tip:* Puedes pedir así:\n';
    mensaje += '• "Quiero 2 hamburguesas y 1 coca cola"\n';
    mensaje += '• "1 pizza con 3 cervezas"\n';
    mensaje += '• "Dame una milanesa y papas fritas"\n\n';
    mensaje += '📝 *Agregar notas:* Usa paréntesis\n';
    mensaje += '• "2 hamburguesas (sin cebolla)"\n';
    mensaje += '• "1 pizza (extra queso, bien cocida)"\n\n';
    mensaje += 'O escribe *menu* para ver todas las opciones.';
    
    return mensaje;
  }
  
  // Construir lista de items en lenguaje natural
  let listaItems = '';
  const numItems = resultado.items.length;
  
  resultado.items.forEach((item, index) => {
    const nombreItem = item.nombre.toLowerCase();
    const descripcionItem = descripcionNaturalItem(nombreItem, item.cantidad);
    
    // Agregar item con conectores naturales
    if (index === 0) {
      listaItems += descripcionItem;
    } else if (index === numItems - 1) {
      listaItems += ` y ${descripcionItem}`;
    } else {
      listaItems += `, ${descripcionItem}`;
    }
  });
  
  // Mensaje más humano y natural
  let mensaje = `Perfecto, te confirmo tu pedido:\n\n`;
  mensaje += `${listaItems}, ¿correcto?\n\n`;
  
  // Detalles del pedido (opcional pero útil)
  mensaje += '*Detalle:*\n';
  let subtotal = 0;
  resultado.items.forEach((item) => {
    const itemTotal = item.precio * item.cantidad;
    subtotal += itemTotal;
    mensaje += `• ${item.cantidad}x ${item.nombre} - $${formatearPrecio(itemTotal)}\n`;
  });
  
  // 📝 Mostrar notas del pedido si existen
  if (resultado.notas) {
    mensaje += `\n📝 *Nota:* ${resultado.notas}\n`;
  }
  
  // Desglose de costos
  mensaje += `\n💰 Subtotal: $${formatearPrecio(subtotal)}\n`;
  
  // Mostrar costo de envío
  if (costoEnvio !== undefined && costoEnvio !== null) {
    if (envioData && envioData.isFree && envioData.freeDeliveryMin && subtotal >= envioData.freeDeliveryMin) {
      mensaje += `🚚 Envío: GRATIS (pedido mayor a $${formatearPrecio(envioData.freeDeliveryMin)})\n`;
    } else if (costoEnvio === 0) {
      mensaje += `🚚 Envío: GRATIS\n`;
    } else {
      mensaje += `🚚 Envío: $${formatearPrecio(costoEnvio)}\n`;
    }
  }
  
  const total = subtotal + (costoEnvio || 0);
  mensaje += `💳 *Total:* $${formatearPrecio(total)}\n\n`;
  
  if (resultado.errores.length > 0) {
    mensaje += `⚠️ No encontré: ${resultado.errores.join(', ')}\n\n`;
  }
  
  // Llamado a la acción con opción de editar
  mensaje += 'Responde:\n';
  mensaje += '• *sí* o *confirmar* - para continuar\n';
  mensaje += '• *editar* o *cambiar* - para modificar\n';
  mensaje += '• *cancelar* - para empezar de nuevo';
  
  return mensaje;
}

module.exports = {
  parsearPedido,
  generarMensajeConfirmacion,
  buscarProducto,
  normalizarTexto,
  formatearPrecio
};
