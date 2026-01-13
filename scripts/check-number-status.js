/**
 * Script para Verificar el Estado de Números en Meta
 * 
 * Consulta la API de Meta para ver el estado actual de los números
 * 
 * Ejecución:
 *   node scripts/check-number-status.js
 */

const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

// Inicializar Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'server', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

// ===================================================================
// CONFIGURACIÓN
// ===================================================================

const PHONE_NUMBERS_TO_CHECK = [
  '+57 310 6445843',
  '+1 678 2305962'
];

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

// ===================================================================
// Función para verificar estado del número
// ===================================================================

async function checkNumberStatus(phoneNumber, phoneNumberId, accessToken) {
  try {
    console.log(`📞 Consultando información del número...`);
    
    // Obtener información del número
    const response = await axios.get(
      `https://graph.facebook.com/v21.0/${phoneNumberId}`,
      {
        params: {
          fields: 'id,display_phone_number,verified_name,code_verification_status,quality_rating,messaging_limit_tier,account_mode,certificate'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    const data = response.data;
    
    console.log('');
    console.log('📊 INFORMACIÓN DEL NÚMERO:');
    console.log(`   ID: ${data.id}`);
    console.log(`   Número: ${data.display_phone_number || 'N/A'}`);
    console.log(`   Nombre verificado: ${data.verified_name || 'Sin verificar'}`);
    console.log(`   Estado de verificación: ${data.code_verification_status || 'N/A'}`);
    console.log(`   Calidad: ${data.quality_rating || 'N/A'}`);
    console.log(`   Límite de mensajes: ${data.messaging_limit_tier || 'N/A'}`);
    console.log(`   Modo de cuenta: ${data.account_mode || 'N/A'}`);
    console.log(`   Certificado: ${data.certificate ? 'Presente' : 'Ausente'}`);
    console.log('');
    
    return { success: true, phoneNumber, data };
    
  } catch (error) {
    console.error('❌ ERROR AL CONSULTAR EL NÚMERO');
    console.error(`   Número: ${phoneNumber}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`   Error:`, error.message);
    }
    console.error('');
    return { success: false, phoneNumber, error: error.message };
  }
}

// ===================================================================
// Función principal
// ===================================================================

async function main() {
  console.log('━'.repeat(60));
  console.log('🔍 VERIFICADOR DE ESTADO DE NÚMEROS');
  console.log('━'.repeat(60));
  console.log('');
  console.log('📱 Números a verificar:');
  PHONE_NUMBERS_TO_CHECK.forEach(num => console.log(`   - ${num}`));
  console.log('');
  
  const results = [];
  
  for (const phoneNumber of PHONE_NUMBERS_TO_CHECK) {
    console.log('─'.repeat(60));
    console.log(`📱 ${phoneNumber}`);
    console.log('─'.repeat(60));
    
    try {
      // Buscar tenant por número de teléfono
      const tenantsSnapshot = await db.ref('tenants').once('value');
      const tenants = tenantsSnapshot.val();
      
      if (!tenants) {
        console.error('❌ No se encontraron tenants en Firebase');
        results.push({ success: false, phoneNumber, error: 'No hay tenants' });
        continue;
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
        results.push({ success: false, phoneNumber, error: 'Tenant no encontrado' });
        continue;
      }
      
      console.log(`✅ Tenant encontrado: ${tenantId}`);
      
      const phoneNumberId = foundTenant.whatsapp?.phoneNumberId;
      
      if (!phoneNumberId) {
        console.error('❌ No se encontró Phone Number ID en el tenant');
        results.push({ success: false, phoneNumber, error: 'Sin Phone Number ID' });
        continue;
      }
      
      const encryptedToken = foundTenant.whatsapp?.accessToken;
      
      if (!encryptedToken) {
        console.error('❌ No se encontró Access Token en el tenant');
        results.push({ success: false, phoneNumber, error: 'Sin Access Token' });
        continue;
      }
      
      const accessToken = decrypt(encryptedToken);
      
      if (!accessToken) {
        console.error('❌ Error al desencriptar Access Token');
        results.push({ success: false, phoneNumber, error: 'Error desencriptando token' });
        continue;
      }
      
      // Verificar estado del número
      const result = await checkNumberStatus(phoneNumber, phoneNumberId, accessToken);
      results.push(result);
      
    } catch (error) {
      console.error(`❌ Error procesando ${phoneNumber}:`, error.message);
      results.push({ success: false, phoneNumber, error: error.message });
    }
  }
  
  // Resumen
  console.log('━'.repeat(60));
  console.log('📊 RESUMEN');
  console.log('━'.repeat(60));
  console.log('');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(`✅ Consultados exitosamente: ${successful.length}/${results.length}`);
  }
  
  if (failed.length > 0) {
    console.log(`❌ Errores: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.phoneNumber}: ${r.error}`);
    });
  }
  
  console.log('');
  console.log('━'.repeat(60));
  
  await admin.app().delete();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
