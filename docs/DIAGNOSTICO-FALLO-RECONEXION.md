# 🔍 DIAGNÓSTICO: Por qué falló la reconexión después del deploy

**Fecha:** 6 de febrero de 2026, 18:56 UTC  
**Tenant afectado:** `tenant1770048862553p1dcfnuzr` (grillo)  
**Síntoma:** No puede reconectar automáticamente, pide QR de nuevo

---

## 📊 ANÁLISIS DE LOGS

### Logs del deploy:

```
[tenant1770048862553p1dcfnuzr] 💧 Necesita hidratación desde Firestore
🔄 Hidratando 1 sesiones desde Firestore...
[Hydrator] 🔄 Hidratando 1 sesiones en lotes de 3...
[Hydrator] 💧 Hidratando sesión para tenant1770048862553p1dcfnuzr...
[tenant1770048862553p1dcfnuzr] ⚠️ No hay credenciales guardadas en tenant
[tenant1770048862553p1dcfnuzr] [Hydrator] ⚠️ No hay credenciales en Firestore
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💧 RESULTADO DE HIDRATACIÓN:
   ✅ Exitosas: 0/1
   ❌ Fallidas: 1/1
```

**Interpretación:**
- ✅ El sistema detecta que el tenant tiene `whatsappConnected: true`
- ✅ Intenta hidratar (restaurar) la sesión desde Firebase
- ❌ **NO encuentra credenciales** guardadas
- ❌ Falla la hidratación → Pide QR de nuevo

---

## 🔍 VERIFICACIÓN EN FIREBASE (via CLI)

### 1. Verificar que el tenant existe:

```bash
firebase database:get /tenants/tenant1770048862553p1dcfnuzr --project kds-app-7f1d3
```

**Resultado:** ✅ **El tenant existe**

Datos relevantes:
```json
{
  "restaurant": {
    "name": "grillo",
    "phone": "16782305962",
    "connectedAt": "2026-02-06T18:55:01.057Z",
    "whatsappConnected": true  ← ✅ Marcado como conectado
  },
  "whatsapp": {
    "baileys": {
      "connected": true,
      "phoneNumber": "16782305962",
      "lastSeen": "2026-02-06T18:54:59.555Z"
    }
  }
}
```

### 2. Verificar si existe la sesión de Baileys (nueva ubicación):

```bash
firebase database:get /tenants/tenant1770048862553p1dcfnuzr/baileys_session --project kds-app-7f1d3
```

**Resultado:** ❌ **`null` (no existe)**

### 3. Verificar si existe en la ubicación antigua:

```bash
firebase database:get /baileys_sessions/tenant1770048862553p1dcfnuzr --project kds-app-7f1d3
```

**Resultado:** ❌ **`(empty)` (no existe)**

```bash
firebase database:get /baileys_sessions --project kds-app-7f1d3
```

**Resultado:** ❌ **`null` (la ruta completa no existe)**

---

## 🎯 CONCLUSIÓN

### Lo que pasó:

1. **El usuario conectó WhatsApp** → Escaneo el QR, WhatsApp conectó exitosamente
2. **El flag se actualizó** → `whatsappConnected: true` en Firebase
3. **Pero las credenciales NUNCA se guardaron** → No hay `/baileys_session/` en Firebase
4. **Hicimos el deploy con los cambios** → El código ahora busca en `/tenants/{id}/baileys_session`
5. **El backend intenta reconectar** → No encuentra credenciales
6. **Pide QR de nuevo** → Es lo correcto, porque las credenciales no existen

---

## 🤔 ¿POR QUÉ NO SE GUARDARON LAS CREDENCIALES?

### Hipótesis más probable:

La sesión se conectó, pero **antes de que Baileys guardara las credenciales**, algo pasó:

1. **El backend se reinició** (Railway sleep o redeploy)
2. **La sesión solo estaba en memoria/disco local** (no en Firebase)
3. **No hubo tiempo de llamar a `saveCreds()`**

### Evidencia:

- ✅ El tenant tiene historial de pedidos (21 pedidos totales)
- ✅ El último pedido fue `2026-02-05T17:43:16.338Z`
- ✅ El flag `connectedAt` es `2026-02-06T18:55:01.057Z` (muy reciente)
- ❌ Pero **no hay `/baileys_session/`** en Firebase

**Esto indica:** La conexión fue reciente, probablemente antes del último deploy, y las credenciales estaban solo en el disco local (efímero en Railway).

---

## 🔧 ¿QUÉ SALIÓ MAL CON EL CÓDIGO?

### Código anterior (problemático):

El código **SÍ intentaba guardar las credenciales**, pero había varios problemas:

#### 1. Guardaba en Firestore (que NO estaba configurado):

```javascript
// storage.js - ANTES
const db = firebaseService.db; // ❌ Firestore (no configurado)
const sessionRef = db.collection('baileys_sessions').doc(tenantId);
await sessionRef.set({ creds: {...} });
```

**Problema:** `firebaseService.db` era `undefined` porque Firestore nunca se inicializó.

#### 2. Fallaba silenciosamente:

```javascript
try {
  await sessionRef.set(...); // ❌ Falla porque db es undefined
} catch (error) {
  logger.error('Error guardando sesión'); // Solo log, no retry
}
```

**Resultado:** Las credenciales nunca se guardaron, pero el sistema no notificó al usuario.

---

## ✅ SOLUCIÓN APLICADA

### Cambios realizados:

1. ✅ **Migrado a Realtime Database** (que SÍ está configurado)
2. ✅ **Sesiones dentro del tenant** (`/tenants/{id}/baileys_session`)
3. ✅ **Mejor manejo de errores**
4. ✅ **Validaciones antes de guardar**

