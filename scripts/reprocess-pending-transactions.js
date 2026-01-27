#!/usr/bin/env node

/**
 * Script para reprocesar transacciones PENDING
 * 
 * Este script:
 * 1. Busca todas las transacciones en estado PENDING
 * 2. Consulta su estado real en Wompi API
 * 3. Actualiza las que fueron aprobadas/rechazadas
 * 4. Crea los pedidos en KDS para las aprobadas
 * 5. Notifica a los clientes
 * 
 * Uso:
 *   node scripts/reprocess-pending-transactions.js
 *   node scripts/reprocess-pending-transactions.js --dry-run  (solo mostrar, no actualizar)
 *   node scripts/reprocess-pending-transactions.js --transactionId=test_PGXmmR  (procesar una específica)
 */

const admin = require('firebase-admin');
const axios = require('axios');

// Inicializar Firebase
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://kds-app-7f1d3-default-rtdb.firebaseio.com'
    });
    console.log('✅ Firebase inicializado\n');
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.database();

// Parsear argumentos
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const specificTransaction = args.find(arg => arg.startsWith('--transactionId='))?.split('=')[1];

console.log('🔄 SCRIPT DE REPROCESAMIENTO DE TRANSACCIONES PENDING\n');
console.log(`Modo: ${dryRun ? '🔍 DRY RUN (solo consulta)' : '✏️  ACTUALIZACIÓN'}`);
if (specificTransaction) {
  console.log(`Transacción específica: ${specificTransaction}`);
}
console.log('\n' + '='.repeat(70) + '\n');

/**
 * Consulta el estado de una transacción en Wompi
 */
async function consultarEstadoWompi(transactionId, mode = 'sandbox') {
  try {
    const baseUrl = mode === 'production'
      ? 'https://production.wompi.co'
      : 'https://sandbox.wompi.co';
    
    // Para consultar transacciones, se puede usar la public key
    // Si tienes la private key, usa Authorization: Bearer {privateKey}
    const publicKey = process.env.WOMPI_PUBLIC_KEY || 'pub_test_G6gqMd1bK5f4TRbsK8IJYiW3FNfuGfCL';
    
    const response = await axios.get(
      `${baseUrl}/v1/transactions/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${publicKey}`
        }
      }
    );

    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // Transacción no existe en Wompi
    }
    throw error;
  }
}

/**
 * Actualiza una transacción en Firebase
 */
async function actualizarTransaccion(transactionId, updates) {
  await db.ref(`transactions/${transactionId}`).update({
    ...updates,
    updatedAt: Date.now(),
    reprocessedAt: Date.now()
  });
}

/**
 * Crea un pedido en el KDS del restaurante
 */
async function crearPedidoEnKDS(transaction) {
  try {
    // Obtener datos del pedido temporal
    const orderSnapshot = await db.ref(`orders/${transaction.orderId}`).once('value');
    const orderData = orderSnapshot.val();
    
    if (!orderData) {
      console.log('  ⚠️  No se encontró el pedido temporal en /orders/');
      return false;
    }

    // Crear pedido en el KDS del restaurante
    const kdsOrderRef = db.ref(`restaurantes/${transaction.restaurantId}/pedidos/${transaction.orderId}`);
    
    await kdsOrderRef.set({
      ...orderData,
      estado: 'nuevo',
      paymentStatus: 'PAID',
      createdAt: Date.now(),
      source: 'reprocessed_payment'
    });

    // Actualizar el pedido temporal
    await db.ref(`orders/${transaction.orderId}`).update({
      estado: 'confirmed',
      paymentStatus: 'PAID'
    });

    console.log('  ✅ Pedido creado en KDS del restaurante');
    return true;
  } catch (error) {
    console.error('  ❌ Error creando pedido en KDS:', error.message);
    return false;
  }
}

/**
 * Procesa una transacción PENDING
 */
