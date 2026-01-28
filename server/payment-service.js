/**
 * Payment Service - Capa de Servicio de Pagos
 * 
 * Esta capa orquesta las operaciones de pago entre el bot de WhatsApp,
 * el GatewayManager y Firebase. Maneja:
 * - Creación de enlaces de pago personalizados por restaurante
 * - Validación de webhooks
 * - Actualización de estados de transacciones
 * - Notificaciones al cliente vía WhatsApp
 * 
 * Patrón: Service Layer
 * - Abstrae la lógica de negocio de pagos
 * - Coordina entre múltiples sistemas (WhatsApp, Gateways, Firebase)
 */

const admin = require('firebase-admin');
const gatewayManager = require('./payments/gateway-manager');
const paymentConfigService = require('./payments/payment-config-service');

/**
 * Obtiene el tiempo de entrega configurado para el restaurante
 * @param {string} tenantId - ID del restaurante
 * @returns {Promise<string>} Texto del tiempo estimado (ej: "30-40 minutos")
 */
async function obtenerTiempoEntrega(tenantId) {
  try {
    const db = admin.database();
    const snapshot = await db.ref(`tenants/${tenantId}/config/deliveryTime`).once('value');
    const deliveryTime = snapshot.val();
    
    if (deliveryTime && deliveryTime.min && deliveryTime.max) {
      return `${deliveryTime.min}-${deliveryTime.max} minutos`;
    }
    
    // Valor por defecto si no está configurado
    return '30-40 minutos';
  } catch (error) {
    console.error('Error obteniendo tiempo de entrega:', error);
    return '30-40 minutos';
  }
}

class PaymentService {
  constructor() {
    this.gatewayManager = gatewayManager; // Usar la instancia singleton exportada
    this.db = admin.database();
    console.log('✅ PaymentService inicializado');
  }

