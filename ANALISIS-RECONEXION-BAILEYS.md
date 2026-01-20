# 🔴 ANÁLISIS: Problema de Reconexión y Persistencia de Sesiones Baileys

**Fecha:** 20 de enero de 2026  
**Gravedad:** CRÍTICA - Pérdida de funcionalidad  
**Estado:** 🟡 PENDIENTE DE IMPLEMENTACIÓN

---

## 🐛 PROBLEMAS IDENTIFICADOS

### **PROBLEMA #1: NO HAY RESTAURACIÓN AUTOMÁTICA AL ARRANQUE** ⭐ CRÍTICO

**Ubicación:** `server/index.js` - Falta completamente

**El Problema:**
Cuando Railway despierta tu backend después del sleep:
1. El servidor arranca desde cero ✅
2. Las sesiones de WhatsApp **NO se restauran automáticamente** ❌
3. El backend queda "sordo" esperando que alguien llame a `/api/baileys/init` manualmente

**Lo Que Debería Pasar:**
```javascript
// Al arrancar el servidor...
server.listen(PORT, async () => {
  console.log('🚀 Servidor iniciado');
  
  // ❌ FALTA ESTO:
  await restoreAllActiveSessions();  // Restaurar TODAS las sesiones guardadas
});
```

**Resultado:** Tu usuario piensa que el bot funciona 24/7, pero en realidad está "dormido" hasta que alguien haga login de nuevo.

---

### **PROBLEMA #2: CONNECTION-MANAGER NO SE USA EN EL FLUJO NORMAL** ⭐ CRÍTICO

**Ubicación:** `server/baileys/connection-manager.js`

**El Problema:**
Tienes un `ConnectionManager` con lógica de reconexión automática, pero:
- Solo se usa cuando alguien envía un mensaje y el backend detecta que no hay sesión
- **NO se ejecuta proactivamente al arranque**
- **NO se ejecuta periódicamente (heartbeat)**

**Lo Que Debería Pasar:**
```javascript
// Cada 5 minutos, verificar TODAS las sesiones
setInterval(async () => {
  const allTenants = await getAllTenantsWithSessions();
  
  for (const tenantId of allTenants) {
    if (!connectionManager.isConnected(tenantId)) {
      await connectionManager.ensureConnected(tenantId);
    }
  }
}, 5 * 60 * 1000); // 5 minutos
```

---

### **PROBLEMA #3: CREDENCIALES SE GUARDAN CORRECTAMENTE, PERO NO SE USAN** ⭐ CRÍTICO

**Ubicación:** `server/baileys/storage.js` línea 106

**El Problema:**
- Las credenciales **SÍ se guardan** en Firestore cuando escaneas el QR ✅
- Pero cuando el backend arranca, **NO se cargan automáticamente** ❌
- Solo se cargan cuando alguien llama explícitamente a `ensureConnected()`

**Resultado:** Las credenciales están ahí, pero nadie las lee al despertar.

---

### **PROBLEMA #4: SESSION-MANAGER NO REINICIA SESIONES EXISTENTES** ⭐ CRÍTICO

**Ubicación:** `server/baileys/session-manager.js` línea 89-124

**El Problema:**
Cuando llamas a `initSession()`:
1. Crea el directorio de sesión en `/sessions/tenantId/` ✅
2. Intenta cargar `useMultiFileAuthState` desde ese directorio ✅
3. Pero ese directorio está **VACÍO** en Railway porque:
   - Railway **borra todo** cuando el contenedor se apaga
   - Solo Firestore tiene las credenciales persistentes
   
**Lo Que Falta:**
```javascript
// ANTES de llamar a useMultiFileAuthState...
// 1. Cargar credenciales de Firestore
const firestoreCreds = await storage.loadSessionFromFirebase(tenantId);

if (firestoreCreds) {
  // 2. Escribirlas en /sessions/tenantId/
  await writeCredsToLocal(sessionDir, firestoreCreds);
}

// 3. AHORA SÍ cargar con useMultiFileAuthState
const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
```

---

### **PROBLEMA #5: MÚLTIPLES DISPOSITIVOS POR RE-ESCANEAR QR**

**Causa Raíz:** Problemas #1-#4

**Lo Que Está Pasando:**
1. Backend se apaga (Railway sleep)
2. Backend arranca SIN restaurar sesiones
3. Usuario abre la app, ve que no hay sesión activa
4. Usuario escanea QR de nuevo
5. **WhatsApp registra un NUEVO dispositivo** (porque no reusaste el anterior)
6. Repites este proceso → múltiples dispositivos vinculados

