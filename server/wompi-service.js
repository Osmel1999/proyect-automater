/**
 * 💳 Wompi Service - Pasarela de Pagos para Membresías
 * 
 * Maneja:
 * - Creación de enlaces de pago para suscripciones
 * - Verificación de transacciones
 * - Webhooks de confirmación
 * 
 * Documentación: https://docs.wompi.co/
 */

const crypto = require('crypto');

// Configuración Wompi (desde variables de entorno)
const WOMPI_CONFIG = {
  publicKey: process.env.WOMPI_PUBLIC_KEY || '',
  privateKey: process.env.WOMPI_PRIVATE_KEY || '',
  eventsSecret: process.env.WOMPI_EVENTS_SECRET || '',
  integritySecret: process.env.WOMPI_INTEGRITY_SECRET || '',
  environment: process.env.WOMPI_ENVIRONMENT || 'sandbox', // 'sandbox' | 'production'
  baseUrl: process.env.WOMPI_ENVIRONMENT === 'production' 
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1'
};

// Precios de planes en centavos (COP)
const PLAN_PRICES = {
  emprendedor: 9000000,   // $90,000 COP
  profesional: 12000000,  // $120,000 COP
  empresarial: 15000000   // $150,000 COP
};

// Información de planes para mostrar (LÍMITES MENSUALES)
const PLAN_INFO = {
  emprendedor: {
    name: 'Plan Emprendedor',
    price: 90000,
    priceFormatted: '$90.000 COP/mes',
    ordersPerMonth: 750,
    features: ['750 pedidos/mes', 'Soporte por email', 'Dashboard básico']
  },
  profesional: {
    name: 'Plan Profesional',
    price: 120000,
    priceFormatted: '$120.000 COP/mes',
    ordersPerMonth: 1500,
    features: ['1,500 pedidos/mes', 'Soporte WhatsApp', 'Analytics básico']
  },
  empresarial: {
    name: 'Plan Empresarial',
    price: 150000,
    priceFormatted: '$150.000 COP/mes',
    ordersPerMonth: 3000,
    features: ['3,000 pedidos/mes', 'Soporte prioritario', 'Analytics avanzado']
  }
};

/**
 * Verifica que la configuración de Wompi esté completa
 */
function isConfigured() {
  return !!(WOMPI_CONFIG.publicKey && WOMPI_CONFIG.privateKey);
}

/**
 * Genera la firma de integridad para un enlace de pago
 * @param {string} reference - Referencia única del pago
 * @param {number} amountInCents - Monto en centavos
 * @param {string} currency - Moneda (COP)
 */
function generateIntegritySignature(reference, amountInCents, currency = 'COP') {
  const data = `${reference}${amountInCents}${currency}${WOMPI_CONFIG.integritySecret}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verifica la firma de un webhook de Wompi
 * @param {Object} payload - Payload del webhook
 * @param {string} signature - Firma del header x-event-checksum
 */
function verifyWebhookSignature(payload, signature) {
  const { data, timestamp } = payload;
  const transaction = data.transaction;
  
  // Construir string para verificación según documentación Wompi
  // https://docs.wompi.co/docs/colombia/eventos/
  // Paso 1: Concatenar valores de las propiedades (transaction.id, transaction.status, transaction.amount_in_cents)
  // Paso 2: Concatenar timestamp
  // Paso 3: Concatenar secreto de eventos
  // Paso 4: Aplicar SHA256 (NO HMAC)
  const signatureString = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${WOMPI_CONFIG.eventsSecret}`;
  const expectedSignature = crypto
    .createHash('sha256')  // Usar hash, NO hmac
    .update(signatureString)
    .digest('hex');
  
  return signature === expectedSignature;
}

/**
 * Crea un enlace de pago para una suscripción
 * @param {string} tenantId - ID del tenant
 * @param {string} plan - Plan a comprar (emprendedor, profesional, empresarial)
 * @param {string} email - Email del cliente
 * @param {string} redirectUrl - URL de redirección después del pago
 */
