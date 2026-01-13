/**
 * Script para inicializar la estructura de usuarios en Firebase
 * Estructura:
 * 
 * users/
 *   {userId}/
 *     - email: string
 *     - passwordHash: string (usaremos Firebase Auth)
 *     - name: string
 *     - businessName: string
 *     - pin: string (hasheado)
 *     - tenantId: string
 *     - createdAt: timestamp
 *     - onboardingCompleted: boolean
 *     - whatsappConnected: boolean
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

// Inicializar Firebase Admin
const serviceAccount = require('../server/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://kds-app-7f1d3-default-rtdb.firebaseio.com"
});

const db = admin.database();

// Función para hashear el PIN
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

async function initializeUserStructure() {
  try {
    console.log('🔧 Inicializando estructura de usuarios...');

    // Crear estructura base de usuarios
    const usersRef = db.ref('users');
    await usersRef.update({
      _initialized: true,
      _version: '1.0.0'
    });

    console.log('✅ Estructura de usuarios inicializada');

    // Migrar tenant demo a tener un usuario de ejemplo
    const demoUserId = 'demo_user_' + Date.now();
    const demoTenantId = 'tenant_demo_1767890541463';

    await usersRef.child(demoUserId).set({
      email: 'demo@kdsapp.site',
      name: 'Usuario Demo',
      businessName: 'Restaurante Demo',
      pin: hashPin('1111'), // PIN demo: 1111
      tenantId: demoTenantId,
      createdAt: new Date().toISOString(),
      onboardingCompleted: true,
      whatsappConnected: true
    });

    console.log('✅ Usuario demo creado:', demoUserId);
    console.log('📧 Email: demo@kdsapp.site');
    console.log('🔐 PIN: 1111');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initializeUserStructure();
