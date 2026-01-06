/**
 * Manejador de webhooks de Twilio WhatsApp
 * Procesa mensajes entrantes y coordina respuestas
 */

const twilio = require('twilio');
const botLogic = require('./bot-logic');

// Validación de credenciales
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER; // ej: whatsapp:+14155238886

if (!accountSid || !authToken || !twilioNumber) {
  console.error('⚠️  ADVERTENCIA: Variables de Twilio no configuradas');
  console.error('   Configura: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER');
}

const client = twilio(accountSid, authToken);

/**
 * Maneja mensajes entrantes desde Twilio
 */
async function handleIncoming(req, res) {
  try {
    console.log('\n📩 Mensaje entrante de WhatsApp');
    console.log('━'.repeat(50));
    
    // Extraer datos del mensaje
    const from = req.body.From; // ej: whatsapp:+5491112345678
    const to = req.body.To;     // ej: whatsapp:+14155238886
    const body = req.body.Body; // texto del mensaje
    const messageId = req.body.MessageSid;
    
    console.log(`📱 De: ${from}`);
    console.log(`💬 Mensaje: ${body}`);
    console.log(`🆔 ID: ${messageId}`);
    
    // Procesar el mensaje con la lógica del bot
    const respuesta = await botLogic.procesarMensaje(from, body);
    
    console.log(`📤 Respuesta: ${respuesta.substring(0, 100)}...`);
    console.log('━'.repeat(50));
    
    // Enviar respuesta usando TwiML (formato de Twilio)
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(respuesta);
    
    res.type('text/xml');
    res.send(twiml.toString());
    
  } catch (error) {
    console.error('❌ Error procesando mensaje:', error);
    
    // Enviar respuesta de error al usuario
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('⚠️ Disculpa, hubo un error. Por favor intenta de nuevo en un momento.');
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
}

/**
 * Envía un mensaje proactivo (opcional, para notificaciones)
 */
async function enviarMensaje(destinatario, mensaje) {
  try {
    // Asegurar formato correcto: whatsapp:+numero
    if (!destinatario.startsWith('whatsapp:')) {
      destinatario = `whatsapp:${destinatario}`;
    }
    
    const message = await client.messages.create({
      body: mensaje,
      from: twilioNumber,
      to: destinatario
    });
    
    console.log(`✅ Mensaje enviado: ${message.sid}`);
    return message;
    
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    throw error;
  }
}

/**
 * Envía una imagen (opcional, para enviar menú visual)
 */
async function enviarImagen(destinatario, mensaje, urlImagen) {
  try {
    if (!destinatario.startsWith('whatsapp:')) {
      destinatario = `whatsapp:${destinatario}`;
    }
    
    const message = await client.messages.create({
      body: mensaje,
      from: twilioNumber,
      to: destinatario,
      mediaUrl: [urlImagen]
    });
    
    console.log(`✅ Imagen enviada: ${message.sid}`);
    return message;
    
  } catch (error) {
    console.error('❌ Error enviando imagen:', error);
    throw error;
  }
}

module.exports = {
  handleIncoming,
  enviarMensaje,
  enviarImagen
};