---

## ✅ PROPUESTA DE SOLUCIÓN

### **SOLUCIÓN COMPLETA EN 5 PASOS:**

### **1. Agregar Restauración Automática al Arranque**

**Archivo:** `server/index.js`

**Agregar después de `server.listen()`:**

```javascript
server.listen(PORT, async () => {
  console.log('🚀 Servidor iniciado...');
  
  // ⭐ NUEVO: Restaurar todas las sesiones activas
  setTimeout(async () => {
    console.log('🔄 Restaurando sesiones de WhatsApp...');
    await restoreAllActiveSessions();
  }, 5000); // Esperar 5 segundos para que todo esté listo
});

async function restoreAllActiveSessions() {
  try {
    // 1. Obtener todos los tenants con sesiones guardadas
    const tenants = await getTenantsWithSavedSessions();
    
    console.log(`📱 Encontrados ${tenants.length} tenants con sesiones guardadas`);
    
    // 2. Restaurar cada sesión
    for (const tenantId of tenants) {
      try {
        console.log(`🔄 [${tenantId}] Restaurando sesión...`);
        
        // Usar connection-manager para restaurar
        const success = await connectionManager.ensureConnected(tenantId);
        
        if (success) {
          console.log(`✅ [${tenantId}] Sesión restaurada exitosamente`);
        } else {
          console.log(`⚠️ [${tenantId}] No se pudo restaurar (credenciales inválidas o expiradas)`);
        }
      } catch (error) {
        console.error(`❌ [${tenantId}] Error restaurando:`, error.message);
      }
    }
    
    console.log('✅ Proceso de restauración completado');
  } catch (error) {
    console.error('❌ Error en restauración masiva:', error);
  }
}

async function getTenantsWithSavedSessions() {
  // Consultar Firestore por tenants con credenciales guardadas
  const db = firebaseService.db;
  const snapshot = await db.collection('baileys_sessions').get();
  return snapshot.docs.map(doc => doc.id);
}
```

---

### **2. Sincronizar Credenciales Firestore → Local**

**Archivo:** `server/baileys/session-manager.js`

**Modificar `initSession()` línea 89:**

```javascript
async initSession(tenantId, options = {}) {
  try {
    const sessionDir = path.join(__dirname, '../../sessions', tenantId);
    await fs.mkdir(sessionDir, { recursive: true });

    // ⭐ NUEVO: Cargar credenciales de Firestore PRIMERO
    const firestoreCreds = await storage.loadSessionFromFirebase(tenantId);
    
    if (firestoreCreds && firestoreCreds.creds) {
      logger.info(`[${tenantId}] 📥 Restaurando credenciales de Firestore...`);
      
      // Escribir credenciales en archivos locales
      await storage.writeCredsToLocal(sessionDir, firestoreCreds);
    }

    // AHORA SÍ cargar con useMultiFileAuthState
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    // ... resto del código
  }
}
```

---

### **3. Implementar writeCredsToLocal en Storage**

**Archivo:** `server/baileys/storage.js`

**Agregar nueva función:**

```javascript
/**
 * Escribe credenciales de Firestore al sistema de archivos local
 * Esto es necesario porque Railway borra /sessions/ al reiniciar
 * @param {string} sessionDir - Directorio de la sesión
 * @param {object} firestoreCreds - Credenciales de Firestore
 */
async writeCredsToLocal(sessionDir, firestoreCreds) {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    // Escribir creds.json
    await fs.writeFile(
      path.join(sessionDir, 'creds.json'),
      JSON.stringify(firestoreCreds.creds, null, 2)
    );
    
    // Escribir keys si existen
    if (firestoreCreds.keys) {
      for (const [keyName, keyData] of Object.entries(firestoreCreds.keys)) {
        await fs.writeFile(
          path.join(sessionDir, `${keyName}.json`),
          JSON.stringify(keyData, null, 2)
        );
      }
    }
    
    logger.info('✅ Credenciales escritas en sistema local');
  } catch (error) {
    logger.error('❌ Error escribiendo credenciales:', error);
    throw error;
  }
}
```

**No olvidar exportar:**
```javascript
module.exports = {
  // ... exports existentes
  writeCredsToLocal  // ⭐ NUEVO
};
```

---

### **4. Agregar Heartbeat Periódico**

**Archivo:** `server/index.js`

**Agregar después de restaurar sesiones:**

