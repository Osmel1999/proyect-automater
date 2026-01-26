/**
 * Script de Diagnóstico Detallado de Pagos
 * Identifica por qué no se genera el enlace de pago
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Inicializar Firebase (igual que en firebase-service.js)
if (!admin.apps.length) {
  try {
    let serviceAccount;
    
    // Opción 1: Usar Service Account Key en Base64 (Railway/producción)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8')
      );
      console.log('✅ Usando credenciales Firebase desde Base64');
    // Opción 2: Usar archivo local (desarrollo)
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = path.resolve(__dirname, '..', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      if (fs.existsSync(credPath)) {
        serviceAccount = require(credPath);
        console.log('✅ Usando credenciales Firebase desde archivo local');
      }
    } else {
      const defaultPath = path.resolve(__dirname, '..', 'server', 'firebase-service-account.json');
      if (fs.existsSync(defaultPath)) {
        serviceAccount = require(defaultPath);
        console.log('✅ Usando credenciales Firebase desde ruta por defecto');
      }
    }
    
    if (!serviceAccount) {
      throw new Error('No se encontraron credenciales de Firebase');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://automater-kds-default-rtdb.firebaseio.com'
    });
    
    console.log('✅ Firebase inicializado correctamente\n');
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.database();

async function diagnosticar() {
  console.log('\n🔍 DIAGNÓSTICO DETALLADO DE PAGOS\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar sesiones activas
    console.log('\n1️⃣ SESIONES ACTIVAS:');
    console.log('-'.repeat(60));
    const sessionsSnapshot = await db.ref('sessions').once('value');
    const sessions = sessionsSnapshot.val() || {};
    
    console.log(`Total de sesiones: ${Object.keys(sessions).length}`);
    
    for (const [phone, sessionData] of Object.entries(sessions)) {
      console.log(`\n📱 Teléfono: ${phone}`);
      console.log(`   Tenant ID: ${sessionData.tenantId || '❌ NO CONFIGURADO'}`);
      console.log(`   Restaurante: ${sessionData.restaurantName || 'N/A'}`);
      console.log(`   Estado: ${sessionData.state || 'N/A'}`);
    }

    // 2. Verificar configuraciones de pago
    console.log('\n\n2️⃣ CONFIGURACIONES DE PAGO:');
    console.log('-'.repeat(60));
    const configsSnapshot = await db.ref('payment_configs').once('value');
    const configs = configsSnapshot.val() || {};
    
    console.log(`Total de configuraciones: ${Object.keys(configs).length}`);
    
    if (Object.keys(configs).length === 0) {
      console.log('⚠️  NO HAY CONFIGURACIONES DE PAGO GUARDADAS');
    } else {
      for (const [tenantId, config] of Object.entries(configs)) {
        console.log(`\n🏪 Tenant ID: ${tenantId}`);
        console.log(`   Habilitado: ${config.enabled ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   Gateway: ${config.gateway || 'N/A'}`);
        console.log(`   Tiene credenciales: ${config.credentials ? '✅ SÍ' : '❌ NO'}`);
        
        if (config.credentials) {
          const credKeys = Object.keys(config.credentials);
          console.log(`   Claves de credenciales: ${credKeys.join(', ')}`);
        }
      }
    }

    // 3. Verificar pedidos recientes
    console.log('\n\n3️⃣ PEDIDOS RECIENTES (últimas 24 horas):');
    console.log('-'.repeat(60));
    const ordersSnapshot = await db.ref('orders').once('value');
    const orders = ordersSnapshot.val() || {};
    
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const recentOrders = Object.entries(orders)
      .filter(([_, order]) => order.timestamp > oneDayAgo)
      .sort(([_, a], [__, b]) => b.timestamp - a.timestamp);
    
    console.log(`Total de pedidos recientes: ${recentOrders.length}`);
    
    for (const [orderId, order] of recentOrders.slice(0, 5)) {
      const date = new Date(order.timestamp);
      console.log(`\n📦 Pedido: ${orderId}`);
      console.log(`   Restaurante ID: ${order.restaurantId || '❌ NO CONFIGURADO'}`);
      console.log(`   Cliente: ${order.customer?.phone || 'N/A'}`);
      console.log(`   Total: $${order.total?.toLocaleString('es-CO') || 'N/A'}`);
      console.log(`   Método de pago: ${order.paymentMethod || 'N/A'}`);
      console.log(`   Estado de pago: ${order.paymentStatus || 'N/A'}`);
      console.log(`   Fecha: ${date.toLocaleString('es-CO')}`);
    }

    // 4. Buscar el pedido específico #6FB4C6
    console.log('\n\n4️⃣ BUSCANDO PEDIDO #6FB4C6:');
    console.log('-'.repeat(60));
    
    const targetOrder = Object.entries(orders).find(([id, _]) => id.includes('6FB4C6'));
    
    if (targetOrder) {
      const [orderId, orderData] = targetOrder;
      console.log('✅ Pedido encontrado!');
      console.log(JSON.stringify(orderData, null, 2));
    } else {
      console.log('❌ Pedido #6FB4C6 no encontrado en Firebase');
    }

    // 5. Verificar transacciones de pago
    console.log('\n\n5️⃣ TRANSACCIONES DE PAGO:');
    console.log('-'.repeat(60));
    const transactionsSnapshot = await db.ref('transactions').once('value');
    const transactions = transactionsSnapshot.val() || {};
    
    console.log(`Total de transacciones: ${Object.keys(transactions).length}`);
    
    if (Object.keys(transactions).length === 0) {
      console.log('⚠️  NO HAY TRANSACCIONES REGISTRADAS');
    } else {
      const recentTransactions = Object.entries(transactions)
        .filter(([_, tx]) => tx.createdAt > oneDayAgo)
        .sort(([_, a], [__, b]) => b.createdAt - a.createdAt);
      
      console.log(`Transacciones recientes: ${recentTransactions.length}`);
      
      for (const [txId, tx] of recentTransactions.slice(0, 5)) {
        const date = new Date(tx.createdAt);
        console.log(`\n💳 TX: ${txId}`);
        console.log(`   Pedido: ${tx.orderId}`);
        console.log(`   Estado: ${tx.status}`);
        console.log(`   Gateway: ${tx.gateway}`);
        console.log(`   Monto: $${tx.amount?.toLocaleString('es-CO') || 'N/A'}`);
        console.log(`   Fecha: ${date.toLocaleString('es-CO')}`);
      }
    }

    // 6. ANÁLISIS Y RECOMENDACIONES
    console.log('\n\n6️⃣ ANÁLISIS Y RECOMENDACIONES:');
    console.log('='.repeat(60));
    
    // Verificar si hay sesiones sin tenantId
    const sessionsSinTenant = Object.entries(sessions).filter(([_, s]) => !s.tenantId);
    if (sessionsSinTenant.length > 0) {
      console.log('\n⚠️  PROBLEMA: Sesiones sin tenantId configurado');
      console.log(`   Afecta a ${sessionsSinTenant.length} sesión(es)`);
      console.log('   Solución: Verificar que el bot asigne tenantId al crear la sesión');
    }
    
    // Verificar si hay configuraciones deshabilitadas
    const configsDeshabilitadas = Object.entries(configs).filter(([_, c]) => !c.enabled);
    if (configsDeshabilitadas.length > 0) {
      console.log('\n⚠️  AVISO: Configuraciones de pago deshabilitadas');
      console.log(`   Total: ${configsDeshabilitadas.length}`);
      for (const [tenantId, _] of configsDeshabilitadas) {
        console.log(`   - Tenant: ${tenantId}`);
      }
    }
    
    // Verificar si falta configuración para algún tenant activo
    const tenantsActivos = new Set(Object.values(sessions).map(s => s.tenantId).filter(Boolean));
    const tenantsConConfig = new Set(Object.keys(configs));
    const tenantsSinConfig = [...tenantsActivos].filter(t => !tenantsConConfig.has(t));
    
    if (tenantsSinConfig.length > 0) {
      console.log('\n❌ PROBLEMA CRÍTICO: Tenants activos sin configuración de pago');
      console.log(`   Total: ${tenantsSinConfig.length}`);
      for (const tenantId of tenantsSinConfig) {
        console.log(`   - Tenant: ${tenantId}`);
        const sessionsConEsteTenant = Object.entries(sessions)
          .filter(([_, s]) => s.tenantId === tenantId)
          .map(([phone, _]) => phone);
        console.log(`     Sesiones afectadas: ${sessionsConEsteTenant.join(', ')}`);
      }
      console.log('\n   Solución: Configurar pagos en el dashboard para estos restaurantes');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnóstico completado\n');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar diagnóstico
diagnosticar();
