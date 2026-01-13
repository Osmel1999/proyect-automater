/**
 * Script Manual para Activar Números en "Pending"
 * 
 * Uso: Si tienes números en estado "Pending" antes de implementar
 * la solución automática, usa este script para activarlos manualmente.
 * 
 * Ejecución:
 *   node scripts/activate-pending-number.js
 */

const axios = require('axios');
require('dotenv').config();

// ===================================================================
// CONFIGURACIÓN - EDITA ESTOS VALORES
// ===================================================================

const PHONE_NUMBER_ID = '955837124274138'; // ⚠️ CAMBIA ESTO por tu Phone Number ID
const ACCESS_TOKEN = 'TU_ACCESS_TOKEN_AQUI'; // ⚠️ CAMBIA ESTO por tu Access Token

// ===================================================================
// NO EDITES DEBAJO DE ESTA LÍNEA
// ===================================================================

async function activateNumber() {
  console.log('━'.repeat(60));
  console.log('🔐 ACTIVADOR MANUAL DE NÚMEROS DE WHATSAPP');
  console.log('━'.repeat(60));
  console.log('');
  
  // Validar configuración
  if (PHONE_NUMBER_ID === '955837124274138' || PHONE_NUMBER_ID === 'TU_PHONE_NUMBER_ID_AQUI') {
    console.error('❌ ERROR: Debes cambiar PHONE_NUMBER_ID en el script');
    console.log('');
    console.log('📝 Para encontrar tu Phone Number ID:');
    console.log('   1. Ve a https://business.facebook.com/latest/whatsapp_manager');
    console.log('   2. Haz clic en tu número');
    console.log('   3. El ID está en la URL o en la configuración');
    console.log('');
    process.exit(1);
  }
  
  if (ACCESS_TOKEN === 'TU_ACCESS_TOKEN_AQUI') {
    console.error('❌ ERROR: Debes cambiar ACCESS_TOKEN en el script');
    console.log('');
    console.log('📝 Para obtener tu Access Token:');
    console.log('   1. Ve a Firebase > Firestore');
    console.log('   2. Busca en la colección "tenants"');
    console.log('   3. Busca el campo "accessToken" (encriptado)');
    console.log('   4. O usa el token del proceso de Embedded Signup');
    console.log('');
    process.exit(1);
  }
  
  console.log('📱 Phone Number ID:', PHONE_NUMBER_ID);
  console.log('🔑 Access Token:', ACCESS_TOKEN.substring(0, 20) + '...');
  console.log('');
  
  try {
    // Generar PIN de 6 dígitos
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log('🔐 Generando PIN de seguridad...');
    console.log(`   PIN: ${pin}`);
    console.log('');
    
    console.log('📤 Enviando petición de registro a Meta...');
    
    // Llamar al endpoint /register
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/register`,
      {
        messaging_product: 'whatsapp',
        pin: pin
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ ¡NÚMERO ACTIVADO EXITOSAMENTE!');
    console.log('');
    console.log('📊 Detalles de la Respuesta:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('━'.repeat(60));
    console.log('🎉 PROCESO COMPLETADO');
    console.log('━'.repeat(60));
    console.log('');
    console.log('✅ Estado del número: CONNECTED');
    console.log(`🔑 PIN de seguridad: ${pin}`);
    console.log('');
    console.log('📝 IMPORTANTE:');
    console.log(`   Guarda este PIN en un lugar seguro: ${pin}`);
    console.log('   Lo necesitarás si alguna vez migras el número.');
    console.log('');
    console.log('🔍 Verificación:');
    console.log('   1. Ve a https://business.facebook.com/latest/whatsapp_manager');
    console.log('   2. Tu número debe aparecer con estado "Connected" (verde)');
    console.log('   3. Ya puedes enviar mensajes desde tu chatbot');
    console.log('');
    
  } catch (error) {
    console.error('❌ ERROR AL ACTIVAR EL NÚMERO');
    console.error('');
    
    if (error.response) {
      console.error('📊 Respuesta de la API:');
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error:`, JSON.stringify(error.response.data, null, 2));
      console.error('');
      
      // Mensajes de error comunes
      if (error.response.data?.error?.message?.includes('already registered')) {
        console.log('ℹ️  El número ya está registrado y activo.');
        console.log('   Puedes ignorar este error.');
        console.log('   Verifica en Meta Business Manager que esté en "Connected".');
      } else if (error.response.data?.error?.message?.includes('Invalid OAuth')) {
        console.log('ℹ️  El Access Token es inválido o ha expirado.');
        console.log('   Solución: Obtén un nuevo token haciendo un nuevo Embedded Signup.');
      } else if (error.response.data?.error?.message?.includes('Invalid parameter')) {
        console.log('ℹ️  Hay un problema con algún parámetro.');
        console.log('   Verifica que el Phone Number ID sea correcto.');
      } else if (error.response.data?.error?.message?.includes('permissions')) {
        console.log('ℹ️  El token no tiene los permisos necesarios.');
        console.log('   Asegúrate de que incluya:');
        console.log('   - whatsapp_business_management');
        console.log('   - whatsapp_business_messaging');
      }
    } else {
      console.error('❌ Error de red o conexión:');
      console.error(error.message);
    }
    
    console.error('');
    console.log('📚 Recursos de Ayuda:');
    console.log('   - Documentación: https://developers.facebook.com/docs/whatsapp/business-management-api/manage-phone-numbers');
    console.log('   - Soporte Meta: https://business.facebook.com/business/help');
    console.log('');
    
    process.exit(1);
  }
}

// Ejecutar
activateNumber();
