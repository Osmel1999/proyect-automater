/**
 * Wompi Adapter - Integración con Wompi API
 * 
 * Este adapter implementa la interfaz estándar para comunicarse con Wompi.
 * Wompi es una pasarela de pagos colombiana que soporta:
 * - Tarjetas de crédito/débito
 * - PSE (Pagos Seguros en Línea)
 * - Nequi
 * - Bancolombia QR
 * 
 * Documentación: https://docs.wompi.co/
 */

const axios = require('axios');
const crypto = require('crypto');

class WompiAdapter {
  constructor(config = {}) {
    // Configuración del adapter
    this.publicKey = config.publicKey || process.env.WOMPI_PUBLIC_KEY;
    this.privateKey = config.privateKey || process.env.WOMPI_PRIVATE_KEY;
    this.eventSecret = config.eventSecret || process.env.WOMPI_EVENT_SECRET;
    this.integritySecret = config.integritySecret || process.env.WOMPI_INTEGRITY_SECRET;
    this.mode = config.mode || process.env.WOMPI_MODE || 'sandbox';
    
    // URL base según el modo
    this.baseUrl = this.mode === 'production'
      ? 'https://production.wompi.co'
      : 'https://sandbox.wompi.co';
    
    // Validar que las credenciales estén configuradas
    if (!this.publicKey || !this.privateKey) {
      throw new Error('Wompi: Public Key y Private Key son requeridas');
    }
    
    console.log(`✅ WompiAdapter inicializado (modo: ${this.mode})`);
  }

