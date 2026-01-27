/**
 * Webhooks Router - Manejo de Notificaciones de los Gateways de Pago
 * 
 * Este router maneja las notificaciones (webhooks) que envían los gateways
 * cuando ocurre un evento de pago (aprobado, rechazado, etc.)
 * 
 * Endpoints:
 * POST /api/payments/webhook/:gateway/:restaurantId
 * 
 * Ejemplo:
 * POST /api/payments/webhook/wompi/rest123
 * POST /api/payments/webhook/bold/rest456
 */

const express = require('express');
const router = express.Router();
const paymentService = require('../payment-service');
const paymentConfigService = require('../payments/payment-config-service');

/**
 * Webhook unificado para todos los gateways
 * 
 * URL: POST /api/payments/webhook/:gateway/:restaurantId
 * 
 * Parámetros:
 * - gateway: nombre del gateway ('wompi', 'bold', 'payu')
 * - restaurantId: ID del restaurante que configuró el gateway
 * 
 * Body: JSON con los datos del webhook (varía según el gateway)
 * Headers: Incluye firmas y metadata del gateway
 */
router.post('/webhook/:gateway/:restaurantId', async (req, res) => {
  const { gateway, restaurantId } = req.params;
  const payload = req.body;
  const headers = req.headers;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📥 WEBHOOK RECIBIDO`);
    console.log(`   Gateway: ${gateway}`);
    console.log(`   Restaurante: ${restaurantId}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);

    // Log del payload (útil para debugging)
    console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));
    console.log('📦 Headers:', JSON.stringify(headers, null, 2));
    
    // 🔍 LOG ESPECÍFICO PARA DEBUG DE PAYMENT_LINK_ID
    if (payload.data?.transaction) {
      console.log('\n🔍 [DEBUG CRÍTICO] Datos de la transacción en el webhook:');
      console.log('   - transaction.id:', payload.data.transaction.id);
      console.log('   - transaction.reference:', payload.data.transaction.reference);
      console.log('   - transaction.payment_link_id:', payload.data.transaction.payment_link_id);
      console.log('   - transaction.payment_link:', payload.data.transaction.payment_link);
      console.log('   - Campos disponibles en transaction:', Object.keys(payload.data.transaction));
      console.log('');
    }

    // Procesar el webhook usando el PaymentService
    const result = await paymentService.processWebhook(
      gateway,
      payload,
      headers,
      restaurantId
    );

    if (!result.success) {
      console.error(`❌ Error procesando webhook: ${result.error}`);
      
      // Retornar 400 si hubo error de validación
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    console.log(`✅ Webhook procesado exitosamente`);
    console.log(`   Estado: ${result.status}`);
    console.log(`   Transaction ID: ${result.transactionId}\n`);

    // Siempre retornar 200 OK para que el gateway no reintente
    res.status(200).json({
      success: true,
      status: result.status,
      message: 'Webhook procesado correctamente'
    });

  } catch (error) {
    console.error('❌ Error inesperado procesando webhook:', error);
    console.error('   Stack:', error.stack);

    // Retornar 500 para que el gateway reintente
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Endpoint de prueba para simular webhooks en desarrollo
 * 
 * URL: POST /api/payments/webhook/test/:gateway/:restaurantId
 * 
 * Nota: Solo disponible en modo development
 */
router.post('/webhook/test/:gateway/:restaurantId', async (req, res) => {
  // Solo en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Test endpoint not available in production'
    });
  }

  const { gateway, restaurantId } = req.params;
  const { transactionId, status = 'APPROVED', amount = 50000 } = req.body;

  console.log(`🧪 TEST WEBHOOK: ${gateway} - ${status}`);

  // Simular payload de Wompi
  const mockPayload = {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: transactionId || `test_${Date.now()}`,
        reference: `${restaurantId}_test_${Date.now()}`,
        status: status,
        amount_in_cents: amount,
        currency: 'COP',
        payment_method_type: 'CARD',
        status_message: 'Test transaction'
      }
    },
    sent_at: new Date().toISOString()
  };

  const result = await paymentService.processWebhook(
    gateway,
    mockPayload,
    req.headers,
    restaurantId
  );

  res.json(result);
});

/**
 * Endpoint para consultar el estado de una transacción
 * 
 * URL: GET /api/payments/status/:restaurantId/:transactionId
 */