async function procesarTransaccion(transactionId, transactionData) {
  console.log(`\n📋 Procesando: ${transactionId}`);
  console.log(`   Restaurant: ${transactionData.restaurantId}`);
  console.log(`   Order: ${transactionData.orderId}`);
  console.log(`   Amount: ${transactionData.amount} centavos (${transactionData.amount / 100} COP)`);
  console.log(`   Created: ${new Date(transactionData.createdAt).toLocaleString()}`);
  
  // Consultar estado en Wompi
  console.log(`\n   🔍 Consultando estado en Wompi...`);
  
  const wompiTransaction = await consultarEstadoWompi(transactionId, transactionData.mode || 'sandbox');
  
  if (!wompiTransaction) {
    console.log('   ⚠️  Transacción no encontrada en Wompi (link nunca usado)');
    return {
      status: 'not_found',
      action: 'none'
    };
  }

  console.log(`   📊 Estado en Wompi: ${wompiTransaction.status}`);
  console.log(`   💳 Método de pago: ${wompiTransaction.payment_method_type || 'N/A'}`);
  
  // Determinar acción
  const statusMap = {
    'APPROVED': 'APPROVED',
    'DECLINED': 'DECLINED',
    'VOIDED': 'DECLINED',
    'ERROR': 'DECLINED',
    'PENDING': 'PENDING'
  };

  const newStatus = statusMap[wompiTransaction.status] || 'PENDING';
  
  if (newStatus === 'PENDING') {
    console.log('   ℹ️  Sigue PENDING en Wompi - no hay cambios');
    return {
      status: 'still_pending',
      action: 'none'
    };
  }

  // Hay un cambio de estado
  console.log(`\n   🔄 CAMBIO DETECTADO: PENDING → ${newStatus}`);
  
  if (dryRun) {
    console.log('   🔍 [DRY RUN] Se actualizaría a:', newStatus);
    if (newStatus === 'APPROVED') {
      console.log('   🔍 [DRY RUN] Se crearía pedido en KDS');
    }
    return {
      status: 'would_update',
      newStatus,
      action: 'dry_run'
    };
  }

  // Actualizar transacción
  console.log(`   ✏️  Actualizando transacción a ${newStatus}...`);
  await actualizarTransaccion(transactionId, {
    status: newStatus,
    wompiTransactionId: wompiTransaction.id,
    paymentMethod: wompiTransaction.payment_method_type,
    statusMessage: wompiTransaction.status_message
  });

  // Si fue aprobada, crear pedido en KDS
  if (newStatus === 'APPROVED') {
    console.log(`   🍽️  Creando pedido en KDS...`);
    const created = await crearPedidoEnKDS(transactionData);
    
    if (created) {
      console.log('   ✅ ¡Transacción reprocesada exitosamente!');
      return {
        status: 'updated',
        newStatus,
        action: 'order_created'
      };
    } else {
      console.log('   ⚠️  Transacción actualizada pero no se pudo crear el pedido');
      return {
        status: 'updated',
        newStatus,
        action: 'order_failed'
      };
    }
  } else {
    console.log('   ✅ Transacción actualizada a DECLINED');
    return {
      status: 'updated',
      newStatus,
      action: 'declined'
    };
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    let transactionsToProcess = [];

    if (specificTransaction) {
      // Procesar una transacción específica
      const snapshot = await db.ref(`transactions/${specificTransaction}`).once('value');
      const data = snapshot.val();
      
      if (!data) {
        console.error(`❌ Transacción ${specificTransaction} no encontrada`);
        process.exit(1);
      }
      
      transactionsToProcess.push({
        id: specificTransaction,
        ...data
      });
    } else {
      // Buscar todas las transacciones PENDING
      console.log('🔍 Buscando transacciones PENDING...\n');
      
      const snapshot = await db.ref('transactions')
        .orderByChild('status')
        .equalTo('PENDING')
        .once('value');
      
      const transactions = snapshot.val();
      
      if (!transactions) {
        console.log('✅ No hay transacciones PENDING para procesar');
        process.exit(0);
      }

      transactionsToProcess = Object.keys(transactions).map(id => ({
        id,
        ...transactions[id]
      }));
    }

    console.log(`📊 Transacciones encontradas: ${transactionsToProcess.length}\n`);

    // Estadísticas
    const stats = {
      total: transactionsToProcess.length,
      notFound: 0,
      stillPending: 0,
      approved: 0,
      declined: 0,
      errors: 0
    };

    // Procesar cada transacción
    for (const transaction of transactionsToProcess) {
      try {
        const result = await procesarTransaccion(transaction.id, transaction);
        
        if (result.status === 'not_found') {
          stats.notFound++;
        } else if (result.status === 'still_pending') {
          stats.stillPending++;
        } else if (result.newStatus === 'APPROVED') {
          stats.approved++;
        } else if (result.newStatus === 'DECLINED') {
          stats.declined++;
        }
        
      } catch (error) {
        console.error(`\n❌ Error procesando ${transaction.id}:`, error.message);
        stats.errors++;
      }
    }

    // Resumen final
    console.log('\n\n' + '='.repeat(70));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(70));
    console.log(`Total procesadas:        ${stats.total}`);
    console.log(`No encontradas en Wompi: ${stats.notFound} (nunca pagadas)`);
    console.log(`Siguen PENDING:          ${stats.stillPending}`);
    console.log(`✅ Aprobadas:            ${stats.approved}`);
    console.log(`❌ Rechazadas:           ${stats.declined}`);
    console.log(`🔥 Errores:              ${stats.errors}`);
    console.log('='.repeat(70));

    if (dryRun) {
      console.log('\n💡 Ejecuta sin --dry-run para aplicar los cambios');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error en el script:', error);
    process.exit(1);
  }
}

// Ejecutar
main();