async function createPaymentLink(tenantId, plan, email, redirectUrl) {
  if (!isConfigured()) {
    throw new Error('Wompi no está configurado. Verifica las variables de entorno.');
  }
  
  const planInfo = PLAN_INFO[plan];
  if (!planInfo) {
    throw new Error(`Plan no válido: ${plan}`);
  }
  
  const amountInCents = PLAN_PRICES[plan];
  const reference = `KDS-${tenantId}-${plan}-${Date.now()}`;
  const currency = 'COP';
  
  // Agregar amount como parámetro en la URL de redirección
  const redirectUrlWithAmount = `${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}amount=${amountInCents}&plan=${plan}`;
  
  // Generar firma de integridad
  const integritySignature = generateIntegritySignature(reference, amountInCents, currency);
  
  try {
    const response = await fetch(`${WOMPI_CONFIG.baseUrl}/payment_links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WOMPI_CONFIG.privateKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: planInfo.name,
        description: `Suscripción mensual - ${planInfo.name} - Ref: ${tenantId}`,
        single_use: true,
        collect_shipping: false,
        currency: currency,
        amount_in_cents: amountInCents,
        redirect_url: redirectUrlWithAmount
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [Wompi] Error creando enlace de pago:', errorData);
      throw new Error(errorData.error?.message || 'Error al crear enlace de pago');
    }
    
    const data = await response.json();
    
    console.log(`✅ [Wompi] Enlace de pago creado para tenant ${tenantId}, plan ${plan}`);
    
    // Guardar referencia del pago pendiente en Firebase para asociar con webhook
    try {
      const admin = require('firebase-admin');
      await admin.database().ref(`pending_payments/${data.data.id}`).set({
        tenantId,
        plan,
        reference,
        amount: planInfo.price,
        paymentLinkId: data.data.id,
        createdAt: admin.database.ServerValue.TIMESTAMP
      });
    } catch (dbError) {
      console.warn('⚠️ [Wompi] No se pudo guardar referencia de pago pendiente:', dbError.message);
    }
    
    return {
      success: true,
      paymentLink: `https://checkout.wompi.co/l/${data.data.id}`,
      paymentLinkId: data.data.id,
      reference: reference,
      amount: planInfo.price,
      amountFormatted: planInfo.priceFormatted,
      plan: plan,
      planInfo: planInfo
    };
    
  } catch (error) {
    console.error('❌ [Wompi] Error creando enlace de pago:', error);
    throw error;
  }
}

/**
 * Crea un checkout con widget embebido (alternativa a payment link)
 * @param {string} tenantId - ID del tenant
 * @param {string} plan - Plan a comprar
 */
function createCheckoutData(tenantId, plan) {
  const planInfo = PLAN_INFO[plan];
  if (!planInfo) {
    throw new Error(`Plan no válido: ${plan}`);
  }
  
  const amountInCents = PLAN_PRICES[plan];
  const reference = `KDS-${tenantId}-${plan}-${Date.now()}`;
  const currency = 'COP';
  
  const integritySignature = generateIntegritySignature(reference, amountInCents, currency);
  
  return {
    publicKey: WOMPI_CONFIG.publicKey,
    currency: currency,
    amountInCents: amountInCents,
    reference: reference,
    signature: integritySignature,
    redirectUrl: `${process.env.APP_URL || ''}/payment-success.html`,
    // Metadata
    tenantId: tenantId,
    plan: plan,
    planInfo: planInfo
  };
}

/**
 * Verifica el estado de una transacción
 * @param {string} transactionId - ID de la transacción de Wompi
 */