router.get('/status/:restaurantId/:transactionId', async (req, res) => {
  const { restaurantId, transactionId } = req.params;

  try {
    console.log(`🔍 Consultando estado: ${transactionId}`);

    const result = await paymentService.getTransactionStatus(
      restaurantId,
      transactionId
    );

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      transaction: result
    });

  } catch (error) {
    console.error('❌ Error consultando estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error consultando estado de transacción'
    });
  }
});

/**
 * Endpoint para obtener el historial de transacciones de un restaurante
 * 
 * URL: GET /api/payments/transactions/:restaurantId?limit=10&offset=0
 */
router.get('/transactions/:restaurantId', async (req, res) => {
  const { restaurantId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  try {
    console.log(`📊 Obteniendo transacciones de ${restaurantId}`);

    // TODO: Implementar en PaymentService
    // const transactions = await paymentService.getTransactionHistory(
    //   restaurantId,
    //   parseInt(limit),
    //   parseInt(offset)
    // );

    res.json({
      success: true,
      transactions: [], // TODO: implementar
      message: 'Función en desarrollo'
    });

  } catch (error) {
    console.error('❌ Error obteniendo transacciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo historial de transacciones'
    });
  }
});

/**
 * Health check endpoint
 * 
 * URL: GET /api/payments/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'payment-webhooks',
    timestamp: new Date().toISOString()
  });
});

/**
 * Valida credenciales de un gateway de pago
 * 
 * URL: POST /api/payments/validate-credentials
 * 
 * Body:
 * {
 *   provider: 'wompi',
 *   credentials: {
 *     publicKey: 'pub_test_xxx',
 *     privateKey: 'prv_test_xxx',
 *     eventsSecret: 'test_events_xxx'
 *   }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: 'Credenciales válidas'
 * }
 */
