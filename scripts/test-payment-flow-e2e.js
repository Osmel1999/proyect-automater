#!/usr/bin/env node
/**
 * Test End-to-End: Flujo Completo de Pago
 * 
 * Simula el flujo completo:
 * 1. Cliente hace un pedido por WhatsApp
 * 2. Bot genera y envía enlace de pago
 * 3. Cliente "paga" (simulado)
 * 4. Webhook actualiza estado
 * 5. Bot notifica confirmación
 * 
 * USO:
 *   node scripts/test-payment-flow-e2e.js <tenantId> <phoneNumber>
 * 
 * EJEMPLO:
 *   node scripts/test-payment-flow-e2e.js tenant-ABC 573001234567
 */

require('dotenv').config();
const admin = require('firebase-admin');
const axios = require('axios');
const crypto = require('crypto');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`PASO ${step}: ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Validar argumentos
const tenantId = process.argv[2];
const customerPhone = process.argv[3];

if (!tenantId || !customerPhone) {
  logError('Faltan argumentos');
  console.log('\nUSO:');
  console.log('  node scripts/test-payment-flow-e2e.js <tenantId> <phoneNumber>');
  console.log('\nEJEMPLO:');
  console.log('  node scripts/test-payment-flow-e2e.js tenant-ABC 573001234567');
  process.exit(1);
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Inicializar Firebase
let db;
try {
  if (!admin.apps.length) {
    const serviceAccount = require('../server/firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }
  db = admin.database();
  logSuccess('Firebase inicializado');
} catch (error) {
  logError(`Error inicializando Firebase: ${error.message}`);
  process.exit(1);
}

// Variables globales para rastrear el flujo
let orderId;
let transactionId;
let paymentLink;
let paymentReference;

/**
 * PASO 1: Verificar configuración del restaurante
 */
async function paso1_verificarConfiguracion() {
  logStep(1, 'Verificar configuración del restaurante');
  
  try {
    // Verificar que el tenant existe
    const tenantSnapshot = await db.ref(`tenants/${tenantId}`).once('value');
    if (!tenantSnapshot.exists()) {
      throw new Error(`Tenant ${tenantId} no existe en Firebase`);
    }
    
    const tenant = tenantSnapshot.val();
    logSuccess(`Tenant encontrado: ${tenant.restaurant?.name || 'Sin nombre'}`);
    
    // Verificar configuración de gateway
    const gatewaySnapshot = await db.ref(`tenants/${tenantId}/payments/gateway`).once('value');
    const gateway = gatewaySnapshot.val();
    
    if (!gateway || !gateway.enabled) {
      throw new Error('Gateway de pago no configurado o deshabilitado');
    }
    
    logSuccess(`Gateway configurado: ${gateway.gateway}`);
    logInfo(`Credenciales: ${gateway.credentials?.publicKey ? 'Sí' : 'No'}`);
    
    return true;
  } catch (error) {
    logError(error.message);
    throw error;
  }
}

/**
 * PASO 2: Simular pedido del cliente
 */
async function paso2_crearPedido() {
  logStep(2, 'Crear pedido de prueba');
  
  try {
    const orderData = {
      id: Date.now().toString(16).slice(-6).toUpperCase(),
      tenantId,
      cliente: customerPhone,
      telefono: customerPhone,
      telefonoContacto: customerPhone,
      direccion: 'Calle 80 #12-34, Bogotá',
      items: [
        { numero: '1', nombre: 'Hamburguesa Clásica', precio: 25000, cantidad: 2 },
        { numero: '3', nombre: 'Coca Cola', precio: 5000, cantidad: 1 },
      ],
      total: 55000,
      estado: 'pendiente_pago',
      paymentStatus: 'PENDING',
      timestamp: Date.now(),
      fecha: new Date().toISOString(),
      fuente: 'test',
      restaurante: 'Test Restaurant',
    };
    
    const orderRef = await db.ref(`tenants/${tenantId}/pedidos`).push(orderData);
    orderId = orderRef.key;
    
    logSuccess(`Pedido creado: #${orderData.id}`);
    logInfo(`Order ID (Firebase): ${orderId}`);
    logInfo(`Total: $${orderData.total.toLocaleString('es-CO')} COP`);
    logInfo(`Dirección: ${orderData.direccion}`);
    
    return orderData;
  } catch (error) {
    logError(`Error creando pedido: ${error.message}`);
    throw error;
  }
}

/**
 * PASO 3: Generar enlace de pago
 */
