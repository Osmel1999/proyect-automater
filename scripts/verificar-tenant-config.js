/**
 * Script para verificar el tenant ID y la configuración de pagos
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

async function verificarTenantConfig() {
  console.log('\n🔍 VERIFICANDO TENANT Y CONFIGURACIÓN DE PAGOS\n');
  console.log('='.repeat(60));

  try {
    // 1. Listar todos los tenants
    console.log('\n1️⃣ TENANTS DISPONIBLES:');
    console.log('-'.repeat(60));
    const tenantsSnapshot = await db.ref('tenants').once('value');
    const tenants = tenantsSnapshot.val() || {};
    
    if (Object.keys(tenants).length === 0) {
      console.log('⚠️  NO HAY TENANTS CONFIGURADOS');
    } else {
      for (const [tenantId, tenantData] of Object.entries(tenants)) {
        console.log(`\n🏪 Tenant ID: ${tenantId}`);
        console.log(`   Nombre: ${tenantData.name || 'N/A'}`);
        console.log(`   Slug: ${tenantData.slug || 'N/A'}`);
        
        // Verificar si tiene configuración de pagos
        const paymentConfigSnapshot = await db.ref(`tenants/${tenantId}/paymentConfig`).once('value');
        const paymentConfig = paymentConfigSnapshot.val();
        
        if (paymentConfig) {
          console.log(`   ✅ Tiene configuración de pagos:`);
          console.log(`      - Habilitado: ${paymentConfig.enabled ? '✅ SÍ' : '❌ NO'}`);
          console.log(`      - Gateway: ${paymentConfig.gateway || 'N/A'}`);
          console.log(`      - Credenciales: ${paymentConfig.credentials ? '✅ Encriptadas' : '❌ NO'}`);
        } else {
          console.log(`   ❌ NO tiene configuración de pagos`);
        }
        
        // Verificar pedidos recientes
        const pedidosSnapshot = await db.ref(`tenants/${tenantId}/pedidos`)
          .orderByChild('timestamp')
          .limitToLast(5)
          .once('value');
        const pedidos = pedidosSnapshot.val() || {};
        console.log(`   📦 Pedidos recientes: ${Object.keys(pedidos).length}`);
      }
    }

    // 2. Verificar configuración en la raíz (antigua ubicación)
    console.log('\n\n2️⃣ CONFIGURACIÓN EN RAÍZ (paymentConfig):');
    console.log('-'.repeat(60));
    const rootPaymentConfigSnapshot = await db.ref('paymentConfig').once('value');
    const rootPaymentConfig = rootPaymentConfigSnapshot.val();
    
    if (rootPaymentConfig) {
      console.log('⚠️  HAY CONFIGURACIÓN EN LA RAÍZ (ubicación antigua):');
      console.log(JSON.stringify(rootPaymentConfig, null, 2));
      console.log('\n💡 Esta configuración debería moverse a tenants/<tenantId>/paymentConfig');
    } else {
      console.log('✅ No hay configuración en la raíz (correcto)');
    }

    // 3. Verificar configuración en payment_configs (otra ubicación posible)
    console.log('\n\n3️⃣ CONFIGURACIÓN EN payment_configs:');
    console.log('-'.repeat(60));
    const paymentConfigsSnapshot = await db.ref('payment_configs').once('value');
    const paymentConfigs = paymentConfigsSnapshot.val();
    
    if (paymentConfigs) {
      console.log('⚠️  HAY CONFIGURACIÓN EN payment_configs:');
      for (const [key, config] of Object.entries(paymentConfigs)) {
        console.log(`\nKey: ${key}`);
        console.log(`   Habilitado: ${config.enabled ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   Gateway: ${config.gateway || 'N/A'}`);
      }
      console.log('\n💡 Esta configuración debería moverse a tenants/<tenantId>/paymentConfig');
    } else {
      console.log('✅ No hay configuración en payment_configs');
    }

    // 4. RECOMENDACIONES
    console.log('\n\n4️⃣ RECOMENDACIONES:');
    console.log('='.repeat(60));
    
    const tenantsConConfig = Object.keys(tenants).filter(async (tenantId) => {
      const snapshot = await db.ref(`tenants/${tenantId}/paymentConfig`).once('value');
      return snapshot.exists();
    });
    
    if (Object.keys(tenants).length > 0 && tenantsConConfig.length === 0) {
      console.log('\n❌ PROBLEMA: Hay tenants pero ninguno tiene configuración de pagos');
      console.log('   Acción requerida:');
      console.log('   1. Ir al dashboard');
      console.log('   2. Hacer clic en "Configurar Pagos"');
      console.log('   3. Ingresar las credenciales de Wompi');
      console.log('   4. Activar los pagos en línea');
    }
    
    if (rootPaymentConfig || paymentConfigs) {
      console.log('\n⚠️  ADVERTENCIA: Hay configuraciones en ubicaciones antiguas');
      console.log('   Necesitas migrar la configuración a la nueva estructura:');
      console.log('   De: paymentConfig/ o payment_configs/');
      console.log('   A: tenants/<tenantId>/paymentConfig/');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

verificarTenantConfig();
