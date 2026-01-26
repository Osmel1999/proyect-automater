#!/usr/bin/env node

/**
 * Script de Prueba Completa - FASE 4
 * Valida el flujo completo de configuración de pagos
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  section('🏥 TEST 1: Health Check del Servidor');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/payments/health`, {
      timeout: 5000
    });
    
    if (response.status === 200) {
      log('✅ Servidor respondiendo correctamente', 'green');
      log(`   Status: ${response.data.status}`, 'blue');
      log(`   Service: ${response.data.service}`, 'blue');
      return true;
    }
  } catch (error) {
    log('❌ Error: Servidor no responde', 'red');
    log(`   ${error.message}`, 'red');
    log('\n💡 Asegúrate de iniciar el servidor con: npm run dev', 'yellow');
    return false;
  }
}

async function testValidateCredentialsValid() {
  section('🔍 TEST 2: Validar Credenciales VÁLIDAS');
  
  const credentials = {
    provider: 'wompi',
    credentials: {
      publicKey: process.env.WOMPI_PUBLIC_KEY,
      privateKey: process.env.WOMPI_PRIVATE_KEY,
      eventsSecret: process.env.WOMPI_EVENT_SECRET
    }
  };
  
  log('📤 Enviando credenciales válidas...', 'blue');
  log(`   Provider: ${credentials.provider}`, 'blue');
  log(`   Public Key: ${credentials.credentials.publicKey?.substring(0, 20)}...`, 'blue');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/payments/validate-credentials`,
      credentials,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      log('✅ Credenciales VÁLIDAS - Test exitoso', 'green');
      log(`   Mensaje: ${response.data.message}`, 'blue');
      return true;
    } else {
      log('❌ Credenciales inválidas (no esperado)', 'red');
      log(`   Error: ${response.data.error}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Error en validación', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${error.response.data?.error || 'Desconocido'}`, 'red');
    } else {
      log(`   ${error.message}`, 'red');
    }
    return false;
  }
}

async function testValidateCredentialsInvalid() {
  section('🔍 TEST 3: Validar Credenciales INVÁLIDAS');
  
  const credentials = {
    provider: 'wompi',
    credentials: {
      publicKey: 'pub_test_INVALID_KEY',
      privateKey: 'prv_test_INVALID_KEY',
      eventsSecret: 'test_events_INVALID'
    }
  };
  
  log('📤 Enviando credenciales inválidas (esperado que falle)...', 'blue');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/payments/validate-credentials`,
      credentials,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.data.success) {
      log('✅ Credenciales INVÁLIDAS detectadas correctamente', 'green');
      log(`   Error: ${response.data.error}`, 'blue');
      return true;
    } else {
      log('❌ No esperado: Credenciales inválidas aceptadas', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Error en validación', 'red');
    log(`   ${error.message}`, 'red');
    return false;
  }
}

async function testValidateCredentialsMissingData() {
  section('🔍 TEST 4: Validar Sin Datos (debe fallar)');
  
  const credentials = {
    provider: 'wompi',
    credentials: {}
  };
  
  log('📤 Enviando sin credenciales...', 'blue');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/payments/validate-credentials`,
      credentials,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.data.success) {
      log('✅ Datos faltantes detectados correctamente', 'green');
      log(`   Error: ${response.data.error}`, 'blue');
      return true;
    } else {
      log('❌ No esperado: Datos faltantes aceptados', 'red');
      return false;
    }
  } catch (error) {
    // 400 es esperado
    if (error.response?.status === 400) {
      log('✅ Error 400 recibido correctamente', 'green');
      return true;
    }
    log('❌ Error inesperado', 'red');
    log(`   ${error.message}`, 'red');
    return false;
  }
}

async function testDashboardAccess() {
  section('🌐 TEST 5: Acceso al Dashboard');
  
  try {
    const response = await axios.get(`${BASE_URL}/dashboard.html`, {
      timeout: 5000
    });
    
    if (response.status === 200 && response.data.includes('Configurar Pagos')) {
      log('✅ Dashboard accesible con botón de pagos', 'green');
      return true;
    } else if (response.status === 200) {
      log('⚠️  Dashboard accesible pero botón no encontrado', 'yellow');
      return false;
    }
  } catch (error) {
    log('❌ Error accediendo al dashboard', 'red');
    log(`   ${error.message}`, 'red');
    return false;
  }
}

async function testProviderNotImplemented() {
  section('🔍 TEST 6: Provider No Implementado (Bold/PayU)');
  
  const credentials = {
    provider: 'bold',
    credentials: {
      apiKey: 'test_key'
    }
  };
  
  log('📤 Probando con provider no implementado (Bold)...', 'blue');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/payments/validate-credentials`,
      credentials,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.data.success && response.data.error.includes('no está implementado')) {
      log('✅ Provider no implementado manejado correctamente', 'green');
      log(`   Mensaje: ${response.data.error}`, 'blue');
      return true;
    } else {
      log('❌ Respuesta inesperada', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Error en prueba', 'red');
    log(`   ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║    🧪 SUITE DE PRUEBAS - FASE 4 CONFIGURACIÓN DE PAGOS      ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');
  
  log(`\n📍 Base URL: ${BASE_URL}`, 'blue');
  log(`⏰ Inicio: ${new Date().toLocaleString('es-CO')}`, 'blue');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Credenciales Válidas', fn: testValidateCredentialsValid },
    { name: 'Credenciales Inválidas', fn: testValidateCredentialsInvalid },
    { name: 'Datos Faltantes', fn: testValidateCredentialsMissingData },
    { name: 'Acceso Dashboard', fn: testDashboardAccess },
    { name: 'Provider No Implementado', fn: testProviderNotImplemented }
  ];
  
  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    await sleep(500); // Pequeña pausa entre tests
  }
  
  // Resumen final
  section('📊 RESUMEN DE PRUEBAS');
  
  log(`Total de pruebas: ${results.total}`, 'blue');
  log(`✅ Exitosas: ${results.passed}`, 'green');
  log(`❌ Fallidas: ${results.failed}`, 'red');
  
  const percentage = ((results.passed / results.total) * 100).toFixed(1);
  log(`📈 Tasa de éxito: ${percentage}%`, percentage === '100.0' ? 'green' : 'yellow');
  
  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!', 'green');
    log('✅ El sistema está funcionando correctamente\n', 'green');
  } else {
    log('\n⚠️  ALGUNAS PRUEBAS FALLARON', 'yellow');
    log('Revisa los logs arriba para más detalles\n', 'yellow');
  }
  
  log(`⏰ Fin: ${new Date().toLocaleString('es-CO')}`, 'blue');
  console.log('\n');
  
  process.exit(results.failed === 0 ? 0 : 1);
}

// Ejecutar tests
runAllTests().catch(error => {
  log('\n❌ Error fatal en suite de pruebas:', 'red');
  console.error(error);
  process.exit(1);
});
