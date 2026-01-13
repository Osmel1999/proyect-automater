#!/usr/bin/env node

/**
 * Script de Diagnóstico: Verificar Portfolio del Número
 * 
 * Este script verifica si un número de WhatsApp Business está asociado
 * al Business Portfolio correcto (verificado) o a uno incorrecto.
 * 
 * Uso:
 *   node check-portfolio.js <phone_number_id>
 */

const axios = require('axios');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../server/firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://kds-2025-default-rtdb.firebaseio.com'
  });
}

const db = admin.database();

// Función para obtener la información del portfolio
async function checkPortfolio(phoneNumberId, accessToken) {
  try {
    console.log('\n🔍 Consultando información del número...\n');

    // 1. Obtener información del número de teléfono
    const phoneResponse = await axios.get(
      `https://graph.facebook.com/v21.0/${phoneNumberId}`,
      {
        params: {
          fields: 'id,display_phone_number,verified_name,code_verification_status,quality_rating,account_mode'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const phoneData = phoneResponse.data;
    console.log('📱 Información del Número:');
    console.log('   ID:', phoneData.id);
    console.log('   Número:', phoneData.display_phone_number);
    console.log('   Nombre Verificado:', phoneData.verified_name || 'N/A');
    console.log('   Estado de Verificación:', phoneData.code_verification_status || 'N/A');
    console.log('   Modo de Cuenta:', phoneData.account_mode || 'N/A');
    console.log('   Calidad:', phoneData.quality_rating || 'N/A');

    // 2. Obtener información de la WABA (WhatsApp Business Account)
    const wabaResponse = await axios.get(
      `https://graph.facebook.com/v21.0/${phoneNumberId}`,
      {
        params: {
          fields: 'id,whatsapp_business_account{id,name,business_verification_status,account_review_status,timezone_id,message_template_namespace}'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (wabaResponse.data.whatsapp_business_account) {
      const waba = wabaResponse.data.whatsapp_business_account;
      console.log('\n🏢 Información de la WABA:');
      console.log('   ID:', waba.id);
      console.log('   Nombre:', waba.name);
      console.log('   Estado de Verificación de Negocio:', waba.business_verification_status);
      console.log('   Estado de Revisión:', waba.account_review_status || 'N/A');
      console.log('   Zona Horaria:', waba.timezone_id);
      console.log('   Namespace:', waba.message_template_namespace);

      // Verificar si es el portfolio correcto
      console.log('\n✅ Análisis:');
      
      if (waba.business_verification_status === 'verified') {
        console.log('   ✅ La WABA está VERIFICADA');
        console.log('   ✅ El número puede activarse instantáneamente');
        
        if (waba.name.toLowerCase().includes('kds') || 
            waba.name.toLowerCase().includes('platform')) {
          console.log('   ✅ Parece ser el portfolio de KDS (correcto)');
        } else {
          console.log('   ⚠️  El nombre de la WABA no parece ser de KDS');
          console.log('   ⚠️  Verifica que sea el portfolio correcto');
        }
      } else {
        console.log('   ❌ La WABA NO está verificada');
        console.log('   ⏳ El número puede quedar en estado "Pending"');
        console.log('   💡 Recomendación: Migrar al portfolio verificado de KDS');
      }

      if (phoneData.code_verification_status === 'VERIFIED') {
        console.log('   ✅ El código del número está verificado');
      } else if (phoneData.code_verification_status === 'PENDING') {
        console.log('   ⏳ El código del número está PENDIENTE de verificación');
        console.log('   💡 Puede tomar 24-48 horas si la WABA no está verificada');
      }

    } else {
      console.log('\n⚠️  No se pudo obtener información de la WABA');
    }

    return {
      phoneData,
      wabaData: wabaResponse.data.whatsapp_business_account
    };

  } catch (error) {
    console.error('❌ Error al consultar información:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Mensaje:', error.response.data.error?.message || error.response.statusText);
    } else {
      console.error('   ', error.message);
    }
    throw error;
  }
}

// Función para buscar el número en Firebase
async function findNumberInFirebase(phoneNumberId) {
  try {
    console.log(`\n🔍 Buscando ${phoneNumberId} en Firebase...\n`);

    const tenantsSnapshot = await db.ref('tenants').once('value');
    const tenants = tenantsSnapshot.val();

    if (!tenants) {
      console.log('⚠️  No hay tenants en la base de datos');
      return null;
    }

    for (const [tenantId, tenantData] of Object.entries(tenants)) {
      if (tenantData.whatsapp?.phoneNumberId === phoneNumberId) {
        console.log('✅ Número encontrado en Firebase:');
        console.log('   Tenant ID:', tenantId);
        console.log('   Email:', tenantData.email);
        console.log('   Nombre:', tenantData.name);
        console.log('   Número:', tenantData.whatsapp?.displayPhoneNumber);
        console.log('   WABA ID:', tenantData.whatsapp?.wabaId);
        console.log('   Fecha de Conexión:', new Date(tenantData.whatsapp?.connectedAt).toLocaleString());

        return {
          tenantId,
          accessToken: tenantData.whatsapp?.accessToken
        };
      }
    }

    console.log('⚠️  Número no encontrado en Firebase');
    return null;

  } catch (error) {
    console.error('❌ Error buscando en Firebase:', error.message);
    throw error;
  }
}

// Función principal
async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 Script de Diagnóstico: Verificar Portfolio del Número');
    console.log('═══════════════════════════════════════════════════════');

    const phoneNumberIdArg = process.argv[2];

    let phoneNumberId, accessToken;

    if (phoneNumberIdArg) {
      // Si se proporciona el phone_number_id como argumento
      phoneNumberId = phoneNumberIdArg;
      console.log(`\n📌 Phone Number ID proporcionado: ${phoneNumberId}`);
      
      // Buscar en Firebase para obtener el access token
      const result = await findNumberInFirebase(phoneNumberId);
      
      if (!result) {
        console.log('\n⚠️  No se encontró el access token en Firebase.');
        console.log('💡 Proporciona el access token manualmente:');
        console.log(`   node ${process.argv[1]} ${phoneNumberId} <access_token>`);
        return;
      }

      accessToken = result.accessToken;

    } else {
      // Si no se proporciona, buscar todos los números en Firebase
      console.log('\n📋 Buscando todos los números en Firebase...\n');
      
      const tenantsSnapshot = await db.ref('tenants').once('value');
      const tenants = tenantsSnapshot.val();

      if (!tenants) {
        console.log('⚠️  No hay tenants en la base de datos');
        return;
      }

      const tenantsList = Object.entries(tenants).filter(([_, data]) => data.whatsapp?.phoneNumberId);

      if (tenantsList.length === 0) {
        console.log('⚠️  No hay números de WhatsApp conectados');
        return;
      }

      console.log(`✅ Encontrados ${tenantsList.length} números conectados:\n`);

      for (const [tenantId, tenantData] of tenantsList) {
        console.log(`   ${tenantData.whatsapp.displayPhoneNumber} (${tenantData.name})`);
      }

      console.log('\n💡 Uso:');
      console.log(`   node ${process.argv[1]} <phone_number_id>`);
      console.log('\nEjemplo:');
      console.log(`   node ${process.argv[1]} ${tenantsList[0][1].whatsapp.phoneNumberId}`);
      return;
    }

    // Verificar el portfolio
    await checkPortfolio(phoneNumberId, accessToken);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Diagnóstico completado');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = { checkPortfolio, findNumberInFirebase };
