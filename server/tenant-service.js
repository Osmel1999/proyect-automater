/**
 * Servicio de Gestión de Tenants (Multi-tenancy)
 * 
 * Maneja la creación, actualización y recuperación de tenants (restaurantes)
 * Cada tenant tiene su propia configuración de WhatsApp y datos aislados
 */

const firebaseService = require('./firebase-service');
const encryptionService = require('./encryption-service');

class TenantService {
  constructor() {
    this.db = firebaseService.database;
    this.tenantsRef = this.db.ref('tenants');
    console.log('✅ TenantService inicializado');
  }
  
  /**
   * Crea un nuevo tenant después del onboarding de WhatsApp
   * @param {Object} tenantData - Datos del tenant
   * @returns {Promise<Object>} Tenant creado
   */
  async createTenant(tenantData) {
    try {
      const {
        whatsappBusinessAccountId,
        whatsappPhoneNumberId,
        whatsappPhoneNumber,
        accessToken,
        restaurantName,
        ownerEmail
      } = tenantData;
      
      // Validar datos requeridos
      if (!whatsappBusinessAccountId || !whatsappPhoneNumberId || !accessToken) {
        throw new Error('Datos de WhatsApp incompletos');
      }
      
      // Generar ID único para el tenant
      const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Cifrar el access token
      const encryptedToken = encryptionService.encrypt(accessToken);
      
      // Estructura del tenant
      const tenant = {
        tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        
        // Información del negocio
        restaurant: {
          name: restaurantName || 'Mi Restaurante',
          ownerEmail: ownerEmail || null
        },
        
        // Configuración de WhatsApp
        whatsapp: {
          businessAccountId: whatsappBusinessAccountId,
          phoneNumberId: whatsappPhoneNumberId,
          phoneNumber: whatsappPhoneNumber || null,
          accessToken: encryptedToken, // Token cifrado
          webhookVerified: false,
          lastSync: new Date().toISOString()
        },
        
        // Configuración del sistema
        settings: {
          timezone: 'America/Mexico_City',
          language: 'es',
          currency: 'MXN',
          autoAcceptOrders: false,
          notifications: {
            email: true,
            whatsapp: true
          }
        },
        
        // Estadísticas
        stats: {
          totalOrders: 0,
          ordersToday: 0,
          lastOrderAt: null
        }
      };
      
      // Guardar en Firebase
      await this.tenantsRef.child(tenantId).set(tenant);
      
      console.log(`✅ Tenant creado exitosamente: ${tenantId}`);
      console.log(`   📱 WhatsApp Phone Number ID: ${whatsappPhoneNumberId}`);
      console.log(`   🏪 Restaurante: ${restaurantName}`);
      
      // Retornar tenant sin el token (seguridad)
      return this.getTenantById(tenantId);
      
    } catch (error) {
      console.error('❌ Error al crear tenant:', error.message);
      throw error;
    }
  }
  
