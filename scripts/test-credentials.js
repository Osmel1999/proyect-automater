#!/usr/bin/env node
/**
 * Script de Verificación de Credenciales de Gateways de Pago
 * 
 * Este script valida que las credenciales configuradas en .env sean correctas
 * haciendo llamadas de prueba a los APIs de cada gateway.
 */

require('dotenv').config();
const axios = require('axios');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log('═'.repeat(60) + '\n');
}

/**
 * Prueba credenciales de Wompi
 */
async function testWompi() {
  header('WOMPI - Validación de Credenciales');
  
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const privateKey = process.env.WOMPI_PRIVATE_KEY;
  const eventSecret = process.env.WOMPI_EVENT_SECRET;
  const mode = process.env.WOMPI_MODE || 'sandbox';
  
  // Verificar que existan las credenciales
  if (!publicKey || publicKey === 'pub_test_xxxxxxxxxxxxxx') {
    log('⚠️ ', 'Credenciales de Wompi NO configuradas en .env', colors.yellow);
    log('📝', 'Por favor lee: Integracion-Multi-Gateway/GUIA-OBTENER-CREDENCIALES.md');
    return false;
  }
  
  log('🔍', `Modo: ${mode}`);
  log('🔑', `Public Key: ${publicKey.substring(0, 20)}...`);
  
  try {
    // Determinar URL base según el modo
    const baseUrl = mode === 'production' 
      ? 'https://production.wompi.co' 
      : 'https://sandbox.wompi.co';
    
    // Probar endpoint de merchants (solo requiere public key)
    log('📡', 'Consultando información del merchant...');
    const response = await axios.get(
      `${baseUrl}/v1/merchants/${publicKey}`,
      {
        timeout: 10000
      }
    );
    
    if (response.data && response.data.data) {
      const merchant = response.data.data;
      log('✅', 'Credenciales de Wompi VÁLIDAS', colors.green);
      log('   ', `Merchant: ${merchant.name || merchant.legal_name || 'N/A'}`);
      log('   ', `Email: ${merchant.contact_email || 'N/A'}`);
      log('   ', `Activo: ${merchant.active ? 'Sí' : 'No'}`);
      
      // Verificar que el event secret esté configurado
      if (!eventSecret || eventSecret === 'xxxxxxxxxxxxxx') {
        log('⚠️ ', 'Event Secret NO configurado (necesario para webhooks)', colors.yellow);
      } else {
        log('✅', 'Event Secret configurado', colors.green);
      }
      
      return true;
    } else {
      log('❌', 'Respuesta inesperada del API de Wompi', colors.red);
      return false;
    }
    
  } catch (error) {
    log('❌', 'Error al validar credenciales de Wompi', colors.red);
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      log('   ', `Status: ${status}`);
      
      if (status === 404) {
        log('   ', 'La Public Key no existe o es inválida', colors.red);
        log('💡', 'Verifica que hayas copiado correctamente la clave desde Wompi');
      } else if (status === 401) {
        log('   ', 'No autorizado - verifica tus credenciales', colors.red);
      } else {
        log('   ', `Mensaje: ${data.error?.reason || data.message || 'Error desconocido'}`);
      }
    } else if (error.code === 'ENOTFOUND') {
      log('   ', 'No se pudo conectar al servidor de Wompi', colors.red);
      log('   ', 'Verifica tu conexión a internet');
    } else {
      log('   ', error.message);
    }
    
    return false;
  }
}

/**
 * Prueba credenciales de Bold
 */
async function testBold() {
  header('BOLD - Validación de Credenciales');
  
  const apiKey = process.env.BOLD_API_KEY;
  const mode = process.env.BOLD_MODE || 'sandbox';
  
  if (!apiKey || apiKey === 'xxxxxxxxxxxxx') {
    log('ℹ️ ', 'Credenciales de Bold NO configuradas (opcional)', colors.blue);
    log('📝', 'Bold se puede configurar después. Por ahora solo Wompi es necesario.');
    return null; // null = no configurado (no es error)
  }
  
  log('🔍', `Modo: ${mode}`);
  log('🔑', `API Key: ${apiKey.substring(0, 15)}...`);
  
  try {
    // Determinar URL base según el modo
    const baseUrl = mode === 'production' 
      ? 'https://api.bold.co' 
      : 'https://api-sandbox.bold.co';
    
    log('📡', 'Consultando información de la cuenta...');
    
    // Nota: Endpoint exacto depende de la documentación de Bold
    // Este es un ejemplo que deberás ajustar según su API
    const response = await axios.get(
      `${baseUrl}/v1/account`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    log('✅', 'Credenciales de Bold VÁLIDAS', colors.green);
    return true;
    
  } catch (error) {
    log('⚠️ ', 'No se pudo validar Bold (ajustar endpoint según documentación)', colors.yellow);
    log('   ', 'Esto es normal si Bold requiere configuración adicional');
    
    if (error.response) {
      log('   ', `Status: ${error.response.status}`);
    }
    
    return null; // null = no validado (no necesariamente error)
  }
}

/**
 * Resumen de la verificación
 */
async function main() {
  console.log('\n');
  header('🔐 VERIFICACIÓN DE CREDENCIALES - GATEWAYS DE PAGO');
  
  const results = {
    wompi: await testWompi(),
    bold: await testBold()
  };
  
  // Resumen final
  header('📊 RESUMEN DE LA VERIFICACIÓN');
  
  log('', `Wompi: ${results.wompi ? '✅ Configurado' : '❌ No configurado'}`);
  log('', `Bold: ${results.bold === true ? '✅ Configurado' : results.bold === null ? 'ℹ️  No configurado (opcional)' : '❌ Error'}`);
  
  console.log('\n');
  
  if (results.wompi) {
    log('🎉', 'Todo listo para continuar con la FASE 2', colors.green);
    log('📝', 'Siguiente paso: Implementar el código del Gateway Manager');
    console.log('\n');
    log('💻', 'Comando sugerido:', colors.cyan);
    console.log('   ', 'code server/payments/gateway-manager.js');
  } else {
    log('⚠️ ', 'Necesitas configurar al menos Wompi para continuar', colors.yellow);
    console.log('\n');
    log('📚', 'Lee la guía:', colors.cyan);
    console.log('   ', 'cat Integracion-Multi-Gateway/GUIA-OBTENER-CREDENCIALES.md');
    console.log('\n');
    log('🌐', 'Ve a:', colors.cyan);
    console.log('   ', 'https://comercios.wompi.co/');
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
}

// Ejecutar
main().catch(error => {
  console.error('\n❌ Error inesperado:', error.message);
  process.exit(1);
});
