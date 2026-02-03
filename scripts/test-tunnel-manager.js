#!/usr/bin/env node

/**
 * Test básico del Tunnel Manager
 * Verifica que el módulo se carga correctamente y tiene las funciones esperadas
 */

console.log('🧪 Iniciando tests del Tunnel Manager...\n');

// Test 1: Cargar módulo
console.log('Test 1: Cargar módulo tunnel-manager');
try {
  const tunnelManager = require('../server/tunnel-manager');
  console.log('✅ Módulo cargado correctamente');
  console.log(`   - Tipo: ${typeof tunnelManager}`);
  console.log(`   - Constructor: ${tunnelManager.constructor.name}`);
} catch (error) {
  console.error('❌ Error cargando módulo:', error.message);
  process.exit(1);
}

// Test 2: Verificar métodos públicos
console.log('\nTest 2: Verificar métodos públicos');
const tunnelManager = require('../server/tunnel-manager');

const expectedMethods = [
  'registerTunnel',
  'hasTunnel',
  'proxyRequest',
  'getStats',
  'closeTunnel',
  'closeAll'
];

let allMethodsPresent = true;
for (const method of expectedMethods) {
  const hasMethod = typeof tunnelManager[method] === 'function';
  console.log(`   ${hasMethod ? '✅' : '❌'} ${method}: ${hasMethod ? 'presente' : 'FALTANTE'}`);
  if (!hasMethod) allMethodsPresent = false;
}

if (!allMethodsPresent) {
  console.error('❌ Algunos métodos están faltantes');
  process.exit(1);
}

// Test 3: Verificar estado inicial
console.log('\nTest 3: Verificar estado inicial');
try {
  const stats = tunnelManager.getStats();
  console.log('✅ getStats() funciona');
  console.log(`   - Túneles activos: ${stats.activeTunnels}`);
  console.log(`   - Peticiones pendientes: ${stats.pendingRequests}`);
  
  if (stats.activeTunnels !== 0) {
    console.warn('⚠️  Hay túneles activos en estado inicial (esperado: 0)');
  }
} catch (error) {
  console.error('❌ Error en getStats():', error.message);
  process.exit(1);
}

// Test 4: Verificar hasTunnel con tenant inexistente
console.log('\nTest 4: Verificar hasTunnel con tenant inexistente');
try {
  const hasTunnel = tunnelManager.hasTunnel('tenant-test-123');
  console.log('✅ hasTunnel() funciona');
  console.log(`   - Resultado: ${hasTunnel} (esperado: false)`);
  
  if (hasTunnel !== false) {
    console.error('❌ hasTunnel debería devolver false para tenant inexistente');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error en hasTunnel():', error.message);
  process.exit(1);
}

// Test 5: Verificar que proxyRequest falla sin túnel
console.log('\nTest 5: Verificar que proxyRequest falla sin túnel');
tunnelManager.proxyRequest('tenant-test-123', 'https://example.com')
  .then(() => {
    console.error('❌ proxyRequest debería fallar sin túnel activo');
    process.exit(1);
  })
  .catch((error) => {
    console.log('✅ proxyRequest falla correctamente sin túnel');
    console.log(`   - Error esperado: ${error.message}`);
    
    // Todos los tests pasaron
    console.log('\n' + '='.repeat(50));
    console.log('✅ TODOS LOS TESTS PASARON');
    console.log('='.repeat(50));
    console.log('\n💡 El módulo tunnel-manager está listo para usar');
    console.log('📝 Próximo paso: Probar con conexión WebSocket real\n');
    process.exit(0);
  });
