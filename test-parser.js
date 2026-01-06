#!/usr/bin/env node
/**
 * Script de Prueba del Parser de Lenguaje Natural
 * Ejecutar: node test-parser.js
 */

const { parsearPedido, generarMensajeConfirmacion } = require('./server/pedido-parser');

console.log('🧪 INICIANDO PRUEBAS DEL PARSER\n');
console.log('='.repeat(60));

const casosPrueba = [
  {
    nombre: 'Pedido Simple',
    texto: 'Quiero 1 hamburguesa',
    esperado: { items: 1, producto: 'Hamburguesa Completa', cantidad: 1 }
  },
  {
    nombre: 'Error ortográfico: "jamburguesa"',
    texto: 'jamburguesa',
    esperado: { items: 1, producto: 'Hamburguesa Completa' }
  },
  {
    nombre: 'Error ortográfico: "mozzarella"',
    texto: 'pizza mozzarella',
    esperado: { items: 1, producto: 'Pizza Muzzarella' }
  },
  {
    nombre: 'Error ortográfico: "mosarela"',
    texto: 'pizza mosarela',
    esperado: { items: 1, producto: 'Pizza Muzzarella' }
  },
  {
    nombre: 'Error ortográfico: "mossarela"',
    texto: '1 pizza mossarela',
    esperado: { items: 1, producto: 'Pizza Muzzarella' }
  },
  {
    nombre: 'Error ortográfico: "serveza" (cerveza)',
    texto: 'una serveza',
    esperado: { items: 1, producto: 'Cerveza' }
  },
  {
    nombre: 'Error ortográfico: "papaz" (papas)',
    texto: 'papaz fritas',
    esperado: { items: 1, producto: 'Papas Fritas' }
  },
  {
    nombre: 'Pedido con "una" (cantidad implícita)',
    texto: 'una hamburguesa',
    esperado: { items: 1, cantidad: 1 }
  },
  {
    nombre: 'Botella de agua',
    texto: 'botella de agua',
    esperado: { items: 1, producto: 'Agua Mineral' }
  },
  {
    nombre: 'Pedido Múltiple con "y"',
    texto: 'Quiero 2 hamburguesas y 3 coca colas',
    esperado: { items: 2 }
  },
  {
    nombre: 'Pedido con "con"',
    texto: '1 pizza muzzarella con 2 cervezas',
    esperado: { items: 2 }
  },
  {
    nombre: 'Pedido con errores múltiples',
    texto: 'una jamburguesa con papaz fritas y serveza',
    esperado: { items: 3 }
  },
  {
    nombre: 'Pedido con comas',
    texto: '2 empanadas, 1 flan, 1 agua',
    esperado: { items: 3 }
  },
  {
    nombre: 'Números en texto',
    texto: 'Quiero dos hamburguesas y tres coca colas',
    esperado: { items: 2 }
  },
  {
    nombre: 'Con sinónimos',
    texto: 'Dame 2 burgers con coca',
    esperado: { items: 2 }
  },
  {
    nombre: 'Pedido complejo',
    texto: 'Quiero 1 hamburguesa completa, 2 pizzas, 3 cervezas y 1 flan',
    esperado: { items: 4 }
  },
  {
    nombre: 'Solo productos (sin cantidades explícitas)',
    texto: 'Hamburguesa y coca cola',
    esperado: { items: 2 }
  },
  {
    nombre: 'Con "dame"',
    texto: 'Dame una milanesa napolitana y papas fritas',
    esperado: { items: 2 }
  },
  {
    nombre: 'Botella de agua con cantidad',
    texto: 'Quiero 2 botellas de agua y una hamburguesa',
    esperado: { items: 2 }
  },
  {
    nombre: 'Pedido no válido',
    texto: 'Quiero sushi y ramen',
    esperado: { exitoso: false }
  }
];

let exitosos = 0;
let fallidos = 0;

casosPrueba.forEach((caso, index) => {
  console.log(`\n📋 Caso ${index + 1}: ${caso.nombre}`);
  console.log(`📝 Texto: "${caso.texto}"`);
  console.log('-'.repeat(60));
  
  const resultado = parsearPedido(caso.texto);
  
  console.log(`✅ Exitoso: ${resultado.exitoso}`);
  console.log(`📦 Items encontrados: ${resultado.items.length}`);
  
  if (resultado.items.length > 0) {
    console.log('\n🍽️ Items parseados:');
    resultado.items.forEach(item => {
      console.log(`   • ${item.cantidad}x ${item.nombre} - $${item.precio} c/u`);
    });
    
    const total = resultado.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    console.log(`\n💰 Total: $${total}`);
  }
  
  if (resultado.errores.length > 0) {
    console.log(`\n⚠️ No encontrados: ${resultado.errores.join(', ')}`);
  }
  
  // Validar resultado
  let pasoTest = true;
  
  if (caso.esperado.exitoso !== undefined) {
    if (resultado.exitoso !== caso.esperado.exitoso) {
      console.log(`\n❌ FALLO: Se esperaba exitoso=${caso.esperado.exitoso}, obtenido=${resultado.exitoso}`);
      pasoTest = false;
    }
  }
  
  if (caso.esperado.items !== undefined) {
    if (resultado.items.length !== caso.esperado.items) {
      console.log(`\n❌ FALLO: Se esperaban ${caso.esperado.items} items, obtenidos ${resultado.items.length}`);
      pasoTest = false;
    }
  }
  
  if (caso.esperado.producto !== undefined) {
    const encontrado = resultado.items.some(item => item.nombre === caso.esperado.producto);
    if (!encontrado) {
      console.log(`\n❌ FALLO: No se encontró el producto "${caso.esperado.producto}"`);
      pasoTest = false;
    }
  }
  
  if (caso.esperado.cantidad !== undefined) {
    const item = resultado.items[0];
    if (!item || item.cantidad !== caso.esperado.cantidad) {
      console.log(`\n❌ FALLO: Se esperaba cantidad ${caso.esperado.cantidad}`);
      pasoTest = false;
    }
  }
  
  if (pasoTest) {
    console.log('\n✅ TEST PASADO');
    exitosos++;
  } else {
    fallidos++;
  }
  
  console.log('='.repeat(60));
});

// Resumen final
console.log('\n\n📊 RESUMEN DE PRUEBAS\n');
console.log('='.repeat(60));
console.log(`Total de pruebas: ${casosPrueba.length}`);
console.log(`✅ Exitosas: ${exitosos}`);
console.log(`❌ Fallidas: ${fallidos}`);
console.log(`📈 Tasa de éxito: ${((exitosos / casosPrueba.length) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (fallidos === 0) {
  console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! 🎉\n');
  process.exit(0);
} else {
  console.log('\n⚠️ Algunas pruebas fallaron. Revisa los detalles arriba.\n');
  process.exit(1);
}
