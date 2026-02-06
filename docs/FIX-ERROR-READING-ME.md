# 🐛 FIX: Error "Cannot read properties of undefined (reading 'me')"

## 📋 Problema

Al intentar generar un código QR para conectar WhatsApp, aparecía el error:

```
❌ Error al conectar
Cannot read properties of undefined (reading 'me')
```

## 🔍 Causa Raíz

El error ocurría en la siguiente secuencia:

1. **Usuario intenta conectar WhatsApp** → Llama a `/api/baileys/connect`
2. **Sistema intenta cargar credenciales** → Llama a `storage.getAuthState(tenantId)`
3. **Firebase retorna datos vacíos/corruptos** → `state.creds` es `undefined` o un objeto vacío
4. **Baileys intenta acceder a `state.creds.me`** → 💥 ERROR: "Cannot read properties of undefined"

### Escenarios que causaban el problema:

- ✅ Primera conexión (sin credenciales previas)
- ❌ Credenciales corruptas en Firebase
- ❌ Objeto `creds` vacío en Firestore
- ❌ Sesión local eliminada pero Firebase tiene datos inválidos

## ✅ Solución Implementada

### 1. Validación Defensiva en `storage.js`

**Archivo:** `server/baileys/storage.js`

**Cambios:**
```javascript
// ANTES: No validaba si creds era válido
if (sessionData && sessionData.creds) {
  state.creds = sessionData.creds;
}

// DESPUÉS: Valida estructura completa
if (sessionData && 
    sessionData.creds && 
    typeof sessionData.creds === 'object' && 
    Object.keys(sessionData.creds).length > 0) {
  
  state.creds = sessionData.creds;
  logger.info(`✅ Credenciales válidas (${Object.keys(sessionData.creds).length} propiedades)`);
} else {
  logger.warn(`⚠️  Credenciales vacías o inválidas`);
}
```

### 2. Validación en `session-manager.js`

**Archivo:** `server/baileys/session-manager.js`

**Cambios:**
```javascript
// Verificar que state y creds son válidos ANTES de usarlos
if (state && 
    state.creds && 
    typeof state.creds === 'object' && 
    Object.keys(state.creds).length > 0) {
  logger.info(`✅ Credenciales válidas cargadas`);
} else {
  logger.warn(`⚠️  Credenciales inválidas, creando nueva sesión`);
  throw new Error('Invalid credentials');
}
```

### 3. Validación en `saveCreds()`

**Archivo:** `server/baileys/storage.js`

**Cambios:**
```javascript
// ANTES: No validaba antes de guardar
if (!firebaseService || !state.creds) return;

// DESPUÉS: Validación completa
if (!firebaseService) {
  logger.warn(`⚠️  Firebase no disponible`);
  return;
}

if (!state || !state.creds) {
  logger.warn(`⚠️  State o creds undefined`);
  return;
}

if (typeof state.creds !== 'object' || Object.keys(state.creds).length === 0) {
  logger.warn(`⚠️  Creds vacío o inválido`);
  return;
}
```

## 🎯 Resultado

Ahora el sistema:

1. ✅ **Valida credenciales** antes de usarlas
2. ✅ **Muestra logs claros** del estado de las credenciales
3. ✅ **Maneja gracefully** credenciales corruptas/vacías
4. ✅ **Crea nueva sesión** automáticamente si las credenciales son inválidas
5. ✅ **No crashea** con el error "cannot read 'me'"

## 📊 Logs Mejorados

Ahora verás logs como:

```
[tenant_123] 🔥 Intentando cargar credenciales desde Firebase...
[tenant_123] ✅ Credenciales válidas cargadas desde Firebase
[tenant_123]    📋 Propiedades en creds: 15
```

O en caso de error:

```
[tenant_123] 🔥 Intentando cargar credenciales desde Firebase...
[tenant_123] ⚠️  Credenciales en Firestore vacías o inválidas
[tenant_123] 📂 Intentando cargar desde archivos locales...
[tenant_123] 🆕 Iniciando sesión nueva - se generará QR
```

## 🧪 Cómo Probar

1. **Caso 1: Primera conexión (sin credenciales)**
   ```bash
   POST /api/baileys/connect
   Body: { "tenantId": "nuevo_tenant" }
   ```
   ✅ Debe generar QR sin errores

2. **Caso 2: Reconexión con credenciales válidas**
   ```bash
   POST /api/baileys/connect
   Body: { "tenantId": "tenant_existente" }
   ```
   ✅ Debe reconectar sin pedir QR

3. **Caso 3: Credenciales corruptas**
   - Corromper manualmente las credenciales en Firestore
   - Intentar conectar
   ✅ Debe detectar el problema y generar nuevo QR

## 📝 Archivos Modificados

- ✅ `server/baileys/storage.js` - Validación de credenciales
- ✅ `server/baileys/session-manager.js` - Validación antes de usar
- ✅ `server/index.js` - Auto-reconexión al iniciar

## 🚀 Deploy

Después de hacer push de estos cambios, el error ya no debe aparecer.

```bash
git add .
git commit -m "fix: Validación defensiva de credenciales - Fix error 'cannot read me'"
git push
```

---

**Fecha:** 6 de febrero de 2026  
**Severity:** 🔴 CRÍTICO (bloqueaba conexiones nuevas)  
**Status:** ✅ RESUELTO
