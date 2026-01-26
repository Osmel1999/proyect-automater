/**
 * Script para buscar el pedido #6FB4C6 en TODAS las ubicaciones de Firebase
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

async function buscarPedido() {
  console.log('\n🔍 BUSCANDO PEDIDO #6FB4C6 EN TODA LA BASE DE DATOS\n');
  console.log('='.repeat(70));

  try {
    const searchTerm = '6FB4C6';
    let encontrado = false;

    // 1. Buscar en /pedidos (raíz)
    console.log('\n1️⃣ Buscando en /pedidos (raíz)...');
    const pedidosRootSnapshot = await db.ref('pedidos').once('value');
    const pedidosRoot = pedidosRootSnapshot.val() || {};
    
    for (const [key, pedido] of Object.entries(pedidosRoot)) {
      if (key.includes(searchTerm) || pedido.numeroHex?.includes(searchTerm)) {
        console.log(`✅ ENCONTRADO en /pedidos/${key}`);
        console.log(JSON.stringify(pedido, null, 2));
        encontrado = true;
      }
    }
    
    if (!encontrado) {
      console.log(`   ❌ No encontrado en /pedidos (total: ${Object.keys(pedidosRoot).length} pedidos)`);
    }

    // 2. Buscar en /orders (raíz)
    console.log('\n2️⃣ Buscando en /orders (raíz)...');
    const ordersRootSnapshot = await db.ref('orders').once('value');
    const ordersRoot = ordersRootSnapshot.val() || {};
    
    for (const [key, order] of Object.entries(ordersRoot)) {
      if (key.includes(searchTerm) || order.numeroHex?.includes(searchTerm) || order.orderNumber?.includes(searchTerm)) {
        console.log(`✅ ENCONTRADO en /orders/${key}`);
        console.log(JSON.stringify(order, null, 2));
        encontrado = true;
      }
    }
    
    if (!encontrado) {
      console.log(`   ❌ No encontrado en /orders (total: ${Object.keys(ordersRoot).length} orders)`);
    }

    // 3. Buscar en tenants/*/pedidos
    console.log('\n3️⃣ Buscando en /tenants/*/pedidos...');
    const tenantsSnapshot = await db.ref('tenants').once('value');
    const tenants = tenantsSnapshot.val() || {};
    
    for (const [tenantId, tenantData] of Object.entries(tenants)) {
      if (tenantId.startsWith('_')) continue; // Saltar metadatos
      
      const pedidosTenantSnapshot = await db.ref(`tenants/${tenantId}/pedidos`).once('value');
      const pedidosTenant = pedidosTenantSnapshot.val() || {};
      
      for (const [key, pedido] of Object.entries(pedidosTenant)) {
        if (key.includes(searchTerm) || pedido.numeroHex?.includes(searchTerm)) {
          console.log(`✅ ENCONTRADO en /tenants/${tenantId}/pedidos/${key}`);
          console.log(`   Tenant: ${tenantData.name || tenantId}`);
          console.log(JSON.stringify(pedido, null, 2));
          encontrado = true;
          
          // Verificar configuración de pagos de este tenant
          const configSnapshot = await db.ref(`tenants/${tenantId}/paymentConfig`).once('value');
          const config = configSnapshot.val();
          
          console.log(`\n   💳 Configuración de pagos de este tenant:`);
          if (config) {
            console.log(`      - Habilitado: ${config.enabled ? '✅ SÍ' : '❌ NO'}`);
            console.log(`      - Gateway: ${config.gateway || 'N/A'}`);
            console.log(`      - Credenciales: ${config.credentials ? '✅ Encriptadas' : '❌ NO'}`);
          } else {
            console.log(`      ❌ NO tiene configuración de pagos`);
            console.log(`      ESTE ES EL PROBLEMA: Por eso no se generó el enlace de pago`);
          }
        }
      }
    }

    // 4. Mostrar TODOS los pedidos recientes si no encontramos el específico
    if (!encontrado) {
      console.log('\n4️⃣ Pedido específico no encontrado. Mostrando TODOS los pedidos recientes:');
      console.log('-'.repeat(70));
      
      const ahora = Date.now();
      const hace48Horas = ahora - (48 * 60 * 60 * 1000);
      
      // En raíz
      const pedidosRecientesRoot = Object.entries(pedidosRoot)
        .filter(([_, p]) => p.timestamp && p.timestamp > hace48Horas)
        .sort(([_, a], [__, b]) => b.timestamp - a.timestamp);
      
      if (pedidosRecientesRoot.length > 0) {
        console.log('\n📦 Pedidos en /pedidos (raíz):');
        for (const [key, pedido] of pedidosRecientesRoot.slice(0, 5)) {
          const fecha = new Date(pedido.timestamp);
          console.log(`   - ${key} | #${pedido.numeroHex || 'N/A'} | $${pedido.total} | ${fecha.toLocaleString('es-CO')}`);
        }
      }
      
      // En tenants
      for (const [tenantId, tenantData] of Object.entries(tenants)) {
        if (tenantId.startsWith('_')) continue;
        
        const pedidosTenantSnapshot = await db.ref(`tenants/${tenantId}/pedidos`).once('value');
        const pedidosTenant = pedidosTenantSnapshot.val() || {};
        
        const pedidosRecientesTenant = Object.entries(pedidosTenant)
          .filter(([_, p]) => p.timestamp && p.timestamp > hace48Horas)
          .sort(([_, a], [__, b]) => b.timestamp - a.timestamp);
        
        if (pedidosRecientesTenant.length > 0) {
          console.log(`\n📦 Pedidos en /tenants/${tenantId}/pedidos:`);
          console.log(`   Tenant: ${tenantData.name || tenantId}`);
          for (const [key, pedido] of pedidosRecientesTenant.slice(0, 5)) {
            const fecha = new Date(pedido.timestamp);
            console.log(`   - ${key} | #${pedido.numeroHex || 'N/A'} | $${pedido.total} | ${fecha.toLocaleString('es-CO')}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    if (encontrado) {
      console.log('✅ Pedido encontrado - Ver arriba para detalles\n');
    } else {
      console.log('❌ Pedido #6FB4C6 NO encontrado en ninguna ubicación');
      console.log('   Posibles razones:');
      console.log('   1. El pedido es muy antiguo y fue eliminado');
      console.log('   2. Estás conectado a una base de datos diferente');
      console.log('   3. El número de pedido es incorrecto\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

buscarPedido();