### Código nuevo:

```javascript
// storage.js - AHORA
const sessionRef = firebaseService.database  // ✅ Realtime Database
  .ref(`tenants/${tenantId}/baileys_session`);

await sessionRef.set({
  creds: state.creds,
  keys: state.keys,
  updatedAt: new Date().toISOString(),
  savedAt: Date.now()
});

logger.info(`✅ Credenciales guardadas en tenant data`);
```

---

## 🚀 PRÓXIMOS PASOS

### Para el usuario (grillo):

1. **Abrir el dashboard:** https://kdsapp.site/dashboard.html
2. **Ir a "Conectar WhatsApp"**
3. **Escanear el QR de nuevo** (última vez)
4. **Verificar que la sesión se guarde:**

```bash
# Después de escanear, ejecutar:
firebase database:get /tenants/tenant1770048862553p1dcfnuzr/baileys_session --project kds-app-7f1d3
```

Deberías ver:
```json
{
  "creds": { ... },  ← ✅ Credenciales completas
  "keys": { ... },
  "updatedAt": "2026-02-06T...",
  "savedAt": 1770...
}
```

5. **Hacer un redeploy de prueba** → El sistema debe reconectar automáticamente

---

## 📋 VERIFICACIONES POST-DEPLOY

### 1. Verificar que las credenciales se guardan:

**Inmediatamente después de escanear el QR:**

```bash
firebase database:get /tenants/tenant1770048862553p1dcfnuzr/baileys_session/creds --project kds-app-7f1d3
```

Debe mostrar un objeto JSON grande con propiedades como:
- `noiseKey`
- `signedIdentityKey`
- `signedPreKey`
- `registrationId`
- `me`

### 2. Verificar en los logs del backend:

Buscar este mensaje:
```
[tenant1770048862553p1dcfnuzr] ✅ Credenciales guardadas en tenant data (N propiedades)
```

### 3. Probar reconexión:

**Después de que las credenciales estén guardadas:**

1. Hacer un redeploy (o esperar a que Railway duerma)
2. Verificar logs en el siguiente inicio:

Deberías ver:
```
[tenant1770048862553p1dcfnuzr] ✅ Credenciales válidas cargadas desde tenant data
[tenant1770048862553p1dcfnuzr] 📋 Propiedades en creds: 8
[tenant1770048862553p1dcfnuzr] ✅ Sesión hidratada exitosamente
```

---

## ⚠️ NOTAS IMPORTANTES

### Por qué no se guardó antes:

1. **Firestore NO estaba configurado** → `firebaseService.db` era `undefined`
2. **Los errores se capturaban silenciosamente** → No había alertas
3. **Railway tiene disco efímero** → Los archivos locales se pierden al dormir

### Por qué funcionará ahora:

1. ✅ **Realtime Database SÍ está configurado** → `firebaseService.database` funciona
2. ✅ **Mejor estructura** → Sesiones dentro del tenant
3. ✅ **Mejores logs** → Sabremos si algo falla
4. ✅ **Validaciones** → Solo guarda si los datos son válidos

---

## 🔍 REGLAS DE FIREBASE

### Estado actual:

```json
{
  "rules": {
    "tenants": {
      "$tenantId": {
        ".read": true,   ← ✅ Permite lectura
        ".write": true   ← ✅ Permite escritura
      }
    }
  }
}
```

**Análisis:**
- ✅ Las reglas permiten lectura/escritura en `/tenants/`
- ✅ Esto incluye `/tenants/{id}/baileys_session`
- ✅ **NO hay problema de permisos**

### ⚠️ ADVERTENCIA DE SEGURIDAD:

Las reglas actuales son **demasiado abiertas** (`.read: true, .write: true`).

**Recomendación para producción:**

```json
{
  "rules": {
    "tenants": {
      "$tenantId": {
        ".read": "auth != null && (auth.uid === data.child('userId').val() || auth.uid === $tenantId)",
        ".write": "auth != null && (auth.uid === data.child('userId').val() || auth.uid === $tenantId)"
      }
    }
  }
}
```

Pero **DESPUÉS** de verificar que la reconexión funciona.

---

## ✅ RESUMEN EJECUTIVO

| Aspecto | Estado | Acción |
|---------|--------|--------|
| **Tenant existe** | ✅ Sí | Ninguna |
| **Flag whatsappConnected** | ✅ true | Ninguna |
| **Credenciales guardadas** | ❌ No | **Escanear QR de nuevo** |
| **Código actualizado** | ✅ Sí | Ninguna |
| **Reglas Firebase** | ✅ Permiten acceso | Ninguna (por ahora) |
| **Reconexión futura** | ⏳ Pendiente | Verificar después de escanear |

---

## 🎯 ACCIÓN INMEDIATA REQUERIDA

**Para el restaurante "grillo":**

1. ✅ Abrir dashboard
2. ✅ Ir a "Conectar WhatsApp"
3. ✅ Escanear QR **una última vez**
4. ✅ Verificar en Firebase que se guardó la sesión
5. ✅ Probar reconexión automática después de un redeploy

**Después de esto, NUNCA más debería pedir el QR (a menos que el usuario cierre sesión manualmente en WhatsApp Web).**

---

## 📚 DOCUMENTACIÓN RELACIONADA

- `docs/POR-QUE-REALTIME-DATABASE.md` - Por qué se usa Realtime Database
- `docs/REFACTOR-SESIONES-DENTRO-TENANT.md` - Cambios arquitectónicos
- `docs/COMPARACION-VISUAL-SESIONES.md` - Comparación antes/después
- `server/baileys/storage.js` - Código actualizado
