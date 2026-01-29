/**
 * Handler de WhatsApp Business API
 * 
 * Maneja el envío y recepción de mensajes usando la WhatsApp Business API
 * Funciona en modo multi-tenant (cada restaurante tiene su propia cuenta)
 */

const axios = require('axios');
const tenantService = require('./tenant-service');
const botLogic = require('./bot-logic');

class WhatsAppHandler {
  constructor() {
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    console.log('✅ WhatsAppHandler inicializado');
  }
  
  /**
   * Envía un mensaje de texto a través de WhatsApp Business API
   * @param {string} tenantId - ID del tenant
   * @param {string} to - Número de teléfono del destinatario (formato internacional)
   * @param {string} message - Mensaje a enviar
   * @returns {Promise<Object>} Respuesta de la API
   */
  async sendTextMessage(tenantId, to, message) {
    try {
      // Obtener credenciales del tenant
      const tenant = await tenantService.getTenantById(tenantId);
      const accessToken = await tenantService.getTenantAccessToken(tenantId);
      const phoneNumberId = tenant.whatsapp.phoneNumberId;
      
      // Construir el cuerpo de la petición
      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''), // Remover caracteres no numéricos
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      };
      
      // Enviar mensaje
      const response = await axios.post(
        `${this.baseUrl}/${phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Mensaje enviado exitosamente a ${to}`);
      console.log(`   📱 Message ID: ${response.data.messages[0].id}`);
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Envía un mensaje con botones interactivos
   * @param {string} tenantId - ID del tenant
   * @param {string} to - Número de teléfono del destinatario
   * @param {string} bodyText - Texto del mensaje
   * @param {Array} buttons - Array de botones (máximo 3)
   * @returns {Promise<Object>} Respuesta de la API
   */
  async sendButtonMessage(tenantId, to, bodyText, buttons) {
    try {
      const tenant = await tenantService.getTenantById(tenantId);
      const accessToken = await tenantService.getTenantAccessToken(tenantId);
      const phoneNumberId = tenant.whatsapp.phoneNumberId;
      
      // Validar botones (máximo 3)
      if (buttons.length > 3) {
        throw new Error('WhatsApp solo permite máximo 3 botones');
      }
      
      // Formatear botones
      const formattedButtons = buttons.map((btn, index) => ({
        type: 'reply',
        reply: {
          id: btn.id || `btn_${index}`,
          title: btn.title.substring(0, 20) // Máximo 20 caracteres
        }
      }));
      
      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: bodyText
          },
          action: {
            buttons: formattedButtons
          }
        }
      };
      
      const response = await axios.post(
        `${this.baseUrl}/${phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Mensaje con botones enviado a ${to}`);
      return response.data;
      
    } catch (error) {
      console.error('❌ Error al enviar mensaje con botones:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Procesa un webhook entrante de WhatsApp
   * @param {Object} webhookBody - Cuerpo del webhook
   * @returns {Promise<void>}
   */
  async processWebhook(webhookBody) {
    try {
      // Validar estructura del webhook
      if (!webhookBody.entry || !webhookBody.entry[0]) {
        console.warn('⚠️ Webhook con estructura inválida');
        return;
      }
      
      const entry = webhookBody.entry[0];
      const changes = entry.changes || [];
      
      for (const change of changes) {
        if (change.field === 'messages') {
          await this.handleMessageChange(change.value);
        } else if (change.field === 'message_status') {
          await this.handleStatusChange(change.value);
        }
      }
      
    } catch (error) {
      console.error('❌ Error al procesar webhook:', error.message);
      throw error;
    }
  }
  
  /**
   * Maneja un cambio de mensaje (nuevo mensaje entrante)
   * @param {Object} value - Datos del cambio
   */
  async handleMessageChange(value) {
    try {
      const phoneNumberId = value.metadata.phone_number_id;
      const botPhoneNumber = value.metadata.display_phone_number; // Número del bot
      const messages = value.messages || [];
      
      // Obtener tenant por phoneNumberId
      const tenant = await tenantService.getTenantByPhoneNumberId(phoneNumberId);
      
      for (const message of messages) {
        // 🛡️ FILTRO ANTI-LOOP: Ignorar mensajes enviados por el bot mismo
        // Si el remitente es el número del bot, ignorar el mensaje
        if (message.from === botPhoneNumber) {
          console.log(`🔄 Mensaje ignorado (enviado por el bot): ${message.id}`);
          console.log(`   Bot: ${botPhoneNumber}`);
          continue; // Saltar este mensaje
        }
        
        console.log(`📩 Nuevo mensaje recibido en tenant: ${tenant.tenantId}`);
        console.log(`   De: ${message.from}`);
        console.log(`   Tipo: ${message.type}`);
        
        // Procesar según el tipo de mensaje
        if (message.type === 'text') {
          await this.handleTextMessage(tenant, message);
        } else if (message.type === 'interactive') {
          await this.handleInteractiveMessage(tenant, message);
        } else {
          console.log(`   ⚠️ Tipo de mensaje no soportado: ${message.type}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error al manejar cambio de mensaje:', error.message);
      // No lanzar error para no bloquear el webhook
    }
  }
  
  /**
   * Maneja un mensaje de texto
   * @param {Object} tenant - Datos del tenant
   * @param {Object} message - Datos del mensaje
   */
  async handleTextMessage(tenant, message) {
    try {
      const from = message.from;
      const text = message.text.body;
      
      console.log(`   💬 Texto: "${text}"`);
      
      // Procesar mensaje con la lógica del bot
      const response = await botLogic.processMessage(tenant.tenantId, from, text);
      
      // Enviar respuesta
      if (response) {
        await this.sendTextMessage(tenant.tenantId, from, response);
      }
      
    } catch (error) {
      console.error('❌ Error al procesar mensaje de texto:', error.message);
    }
  }
  
  /**
   * Maneja un mensaje interactivo (botones, lista)
   * @param {Object} tenant - Datos del tenant
   * @param {Object} message - Datos del mensaje
   */
  async handleInteractiveMessage(tenant, message) {
    try {
      const from = message.from;
      const interactive = message.interactive;
      
      let userInput = '';
      
      if (interactive.type === 'button_reply') {
        userInput = interactive.button_reply.title;
        console.log(`   🔘 Botón presionado: "${userInput}"`);
      } else if (interactive.type === 'list_reply') {
        userInput = interactive.list_reply.title;
        console.log(`   📋 Opción de lista seleccionada: "${userInput}"`);
      }
      
      // Procesar respuesta interactiva
      const response = await botLogic.processMessage(tenant.tenantId, from, userInput);
      
      if (response) {
        await this.sendTextMessage(tenant.tenantId, from, response);
      }
      
    } catch (error) {
      console.error('❌ Error al procesar mensaje interactivo:', error.message);
    }
  }
  
  /**
   * Maneja un cambio de estado de mensaje (entregado, leído, etc.)
   * @param {Object} value - Datos del cambio
   */
  async handleStatusChange(value) {
    try {
      const statuses = value.statuses || [];
      
      for (const status of statuses) {
        console.log(`📊 Estado de mensaje actualizado:`);
        console.log(`   Message ID: ${status.id}`);
        console.log(`   Estado: ${status.status}`);
        console.log(`   Timestamp: ${new Date(status.timestamp * 1000).toISOString()}`);
      }
      
    } catch (error) {
      console.error('❌ Error al manejar cambio de estado:', error.message);
    }
  }
  
  /**
   * Marca un mensaje como leído
   * @param {string} tenantId - ID del tenant
   * @param {string} messageId - ID del mensaje
   */
  async markAsRead(tenantId, messageId) {
    try {
      const tenant = await tenantService.getTenantById(tenantId);
      const accessToken = await tenantService.getTenantAccessToken(tenantId);
      const phoneNumberId = tenant.whatsapp.phoneNumberId;
      
      await axios.post(
        `${this.baseUrl}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Mensaje marcado como leído: ${messageId}`);
      
    } catch (error) {
      console.error('❌ Error al marcar mensaje como leído:', error.message);
      // No lanzar error, no es crítico
    }
  }
}

// Exportar instancia única (Singleton)
module.exports = new WhatsAppHandler();
