/**
 * 🧪 Test de Integración del Sistema de Túnel
 * 
 * Prueba la integración completa del sistema de túnel:
 * - Carga del tunnel-manager
 * - Simulación de conexión WebSocket
 * - Manejo de peticiones proxy
 * - Limpieza de recursos
 */

const EventEmitter = require('events');

console.log('🧪 Iniciando tests de integración del Tunnel Manager...\n');

// Test 1: Cargar módulo
console.log('Test 1: Cargar módulo tunnel-manager');
let tunnelManager;
try {
  tunnelManager = require('../server/tunnel-manager');
  console.log('✅ Módulo cargado correctamente\n');
} catch (error) {
  console.error('❌ Error cargando módulo:', error.message);
  process.exit(1);
}

// Test 2: Simular WebSocket
console.log('Test 2: Simular conexión WebSocket');
class MockWebSocket extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1; // OPEN
    this.messages = [];
  }
  
  send(data) {
    this.messages.push(data);
    // Simular que el mensaje fue enviado
    this.emit('message-sent', data);
  }
  
  close() {
    this.readyState = 0; // CLOSED
    this.emit('close');
  }
}

const mockWs = new MockWebSocket();
const testTenantId = 'test-tenant-123';

try {
  tunnelManager.registerTunnel(testTenantId, mockWs);
  console.log('✅ Túnel registrado correctamente');
  
  const hasTunnel = tunnelManager.hasTunnel(testTenantId);
  if (!hasTunnel) {
    throw new Error('hasTunnel() debería retornar true');
  }
  console.log('✅ hasTunnel() retorna true correctamente\n');
} catch (error) {
  console.error('❌ Error en simulación WebSocket:', error.message);
  process.exit(1);
}

// Test 3: Verificar estadísticas
console.log('Test 3: Verificar estadísticas');
try {
  const stats = tunnelManager.getStats();
  if (stats.activeTunnels !== 1) {
    throw new Error(`Esperado 1 túnel activo, obtenido ${stats.activeTunnels}`);
  }
  console.log('✅ Estadísticas correctas');
  console.log(`   - Túneles activos: ${stats.activeTunnels}`);
  console.log(`   - Peticiones pendientes: ${stats.pendingRequests}\n`);
} catch (error) {
  console.error('❌ Error en estadísticas:', error.message);
  process.exit(1);
}

// Test 4: Simular petición proxy con respuesta
console.log('Test 4: Simular petición proxy con respuesta');
(async () => {
  try {
    const testUrl = 'https://api.example.com/test';
    const proxyPromise = tunnelManager.proxyRequest(testTenantId, testUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Test' }
    });
    
    // Esperar un poco para que la petición se envíe
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verificar que el mensaje fue enviado
    if (mockWs.messages.length === 0) {
      throw new Error('No se envió ningún mensaje al WebSocket');
    }
    
    console.log('✅ Petición proxy enviada al túnel');
    
    const sentMessage = JSON.parse(mockWs.messages[0]);
    console.log(`   - Request ID: ${sentMessage.requestId}`);
    console.log(`   - URL: ${sentMessage.url}`);
    console.log(`   - Method: ${sentMessage.method}`);
    
    // Simular respuesta del túnel
    const responseMessage = {
      type: 'proxy.response',
      requestId: sentMessage.requestId,
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true })
    };
    
    tunnelManager.handleTunnelMessage(
      testTenantId,
      Buffer.from(JSON.stringify(responseMessage))
    );
    
    // Esperar respuesta
    const response = await proxyPromise;
    
    if (response.status !== 200) {
      throw new Error(`Esperado status 200, obtenido ${response.status}`);
    }
    
    console.log('✅ Respuesta recibida correctamente');
    console.log(`   - Status: ${response.status}`);
    console.log(`   - Body: ${response.body}\n`);
  } catch (error) {
    console.error('❌ Error en petición proxy:', error.message);
    process.exit(1);
  }
  
  // Test 5: Simular error en petición
  console.log('Test 5: Simular error en petición proxy');
  try {
    const testUrl2 = 'https://api.example.com/error';
    const errorPromise = tunnelManager.proxyRequest(testTenantId, testUrl2);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const sentMessage = JSON.parse(mockWs.messages[mockWs.messages.length - 1]);
    
    // Simular error
    const errorMessage = {
      type: 'proxy.error',
      requestId: sentMessage.requestId,
      error: 'Network error'
    };
    
    tunnelManager.handleTunnelMessage(
      testTenantId,
      Buffer.from(JSON.stringify(errorMessage))
    );
    
    try {
      await errorPromise;
      throw new Error('Debería haber lanzado un error');
    } catch (error) {
      if (error.message.includes('Network error')) {
        console.log('✅ Error manejado correctamente');
        console.log(`   - Error: ${error.message}\n`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error en test de error:', error.message);
    process.exit(1);
  }
  
  // Test 6: Validación de URL
  console.log('Test 6: Validación de URL inválida');
  try {
    try {
      await tunnelManager.proxyRequest(testTenantId, 'invalid-url');
      throw new Error('Debería haber rechazado URL inválida');
    } catch (error) {
      if (error.message.includes('Invalid URL')) {
        console.log('✅ URL inválida rechazada correctamente');
        console.log(`   - Error: ${error.message}\n`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error en validación de URL:', error.message);
    process.exit(1);
  }
  
  // Test 7: Limpieza al cerrar túnel
  console.log('Test 7: Limpieza de recursos al cerrar túnel');
  try {
    // Crear petición pendiente
    const pendingPromise = tunnelManager.proxyRequest(testTenantId, 'https://api.example.com/pending')
      .catch(error => error); // Capturar error para que no se propague como unhandled rejection
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Cerrar túnel (esto debería rechazar la petición pendiente)
    mockWs.close();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verificar que la petición pendiente fue rechazada
    const result = await pendingPromise;
    if (!(result instanceof Error)) {
      throw new Error('Petición pendiente debería haber sido rechazada con un error');
    }
    
    if (result.message.includes('Tunnel closed')) {
      console.log('✅ Peticiones pendientes limpiadas correctamente');
      console.log(`   - Error: ${result.message}`);
    } else {
      throw new Error(`Error inesperado: ${result.message}`);
    }
    
    // Verificar que el túnel fue removido
    const hasTunnel = tunnelManager.hasTunnel(testTenantId);
    if (hasTunnel) {
      throw new Error('Túnel no fue removido correctamente');
    }
    console.log('✅ Túnel removido correctamente\n');
  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
    process.exit(1);
  }
  
  // Test 8: Estadísticas finales
  console.log('Test 8: Verificar estadísticas finales');
  try {
    const stats = tunnelManager.getStats();
    if (stats.activeTunnels !== 0) {
      throw new Error(`Esperado 0 túneles activos, obtenido ${stats.activeTunnels}`);
    }
    if (stats.pendingRequests !== 0) {
      throw new Error(`Esperado 0 peticiones pendientes, obtenido ${stats.pendingRequests}`);
    }
    console.log('✅ Estadísticas finales correctas');
    console.log(`   - Túneles activos: ${stats.activeTunnels}`);
    console.log(`   - Peticiones pendientes: ${stats.pendingRequests}\n`);
  } catch (error) {
    console.error('❌ Error en estadísticas finales:', error.message);
    process.exit(1);
  }
  
  console.log('==================================================');
  console.log('✅ TODOS LOS TESTS DE INTEGRACIÓN PASARON');
  console.log('==================================================\n');
  console.log('💡 El sistema de túnel está funcionando correctamente');
  console.log('📝 Listo para pruebas con navegadores reales\n');
  
  process.exit(0);
})();
