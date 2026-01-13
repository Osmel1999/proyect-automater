/**
 * Script para Solicitar Código de Verificación (Para números NOT_VERIFIED)
 * 
 * Este script solicita un código de verificación por SMS o llamada
 * para completar la verificación del número
 * 
 * Ejecución:
 *   node scripts/request-verification-code.js
 */

const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

// Inicializar Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'server', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

const ALGORITHM = 'aes-256-gcm';
const crypto = require('crypto');

function decrypt(encryptedData) {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY no configurada');
    }

    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf-8');
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Formato de dato cifrado inválido');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    return null;
  }
}

// Interface de línea de comandos
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('━'.repeat(60));
  console.log('📞 SOLICITAR CÓDIGO DE VERIFICACIÓN');
  console.log('━'.repeat(60));
  console.log('');
  
  // Preguntar número a verificar
  const phoneNumber = await askQuestion('Ingresa el número a verificar (ej: +1 678 2305962): ');
  const method = await askQuestion('Método de verificación (SMS/VOICE) [SMS]: ') || 'SMS';
  
  console.log('');
  console.log(`📱 Buscando información para: ${phoneNumber}`);
  console.log(`📨 Método: ${method.toUpperCase()}`);
  console.log('');
  
  try {
    // Buscar tenant
    const tenantsSnapshot = await db.ref('tenants').once('value');
    const tenants = tenantsSnapshot.val();
    
    if (!tenants) {
      console.error('❌ No se encontraron tenants en Firebase');
      await admin.app().delete();
      rl.close();
      return;
    }
    
    let foundTenant = null;
    let tenantId = null;
    
    for (const [id, tenant] of Object.entries(tenants)) {
      const cleanDbNumber = tenant.whatsapp?.phoneNumber?.replace(/[\s\-+]/g, '') || '';
      const cleanSearchNumber = phoneNumber.replace(/[\s\-+]/g, '');
      
      if (cleanDbNumber === cleanSearchNumber) {
        foundTenant = tenant;
        tenantId = id;
        break;
      }
    }
    
    if (!foundTenant) {
      console.error(`❌ No se encontró tenant para el número: ${phoneNumber}`);
      await admin.app().delete();
      rl.close();
      return;
    }
    
    console.log(`✅ Tenant encontrado: ${tenantId}`);
    
    const phoneNumberId = foundTenant.whatsapp?.phoneNumberId;
    const encryptedToken = foundTenant.whatsapp?.accessToken;
    
    if (!phoneNumberId || !encryptedToken) {
      console.error('❌ Información incompleta en Firebase');
      await admin.app().delete();
      rl.close();
      return;
    }
    
    const accessToken = decrypt(encryptedToken);
    
    if (!accessToken) {
      console.error('❌ Error al desencriptar Access Token');
      await admin.app().delete();
      rl.close();
      return;
    }
    
    console.log(`   Phone Number ID: ${phoneNumberId}`);
    console.log('');
    console.log('📤 Solicitando código de verificación...');
    
    // Solicitar código
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/request_code`,
      {
        code_method: method.toUpperCase(),
        language: 'es'
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ ¡Código de verificación enviado!');
    console.log('');
    console.log(`📨 Revisa tu ${method === 'VOICE' ? 'teléfono (llamada)' : 'mensajes SMS'}`);
    console.log('');
    
    // Preguntar código
    const code = await askQuestion('Ingresa el código de 6 dígitos que recibiste: ');
    
    console.log('');
    console.log('✅ Verificando código...');
    
    // Verificar código
    await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/verify_code`,
      {
        code: code.trim()
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('🎉 ¡NÚMERO VERIFICADO EXITOSAMENTE!');
    console.log('');
    console.log('Ahora puedes ejecutar el script de activación:');
    console.log('   node scripts/activate-numbers-from-firebase.js');
    console.log('');
    
  } catch (error) {
    console.error('❌ ERROR:', error.response?.data || error.message);
  }
  
  await admin.app().delete();
  rl.close();
}

main();
