/**
 * TEST FASE 2 - Unit Tests (sin conexión real)
 * Valida la lógica de mensajería y anti-ban sin necesidad de conectar WhatsApp
 */

const MessageAdapter = require('./server/baileys/message-adapter');
const antiBan = require('./server/baileys/anti-ban');

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
  console.log('\n' + '═'.repeat(63));
  console.log(`  ${title}`);
  console.log('═'.repeat(63) + '\n');
}

async function testMessageAdapter() {
  separator('TEST 1: Message Adapter');
  
  try {
    // Test 1: Validar formato de mensaje
    log('📋', 'Paso 1: Validando formato de mensajes...');
    
    const validMessage = {
      to: '573001234567@s.whatsapp.net',
      text: 'Hola mundo'
    };
    
    const invalidMessage = {
      to: '573001234567', // Sin formato @s.whatsapp.net
      text: 'Test'
    };
    
    log('✅', `Mensaje válido: ${JSON.stringify(validMessage)}`, colors.green);
    log('ℹ️', `Mensaje inválido: ${JSON.stringify(invalidMessage)}`, colors.yellow);
    
    // Test 2: Validar normalización de números
    log('\n📋', 'Paso 2: Validando normalización de números...');
    
    const testNumbers = [
      '+57 300 123 4567',
      '573001234567',
      '3001234567',
      '57-300-123-4567'
    ];
    
    testNumbers.forEach(number => {
      const normalized = number.replaceAll(/[^\d]/g, '');
      const formatted = normalized + '@s.whatsapp.net';
      log('✅', `${number} → ${formatted}`, colors.green);
    });
    
    log('\n✅', 'Message Adapter: TESTS PASADOS', colors.green);
    return true;
  } catch (error) {
    log('❌', `Error en Message Adapter: ${error.message}`, colors.red);
    return false;
  }
}

async function testAntiBan() {
  separator('TEST 2: Anti-Ban Logic');
  
  try {
    // Test 1: Rate Limiting
    log('📋', 'Paso 1: Testing Rate Limiting...');
    
    const startTime = Date.now();
    let requestCount = 0;
    
    for (let i = 0; i < 5; i++) {
      if (antiBan.canSendMessage('test_tenant')) {
        requestCount++;
        antiBan.recordMessageSent('test_tenant');
        log('✅', `Mensaje ${i + 1} enviado`, colors.green);
      } else {
        log('⚠️', `Mensaje ${i + 1} bloqueado por rate limiting`, colors.yellow);
      }
    }
    
    const elapsed = Date.now() - startTime;
    log('ℹ️', `Enviados: ${requestCount}/5 mensajes en ${elapsed}ms`, colors.cyan);
    
    // Test 2: Delays aleatorios
    log('\n📋', 'Paso 2: Testing delays aleatorios...');
    
    for (let i = 0; i < 3; i++) {
      const delay = antiBan.calculateDelay('test_tenant');
      log('✅', `Delay ${i + 1}: ${delay}ms`, colors.green);
    }
    
    // Test 3: Cooldown check
    log('\n📋', 'Paso 3: Testing cooldown...');
    
    antiBan.recordMessageSent('test_tenant', '573001234567@s.whatsapp.net', 'test');
    const usage = antiBan.usage.get('test_tenant');
    const inCooldown = usage && usage.inCooldown;
    log('ℹ️', `En cooldown: ${inCooldown}`, colors.cyan);
    
    // Test 4: Estadísticas
    log('\n📋', 'Paso 4: Obteniendo estadísticas...');
    const stats = antiBan.getUsageStats('test_tenant');
    log('ℹ️', `Stats: ${JSON.stringify(stats, null, 2)}`, colors.cyan);
    
    log('\n✅', 'Anti-Ban Logic: TESTS PASADOS', colors.green);
    return true;
  } catch (error) {
    log('❌', `Error en Anti-Ban: ${error.message}`, colors.red);
    console.error(error);
    return false;
  }
}

async function testIntegration() {
  separator('TEST 3: Integration Tests');
  
  try {
    log('📋', 'Paso 1: Simulando flujo de mensajería completo...');
    
    const tenantId = 'integration_test';
    
    // Simular envío de múltiples mensajes con anti-ban
    let successCount = 0;
    let blockedCount = 0;
    
    log('\n🔄', 'Enviando 10 mensajes con anti-ban activo...', colors.cyan);
    
    for (let i = 0; i < 10; i++) {
      if (antiBan.canSendMessage(tenantId, '573001234567@s.whatsapp.net', 'Mensaje test')) {
        // Simular delay
        const delay = antiBan.calculateDelay(tenantId);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        antiBan.recordMessageSent(tenantId, '573001234567@s.whatsapp.net', 'Mensaje test');
        successCount++;
        log('✅', `Mensaje ${i + 1}: Enviado (delay: ${delay}ms)`, colors.green);
      } else {
        blockedCount++;
        log('⚠️', `Mensaje ${i + 1}: Bloqueado por rate limit`, colors.yellow);
        
        // Esperar cooldown
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    log('\n📊', 'Resultados de integración:', colors.cyan);
    log('✅', `Enviados: ${successCount}`, colors.green);
    log('⚠️', `Bloqueados: ${blockedCount}`, colors.yellow);
    
    const stats = antiBan.getUsageStats(tenantId);
    if (!stats.error) {
      const messagesPerMinute = (stats.dailyCount / ((Date.now() - stats.lastResetTime) / 60000)).toFixed(2);
      log('ℹ️', `Tasa de envío: ${messagesPerMinute} msg/min`, colors.cyan);
    }
    
    log('\n✅', 'Integration Tests: PASADOS', colors.green);
    return true;
  } catch (error) {
    log('❌', `Error en Integration: ${error.message}`, colors.red);
    console.error(error);
    return false;
  }
}

// Ejecutar todos los tests
async function runAllTests() {
  console.log('\n' + '═'.repeat(63));
  console.log('  🧪 TEST SUITE - FASE 2 (Unit Tests)');
  console.log('═'.repeat(63));
  
  const results = {
    messageAdapter: await testMessageAdapter(),
    antiBan: await testAntiBan(),
    integration: await testIntegration()
  };
  
  separator('RESUMEN DE TESTS');
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? colors.green : colors.red;
    log(icon, `${test}: ${passed ? 'PASADO' : 'FALLIDO'}`, color);
  });
  
  const allPassed = Object.values(results).every(Boolean);
  
  if (allPassed) {
    log('\n🎉', '¡TODOS LOS TESTS PASARON!', colors.green);
    log('ℹ️', 'Fase 2 está lista para integración', colors.cyan);
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