```javascript
// ⭐ NUEVO: Heartbeat cada 5 minutos
setInterval(async () => {
  console.log('💓 Heartbeat: Verificando sesiones activas...');
  
  const tenants = await getTenantsWithSavedSessions();
  
  for (const tenantId of tenants) {
    if (!connectionManager.isConnected(tenantId)) {
      console.log(`⚠️ [${tenantId}] Desconectado, reconectando...`);
      await connectionManager.ensureConnected(tenantId);
    }
  }
}, 5 * 60 * 1000); // 5 minutos
```

---

### **5. Limpiar Dispositivos Antiguos (Opcional)**

**Archivo:** Nuevo `server/baileys/device-cleaner.js`

```javascript
/**
 * Limpia dispositivos antiguos/duplicados de WhatsApp
 */
const pino = require('pino');
const sessionManager = require('./session-manager');

const logger = pino({ level: 'info' });

/**
 * Limpia dispositivos antiguos que no sean el actual
 * @param {string} tenantId - ID del tenant
 */
async function cleanOldDevices(tenantId) {
  const socket = sessionManager.getSession(tenantId);
  
  if (!socket) {
    logger.warn(`[${tenantId}] No hay sesión activa para limpiar dispositivos`);
    return;
  }
  
  try {
    logger.info(`[${tenantId}] 🔍 Verificando dispositivos vinculados...`);
    
    // Obtener dispositivos vinculados
    const devices = await socket.getDevices();
    
    if (!devices || devices.length === 0) {
      logger.info(`[${tenantId}] No hay dispositivos para limpiar`);
      return;
    }
    
    // Filtrar dispositivos que NO sean el actual
    const otherDevices = devices.filter(d => !d.isCurrent);
    
    if (otherDevices.length > 0) {
      logger.info(`[${tenantId}] 🧹 Limpiando ${otherDevices.length} dispositivos antiguos...`);
      
      for (const device of otherDevices) {
        try {
          await socket.removeDevice(device.id);
          logger.info(`[${tenantId}]   ✅ Dispositivo ${device.id} eliminado`);
        } catch (error) {
          logger.error(`[${tenantId}]   ❌ Error eliminando dispositivo ${device.id}:`, error);
        }
      }
      
      logger.info(`[${tenantId}] ✅ Limpieza de dispositivos completada`);
    } else {
      logger.info(`[${tenantId}] ✅ Solo hay 1 dispositivo (el actual), no se necesita limpieza`);
    }
  } catch (error) {
    logger.error(`[${tenantId}] ❌ Error limpiando dispositivos:`, error);
  }
}

module.exports = {
  cleanOldDevices
};
```

**Llamar después de conectar (en `session-manager.js`):**

```javascript
// En handleConnectionUpdate, cuando connection === 'open'
if (connection === 'open') {
  // ... código existente
  
  // ⭐ NUEVO: Limpiar dispositivos antiguos
  setTimeout(async () => {
    const deviceCleaner = require('./device-cleaner');
    await deviceCleaner.cleanOldDevices(tenantId);
  }, 10000); // Esperar 10 segundos después de conectar
}
```

---

## 📊 FLUJO CORRECTO CON LA SOLUCIÓN

### **Escenario 1: Backend Arranca por Primera Vez (Nuevo Usuario)**
1. Usuario escanea QR → Credenciales se guardan en Firestore ✅
2. Sesión activa en memoria ✅
3. Usuario puede enviar mensajes ✅

### **Escenario 2: Railway Duerme y Despierta (Usuario Ya Registrado)**
1. Railway despierta backend
2. `server.listen()` ejecuta `restoreAllActiveSessions()` ✅
3. Para cada tenant:
   - Cargar credenciales de Firestore
   - Escribirlas en `/sessions/tenantId/`
   - Llamar a `useMultiFileAuthState`
   - Conectar WhatsApp automáticamente
4. **Bot responde sin QR** ✅
5. Usuario envía mensaje → recibe respuesta inmediata ✅

### **Escenario 3: Usuario Cierra/Abre Sesión en Dashboard**
1. Usuario cierra sesión en frontend
2. **Sesión de WhatsApp NO se cierra** (solo logout del dashboard)
3. Usuario vuelve a iniciar sesión
4. Frontend verifica sesión en `/api/baileys/status`
5. **Ve que ya está conectado, no pide QR** ✅

### **Escenario 4: Heartbeat Mantiene Conexión**
1. Cada 5 minutos, `setInterval()` ejecuta heartbeat
2. Verifica todas las sesiones guardadas
3. Si alguna está desconectada → reconecta automáticamente
4. **Bot siempre disponible 24/7** ✅

