# 🐛 PROBLEMAS IDENTIFICADOS Y PROPUESTA DE SOLUCIÓN

**Fecha:** 20 de enero de 2026  
**Proyecto:** Sistema KDS + WhatsApp Bot  
**Plataforma:** Railway

---

## 🐛 PROBLEMAS IDENTIFICADOS

### 1. **Pérdida de Sesiones WhatsApp tras Sleep de Railway**

**Síntoma:**
- Usuarios deben escanear QR cada vez que Railway despierta el backend
- Sesiones WhatsApp no persisten entre reinicios del servidor

**Causa Raíz:**
- Railway elimina archivos locales cuando el contenedor entra en sleep
- Las credenciales están guardadas en Firestore, pero NO se restauran automáticamente al disco local en el arranque del servidor
- `session-manager.js` solo lee del disco local (`./sessions/[tenantId]`)
- No existe código que hidrate las sesiones desde Firestore → disco local en el startup

**Impacto:**
- **CRÍTICO**: Cada sleep = pérdida total de sesiones activas
- Experiencia de usuario terrible: QR scan repetitivo
- No es viable para producción en Railway

---

### 2. **Desaparición de Pedidos tras Reconexión WhatsApp**

**Síntoma:**
- Pedidos desaparecen del KDS después de que el bot de WhatsApp se reconecta
- Firebase muestra los pedidos, pero desaparecen tras reconexión

**Causa Raíz (YA CORREGIDA):**
```javascript
// ❌ ANTES (tenant-service.js)
await db.ref(`tenants/${tenantId}`).set({
  ...tenantData,
  lastUpdated: admin.database.ServerValue.TIMESTAMP
});
// Esto SOBRESCRIBE todo el nodo, BORRANDO los pedidos

// ✅ DESPUÉS (CORREGIDO)
await db.ref(`tenants/${tenantId}`).update({
  ...tenantData,
  lastUpdated: admin.database.ServerValue.TIMESTAMP
});
// Esto ACTUALIZA solo los campos especificados, PRESERVA pedidos
```

**Estado:**
- ✅ **RESUELTO** en commit previo
- Los pedidos ya NO desaparecen tras reconexión
- Firebase preserva correctamente el estado

---

### 3. **Error de Cache Frontend (app.js:111)**

**Síntoma:**
```
Uncaught TypeError: Cannot set properties of null (setting 'textContent')
    at app.js:111
```

**Causa Raíz:**
- Código intenta acceder a `document.getElementById('clock')` antes de que el elemento exista
- Service Worker o cache del browser sirve versión antigua de `app.js`
- Cache busting (`?v=timestamp`) no siempre es suficiente

**Impacto:**
- KDS puede fallar silenciosamente en algunos browsers
- Usuarios ven versión cacheada desactualizada

**Estado:**
- ✅ **PARCIALMENTE RESUELTO**: Código defensivo añadido
- ⚠️ **PENDIENTE**: Verificar que TODOS los usuarios reciban la última versión

---

### 4. **Falta de Reconexión Automática Robusta**

**Síntoma:**
- Si Railway duerme > 10 minutos, sesiones no se restauran automáticamente
- No hay heartbeat que verifique estado de conexiones periódicamente

**Causa Raíz:**
- `connection-manager.js` tiene lógica de auto-reconexión DENTRO de una sesión activa
- Pero NO hay lógica que restaure sesiones desde Firestore en cold start
- No hay monitoreo proactivo de salud de conexiones

**Impacto:**
- Bot "muere" silenciosamente tras sleep prolongado
- No hay manera de detectar sesiones muertas hasta que un usuario intenta usarlas

---

### 5. **Acumulación de Dispositivos en WhatsApp**

**Síntoma:**
- Usuarios ven múltiples dispositivos "AUTOMATER" en WhatsApp
- Cada reconexión puede crear un nuevo device en lugar de reusar el anterior

