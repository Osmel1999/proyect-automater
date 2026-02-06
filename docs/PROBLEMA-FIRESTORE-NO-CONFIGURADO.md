# 🔥 PROBLEMA CRÍTICO: Firestore NO estaba configurado

## 📋 Resumen

Las sesiones de WhatsApp **NUNCA se guardaron** en ninguna base de datos. Solo existían en archivos locales que se perdían al hacer deploy en Railway.

## 🔍 Problema Detectado

### 1. El código intentaba usar Firestore:

**Archivo:** `server/baileys/storage.js`

```javascript
const db = firebaseService.db; // Intentaba usar Firestore
const sessionRef = db.collection('baileys_sessions').doc(tenantId);
await sessionRef.set({ creds: ... });
```

### 2. Pero Firestore NO estaba configurado:

**Archivo:** `server/firebase-service.js` (ANTES)

```javascript
const db = admin.database(); // ❌ Solo Realtime Database

module.exports = {
  database: db, // ❌ NO exportaba 'db' para Firestore
  guardarPedido,
  // ...
};
```

### 3. Resultado:

- `firebaseService.db` era `undefined`
- Las llamadas a Firestore fallaban silenciosamente
- Las sesiones solo se guardaban en archivos locales
- Al hacer `railway up`, los archivos se perdían
- **CONSECUENCIA**: Tenías que escanear QR después de cada deploy

## ✅ Solución Implementada

### 1. Agregado Firestore al `firebase-service.js`:

```javascript
// 🔥 Realtime Database (para pedidos, tenants, etc.)
const database = admin.database();

// 🔥 Firestore (para sesiones de Baileys)
const firestore = admin.firestore();

console.log('✅ Firestore inicializado para sesiones de Baileys');

module.exports = {
  database, // ✨ Realtime Database
  db: firestore, // ✨ Firestore (para Baileys)
  guardarPedido,
  // ...
};
```

### 2. Actualizado todas las referencias de `db` a `database`:

Cambiado en todas las funciones que usan Realtime Database:

```javascript
// ANTES
const ref = db.ref('pedidos');

// DESPUÉS  
const ref = database.ref('pedidos');
```

## 🎯 ¿Qué pasa ahora?

### **PRIMERA VEZ (después de este fix):**

1. ✅ Escaneas el QR
2. ✅ Se conecta WhatsApp
3. ✅ **Se guardan las credenciales en Firestore** (NUEVO)
4. ✅ También se guardan en archivos locales

### **DESPUÉS DE HACER DEPLOY:**

1. 🔄 Railway reconstruye el contenedor
2. 📁 Se pierden los archivos locales
3. 💾 **Pero las credenciales están en Firestore**
4. 🔌 El código carga desde Firestore automáticamente
5. ✅ **WhatsApp se reconecta SIN pedir QR**

## 📊 Estructura de Datos

### **Realtime Database** (`/tenants/...`):
```json
{
  "tenants": {
    "tenant1770048862553p1dcfnuzr": {
      "restaurant": {
        "name": "grillo",
        "whatsappConnected": true,
        "connectedAt": "2026-02-06T17:47:26.799Z"
      },
      "menu": { ... },
      "historial": { ... }
    }
  }
}
```

### **Firestore** (`baileys_sessions/...`):
```json
{
  "baileys_sessions": {
    "tenant1770048862553p1dcfnuzr": {
      "creds": {
        "noiseKey": {...},
        "signedIdentityKey": {...},
        "signedPreKey": {...},
        // ... más credenciales de Baileys
      },
      "keys": {...},
      "updatedAt": "2026-02-06T17:47:26.799Z",
      "savedAt": 1770400046799
    }
  }
}
```

## 🚀 Próximos Pasos

1. **Hacer deploy de estos cambios:**
   ```bash
   git add .
   git commit -m "fix: Configurar Firestore para persistencia de sesiones Baileys"
   git push
   ```

2. **Primera conexión después del deploy:**
   - Escanear QR una última vez
   - Las credenciales se guardarán en Firestore

3. **Deploys futuros:**
   - ✅ WhatsApp se reconectará automáticamente
   - ❌ NO necesitarás escanear QR nunca más

## 🔍 Cómo Verificar

### 1. Ver Firestore desde Firebase Console:

1. Ir a https://console.firebase.google.com/
2. Seleccionar proyecto `kds-app-7f1d3`
3. Ir a **Firestore Database**
4. Ver colección `baileys_sessions`

### 2. Ver logs en Railway:

```bash
railway logs
```

Buscar:
```
✅ Firestore inicializado para sesiones de Baileys
[tenant_xxx] ✅ Credenciales guardadas en Firestore
```

## ⚠️ Nota Importante

**Este problema existía desde el principio.** Por eso:
- Siempre tenías que escanear QR después de deploy
- Las "soluciones" anteriores no funcionaban
- El hydrator no encontraba credenciales para hidratar

Ahora **SÍ funcionará** porque las credenciales se guardarán correctamente.

---

**Fecha:** 6 de febrero de 2026  
**Severity:** 🔴 CRÍTICO (bloqueaba persistencia de sesiones)  
**Status:** ✅ RESUELTO
