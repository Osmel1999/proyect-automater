#!/usr/bin/env node

/**
 * 🧪 Test Rápido de Proxy ISP
 * Versión simplificada con timeouts cortos para diagnóstico rápido
 */

const { HttpsProxyAgent } = require('https-proxy-agent');
const axios = require('axios');

const TIMEOUT = 10000; // 10 segundos

// Configuración del proxy
const PROXY_CONFIG = {
  host: 'brd.superproxy.io',
  port: '33335',
  username: 'brd-customer-hl_e851436d-zone-isp_proxy1',
  password: 'bcej6jmzlv66'
};

const proxyUrl = `http://${PROXY_CONFIG.username}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;

console.log('\n🧪 TEST RÁPIDO DE PROXY ISP\n');
console.log(`📡 Proxy: ${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`);
console.log(`🔐 Usuario: ${PROXY_CONFIG.username}`);
console.log(`⏱️  Timeout: ${TIMEOUT}ms\n`);

async function testBasicConnection() {
  console.log('🔍 Test 1: Obtener IP del proxy...');
  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    const response = await axios.get('https://api.ipify.org?format=json', {
      httpsAgent: agent,
      timeout: TIMEOUT
    });
    console.log(`✅ IP del proxy: ${response.data.ip}\n`);
    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.code || error.message}\n`);
    return false;
  }
}

async function testGeoLocation() {
  console.log('🌎 Test 2: Verificar geolocalización...');
  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    const response = await axios.get('https://geo.brdtest.com/welcome.txt?product=isp&method=native', {
      httpsAgent: agent,
      timeout: TIMEOUT
    });
    console.log(`✅ Respuesta: ${response.data.substring(0, 100)}...\n`);
    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.code || error.message}\n`);
    return false;
  }
}

async function testWhatsAppWeb() {
  console.log('💬 Test 3: Conectar a WhatsApp Web...');
  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    const response = await axios.get('https://web.whatsapp.com', {
      httpsAgent: agent,
      timeout: TIMEOUT,
      validateStatus: () => true
    });
    
    if (response.status === 502 || response.status === 503) {
      console.log(`❌ Proxy bloqueado por WhatsApp (HTTP ${response.status})\n`);
      return false;
    } else {
      console.log(`✅ Conexión exitosa (HTTP ${response.status})\n`);
      return true;
    }
  } catch (error) {
    if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
      console.log(`❌ Proxy bloqueado (502 Bad Gateway)\n`);
      return false;
    }
    console.log(`❌ Error: ${error.code || error.message}\n`);
    return false;
  }
}

async function main() {
  const results = {
    basic: false,
    geo: false,
    whatsapp: false
  };

  try {
    results.basic = await testBasicConnection();
    if (results.basic) {
      results.geo = await testGeoLocation();
      results.whatsapp = await testWhatsAppWeb();
    }
  } catch (error) {
    console.error(`\n❌ Error fatal: ${error.message}`);
  }

  console.log('═'.repeat(60));
  console.log('📊 RESULTADOS:');
  console.log('═'.repeat(60));
  console.log(`  Conexión básica:    ${results.basic ? '✅ OK' : '❌ FALLO'}`);
  console.log(`  Geolocalización:    ${results.geo ? '✅ OK' : '❌ FALLO'}`);
  console.log(`  WhatsApp Web:       ${results.whatsapp ? '✅ OK' : '❌ BLOQUEADO'}`);
  console.log('═'.repeat(60));

  if (results.basic && results.geo && results.whatsapp) {
    console.log('\n🎉 PROXY ISP VIABLE para WhatsApp\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  PROXY ISP NO VIABLE\n');
    
    if (!results.basic) {
      console.log('💡 Problema: No se puede conectar al proxy');
      console.log('   - Verifica las credenciales');
      console.log('   - Verifica que el proxy ISP esté activo en Bright Data\n');
    } else if (!results.whatsapp) {
      console.log('💡 Problema: WhatsApp está bloqueando el proxy');
      console.log('   - Intenta con otro puerto (22225, 33335, etc.)');
      console.log('   - Contacta soporte de Bright Data');
      console.log('   - Considera implementar túnel por navegador\n');
    }
    
    process.exit(1);
  }
}

main();