async function paso3_generarEnlacePago(orderData) {
  logStep(3, 'Generar enlace de pago');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/payments/test`,
      {
        restaurantId: tenantId,
        orderId: orderId,
        amount: orderData.total * 100, // Convertir a centavos
        customerPhone: customerPhone,
        customerName: `Cliente ${customerPhone}`,
        customerEmail: `${customerPhone}@test.com`,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error generando enlace de pago');
    }
    
    paymentLink = response.data.paymentLink;
    transactionId = response.data.transactionId;
    paymentReference = response.data.reference;
    
    logSuccess('Enlace de pago generado');
    logInfo(`Transaction ID: ${transactionId}`);
    logInfo(`Reference: ${paymentReference}`);
    logInfo(`Payment Link: ${paymentLink}`);
    
    // Verificar que se guardó en Firebase
    const orderSnapshot = await db.ref(`tenants/${tenantId}/pedidos/${orderId}`).once('value');
    const updatedOrder = orderSnapshot.val();
    
    if (updatedOrder.paymentLink && updatedOrder.paymentTransactionId) {
      logSuccess('Información de pago guardada en Firebase');
    } else {
      logWarning('Información de pago no se guardó en Firebase');
    }
    
    return response.data;
  } catch (error) {
    logError(`Error generando enlace de pago: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

/**
 * PASO 4: Simular pago exitoso (webhook)
 */
async function paso4_simularPagoExitoso() {
  logStep(4, 'Simular pago exitoso (webhook)');
  
  try {
    // Obtener configuración del gateway
    const gatewaySnapshot = await db.ref(`tenants/${tenantId}/payments/gateway`).once('value');
    const gateway = gatewaySnapshot.val();
    
    const gatewayType = gateway.gateway || 'wompi';
    
    // Construir payload según el gateway
    let webhookPayload;
    let webhookHeaders;
    
    if (gatewayType === 'wompi') {
      webhookPayload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: transactionId,
            reference: paymentReference,
            amount_in_cents: 5500000, // 55000 COP
            status: 'APPROVED',
            payment_method_type: 'CARD',
            payment_method: {
              type: 'CARD',
              extra: {
                brand: 'VISA',
                last_four: '4242',
              },
            },
            customer_email: `${customerPhone}@test.com`,
            finalized_at: new Date().toISOString(),
          },
        },
        sent_at: new Date().toISOString(),
      };
      
      // Generar firma (HMAC)
      const integritySecret = gateway.credentials.integritySecret || 'test-secret';
      const concatenated = `${webhookPayload.event}${webhookPayload.data.transaction.id}${webhookPayload.sent_at}`;
      const signature = crypto
        .createHmac('sha256', integritySecret)
        .update(concatenated)
        .digest('hex');
      
      webhookHeaders = {
        'Content-Type': 'application/json',
        'X-Event': webhookPayload.event,
        'X-Signature': signature,
      };
    } else {
      throw new Error(`Gateway ${gatewayType} no soportado en este test`);
    }
    
    logInfo('Enviando webhook simulado...');
    
    const response = await axios.post(
      `${BASE_URL}/api/payments/webhook/${tenantId}/${gatewayType}`,
      webhookPayload,
      {
        headers: webhookHeaders,
        timeout: 10000,
      }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error procesando webhook');
    }
    
    logSuccess('Webhook procesado exitosamente');
    logInfo(`Estado final: ${response.data.status}`);
    
    // Esperar un momento para que se procese
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar que el pedido se actualizó en Firebase
    const orderSnapshot = await db.ref(`tenants/${tenantId}/pedidos/${orderId}`).once('value');
    const updatedOrder = orderSnapshot.val();
    
    if (updatedOrder.paymentStatus === 'APPROVED' || updatedOrder.estado === 'confirmado') {
      logSuccess('Estado del pedido actualizado en Firebase');
      logInfo(`Estado: ${updatedOrder.estado}`);
      logInfo(`Payment Status: ${updatedOrder.paymentStatus}`);
    } else {
      logWarning(`Estado no actualizado correctamente: ${updatedOrder.estado} / ${updatedOrder.paymentStatus}`);
    }
    
    return response.data;
  } catch (error) {
    logError(`Error simulando pago: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

/**
 * PASO 5: Verificar estado final
 */
async function paso5_verificarEstadoFinal() {
  logStep(5, 'Verificar estado final de la transacción');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/payments/status/${transactionId}`,
      { timeout: 5000 }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error consultando estado');
    }
    
    const { status, amount, timestamp } = response.data;
    
    logSuccess('Estado final consultado');
    logInfo(`Estado: ${status}`);
    logInfo(`Monto: $${(amount / 100).toLocaleString('es-CO')} COP`);
    logInfo(`Fecha: ${new Date(timestamp).toLocaleString('es-CO')}`);
    
    return response.data;
  } catch (error) {
    logError(`Error verificando estado: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

/**
 * Ejecutar test completo
 */
async function runTest() {
  log('\n' + '='.repeat(70), 'magenta');
  log('TEST END-TO-END: FLUJO COMPLETO DE PAGO', 'bright');
  log('='.repeat(70), 'magenta');
  log(`Tenant: ${tenantId}`, 'cyan');
  log(`Cliente: ${customerPhone}`, 'cyan');
  log(`Base URL: ${BASE_URL}`, 'cyan');
  log('='.repeat(70) + '\n', 'magenta');
  
  try {
    await paso1_verificarConfiguracion();
    const orderData = await paso2_crearPedido();
    await paso3_generarEnlacePago(orderData);
    await paso4_simularPagoExitoso();
    await paso5_verificarEstadoFinal();
    
    log('\n' + '='.repeat(70), 'green');
    log('✅ TEST COMPLETADO EXITOSAMENTE', 'bright');
    log('='.repeat(70), 'green');
    log('\n🎉 El flujo completo de pago funciona correctamente\n', 'green');
    
    process.exit(0);
  } catch (error) {
    log('\n' + '='.repeat(70), 'red');
    log('❌ TEST FALLÓ', 'bright');
    log('='.repeat(70), 'red');
    logError(`\nError: ${error.message}\n`);
    
    // Limpiar pedido de prueba si fue creado
    if (orderId) {
      try {
        await db.ref(`tenants/${tenantId}/pedidos/${orderId}`).remove();
        logInfo('Pedido de prueba eliminado');
      } catch (cleanupError) {
        logWarning(`No se pudo limpiar el pedido: ${cleanupError.message}`);
      }
    }
    
    process.exit(1);
  }
}

// Ejecutar test
runTest();