---

## 🎯 RESUMEN DE PROBLEMAS Y SOLUCIONES

| # | Problema | Solución | Archivo |
|---|----------|----------|---------|
| 1 | ❌ No restaura sesiones al arrancar | ✅ `restoreAllActiveSessions()` en `server.listen()` | `server/index.js` |
| 2 | ❌ Connection Manager no se usa proactivamente | ✅ Llamar `ensureConnected()` al arranque | `server/index.js` |
| 3 | ❌ Credenciales en Firestore no se usan | ✅ `writeCredsToLocal()` antes de `useMultiFileAuthState()` | `server/baileys/storage.js` |
| 4 | ❌ Sesiones no se sincronizan de Firestore a Local | ✅ Cargar y escribir credenciales en `initSession()` | `server/baileys/session-manager.js` |
| 5 | ❌ No hay heartbeat periódico | ✅ `setInterval()` cada 5 min | `server/index.js` |
| 6 | ❌ Múltiples dispositivos vinculados | ✅ `cleanOldDevices()` al conectar | `server/baileys/device-cleaner.js` |
| 7 | ❌ Usuario re-escanea QR innecesariamente | ✅ Frontend verifica `/api/baileys/status` antes de mostrar QR | Frontend (futura mejora) |

---

## 🚀 PRIORIDAD DE IMPLEMENTACIÓN

### **🔴 CRÍTICO (Implementar INMEDIATAMENTE):**
1. ✅ **Solución #1:** Restauración automática al arranque
2. ✅ **Solución #2:** Sincronización Firestore → Local
3. ✅ **Solución #3:** Implementar `writeCredsToLocal()`

**Resultado esperado:** Bot responde después de Railway sleep **SIN** escanear QR de nuevo.

---

### **🟡 IMPORTANTE (Implementar después):**
4. ✅ **Solución #4:** Heartbeat periódico (cada 5 min)

**Resultado esperado:** Bot mantiene conexión activa 24/7, reconecta automáticamente si se cae.

---

### **🟢 BUENO TENER (Implementar cuando haya tiempo):**
5. ✅ **Solución #5:** Limpiador de dispositivos antiguos

**Resultado esperado:** WhatsApp solo muestra 1 dispositivo vinculado en lugar de múltiples.

---

## 📝 NOTAS ADICIONALES

### **¿Por Qué Railway Borra `/sessions/`?**
Railway usa contenedores efímeros. Cuando el contenedor se apaga:
- Todo en el sistema de archivos local se **pierde**
- Solo persisten datos en:
  - ✅ Bases de datos externas (Firestore, MongoDB, etc.)
  - ✅ Almacenamiento en la nube (S3, Cloud Storage, etc.)

**Solución:** Usar Firestore como "source of truth" y sincronizar a local solo cuando se necesita.

---

### **¿Por Qué No Usar Solo Firestore Sin Local?**
Baileys **requiere** archivos locales para funcionar:
```javascript
const { state, saveCreds } = await useMultiFileAuthState('./sessions/tenant123');
```
No hay forma de decirle a Baileys que use solo Firestore directamente.

**Solución:** Patrón "Hydration":
1. Cargar de Firestore (persistente)
2. Escribir en local (temporal)
3. Usar Baileys con archivos locales
4. Guardar cambios de vuelta a Firestore

---

### **Dependencias Necesarias**
Todo el código propuesto usa dependencias que **YA TIENES instaladas**:
- ✅ `@whiskeysockets/baileys`
- ✅ `firebase-admin`
- ✅ `pino` (logger)
- ✅ Node.js `fs/promises`

**No necesitas instalar nada nuevo.**

---

## 🎉 CONCLUSIÓN

La solución propuesta resuelve **TODOS** los problemas identificados:

| Problema | Estado Actual | Estado Después |
|----------|---------------|----------------|
| Usuario debe re-escanear QR después de sleep | ❌ | ✅ |
| Bot no responde después de inactividad | ❌ | ✅ |
| Múltiples dispositivos en WhatsApp | ❌ | ✅ |
| Sesión se pierde al cerrar/abrir dashboard | ❌ | ✅ |
| Credenciales en Firestore no se usan | ❌ | ✅ |

**Implementando las soluciones #1, #2 y #3 (críticas), el sistema funcionará 24/7 sin que los usuarios tengan que escanear QR de nuevo.**

---

**Autor:** GitHub Copilot  
**Fecha:** 20 de enero de 2026  
**Estado:** Pendiente de Implementación
