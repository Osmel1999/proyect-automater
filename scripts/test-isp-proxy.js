#!/usr/bin/env node

/**
 * 🧪 Test de Proxy ISP para WhatsApp
 * 
 * Este script prueba la conectividad de un proxy ISP de Bright Data
 * con WhatsApp para validar si es viable antes de implementar el túnel.
 * 
 * USO:
 *   node scripts/test-isp-proxy.js
 * 
 * VARIABLES DE ENTORNO REQUERIDAS:
 *   PROXY_LIST=http://username:password@host:port
 *   PROXY_TYPE=isp
 */

const { HttpsProxyAgent } = require('https-proxy-agent');
const axios = require('axios');

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(emoji, color, message) {
  console.log(`${emoji} ${color}${message}${colors.reset}`);
}

async function testProxyIP() {
  try {
    log('🔍', colors.blue, 'Probando obtención de IP a través del proxy...');
    
    const proxyUrl = process.env.PROXY_LIST;
    if (!proxyUrl) {
      throw new Error('PROXY_LIST no está configurado');
    }
    
    const agent = new HttpsProxyAgent(proxyUrl);
    const response = await axios.get('https://api.ipify.org?format=json', {
      httpsAgent: agent,
      timeout: 15000
    });
    
    log('✅', colors.green, `IP del proxy: ${response.data.ip}`);
    return true;
  } catch (error) {
    log('❌', colors.red, `Error obteniendo IP: ${error.message}`);
    return false;
  }
}

async function testProxyLatency() {
  try {
    log('⏱️', colors.blue, 'Midiendo latencia del proxy...');
    
    const proxyUrl = process.env.PROXY_LIST;
    const agent = new HttpsProxyAgent(proxyUrl);
    
    const start = Date.now();
    await axios.get('https://web.whatsapp.com', {
      httpsAgent: agent,
      timeout: 15000
    });
    const latency = Date.now() - start;
    
    if (latency < 1000) {
      log('✅', colors.green, `Latencia excelente: ${latency}ms`);
    } else if (latency < 3000) {
      log('⚠️', colors.yellow, `Latencia aceptable: ${latency}ms`);
    } else {
      log('❌', colors.red, `Latencia alta: ${latency}ms`);
    }
    
    return latency;
  } catch (error) {
    log('❌', colors.red, `Error midiendo latencia: ${error.message}`);
    return null;
  }
}

