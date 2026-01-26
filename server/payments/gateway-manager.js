/**
 * Gateway Manager - Gestor Central de Pasarelas de Pago
 * 
 * Este módulo abstrae la lógica de múltiples gateways de pago (Wompi, Bold, PayU, etc.)
 * permitiendo al sistema trabajar con cualquier gateway de forma uniforme.
 * 
 * Patrón: Adapter Pattern
 * - Cada gateway tiene su propio adapter con la misma interfaz
 * - El manager selecciona el adapter correcto según la configuración
 */

const WompiAdapter = require('./adapters/wompi-adapter');
// const BoldAdapter = require('./adapters/bold-adapter'); // Implementar después
// const PayUAdapter = require('./adapters/payu-adapter'); // Implementar después

class GatewayManager {
  constructor() {
    // Registro de adapters disponibles
    this.adapters = {
      wompi: WompiAdapter,
      // bold: BoldAdapter,
      // payu: PayUAdapter,
      // mercadopago: MercadoPagoAdapter
    };
    
    console.log('✅ GatewayManager inicializado');
    console.log(`   Adapters disponibles: ${Object.keys(this.adapters).join(', ')}`);
  }

  /**
   * Obtiene una instancia del adapter para el gateway especificado
   * @param {string} gateway - Nombre del gateway ('wompi', 'bold', 'payu')
   * @param {Object} config - Configuración del gateway
   * @returns {Object} Instancia del adapter
   */
  getAdapter(gateway, config = {}) {
    const AdapterClass = this.adapters[gateway];
    
    if (!AdapterClass) {
      throw new Error(`Gateway "${gateway}" no está soportado. Disponibles: ${Object.keys(this.adapters).join(', ')}`);
    }
    
    return new AdapterClass(config);
  }

  /**
   * Crea un enlace de pago usando el gateway especificado
   * @param {string} gateway - Nombre del gateway
   * @param {Object} config - Configuración del gateway
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>} Resultado con URL de pago y ID de transacción
   */
  async createPaymentLink(gateway, config, paymentData) {
    try {
      console.log(`📝 [GatewayManager] Creando enlace de pago con ${gateway}...`);
      console.log(`📝 [GatewayManager] paymentData:`, {
        reference: paymentData.reference,
        amountInCents: paymentData.amountInCents,
        hasCustomerData: !!paymentData.customerData
      });
      
      const adapter = this.getAdapter(gateway, config);
      const result = await adapter.createPaymentLink(paymentData);
      
      console.log(`✅ [GatewayManager] Enlace de pago creado exitosamente`);
      console.log(`   Gateway: ${gateway}`);
      console.log(`   Transaction ID: ${result.transactionId}`);
      console.log(`   Payment URL: ${result.paymentUrl}`);
      
      return {
        success: true,
        gateway: gateway,
        paymentLink: result.paymentUrl, // Usar paymentLink para consistencia
        paymentUrl: result.paymentUrl,  // Mantener paymentUrl por compatibilidad
        transactionId: result.transactionId,
        reference: paymentData.reference
      };
      
    } catch (error) {
      console.error(`❌ [GatewayManager] Error creando enlace de pago con ${gateway}:`, error.message);
      console.error(`❌ [GatewayManager] Stack:`, error.stack);
      
      return {
        success: false,
        gateway: gateway,
        error: error.message,
        reference: paymentData.reference
      };
    }
  }

  /**
   * Valida la firma de un webhook
   * @param {string} gateway - Nombre del gateway
   * @param {Object} config - Configuración del gateway
   * @param {Object} payload - Cuerpo del webhook
   * @param {Object} headers - Headers del webhook
   * @returns {Promise<boolean>} True si la firma es válida
   */
  async validateWebhook(gateway, config, payload, headers) {
    try {
      const adapter = this.getAdapter(gateway, config);
      const isValid = await adapter.validateWebhook(payload, headers);
      
      if (isValid) {
        console.log(`✅ Webhook de ${gateway} validado correctamente`);
      } else {
        console.error(`❌ Firma de webhook de ${gateway} inválida`);
      }
      
      return isValid;
      
    } catch (error) {
      console.error(`❌ Error validando webhook de ${gateway}:`, error.message);
      return false;
    }
  }

  /**
   * Procesa un evento de webhook y lo normaliza
   * @param {string} gateway - Nombre del gateway
   * @param {Object} config - Configuración del gateway
   * @param {Object} payload - Cuerpo del webhook
   * @returns {Promise<Object>} Evento normalizado
   */
  async processWebhookEvent(gateway, config, payload) {
    try {
      const adapter = this.getAdapter(gateway, config);
      const event = await adapter.parseWebhookEvent(payload);
      
      // Normalizar el evento para que tenga la misma estructura
      // sin importar el gateway
      const normalizedEvent = {
        gateway: gateway,
        type: event.type,
        status: event.status, // 'APPROVED', 'DECLINED', 'PENDING'
        transactionId: event.transactionId,
        reference: event.reference,
        amount: event.amount,
        currency: event.currency || 'COP',
        paymentMethod: event.paymentMethod,
        message: event.message || '',
        timestamp: event.timestamp || Date.now()
      };
      
      console.log(`📥 Evento de webhook procesado:`, {
        gateway: normalizedEvent.gateway,
        type: normalizedEvent.type,
        status: normalizedEvent.status,
        reference: normalizedEvent.reference
      });
      
      return normalizedEvent;
      
    } catch (error) {
      console.error(`❌ Error procesando webhook de ${gateway}:`, error.message);
      throw error;
    }
  }

  /**
   * Consulta el estado de una transacción
   * @param {string} gateway - Nombre del gateway
   * @param {Object} config - Configuración del gateway
   * @param {string} transactionId - ID de la transacción
   * @returns {Promise<Object>} Estado de la transacción
   */
  async getTransactionStatus(gateway, config, transactionId) {
    try {
      console.log(`🔍 Consultando estado de transacción en ${gateway}...`);
      
      const adapter = this.getAdapter(gateway, config);
      const status = await adapter.getTransactionStatus(transactionId);
      
      console.log(`✅ Estado obtenido: ${status.status}`);
      
      return {
        success: true,
        gateway: gateway,
        ...status
      };
      
    } catch (error) {
      console.error(`❌ Error consultando transacción en ${gateway}:`, error.message);
      
      return {
        success: false,
        gateway: gateway,
        error: error.message
      };
    }
  }

  /**
   * Obtiene la lista de gateways disponibles
   * @returns {Array<string>} Lista de nombres de gateways
   */
  getAvailableGateways() {
    return Object.keys(this.adapters);
  }

  /**
   * Verifica si un gateway está disponible
   * @param {string} gateway - Nombre del gateway
   * @returns {boolean} True si el gateway está disponible
   */
  isGatewayAvailable(gateway) {
    return gateway in this.adapters;
  }
}

// Exportar como singleton
module.exports = new GatewayManager();
