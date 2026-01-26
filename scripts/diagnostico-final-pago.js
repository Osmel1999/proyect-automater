/**
 * Script para diagnosticar el problema específico del enlace de pago
 * Muestra las sesiones, sus tenantIds y verifica si tienen configuración de pagos
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Inicializar Firebase
if (!admin.apps.length) {
  try {
    let serviceAccount;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8')
      );
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = path.resolve(__dirname, '..', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      if (fs.existsSync(credPath)) {
        serviceAccount = require(credPath);
      }
    } else {
      const defaultPath = path.resolve(__dirname, '..', 'server', 'firebase-service-account.json');
      if (fs.existsSync(defaultPath)) {
        serviceAccount = require(defaultPath);
      }
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://automater-kds-default-rtdb.firebaseio.com'
    });
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.database();
const encryptionService = require('../server/payments/encryption-service');

async function diagnosticarProblema() {
  console.log('\n🔍 DIAGNÓSTICO DEL PROBLEMA DE ENLACE DE PAGO\n');
  console.log('='.repeat(70));

  try {
    // 1. Ver todas las sesiones
    console.log('\n1️⃣ SESIONES ACTIVAS EN BOT:');
    console.log('-'.repeat(70));
    const sessionsSnapshot = await db.ref('sessions').once('value');
    const sessions = sessionsSnapshot.val() || {};
    
    if (Object.keys(sessions).length === 0) {
      console.log('⚠️  NO HAY SESIONES ACTIVAS EN EL BOT');
      console.log('   Esto significa que nadie está interactuando con el bot actualmente.');
    } else {
      for (const [phone, sessionData] of Object.entries(sessions)) {
        console.log(`\n📱 Teléfono: ${phone}`);
        console.log(`   Tenant ID: ${sessionData.tenantId || '❌ NO ASIGNADO'}`);
        console.log(`   Restaurante: ${sessionData.restaurantName || 'N/A'}`);
        console.log(`   Estado: ${sessionData.state || 'N/A'}`);
        console.log(`   Método de pago: ${sessionData.metodoPago || 'N/A'}`);
        
        // Verificar si este tenant tiene configuración de pagos
        if (sessionData.tenantId) {
          const configSnapshot = await db.ref(`tenants/${sessionData.tenantId}/paymentConfig`).once('value');
          const config = configSnapshot.val();
          
          if (config) {
            console.log(`   💳 Configuración de pagos:`);
            console.log(`      - Habilitado: ${config.enabled ? '✅ SÍ' : '❌ NO'}`);
            console.log(`      - Gateway: ${config.gateway || 'N/A'}`);
            
            if (config.credentials) {
              try {
                const decrypted = encryptionService.decryptCredentials(config.credentials);
                console.log(`      - Credenciales:`);
                console.log(`         * Public Key: ${decrypted.publicKey ? '✅' : '❌'}`);
                console.log(`         * Private Key: ${decrypted.privateKey ? '✅' : '❌'}`);
                console.log(`         * Events Secret: ${decrypted.eventsSecret ? '✅' : '❌'}`);
              } catch (error) {
                console.log(`      - ❌ Error desencriptando credenciales: ${error.message}`);
              }
            }
          } else {
            console.log(`   ❌ NO tiene configuración de pagos`);
            console.log(`      PROBLEMA: El bot no podrá generar enlaces de pago`);
          }
        }
      }
    }

    // 2. Ver pedidos recientes de TODOS los tenants
    console.log('\n\n2️⃣ PEDIDOS RECIENTES (todas las ubicaciones):');
    console.log('-'.repeat(70));
    
    const tenantsSnapshot = await db.ref('tenants').once('value');
    const tenants = tenantsSnapshot.val() || {};
    
    let pedidosEncontrados = 0;
    const ahora = Date.now();
    const hace24Horas = ahora - (24 * 60 * 60 * 1000);
    
    for (const [tenantId, tenantData] of Object.entries(tenants)) {
      // Filtrar los IDs especiales que no son tenants reales
      if (tenantId.startsWith('_')) continue;
      
      const pedidosSnapshot = await db.ref(`tenants/${tenantId}/pedidos`).once('value');
      const pedidos = pedidosSnapshot.val() || {};
      
      const pedidosRecientes = Object.entries(pedidos)
        .filter(([_, p]) => p.timestamp && p.timestamp > hace24Horas)
        .sort(([_, a], [__, b]) => b.timestamp - a.timestamp);
      
      if (pedidosRecientes.length > 0) {
        console.log(`\n🏪 Tenant: ${tenantId}`);
        console.log(`   Nombre: ${tenantData.name || 'N/A'}`);
        
        for (const [pedidoKey, pedido] of pedidosRecientes.slice(0, 3)) {
          pedidosEncontrados++;
          const fecha = new Date(pedido.timestamp);
          console.log(`\n   📦 Pedido: ${pedidoKey}`);
          console.log(`      Número: #${pedido.numeroHex || 'N/A'}`);
          console.log(`      Total: $${pedido.total?.toLocaleString('es-CO') || 'N/A'}`);
          console.log(`      Cliente: ${pedido.cliente?.telefono || 'N/A'}`);
          console.log(`      Método pago: ${pedido.metodoPago || 'N/A'}`);
          console.log(`      Estado: ${pedido.estado || 'N/A'}`);
          console.log(`      Fecha: ${fecha.toLocaleString('es-CO')}`);
          
          if (pedido.paymentError) {
            console.log(`      ❌ Error de pago: ${pedido.paymentError}`);
          }
        }
      }
    }
    
    if (pedidosEncontrados === 0) {
      console.log('⚠️  NO HAY PEDIDOS RECIENTES EN NINGÚN TENANT');
    }

    // 3. ANÁLISIS DEL PROBLEMA
    console.log('\n\n3️⃣ ANÁLISIS DEL PROBLEMA:');
    console.log('='.repeat(70));
    
    // Contar tenants con/sin configuración
    const tenantsReales = Object.entries(tenants).filter(([id]) => !id.startsWith('_'));
    const tenantsConConfig = [];
    const tenantsSinConfig = [];
    
    for (const [tenantId] of tenantsReales) {
      const configSnapshot = await db.ref(`tenants/${tenantId}/paymentConfig`).once('value');
      if (configSnapshot.exists()) {
        const config = configSnapshot.val();
        if (config.enabled) {
          tenantsConConfig.push(tenantId);
        }
      } else {
        tenantsSinConfig.push(tenantId);
      }
    }
    
    console.log(`\n📊 Estadísticas:`);
    console.log(`   Total de tenants: ${tenantsReales.length}`);
    console.log(`   Con pagos habilitados: ${tenantsConConfig.length}`);
    console.log(`   Sin configuración: ${tenantsSinConfig.length}`);
    console.log(`   Sesiones activas: ${Object.keys(sessions).length}`);
    
    // 4. DIAGNÓSTICO ESPECÍFICO
    console.log('\n\n4️⃣ DIAGNÓSTICO:');
    console.log('='.repeat(70));
    
    if (Object.keys(sessions).length === 0) {
      console.log('\n⚠️  NO HAY SESIONES ACTIVAS');
      console.log('   Esto es normal si nadie está usando el bot ahora.');
      console.log('   Los pedidos antiguos se guardaron pero las sesiones expiraron.');
    } else {
      // Verificar cada sesión
      for (const [phone, sessionData] of Object.entries(sessions)) {
        if (!sessionData.tenantId) {
          console.log(`\n❌ PROBLEMA EN SESIÓN ${phone}:`);
          console.log(`   La sesión NO tiene tenantId asignado`);
          console.log(`   Solución: Verificar que el bot asigne el tenantId al inicio`);
        } else {
          const configSnapshot = await db.ref(`tenants/${sessionData.tenantId}/paymentConfig`).once('value');
          if (!configSnapshot.exists() || !configSnapshot.val().enabled) {
            console.log(`\n❌ PROBLEMA EN SESIÓN ${phone}:`);
            console.log(`   Tenant ${sessionData.tenantId} NO tiene pagos configurados/habilitados`);
            console.log(`   Solución: Configurar pagos en el dashboard para este restaurante`);
          }
        }
      }
    }
    
    // 5. SOLUCIÓN
    console.log('\n\n5️⃣ SOLUCIÓN RECOMENDADA:');
    console.log('='.repeat(70));
    console.log('\n📝 Para que funcionen los enlaces de pago:');
    console.log('   1. Identificar el tenant ID del restaurante que está probando');
    console.log('   2. Ir al dashboard: https://kdsapp.site/dashboard.html');
    console.log('   3. Hacer clic en "Configurar Pagos"');
    console.log('   4. Ingresar las credenciales de Wompi (sandbox):');
    console.log('      - Public Key: pub_test_...');
    console.log('      - Private Key: prv_test_...');
    console.log('      - Events Secret: ...');
    console.log('   5. Activar el toggle "Habilitar pagos en línea"');
    console.log('   6. Hacer clic en "Guardar Configuración"');
    console.log('\n✅ Una vez configurado, los pedidos con método "tarjeta" generarán enlace');

    console.log('\n' + '='.repeat(70));
    console.log('✅ Diagnóstico completado\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

diagnosticarProblema();