  /**
   * Obtiene un tenant por su ID
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Datos del tenant (sin access token)
   */
  async getTenantById(tenantId) {
    try {
      const snapshot = await this.tenantsRef.child(tenantId).once('value');
      
      if (!snapshot.exists()) {
        throw new Error(`Tenant no encontrado: ${tenantId}`);
      }
      
      const tenant = snapshot.val();
      
      // No incluir el access token en la respuesta (seguridad)
      if (tenant.whatsapp && tenant.whatsapp.accessToken) {
        delete tenant.whatsapp.accessToken;
      }
      
      return tenant;
      
    } catch (error) {
      console.error(`❌ Error al obtener tenant ${tenantId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Obtiene un tenant por su WhatsApp Phone Number ID
   * @param {string} phoneNumberId - Phone Number ID de WhatsApp
   * @returns {Promise<Object>} Datos del tenant
   */
  async getTenantByPhoneNumberId(phoneNumberId) {
    try {
      const snapshot = await this.tenantsRef
        .orderByChild('whatsapp/phoneNumberId')
        .equalTo(phoneNumberId)
        .once('value');
      
      if (!snapshot.exists()) {
        throw new Error(`No se encontró tenant con phoneNumberId: ${phoneNumberId}`);
      }
      
      // Obtener el primer resultado
      const tenantData = Object.values(snapshot.val())[0];
      
      return tenantData;
      
    } catch (error) {
      console.error(`❌ Error al buscar tenant por phoneNumberId:`, error.message);
      throw error;
    }
  }
  
  /**
   * Obtiene el access token descifrado de un tenant
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<string>} Access token descifrado
   */
  async getTenantAccessToken(tenantId) {
    try {
      const snapshot = await this.tenantsRef.child(`${tenantId}/whatsapp/accessToken`).once('value');
      
      if (!snapshot.exists()) {
        throw new Error(`Access token no encontrado para tenant: ${tenantId}`);
      }
      
      const encryptedToken = snapshot.val();
      const decryptedToken = encryptionService.decrypt(encryptedToken);
      
      return decryptedToken;
      
    } catch (error) {
      console.error(`❌ Error al obtener access token del tenant ${tenantId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Actualiza el estado del webhook de un tenant
   * @param {string} tenantId - ID del tenant
   * @param {boolean} verified - Estado de verificación
   */
  async updateWebhookStatus(tenantId, verified) {
    try {
      await this.tenantsRef.child(`${tenantId}/whatsapp`).update({
        webhookVerified: verified,
        lastSync: new Date().toISOString()
      });
      
      console.log(`✅ Webhook status actualizado para tenant ${tenantId}: ${verified}`);
      
    } catch (error) {
      console.error(`❌ Error al actualizar webhook status:`, error.message);
      throw error;
    }
  }
  
  /**
   * Incrementa las estadísticas de pedidos de un tenant
   * @param {string} tenantId - ID del tenant
   */
  async incrementOrderStats(tenantId) {
    try {
      const statsRef = this.tenantsRef.child(`${tenantId}/stats`);
      const snapshot = await statsRef.once('value');
      const currentStats = snapshot.val() || {};
      
      await statsRef.update({
        totalOrders: (currentStats.totalOrders || 0) + 1,
        ordersToday: (currentStats.ordersToday || 0) + 1,
        lastOrderAt: new Date().toISOString()
      });
      
      console.log(`📊 Estadísticas actualizadas para tenant ${tenantId}`);
      
    } catch (error) {
      console.error(`❌ Error al actualizar estadísticas:`, error.message);
      throw error;
    }
  }
  
  /**
   * Lista todos los tenants activos
   * @returns {Promise<Array>} Lista de tenants
   */
  async listTenants() {
    try {
      const snapshot = await this.tenantsRef
        .orderByChild('status')
        .equalTo('active')
        .once('value');
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const tenants = [];
      snapshot.forEach((childSnapshot) => {
        const tenant = childSnapshot.val();
        
        // Remover access token
        if (tenant.whatsapp && tenant.whatsapp.accessToken) {
          delete tenant.whatsapp.accessToken;
        }
        
        tenants.push(tenant);
      });
      
      return tenants;
      
    } catch (error) {
      console.error('❌ Error al listar tenants:', error.message);
      throw error;
    }
  }
  
  /**
   * Desactiva un tenant
   * @param {string} tenantId - ID del tenant
   */
  async deactivateTenant(tenantId) {
    try {
      await this.tenantsRef.child(tenantId).update({
        status: 'inactive',
        updatedAt: new Date().toISOString()
      });
      
      console.log(`⏸️ Tenant desactivado: ${tenantId}`);
      
    } catch (error) {
      console.error(`❌ Error al desactivar tenant:`, error.message);
      throw error;
    }
  }
}

// Exportar instancia única (Singleton)
module.exports = new TenantService();
