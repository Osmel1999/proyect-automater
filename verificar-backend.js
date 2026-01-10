#!/usr/bin/env node

/**
 * Script de Verificación del Backend
 * Verifica que todos los servicios estén correctamente configurados
 */

require('dotenv').config();
const path = require('path');

console.log('━'.repeat(60));
console.log('🔍 VERIFICACIÓN DE BACKEND - KDS WHATSAPP SAAS');
console.log('━'.repeat(60));
console.log('');

let errores = [];
let advertencias = [];
let exitos = [];

// ====================================
// 1. VERIFICAR VARIABLES DE ENTORNO
// ====================================

console.log('📋 1. Verificando variables de entorno...\n');

const variablesRequeridas = {
  'WHATSAPP_APP_ID': 'ID de la aplicación de WhatsApp',
  'WHATSAPP_APP_SECRET': 'Secret de la aplicación de WhatsApp',
  'WHATSAPP_VERIFY_TOKEN': 'Token de verificación de webhook',
  'ENCRYPTION_KEY': 'Clave de cifrado para tokens',
  'FIREBASE_DATABASE_URL': 'URL de Firebase Realtime Database',
  'FIREBASE_PROJECT_ID': 'ID del proyecto de Firebase'
};

for (const [variable, descripcion] of Object.entries(variablesRequeridas)) {
  if (process.env[variable]) {
    const valor = process.env[variable];
    const mostrarValor = variable.includes('SECRET') || variable.includes('KEY') 
      ? valor.substring(0, 8) + '...' 
      : valor;
    exitos.push(`✅ ${variable}: ${mostrarValor}`);
  } else {
    errores.push(`❌ ${variable} no configurada (${descripcion})`);
  }
}

// Verificar GOOGLE_APPLICATION_CREDENTIALS
const credencialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './server/firebase-service-account.json';
const fs = require('fs');
if (fs.existsSync(credencialsPath)) {
  exitos.push(`✅ GOOGLE_APPLICATION_CREDENTIALS: ${credencialsPath}`);
} else {
  errores.push(`❌ Firebase Service Account no encontrado en: ${credencialsPath}`);
}

exitos.forEach(msg => console.log(msg));
console.log('');

// ====================================
// 2. VERIFICAR ARCHIVOS DEL BACKEND
// ====================================

console.log('📁 2. Verificando archivos del backend...\n');

const archivosRequeridos = [
  'server/index.js',
  'server/encryption-service.js',
  'server/tenant-service.js',
  'server/whatsapp-handler.js',
  'server/bot-logic.js',
  'server/firebase-service.js',
  'server/menu.js',
  'server/pedido-parser.js'
];

archivosRequeridos.forEach(archivo => {
  if (fs.existsSync(archivo)) {
    exitos.push(`✅ ${archivo}`);
  } else {
    errores.push(`❌ Archivo no encontrado: ${archivo}`);
  }
});

exitos.slice(-archivosRequeridos.length).forEach(msg => console.log(msg));
console.log('');

// ====================================
// 3. VERIFICAR ARCHIVOS DEL FRONTEND
// ====================================

console.log('🌐 3. Verificando archivos del frontend...\n');

const archivosFrontend = [
  'onboarding.html',
  'onboarding-success.html',
  'facebook-config.js',
  'landing.html',
  'index.html'
];

archivosFrontend.forEach(archivo => {
  if (fs.existsSync(archivo)) {
    console.log(`✅ ${archivo}`);
  } else {
    advertencias.push(`⚠️ Archivo frontend no encontrado: ${archivo}`);
  }
});

console.log('');

// ====================================
// 4. VERIFICAR SERVICIOS (SIN INICIAR SERVIDOR)
// ====================================

console.log('🔧 4. Verificando servicios...\n');

try {
  // Verificar Encryption Service
  const encryptionService = require('./server/encryption-service');
  const testToken = 'test_token_12345';
  const encrypted = encryptionService.encrypt(testToken);
  const decrypted = encryptionService.decrypt(encrypted);
  
  if (decrypted === testToken) {
    console.log('✅ Encryption Service: Funcionando correctamente');
  } else {
    errores.push('❌ Encryption Service: Error en cifrado/descifrado');
  }
} catch (error) {
  errores.push(`❌ Encryption Service: ${error.message}`);
}

