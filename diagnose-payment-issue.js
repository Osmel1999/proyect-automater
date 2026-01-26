#!/usr/bin/env node

/**
 * Script de diagnóstico para problemas de pago
 * Verifica toda la cadena: configuración → credenciales → gateway
 */

const admin = require('firebase-admin');
const PaymentConfigService = require('./server/payments/payment-config-service');

// Inicializar Firebase
if (!admin.apps.length) {
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://kds-app-7f1d3-default-rtdb.firebaseio.com'
    });
    console.log('✅ Firebase inicializado');
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    process.exit(1);
  }
}

async function diagnose(tenantId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 DIAGNÓSTICO DE PAGOS PARA TENANT: ${tenantId}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const db = admin.database();
    const configService = new PaymentConfigService();

    // 1. Verificar si existe configuración en Firebase
    console.log('📋 Paso 1: Verificando configuración en Firebase...');
    const snapshot = await db.ref(`payment-configs/${tenantId}`).once('value');
    const rawConfig = snapshot.val();

    if (!rawConfig) {
      console.log('❌ NO HAY CONFIGURACIÓN GUARDADA');
      console.log('\n💡 SOLUCIÓN:');
      console.log('   1. Ve al dashboard del restaurante');
      console.log('   2. Haz clic en "Configurar Pagos"');
      console.log('   3. Ingresa las credenciales de Wompi');
      console.log('   4. Activa el toggle de pagos online');
      console.log('   5. Guarda la configuración');
      return;
    }

    console.log('✅ Configuración encontrada en Firebase');
    console.log(`   - Habilitado: ${rawConfig.enabled}`);
    console.log(`   - Gateway: ${rawConfig.gateway}`);
    console.log(`   - Tiene credenciales cifradas: ${!!rawConfig.credentials}`);

    // 2. Intentar descifrar credenciales
    console.log('\n📋 Paso 2: Descifrando credenciales...');
    try {
      const config = await configService.getConfig(tenantId, true);
      
      if (!config) {
        console.log('❌ Error obteniendo configuración con PaymentConfigService');
        return;
      }

      console.log('✅ Credenciales descifradas exitosamente');
      console.log(`   - Tipo de gateway: ${config.gateway}`);
      console.log(`   - Enabled: ${config.enabled}`);
      
      if (config.credentials) {
        console.log('   - Campos en credentials:');
        Object.keys(config.credentials).forEach(key => {
          const value = config.credentials[key];
          const preview = typeof value === 'string' && value.length > 20 
            ? `${value.substring(0, 20)}...` 
            : value;
          console.log(`     • ${key}: ${preview}`);
        });
      }

      // 3. Verificar estructura esperada
      console.log('\n📋 Paso 3: Validando estructura de credenciales...');
      
      if (config.gateway === 'wompi') {
        const requiredFields = ['publicKey', 'privateKey', 'eventSecret'];
        const missingFields = requiredFields.filter(field => !config.credentials[field]);
        
        if (missingFields.length > 0) {
          console.log('❌ Faltan campos requeridos:');
          missingFields.forEach(field => console.log(`   - ${field}`));
        } else {
          console.log('✅ Todos los campos requeridos presentes');
        }
      }

      // 4. Verificar que enabled esté en true
      console.log('\n📋 Paso 4: Verificando estado de habilitación...');
      if (!config.enabled) {
        console.log('❌ Los pagos online están DESHABILITADOS');
        console.log('\n💡 SOLUCIÓN:');
        console.log('   1. Ve al dashboard del restaurante');
        console.log('   2. Activa el toggle "Pagos Online"');
        console.log('   3. Guarda los cambios');
      } else {
        console.log('✅ Pagos online HABILITADOS');
      }

      // 5. Resumen final
      console.log(`\n${'='.repeat(60)}`);
      console.log('📊 RESUMEN DEL DIAGNÓSTICO');
      console.log(`${'='.repeat(60)}`);
      
      const allGood = config.enabled && 
                      config.credentials && 
                      config.credentials.publicKey && 
                      config.credentials.privateKey;
      
      if (allGood) {
        console.log('✅ TODO ESTÁ CONFIGURADO CORRECTAMENTE');
        console.log('   El problema puede ser:');
        console.log('   - Error en el gateway de pago (Wompi)');
        console.log('   - Credenciales incorrectas');
        console.log('   - Problema de conectividad');
        console.log('\n   Revisa los logs del backend para más detalles');
      } else {
        console.log('❌ CONFIGURACIÓN INCOMPLETA O DESHABILITADA');
        console.log('   Completa los pasos indicados arriba');
      }

    } catch (error) {
      console.log('❌ Error descifrando credenciales:', error.message);
      console.log('\n💡 Posibles causas:');
      console.log('   - La clave de cifrado cambió');
      console.log('   - Las credenciales se guardaron con un formato incorrecto');
      console.log('   - Hay un problema con el servicio de cifrado');
    }

  } catch (error) {
    console.error('\n❌ ERROR INESPERADO:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar diagnóstico
const tenantId = process.argv[2] || 'knd';
diagnose(tenantId);