**Causa Raíz:**
- No hay limpieza de dispositivos antiguos
- `creds.json` se corrompe o se crea uno nuevo en cada intento
- WhatsApp permite hasta 4 dispositivos vinculados simultáneamente

**Impacto:**
- Confusión para el usuario
- Posible límite de dispositivos alcanzado
- Sesiones fragmentadas (mensajes llegan a device antiguo)

---

## 💡 PROPUESTA DE SOLUCIÓN COMPLETA

### **OBJETIVO:**
Lograr que las sesiones WhatsApp sobrevivan a sleep/restart de Railway y se restauren automáticamente sin intervención del usuario.

---

## 📋 PLAN DE IMPLEMENTACIÓN (5 PASOS)

### **PASO 1: Restaurar Sesiones en Startup del Servidor**

**Archivo:** `server/index.js`

**Acción:**
```javascript
// Al iniciar el servidor (ANTES de iniciar el servidor Express)
async function restoreAllSessions() {
  console.log('[Startup] Restaurando sesiones WhatsApp desde Firestore...');
  
  const db = admin.database();
  const tenantsRef = db.ref('tenants');
  const snapshot = await tenantsRef.once('value');
  const tenants = snapshot.val();
  
  if (!tenants) {
    console.log('[Startup] No hay tenants registrados');
    return;
  }
  
  for (const [tenantId, tenantData] of Object.entries(tenants)) {
    if (tenantData.whatsappConnected) {
      console.log(`[Startup] Restaurando sesión para tenant: ${tenantId}`);
      
      try {
        // Hidratar archivos locales desde Firestore
        await hydrateLocalSessionFromFirestore(tenantId);
        
        // Iniciar sesión WhatsApp
        await sessionManager.initSession(tenantId);
        
        console.log(`[Startup] ✅ Sesión restaurada: ${tenantId}`);
      } catch (error) {
        console.error(`[Startup] ❌ Error restaurando ${tenantId}:`, error);
        
        // Marcar como desconectado en Firebase
        await db.ref(`tenants/${tenantId}`).update({
          whatsappConnected: false,
          whatsappStatus: 'disconnected',
          lastError: error.message
        });
      }
    }
  }
  
  console.log('[Startup] ✅ Proceso de restauración completado');
}

// Ejecutar ANTES de app.listen()
restoreAllSessions()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('❌ Error fatal en startup:', error);
    process.exit(1);
  });
```

---

### **PASO 2: Crear Utilidad de Hidratación de Sesiones**

**Nuevo Archivo:** `server/baileys/session-hydrator.js`

**Funcionalidad:**
```javascript
const fs = require('fs').promises;
const path = require('path');
const { getSessionData } = require('./storage');

async function hydrateLocalSessionFromFirestore(tenantId) {
  console.log(`[Hydrator] Hidratando sesión local para ${tenantId}...`);
  
  // 1. Obtener credenciales desde Firestore
  const sessionData = await getSessionData(tenantId);
  
  if (!sessionData || !sessionData.creds) {
    throw new Error(`No hay credenciales en Firestore para ${tenantId}`);
  }
  
  // 2. Crear directorio local si no existe
  const sessionDir = path.join(__dirname, '../../sessions', tenantId);
  await fs.mkdir(sessionDir, { recursive: true });
  
  // 3. Escribir creds.json
  const credsPath = path.join(sessionDir, 'creds.json');
  await fs.writeFile(
    credsPath,
    JSON.stringify(sessionData.creds, null, 2),
    'utf-8'
  );
  
  console.log(`[Hydrator] ✅ creds.json escrito en ${credsPath}`);
  
  // 4. Escribir app-state-sync-key-*.json (si existen)
  if (sessionData.keys) {
    for (const [keyId, keyData] of Object.entries(sessionData.keys)) {
      const keyPath = path.join(sessionDir, `app-state-sync-key-${keyId}.json`);
      await fs.writeFile(
        keyPath,
        JSON.stringify(keyData, null, 2),
        'utf-8'
      );
    }
    console.log(`[Hydrator] ✅ ${Object.keys(sessionData.keys).length} keys escritas`);
  }
  
  console.log(`[Hydrator] ✅ Sesión ${tenantId} hidratada exitosamente`);
}

module.exports = { hydrateLocalSessionFromFirestore };
```