try {
  // Verificar Firebase Service
  const firebaseService = require('./server/firebase-service');
  if (firebaseService.database) {
    console.log('✅ Firebase Service: Inicializado correctamente');
  } else {
    errores.push('❌ Firebase Service: No inicializado');
  }
} catch (error) {
  errores.push(`❌ Firebase Service: ${error.message}`);
}

try {
  // Verificar Tenant Service
  const tenantService = require('./server/tenant-service');
  console.log('✅ Tenant Service: Inicializado correctamente');
} catch (error) {
  errores.push(`❌ Tenant Service: ${error.message}`);
}

try {
  // Verificar WhatsApp Handler
  const whatsappHandler = require('./server/whatsapp-handler');
  console.log('✅ WhatsApp Handler: Inicializado correctamente');
} catch (error) {
  errores.push(`❌ WhatsApp Handler: ${error.message}`);
}

try {
  // Verificar Bot Logic
  const botLogic = require('./server/bot-logic');
  if (botLogic.processMessage) {
    console.log('✅ Bot Logic: Inicializado correctamente');
  } else {
    errores.push('❌ Bot Logic: Función processMessage no encontrada');
  }
} catch (error) {
  errores.push(`❌ Bot Logic: ${error.message}`);
}

console.log('');

// ====================================
// 5. VERIFICAR DEPENDENCIAS
// ====================================

console.log('📦 5. Verificando dependencias npm...\n');

try {
  require('express');
  console.log('✅ express');
} catch (e) {
  errores.push('❌ express no instalada');
}

try {
  require('axios');
  console.log('✅ axios');
} catch (e) {
  errores.push('❌ axios no instalada (REQUERIDA para WhatsApp API)');
}

try {
  require('dotenv');
  console.log('✅ dotenv');
} catch (e) {
  errores.push('❌ dotenv no instalada');
}

try {
  require('firebase-admin');
  console.log('✅ firebase-admin');
} catch (e) {
  errores.push('❌ firebase-admin no instalada');
}

console.log('');

// ====================================
// RESUMEN FINAL
// ====================================

console.log('━'.repeat(60));
console.log('📊 RESUMEN DE VERIFICACIÓN');
console.log('━'.repeat(60));
console.log('');

console.log(`✅ Verificaciones exitosas: ${exitos.length}`);
console.log(`⚠️ Advertencias: ${advertencias.length}`);
console.log(`❌ Errores: ${errores.length}`);
console.log('');

if (advertencias.length > 0) {
  console.log('⚠️ ADVERTENCIAS:\n');
  advertencias.forEach(adv => console.log(`   ${adv}`));
  console.log('');
}

if (errores.length > 0) {
  console.log('❌ ERRORES ENCONTRADOS:\n');
  errores.forEach(err => console.log(`   ${err}`));
  console.log('');
  console.log('💡 SOLUCIÓN:');
  console.log('   1. Ejecuta: npm install');
  console.log('   2. Verifica tu archivo .env');
  console.log('   3. Descarga firebase-service-account.json');
  console.log('');
  process.exit(1);
} else {
  console.log('━'.repeat(60));
  console.log('');
  console.log('🎉 ¡TODO LISTO! El backend está correctamente configurado.');
  console.log('');
  console.log('📝 PRÓXIMOS PASOS:');
  console.log('');
  console.log('   1. Instalar dependencias:');
  console.log('      $ npm install');
  console.log('');
  console.log('   2. Iniciar servidor (local):');
  console.log('      $ npm run dev');
  console.log('');
  console.log('   3. Configurar webhook en Meta:');
  console.log(`      URL: ${process.env.BASE_URL || 'https://tu-dominio.com'}/webhook/whatsapp`);
  console.log(`      Token: ${process.env.WHATSAPP_VERIFY_TOKEN || '[CONFIGURAR EN .env]'}`);
  console.log('');
  console.log('   4. Probar onboarding:');
  console.log(`      ${process.env.BASE_URL || 'http://localhost:3000'}/onboarding.html`);
  console.log('');
  console.log('━'.repeat(60));
  console.log('');
  process.exit(0);
}
