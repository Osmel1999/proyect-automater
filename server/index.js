/**
 * Backend Node.js para Sistema de Pedidos por WhatsApp
 * Integración: WhatsApp Business API + Firebase + KDS (Multi-tenant SaaS)
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

console.log('🚀 Iniciando servidor KDS WhatsApp SaaS...');
console.log(`📦 Puerto configurado: ${process.env.PORT || 3000}`);

// Cargar configuración dual
const dualConfig = require('../dual-config');

// Servicios
// const twilioHandler = require('./twilio-handler'); // REMOVIDO - Ya no usamos Twilio, ahora WhatsApp Business API
console.log('📥 Cargando servicios...');

const whatsappHandler = require('./whatsapp-handler');
console.log('  ✅ whatsapp-handler cargado');

const tenantService = require('./tenant-service');
console.log('  ✅ tenant-service cargado');

const encryptionService = require('./encryption-service');
console.log('  ✅ encryption-service cargado');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

console.log('✅ Todos los servicios cargados correctamente');

// Inicializar WebSocket handler
const BaileysWebSocketHandler = require('./websocket/baileys-socket');
const wsHandler = new BaileysWebSocketHandler(io);

// Hacer wsHandler disponible globalmente para que otros módulos puedan emitir eventos
global.baileysWebSocket = wsHandler;

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// CORS middleware - permitir requests desde el frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Middleware para rutas limpias (sin .html)
// Permite acceder a /onboarding en lugar de /onboarding.html
app.use((req, res, next) => {
  // Si la ruta no tiene extensión y no es una ruta de API
  if (!req.path.includes('.') && !req.path.startsWith('/api/')) {
    const htmlPath = path.join(__dirname, '..', req.path + '.html');
    const fs = require('fs');
    
    // Verificar si existe el archivo .html correspondiente
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }
  }
  next();
});

// Servir archivos estáticos del KDS Frontend
app.use(express.static(path.join(__dirname, '..')));

// ====================================
// RUTAS DE API - WHATSAPP BUSINESS API (Multi-tenant)
// ====================================

/**
 * Callback de OAuth después de Embedded Signup (LEGACY)
 * Usa la configuración del portfolio antiguo (1473689432774278)
 * Este es un endpoint de backup para pruebas con la configuración anterior
 */
