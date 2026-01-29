/**
 * Baileys Message Adapter
 * Convierte mensajes entre formato Baileys y formato interno del sistema
 */

const pino = require('pino');
const sessionManager = require('./session-manager');
const humanization = require('./humanization');

const logger = pino({ level: 'info' });

// Baileys es ESM, se carga dinámicamente
let baileys = null;
let baileysPromise = null;

async function loadBaileys() {
  if (baileys) return baileys;
  if (!baileysPromise) {
    baileysPromise = import('@whiskeysockets/baileys').then((module) => {
      baileys = module;
      return module;
    });
  }
  return baileysPromise;
}

class MessageAdapter {
  /**
   * Convierte un mensaje de Baileys al formato interno del sistema
   * @param {object} baileysMessage - Mensaje en formato Baileys
   * @returns {object} Mensaje en formato interno
   */
  baileysToInternal(baileysMessage) {
    try {
      const message = baileysMessage.message;
      const key = baileysMessage.key;

      // Extraer información básica
      const from = key.remoteJid; // Número del remitente
      const messageId = key.id;
      const timestamp = baileysMessage.messageTimestamp;
      const isFromMe = key.fromMe;

      // Extraer contenido según tipo de mensaje
      let text = null;
      let caption = null;
      let mediaType = null;
      let mediaUrl = null;
      let quotedMessage = null;

      // Mensaje de texto simple
      if (message?.conversation) {
        text = message.conversation;
      }
      // Mensaje de texto extendido
      else if (message?.extendedTextMessage) {
        text = message.extendedTextMessage.text;
        
        // Mensaje citado
        if (message.extendedTextMessage.contextInfo?.quotedMessage) {
          quotedMessage = this.extractQuotedMessage(message.extendedTextMessage.contextInfo);
        }
      }
      // Imagen
      else if (message?.imageMessage) {
        mediaType = 'image';
        caption = message.imageMessage.caption || null;
        text = caption;
      }
      // Video
      else if (message?.videoMessage) {
        mediaType = 'video';
        caption = message.videoMessage.caption || null;
        text = caption;
      }
      // Audio
      else if (message?.audioMessage) {
        mediaType = 'audio';
      }
      // Documento
      else if (message?.documentMessage) {
        mediaType = 'document';
        caption = message.documentMessage.caption || null;
        text = caption;
      }
      // Sticker
      else if (message?.stickerMessage) {
        mediaType = 'sticker';
      }
      // Ubicación
      else if (message?.locationMessage) {
        mediaType = 'location';
        text = `Ubicación: ${message.locationMessage.degreesLatitude}, ${message.locationMessage.degreesLongitude}`;
      }
      // Contacto
      else if (message?.contactMessage) {
        mediaType = 'contact';
        text = message.contactMessage.displayName;
      }

      // Formato interno del sistema
      return {
        id: messageId,
        from: this.formatPhoneNumber(from),
        fromMe: isFromMe,
        timestamp: new Date(timestamp * 1000).toISOString(),
        text: text || '',
        caption,
        mediaType,
        mediaUrl,
        quotedMessage,
        raw: baileysMessage, // Mantener mensaje original por si acaso
        platform: 'baileys'
      };

    } catch (error) {
      logger.error('Error convirtiendo mensaje de Baileys a interno:', error);
      throw error;
    }
  }

  /**
   * Convierte un mensaje interno al formato Baileys
   * @param {object} internalMessage - Mensaje en formato interno
   * @returns {object} Mensaje en formato Baileys
   */
  internalToBaileys(internalMessage) {
    try {
      const { text, image, video, audio, document, buttons, caption } = internalMessage;

      // Mensaje de texto simple
      if (text && !image && !video && !audio && !document) {
        return { text };
      }

      // Mensaje con imagen
      if (image) {
        return {
          image: { url: image },
          caption: caption || text || undefined
        };
      }

      // Mensaje con video
      if (video) {
        return {
          video: { url: video },
          caption: caption || text || undefined
        };
      }

      // Mensaje con audio
      if (audio) {
        return {
          audio: { url: audio },
          mimetype: 'audio/mp4'
        };
      }

      // Mensaje con documento
      if (document) {
        return {
          document: { url: document },
          caption: caption || text || undefined,
          fileName: internalMessage.fileName || 'document.pdf'
        };
      }

      // Mensaje con botones (legacy - WhatsApp los deprecó)
      if (buttons) {
        return {
          text: text || '',
          footer: internalMessage.footer || '',
          buttons: buttons.map((btn, index) => ({
            buttonId: `btn_${index}`,
            buttonText: { displayText: btn },
            type: 1
          }))
        };
      }

      // Fallback: texto simple
      return { text: text || '' };

    } catch (error) {
      logger.error('Error convirtiendo mensaje interno a Baileys:', error);
      throw error;
    }
  }

