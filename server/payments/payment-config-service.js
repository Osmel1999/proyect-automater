/**
 * Payment Config Service - Gestión de Configuración de Pagos
 * 
 * Este servicio maneja la persistencia de configuraciones de pago
 * de cada restaurante en Firebase, incluyendo:
 * - Activación/desactivación de pagos online
 * - Gateway seleccionado
 * - Credenciales encriptadas
 * - Logs de auditoría
 */

const admin = require('firebase-admin');
const encryptionService = require('./encryption-service');

class PaymentConfigService {
  constructor() {
    this.db = admin.database();
    console.log('✅ PaymentConfigService inicializado');
  }

  /**
   * Guarda la configuración de pagos de un restaurante
   * @param {string} tenantId - ID del tenant/restaurante
   * @param {Object} config - Configuración a guardar
   * @returns {Promise<Object>} Configuración guardada
   */
  async saveConfig(tenantId, config) {
    try {
      const { enabled, gateway, credentials } = config;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`💾 GUARDANDO CONFIGURACIÓN DE PAGOS`);
      console.log(`   Tenant: ${tenantId}`);
      console.log(`   Gateway: ${gateway}`);
      console.log(`   Enabled: ${enabled}`);
      console.log(`${'='.repeat(60)}\n`);

      // Validar datos requeridos
      if (!tenantId) {
        throw new Error('tenantId es requerido');
      }

      if (!gateway) {
        throw new Error('gateway es requerido');
      }

      // Encriptar credenciales
      let encryptedCredentials = null;
      if (credentials && Object.keys(credentials).length > 0) {
        console.log('🔐 Encriptando credenciales...');
        encryptedCredentials = encryptionService.encrypt(credentials);
        console.log('✅ Credenciales encriptadas');
      }

      // Preparar objeto de configuración
      const paymentConfig = {
        enabled: enabled !== false, // Por defecto true
        gateway: gateway,
        credentials: encryptedCredentials,
        updatedAt: Date.now(),
        updatedBy: 'dashboard', // Puede ser 'dashboard', 'api', 'admin', etc.
      };

      // Guardar en Firebase
      const configRef = this.db.ref(`tenants/${tenantId}/paymentConfig`);
      await configRef.set(paymentConfig);

      console.log('✅ Configuración guardada en Firebase');
      console.log(`   Path: tenants/${tenantId}/paymentConfig`);

      // Guardar log de auditoría
      await this.saveAuditLog(tenantId, 'CONFIG_UPDATED', {
        gateway,
        enabled,
        hasCredentials: !!encryptedCredentials
      });

      // Retornar configuración (sin credenciales desencriptadas)
      return {
        tenantId,
        enabled: paymentConfig.enabled,
        gateway: paymentConfig.gateway,
        updatedAt: paymentConfig.updatedAt,
        hasCredentials: !!encryptedCredentials
      };

    } catch (error) {
      console.error('❌ Error guardando configuración de pagos:', error);
      throw error;
    }
  }

  /**
   * Obtiene la configuración de pagos de un restaurante
   * @param {string} tenantId - ID del tenant/restaurante
   * @param {boolean} includeCredentials - Si debe incluir credenciales desencriptadas
   * @returns {Promise<Object|null>} Configuración o null si no existe
   */
  async getConfig(tenantId, includeCredentials = true) {
    try {
      console.log(`      🔍 [getConfig] Buscando configuración para tenantId: ${tenantId}`);
      console.log(`      🔍 [getConfig] includeCredentials: ${includeCredentials}`);
      console.log(`      🔍 [getConfig] Path: tenants/${tenantId}/paymentConfig`);
      
      const configRef = this.db.ref(`tenants/${tenantId}/paymentConfig`);
      const snapshot = await configRef.once('value');
      
      console.log(`      📊 [getConfig] snapshot.exists(): ${snapshot.exists()}`);
      
      if (!snapshot.exists()) {
        console.log(`      ⚠️  [getConfig] No existe configuración en Firebase para tenantId: ${tenantId}`);
        return null;
      }

      const config = snapshot.val();
      console.log(`      📊 [getConfig] Configuración encontrada:`, {
        enabled: config.enabled,
        gateway: config.gateway,
        hasCredentials: !!config.credentials,
        updatedAt: config.updatedAt
      });

      // Si no se requieren credenciales, retornar sin ellas
      if (!includeCredentials || !config.credentials) {
        console.log(`      🔄 [getConfig] Retornando sin credenciales desencriptadas`);
        return {
          tenantId,
          enabled: config.enabled,
          gateway: config.gateway,
          updatedAt: config.updatedAt,
          hasCredentials: !!config.credentials
        };
      }

      // Desencriptar credenciales
      console.log(`      🔐 [getConfig] Desencriptando credenciales...`);
      let credentials = null;
      if (config.credentials) {
        try {
          credentials = encryptionService.decrypt(config.credentials);
          console.log(`      ✅ [getConfig] Credenciales desencriptadas exitosamente`);
          console.log(`      📊 [getConfig] Claves en credenciales:`, Object.keys(credentials));
        } catch (error) {
          console.error('      ❌ [getConfig] Error desencriptando credenciales:', error);
          console.error('      ❌ [getConfig] Stack:', error.stack);
          // No fallar, solo retornar sin credenciales
          credentials = null;
        }
      }

      const result = {
        tenantId,
        enabled: config.enabled,
        gateway: config.gateway,
        credentials: credentials,
        updatedAt: config.updatedAt,
        hasCredentials: !!config.credentials
      };
      
      console.log(`      🔄 [getConfig] Retornando configuración completa:`, {
        tenantId: result.tenantId,
        enabled: result.enabled,
        gateway: result.gateway,
        hasCredentials: !!result.credentials,
        credentialKeys: result.credentials ? Object.keys(result.credentials) : []
      });

      return result;

    } catch (error) {
      console.error('      ❌ [getConfig] Error obteniendo configuración de pagos:', error);
      console.error('      ❌ [getConfig] Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Verifica si un restaurante tiene pagos online habilitados
   * @param {string} tenantId - ID del tenant/restaurante
   * @returns {Promise<boolean>} True si tiene pagos habilitados
   */
  async isPaymentEnabled(tenantId) {
    try {
      const config = await this.getConfig(tenantId, false);
      return config && config.enabled && config.hasCredentials;
    } catch (error) {
      console.error('❌ Error verificando si pagos están habilitados:', error);
      return false;
    }
  }

  /**
   * Desactiva los pagos online de un restaurante
   * @param {string} tenantId - ID del tenant/restaurante
   * @returns {Promise<void>}
   */
  async disablePayment(tenantId) {
    try {
      console.log(`🔴 Desactivando pagos para tenant: ${tenantId}`);
      
      const configRef = this.db.ref(`tenants/${tenantId}/paymentConfig/enabled`);
      await configRef.set(false);
      
      await this.saveAuditLog(tenantId, 'PAYMENT_DISABLED', {});
      
      console.log('✅ Pagos desactivados');
    } catch (error) {
      console.error('❌ Error desactivando pagos:', error);
      throw error;
    }
  }

  /**
   * Activa los pagos online de un restaurante
   * @param {string} tenantId - ID del tenant/restaurante
   * @returns {Promise<void>}
   */
  async enablePayment(tenantId) {
    try {
      console.log(`🟢 Activando pagos para tenant: ${tenantId}`);
      
      // Verificar que tenga credenciales configuradas
      const config = await this.getConfig(tenantId, false);
      if (!config || !config.hasCredentials) {
        throw new Error('No se pueden activar pagos sin credenciales configuradas');
      }
      
      const configRef = this.db.ref(`tenants/${tenantId}/paymentConfig/enabled`);
      await configRef.set(true);
      
      await this.saveAuditLog(tenantId, 'PAYMENT_ENABLED', {});
      
      console.log('✅ Pagos activados');
    } catch (error) {
      console.error('❌ Error activando pagos:', error);
      throw error;
    }
  }

  /**
   * Guarda un log de auditoría de cambios en configuración
   * @param {string} tenantId - ID del tenant
   * @param {string} action - Acción realizada
   * @param {Object} details - Detalles adicionales
   * @returns {Promise<void>}
   */
  async saveAuditLog(tenantId, action, details) {
    try {
      const logRef = this.db.ref(`tenants/${tenantId}/paymentAuditLogs`).push();
      await logRef.set({
        action,
        details,
        timestamp: Date.now(),
        source: 'payment-config-service'
      });
    } catch (error) {
      console.warn('⚠️  Error guardando audit log:', error.message);
      // No fallar por error en logs
    }
  }

  /**
   * Obtiene el historial de cambios de configuración
   * @param {string} tenantId - ID del tenant
   * @param {number} limit - Límite de registros (default: 50)
   * @returns {Promise<Array>} Array de logs
   */
  async getAuditLogs(tenantId, limit = 50) {
    try {
      const logsRef = this.db.ref(`tenants/${tenantId}/paymentAuditLogs`)
        .orderByChild('timestamp')
        .limitToLast(limit);
      
      const snapshot = await logsRef.once('value');
      
      if (!snapshot.exists()) {
        return [];
      }

      const logs = [];
      snapshot.forEach((child) => {
        logs.push({
          id: child.key,
          ...child.val()
        });
      });

      // Ordenar por timestamp descendente (más reciente primero)
      return logs.reverse();

    } catch (error) {
      console.error('❌ Error obteniendo audit logs:', error);
      return [];
    }
  }
}

// Exportar como singleton
module.exports = new PaymentConfigService();