  /**
   * Crea un enlace de pago en Wompi
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>} URL del checkout y ID de transacción
   */
  async createPaymentLink(paymentData) {
    try {
      const {
        reference,
        amount,
        amountInCents,
        currency = 'COP',
        customerEmail,
        customerPhone,
        customerData,
        description,
        redirectUrl,
        metadata = {}
      } = paymentData;

      console.log(`📝 [WompiAdapter] Datos recibidos:`, {
        reference,
        amount,
        amountInCents,
        hasCustomerEmail: !!customerEmail,
        hasCustomerData: !!customerData
      });

      // Validaciones
      if (!reference) throw new Error('reference es requerido');
      
      // Obtener el email del cliente (puede venir en customerEmail o customerData.email)
      const email = customerEmail || customerData?.email;
      if (!email) throw new Error('customerEmail es requerido');
      
      // Obtener el monto en centavos (puede venir como amountInCents o amount en pesos)
      let finalAmountInCents;
      if (amountInCents) {
        finalAmountInCents = amountInCents;
      } else if (amount) {
        // Si viene en pesos, convertir a centavos
        finalAmountInCents = Math.round(amount * 100);
      } else {
        throw new Error('amount o amountInCents es requerido');
      }
      
      if (finalAmountInCents <= 0) {
        throw new Error(`amount debe ser mayor a 0 (recibido: ${finalAmountInCents} centavos)`);
      }

      console.log(`📝 Creando payment link en Wompi...`);
      console.log(`   Reference: ${reference}`);
      console.log(`   Amount: ${finalAmountInCents} centavos (${finalAmountInCents / 100} ${currency})`);
      console.log(`   Email: ${email}`);

      // Construir el payload para Wompi
      const payload = {
        name: description || `Pedido ${reference}`,
        description: description || `Pago de pedido ${reference}`,
        single_use: true, // El link solo se puede usar una vez
        collect_shipping: false, // No recolectar dirección de envío
        amount_in_cents: finalAmountInCents,
        currency: currency,
        redirect_url: redirectUrl || `${process.env.BASE_URL || 'http://localhost:3000'}/payment/success`,
        customer_data: {
          email: email,
          phone_number: customerPhone || customerData?.phoneNumber || '',
          full_name: customerData?.fullName || metadata.customerName || 'Cliente'
        }
      };

      console.log(`📝 Payload para Wompi:`, JSON.stringify(payload, null, 2));

      // Hacer la petición a Wompi
      const response = await axios.post(
        `${this.baseUrl}/v1/payment_links`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.privateKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data.data;

      console.log(`✅ Payment link creado exitosamente`);
      console.log(`   ID: ${data.id}`);
      console.log(`   URL: ${data.permalink}`);

      return {
        paymentUrl: data.permalink,
        transactionId: data.id,
        checkoutId: data.id,
        expiresAt: data.expires_at
      };

    } catch (error) {
      console.error(`❌ Error creando payment link en Wompi:`, error.response?.data || error.message);
      
      if (error.response?.data?.error) {
        const wompiError = error.response.data.error;
        throw new Error(`Wompi: ${wompiError.type} - ${wompiError.messages?.join(', ') || wompiError.reason}`);
      }
      
      throw error;
    }
  }

  /**
   * Valida la firma de un webhook de Wompi
   * @param {Object} payload - Cuerpo del webhook
   * @param {Object} headers - Headers del webhook
   * @returns {Promise<boolean>} True si la firma es válida
   */
  async validateWebhook(payload, headers) {
    try {
      // Obtener la firma del header
      const signature = headers['x-signature'] || headers['X-Signature'];
      const timestamp = headers['x-timestamp'] || headers['X-Timestamp'];

      if (!signature) {
        console.error('❌ Webhook sin firma (header x-signature)');
        return false;
      }

      // Construir el string para verificar
      // Formato: {timestamp}.{body_json}
      const bodyString = typeof payload === 'string' 
        ? payload 
        : JSON.stringify(payload);
      
      const signatureString = `${timestamp}.${bodyString}`;

      // Calcular HMAC SHA256
      const expectedSignature = crypto
        .createHmac('sha256', this.eventSecret)
        .update(signatureString)
        .digest('hex');

      // Comparar firmas
      const isValid = signature === expectedSignature;

      if (!isValid) {
        console.error('❌ Firma de webhook inválida');
        console.error(`   Recibida:  ${signature}`);
        console.error(`   Esperada:  ${expectedSignature}`);
      }

      return isValid;

    } catch (error) {
      console.error('❌ Error validando webhook:', error.message);
      return false;
    }
  }

  /**
   * Parsea un evento de webhook de Wompi y lo normaliza
   * @param {Object} payload - Cuerpo del webhook
   * @returns {Promise<Object>} Evento normalizado
   */
  async parseWebhookEvent(payload) {
    try {
      // Wompi envía eventos en este formato:
      // {
      //   event: "transaction.updated",
      //   data: { transaction: {...} },
      //   sent_at: "2024-01-01T00:00:00Z"
      // }

      const eventType = payload.event;
      const transaction = payload.data?.transaction;

      if (!transaction) {
        throw new Error('Webhook inválido: no contiene datos de transacción');
      }

      // Normalizar el status de Wompi a nuestro formato estándar
      const statusMap = {
        'APPROVED': 'APPROVED',
        'DECLINED': 'DECLINED',
        'VOIDED': 'DECLINED',
        'ERROR': 'DECLINED',
        'PENDING': 'PENDING'
      };

      const normalizedStatus = statusMap[transaction.status] || 'PENDING';

      // Determinar el método de pago
      let paymentMethod = 'Desconocido';
      if (transaction.payment_method_type === 'CARD') {
        paymentMethod = 'Tarjeta';
      } else if (transaction.payment_method_type === 'NEQUI') {
        paymentMethod = 'Nequi';
      } else if (transaction.payment_method_type === 'PSE') {
        paymentMethod = 'PSE';
      } else if (transaction.payment_method_type === 'BANCOLOMBIA_QR') {
        paymentMethod = 'Bancolombia QR';
      }

      return {
        type: eventType,
        status: normalizedStatus,
        transactionId: transaction.id,
        reference: transaction.reference,
        amount: transaction.amount_in_cents / 100,
        currency: transaction.currency,
        paymentMethod: paymentMethod,
        message: transaction.status_message || '',
        timestamp: new Date(payload.sent_at).getTime()
      };

    } catch (error) {
      console.error('❌ Error parseando webhook de Wompi:', error.message);
      throw error;
    }
  }

  /**
   * Consulta el estado de una transacción en Wompi
   * @param {string} transactionId - ID de la transacción
   * @returns {Promise<Object>} Estado de la transacción
   */
  async getTransactionStatus(transactionId) {
    try {
      console.log(`🔍 Consultando transacción ${transactionId} en Wompi...`);

      const response = await axios.get(
        `${this.baseUrl}/v1/transactions/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.publicKey}`
          }
        }
      );

      const transaction = response.data.data;

      // Normalizar status
      const statusMap = {
        'APPROVED': 'APPROVED',
        'DECLINED': 'DECLINED',
        'VOIDED': 'DECLINED',
        'ERROR': 'DECLINED',
        'PENDING': 'PENDING'
      };

      return {
        status: statusMap[transaction.status] || 'PENDING',
        transactionId: transaction.id,
        reference: transaction.reference,
        amount: transaction.amount_in_cents / 100,
        currency: transaction.currency,
        paymentMethod: transaction.payment_method_type,
        message: transaction.status_message || ''
      };

    } catch (error) {
      console.error(`❌ Error consultando transacción en Wompi:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Calcula la firma de integridad para un formulario de pago
   * (Útil si se usa el widget de Wompi directamente)
   * @param {Object} data - Datos del pago
   * @returns {string} Firma de integridad
   */
  calculateIntegritySignature(data) {
    const { reference, amountInCents, currency } = data;
    
    const string = `${reference}${amountInCents}${currency}${this.integritySecret}`;
    
    return crypto
      .createHash('sha256')
      .update(string)
      .digest('hex');
  }

  /**
   * Valida que las credenciales de Wompi sean correctas
   * Hace una petición de prueba a la API para verificar
   * @returns {Promise<boolean>} true si las credenciales son válidas
   */
  async validateCredentials() {
    try {
      console.log('🔍 Validando credenciales de Wompi...');
      
      // Intentar hacer una petición a un endpoint público de Wompi
      // Usamos el endpoint de merchants que requiere autenticación
      const response = await axios.get(
        `${this.baseUrl}/v1/merchants/${this.publicKey}`,
        {
          headers: {
            'Authorization': `Bearer ${this.publicKey}`
          },
          timeout: 10000 // 10 segundos timeout
        }
      );
      
      // Si la petición es exitosa, las credenciales son válidas
      if (response.status === 200 && response.data) {
        console.log('✅ Credenciales de Wompi válidas');
        console.log(`   Merchant: ${response.data.data?.name || 'N/A'}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      // Si hay error de autenticación (401), las credenciales son inválidas
      if (error.response?.status === 401) {
        console.log('❌ Credenciales de Wompi inválidas (401 Unauthorized)');
        throw new Error('Public Key o Private Key incorrectos');
      }
      
      // Si hay error de red, es un problema de conectividad
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        console.log('❌ Error de conexión con Wompi');
        throw new Error('No se pudo conectar con Wompi. Verifica tu conexión a internet.');
      }
      
      // Otros errores
      console.error('❌ Error validando credenciales:', error.message);
      throw new Error(error.response?.data?.error?.reason || error.message);
    }
  }
}

module.exports = WompiAdapter;