  /**
   * Envía un mensaje a través de Baileys
   * @param {string} tenantId - ID del tenant
   * @param {string} to - Número destino
   * @param {object} message - Mensaje a enviar
   * @param {object} options - Opciones adicionales
   * @param {object} options.messageKey - Key del mensaje recibido (para marcar como leído)
   * @param {boolean} options.humanize - Si debe aplicar humanización (default: true)
   * @returns {Promise<object>} Resultado del envío
   */
  async sendMessage(tenantId, to, message, options = {}) {
    try {
      const socket = sessionManager.getSession(tenantId);
      
      if (!socket) {
        throw new Error(`No active session for tenant: ${tenantId}`);
      }

      // Formatear número destino
      const jid = this.formatJID(to);

      // Convertir mensaje a formato Baileys
      const baileysMessage = this.internalToBaileys(message);

      // Extraer texto para humanización
      const messageText = message.text || message.caption || '';

      // Aplicar humanización si está habilitada (por defecto: true)
      const shouldHumanize = options.humanize !== false && messageText.length > 0;

      logger.info(`[${tenantId}] Enviando mensaje a ${to} ${shouldHumanize ? '(con humanización)' : '(sin humanización)'}`);

      let result;
      let stats = null;

      if (shouldHumanize) {
        // Usar flujo humanizado completo
        const humanizedResult = await humanization.humanizedResponse(
          socket,
          jid,
          options.messageKey || null,
          messageText,
          {
            skipReadDelay: !options.messageKey, // Si no hay messageKey, no marcar como leído
            skipThinkingDelay: false,
            skipTypingIndicator: false,
            skipTypingDuration: false
          }
        );
        
        result = humanizedResult;
        stats = humanizedResult.stats;
        
        return {
          success: true,
          messageId: humanizedResult.messageId,
          timestamp: new Date().toISOString(),
          to: this.formatPhoneNumber(jid),
          platform: 'baileys',
          humanized: true,
          stats
        };
      } else {
        // Envío directo sin humanización
        result = await socket.sendMessage(jid, baileysMessage);
        
        return {
          success: true,
          messageId: result.key.id,
          timestamp: new Date().toISOString(),
          to: this.formatPhoneNumber(jid),
          platform: 'baileys',
          humanized: false
        };
      }

    } catch (error) {
      logger.error(`[${tenantId}] Error enviando mensaje:`, error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        platform: 'baileys'
      };
    }
  }

  /**
   * Envía una imagen con caption
   * @param {string} tenantId - ID del tenant
   * @param {string} to - Número destino
   * @param {string} imageUrl - URL o buffer de la imagen
   * @param {string} caption - Texto del caption
   * @returns {Promise<object>}
   */
  async sendImage(tenantId, to, imageUrl, caption = '') {
    return this.sendMessage(tenantId, to, {
      image: imageUrl,
      caption
    });
  }

  /**
   * Envía un video con caption
   * @param {string} tenantId - ID del tenant
   * @param {string} to - Número destino
   * @param {string} videoUrl - URL o buffer del video
   * @param {string} caption - Texto del caption
   * @returns {Promise<object>}
   */
  async sendVideo(tenantId, to, videoUrl, caption = '') {
    return this.sendMessage(tenantId, to, {
      video: videoUrl,
      caption
    });
  }

  /**
   * Envía un audio
   * @param {string} tenantId - ID del tenant
   * @param {string} to - Número destino
   * @param {string} audioUrl - URL o buffer del audio
   * @returns {Promise<object>}
   */
  async sendAudio(tenantId, to, audioUrl) {
    return this.sendMessage(tenantId, to, {
      audio: audioUrl
    });
  }

