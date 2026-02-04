/**
 * Backend Node.js para Sistema de Pedidos por WhatsApp
 * Integración: Baileys (WhatsApp Web) + Firebase + KDS (Multi-tenant SaaS)
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const url = require('url');
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

const tunnelManager = require('./tunnel-manager');
console.log('  ✅ tunnel-manager cargado');

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

// 🌐 Configurar WebSocket Server para Túnel de Navegador
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, request, tenantId) => {
  console.log(`🔌 [Tunnel] Nueva conexión WebSocket: ${tenantId || 'sin ID inicial'}`);
  
  // Obtener información del dispositivo de los headers
  const deviceInfo = {
    tenantId: tenantId || null,
    userAgent: request.headers['user-agent'],
    ip: request.headers['x-forwarded-for'] || request.socket.remoteAddress,
    timestamp: Date.now()
  };

  let currentTenantId = tenantId;
  let isRegistered = false;

  // Si tenemos tenantId, registrar inmediatamente
  if (tenantId) {
    isRegistered = tunnelManager.registerTunnel(ws, deviceInfo);
    if (!isRegistered) {
      ws.close(1008, 'Error al registrar túnel');
      return;
    }
  }

  // Manejar mensajes del navegador
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch(data.type) {
        case 'tunnel.init':
          // Actualizar info del dispositivo
          console.log(`🔧 [Tunnel] Túnel inicializado: ${currentTenantId || 'sin ID'}`);
          if (data.deviceInfo) {
            Object.assign(deviceInfo, data.deviceInfo);
          }
          break;

        case 'tunnel.register':
          // Registro tardío con tenantId
          if (!isRegistered && data.tenantId) {
            currentTenantId = data.tenantId;
            deviceInfo.tenantId = data.tenantId;
            
            console.log(`📝 [Tunnel] Registro tardío: ${data.tenantId}`);
            isRegistered = tunnelManager.registerTunnel(ws, deviceInfo);
            
            if (isRegistered) {
              ws.send(JSON.stringify({ 
                type: 'tunnel.registered', 
                tenantId: data.tenantId,
                timestamp: Date.now()
              }));
            } else {
              ws.send(JSON.stringify({ 
                type: 'tunnel.error', 
                error: 'Error al registrar túnel'
              }));
            }
          }
          break;

        case 'ping':
          // Responder pong y actualizar heartbeat
          if (currentTenantId) {
            tunnelManager.updateHeartbeat(currentTenantId);
          }
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'pong':
          // Actualizar heartbeat
          if (currentTenantId) {
            tunnelManager.updateHeartbeat(currentTenantId);
          }
          break;

        case 'proxy.response':
          // Respuesta de request HTTP
          tunnelManager.handleProxyResponse(data.requestId, {
            status: data.status,
            headers: data.headers,
            body: data.body
          });
          break;

        case 'proxy.error':
          // Error en request HTTP
          tunnelManager.handleProxyError(data.requestId, data.error);
          break;

        default:
          console.warn(`⚠️ [Tunnel] Mensaje desconocido: ${data.type}`);
      }
    } catch (error) {
      console.error('❌ [Tunnel] Error procesando mensaje:', error);
    }
  });

  // Manejar cierre de conexión
  ws.on('close', (code, reason) => {
    console.log(`🔌 [Tunnel] Conexión cerrada: ${currentTenantId || 'sin ID'}`);
    console.log(`   📝 Code: ${code}, Reason: ${reason || 'unknown'}`);
    if (currentTenantId) {
      tunnelManager.unregisterTunnel(currentTenantId, reason || 'connection_closed');
    }
  });

  // Manejar errores
  ws.on('error', (error) => {
    console.error(`❌ [Tunnel] Error en WebSocket: ${currentTenantId || 'sin ID'}`, error);
    if (currentTenantId) {
      tunnelManager.unregisterTunnel(currentTenantId, 'websocket_error');
    }
  });
});

// Manejar upgrade de HTTP a WebSocket
server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;
  
  if (pathname === '/tunnel') {
    // Extraer tenantId de query params (opcional en conexión inicial)
    const query = url.parse(request.url, true).query;
    const tenantId = query.tenantId || null;

    console.log(`🔄 [Tunnel] Upgrade a WebSocket: ${tenantId || 'sin tenant ID inicial'}`);
    
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, tenantId);
    });
  } else {
    // Dejar que otros handlers manejen otros paths
    console.warn(`⚠️ [Tunnel] Upgrade desconocido: ${pathname}`);
    socket.destroy();
  }
});

console.log('✅ WebSocket Server configurado en /tunnel');

// 🌐 Inicializar Proxy Manager (Anti-Ban)
const proxyManager = require('./baileys/proxy-manager');
console.log('🌐 Inicializando Proxy Manager (Anti-Ban)...');
proxyManager.initialize()
  .then(() => {
    console.log('✅ Proxy Manager inicializado correctamente');
  })
  .catch(err => {
    console.error('⚠️ Error inicializando Proxy Manager:', err.message);
    console.log('⚠️ Continuando sin proxies - todos los bots usarán la misma IP');
  });

// Middleware
app.use(express.urlencoded({ extended: false, limit: '15mb' }));
app.use(express.json({ limit: '15mb' }));

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

// Ruta para tracking de pedidos - sirve track.html con cualquier token
app.get('/track/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'track.html'));
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
// RUTAS DE API - PANEL DE ADMINISTRACIÓN
// ====================================

const adminRoutes = require('./routes/admin-routes');
app.use('/api/admin', adminRoutes);
console.log('🛡️ Rutas de admin registradas en /api/admin');

// ====================================
// RUTAS DE API - TÚNEL (Anti-Ban)
// ====================================

/**
 * Obtener estado del túnel para un tenant
 */
