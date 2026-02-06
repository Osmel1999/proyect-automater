/**
 * Servicio de Firebase para gestionar pedidos en el KDS
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Inicializar Firebase Admin (solo si no está inicializado)
if (!admin.apps.length) {
  try {
    let serviceAccount;
    
    // Opción 1: Usar Service Account Key en Base64 (Railway/producción)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8')
      );
      
      console.log('✅ Firebase: Usando Service Account desde Base64');
      
    // Opción 2: Usar archivo local (desarrollo)
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = path.resolve(__dirname, '..', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      
      if (fs.existsSync(credPath)) {
        serviceAccount = require(credPath);
        console.log('✅ Firebase: Usando Service Account desde archivo local');
      } else {
        throw new Error(`No se encontró el archivo: ${credPath}`);
      }
      
    // Opción 3: Buscar archivo por defecto
    } else {
      const defaultPath = path.resolve(__dirname, 'firebase-service-account.json');
      
      if (fs.existsSync(defaultPath)) {
        serviceAccount = require(defaultPath);
        console.log('✅ Firebase: Usando Service Account desde ruta por defecto');
      } else {
        throw new Error('No se encontró ninguna credencial de Firebase');
      }
    }
    
    // Inicializar Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    
    console.log(`✅ Firebase Admin conectado a: ${process.env.FIREBASE_DATABASE_URL}`);
    
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error.message);
    throw error;
  }
}

// 🔥 Realtime Database (para pedidos, tenants, etc.)
const database = admin.database();

// 🔥 Firestore (para sesiones de Baileys)
const firestore = admin.firestore();

console.log('✅ Firestore inicializado para sesiones de Baileys');

/**
 * Guarda un nuevo pedido en Firebase Realtime Database
 */
async function guardarPedido(pedido) {
  try {
    const ref = database.ref('pedidos');
    const nuevoPedido = await ref.push(pedido);
    
    console.log(`✅ Pedido guardado en Firebase: ${nuevoPedido.key}`);
    
    return nuevoPedido.key;
    
  } catch (error) {
    console.error('❌ Error guardando pedido en Firebase:', error);
    throw error;
  }
}

/**
 * Actualiza el estado de un pedido
 */
async function actualizarEstadoPedido(pedidoId, nuevoEstado) {
  try {
    const ref = database.ref(`pedidos/${pedidoId}`);
    await ref.update({
      estado: nuevoEstado,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✅ Estado actualizado: ${pedidoId} -> ${nuevoEstado}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error actualizando estado:', error);
    throw error;
  }
}

/**
 * Obtiene todos los pedidos
 */
async function obtenerPedidos() {
  try {
    const ref = database.ref('pedidos');
    const snapshot = await ref.once('value');
    
    return snapshot.val() || {};
    
  } catch (error) {
    console.error('❌ Error obteniendo pedidos:', error);
    throw error;
  }
}

/**
 * Obtiene un pedido específico
 */
async function obtenerPedido(pedidoId) {
  try {
    const ref = database.ref(`pedidos/${pedidoId}`);
    const snapshot = await ref.once('value');
    
    return snapshot.val();
    
  } catch (error) {
    console.error('❌ Error obteniendo pedido:', error);
    throw error;
  }
}

/**
 * Elimina un pedido (solo para limpieza/testing)
 */
async function eliminarPedido(pedidoId) {
  try {
    const ref = database.ref(`pedidos/${pedidoId}`);
    await ref.remove();
    
    console.log(`✅ Pedido eliminado: ${pedidoId}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error eliminando pedido:', error);
    throw error;
  }
}

module.exports = {
  database, // ✨ Realtime Database (pedidos, tenants, etc.)
  db: firestore, // ✨ Firestore (sesiones de Baileys)
  guardarPedido,
  actualizarEstadoPedido,
  obtenerPedidos,
  obtenerPedido,
  eliminarPedido
};
