#!/usr/bin/env node

/**
 * 🧪 Test de Baileys con Proxy ISP
 * 
 * Este script simula una conexión real de Baileys usando el proxy ISP
 * para validar que todo funcione correctamente antes de ir a producción.
 */

require('dotenv').config();
const { HttpsProxyAgent } = require('https-proxy-agent');
const pino = require('pino');

const logger = pino({ level: 'info' });

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(emoji, color, message) {
  console.log(`${emoji} ${color}${message}${colors.reset}`);
}

async function testProxyConfiguration() {
  console.log('\n' + '='.repeat(70));
  log('🧪', colors.cyan, 'TEST DE CONFIGURACIÓN BAILEYS + PROXY ISP');
  console.log('='.repeat(70) + '\n');

  // Verificar variables de entorno
  log('📋', colors.blue, 'PASO 1: Verificando configuración...\n');

  const requiredVars = [
    'PROXY_TYPE',
    'ISP_PROXY_HOST',
    'ISP_PROXY_PORT',
    'ISP_PROXY_USERNAME',
    'ISP_PROXY_PASSWORD'
  ];

  let allConfigured = true;
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      log('❌', colors.red, `${varName}: NO CONFIGURADO`);
      allConfigured = false;
    } else {
      const displayValue = varName.includes('PASSWORD') ? '****' : value;
      log('✅', colors.green, `${varName}: ${displayValue}`);
    }
  }

  if (!allConfigured) {
    log('\n❌', colors.red, 'Error: Faltan variables de entorno requeridas');
    log('💡', colors.cyan, 'Asegúrate de que tu archivo .env tenga todas las variables configuradas');
    process.exit(1);
  }

  console.log('');

  // Construir URL del proxy
  log('🔧', colors.blue, 'PASO 2: Construyendo URL del proxy...\n');

  const proxyType = process.env.PROXY_TYPE;
  const proxyHost = process.env.ISP_PROXY_HOST;
  const proxyPort = process.env.ISP_PROXY_PORT;
  const proxyUsername = process.env.ISP_PROXY_USERNAME;
  const proxyPassword = process.env.ISP_PROXY_PASSWORD;

  // IMPORTANTE: Los proxies ISP NO requieren sufijo -session-
  // Ya mantienen IP estable por defecto
  let proxyUrl, displayProxyUrl;
  
  if (proxyType === 'isp') {
    // ISP: Usar credenciales directamente SIN sufijo
    proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
    displayProxyUrl = `http://${proxyUsername}:****@${proxyHost}:${proxyPort}`;
    log('✅', colors.green, `Proxy URL: ${displayProxyUrl}`);
    log('🌐', colors.cyan, `ISP Proxy: IP estable nativa (sin sufijo de sesión)`);
  } else {
    // Residential/Datacenter: Agregar sufijo de sesión para IP única
    const testTenantId = 'test-restaurant-001';
    const sessionUsername = `${proxyUsername}-session-${testTenantId}`;
    proxyUrl = `http://${sessionUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
    displayProxyUrl = `http://${sessionUsername}:****@${proxyHost}:${proxyPort}`;
    log('✅', colors.green, `Proxy URL: ${displayProxyUrl}`);
    log('🎯', colors.cyan, `Sesión: ${testTenantId}`);
  }
  
  log('📡', colors.cyan, `Tipo: ${proxyType.toUpperCase()}`);

  console.log('');

  // Crear agente proxy
  log('🔗', colors.blue, 'PASO 3: Creando agente proxy...\n');

  let proxyAgent;
  try {
    proxyAgent = new HttpsProxyAgent(proxyUrl, {
      keepAlive: true,
      keepAliveMsecs: 5000,
      timeout: 90000,
      rejectUnauthorized: false
    });
    log('✅', colors.green, 'Agente proxy creado correctamente');
  } catch (error) {
    log('❌', colors.red, `Error creando agente: ${error.message}`);
    process.exit(1);
  }

  console.log('');

  // Test de conectividad básica
  log('🌐', colors.blue, 'PASO 4: Test de conectividad básica...\n');

  const axios = require('axios');

  try {
    const response = await axios.get('https://api.ipify.org?format=json', {
      httpsAgent: proxyAgent,
      timeout: 15000
    });

    log('✅', colors.green, `IP del proxy: ${response.data.ip}`);
  } catch (error) {
    log('❌', colors.red, `Error de conectividad: ${error.message}`);
    process.exit(1);
  }

  console.log('');

  // Test de WhatsApp Web
  log('💬', colors.blue, 'PASO 5: Test de WhatsApp Web...\n');

  try {
    const start = Date.now();
    const response = await axios.get('https://web.whatsapp.com', {
      httpsAgent: proxyAgent,
      timeout: 15000,
      validateStatus: () => true
    });
    const latency = Date.now() - start;

    if (response.status === 502 || response.status === 503) {
      log('❌', colors.red, `WhatsApp bloqueado por el proxy (HTTP ${response.status})`);
      process.exit(1);
    } else {
      log('✅', colors.green, `Conexión exitosa (HTTP ${response.status}, ${latency}ms)`);
    }
  } catch (error) {
    log('❌', colors.red, `Error conectando a WhatsApp: ${error.message}`);
    process.exit(1);
  }

  console.log('');

  // Simulación de configuración Baileys
  log('⚙️', colors.blue, 'PASO 6: Configuración de Baileys (simulada)...\n');

  const baileysConfig = {
    agent: proxyAgent,
    printQRInTerminal: false,
    browser: ['KDS', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 30000,
    emitOwnEvents: true
  };

  log('✅', colors.green, 'Configuración de Baileys preparada:');
  console.log(`   - Proxy Agent: ${colors.cyan}Configurado${colors.reset}`);
  console.log(`   - Browser: ${colors.cyan}KDS Chrome 1.0.0${colors.reset}`);
  console.log(`   - Connect Timeout: ${colors.cyan}60s${colors.reset}`);
  console.log(`   - Keep Alive: ${colors.cyan}30s${colors.reset}`);

  console.log('');

  // Resumen final
  console.log('='.repeat(70));
  log('📊', colors.cyan, 'RESUMEN DEL TEST');
  console.log('='.repeat(70) + '\n');

  console.log(`  Configuración ENV:      ${colors.green}✅ OK${colors.reset}`);
  console.log(`  URL del Proxy:          ${colors.green}✅ OK${colors.reset}`);
  console.log(`  Agente Proxy:           ${colors.green}✅ OK${colors.reset}`);
  console.log(`  Conectividad:           ${colors.green}✅ OK${colors.reset}`);
  console.log(`  WhatsApp Web:           ${colors.green}✅ OK${colors.reset}`);
  console.log(`  Config Baileys:         ${colors.green}✅ OK${colors.reset}`);

  console.log('\n' + '='.repeat(70));
  log('🎉', colors.green, 'TODAS LAS PRUEBAS PASARON EXITOSAMENTE');
  console.log('='.repeat(70) + '\n');

  log('✅', colors.green, 'El proxy ISP está correctamente configurado para Baileys');
  log('🚀', colors.cyan, 'Puedes proceder a iniciar el servidor con confianza');
  log('💡', colors.yellow, 'Asegúrate de que PROXY_TYPE=isp esté en tu .env');

  console.log('\n' + '📝 PRÓXIMOS PASOS:\n');
  console.log(`   1. ${colors.cyan}Verificar que .env tiene PROXY_TYPE=isp${colors.reset}`);
  console.log(`   2. ${colors.cyan}Iniciar el servidor: npm start${colors.reset}`);
  console.log(`   3. ${colors.cyan}Conectar un restaurante de prueba${colors.reset}`);
  console.log(`   4. ${colors.cyan}Verificar logs para confirmar que el proxy se aplica${colors.reset}\n`);
}

// Ejecutar test
testProxyConfiguration().catch(error => {
  log('❌', colors.red, `Error fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});