app.get('/api/tunnel/status/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;
    const tunnelInfo = tunnelManager.getTunnelInfo(tenantId);
    
    if (!tunnelInfo) {
      return res.json({
        success: true,
        hasTunnel: false,
        tenantId
      });
    }

    res.json({
      success: true,
      hasTunnel: true,
      tunnel: tunnelInfo
    });

  } catch (error) {
    console.error('Error obteniendo estado de túnel:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno'
    });
  }
});

/**
 * Notificar desconexión del túnel (llamado desde frontend)
 */
app.post('/api/tunnel/disconnected', express.json(), (req, res) => {
  try {
    const { tenantId, timestamp, reason } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId requerido'
      });
    }

    console.log(`📡 [API] Notificación de desconexión: ${tenantId}`);
    console.log(`   💡 Razón: ${reason || 'unknown'}`);

    // El tunnel manager ya debe haber detectado la desconexión
    // pero confirmamos y emitimos evento
    if (tunnelManager.hasTunnel(tenantId)) {
      tunnelManager.unregisterTunnel(tenantId, reason || 'frontend_notification');
    }

    res.json({
      success: true,
      message: 'Desconexión registrada',
      fallbackActive: true
    });

  } catch (error) {
    console.error('Error procesando desconexión:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno'
    });
  }
});

/**
 * Obtener estadísticas del túnel
 */
app.get('/api/tunnel/stats', (req, res) => {
  try {
    const stats = tunnelManager.getStats();
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de túnel:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno'
    });
  }
});

console.log('✅ Rutas de túnel registradas en /api/tunnel');

// ====================================
// RUTAS DE API - TRACKING DE PEDIDOS
// ====================================

const trackingRoutes = require('./routes/tracking-routes');
app.use('/api/tracking', trackingRoutes);
console.log('📦 Rutas de tracking registradas en /api/tracking');

// ====================================
// RUTAS DE API - PROXY STATS (Anti-Ban)
// ====================================

/**
 * GET /api/proxy/stats
 * Obtiene estadísticas de uso de proxies
 */
app.get('/api/proxy/stats', (req, res) => {
  try {
    const stats = proxyManager.getProxyStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error obteniendo stats de proxy:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de proxies'
    });
  }
});
console.log('🌐 Ruta de proxy stats registrada en /api/proxy/stats');

// ====================================
// RUTAS DE API - EXTRACCION DE MENU CON IA
// ====================================

const menuExtractRoutes = require('./routes/menu-extract-routes');
app.use('/api/menu', menuExtractRoutes);
console.log('🤖 Rutas de extraccion de menu registradas en /api/menu');

// ====================================
// INICIALIZAR BOT LOGIC CON BAILEYS
// ====================================

// Inicializar Bot Logic con Baileys
const baileys = require('./baileys');
const botLogic = require('./bot-logic');
const firebaseService = require('./firebase-service');
const notificationService = require('./notification-service');
const wompiService = require('./wompi-service');
const eventHandlers = baileys.getEventHandlers();

console.log('🤖 Inicializando Bot Logic con Baileys...');

// Inicializar servicio de notificaciones con baileys y wompi
notificationService.init(baileys, wompiService);
console.log('🔔 Servicio de notificaciones inicializado (con Wompi para enlaces de pago)');

// Ejecutar verificación de membresías al iniciar (con delay para dar tiempo a conexiones)
setTimeout(() => {
  notificationService.checkAllMemberships();
}, 30000); // 30 segundos después del inicio

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
      
      // Manejar respuestas múltiples (Modo Pedido Rápido y otros casos)
      if (response.type === 'multiple' && Array.isArray(response.messages)) {
        console.log(`📨 [DEBUG] Enviando ${response.messages.length} mensajes múltiples`);
        
        let allSuccess = true;
        for (let i = 0; i < response.messages.length; i++) {
          const msg = response.messages[i];
          const messageToSend = typeof msg === 'string' ? { text: msg } : msg;
          
          console.log(`🔍 [DEBUG] Enviando mensaje ${i + 1}/${response.messages.length}:`, 
            messageToSend.text?.substring(0, 50) + '...');
          
          // Enviar con humanización (solo marcar como leído en el último mensaje)
          const result = await baileys.sendMessage(
            tenantId, 
            from, 
            messageToSend, 
            { 
              humanize: true,
              messageKey: i === response.messages.length - 1 ? messageKey : null
            }
          );
          
          if (!result || !result.success) {
            console.error(`❌ Error enviando mensaje ${i + 1}:`, result);
            allSuccess = false;
          } else {
            console.log(`✅ Mensaje ${i + 1} enviado correctamente`);
          }
          
          // Pequeña pausa entre mensajes para evitar rate limiting
          if (i < response.messages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log(`📨 Envío múltiple completado: ${allSuccess ? 'Todos exitosos' : 'Algunos fallaron'}`);
        return allSuccess ? true : null;
      }
      
      // Respuesta simple (un solo mensaje)
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
  console.log(`   🔧 Túnel de Navegador: ✅ Habilitado (Anti-Ban)`);
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
  console.log('📝 Endpoints - Túnel (Anti-Ban):');
  console.log('   WS   /tunnel?tenantId=xxx      - WebSocket del túnel');
  console.log('   GET  /api/tunnel/status/:id    - Estado del túnel');
  console.log('   POST /api/tunnel/disconnected  - Notificar desconexión');
  console.log('   GET  /api/tunnel/stats         - Estadísticas del túnel');
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
  tunnelManager.cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  tunnelManager.cleanup();
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