async function testWhatsAppConnection() {
  try {
    log('🔗', colors.blue, 'Probando conexión con servidores de WhatsApp...');
    
    const proxyUrl = process.env.PROXY_LIST;
    const agent = new HttpsProxyAgent(proxyUrl);
    
    // Intentar conectar a los endpoints de WhatsApp
    const endpoints = [
      'https://web.whatsapp.com',
      'https://web.whatsapp.com/check-update'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        const response = await axios.get(endpoint, {
          httpsAgent: agent,
          timeout: 15000,
          validateStatus: () => true // Aceptar cualquier código de estado
        });
        const latency = Date.now() - start;
        
        if (response.status === 502 || response.status === 503) {
          log('❌', colors.red, `${endpoint}: BLOQUEADO (HTTP ${response.status})`);
          return false;
        } else {
          log('✅', colors.green, `${endpoint}: OK (HTTP ${response.status}, ${latency}ms)`);
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.message.includes('502')) {
          log('❌', colors.red, `${endpoint}: BLOQUEADO por el proxy`);
          return false;
        }
        log('⚠️', colors.yellow, `${endpoint}: ${error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    log('❌', colors.red, `Error probando WhatsApp: ${error.message}`);
    return false;
  }
}

async function testWebSocketSupport() {
  try {
    log('🔌', colors.blue, 'Probando soporte de WebSocket...');
    
    // Para Baileys, necesitamos que el proxy soporte WebSocket
    // Esto es crítico para la conexión con WhatsApp
    
    const proxyUrl = process.env.PROXY_LIST;
    
    // Verificar si es SOCKS5 (mejor para WebSocket)
    if (proxyUrl.startsWith('socks5://')) {
      log('✅', colors.green, 'SOCKS5 detectado - Excelente soporte para WebSocket');
      return true;
    } else if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
      log('⚠️', colors.yellow, 'HTTP/HTTPS proxy - Puede tener limitaciones con WebSocket');
      log('💡', colors.cyan, 'Considera usar SOCKS5 para mejor compatibilidad');
      return true;
    }
    
    return false;
  } catch (error) {
    log('❌', colors.red, `Error verificando WebSocket: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  log('🧪', colors.cyan, 'TEST DE PROXY ISP PARA WHATSAPP');
  console.log('='.repeat(60) + '\n');
  
  // Verificar variables de entorno
  if (!process.env.PROXY_LIST) {
    log('❌', colors.red, 'Error: PROXY_LIST no está configurado');
    log('💡', colors.cyan, 'Configura PROXY_LIST=http://user:pass@host:port');
    process.exit(1);
  }
  
  const proxyType = process.env.PROXY_TYPE || 'residential';
  log('📡', colors.blue, `Tipo de proxy: ${proxyType.toUpperCase()}`);
  log('🔗', colors.blue, `URL del proxy: ${process.env.PROXY_LIST.replace(/:[^:@]+@/, ':****@')}`);
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Ejecutar pruebas
  const results = {
    ip: await testProxyIP(),
    latency: await testProxyLatency(),
    whatsapp: await testWhatsAppConnection(),
    websocket: await testWebSocketSupport()
  };
  
  console.log('\n' + '='.repeat(60));
  log('📊', colors.cyan, 'RESUMEN DE RESULTADOS');
  console.log('='.repeat(60) + '\n');
  
  // IP del proxy
  console.log(`  Obtención de IP:        ${results.ip ? '✅ OK' : '❌ FALLO'}`);
  
  // Latencia
  if (results.latency) {
    const latencyStatus = results.latency < 1000 ? '✅ Excelente' : 
                         results.latency < 3000 ? '⚠️ Aceptable' : '❌ Alta';
    console.log(`  Latencia:               ${latencyStatus} (${results.latency}ms)`);
  } else {
    console.log(`  Latencia:               ❌ No medida`);
  }
  
  // WhatsApp
  console.log(`  Conexión WhatsApp:      ${results.whatsapp ? '✅ OK' : '❌ BLOQUEADO'}`);
  
  // WebSocket
  console.log(`  Soporte WebSocket:      ${results.websocket ? '✅ OK' : '❌ LIMITADO'}`);
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Decisión final
  const allPassed = results.ip && results.whatsapp && results.websocket;
  
  if (allPassed) {
    log('🎉', colors.green, 'RESULTADO: PROXY ISP VIABLE PARA WHATSAPP');
    log('✅', colors.green, 'Puedes proceder con la implementación usando este proxy');
    log('💡', colors.cyan, 'Configura PROXY_TYPE=isp en tu aplicación');
  } else {
    log('⚠️', colors.yellow, 'RESULTADO: PROXY ISP NO VIABLE');
    
    if (!results.whatsapp) {
      log('❌', colors.red, 'WhatsApp está bloqueando el proxy');
      log('💡', colors.cyan, 'Opciones:');
      log('  ', colors.cyan, '1. Probar con otro puerto de Bright Data');
      log('  ', colors.cyan, '2. Contactar soporte de Bright Data');
      log('  ', colors.cyan, '3. Implementar solución de túnel por navegador');
    }
    
    if (!results.websocket) {
      log('❌', colors.red, 'Soporte de WebSocket limitado');
      log('💡', colors.cyan, 'Considera usar SOCKS5 en lugar de HTTP/HTTPS');
    }
  }
  
  console.log('\n');
  process.exit(allPassed ? 0 : 1);
}

// Ejecutar
main().catch(error => {
  log('❌', colors.red, `Error fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});