router.post('/validate-credentials', async (req, res) => {
  const { provider, credentials } = req.body;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 VALIDANDO CREDENCIALES`);
    console.log(`   Provider: ${provider}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);

    // Validar que se proporcionen los datos necesarios
    if (!provider || !credentials) {
      return res.status(400).json({
        success: false,
        error: 'Provider y credentials son requeridos'
      });
    }

    // Validar que credentials sea un objeto y tenga propiedades
    if (typeof credentials !== 'object' || Object.keys(credentials).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Las credenciales deben ser un objeto con propiedades válidas'
      });
    }

    // Validar según el provider
    let isValid = false;
    let errorMessage = null;

    if (provider === 'wompi') {
      // Importar el adapter de Wompi
      const WompiAdapter = require('../payments/adapters/wompi-adapter');
      const wompiAdapter = new WompiAdapter(credentials);

      try {
        // Intentar hacer una petición de prueba a la API de Wompi
        isValid = await wompiAdapter.validateCredentials();
        
        if (!isValid) {
          errorMessage = 'Las credenciales de Wompi no son válidas. Verifica que sean correctas.';
        }
      } catch (error) {
        console.error('❌ Error validando Wompi:', error);
        isValid = false;
        errorMessage = error.message || 'Error al validar las credenciales con Wompi';
      }

    } else if (provider === 'bold') {
      // Bold adapter (futuro)
      return res.json({
        success: false,
        error: 'El gateway Bold aún no está implementado'
      });

    } else if (provider === 'payu') {
      // PayU adapter (futuro)
      return res.json({
        success: false,
        error: 'El gateway PayU aún no está implementado'
      });

    } else {
      return res.status(400).json({
        success: false,
        error: `Provider desconocido: ${provider}`
      });
    }

    // Responder según el resultado
    if (isValid) {
      console.log('✅ Credenciales válidas');
      res.json({
        success: true,
        message: 'Credenciales válidas y funcionando correctamente'
      });
    } else {
      console.log('❌ Credenciales inválidas');
      res.json({
        success: false,
        error: errorMessage || 'Credenciales inválidas'
      });
    }

  } catch (error) {
    console.error('❌ Error en validación de credenciales:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * Endpoint para guardar configuración de pagos
 * 
 * URL: POST /api/payments/save-config
 * 
 * Body:
 * {
 *   "tenantId": "tenant-123",
 *   "enabled": true,
 *   "gateway": "wompi",
 *   "credentials": {
 *     "publicKey": "pub_test_...",
 *     "privateKey": "prv_test_...",
 *     "integritySecret": "test_integrity_...",
 *     "eventsSecret": "test_events_..."
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "config": {
 *     "tenantId": "tenant-123",
 *     "enabled": true,
 *     "gateway": "wompi",
 *     "updatedAt": 1706025600000,
 *     "hasCredentials": true
 *   }
 * }
 */
router.post('/save-config', async (req, res) => {
  const { tenantId, enabled, gateway, credentials } = req.body;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`💾 GUARDANDO CONFIGURACIÓN DE PAGOS`);
    console.log(`   Tenant: ${tenantId}`);
    console.log(`   Gateway: ${gateway}`);
    console.log(`   Enabled: ${enabled}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);

    // Validar datos requeridos
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId es requerido'
      });
    }

    if (!gateway) {
      return res.status(400).json({
        success: false,
        error: 'gateway es requerido'
      });
    }

    // Guardar configuración
    const savedConfig = await paymentConfigService.saveConfig(tenantId, {
      enabled,
      gateway,
      credentials
    });

    console.log('✅ Configuración guardada exitosamente');

    res.json({
      success: true,
      config: savedConfig,
      message: 'Configuración guardada correctamente'
    });

  } catch (error) {
    console.error('❌ Error guardando configuración:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al guardar la configuración'
    });
  }
});

/**
 * Endpoint para obtener configuración de pagos
 * 
 * URL: GET /api/payments/get-config/:tenantId
 * 
 * Params:
 * - tenantId: ID del tenant/restaurante
 * 
 * Query:
 * - includeCredentials: true/false (default: false por seguridad)
 * 
 * Response:
 * {
 *   "success": true,
 *   "config": {
 *     "tenantId": "tenant-123",
 *     "enabled": true,
 *     "gateway": "wompi",
 *     "updatedAt": 1706025600000,
 *     "hasCredentials": true,
 *     "credentials": {...} // Solo si includeCredentials=true
 *   }
 * }
 */
router.get('/get-config/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const includeCredentials = req.query.includeCredentials === 'true';

  try {
    console.log(`\n📖 OBTENIENDO CONFIGURACIÓN DE PAGOS`);
    console.log(`   Tenant: ${tenantId}`);
    console.log(`   Include Credentials: ${includeCredentials}`);

    const config = await paymentConfigService.getConfig(tenantId, includeCredentials);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró configuración de pagos para este restaurante'
      });
    }

    console.log('✅ Configuración obtenida');

    res.json({
      success: true,
      config: config
    });

  } catch (error) {
    console.error('❌ Error obteniendo configuración:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener la configuración'
    });
  }
});

/**
 * Endpoint para verificar si pagos están habilitados
 * 
 * URL: GET /api/payments/is-enabled/:tenantId
 * 
 * Response:
 * {
 *   "success": true,
 *   "enabled": true,
 *   "gateway": "wompi"
 * }
 */
router.get('/is-enabled/:tenantId', async (req, res) => {
  const { tenantId } = req.params;

  try {
    const config = await paymentConfigService.getConfig(tenantId, false);
    
    res.json({
      success: true,
      enabled: config ? config.enabled && config.hasCredentials : false,
      gateway: config ? config.gateway : null
    });

  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint para crear enlaces de pago (Testing)
 * 
 * URL: POST /api/payments/create-payment-link
 * 
 * Body: {
 *   restaurantId: string,
 *   orderId: string,
 *   amount: number,
 *   customerPhone: string,
 *   customerName: string,
 *   customerEmail?: string,
 *   orderDetails: object
 * }
 */
router.post('/create-payment-link', async (req, res) => {
  try {
    const {
      restaurantId,
      orderId,
      amount,
      customerPhone,
      customerName,
      customerEmail,
      orderDetails
    } = req.body;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`💳 CREAR ENLACE DE PAGO`);
    console.log(`   Restaurante: ${restaurantId}`);
    console.log(`   Orden: ${orderId}`);
    console.log(`   Monto: ${amount} centavos`);
    console.log(`${'='.repeat(60)}\n`);

    // Validar datos requeridos
    if (!restaurantId || !orderId || !amount || !customerPhone || !customerName) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos: restaurantId, orderId, amount, customerPhone, customerName'
      });
    }

    // Crear enlace de pago
    const result = await paymentService.createPaymentLink({
      restaurantId,
      orderId,
      amount,
      customerPhone,
      customerName,
      customerEmail,
      orderDetails
    });

    console.log(`✅ Enlace creado exitosamente:`, result);

    res.json(result);

  } catch (error) {
    console.error(`❌ Error creando enlace de pago:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

module.exports = router;
