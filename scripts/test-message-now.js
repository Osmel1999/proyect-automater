/**
 * Script para PROBAR si el número ya puede enviar mensajes
 * (Modo Development/Sandbox funciona SIN esperar aprobación)
 */

const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const serviceAccount = require(path.join(__dirname, '..', 'server', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();
const ALGORITHM = 'aes-256-gcm';
const crypto = require('crypto');

function decrypt(encryptedData) {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf-8');
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('━'.repeat(60));
  console.log('🧪 PROBAR ENVÍO DE MENSAJES (Modo Development)');
  console.log('━'.repeat(60));
  console.log('');
  console.log('ℹ️  Meta permite enviar mensajes ANTES de la aprobación');
  console.log('   en modo Development con hasta 250 conversaciones/día');
  console.log('');
  
  const phoneNumber = '+57 310 6445843';
  
  console.log(`📱 Número a probar: ${phoneNumber}`);
  console.log('');
  
  const yourPhone = await askQuestion('📞 Ingresa TU número de WhatsApp para recibir el mensaje de prueba (ej: +573101234567): ');
  
  console.log('');
  console.log('🔍 Buscando información en Firebase...');
  
  try {
    const tenantsSnapshot = await db.ref('tenants').once('value');
    const tenants = tenantsSnapshot.val();
    
    let tenant = null;
    for (const [id, t] of Object.entries(tenants)) {
      if (t.whatsapp?.phoneNumber?.replace(/[\s\-+]/g, '') === '573106445843') {
        tenant = t;
        break;
      }
    }
    
    if (!tenant) {
      console.error('❌ Tenant no encontrado');
      await admin.app().delete();
      rl.close();
      return;
    }
    
    console.log('✅ Tenant encontrado');
    
    const phoneNumberId = tenant.whatsapp.phoneNumberId;
    const accessToken = decrypt(tenant.whatsapp.accessToken);
    
    console.log(`   Phone Number ID: ${phoneNumberId}`);
    console.log('');
    console.log('📤 Intentando enviar mensaje de prueba...');
    console.log('');
    
    // Limpiar número
    const cleanPhone = yourPhone.replace(/[\s\-+]/g, '');
    
    // Intentar enviar mensaje
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: {
          body: '🎉 ¡Tu chatbot KDS está funcionando! El número está activo y puede recibir pedidos.'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ ¡MENSAJE ENVIADO EXITOSAMENTE!');
    console.log('');
    console.log('━'.repeat(60));
    console.log('🎉 ¡EL NÚMERO YA ESTÁ ACTIVO!');
    console.log('━'.repeat(60));
    console.log('');
    console.log('✅ No necesitas esperar 24 horas');
    console.log('✅ El número puede recibir y enviar mensajes AHORA');
    console.log('✅ Está en modo Development (250 conversaciones/día)');
    console.log('');
    console.log('📊 Detalles del mensaje:');
    console.log(`   Message ID: ${response.data.messages[0].id}`);
    console.log(`   Estado: ${response.data.messages[0].message_status || 'enviado'}`);
    console.log('');
    console.log('📱 Revisa tu WhatsApp: ${yourPhone}');
    console.log('');
    console.log('🚀 Próximos pasos:');
    console.log('   1. El restaurante puede empezar a usar el chatbot YA');
    console.log('   2. Meta aumentará el límite automáticamente después');
    console.log('   3. No hay pérdida de ventas');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error al enviar mensaje:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error:`, JSON.stringify(error.response.data, null, 2));
      console.error('');
      
      if (error.response.data?.error?.code === 131051) {
        console.log('━'.repeat(60));
        console.log('⚠️  NÚMERO EN MODO RESTRINGIDO');
        console.log('━'.repeat(60));
        console.log('');
        console.log('El número necesita que agregues números de prueba:');
        console.log('');
        console.log('1. Ve a: https://business.facebook.com/latest/whatsapp_manager');
        console.log(`2. Selecciona el número: ${phoneNumber}`);
        console.log('3. Busca "Phone Numbers to Test" o "Add Test Number"');
        console.log(`4. Agrega tu número: ${yourPhone}`);
        console.log('5. Vuelve a ejecutar este script');
        console.log('');
      } else if (error.response.data?.error?.message?.includes('business account')) {
        console.log('━'.repeat(60));
        console.log('⚠️  BUSINESS ACCOUNT PENDIENTE');
        console.log('━'.repeat(60));
        console.log('');
        console.log('SOLUCIÓN INMEDIATA:');
        console.log('');
        console.log('1. Ve a: https://business.facebook.com/settings/business_info');
        console.log('2. Verifica si hay verificación pendiente');
        console.log('3. Completa cualquier paso pendiente');
        console.log('4. Contacta a Meta Business Support para acelerar:');
        console.log('   https://business.facebook.com/business/help');
        console.log('');
        console.log('ALTERNATIVA (Solución en 5 minutos):');
        console.log('');
        console.log('1. Crea un NUEVO Business Portfolio verificado');
        console.log('2. Haz un nuevo Embedded Signup con ese portfolio');
        console.log('3. El número quedará activo inmediatamente');
        console.log('');
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }
  
  await admin.app().delete();
  rl.close();
}

main();
