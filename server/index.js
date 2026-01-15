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
const PORT = process.env.PORT || 3000;

console.log('✅ Todos los servicios cargados correctamente');

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

/**
 * POST Callback para LEGACY - Validación de Portfolio
 * Permite validar que el usuario seleccionó el portfolio correcto
 */
app.post('/api/auth/legacy/callback', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🕐 [${timestamp}] POST LEGACY CALLBACK - Portfolio Validation`);
  
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Código de autorización no proporcionado' 
      });
    }
    
    console.log('🔄 Validando portfolio seleccionado...');
    console.log(`   Authorization Code: ${code.substring(0, 20)}...`);
    
    // Usar credenciales legacy
    const legacyConfig = dualConfig.getConfig('legacy');
    const appId = legacyConfig.facebook.appId;
    const appSecret = process.env.WHATSAPP_APP_SECRET_LEGACY || process.env.WHATSAPP_APP_SECRET;
    const expectedPortfolioId = legacyConfig.portfolio.id;
    
    // Intercambiar código por access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        code: code
      }
    });
    
    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Access token obtenido');
    
    // Obtener información del negocio para detectar portfolio
    const debugResponse = await axios.get('https://graph.facebook.com/v21.0/debug_token', {
      params: {
        input_token: accessToken,
        access_token: `${appId}|${appSecret}`
      }
    });
    
    const debugData = debugResponse.data.data;
    console.log('📊 Debug token data:', JSON.stringify(debugData, null, 2));
    
    // Buscar business_management scope para obtener portfolio ID
    const businessScope = debugData.granular_scopes?.find(s => 
      s.scope === 'business_management' || 
      s.scope === 'whatsapp_business_management'
    );
    
    const selectedPortfolioId = businessScope?.target_ids?.[0];
    
    console.log('🎯 Portfolio detectado:');
    console.log(`   Seleccionado: ${selectedPortfolioId}`);
    console.log(`   Esperado: ${expectedPortfolioId} (${legacyConfig.portfolio.name})`);
    
    // VALIDAR PORTFOLIO
    if (selectedPortfolioId !== expectedPortfolioId) {
      console.warn('❌ Portfolio incorrecto seleccionado');
      
      return res.json({
        success: false,
        wrongPortfolio: true,
        selectedPortfolio: selectedPortfolioId,
        expectedPortfolio: expectedPortfolioId,
        expectedPortfolioName: legacyConfig.portfolio.name,
        message: `Por favor, selecciona el portfolio "${legacyConfig.portfolio.name}" en la ventana de Facebook`
      });
    }
    
    console.log('✅ Portfolio correcto seleccionado!');
    
    // Obtener información de la cuenta de WhatsApp Business
    const wabId = debugData.granular_scopes?.find(s => s.scope === 'whatsapp_business_management')?.target_ids?.[0];
    
    if (!wabId) {
      throw new Error('No se pudo obtener WABA ID del token');
    }
    
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
    
    // Registrar número
    console.log('🔐 Registrando número en WhatsApp Business API...');
    
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
      
      console.log('✅ Número registrado exitosamente!');
      console.log(`   PIN de seguridad: ${pin}`);
      
    } catch (registerError) {
      console.warn('⚠️ Advertencia al registrar número:', registerError.response?.data || registerError.message);
      console.log('   Continuando con el onboarding...');
    }
    
    // Crear tenant en Firebase
    const tenant = await tenantService.createTenant({
      whatsappBusinessAccountId: wabId,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappPhoneNumber: phoneNumber,
      accessToken: accessToken,
      restaurantName: 'Mi Restaurante (Legacy)', 
      ownerEmail: null,
      onboardingMode: 'legacy',
      configType: 'legacy',
      portfolioId: expectedPortfolioId
    });
    
    console.log('🎉 Onboarding LEGACY completado exitosamente!');
    
    res.json({
      success: true,
      tenantId: tenant.tenantId,
      businessId: selectedPortfolioId,
      phoneNumber: phoneNumber,
      message: 'Onboarding completado exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error en POST callback legacy:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});