  /**
   * Crea un enlace de pago para un pedido específico
   * 
   * @param {Object} params - Parámetros del pago
   * @param {string} params.restaurantId - ID del restaurante
   * @param {string} params.orderId - ID del pedido
   * @param {number} params.amount - Monto total en COP (centavos)
   * @param {string} params.customerPhone - Teléfono del cliente (WhatsApp)
   * @param {string} params.customerName - Nombre del cliente
   * @param {string} params.customerEmail - Email del cliente (opcional)
   * @param {Object} params.orderDetails - Detalles del pedido (opcional)
   * @returns {Promise<Object>} - {success: boolean, paymentLink: string, transactionId: string, error: string}
   */
  async createPaymentLink({ 
    restaurantId, 
    orderId, 
    amount, 
    customerPhone, 
    customerName, 
    customerEmail,
    orderDetails = {} 
  }) {
    try {
      console.log('\n' + '='.repeat(70));
      console.log(`� INICIO - createPaymentLink`);
      console.log('='.repeat(70));
      console.log(`📝 Parámetros recibidos:`);
      console.log(`   - restaurantId: ${restaurantId}`);
      console.log(`   - orderId: ${orderId}`);
      console.log(`   - amount: ${amount}`);
      console.log(`   - customerPhone: ${customerPhone}`);
      console.log(`   - customerName: ${customerName}`);
      console.log(`   - customerEmail: ${customerEmail}`);
      console.log(`   - orderDetails:`, JSON.stringify(orderDetails, null, 2));

      // 1. Obtener configuración del gateway del restaurante desde Firebase
      console.log(`\n🔍 PASO 1: Obteniendo configuración del gateway...`);
      const gatewayConfig = await this._getRestaurantGatewayConfig(restaurantId);
      
      console.log(`📊 Resultado de configuración:`, gatewayConfig);
      
      if (!gatewayConfig) {
        console.error(`❌ ERROR: No se encontró configuración para restaurante ${restaurantId}`);
        throw new Error(`Restaurante ${restaurantId} no tiene gateway de pago configurado`);
      }
      
      if (!gatewayConfig.enabled) {
        console.error(`❌ ERROR: Gateway deshabilitado para restaurante ${restaurantId}`);
        throw new Error(`Restaurante ${restaurantId} tiene gateway deshabilitado`);
      }
      
      console.log(`✅ Gateway configurado correctamente:`, {
        enabled: gatewayConfig.enabled,
        gateway: gatewayConfig.gateway,
        hasCredentials: !!gatewayConfig.credentials
      });

      // 2. Validar que el monto sea válido
      console.log(`\n🔍 PASO 2: Validando monto...`);
      if (!amount || amount <= 0) {
        console.error(`❌ ERROR: Monto inválido - amount: ${amount}`);
        throw new Error(`Monto inválido: ${amount}`);
      }
      console.log(`✅ Monto válido: ${amount} centavos (${amount / 100} COP)`);

      // 3. Preparar datos del pago
      console.log(`\n🔍 PASO 3: Preparando datos del pago...`);
      const paymentData = {
        reference: `${restaurantId}_${orderId}_${Date.now()}`, // Referencia única
        amountInCents: amount,
        currency: 'COP',
        customerData: {
          phoneNumber: customerPhone,
          fullName: customerName,
          email: customerEmail || `${customerPhone}@kdsapp.site`, // Email por defecto si no se proporciona
        },
        redirectUrl: `${process.env.BASE_URL || 'https://api.kdsapp.site'}/payment-success.html`,
        metadata: {
          restaurantId,
          orderId,
          customerPhone,
          ...orderDetails, // Items, dirección, etc.
        },
      };
      console.log(`✅ Datos del pago preparados:`, JSON.stringify(paymentData, null, 2));

      // 4. Crear enlace de pago usando el gateway configurado
      console.log(`\n🔍 PASO 4: Creando enlace de pago con gateway ${gatewayConfig.gateway}...`);
      const result = await this.gatewayManager.createPaymentLink(
        gatewayConfig.gateway,
        gatewayConfig.credentials,
        paymentData
      );

      console.log(`📊 Resultado de createPaymentLink:`, {
        success: result.success,
        hasPaymentLink: !!result.paymentLink,
        hasTransactionId: !!result.transactionId,
        error: result.error
      });

      if (!result.success) {
        console.error(`❌ ERROR creando enlace de pago: ${result.error}`);
        throw new Error(result.error || 'Error creando enlace de pago');
      }
      
      console.log(`✅ Enlace de pago creado exitosamente: ${result.paymentLink}`);

      // 5. Guardar la transacción en Firebase
      console.log(`\n🔍 PASO 5: Guardando transacción en Firebase...`);
      const transactionData = {
        restaurantId,
        orderId,
        transactionId: result.transactionId, // Este es el payment link ID de Wompi
        paymentLinkId: result.transactionId, // Guardar explícitamente el payment link ID
        gateway: gatewayConfig.gateway,
        reference: paymentData.reference, // Nuestra referencia interna
        amount,
        customerPhone, // Número de contacto del cliente (para Wompi)
        whatsappPhone: customerPhone, // 🔥 Número de WhatsApp del chat (para notificaciones)
        customerName,
        status: 'PENDING',
        paymentLink: result.paymentLink,
        createdAt: Date.now(),
      };
      console.log(`   Datos de transacción:`, JSON.stringify(transactionData, null, 2));
      
      await this._saveTransaction(transactionData);

      console.log(`✅ Transacción guardada exitosamente`);
      console.log('\n' + '='.repeat(70));
      console.log(`🟢 FIN - createPaymentLink EXITOSO`);
      console.log('='.repeat(70) + '\n');
      
      return {
        success: true,
        paymentLink: result.paymentLink,
        transactionId: result.transactionId,
        reference: paymentData.reference,
      };

    } catch (error) {
      console.error('\n' + '='.repeat(70));
      console.error('🔴 ERROR en createPaymentLink');
      console.error('='.repeat(70));
      console.error('❌ Error:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('='.repeat(70) + '\n');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Procesa un webhook de pago
   * 
   * @param {string} gateway - Nombre del gateway ('wompi', 'bold', etc.)
   * @param {Object} payload - Datos del webhook
   * @param {Object} headers - Headers HTTP del webhook
   * @param {string} restaurantId - ID del restaurante (desde la URL del webhook)
   * @returns {Promise<Object>} - {success: boolean, status: string, error: string}
   */
  async processWebhook(gateway, payload, headers, restaurantId) {
    try {
      console.log(`🔔 Procesando webhook de ${gateway} para restaurante ${restaurantId}`);

      // 1. Obtener configuración del gateway del restaurante
      const gatewayConfig = await this._getRestaurantGatewayConfig(restaurantId);
      
      if (!gatewayConfig || gatewayConfig.gateway !== gateway) {
        throw new Error(`Gateway ${gateway} no configurado para restaurante ${restaurantId}`);
      }

      // 2. Validar el webhook (verificar firma/integridad)
      const isValid = await this.gatewayManager.validateWebhook(
        gateway,
        gatewayConfig.credentials,
        payload,
        headers
      );

      if (!isValid) {
        console.warn('⚠️ Webhook con firma inválida rechazado');
        return { success: false, error: 'Firma inválida' };
      }

      // 3. Parsear el evento del webhook
      const event = await this.gatewayManager.processWebhookEvent(
        gateway,
        gatewayConfig.credentials,
        payload
      );

      console.log(`🔍 [DEBUG CRÍTICO] Evento parseado:`, JSON.stringify(event, null, 2));

      console.log(`📊 Evento parseado: ${event.status} - ${event.transactionId}`);
      console.log(`📊 Reference del evento: ${event.reference}`);
      console.log(`📊 Payment Link ID extraído: ${event.data?.paymentLinkId}`);

      // 4. Buscar la transacción en Firebase
      // IMPORTANTE según documentación oficial de Wompi:
      // - payment_link_id: Es el ID del LINK de pago (ej: "3Z0Cfi") - el mismo para todos los pagos
      // - transaction.id: Es el ID único de cada TRANSACCIÓN (ej: "1234-1610641025-49201")
      // - reference: Es autogenerado por Wompi para cada transacción (NO personalizable en Payment Links)
      // 
      // Estrategia de búsqueda:
      // 1. Buscar por payment_link_id (lo que guardamos al crear el link)
      // 2. Si no existe, buscar por wompiTransactionId (si ya se guardó en un webhook previo)
      // 3. NO buscar por reference porque es autogenerado y diferente en cada pago
      
      let transaction = null;
      
      // Intento 1: Buscar por payment link ID (lo que guardamos como transactionId al crear el link)
      // ⚠️ IMPORTANTE: event.data.paymentLinkId viene del wompi-adapter parseWebhookEvent()
      const paymentLinkId = event.data?.paymentLinkId;
      
      console.log(`🔍 [DEBUG] event.data completo:`, JSON.stringify(event.data, null, 2));
      console.log(`🔍 [DEBUG] paymentLinkId extraído:`, paymentLinkId);
      
      if (paymentLinkId) {
        console.log(`🔍 Buscando transacción por payment link ID: ${paymentLinkId}`);
        transaction = await this._getTransactionByPaymentLinkId(paymentLinkId);
        
        if (transaction) {
          console.log(`✅ Transacción encontrada por paymentLinkId`);
        } else {
          console.log(`⚠️  No se encontró transacción con paymentLinkId: ${paymentLinkId}`);
          
          // ⚠️ Intento alternativo: Buscar directamente por la clave de Firebase
          // (para transacciones creadas antes del fix que no tienen paymentLinkId)
          console.log(`🔍 Intentando buscar directamente en Firebase: /transactions/${paymentLinkId}`);
          transaction = await this._getTransaction(paymentLinkId);
          
          if (transaction) {
            console.log(`✅ Transacción encontrada directamente por clave de Firebase`);
          }
        }
      } else {
        console.log(`⚠️  event.data.paymentLinkId es null o undefined`);
      }
      
      // Intento 2: Buscar por wompiTransactionId (si ya lo guardamos en un webhook anterior)
      if (!transaction) {
        console.log(`🔍 Buscando transacción por wompiTransactionId: ${event.transactionId}`);
        transaction = await this._getTransactionByWompiTransactionId(event.transactionId);
      }
      
      // Intento 3: Buscar por reference de Wompi (SOLO como último recurso, generalmente no funcionará)
      if (!transaction && event.reference) {
        console.log(`⚠️  Buscando por reference como último recurso: ${event.reference}`);
        console.log(`⚠️  NOTA: El reference es autogenerado por Wompi y es diferente en cada pago`);
        transaction = await this._getTransactionByReference(event.reference);
      }
      
      if (!transaction) {
        console.warn(`⚠️ Transacción no encontrada en Firebase`);
        console.warn(`   - Payment Link ID: ${paymentLinkId || 'N/A'}`);
        console.warn(`   - Wompi Transaction ID: ${event.transactionId}`);
        console.warn(`   - Reference: ${event.reference}`);
        console.warn(`   NOTA: Asegúrate de que el link de pago fue generado a través de la app, no directamente desde Wompi`);
        return { success: true, status: 'TRANSACTION_NOT_FOUND' };
      }

      console.log(`✅ Transacción encontrada en Firebase:`, {
        id: transaction.id,
        reference: transaction.reference,
        orderId: transaction.orderId
      });

      // 5. Actualizar el estado de la transacción (incluye el transactionId de Wompi)
      await this._updateTransactionStatus(
        transaction.id,
        event.status,
        {
          wompiTransactionId: event.transactionId, // Guardar el ID de Wompi
          paymentMethod: event.paymentMethod,
          message: event.message,
          ...event.data
        }
      );

      // 6. Si el pago fue aprobado, CREAR el pedido en KDS
      if (event.status === 'APPROVED') {
        console.log(`✅ [processWebhook] Pago aprobado, creando pedido en KDS...`);
        await this._createOrderInKDS(transaction);
        await this._updateOrderPaymentStatus(transaction.orderId, 'PAID');
      } else if (event.status === 'DECLINED' || event.status === 'ERROR') {
        await this._updateOrderPaymentStatus(transaction.orderId, 'FAILED');
      }

      // 7. Notificar al cliente según el resultado (DESPUÉS de crear el pedido)
      await this._notifyCustomer(transaction, event.status);

      console.log(`✅ Webhook procesado exitosamente: ${event.status}`);
      
      return {
        success: true,
        status: event.status,
        transactionId: event.transactionId,
      };

    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Consulta el estado de una transacción
   * 
   * @param {string} restaurantId - ID del restaurante
   * @param {string} transactionId - ID de la transacción
   * @returns {Promise<Object>} - {success: boolean, status: string, data: Object}
   */
  async getTransactionStatus(restaurantId, transactionId) {
    try {
      console.log(`🔍 Consultando estado de transacción ${transactionId}`);

      // 1. Buscar en Firebase
      const transaction = await this._getTransaction(transactionId);
      
      if (!transaction) {
        return { success: false, error: 'Transacción no encontrada' };
      }

      // 2. Obtener configuración del gateway
      const gatewayConfig = await this._getRestaurantGatewayConfig(restaurantId);

      // 3. Consultar estado actual en el gateway
      const result = await this.gatewayManager.getTransactionStatus(
        transaction.gateway,
        gatewayConfig.credentials,
        transactionId
      );

      // 4. Actualizar Firebase si el estado cambió
      if (result.success && result.status !== transaction.status) {
        await this._updateTransactionStatus(
          transactionId,
          result.status,
          result.data
        );
      }

      return result;

    } catch (error) {
      console.error('❌ Error consultando estado:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================
  // MÉTODOS PRIVADOS (Helpers)
  // ==========================================

  /**
   * Obtiene la configuración del gateway de pago de un restaurante
   * @private
   */
  async _getRestaurantGatewayConfig(restaurantId) {
    try {
      console.log(`   🔍 [_getRestaurantGatewayConfig] Buscando config para: ${restaurantId}`);
      
      // Usar el nuevo servicio de configuración de pagos
      const config = await paymentConfigService.getConfig(restaurantId, true);
      
      console.log(`   📊 [_getRestaurantGatewayConfig] Config recibida:`, config);
      
      if (!config) {
        console.log(`   ⚠️  [_getRestaurantGatewayConfig] No hay configuración de pagos para restaurante: ${restaurantId}`);
        return null;
      }
      
      console.log(`   ✅ [_getRestaurantGatewayConfig] Configuración encontrada:`, {
        enabled: config.enabled,
        gateway: config.gateway,
        hasCredentials: !!config.credentials
      });
      
      // Retornar en el formato esperado por el código
      const result = {
        enabled: config.enabled,
        gateway: config.gateway,
        credentials: config.credentials
      };
      
      console.log(`   🔄 [_getRestaurantGatewayConfig] Retornando:`, {
        enabled: result.enabled,
        gateway: result.gateway,
        hasCredentials: !!result.credentials
      });
      
      return result;
    } catch (error) {
      console.error(`   ❌ [_getRestaurantGatewayConfig] Error obteniendo configuración del gateway para ${restaurantId}:`, error);
      console.error(`   ❌ [_getRestaurantGatewayConfig] Stack:`, error.stack);
      return null;
    }
  }

  /**
   * Guarda una nueva transacción en Firebase
   * @private
   */
  async _saveTransaction(transactionData) {
    const transactionRef = this.db.ref(`transactions/${transactionData.transactionId}`);
    await transactionRef.set(transactionData);
    console.log(`💾 Transacción ${transactionData.transactionId} guardada en Firebase`);
  }

  /**
   * Obtiene una transacción por su ID
   * @private
   */
  async _getTransaction(transactionId) {
    try {
      const snapshot = await this.db.ref(`transactions/${transactionId}`).once('value');
      const data = snapshot.val();
      return data ? { id: transactionId, ...data } : null;
    } catch (error) {
      console.error('Error obteniendo transacción:', error);
      return null;
    }
  }

  /**
   * Obtiene una transacción por su referencia
   * @private
   */
  async _getTransactionByReference(reference) {
    try {
      const snapshot = await this.db.ref('transactions')
        .orderByChild('reference')
        .equalTo(reference)
        .once('value');
      
      const data = snapshot.val();
      if (!data) return null;
      
      const transactionId = Object.keys(data)[0];
      return { id: transactionId, ...data[transactionId] };
    } catch (error) {
      console.error('Error obteniendo transacción por referencia:', error);
      return null;
    }
  }

  /**
   * Obtiene una transacción por su payment link ID (el ID que Wompi retorna al crear el link)
   * @private
   */
  async _getTransactionByPaymentLinkId(paymentLinkId) {
    try {
      console.log(`   🔍 Buscando transacción con paymentLinkId: ${paymentLinkId}`);
      const snapshot = await this.db.ref('transactions')
        .orderByChild('paymentLinkId')
        .equalTo(paymentLinkId)
        .once('value');
      
      const data = snapshot.val();
      if (!data) {
        console.log(`   ⚠️  No se encontró transacción con paymentLinkId: ${paymentLinkId}`);
        return null;
      }
      
      const transactionId = Object.keys(data)[0];
      console.log(`   ✅ Transacción encontrada por paymentLinkId: ${transactionId}`);
      return { id: transactionId, ...data[transactionId] };
    } catch (error) {
      console.error('❌ Error obteniendo transacción por paymentLinkId:', error);
      return null;
    }
  }

  /**
   * Obtiene una transacción por su Wompi Transaction ID (el ID que Wompi envía en el webhook)
   * @private
   */
  async _getTransactionByWompiTransactionId(wompiTransactionId) {
    try {
      console.log(`   🔍 Buscando transacción con wompiTransactionId: ${wompiTransactionId}`);
      const snapshot = await this.db.ref('transactions')
        .orderByChild('wompiTransactionId')
        .equalTo(wompiTransactionId)
        .once('value');
      
      const data = snapshot.val();
      if (!data) {
        console.log(`   ⚠️  No se encontró transacción con wompiTransactionId: ${wompiTransactionId}`);
        return null;
      }
      
      const transactionId = Object.keys(data)[0];
      console.log(`   ✅ Transacción encontrada por wompiTransactionId: ${transactionId}`);
      return { id: transactionId, ...data[transactionId] };
    } catch (error) {
      console.error('❌ Error obteniendo transacción por wompiTransactionId:', error);
      return null;
    }
  }

  /**
   * Obtiene una transacción por su Transaction ID interno
   * @private
   */
  async _getTransactionByTransactionId(transactionId) {
    try {
      console.log(`   🔍 Buscando transacción con transactionId: ${transactionId}`);
      const snapshot = await this.db.ref('transactions')
        .orderByChild('transactionId')
        .equalTo(transactionId)
        .once('value');
      
      const data = snapshot.val();
      if (!data) {
        console.log(`   ⚠️  No se encontró transacción con transactionId: ${transactionId}`);
        return null;
      }
      
      const txId = Object.keys(data)[0];
      console.log(`   ✅ Transacción encontrada por transactionId: ${txId}`);
      return { id: txId, ...data[txId] };
    } catch (error) {
      console.error('❌ Error obteniendo transacción por transactionId:', error);
      return null;
    }
  }

  /**
   * Actualiza el estado de una transacción
   * @private
   */
  async _updateTransactionStatus(transactionId, status, data = {}) {
    const updates = {
      status,
      updatedAt: Date.now(),
      ...data,
    };
    
    await this.db.ref(`transactions/${transactionId}`).update(updates);
    console.log(`📝 Transacción ${transactionId} actualizada: ${status}`);
  }

  /**
   * Crea el pedido en el sistema KDS del restaurante
   * @private
   */
  async _createOrderInKDS(transaction) {
    try {
      console.log(`\n🍽️ [_createOrderInKDS] Creando pedido en KDS...`);
      console.log(`   Pedido: ${transaction.orderId}`);
      console.log(`   Restaurante: ${transaction.restaurantId}`);
      
      // Obtener datos completos del pedido temporal de Firebase
      const orderSnapshot = await this.db.ref(`orders/${transaction.orderId}`).once('value');
      const existingOrder = orderSnapshot.val();
      
      if (!existingOrder) {
        console.error(`❌ [_createOrderInKDS] No se encontró el pedido temporal: ${transaction.orderId}`);
        throw new Error(`Pedido temporal no encontrado: ${transaction.orderId}`);
      }
      
      console.log(`📝 [_createOrderInKDS] Pedido temporal encontrado:`, {
        id: existingOrder.id,
        items: existingOrder.items?.length,
        total: existingOrder.total
      });
      
      // Obtener número hex del orderId (ej: "tenant123_ABC123_timestamp" -> "ABC123")
      const numeroHex = transaction.orderId.split('_')[1] || transaction.orderId.substring(0, 6).toUpperCase();
      
      // Obtener nombre del restaurante
      const tenantService = require('./tenant-service');
      const tenant = await tenantService.getTenantById(transaction.restaurantId);
      const restaurantName = tenant?.restaurant?.name || 'Restaurante';
      
      // Construir objeto del pedido para KDS (mismo formato que confirmarPedido efectivo)
      const kdsOrder = {
        id: numeroHex, // 🔥 Usar el número hex corto, no el orderId completo
        tenantId: transaction.restaurantId,
        cliente: existingOrder.cliente || transaction.customerPhone,
        telefono: existingOrder.telefono || transaction.customerPhone,
        telefonoContacto: existingOrder.telefonoContacto || transaction.customerPhone,
        direccion: existingOrder.direccion || 'No especificada',
        items: existingOrder.items || [],
        total: existingOrder.total || transaction.amount / 100, // Convertir de centavos a pesos
        estado: 'pendiente', // 🔥 Estado inicial del pedido en KDS
        timestamp: Date.now(),
        fecha: new Date().toISOString(),
        fuente: 'whatsapp',
        restaurante: restaurantName,
        paymentStatus: 'PAID', // 🔥 Ya está pagado
        metodoPago: 'tarjeta',
      };
      
      console.log(`📝 [_createOrderInKDS] Datos del pedido a guardar:`, {
        id: kdsOrder.id,
        tenantId: kdsOrder.tenantId,
        items: kdsOrder.items?.length,
        total: kdsOrder.total,
        path: `tenants/${transaction.restaurantId}/pedidos`
      });
      
      // 🔥 Guardar en el path correcto del KDS: tenants/{restaurantId}/pedidos
      const pedidoRef = this.db.ref(`tenants/${transaction.restaurantId}/pedidos`);
      const pedidoSnapshot = await pedidoRef.push(kdsOrder);
      const pedidoKey = pedidoSnapshot.key;
      
      console.log(`✅ [_createOrderInKDS] Pedido creado en KDS exitosamente`);
      console.log(`   Path: tenants/${transaction.restaurantId}/pedidos/${pedidoKey}`);
      console.log(`   Número: #${numeroHex}`);
      
      // Incrementar estadísticas del tenant
      const tenantServiceInstance = require('./tenant-service');
      await tenantServiceInstance.incrementOrderStats(transaction.restaurantId);
      
    } catch (error) {
      console.error('❌ [_createOrderInKDS] Error creando pedido en KDS:', error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de pago de un pedido
   * @private
   */
  async _updateOrderPaymentStatus(orderId, paymentStatus) {
    await this.db.ref(`orders/${orderId}`).update({
      paymentStatus,
      updatedAt: Date.now(),
    });
    console.log(`📝 Pedido ${orderId} actualizado: ${paymentStatus}`);
  }

  /**
   * Envía una notificación al cliente vía WhatsApp
   * @private
   */
  async _notifyCustomer(transaction, status) {
    try {
      console.log(`\n📲 [_notifyCustomer] Enviando notificación para ${transaction.customerPhone}`);
      console.log(`   Estado: ${status}`);
      console.log(`   Pedido: ${transaction.orderId}`);
      console.log(`   Restaurante: ${transaction.restaurantId}`);
      
      // Importar el servicio de Baileys
      const baileys = require('./baileys');
      
      // Verificar si el restaurante está conectado a WhatsApp
      const isConnected = await baileys.isConnected(transaction.restaurantId);
      
      if (!isConnected) {
        console.warn(`⚠️ [_notifyCustomer] Restaurante ${transaction.restaurantId} no está conectado a WhatsApp`);
        return;
      }
      
      // 🔥 Usar el número de WhatsApp original del chat (no el teléfono de contacto)
      const whatsappNumber = transaction.whatsappPhone || transaction.customerPhone;
      console.log(`📱 [_notifyCustomer] Enviando al número de WhatsApp: ${whatsappNumber}`);
      
      // Obtener información del tenant para nombre del restaurante
      const tenantService = require('./tenant-service');
      const tenant = await tenantService.getTenantById(transaction.restaurantId);
      const restaurantName = tenant?.restaurant?.name || 'Restaurante';
      
      // Obtener detalles del pedido de Firebase
      const orderSnapshot = await this.db.ref(`orders/${transaction.orderId}`).once('value');
      const order = orderSnapshot.val();
      
      // Extraer número de pedido corto (hex)
      const orderParts = transaction.orderId.split('_');
      const orderNumber = orderParts.length >= 2 ? orderParts[1] : transaction.orderId.slice(-6);
      
      // Construir mensaje según el estado
      let message = '';
      
      if (status === 'APPROVED') {
        // 🎉 PAGO APROBADO - Confirmar pedido completo
        const totalCOP = (transaction.amount / 100).toLocaleString('es-CO');
        const telefonoContacto = order?.telefonoContacto || transaction.customerPhone;
        const direccion = order?.direccion || 'No especificada';
        
        // Formatear teléfono
        const telefonoFormateado = telefonoContacto.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
        
        message = `🎉 *¡Tu pedido está confirmado!*\n\n`;
        message += `✅ *Pago recibido exitosamente*\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `� *Detalles de tu pedido:*\n\n`;
        message += `� Número de pedido: *#${orderNumber}*\n`;
        message += `� Dirección: ${direccion}\n`;
        message += `� Teléfono de contacto: ${telefonoFormateado}\n`;
        message += `💰 Total pagado: *$${totalCOP}*\n`;
        message += `� Método de pago: Tarjeta (Pagado)\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `👨‍🍳 Ya lo enviamos a la cocina de *${restaurantName}*. 🛵\n\n`;
        
        // Obtener tiempo de entrega configurado
        const tiempoEntrega = await obtenerTiempoEntrega(transaction.restaurantId);
        message += `🕒 Tiempo estimado: *${tiempoEntrega}*\n\n`;
        message += `_Te avisaremos cuando esté listo para entrega_ ✅\n\n`;
        message += `¡Gracias por tu compra! 🙏`;
        
      } else if (status === 'PENDING') {
        message = `⏳ *Pago en proceso*\n\n`;
        message += `Tu pago está siendo procesado por el banco.\n\n`;
        message += `Pedido: *#${orderNumber}*\n\n`;
        message += `Te notificaremos cuando se confirme. ⏱️`;
        
      } else if (status === 'DECLINED') {
        // ❌ PAGO RECHAZADO
        message = `❌ *No se pudo completar el pago*\n\n`;
        message += `Tu pago fue rechazado por el banco o cancelado.\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `📋 Pedido: *#${orderNumber}*\n`;
        message += `💰 Monto: *$${(transaction.amount / 100).toLocaleString('es-CO')}*\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `🔄 *¿Quieres intentar nuevamente?*\n\n`;
        message += `Puedes volver a hacer tu pedido escribiendo:\n`;
        message += `📝 *menu* - Para ver el menú\n`;
        message += `🛒 *carrito* - Para ver tu carrito\n\n`;
        message += `💬 Si necesitas ayuda, escribe *ayuda*`;
        
      } else if (status === 'ERROR') {
        // 🔴 ERROR EN EL PAGO
        message = `🔴 *Error procesando el pago*\n\n`;
        message += `Hubo un problema técnico al procesar tu pago.\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `📋 Pedido: *#${orderNumber}*\n`;
        message += `💰 Monto: *$${(transaction.amount / 100).toLocaleString('es-CO')}*\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `Por favor, intenta nuevamente en unos minutos.\n\n`;
        message += `Si el problema persiste:\n`;
        message += `📝 *menu* - Para hacer un nuevo pedido\n`;
        message += `💬 *ayuda* - Para asistencia inmediata\n\n`;
        message += `¡Estamos aquí para ayudarte! 🆘`;
      }
      
      if (!message) {
        console.warn(`⚠️ [_notifyCustomer] Estado desconocido: ${status}`);
        return;
      }
      
      console.log(`📱 [_notifyCustomer] Enviando mensaje por WhatsApp...`);
      
      // Enviar mensaje usando Baileys al número de WhatsApp del chat
      const result = await baileys.sendMessage(
        transaction.restaurantId,
        whatsappNumber, // 🔥 Usar el número de WhatsApp del chat
        { text: message },
        { humanize: true }
      );
      
      if (result.success) {
        console.log(`✅ [_notifyCustomer] Mensaje enviado exitosamente`);
      } else {
        console.error(`❌ [_notifyCustomer] Error enviando mensaje:`, result.error);
      }
      
    } catch (error) {
      console.error('❌ [_notifyCustomer] Error enviando notificación:', error);
    }
  }
}

// Exportar instancia singleton
module.exports = new PaymentService();
