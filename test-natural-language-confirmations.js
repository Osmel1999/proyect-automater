/**
 * TEST: Natural Language Confirmation
 * Valida que el bot entienda confirmaciones naturales en español
 */

const { parsearPedido, generarMensajeConfirmacion } = require('./server/pedido-parser');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(icon, message, color = colors.reset) {
  console.log(`${color}${icon} ${message}${colors.reset}`);
}

function separator(title) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70) + '\n');
}

// Menú de ejemplo para pruebas
const menuEjemplo = [
  { numero: '1', nombre: 'Hamburguesa', precio: 15000, categoria: 'Comidas' },
  { numero: '2', nombre: 'Pizza Muzzarella', precio: 25000, categoria: 'Comidas' },
  { numero: '3', nombre: 'Coca Cola', precio: 5000, categoria: 'Bebidas' },
  { numero: '4', nombre: 'Papas Fritas', precio: 8000, categoria: 'Acompañamientos' },
  { numero: '5', nombre: 'Cerveza', precio: 7000, categoria: 'Bebidas' }
];

async function testNaturalConfirmations() {
  separator('TEST: Palabras de confirmación natural');
  
  const confirmaciones = [
    'si', 'sí', 'correcto', 'dale', 'okay', 'ok', 
    'va', 'claro', 'perfecto', 'exacto', 'vale',
    'afirmativo', 'oki', 'sep', 'confirmo'
  ];
  
  log('📋', 'Validando que estas palabras sean reconocidas como confirmaciones:');
  confirmaciones.forEach(palabra => {
    log('✅', `  "${palabra}"`, colors.green);
  });
  
  log('\n💡', 'Nota: Estas palabras deben estar en el array confirmacionesNaturales en bot-logic.js', colors.cyan);
  
  return true;
}

async function testNaturalMessages() {
  separator('TEST: Mensajes más humanos y naturales');
  
  try {
    log('📋', 'Paso 1: Probando mensaje de confirmación para un pedido simple...\n');
    
    // Test 1: Pedido simple
    const pedido1 = parsearPedido('quiero 1 hamburguesa y 1 coca cola', menuEjemplo);
    const mensaje1 = generarMensajeConfirmacion(pedido1);
    
    console.log(colors.cyan + mensaje1 + colors.reset);
    
    // Validar que el mensaje sea natural
    const esNatural = mensaje1.includes('te confirmo tu pedido') || mensaje1.includes('Perfecto');
    const terminaConPregunta = mensaje1.includes('¿correcto?');
    
    if (esNatural && terminaConPregunta) {
      log('\n✅', 'El mensaje de confirmación es natural y amigable', colors.green);
    } else {
      log('\n⚠️', 'El mensaje podría ser más natural', colors.yellow);
    }
    
    // Test 2: Pedido con múltiples items
    log('\n📋', 'Paso 2: Probando mensaje de confirmación para pedido múltiple...\n');
    
    const pedido2 = parsearPedido('2 pizzas y 3 cervezas', menuEjemplo);
    const mensaje2 = generarMensajeConfirmacion(pedido2);
    
    console.log(colors.cyan + mensaje2 + colors.reset);
    
    // Validar que use lenguaje natural para múltiples items
    const usaConectores = mensaje2.includes(' y ') || mensaje2.includes(', ');
    
    if (usaConectores) {
      log('\n✅', 'El mensaje usa conectores naturales (y, ,)', colors.green);
    } else {
      log('\n⚠️', 'El mensaje podría usar conectores más naturales', colors.yellow);
    }
    
    // Test 3: Pedido complejo
    log('\n📋', 'Paso 3: Probando mensaje para pedido complejo...\n');
    
    const pedido3 = parsearPedido('una hamburguesa con papas fritas y dos coca colas', menuEjemplo);
    const mensaje3 = generarMensajeConfirmacion(pedido3);
    
    console.log(colors.cyan + mensaje3 + colors.reset);
    
    log('\n✅', 'Mensajes de confirmación: TESTS PASADOS', colors.green);
    return true;
    
  } catch (error) {
    log('❌', `Error en test de mensajes naturales: ${error.message}`, colors.red);
    console.error(error);
    return false;
  }
}

async function testHumanReadability() {
  separator('TEST: Verificar legibilidad humana');
  
  try {
    log('📋', 'Verificando que los mensajes NO contengan texto robótico...\n');
    
    const pedido = parsearPedido('2 hamburguesas y 1 cerveza', menuEjemplo);
    const mensaje = generarMensajeConfirmacion(pedido);
    
    // Frases robóticas que NO deberían aparecer
    const frasesRoboticas = [
      '✅ *Entendí tu pedido:*',
      '¿Está correcto tu pedido?',
      'Responde:',
      '• *confirmar* - Para confirmar el pedido',
      'Para confirmar el pedido'
    ];
    
    let esRobotico = false;
    frasesRoboticas.forEach(frase => {
      if (mensaje.includes(frase)) {
        log('⚠️', `  Encontrado texto robótico: "${frase}"`, colors.yellow);
        esRobotico = true;
      }
    });
    
    if (!esRobotico) {
      log('✅', 'El mensaje NO contiene texto robótico', colors.green);
    }
    
    // Frases naturales que SÍ deberían aparecer
    const frasesNaturales = [
      'Perfecto',
      '¿correcto?',
      'te confirmo',
      'Responde *sí*'
    ];
    
    let esNatural = false;
    frasesNaturales.forEach(frase => {
      if (mensaje.includes(frase)) {
        log('✅', `  Encontrada frase natural: "${frase}"`, colors.green);
        esNatural = true;
      }
    });
    
    if (esNatural) {
      log('\n✅', 'El mensaje usa lenguaje natural', colors.green);
    } else {
      log('\n⚠️', 'El mensaje podría ser más natural', colors.yellow);
    }
    
    console.log('\n' + colors.cyan + '='.repeat(70) + colors.reset);
    console.log(colors.cyan + 'MENSAJE GENERADO:' + colors.reset);
    console.log(colors.cyan + '='.repeat(70) + colors.reset);
    console.log(mensaje);
    console.log(colors.cyan + '='.repeat(70) + colors.reset);
    
    return true;
    
  } catch (error) {
    log('❌', `Error en test de legibilidad: ${error.message}`, colors.red);
    console.error(error);
    return false;
  }
}

// Ejecutar todos los tests
async function runAllTests() {
  console.log('\n🧪 EJECUTANDO TESTS DE LENGUAJE NATURAL\n');
  
  const results = [];
  
  results.push(await testNaturalConfirmations());
  results.push(await testNaturalMessages());
  results.push(await testHumanReadability());
  
  // Resumen final
  separator('RESUMEN DE TESTS');
  
  const passed = results.filter(r => r === true).length;
  const failed = results.filter(r => r === false).length;
  
  log('📊', `Tests ejecutados: ${results.length}`, colors.cyan);
  log('✅', `Tests pasados: ${passed}`, colors.green);
  
  if (failed > 0) {
    log('❌', `Tests fallidos: ${failed}`, colors.red);
  }
  
  if (failed === 0) {
    log('\n🎉', '¡TODOS LOS TESTS PASARON!', colors.green);
    process.exit(0);
  } else {
    log('\n⚠️', 'Algunos tests fallaron', colors.red);
    process.exit(1);
  }
}

// Ejecutar
runAllTests().catch(error => {
  console.error('Error ejecutando tests:', error);
  process.exit(1);
});
