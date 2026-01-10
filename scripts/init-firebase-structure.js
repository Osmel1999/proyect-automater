/**
 * Script para inicializar la estructura multi-tenant en Firebase
 * Ejecutar: node scripts/init-firebase-structure.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Cargar credenciales de Firebase
const serviceAccount = require('../server/firebase-service-account.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://kds-app-7f1d3-default-rtdb.firebaseio.com'
});

const db = admin.database();

async function initializeStructure() {
  try {
    console.log('🚀 Iniciando estructura multi-tenant en Firebase...\n');
    
    // 1. Crear estructura base de tenants
    console.log('📁 Creando estructura base de tenants...');
    await db.ref('tenants').set({
      _initialized: true,
      _version: '2.0.0',
      _createdAt: new Date().toISOString()
    });
    console.log('   ✅ Estructura base creada\n');
    
    // 2. Crear tenant de ejemplo/demo
    console.log('🏪 Creando tenant de ejemplo (demo)...');
    const demoTenantId = 'tenant_demo_' + Date.now();
    
    const demoTenant = {
      tenantId: demoTenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      
      // Información del negocio
      restaurant: {
        name: 'Restaurante Demo',
        ownerEmail: 'demo@kdsapp.site',
        description: 'Restaurante de demostración'
      },
      
      // Configuración de WhatsApp (simulada para demo)
      whatsapp: {
        businessAccountId: 'demo_business_account',
        phoneNumberId: 'demo_phone_number_id',
        phoneNumber: '+57 300 000 0000',
        accessToken: 'ENCRYPTED_DEMO_TOKEN',
        webhookVerified: true,
        lastSync: new Date().toISOString()
      },
      
      // Configuración del sistema
      settings: {
        timezone: 'America/Bogota',
        language: 'es',
        currency: 'COP',
        autoAcceptOrders: false,
        notifications: {
          email: true,
          whatsapp: true
        }
      },
      
      // Menú de ejemplo
      menu: {
        categories: {
          cat_1: {
            id: 'cat_1',
            name: 'Entradas',
            order: 1,
            active: true
          },
          cat_2: {
            id: 'cat_2',
            name: 'Platos Principales',
            order: 2,
            active: true
          },
          cat_3: {
            id: 'cat_3',
            name: 'Bebidas',
            order: 3,
            active: true
          }
        },
        items: {
          item_1: {
            id: 'item_1',
            name: 'Hamburguesa Clásica',
            price: 25000,
            description: 'Carne, lechuga, tomate, cebolla',
            category: 'Platos Principales',
            available: true
          },
          item_2: {
            id: 'item_2',
            name: 'Pizza Familiar',
            price: 35000,
            description: 'Pizza grande con ingredientes a elección',
            category: 'Platos Principales',
            available: true
          },
          item_3: {
            id: 'item_3',
            name: 'Coca Cola',
            price: 5000,
            description: 'Bebida gaseosa 350ml',
            category: 'Bebidas',
            available: true
          }
        }
      },
      
      // Pedidos (vacío inicialmente)
      pedidos: {
        _placeholder: 'Los pedidos aparecerán aquí'
      },
      
      // Estadísticas
      stats: {
        totalOrders: 0,
        ordersToday: 0,
        lastOrderAt: null,
        revenue: {
          today: 0,
          week: 0,
          month: 0
        }
      }
    };
    
    await db.ref(`tenants/${demoTenantId}`).set(demoTenant);
    console.log(`   ✅ Tenant demo creado: ${demoTenantId}\n`);
    
    // 3. Crear índice de números de WhatsApp
    console.log('📞 Creando índice de números de WhatsApp...');
    await db.ref('whatsappNumbers').set({
      demo_phone_number_id: {
        tenantId: demoTenantId,
        phoneNumber: '+57 300 000 0000',
        registeredAt: new Date().toISOString()
      }
    });
    console.log('   ✅ Índice de números creado\n');
    
    // 4. Crear configuración global de la app
    console.log('⚙️ Creando configuración global...');
    await db.ref('appConfig').set({
      version: '2.0.0',
      environment: 'production',
      maintenance: false,
      features: {
        multiTenant: true,
        embeddedSignup: true,
        whatsappBusinessAPI: true
      },
      limits: {
        maxTenantsPerUser: 5,
        maxOrdersPerDay: 1000,
        maxMenuItems: 100
      },
      updatedAt: new Date().toISOString()
    });
    console.log('   ✅ Configuración global creada\n');
    
    // 5. Migrar pedidos existentes (si los hay)
    console.log('🔄 Verificando pedidos existentes para migrar...');
    const oldPedidosSnapshot = await db.ref('pedidos').once('value');
    const oldPedidos = oldPedidosSnapshot.val();
    
    if (oldPedidos && Object.keys(oldPedidos).length > 0) {
      console.log(`   📦 Se encontraron ${Object.keys(oldPedidos).length} pedidos antiguos`);
      console.log('   🔄 Migrando pedidos al tenant demo...');
      
      // Migrar pedidos al tenant demo
      let migratedCount = 0;
      for (const [pedidoKey, pedidoData] of Object.entries(oldPedidos)) {
        if (pedidoData && typeof pedidoData === 'object' && !pedidoData._placeholder) {
          // Agregar tenantId al pedido
          const pedidoConTenant = {
            ...pedidoData,
            tenantId: demoTenantId,
            migratedAt: new Date().toISOString(),
            migratedFrom: 'legacy'
          };
          
          await db.ref(`tenants/${demoTenantId}/pedidos/${pedidoKey}`).set(pedidoConTenant);
          migratedCount++;
        }
      }
      
      console.log(`   ✅ ${migratedCount} pedidos migrados exitosamente\n`);
      
      // Actualizar estadísticas del tenant
      await db.ref(`tenants/${demoTenantId}/stats`).update({
        totalOrders: migratedCount,
        lastOrderAt: new Date().toISOString()
      });
      
      // Renombrar la estructura antigua (backup)
      console.log('   📦 Creando backup de estructura antigua...');
      await db.ref('_backup_pedidos_legacy').set({
        ...oldPedidos,
        _backupAt: new Date().toISOString(),
        _migratedTo: demoTenantId
      });
      
      // Eliminar estructura antigua
      console.log('   🗑️ Eliminando estructura antigua...');
      await db.ref('pedidos').remove();
      console.log('   ✅ Estructura antigua respaldada y eliminada\n');
      
    } else {
      console.log('   ℹ️ No se encontraron pedidos antiguos para migrar\n');
      
      // Limpiar estructura antigua vacía si existe
      await db.ref('pedidos').remove();
    }
    
    // 6. Resumen final
    console.log('━'.repeat(60));
    console.log('✅ ESTRUCTURA MULTI-TENANT INICIALIZADA EXITOSAMENTE\n');
    console.log('📊 Resumen:');
    console.log(`   • Tenant demo: ${demoTenantId}`);
    console.log(`   • Database URL: ${process.env.FIREBASE_DATABASE_URL || 'https://kds-app-7f1d3-default-rtdb.firebaseio.com'}`);
    console.log(`   • Estructura: tenants/ creada`);
    console.log(`   • Índice: whatsappNumbers/ creado`);
    console.log(`   • Config: appConfig/ creada`);
    console.log('━'.repeat(60));
    console.log('\n🎯 Próximos pasos:');
    console.log('   1. Actualizar app.js para leer de la nueva estructura');
    console.log('   2. Probar flujo de onboarding');
    console.log('   3. Verificar que los pedidos se guarden correctamente\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error inicializando estructura:', error);
    process.exit(1);
  }
}

// Ejecutar
initializeStructure();