---

### **PASO 3: Agregar Heartbeat de Salud de Sesiones**

**Archivo:** `server/baileys/connection-manager.js`

**Acción:**
```javascript
// Al final del archivo, agregar:

// Heartbeat: verificar cada 2 minutos que las sesiones estén vivas
setInterval(async () => {
  console.log('[Heartbeat] Verificando salud de sesiones...');
  
  const sessions = sessionManager.getActiveSessions(); // Método a implementar
  
  for (const tenantId of sessions) {
    const sock = sessionManager.getSocket(tenantId);
    
    if (!sock || sock.ws.readyState !== 1) { // 1 = OPEN
      console.warn(`[Heartbeat] ⚠️ Sesión ${tenantId} no está OPEN, intentando reconectar...`);
      
      try {
        await sessionManager.reconnect(tenantId);
        console.log(`[Heartbeat] ✅ Reconexión exitosa: ${tenantId}`);
      } catch (error) {
        console.error(`[Heartbeat] ❌ Error reconectando ${tenantId}:`, error);
      }
    } else {
      console.log(`[Heartbeat] ✅ Sesión ${tenantId} saludable`);
    }
  }
}, 2 * 60 * 1000); // Cada 2 minutos
```

---

### **PASO 4: Implementar Limpieza de Dispositivos Antiguos**

**Archivo:** `server/baileys/session-manager.js`

**Acción:**
```javascript
// Agregar al método initSession, DESPUÉS de connection.open:

async initSession(tenantId) {
  // ... código existente ...
  
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (connection === 'open') {
      console.log(`[${tenantId}] ✅ Conexión WhatsApp establecida`);
      
      // 🆕 LIMPIAR DISPOSITIVOS ANTIGUOS
      try {
        const devices = await sock.getDevices();
        console.log(`[${tenantId}] Dispositivos vinculados: ${devices.length}`);
        
        // Desconectar dispositivos que NO sean el actual
        const currentDeviceId = sock.user.id.split(':')[0];
        
        for (const device of devices) {
          if (device.id !== currentDeviceId && device.platform === 'smba') {
            console.log(`[${tenantId}] Desvinculando device antiguo: ${device.id}`);
            await sock.logout(device.id);
          }
        }
      } catch (error) {
        console.error(`[${tenantId}] Error limpiando devices:`, error);
        // No fallar la conexión por esto
      }
      
      // ... resto del código ...
    }
  });
}
```

---

### **PASO 5: Mejorar Logging y Monitoreo**

**Archivos:** Todos los módulos de Baileys

**Acción:**
```javascript
// Agregar timestamps y contexto a TODOS los logs

console.log(`[${new Date().toISOString()}] [${tenantId}] Mensaje...`);

// Agregar métricas básicas en Firebase:
await db.ref(`tenants/${tenantId}/metrics`).update({
  lastReconnect: Date.now(),
  reconnectCount: admin.database.ServerValue.increment(1),
  lastMessageReceived: Date.now(),
  sessionUptime: Date.now() - sessionStartTime
});
```

---

## 🎯 RESULTADO ESPERADO

### **ANTES (Estado Actual):**
1. ❌ Usuario registra cuenta → vincula WhatsApp
2. ❌ Railway duerme 10 minutos
3. ❌ Usuario envía mensaje → bot NO responde
4. ❌ Usuario debe escanear QR de nuevo
5. ❌ Pedidos desaparecen (YA CORREGIDO)

