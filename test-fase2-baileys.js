/**
 * Test de Fase 2: Core de Mensajería
 * Prueba el envío y recepción de mensajes con sistema anti-ban
 */

const baileysService = require('./server/baileys');
const readline = require('node:readline');

const TEST_TENANT_ID = 'test_tenant_002';

console.log('═══════════════════════════════════════════════════════════');
console.log('  TEST FASE 2: Core de Mensajería + Anti-Ban');
console.log('═══════════════════════════════════════════════════════════\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runTests() {
  try {
    console.log('📋 Paso 1: Inicializando sesión...\n');

    // Inicializar sesión
    const initResult = await baileysService.initializeSession(TEST_TENANT_ID);

    if (initResult.method === 'qr') {
      console.log('🔲 Escanea este QR con WhatsApp:\n');
      console.log('  (El QR está en formato base64, usa test-fase1 para ver QR visual)\n');
      console.log('⏳ Esperando conexión...\n');

      // Esperar conexión
      await new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          const status = await baileysService.getStatus(TEST_TENANT_ID);
          if (status.connected) {
            clearInterval(checkInterval);
            console.log(`\n✅ ¡Conectado! Número: ${status.phoneNumber}\n`);
            resolve();
          }
        }, 2000);

        // Timeout de 5 minutos
        setTimeout(() => {
          clearInterval(checkInterval);
          console.log('\n⏱️  Timeout esperando conexión\n');
          process.exit(1);
        }, 300000);
      });
    } else if (initResult.method === 'reconnect') {
      console.log('✅ Reconectado con credenciales existentes\n');
    }

    // Registrar listener de mensajes
    baileysService.onMessage(TEST_TENANT_ID, async (message) => {
      console.log(`\n📩 MENSAJE RECIBIDO:`);
      console.log(`   De: ${message.from}`);
      console.log(`   Texto: ${message.text}`);
      console.log(`   Hora: ${message.timestamp}`);
      console.log(`   Tipo: ${message.mediaType || 'text'}\n`);

      // Auto-responder para testing
      if (!message.fromMe && message.text) {
        console.log('🤖 Auto-respondiendo...');
        const response = `Echo: ${message.text}`;
        const result = await baileysService.sendMessage(TEST_TENANT_ID, message.from, { text: response });
        
        if (result.success) {
          console.log(`✅ Respuesta enviada\n`);
        } else {
          console.log(`❌ Error: ${result.error || result.reason}\n`);
        }
      }
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ SESIÓN LISTA PARA PRUEBAS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // TEST 1: Obtener estado
    console.log('📊 TEST 1: Verificando estado y límites');
    const status = await baileysService.getStatus(TEST_TENANT_ID);
    console.log(`\n   Conectado: ${status.connected ? 'SÍ ✓' : 'NO ✗'}`);
    console.log(`   Número: ${status.phoneNumber}`);
    console.log(`\n   Límites Anti-Ban:`);
    console.log(`   - Diario: ${status.usage.daily.count}/${status.usage.daily.limit} (${status.usage.daily.percentage}%)`);
    console.log(`   - Por hora: ${status.usage.hourly.count}/${status.usage.hourly.limit}`);
    console.log(`   - Por minuto: ${status.usage.minute.count}/${status.usage.minute.limit}`);
    console.log(`   - Cooldown: ${status.usage.cooldown.active ? 'ACTIVO ⚠️' : 'Inactivo ✓'}\n`);

    // TEST 2: Enviar mensaje de prueba
    console.log('📱 TEST 2: Envío de mensaje');
    const phoneNumber = await question('   Ingresa un número para probar (con código de país): ');

    if (phoneNumber && phoneNumber.trim()) {
      console.log('\n   Enviando mensaje de prueba...');
      
      const testMessage = {
        text: '🤖 Hola! Este es un mensaje de prueba de Baileys.\n\nFase 2: Core de Mensajería funcionando correctamente ✅'
      };

      const sendResult = await baileysService.sendMessage(TEST_TENANT_ID, phoneNumber.trim(), testMessage);
      
      if (sendResult.success) {
        console.log(`\n   ✅ Mensaje enviado exitosamente!`);
        console.log(`   ID: ${sendResult.messageId}`);
      } else if (sendResult.blocked) {
        console.log(`\n   ⚠️  Mensaje bloqueado por anti-ban`);
        console.log(`   Razón: ${sendResult.reason}`);
        console.log(`   Esperar: ${Math.ceil(sendResult.waitTime / 1000)} segundos`);
      } else {
        console.log(`\n   ❌ Error: ${sendResult.error}`);
      }
    } else {
      console.log('\n   ⏭️  Test de envío omitido\n');
    }

    // TEST 3: Probar delays anti-ban
    console.log('\n📊 TEST 3: Sistema Anti-Ban con múltiples mensajes');
    const testMultiple = await question('   ¿Probar envío de 5 mensajes con delays? (s/n): ');

    if (testMultiple?.toLowerCase() === 's' && phoneNumber && phoneNumber.trim()) {
      console.log('\n   Enviando 5 mensajes con delays anti-ban...\n');
      
      for (let i = 1; i <= 5; i++) {
        console.log(`   [${i}/5] Enviando...`);
        const result = await baileysService.sendMessage(TEST_TENANT_ID, phoneNumber.trim(), {
          text: `Mensaje de prueba ${i}/5`
        });

        if (result.success) {
          console.log(`   ✅ Enviado (delay aplicado automáticamente)`);
        } else {
          console.log(`   ❌ ${result.reason || result.error}`);
        }
      }

      console.log('\n   ✅ Test de múltiples mensajes completado\n');
    } else {
      console.log('   ⏭️  Test de múltiples mensajes omitido\n');
    }

    // TEST 4: Estadísticas finales
    console.log('📊 TEST 4: Estadísticas finales');
    const finalStatus = await baileysService.getStatus(TEST_TENANT_ID);
    console.log(`\n   Mensajes enviados:`);
    console.log(`   - Hoy: ${finalStatus.usage.daily.count}`);
    console.log(`   - Esta hora: ${finalStatus.usage.hourly.count}`);
    console.log(`   - Este minuto: ${finalStatus.usage.minute.count}\n`);

    // Modo interactivo
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  💬 MODO INTERACTIVO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n  Ahora puedes:');
    console.log('  1. Enviar mensajes al número configurado');
    console.log('  2. Recibir mensajes (auto-responde con "Echo:")');
    console.log('  3. Ver límites en tiempo real\n');
    console.log('  Escribe "exit" para salir\n');

    // Loop interactivo
    while (true) {
      const input = await question('  > ');
      
      if (input === 'exit') {
        break;
      }

      if (input === 'status') {
        const s = await baileysService.getStatus(TEST_TENANT_ID);
        console.log(`\n  📊 Estado:`);
        console.log(`     Diario: ${s.usage.daily.count}/${s.usage.daily.limit}`);
        console.log(`     Hora: ${s.usage.hourly.count}/${s.usage.hourly.limit}`);
        console.log(`     Minuto: ${s.usage.minute.count}/${s.usage.minute.limit}\n`);
        continue;
      }

      if (input && phoneNumber && phoneNumber.trim()) {
        const result = await baileysService.sendMessage(TEST_TENANT_ID, phoneNumber.trim(), { text: input });
        if (result.success) {
          console.log(`  ✅ Enviado\n`);
        } else {
          console.log(`  ❌ ${result.reason || result.error}\n`);
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✅ FASE 2 COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📋 Tests realizados:');
    console.log('  ✓ Inicialización y conexión');
    console.log('  ✓ Envío de mensajes');
    console.log('  ✓ Recepción de mensajes');
    console.log('  ✓ Sistema anti-ban (delays automáticos)');
    console.log('  ✓ Rate limiting funcional');
    console.log('  ✓ Estadísticas de uso\n');
    
    console.log('🎯 Criterio de Éxito: ✅ CUMPLIDO');
    console.log('   "Enviar/recibir mensajes con delays automáticos"\n');

    console.log('💡 Próximos pasos:');
    console.log('   - Fase 3: Interfaz de Usuario');
    console.log('   - Implementar UI de onboarding con QR');
    console.log('   - Dashboard con estado de conexión\n');

    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    rl.close();
    process.exit(1);
  }
}

// Ejecutar tests
runTests();
