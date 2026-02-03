#!/usr/bin/env node

/**
 * 🧪 Script de Verificación de Proxy Bright Data
 * 
 * Este script prueba que las credenciales del proxy funcionan correctamente
 * antes de configurarlas en Railway.
 * 
 * Uso:
 *   node scripts/test-proxy.js
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// ✅ CREDENCIALES ACTUALES DE BRIGHT DATA
const PROXY_CONFIG = {
  username: 'brd-customer-hl_e851436d-zone-kds_px1',
  password: 'r9snsuym28j2',
  host: 'brd.superproxy.io',
  port: '33335'
};

// Construir URL del proxy
const proxyUrl = `http://${PROXY_CONFIG.username}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;

console.log('\n🧪 Iniciando prueba de proxy Bright Data...\n');
console.log('📋 Configuración:');
console.log(`   Host: ${PROXY_CONFIG.host}`);
console.log(`   Port: ${PROXY_CONFIG.port}`);
console.log(`   Zone: kds_px1`);
console.log(`   URL: ${proxyUrl.replace(PROXY_CONFIG.password, '***')}`);
console.log('\n⏳ Probando conexión...\n');

async function testProxy() {
  try {
    // Test 1: Verificar IP sin proxy (IP del servidor)
    console.log('📍 Test 1: IP del servidor (sin proxy)');
    const directResponse = await axios.get('https://api.ipify.org?format=json', {
      timeout: 10000
    });
    console.log(`   ✅ IP Directa: ${directResponse.data.ip}`);
    
    // Test 2: Verificar IP con proxy (IP de Bright Data)
    console.log('\n📍 Test 2: IP con proxy Bright Data');
    const agent = new HttpsProxyAgent(proxyUrl);
    const proxyResponse = await axios.get('https://api.ipify.org?format=json', {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 30000
    });
    console.log(`   ✅ IP con Proxy: ${proxyResponse.data.ip}`);
    
    // Test 3: Verificar geolocalización
    console.log('\n📍 Test 3: Geolocalización del proxy');
    const geoResponse = await axios.get(`http://ip-api.com/json/${proxyResponse.data.ip}`, {
      timeout: 10000
    });
    console.log(`   ✅ País: ${geoResponse.data.country}`);
    console.log(`   ✅ Ciudad: ${geoResponse.data.city}`);
    console.log(`   ✅ ISP: ${geoResponse.data.isp}`);
    
    // Test 4: Verificar diferentes sesiones (IPs únicas)
    console.log('\n📍 Test 4: Sesiones múltiples (IPs únicas)');
    for (let i = 1; i <= 3; i++) {
      const sessionUrl = `http://${PROXY_CONFIG.username}-session-${i}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;
      const sessionAgent = new HttpsProxyAgent(sessionUrl);
      const sessionResponse = await axios.get('https://api.ipify.org?format=json', {
        httpAgent: sessionAgent,
        httpsAgent: sessionAgent,
        timeout: 30000
      });
      console.log(`   ✅ Sesión ${i}: ${sessionResponse.data.ip}`);
    }
    
    // Resultado final
    console.log('\n' + '='.repeat(60));
    console.log('✅ ¡TODAS LAS PRUEBAS PASARON!');
    console.log('='.repeat(60));
    console.log('\n📋 Siguiente paso:');
    console.log('   1. Ve a Railway → Variables');
    console.log('   2. Agrega la variable PROXY_LIST con este valor:\n');
    console.log(`   ${proxyUrl}\n`);
    console.log('   3. Guarda y redespliega');
    console.log('   4. Verifica los logs en Railway\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:');
    console.error(`   ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Posibles causas:');
      console.error('   - Credenciales incorrectas');
      console.error('   - La zona de proxy no está activa en Bright Data');
      console.error('   - Problema de red/firewall');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 Posibles causas:');
      console.error('   - Timeout de conexión (proxy muy lento)');
      console.error('   - Firewall bloqueando la conexión');
    }
    
    console.error('\n📋 Acciones recomendadas:');
    console.error('   1. Verifica las credenciales en: https://brightdata.com/cp/zones');
    console.error('   2. Verifica que la zona "kds_px1" esté ACTIVA');
    console.error('   3. Prueba el comando que te dio Bright Data en la terminal');
    console.error('   4. Contacta al soporte de Bright Data si persiste\n');
    
    return false;
  }
}

// Ejecutar prueba
testProxy().then(success => {
  process.exit(success ? 0 : 1);
});
