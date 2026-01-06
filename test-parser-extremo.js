#!/usr/bin/env node
/**
 * Suite de Pruebas EXTREMAS del Parser
 * Casos difíciles con múltiples errores ortográficos, fonéticos y combinaciones complejas
 */

const { parsearPedido, generarMensajeConfirmacion } = require('./server/pedido-parser');

console.log('🔥 INICIANDO PRUEBAS EXTREMAS DEL PARSER\n');
console.log('='.repeat(60));

const casosExtremos = [
  {
    nombre: 'Triple error ortográfico',
    texto: 'jamburgueza kon papaz fritaz',
    esperado: { items: 2 }
  },
  {
    nombre: 'Mezcla de errores: s/z/c',
    texto: 'servesa y pitza mosarella',
    esperado: { items: 2 }
  },
  {
    nombre: 'Error extremo: múltiples letras cambiadas',
    texto: 'amburguessa con serbesa',
    esperado: { items: 2 }
  },
  {
    nombre: 'Sin h inicial + error',
    texto: 'amburguesa y aguaminerall',
    esperado: { items: 2 }
  },
  {
    nombre: 'Errores fonéticos complejos',
    texto: 'kiero dos burguer y tres kokas',
    esperado: { items: 2 }
  },
  {
    nombre: 'Todo minúsculas sin acentos',
    texto: 'milanese napolitana kon papas',
    esperado: { items: 2 }
  },
  {
    nombre: 'Errores de tecleo comunes',
    texto: 'hamburguwsa con cervezz',
    esperado: { items: 2 }
  },
  {
    nombre: 'Plurales incorrectos',
    texto: 'dos pizzas mozarelas y tres cervezes',
    esperado: { items: 2 }
  },
  {
    nombre: 'Mezcla v/b',
    texto: 'una serbesa y un bronie',
    esperado: { items: 2 }
  },
  {
    nombre: 'Palabras pegadas',
    texto: 'unajamburguesa condospitsa',
    esperado: { items: 2 }
  },
  {
    nombre: 'Números en texto + errores',
    texto: 'dos jamburguezas y tres servesas',
    esperado: { items: 2 }
  },
  {
    nombre: 'Error + sinónimo + error',
    texto: 'un burguer kon papaz y una chela',
    esperado: { items: 3 }
  },
  {
    nombre: 'Falta de espacios',
    texto: 'pizzamosarella',
    esperado: { items: 1 }
  },
  {
    nombre: 'Todo junto con "y"',
    texto: 'hamburguesaypizza',
    esperado: { items: 2 }
  },
  {
    nombre: 'Múltiples errores en cada palabra',
    texto: 'kiero una jamburguezza kon papaz fritaz y dosss servezzas',
    esperado: { items: 3 }
  },
  {
    nombre: 'Variación extrema de muzzarella',
    texto: 'pizza musarella',
    esperado: { items: 1 }
  },
  {
    nombre: 'Error en tacos',
    texto: 'dos takos al pastor',
    esperado: { items: 1, producto: 'Tacos al Pastor' }
  },
  {
    nombre: 'Error en brownie',
    texto: 'un brauni con elado',
    esperado: { items: 1, producto: 'Brownie con Helado' }
  },
  {
    nombre: 'Empanadas con z',
    texto: 'tres empanadaz de karne',
    esperado: { items: 1, producto: 'Empanadas de Carne' }
  },
  {
    nombre: 'Coca Cola variaciones extremas',
    texto: 'koka kola',
    esperado: { items: 1, producto: 'Coca Cola' }
  },
  {
    nombre: 'Pedido real con errores múltiples',
    texto: 'kiero 1 jako al paztor kon 1 botella de agwa y 1 brauni',
    esperado: { items: 3 }
  },
  {
    nombre: 'Sin vocales repetidas correctamente',
    texto: 'milanesaa napolittana',
    esperado: { items: 1, producto: 'Milanesa Napolitana' }
  },
  {
    nombre: 'Errores de autocorrector móvil',
    texto: 'hambirguesa complwta',
    esperado: { items: 1, producto: 'Hamburguesa Completa' }
  },
  {
    nombre: 'Mezcla mayúsculas/minúsculas con errores',
    texto: 'PiZZa MoZaReLa y CeRvEsA',
    esperado: { items: 2 }
  },
  {
    nombre: 'Números pegados a palabras',
    texto: '2hamburguesas 3cervezas',
    esperado: { items: 2 }
  }
];

let exitosos = 0;
let fallidos = 0;

casosExtremos.forEach((caso, index) => {
  console.log(`\n🔥 Caso Extremo ${index + 1}: ${caso.nombre}`);
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
      console.log(`\n❌ FALLO: Se esperaban ${caso.esperado.items} items, obtenidos=${resultado.items.length}`);
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
  
  if (caso.esperado.cantidad !== undefined && resultado.items.length > 0) {
    if (resultado.items[0].cantidad !== caso.esperado.cantidad) {
      console.log(`\n❌ FALLO: Se esperaba cantidad=${caso.esperado.cantidad}, obtenido=${resultado.items[0].cantidad}`);
      pasoTest = false;
    }
  }
  
  if (pasoTest) {
    console.log(`\n✅ TEST PASADO`);
    exitosos++;
  } else {
    console.log(`\n❌ TEST FALLIDO`);
    fallidos++;
  }
  
  console.log('='.repeat(60));
});

// Resumen final
console.log('\n\n📊 RESUMEN DE PRUEBAS EXTREMAS\n');
console.log('='.repeat(60));
console.log(`Total de pruebas: ${casosExtremos.length}`);
console.log(`✅ Exitosas: ${exitosos}`);
console.log(`❌ Fallidas: ${fallidos}`);
console.log(`📈 Tasa de éxito: ${((exitosos / casosExtremos.length) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (fallidos === 0) {
  console.log('\n🎉 ¡TODAS LAS PRUEBAS EXTREMAS PASARON! 🎉\n');
  console.log('🔥 El sistema de fuzzy matching es ROBUSTO 🔥\n');
} else {
  console.log(`\n⚠️ ${fallidos} prueba(s) fallaron. Revisar casos específicos.\n`);
}
