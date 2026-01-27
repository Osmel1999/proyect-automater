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
        transactionId: result.transactionId,
        gateway: gatewayConfig.gateway,
        reference: paymentData.reference,
        amount,
        customerPhone,
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

      console.log(`📊 Evento parseado: ${event.status} - ${event.transactionId}`);
      console.log(`📊 Reference del evento: ${event.reference}`);

      // 4. Buscar la transacción en Firebase por la REFERENCIA (no por transaction ID de Wompi)
      const transaction = await this._getTransactionByReference(event.reference);
      
      if (!transaction) {
        console.warn(`⚠️ Transacción con referencia ${event.reference} no encontrada en Firebase`);
        console.warn(`   Transaction ID de Wompi: ${event.transactionId}`);
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
      
      // Obtener datos completos del pedido de Firebase (si existen)
      const orderSnapshot = await this.db.ref(`orders/${transaction.orderId}`).once('value');
      const existingOrder = orderSnapshot.val();
      
      // Construir objeto del pedido para KDS
      const kdsOrder = {
        id: transaction.orderId,
        restaurantId: transaction.restaurantId,
        orderNumber: transaction.orderId.split('_')[1] || transaction.orderId.substring(0, 6).toUpperCase(),
        customerName: transaction.customerName,
        customerPhone: transaction.customerPhone,
        total: transaction.amount / 100, // Convertir de centavos a pesos
        paymentStatus: 'PAID',
        paymentMethod: transaction.gateway.toUpperCase(),
        status: 'pending', // Estado inicial en KDS
        createdAt: Date.now(),
        paidAt: Date.now(),
        items: existingOrder?.items || [],
        deliveryAddress: existingOrder?.deliveryAddress || '',
        contactPhone: existingOrder?.contactPhone || transaction.customerPhone,
        notes: existingOrder?.notes || '',
        metadata: {
          transactionId: transaction.transactionId,
          paymentReference: transaction.reference,
          gateway: transaction.gateway
        }
      };
      
      // Guardar en la ruta de órdenes del restaurante para KDS
      await this.db.ref(`restaurants/${transaction.restaurantId}/orders/${transaction.orderId}`).set(kdsOrder);
      
      // También actualizar en la ruta global de órdenes
      await this.db.ref(`orders/${transaction.orderId}`).update({
        ...kdsOrder,
        updatedAt: Date.now()
      });
      
      console.log(`✅ [_createOrderInKDS] Pedido creado exitosamente en KDS`);
      
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
      
      // Construir mensaje según el estado
      let message = '';
      
      if (status === 'APPROVED') {
        // Obtener detalles del pedido de Firebase
        const orderSnapshot = await this.db.ref(`orders/${transaction.orderId}`).once('value');
        const order = orderSnapshot.val();
        
        const totalCOP = (transaction.amount / 100).toLocaleString('es-CO');
        
        message = `🎉 *¡Pago confirmado exitosamente!*\n\n`;
        message += `✅ Tu pago de *$${totalCOP}* ha sido procesado correctamente.\n\n`;
        message += `📋 *Detalles de tu pedido:*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🔢 Número de pedido: *#${transaction.orderId}*\n`;
        message += `💰 Total pagado: *$${totalCOP}*\n`;
        message += `🕒 Tiempo estimado: *30-40 minutos*\n`;
        
        if (order && order.deliveryAddress) {
          message += `📍 Dirección de entrega: ${order.deliveryAddress}\n`;
        }
        
        if (order && order.contactPhone) {
          message += `📱 Teléfono de contacto: ${order.contactPhone}\n`;
        }
        
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `👨‍🍳 *Tu pedido está siendo preparado*\n\n`;
        message += `Te avisaremos cuando esté listo para entrega. 🛵\n\n`;
        message += `_¡Gracias por tu compra!_ 🙏`;
        
      } else if (status === 'PENDING') {
        message = `⏳ *Pago en proceso*\n\n`;
        message += `Tu pago está siendo procesado por el banco.\n\n`;
        message += `Pedido: *#${transaction.orderId}*\n\n`;
        message += `Te notificaremos cuando se confirme. ⏱️`;
        
      } else if (status === 'DECLINED') {
        message = `❌ *Pago rechazado*\n\n`;
        message += `Tu pago fue rechazado por el banco.\n\n`;
        message += `Pedido: *#${transaction.orderId}*\n`;
        message += `Monto: *$${(transaction.amount / 100).toLocaleString('es-CO')}*\n\n`;
        message += `Por favor, intenta nuevamente con otro método de pago o contacta a tu banco.\n\n`;
        message += `¿Necesitas ayuda? Escríbenos "ayuda" 💬`;
        
      } else if (status === 'ERROR') {
        message = `🔴 *Error en el pago*\n\n`;
        message += `Hubo un error procesando tu pago.\n\n`;
        message += `Pedido: *#${transaction.orderId}*\n\n`;
        message += `Por favor, intenta nuevamente o contacta a nuestro soporte.\n\n`;
        message += `Escribe "ayuda" para asistencia inmediata. 🆘`;
      }
      
      if (!message) {
        console.warn(`⚠️ [_notifyCustomer] Estado desconocido: ${status}`);
        return;
      }
      
      console.log(`� [_notifyCustomer] Enviando mensaje por WhatsApp...`);
      
      // Enviar mensaje usando Baileys
      const result = await baileys.sendMessage(
        transaction.restaurantId,
        transaction.customerPhone,
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