async function getTransactionStatus(transactionId) {
  if (!isConfigured()) {
    throw new Error('Wompi no está configurado');
  }
  
  try {
    const response = await fetch(`${WOMPI_CONFIG.baseUrl}/transactions/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${WOMPI_CONFIG.privateKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error consultando transacción');
    }
    
    const data = await response.json();
    const transaction = data.data;
    
    return {
      id: transaction.id,
      status: transaction.status, // APPROVED, DECLINED, VOIDED, ERROR, PENDING
      reference: transaction.reference,
      amount: transaction.amount_in_cents / 100,
      amountInCents: transaction.amount_in_cents,
      paymentMethod: transaction.payment_method_type,
      createdAt: transaction.created_at,
      finalizedAt: transaction.finalized_at,
      // Extraer metadata de la referencia
      metadata: parseReference(transaction.reference)
    };
    
  } catch (error) {
    console.error('❌ [Wompi] Error consultando transacción:', error);
    throw error;
  }
}

/**
 * Parsea la referencia para extraer tenantId y plan
 * Formato: KDS-{tenantId}-{plan}-{timestamp}
 */
function parseReference(reference) {
  if (!reference || !reference.startsWith('KDS-')) {
    return null;
  }
  
  const parts = reference.split('-');
  if (parts.length >= 4) {
    return {
      tenantId: parts[1],
      plan: parts[2],
      timestamp: parseInt(parts[3])
    };
  }
  
  return null;
}

/**
 * Procesa un webhook de Wompi (transacción completada)
 * @param {Object} payload - Payload del webhook
 * @param {string} signature - Firma del webhook
 * @param {Function} onSuccess - Callback cuando el pago es exitoso
 */
async function processWebhook(payload, signature, onSuccess) {
  // Verificar firma
  if (WOMPI_CONFIG.eventsSecret && !verifyWebhookSignature(payload, signature)) {
    console.warn('⚠️ [Wompi] Firma de webhook inválida');
    return { success: false, reason: 'invalid_signature' };
  }
  
  const { event, data } = payload;
  
  // Solo procesar eventos de transacción
  if (event !== 'transaction.updated') {
    console.log(`ℹ️ [Wompi] Evento ignorado: ${event}`);
    return { success: true, reason: 'event_ignored' };
  }
  
  const transaction = data.transaction;
  const status = transaction.status;
  
  console.log(`📨 [Wompi] Webhook recibido - Transaction ${transaction.id}: ${status}`);
  
  // Solo procesar pagos aprobados
  if (status !== 'APPROVED') {
    console.log(`ℹ️ [Wompi] Transacción no aprobada: ${status}`);
    return { success: true, reason: 'not_approved', status };
  }
  
  // Intentar extraer metadata de la referencia
  let metadata = parseReference(transaction.reference);
  
  // Si no hay referencia válida, buscar en pending_payments por payment_link_id
  if (!metadata && transaction.payment_link_id) {
    try {
      const admin = require('firebase-admin');
      const pendingSnapshot = await admin.database()
        .ref(`pending_payments/${transaction.payment_link_id}`)
        .once('value');
      
      if (pendingSnapshot.exists()) {
        const pending = pendingSnapshot.val();
        metadata = {
          tenantId: pending.tenantId,
          plan: pending.plan,
          timestamp: pending.createdAt
        };
        console.log(`✅ [Wompi] Metadata encontrada en pending_payments para ${transaction.payment_link_id}`);
        
        // Eliminar el registro de pending_payments
        await admin.database().ref(`pending_payments/${transaction.payment_link_id}`).remove();
      }
    } catch (dbError) {
      console.error('⚠️ [Wompi] Error buscando en pending_payments:', dbError.message);
    }
  }
  
  if (!metadata) {
    console.error('❌ [Wompi] No se pudo extraer metadata de referencia:', transaction.reference);
    return { success: false, reason: 'invalid_reference' };
  }
  
  // Ejecutar callback de éxito
  if (onSuccess) {
    await onSuccess({
      tenantId: metadata.tenantId,
      plan: metadata.plan,
      transactionId: transaction.id,
      amount: transaction.amount_in_cents / 100,
      reference: transaction.reference,
      paymentMethod: transaction.payment_method_type
    });
  }
  
  return { 
    success: true, 
    tenantId: metadata.tenantId, 
    plan: metadata.plan,
    transactionId: transaction.id
  };
}

/**
 * Obtiene información de un plan
 */
function getPlanInfo(plan) {
  return PLAN_INFO[plan] || null;
}

/**
 * Obtiene todos los planes disponibles
 */
function getAllPlans() {
  return Object.entries(PLAN_INFO).map(([key, info]) => ({
    id: key,
    ...info
  }));
}

module.exports = {
  isConfigured,
  createPaymentLink,
  createCheckoutData,
  getTransactionStatus,
  processWebhook,
  verifyWebhookSignature,
  parseReference,
  getPlanInfo,
  getAllPlans,
  PLAN_PRICES,
  PLAN_INFO
};