  /**
   * Envía un documento
   * @param {string} tenantId - ID del tenant
   * @param {string} to - Número destino
   * @param {string} documentUrl - URL o buffer del documento
   * @param {string} fileName - Nombre del archivo
   * @param {string} caption - Caption opcional
   * @returns {Promise<object>}
   */
  async sendDocument(tenantId, to, documentUrl, fileName, caption = '') {
    return this.sendMessage(tenantId, to, {
      document: documentUrl,
      fileName,
      caption
    });
  }

  /**
   * Marca un mensaje como leído
   * @param {string} tenantId - ID del tenant
   * @param {object} messageKey - Key del mensaje
   * @param {boolean} humanize - Si debe aplicar delay humanizado (default: true)
   */
  async markAsRead(tenantId, messageKey, humanize = true) {
    try {
      const socket = sessionManager.getSession(tenantId);
      
      if (!socket) {
        throw new Error(`No active session for tenant: ${tenantId}`);
      }

      if (humanize) {
        // Marcar como leído con delay humanizado
        await humanization.humanizedRead(socket, messageKey);
      } else {
        // Marcar como leído inmediatamente
        await socket.readMessages([messageKey]);
        logger.info(`[${tenantId}] Mensaje marcado como leído (sin humanización)`);
      }
      
    } catch (error) {
      logger.error(`[${tenantId}] Error marcando mensaje como leído:`, error);
    }
  }

  /**
   * Descarga el contenido multimedia de un mensaje
   * @param {object} baileysMessage - Mensaje de Baileys
   * @returns {Promise<Buffer>}
   */
  async downloadMedia(baileysMessage) {
    try {
      // Cargar Baileys si no está cargado
      const { downloadMediaMessage } = await loadBaileys();
      
      const buffer = await downloadMediaMessage(
        baileysMessage,
        'buffer',
        {},
        {
          logger: pino({ level: 'silent' }),
          reuploadRequest: sessionManager.getSession.bind(sessionManager)
        }
      );
      
      return buffer;
    } catch (error) {
      logger.error('Error descargando media:', error);
      throw error;
    }
  }

  /**
   * Formatea un número de teléfono a JID de WhatsApp
   * @private
   */
  formatJID(phoneNumber) {
    // Remover caracteres no numéricos
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Si no empieza con código de país, asumir que es local (ajustar según necesidad)
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '1' + cleaned; // Ejemplo: agregar código de país US
    }

    // Agregar sufijo de WhatsApp
    return `${cleaned}@s.whatsapp.net`;
  }

  /**
   * Formatea un JID a número de teléfono legible
   * @private
   */
  formatPhoneNumber(jid) {
    // Extraer solo los números del JID
    const match = jid.match(/(\d+)/);
    return match ? `+${match[1]}` : jid;
  }

  /**
   * Extrae información de un mensaje citado
   * @private
   */
  extractQuotedMessage(contextInfo) {
    const quoted = contextInfo.quotedMessage;
    
    return {
      id: contextInfo.stanzaId,
      participant: this.formatPhoneNumber(contextInfo.participant),
      text: quoted.conversation || 
            quoted.extendedTextMessage?.text || 
            quoted.imageMessage?.caption ||
            quoted.videoMessage?.caption ||
            ''
    };
  }

  /**
   * Verifica si un mensaje es de un bot (para evitar loops)
   * @param {object} baileysMessage - Mensaje de Baileys
   * @returns {boolean}
   */
  isFromBot(baileysMessage) {
    const fromMe = baileysMessage.key.fromMe === true;
    console.log(`🔍 [isFromBot] Verificando mensaje:`, {
      messageId: baileysMessage.key.id,
      fromMe: baileysMessage.key.fromMe,
      result: fromMe
    });
    return fromMe;
  }

  /**
   * Extrae el tipo de mensaje
   * @param {object} baileysMessage - Mensaje de Baileys
   * @returns {string}
   */
  getMessageType(baileysMessage) {
    const message = baileysMessage.message;
    
    if (message?.conversation) return 'text';
    if (message?.extendedTextMessage) return 'text';
    if (message?.imageMessage) return 'image';
    if (message?.videoMessage) return 'video';
    if (message?.audioMessage) return 'audio';
    if (message?.documentMessage) return 'document';
    if (message?.stickerMessage) return 'sticker';
    if (message?.locationMessage) return 'location';
    if (message?.contactMessage) return 'contact';
    
    return 'unknown';
  }
}

// Singleton instance
const messageAdapter = new MessageAdapter();

module.exports = messageAdapter;
