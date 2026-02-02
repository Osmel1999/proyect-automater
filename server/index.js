/**
 * Backend Node.js para Sistema de Pedidos por WhatsApp
 * Integración: Baileys (WhatsApp Web) + Firebase + KDS (Multi-tenant SaaS)
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

// Servicios
console.log('📥 Cargando servicios...');

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
// Permite acceder a /whatsapp-connect en lugar de /whatsapp-connect.html
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
// RUTAS DE API - TENANTS
// ====================================

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
// RUTAS DE API - MEMBRESÍAS (Wompi + Recomendaciones)
// ====================================

const membershipRoutes = require('./routes/wompi-routes');
app.use('/api/membership', membershipRoutes);
console.log('✅ Rutas de membresías registradas en /api/membership');

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
  console.log(`   📱 Baileys (WhatsApp): ✅ Habilitado`);
  console.log(`   🔐 Cifrado: ${process.env.ENCRYPTION_KEY ? '✅ Configurado' : '❌ No configurado'}`);
  console.log('');
  console.log('━'.repeat(50));
  console.log('📝 Endpoints - Baileys (WhatsApp):');
  console.log('   POST /api/baileys/start        - Iniciar sesión WhatsApp (QR)');
  console.log('   POST /api/baileys/logout       - Cerrar sesión');
  console.log('   GET  /api/baileys/status       - Estado de conexión');
  console.log('   POST /api/baileys/send         - Enviar mensaje');
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
  console.log('🌐 URLs Importantes:');
  console.log(`   📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`   🍽️  KDS: http://localhost:${PORT}/kds.html`);
  console.log(`   🏠 Inicio: http://localhost:${PORT}/index.html`);
  console.log(`   📱 WhatsApp Connect: http://localhost:${PORT}/whatsapp-connect.html`);
  console.log('');
  console.log('� Para conectar WhatsApp:');
  console.log('   1. Abre el dashboard');
  console.log('   2. Haz clic en "Conectar WhatsApp"');
  console.log('   3. Escanea el código QR con tu teléfono');
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
