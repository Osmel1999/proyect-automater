/**
 * Script para Activar Números en "Pending" desde Firebase
 * 
 * Este script:
 * 1. Consulta Firebase para obtener los tenants por número de teléfono
 * 2. Obtiene el Phone Number ID y Access Token
 * 3. Activa el número automáticamente
 * 
 * Ejecución:
 *   node scripts/activate-numbers-from-firebase.js
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
// CONFIGURACIÓN - Números a activar
// ===================================================================

const PHONE_NUMBERS_TO_ACTIVATE = [
  '+57 310 6445843'  // Solo el número de Colombia que ya está verificado
  // '+1 678 2305962'  // Este necesita verificación por SMS primero
];

// ===================================================================
// Función de desencriptación (copiada de encryption-service.js)
// ===================================================================

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function decrypt(encryptedData) {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY no configurada');
    }

    // Convertir la clave a un buffer de 32 bytes (igual que encryption-service.js)
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf-8');

    // Separar IV, authTag y texto cifrado (formato: iv:authTag:encrypted)
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Formato de dato cifrado inválido');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Crear descifrador con GCM
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Descifrar el texto
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error desencriptando:', error.message);
    return null;
  }
}

// ===================================================================
// Función para activar un número
// ===================================================================

async function activateNumber(phoneNumber, phoneNumberId, accessToken) {
  try {
    // Generar PIN de 6 dígitos
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`🔐 Generando PIN de seguridad: ${pin}`);
    console.log('📤 Enviando petición de registro a Meta...');
    
    // Llamar al endpoint /register
    await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/register`,
      {
        messaging_product: 'whatsapp',
        pin: pin
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ ¡NÚMERO ACTIVADO EXITOSAMENTE!');
    console.log(`   Número: ${phoneNumber}`);
    console.log(`   Phone Number ID: ${phoneNumberId}`);
    console.log(`   PIN de seguridad: ${pin}`);
    console.log(`   Estado: CONNECTED`);
    console.log('');
    
    return { success: true, pin, phoneNumber };
    
  } catch (error) {
    if (error.response?.data?.error?.message?.includes('already registered')) {
      console.log('ℹ️  El número ya está registrado y activo.');
      console.log(`   Número: ${phoneNumber}`);
      console.log('');
      return { success: true, phoneNumber, alreadyRegistered: true };
    } else {
      console.error('❌ ERROR AL ACTIVAR EL NÚMERO');
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
}

// ===================================================================
// Función principal
// ===================================================================

async function main() {
  console.log('━'.repeat(60));
  console.log('🔐 ACTIVADOR AUTOMÁTICO DE NÚMEROS EN PENDING');
  console.log('━'.repeat(60));
  console.log('');
  console.log('📱 Números a activar:');
  PHONE_NUMBERS_TO_ACTIVATE.forEach(num => console.log(`   - ${num}`));
  console.log('');
  console.log('🔍 Buscando información en Firebase...');
  console.log('');
  
  const results = [];
  
  for (const phoneNumber of PHONE_NUMBERS_TO_ACTIVATE) {
    console.log('─'.repeat(60));
    console.log(`📱 Procesando: ${phoneNumber}`);
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
      
      // Buscar el tenant que coincida con este número
      let foundTenant = null;
      let tenantId = null;
      
      for (const [id, tenant] of Object.entries(tenants)) {
        // Limpiar números para comparar (quitar espacios, guiones, +)
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
        console.log('   Asegúrate de que el número ya haya pasado por el Embedded Signup');
        results.push({ success: false, phoneNumber, error: 'Tenant no encontrado' });
        continue;
      }
      
      console.log(`✅ Tenant encontrado: ${tenantId}`);
      console.log(`   Restaurante: ${foundTenant.restaurantName || 'Sin nombre'}`);
      
      // Obtener Phone Number ID
      const phoneNumberId = foundTenant.whatsapp?.phoneNumberId;
      
      if (!phoneNumberId) {
        console.error('❌ No se encontró Phone Number ID en el tenant');
        results.push({ success: false, phoneNumber, error: 'Sin Phone Number ID' });
        continue;
      }
      
      console.log(`   Phone Number ID: ${phoneNumberId}`);
      
      // Obtener y desencriptar Access Token
      const encryptedToken = foundTenant.whatsapp?.accessToken;
      
      if (!encryptedToken) {
        console.error('❌ No se encontró Access Token en el tenant');
        results.push({ success: false, phoneNumber, error: 'Sin Access Token' });
        continue;
      }
      
      console.log('   Desencriptando Access Token...');
      const accessToken = decrypt(encryptedToken);
      
      if (!accessToken) {
        console.error('❌ Error al desencriptar Access Token');
        results.push({ success: false, phoneNumber, error: 'Error desencriptando token' });
        continue;
      }
      
      console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);
      console.log('');
      
      // Activar el número
      const result = await activateNumber(phoneNumber, phoneNumberId, accessToken);
      results.push(result);
      
    } catch (error) {
      console.error(`❌ Error procesando ${phoneNumber}:`, error.message);
      results.push({ success: false, phoneNumber, error: error.message });
    }
  }
  
  // Resumen final
  console.log('━'.repeat(60));
  console.log('📊 RESUMEN DE ACTIVACIÓN');
  console.log('━'.repeat(60));
  console.log('');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Exitosos: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    successful.forEach(r => {
      if (r.alreadyRegistered) {
        console.log(`   - ${r.phoneNumber} (ya estaba registrado)`);
      } else {
        console.log(`   - ${r.phoneNumber} (PIN: ${r.pin})`);
      }
    });
  }
  console.log('');
  
  if (failed.length > 0) {
    console.log(`❌ Fallidos: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.phoneNumber}: ${r.error}`);
    });
    console.log('');
  }
  
  console.log('━'.repeat(60));
  console.log('');
  console.log('🔍 Verificación:');
  console.log('   1. Ve a https://business.facebook.com/latest/whatsapp_manager');
  console.log('   2. Los números deben aparecer con estado "Connected" (verde)');
  console.log('   3. Ya puedes enviar mensajes desde tus chatbots');
  console.log('');
  
  // Cerrar conexión
  await admin.app().delete();
  process.exit(failed.length > 0 ? 1 : 0);
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