app.get('/api/whatsapp/callback-legacy', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🕐 [${timestamp}] CALLBACK LEGACY REQUEST`);
  console.log(`   Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log(`   Query params:`, req.query);
  console.log(`   Headers:`, {
    'user-agent': req.get('user-agent'),
    'referer': req.get('referer'),
    'x-forwarded-for': req.get('x-forwarded-for')
  });
  
  try {
    const { code, mode } = req.query;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Código de autorización no proporcionado' 
      });
    }
    
    console.log('🔄 CALLBACK LEGACY recibido');
    console.log(`   Portfolio: ${dualConfig.getConfig('legacy').portfolio.name}`);
    console.log(`   Portfolio ID: ${dualConfig.getConfig('legacy').portfolio.id}`);
    console.log(`   App ID: ${dualConfig.getConfig('legacy').facebook.appId}`);
    
    if (mode === 'migrate') {
      console.log('🔄 Cliente migrando número existente (LEGACY)');
    } else if (mode === 'new') {
      console.log('✨ Cliente registrando número nuevo (LEGACY)');
    }
    
    console.log(`   Authorization Code: ${code.substring(0, 20)}...`);
    
    // Usar credenciales legacy
    const legacyConfig = dualConfig.getConfig('legacy');
    const appId = legacyConfig.facebook.appId;
    const appSecret = process.env.WHATSAPP_APP_SECRET_LEGACY || process.env.WHATSAPP_APP_SECRET;
    
    // Intercambiar código por access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        code: code
      }
    });
    
    const accessToken = tokenResponse.data.access_token;
    
    console.log('✅ Access token obtenido exitosamente (LEGACY)');
    
    // Obtener información de la cuenta de WhatsApp Business
    const debugResponse = await axios.get('https://graph.facebook.com/v21.0/debug_token', {
      params: {
        input_token: accessToken,
        access_token: `${appId}|${appSecret}`
      }
    });
    
    const debugData = debugResponse.data.data;
    const wabId = debugData.granular_scopes?.find(s => s.scope === 'whatsapp_business_management')?.target_ids?.[0];
    
    // Obtener el Phone Number ID
    const accountResponse = await axios.get(`https://graph.facebook.com/v21.0/${wabId}/phone_numbers`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const phoneData = accountResponse.data.data[0];
    const phoneNumberId = phoneData.id;
    const phoneNumber = phoneData.display_phone_number;
    
    console.log('📱 Información de WhatsApp obtenida (LEGACY):');
    console.log(`   WABA ID: ${wabId}`);
    console.log(`   Phone Number ID: ${phoneNumberId}`);
    console.log(`   Número: ${phoneNumber}`);
    
    // Registrar número
    console.log('🔐 Registrando número en WhatsApp Business API (LEGACY)...');
    
    try {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      
      await axios.post(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/register`,
        {
          messaging_product: 'whatsapp',
          pin: pin
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Número registrado exitosamente! (LEGACY)');
      console.log(`   PIN de seguridad: ${pin}`);
      
    } catch (registerError) {
      console.warn('⚠️ Advertencia al registrar número (LEGACY):', registerError.response?.data || registerError.message);
      console.log('   Continuando con el onboarding...');
    }
    
    // Crear tenant en Firebase con indicador de configuración legacy
    const tenant = await tenantService.createTenant({
      whatsappBusinessAccountId: wabId,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappPhoneNumber: phoneNumber,
      accessToken: accessToken,
      restaurantName: 'Mi Restaurante (Legacy)', 
      ownerEmail: null,
      onboardingMode: mode || 'unknown',
      configType: 'legacy', // Marcar como legacy
      portfolioId: legacyConfig.portfolio.id
    });
    
    console.log('🎉 Onboarding LEGACY completado exitosamente!');
    
    // Redirigir a página de éxito
    const frontendUrl = process.env.FRONTEND_URL || 'https://kdsapp.site';
    res.redirect(`${frontendUrl}/onboarding-success.html?tenantId=${tenant.tenantId}&mode=${mode || 'unknown'}&config=legacy`);
    
  } catch (error) {
    console.error('❌ Error en callback LEGACY de OAuth:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      code: code?.substring(0, 30) + '...'
    });
    const frontendUrl = process.env.FRONTEND_URL || 'https://kdsapp.site';
    res.redirect(`${frontendUrl}/onboarding-2.html?error=oauth_failed`);
  }
});

/**
 * Callback de OAuth después de Embedded Signup
 * Recibe el código de autorización y lo intercambia por tokens
 */
app.get('/api/whatsapp/callback', async (req, res) => {
  try {
    const { code, mode } = req.query; // mode puede ser 'migrate' o 'new'
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Código de autorización no proporcionado' 
      });
    }
    
    // Log del modo de onboarding
    if (mode === 'migrate') {
      console.log('🔄 Cliente migrando número existente de WhatsApp Business');
    } else if (mode === 'new') {
      console.log('✨ Cliente registrando número nuevo de WhatsApp Business');
    } else {
      console.log('📩 Callback recibido (modo no especificado)');
    }
    
    console.log(`   Authorization Code: ${code.substring(0, 20)}...`);
    
    // Intercambiar código por access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: process.env.WHATSAPP_APP_ID,
        client_secret: process.env.WHATSAPP_APP_SECRET,
        code: code
      }
    });
    
    const accessToken = tokenResponse.data.access_token;
    
    console.log('✅ Access token obtenido exitosamente');
    
    // Obtener información de la cuenta de WhatsApp Business
    const debugResponse = await axios.get('https://graph.facebook.com/v21.0/debug_token', {
      params: {
        input_token: accessToken,
        access_token: `${process.env.WHATSAPP_APP_ID}|${process.env.WHATSAPP_APP_SECRET}`
      }
    });
    
    const debugData = debugResponse.data.data;
    const wabId = debugData.granular_scopes?.find(s => s.scope === 'whatsapp_business_management')?.target_ids?.[0];
    
    // Obtener el Phone Number ID
    const accountResponse = await axios.get(`https://graph.facebook.com/v21.0/${wabId}/phone_numbers`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const phoneData = accountResponse.data.data[0];
    const phoneNumberId = phoneData.id;
    const phoneNumber = phoneData.display_phone_number;
    
    console.log('📱 Información de WhatsApp obtenida:');
    console.log(`   WABA ID: ${wabId}`);
    console.log(`   Phone Number ID: ${phoneNumberId}`);
    console.log(`   Número: ${phoneNumber}`);
    console.log(`   Modo de onboarding: ${mode || 'no especificado'}`);
    
    // ===================================================================
    // 🔑 ACTIVAR NÚMERO AUTOMÁTICAMENTE (Resolver estado "Pending")
    // ===================================================================
    console.log('🔐 Registrando número en WhatsApp Business API...');
    
    try {
      // Generar PIN único de 6 dígitos para este tenant
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      
      await axios.post(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/register`,
        {
          messaging_product: 'whatsapp',
          pin: pin
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Número registrado exitosamente!');
      console.log(`   PIN de seguridad: ${pin}`);
      console.log(`   Estado del número: CONNECTED`);
      
      // Guardar el PIN en Firebase para referencia futura (opcional)
      // Este PIN puede ser útil si el cliente necesita migrar el número después
      
    } catch (registerError) {
      // Si el registro falla, no bloqueamos el onboarding
      // El número puede estar ya registrado o en proceso
      console.warn('⚠️ Advertencia al registrar número:', registerError.response?.data || registerError.message);
      console.log('   Continuando con el onboarding...');
    }
    
    // Crear tenant en Firebase
    const tenant = await tenantService.createTenant({
      whatsappBusinessAccountId: wabId,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappPhoneNumber: phoneNumber,
      accessToken: accessToken,
      restaurantName: 'Mi Restaurante', // Esto se puede pedir en el frontend
      ownerEmail: null,
      onboardingMode: mode || 'unknown' // Guardar el modo de onboarding
    });
    
    console.log('🎉 Onboarding completado exitosamente!');
    
    // Redirigir a página de éxito en Firebase Hosting (frontend)
    const frontendUrl = process.env.FRONTEND_URL || 'https://kdsapp.site';
    res.redirect(`${frontendUrl}/onboarding-success.html?tenantId=${tenant.tenantId}&mode=${mode || 'unknown'}`);

    
  } catch (error) {
    console.error('❌ Error en callback de OAuth:', error.response?.data || error.message);
    const frontendUrl = process.env.FRONTEND_URL || 'https://kdsapp.site';
    res.redirect(`${frontendUrl}/onboarding.html?error=oauth_failed`);
  }
});

/**
 * Webhook de WhatsApp Business API (LEGACY)
 * Recibe mensajes entrantes y eventos de estado para configuración legacy
 */
app.post('/webhook/whatsapp-legacy', async (req, res) => {
  try {
    console.log('📩 Webhook LEGACY recibido de WhatsApp Business API');
    console.log(`   Portfolio: ${dualConfig.getConfig('legacy').portfolio.name}`);
    
    // Procesar webhook (usa el mismo handler, solo cambia el origen)
    await whatsappHandler.processWebhook(req.body, 'legacy');
    
    // Responder rápidamente (requerido por WhatsApp)
    res.sendStatus(200);
    
  } catch (error) {
    console.error('❌ Error procesando webhook LEGACY:', error.message);
    res.sendStatus(500);
  }
});

/**
 * Verificación del webhook de WhatsApp (LEGACY)
 * Meta envía esto para verificar que el webhook es válido
 */
app.get('/webhook/whatsapp-legacy', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log('🔍 Verificación de webhook LEGACY recibida');
  console.log(`   Mode: ${mode}`);
  console.log(`   Token: ${token}`);
  
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'kds_webhook_token_2026';
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook LEGACY verificado exitosamente');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Verificación de webhook LEGACY fallida');
    res.sendStatus(403);
  }
});

/**
 * Webhook de WhatsApp Business API
 * Recibe mensajes entrantes y eventos de estado
 */
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    console.log('📩 Webhook recibido de WhatsApp Business API');
    
    // Procesar webhook
    await whatsappHandler.processWebhook(req.body);
    
    // Responder rápidamente (requerido por WhatsApp)
    res.sendStatus(200);
    
  } catch (error) {
    console.error('❌ Error procesando webhook:', error.message);
    res.sendStatus(500);
  }
});

/**
 * Verificación del webhook de WhatsApp
 * Meta envía esto para verificar que el webhook es válido
 */
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log('🔍 Verificación de webhook recibida');
  
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado correctamente');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Verificación de webhook fallida');
    res.sendStatus(403);
  }
});

/**
 * Obtener información de un tenant
 */
app.get('/api/tenant/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await tenantService.getTenantById(tenantId);
    
    res.json({
      success: true,
      tenant
    });
    
  } catch (error) {
    console.error('Error obteniendo tenant:', error.message);
    res.status(404).json({ 
      success: false, 
      error: 'Tenant no encontrado' 
    });
  }
});

/**
 * Listar todos los tenants activos
 */
app.get('/api/tenants', async (req, res) => {
  try {
    const tenants = await tenantService.listTenants();
    
    res.json({
      success: true,
      count: tenants.length,
      tenants
    });
    
  } catch (error) {
    console.error('Error listando tenants:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener tenants' 
    });
  }
});

/**
 * Enviar mensaje de prueba (para video de revisión de Meta)
 */
app.post('/api/send-test-message', async (req, res) => {
  try {
    const { tenantId, to, message } = req.body;
    
    console.log('📤 Enviando mensaje de prueba...');
    console.log(`   Tenant: ${tenantId}`);
    console.log(`   To: ${to}`);
    console.log(`   Message: ${message}`);
    
    // Validar campos requeridos
    if (!tenantId || !to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: tenantId, to, message'
      });
    }
    
    // Obtener tenant y access token
    const tenant = await tenantService.getTenantById(tenantId);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant no encontrado'
      });
    }
    
    if (!tenant.whatsapp || !tenant.whatsapp.phoneNumberId) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp no configurado para este tenant'
      });
    }
    
    // Obtener access token desencriptado
    const accessToken = await tenantService.getTenantAccessToken(tenantId);
    
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: 'No se pudo obtener el access token'
      });
    }
    
    // Limpiar número de teléfono (remover + y espacios)
    const cleanPhoneNumber = to.replace(/[^0-9]/g, '');
    
    // Enviar mensaje usando WhatsApp Business API
    const whatsappApiUrl = `https://graph.facebook.com/v21.0/${tenant.whatsapp.phoneNumberId}/messages`;
    
    const response = await axios.post(
      whatsappApiUrl,
      {
        messaging_product: 'whatsapp',
        to: cleanPhoneNumber,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Mensaje enviado exitosamente');
    console.log('   Message ID:', response.data.messages[0].id);
    
    res.json({
      success: true,
      messageId: response.data.messages[0].id,
      message: 'Mensaje enviado exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error enviando mensaje de prueba:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data.error?.message || 'Error al enviar mensaje',
        details: error.response.data
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ====================================
// RUTAS LEGACY (Twilio - REMOVIDO)
// ====================================

// Ya no usamos Twilio, ahora usamos WhatsApp Business API
// app.post('/webhook/twilio', twilioHandler.handleIncoming);

// ====================================
// RUTAS DE API - BAILEYS (WhatsApp Multi-Device)
// ====================================

const baileysRoutes = require('./routes/baileys-routes');
app.use('/api/baileys', baileysRoutes);
console.log('✅ Rutas de Baileys registradas en /api/baileys');

// ====================================
// RUTAS DE API - PAGOS (Multi-Gateway)
// ====================================

// Rate limiter para webhooks de pago (prevenir ataques)
const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // Máximo 100 requests por minuto por IP
  message: 'Demasiados requests de webhook, intenta de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para endpoints de prueba
const testRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // Máximo 10 requests por 5 minutos
  message: 'Demasiados requests de prueba, intenta de nuevo más tarde',
});

const paymentRoutes = require('./routes/payments');
app.use('/api/payments', webhookRateLimiter, paymentRoutes);
console.log('✅ Rutas de pagos registradas en /api/payments');

// ====================================
// INICIALIZAR BOT LOGIC CON BAILEYS
// ====================================

// Inicializar Bot Logic con Baileys
const baileys = require('./baileys');
const botLogic = require('./bot-logic');
const firebaseService = require('./firebase-service');
const eventHandlers = baileys.getEventHandlers();

console.log('🤖 Inicializando Bot Logic con Baileys...');

// Registrar callback global para procesar mensajes entrantes
eventHandlers.onMessage('*', async (message) => {
  console.log(`🔍 [DEBUG] Callback global ejecutado`);
  console.log(`🔍 [DEBUG] Mensaje recibido en callback:`, JSON.stringify(message, null, 2));
  
  try {
    const tenantId = message.tenantId || 'default';
    const from = message.from;
    const text = message.text || '';
    const messageKey = message.raw?.key; // Extraer messageKey del mensaje original

    console.log(`🤖 Bot procesando mensaje de ${from} en tenant ${tenantId}`);
    console.log(`🔍 [DEBUG] Llamando a botLogic.processMessage`);

    // Procesar mensaje a través de bot-logic
    // bot-logic.js maneja toda la lógica: validación del toggle, onboarding, etc.
    const response = await botLogic.processMessage(tenantId, from, text);

    console.log(`🔍 [DEBUG] Respuesta de botLogic.processMessage:`, response);
    console.log(`🔍 [DEBUG] Tipo de respuesta:`, typeof response);
    console.log(`🔍 [DEBUG] response truthy?:`, !!response);
    console.log(`🔍 [DEBUG] response === null?:`, response === null);
    console.log(`🔍 [DEBUG] response === undefined?:`, response === undefined);
    console.log(`🔍 [DEBUG] response length:`, response?.length);

    // Si hay respuesta, enviarla
    if (response) {
      console.log(`🔍 [DEBUG] Enviando respuesta a ${from}`);
      
      // Convertir el texto de respuesta a un objeto de mensaje
      const messageToSend = typeof response === 'string' ? { text: response } : response;
      
      console.log(`🔍 [DEBUG] Mensaje a enviar:`, messageToSend);
      
      // Enviar con humanización y messageKey para marcar como leído
      const result = await baileys.sendMessage(
        tenantId, 
        from, 
        messageToSend, 
        { 
          humanize: true,
          messageKey: messageKey // Pasar messageKey para marcar como leído
        }
      );
      
      console.log(`🔍 [DEBUG] Resultado de sendMessage:`, result);
      
      if (result && result.success) {
        console.log(`✅ Respuesta enviada a ${from}`);
        return true; // Retornar true para indicar que se procesó correctamente
      } else {
        console.error(`❌ Error enviando respuesta:`, result);
        return null; // Retornar null para indicar que hubo un error
      }
    } else {
      console.log(`ℹ️  Sin respuesta (bot desactivado o sin configurar)`);
      return null; // Retornar null cuando el bot está desactivado
    }
  } catch (error) {
    console.error('❌ Error en bot callback:', error);
    console.error('Stack trace:', error.stack);
    return null; // Retornar null en caso de error
  }
});

console.log('✅ Bot Logic inicializado y callback registrado');

// ====================================
// MANEJADOR DE ERRORES GLOBAL
// ====================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'KDS WhatsApp SaaS Backend',
    mode: 'multi-tenant'
  });
});

// Endpoint para obtener estadísticas (opcional)
app.get('/api/stats', async (req, res) => {
  try {
    const tenants = await tenantService.listTenants();
    const totalOrders = tenants.reduce((sum, t) => sum + (t.stats?.totalOrders || 0), 0);
    
    res.json({
      message: 'Estadísticas del sistema',
      timestamp: new Date().toISOString(),
      totalTenants: tenants.length,
      totalOrders: totalOrders
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ====================================
// INICIO DEL SERVIDOR
// ====================================

server.listen(PORT, () => {
  console.log('━'.repeat(50));
  console.log('🚀 SERVIDOR BACKEND KDS + WHATSAPP SAAS');
  console.log('━'.repeat(50));
  console.log(`📡 Servidor corriendo en puerto: ${PORT}`);
  console.log(`🌐 URL local: http://localhost:${PORT}`);
  console.log(`🏢 Modo: Multi-tenant SaaS`);
  console.log(`🔌 WebSocket: Habilitado (Socket.IO)`);
  console.log('');
  console.log('🔧 Servicios configurados:');
  console.log(`   🔥 Firebase: ${process.env.FIREBASE_PROJECT_ID ? '✅ ' + process.env.FIREBASE_PROJECT_ID : '❌ No configurado'}`);
  console.log(`   📱 WhatsApp API: ${process.env.WHATSAPP_APP_ID ? '✅ App ID ' + process.env.WHATSAPP_APP_ID : '❌ No configurado'}`);
  console.log(`   � Cifrado: ${process.env.ENCRYPTION_KEY ? '✅ Configurado' : '❌ No configurado'}`);
  console.log('');
  console.log('━'.repeat(50));
  console.log('📝 Endpoints - WhatsApp Business API:');
  console.log('   GET  /api/whatsapp/callback    - OAuth callback (Embedded Signup)');
  console.log('   POST /webhook/whatsapp         - Webhook de mensajes');
  console.log('   GET  /webhook/whatsapp         - Verificación de webhook');
  console.log('');
  console.log('📝 Endpoints - Tenants:');
  console.log('   GET  /api/tenant/:tenantId     - Información de tenant');
  console.log('   GET  /api/tenants              - Listar todos los tenants');
  console.log('');
  console.log('📝 Endpoints - Pagos (Multi-Gateway):');
  console.log('   POST /api/payments/webhook/:restaurantId/:gateway - Webhook de pago');
  console.log('   GET  /api/payments/status/:transactionId          - Estado de transacción');
  console.log('   POST /api/payments/test                           - Probar gateway');
  console.log('');
  console.log('📝 Endpoints - Sistema:');
  console.log('   GET  /health                   - Health check');
  console.log('   GET  /api/stats                - Estadísticas globales');
  console.log('');
  console.log('━'.repeat(50));
  console.log('� URLs Importantes:');
  console.log(`   🎯 Onboarding: http://localhost:${PORT}/onboarding.html`);
  console.log(`   📊 KDS Dashboard: http://localhost:${PORT}/kds.html`);
  console.log(`   🏠 Landing Page: http://localhost:${PORT}/landing.html`);
  console.log('');
  console.log('📱 Configuración de Webhook en Meta:');
  console.log(`   Callback URL: ${process.env.BASE_URL || 'https://tu-dominio.com'}/webhook/whatsapp`);
  console.log(`   Verify Token: ${process.env.WHATSAPP_VERIFY_TOKEN || '[CONFIGURAR EN .env]'}`);
  console.log('━'.repeat(50));
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rechazada no manejada:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});
