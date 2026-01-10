/**
 * Backend Node.js para Sistema de Pedidos por WhatsApp
 * Integración: WhatsApp Business API + Firebase + KDS (Multi-tenant SaaS)
 */

const express = require('express');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

console.log('🚀 Iniciando servidor KDS WhatsApp SaaS...');
console.log(`📦 Puerto configurado: ${process.env.PORT || 3000}`);

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
const PORT = process.env.PORT || 3000;

console.log('✅ Todos los servicios cargados correctamente');

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Servir archivos estáticos del KDS Frontend
app.use(express.static(path.join(__dirname, '..')));

// ====================================
// RUTAS DE API - WHATSAPP BUSINESS API (Multi-tenant)
// ====================================

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

// ====================================
// RUTAS LEGACY (Twilio - REMOVIDO)
// ====================================

// Ya no usamos Twilio, ahora usamos WhatsApp Business API
// app.post('/webhook/twilio', twilioHandler.handleIncoming);

// ====================================
// RUTAS GENERALES
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

app.listen(PORT, () => {
  console.log('━'.repeat(50));
  console.log('🚀 SERVIDOR BACKEND KDS + WHATSAPP SAAS');
  console.log('━'.repeat(50));
  console.log(`📡 Servidor corriendo en puerto: ${PORT}`);
  console.log(`🌐 URL local: http://localhost:${PORT}`);
  console.log(`🏢 Modo: Multi-tenant SaaS`);
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
