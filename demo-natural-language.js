/**
 * DEMO: Lenguaje Natural para Confirmaciones
 * 
 * Este script muestra cómo el bot ahora entiende confirmaciones en lenguaje natural
 * y responde de manera más humana y conversacional.
 */

const { parsearPedido, generarMensajeConfirmacion } = require('./server/pedido-parser');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

function log(icon, message, color = colors.reset) {
  console.log(`${color}${icon} ${message}${colors.reset}`);
}

function separator(char = '═', length = 70) {
  console.log('\n' + char.repeat(length) + '\n');
}

// Menú de ejemplo para la demostración
const menuEjemplo = [
  { numero: '1', nombre: 'Hamburguesa', precio: 15000, categoria: 'Comidas' },
  { numero: '2', nombre: 'Pizza Muzzarella', precio: 25000, categoria: 'Comidas' },
  { numero: '3', nombre: 'Pasta Carbonara', precio: 20000, categoria: 'Comidas' },
  { numero: '4', nombre: 'Coca Cola', precio: 5000, categoria: 'Bebidas' },
  { numero: '5', nombre: 'Papas Fritas', precio: 8000, categoria: 'Acompañamientos' },
  { numero: '6', nombre: 'Cerveza', precio: 7000, categoria: 'Bebidas' }
];

console.log('\n' + colors.bright + colors.cyan);
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║                                                                      ║');
console.log('║      🤖 DEMO: Bot de Pedidos con Lenguaje Natural                   ║');
console.log('║                                                                      ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log(colors.reset);

separator();

log('📝', 'ANTES: El bot era robótico y formal', colors.yellow);
console.log(colors.yellow);
console.log('Usuario: "Quiero una hamburguesa y una coca cola"');
console.log('\nBot (ANTES):');
console.log('✅ *Entendí tu pedido:*');
console.log('');
console.log('1. 1x Hamburguesa');
console.log('   $15.000 c/u = $15.000');
console.log('');
console.log('2. 1x Coca Cola');
console.log('   $5.000 c/u = $5.000');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('💰 *Total: $20.000*');
console.log('');
console.log('¿Está correcto tu pedido?');
console.log('');
console.log('Responde:');
console.log('• *confirmar* - Para confirmar el pedido');
console.log('• *agregar* + tu pedido - Para agregar más items');
console.log('• *cancelar* - Para cancelar y empezar de nuevo');
console.log(colors.reset);

separator();

log('✨', 'AHORA: El bot es más natural y humano', colors.green);
console.log(colors.green);
console.log('Usuario: "Quiero una hamburguesa y una coca cola"');
console.log('\nBot (AHORA):');
console.log(colors.cyan);
const pedido1 = parsearPedido('quiero una hamburguesa y una coca cola', menuEjemplo);
const mensaje1 = generarMensajeConfirmacion(pedido1);
console.log(mensaje1);
console.log(colors.reset);

separator();

log('💬', 'PALABRAS QUE EL BOT AHORA ENTIENDE', colors.magenta);
console.log(colors.magenta);
console.log('El usuario puede confirmar con cualquiera de estas palabras:');
console.log('');
const confirmaciones = [
  'si', 'sí', 'correcto', 'dale', 'okay', 'ok', 
  'va', 'claro', 'afirmativo', 'sale', 'oki', 
  'okey', 'sep', 'yes', 'yep', 'ya', 'vale',
  'perfecto', 'exacto', 'eso', 'así es', 
  'por supuesto', 'confirmo', 'está bien'
];

// Mostrar en columnas
for (let i = 0; i < confirmaciones.length; i += 4) {
  const grupo = confirmaciones.slice(i, i + 4);
  console.log('  ' + grupo.map(c => `"${c}"`).join(',  '));
}
console.log(colors.reset);

separator();

log('🎯', 'MÁS EJEMPLOS', colors.blue);

// Ejemplo 2
console.log(colors.blue + '\n1. Usuario: "2 pizzas y 3 cervezas"' + colors.reset);
console.log(colors.cyan);
const pedido2 = parsearPedido('2 pizzas y 3 cervezas', menuEjemplo);
const mensaje2 = generarMensajeConfirmacion(pedido2);
console.log(mensaje2);
console.log(colors.reset);

// Ejemplo 3
console.log(colors.blue + '\n2. Usuario: "una pasta carbonara con papas fritas y dos coca colas"' + colors.reset);
console.log(colors.cyan);
const pedido3 = parsearPedido('una pasta carbonara con papas fritas y dos coca colas', menuEjemplo);
const mensaje3 = generarMensajeConfirmacion(pedido3);
console.log(mensaje3);
console.log(colors.reset);

separator();

log('🎉', 'BENEFICIOS DE ESTOS CAMBIOS', colors.green);
console.log(colors.green);
console.log('  ✓ El bot se siente más humano y menos robótico');
console.log('  ✓ Los usuarios pueden responder naturalmente');
console.log('  ✓ No necesitan recordar comandos específicos');
console.log('  ✓ La conversación fluye de manera más natural');
console.log('  ✓ Mejor experiencia de usuario (UX)');
console.log(colors.reset);

separator();

console.log(colors.bright + colors.cyan);
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║                                                                      ║');
console.log('║      ✅ Demo completado exitosamente                                ║');
console.log('║                                                                      ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log(colors.reset + '\n');
