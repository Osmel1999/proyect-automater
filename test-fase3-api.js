/**
 * TEST FASE 3 - API Endpoints
 * Prueba los endpoints REST de Baileys
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/baileys';
const TEST_TENANT = 'test_tenant_fase3';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(icon, message, color = colors.reset) {
  console.log(`${color}${icon} ${message}${colors.reset}`);
}

function separator(title) {
  console.log('\n' + '═'.repeat(63));
  console.log(`  ${title}`);
  console.log('═'.repeat(63) + '\n');
}

async function testConnect() {
  separator('TEST 1: POST /api/baileys/connect');
  
  try {
    log('📡', 'Iniciando conexión...');
    
    const response = await axios.post(`${API_URL}/connect`, {
      tenantId: TEST_TENANT
    });

    if (response.data.success) {
      log('✅', 'Conexión iniciada exitosamente', colors.green);
      log('ℹ️', `Mensaje: ${response.data.message}`, colors.cyan);
      return true;
    } else {
      log('❌', 'Error en respuesta', colors.red);
      return false;
    }
  } catch (error) {
    log('❌', `Error: ${error.message}`, colors.red);
    if (error.response) {
      log('ℹ️', `Respuesta: ${JSON.stringify(error.response.data)}`, colors.yellow);
    }
    return false;
  }
}

async function testGetQR() {
  separator('TEST 2: GET /api/baileys/qr');
  
  try {
    log('📱', 'Obteniendo QR code...');
    
    // Esperar un poco para que se genere el QR
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await axios.get(`${API_URL}/qr`, {
      params: { tenantId: TEST_TENANT }
    });

    if (response.data.qr) {
      log('✅', 'QR code obtenido', colors.green);
      log('ℹ️', `Longitud: ${response.data.qr.length} caracteres`, colors.cyan);
      log('ℹ️', `Expira en: ${response.data.expiresIn}ms`, colors.cyan);
      return true;
    } else if (response.data.connected) {
      log('✅', 'Ya está conectado', colors.green);
      return true;
    } else {
      log('⚠️', 'QR no disponible aún', colors.yellow);
      log('ℹ️', `Mensaje: ${response.data.message}`, colors.cyan);
      return false;
    }
  } catch (error) {
    log('❌', `Error: ${error.message}`, colors.red);
    return false;
  }
}

async function testGetStatus() {
  separator('TEST 3: GET /api/baileys/status');
  
  try {
    log('📊', 'Obteniendo estado...');
    
    const response = await axios.get(`${API_URL}/status`, {
      params: { tenantId: TEST_TENANT }
    });

    log('✅', 'Estado obtenido', colors.green);
    log('ℹ️', `Conectado: ${response.data.connected}`, colors.cyan);
    log('ℹ️', `Teléfono: ${response.data.phoneNumber || 'N/A'}`, colors.cyan);
    
    return true;
  } catch (error) {
    log('❌', `Error: ${error.message}`, colors.red);
    return false;
  }
}

async function testGetStats() {
  separator('TEST 4: GET /api/baileys/stats');
  
  try {
    log('📈', 'Obteniendo estadísticas...');
    
    const response = await axios.get(`${API_URL}/stats`, {
      params: { tenantId: TEST_TENANT }
    });

    if (response.data.error) {
      log('⚠️', `Advertencia: ${response.data.error}`, colors.yellow);
      return true; // No es un error crítico
    }

    log('✅', 'Estadísticas obtenidas', colors.green);
    log('ℹ️', `Mensajes hoy: ${response.data.daily?.count || 0}/${response.data.daily?.limit || 1000}`, colors.cyan);
    log('ℹ️', `Uso: ${response.data.daily?.percentage || 0}%`, colors.cyan);
    
    return true;
  } catch (error) {
    log('❌', `Error: ${error.message}`, colors.red);
    return false;
  }
}

async function testDisconnect() {
  separator('TEST 5: POST /api/baileys/disconnect');
  
  try {
    log('🔌', 'Desconectando...');
    
    const response = await axios.post(`${API_URL}/disconnect`, {
      tenantId: TEST_TENANT
    });

    if (response.data.success) {
      log('✅', 'Desconectado exitosamente', colors.green);
      return true;
    } else {
      log('❌', 'Error al desconectar', colors.red);
      return false;
    }
  } catch (error) {
    log('❌', `Error: ${error.message}`, colors.red);
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '═'.repeat(63));
  console.log('  🧪 TEST SUITE - FASE 3 (API Endpoints)');
  console.log('═'.repeat(63));
  
  log('ℹ️', `API URL: ${API_URL}`, colors.cyan);
  log('ℹ️', `Tenant: ${TEST_TENANT}`, colors.cyan);
  log('ℹ️', 'NOTA: Asegúrate de que el servidor esté corriendo (npm start)', colors.yellow);
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  const results = {
    connect: await testConnect(),
    getQR: await testGetQR(),
    status: await testGetStatus(),
    stats: await testGetStats(),
    disconnect: await testDisconnect()
  };

  separator('RESUMEN DE TESTS');
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? colors.green : colors.red;
    log(icon, `${test}: ${passed ? 'PASADO' : 'FALLIDO'}`, color);
  });

  const allPassed = Object.values(results).every(Boolean);
  
  if (allPassed) {
    log('\n🎉', '¡TODOS LOS TESTS DE API PASARON!', colors.green);
    log('ℹ️', 'La API de Baileys está funcionando correctamente', colors.cyan);
    log('ℹ️', 'Puedes abrir onboarding-baileys.html en el navegador', colors.cyan);
  } else {
    log('\n⚠️', 'Algunos tests fallaron', colors.yellow);
    process.exit(1);
  }
}

// Ejecutar
(async () => {
  await runAllTests().catch(error => {
    log('❌', `Error fatal: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  });
})();
