/**
 * Backend Node.js para Sistema de Pedidos por WhatsApp
 * Integración: Twilio WhatsApp API + Firebase + KDS
 */

const express = require('express');
const path = require('path');
require('dotenv').config();
const twilioHandler = require('./twilio-handler');

const app = express();
const PORT = process.env.PORT || 3000;

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
// RUTAS DE API
// ====================================

// Webhook de Twilio WhatsApp (recibe mensajes entrantes)
app.post('/webhook/whatsapp', twilioHandler.handleIncoming);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'KDS WhatsApp Backend'
  });
});

// Endpoint para obtener estadísticas (opcional)
app.get('/api/stats', async (req, res) => {
  try {
    // Aquí podrías consultar Firebase para obtener estadísticas
    res.json({
      message: 'Estadísticas del sistema',
      timestamp: new Date().toISOString()
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
  console.log('🚀 SERVIDOR BACKEND KDS + WHATSAPP');
  console.log('━'.repeat(50));
  console.log(`📡 Servidor corriendo en puerto: ${PORT}`);
  console.log(`🌐 URL local: http://localhost:${PORT}`);
  console.log(`📱 Webhook Twilio: ${process.env.BASE_URL || 'http://localhost:' + PORT}/webhook/whatsapp`);
  console.log(`🔥 Firebase: ${process.env.FIREBASE_PROJECT_ID ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`💬 Twilio: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configurado' : '❌ No configurado'}`);
  console.log('━'.repeat(50));
  console.log('');
  console.log('📝 Endpoints disponibles:');
  console.log('   POST /webhook/whatsapp  - Recibir mensajes de WhatsApp');
  console.log('   GET  /health            - Health check');
  console.log('   GET  /api/stats         - Estadísticas del sistema');
  console.log('');
  console.log('🎯 KDS Frontend disponible en: http://localhost:' + PORT + '/kds.html');
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