### **DESPUÉS (Con Propuesta Implementada):**
1. ✅ Usuario registra cuenta → vincula WhatsApp
2. ✅ Railway duerme 10 minutos
3. ✅ Backend despierta → restaura AUTOMÁTICAMENTE sesión desde Firestore
4. ✅ Usuario envía mensaje → bot responde INMEDIATAMENTE
5. ✅ NO se requiere escanear QR de nuevo
6. ✅ Pedidos persisten correctamente
7. ✅ Heartbeat detecta y reconecta sesiones muertas
8. ✅ Dispositivos antiguos se limpian automáticamente

---

## 📊 PRIORIZACIÓN

### **CRÍTICO (Implementar YA):**
- ✅ PASO 1: Restauración en startup
- ✅ PASO 2: Hidratador de sesiones

### **IMPORTANTE (Esta semana):**
- ⚠️ PASO 3: Heartbeat de salud
- ⚠️ PASO 5: Logging mejorado

### **BUENO TENER (Próxima semana):**
- 📋 PASO 4: Limpieza de dispositivos

---

## ⚠️ RIESGOS Y CONSIDERACIONES

### **1. Rate Limiting de WhatsApp**
- **Riesgo:** Reconexiones muy frecuentes pueden trigger rate limits
- **Mitigación:** Implementar backoff exponencial (ya existe en `connection-manager.js`)

### **2. Concurrencia en Startup**
- **Riesgo:** Restaurar 100 sesiones simultáneamente puede saturar la red
- **Mitigación:** Procesar en lotes de 5-10 con delay entre lotes

### **3. Credenciales Corruptas**
- **Riesgo:** Si `creds.json` está corrupto, la sesión nunca se recupera
- **Mitigación:** Implementar validación de estructura antes de hidratar

### **4. Timeout de Railway**
- **Riesgo:** Si la restauración toma > 30s, Railway puede matar el proceso
- **Mitigación:** Hacer restauración asíncrona (no bloquear `app.listen()`)

---

## 🧪 PLAN DE TESTING

### **Test 1: Restauración en Cold Start**
```bash
# 1. Forzar sleep de Railway (inactividad de 10 min)
# 2. Enviar request HTTP para despertar backend
# 3. Esperar 30 segundos
# 4. Enviar mensaje WhatsApp desde número registrado
# ESPERADO: Bot responde sin pedir QR
```

### **Test 2: Heartbeat Detecta Sesión Muerta**
```bash
# 1. Simular desconexión de red (desconectar WiFi del servidor)
# 2. Esperar 3 minutos (heartbeat debería detectarlo)
# 3. Reconectar WiFi
# ESPERADO: Logs muestran reconexión automática
```

### **Test 3: Limpieza de Dispositivos**
```bash
# 1. Vincular WhatsApp normalmente
# 2. Simular 3 reconexiones (forzar restart del backend)
# 3. Verificar dispositivos en WhatsApp del usuario
# ESPERADO: Solo 1 dispositivo "AUTOMATER" visible
```

---

## 📚 RECURSOS DE REFERENCIA

- **Baileys Docs:** https://github.com/WhiskeySockets/Baileys
- **Firebase Realtime DB:** https://firebase.google.com/docs/database
- **Railway Sleep Behavior:** https://docs.railway.app/reference/pricing#usage-limits

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Implementar `hydrateLocalSessionFromFirestore()` en `session-hydrator.js`
- [ ] Implementar `restoreAllSessions()` en `server/index.js`
- [ ] Agregar heartbeat en `connection-manager.js`
- [ ] Implementar limpieza de dispositivos en `session-manager.js`
- [ ] Mejorar logging con timestamps
- [ ] Agregar métricas de sesión en Firebase
- [ ] Testing en ambiente de staging
- [ ] Deploy a producción
- [ ] Monitoreo post-deploy (24h)

---

**FIN DEL DOCUMENTO**
