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
 * Busca un producto por nombre o variación con fuzzy matching
 * @param {string} textoProducto - Texto del producto a buscar
 * @param {Array} menuCustom - Menú personalizado (opcional, usa menuActivo por defecto)
 */
function buscarProducto(textoProducto, menuCustom = null) {
  const menuAUsar = menuCustom || menuActivo;
  const textoNormalizado = normalizarTexto(textoProducto);
  const textoFonetico = normalizarFonetica(textoProducto);
  
  // Log para debugging
  console.log(`🔎 [buscarProducto] Buscando: "${textoProducto}" → normalizado: "${textoNormalizado}"`);
  
  // Nivel 1: Coincidencia exacta
  for (const producto of menuAUsar) {
    const variaciones = obtenerVariaciones(producto);
    
    if (variaciones.includes(textoNormalizado)) {
      return producto;
    }
  }
  
  // Nivel 2: Coincidencia parcial (contiene)
  for (const producto of menuAUsar) {
    const nombreNormalizado = normalizarTexto(producto.nombre);
    
    if (nombreNormalizado.includes(textoNormalizado) || 
        textoNormalizado.includes(nombreNormalizado)) {
      return producto;
    }
  }
  
  // Nivel 3: Búsqueda por palabras clave
  for (const producto of menuAUsar) {
    const variaciones = obtenerVariaciones(producto);
    
    for (const variacion of variaciones) {
      if (textoNormalizado.includes(variacion) || variacion.includes(textoNormalizado)) {
        return producto;
      }
    }
  }
  
  // Nivel 4: Búsqueda fonética (para errores ortográficos)
  for (const producto of menuAUsar) {
    const nombreFonetico = normalizarFonetica(producto.nombre);
    const variaciones = obtenerVariaciones(producto);
    
    // Comparar fonéticamente
    if (nombreFonetico === textoFonetico) {
      return producto;
    }
    
    // Comparar variaciones fonéticamente
    for (const variacion of variaciones) {
      const variacionFonetica = normalizarFonetica(variacion);
      if (variacionFonetica === textoFonetico) {
        return producto;
      }
    }
  }
  
  // Nivel 5: Fuzzy matching (distancia de Levenshtein) - umbral dinámico
  let mejorCoincidencia = null;
  let mejorScore = 0;
  
  // Umbral dinámico: palabras cortas necesitan mayor precisión
  // Palabras < 6 chars: 85%, 6-10 chars: 80%, > 10 chars: 75%
  const longitudTexto = textoNormalizado.length;
  const UMBRAL_FUZZY = longitudTexto < 6 ? 85 : (longitudTexto <= 10 ? 80 : 75);
  
  // Máxima diferencia de longitud permitida (proporcional al texto)
  // Ej: "chiribita" (9) vs "pizza" (5) = diff 4 > max 3 → descartado
  const MAX_DIFF_LONGITUD = Math.max(3, Math.floor(longitudTexto * 0.4));
  
  for (const producto of menuAUsar) {
    const nombreNormalizado = normalizarTexto(producto.nombre);
    const variaciones = obtenerVariaciones(producto);
    
    // Verificar diferencia de longitud antes de calcular similitud
    const diffLongitud = Math.abs(nombreNormalizado.length - longitudTexto);
    if (diffLongitud > MAX_DIFF_LONGITUD) {
      continue; // Descartar si la diferencia de longitud es muy grande
    }
    
    // Comparar nombre principal
    const scoreNombre = calcularSimilitud(textoNormalizado, nombreNormalizado);
    if (scoreNombre > mejorScore && scoreNombre >= UMBRAL_FUZZY) {
      mejorScore = scoreNombre;
      mejorCoincidencia = producto;
    }
    
    // Comparar variaciones
    for (const variacion of variaciones) {
      const diffVariacion = Math.abs(variacion.length - longitudTexto);
      if (diffVariacion > MAX_DIFF_LONGITUD) {
        continue; // También verificar longitud en variaciones
      }
      
      const scoreVariacion = calcularSimilitud(textoNormalizado, variacion);
      if (scoreVariacion > mejorScore && scoreVariacion >= UMBRAL_FUZZY) {
        mejorScore = scoreVariacion;
        mejorCoincidencia = producto;
      }
    }
  }
  
  if (mejorCoincidencia) {
    console.log(`✅ [buscarProducto] Match fuzzy: "${textoNormalizado}" → "${mejorCoincidencia.nombre}" (score: ${mejorScore}%)`);
    return mejorCoincidencia;
  }
  
  console.log(`❌ [buscarProducto] No encontrado: "${textoNormalizado}"`);
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
  
  // Normalizar texto
  let texto = textoPedido.toLowerCase();
  
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
    'gracias', 'grax', 'grax', 'thx', 'thanks', 'muchas gracias'
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
    // Extraer cantidad
    const cantidad = extraerCantidad(fragmento);
    
    // Limpiar fragmento de números y conectores
    let nombreProducto = fragmento
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
      // Verificar si ya existe en el carrito
      const itemExistente = items.find(i => i.numero === producto.numero);
      
      if (itemExistente) {
        itemExistente.cantidad += cantidad;
      } else {
        items.push({
          numero: producto.numero,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: cantidad
        });
      }
    } else if (nombreProducto.length > 3) {
      // Solo agregar error si el fragmento tiene contenido significativo
      errores.push(nombreProducto);
    }
  }
  
  return {
    items,
    errores,
    exitoso: items.length > 0
  };
}

/**
 * Genera un mensaje de confirmación del pedido parseado
 */
function generarMensajeConfirmacion(resultado) {
  if (!resultado.exitoso || resultado.items.length === 0) {
    let mensaje = '❌ No pude entender tu pedido.\n\n';
    
    if (resultado.errores.length > 0) {
      mensaje += '🤔 No encontré: ' + resultado.errores.join(', ') + '\n\n';
    }
    
    mensaje += '💡 *Tip:* Puedes pedir así:\n';
    mensaje += '• "Quiero 2 hamburguesas y 1 coca cola"\n';
    mensaje += '• "1 pizza con 3 cervezas"\n';
    mensaje += '• "Dame una milanesa y papas fritas"\n\n';
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
  let total = 0;
  resultado.items.forEach((item) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    mensaje += `• ${item.cantidad}x ${item.nombre} - $${formatearPrecio(subtotal)}\n`;
  });
  
  mensaje += `\n💰 Total: $${formatearPrecio(total)}\n\n`;
  
  if (resultado.errores.length > 0) {
    mensaje += `⚠️ No encontré: ${resultado.errores.join(', ')}\n\n`;
  }
  
  // Llamado a la acción más natural
  mensaje += 'Responde *sí* para confirmar o *cancelar* si quieres modificar algo.';
  
  return mensaje;
}

module.exports = {
  parsearPedido,
  generarMensajeConfirmacion,
  buscarProducto,
  normalizarTexto,
  formatearPrecio
};
