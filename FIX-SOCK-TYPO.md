# 🐛 Fix: Error "sock is not defined" en Onboarding

**Fecha:** 21 de enero de 2026  
**Estado:** ✅ RESUELTO

---

## 🔴 PROBLEMA

Al intentar generar el QR en el onboarding, aparecía el error:

```
❌ Error al conectar
sock is not defined
```

---

## 🔍 DIAGNÓSTICO

### Causa Raíz:
**Typo en `server/baileys/session-manager.js` línea 161**

```javascript
// ❌ INCORRECTO (línea 161)
sock.ev.on('connection.update', async (update) => {

// ✅ CORRECTO
socket.ev.on('connection.update', async (update) => {
```

### Contexto:
- La variable `socket` se define en la línea 134
- Más abajo (línea 161) se usaba erróneamente `sock` en vez de `socket`
- Esto causaba `ReferenceError: sock is not defined` cuando intentaba escuchar eventos de conexión

---

## ✅ SOLUCIÓN

### Cambio Aplicado:
**Archivo:** `server/baileys/session-manager.js`  
**Línea:** 161  
**Cambio:** `sock.ev.on` → `socket.ev.on`

```diff
      // Escuchar eventos de conexión
-     sock.ev.on('connection.update', async (update) => {
+     socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
```

---

## 📊 RESULTADO

### ✅ Antes del Fix:
- ❌ Error al generar QR: "sock is not defined"
- ❌ No se podía completar onboarding
- ❌ Eventos de conexión no se escuchaban

### ✅ Después del Fix:
- ✅ QR se genera correctamente
- ✅ Eventos de conexión funcionan
- ✅ Onboarding completo funcional
- ✅ Socket escucha: QR, conexión abierta, cierre, credenciales, mensajes

---

## 🎯 RESUMEN DE TODOS LOS CAMBIOS HOY

### 1. **Node 18 → Node 20** ⚡
**Archivo:** `Dockerfile` línea 1  
**Razón:** Baileys 7.x requiere Node 20+  
**Commit:** `9ed6094`

### 2. **Agregar bash a Alpine** 🐚
**Archivo:** `Dockerfile` línea 4  
**Razón:** Scripts necesitan bash  
**Commit:** `c33b1c6`

### 3. **Eliminar railway.toml** 🗑️
**Archivo:** `railway.toml` (eliminado)  
**Razón:** Conflicto con railway.json, buscaba start.sh inexistente  
**Commit:** `c33b1c6`

### 4. **Fix typo sock → socket** 🐛
**Archivo:** `server/baileys/session-manager.js` línea 161  
**Razón:** Error "sock is not defined" en onboarding  
**Commit:** `b2e5a82`

---

## 📝 COMMITS REALIZADOS

```bash
# Commit 1: Node version
9ed6094 - Fix: Actualizar Node 18 -> 20 (requerido por Baileys 7.x)

# Commit 2: Bash + eliminar railway.toml
c33b1c6 - Fix: Agregar bash a Alpine + eliminar railway.toml

# Commit 3: Fix typo
b2e5a82 - Fix: Corregir typo sock -> socket en session-manager
```

---

## ✅ ESTADO ACTUAL

### Deploy en Railway:
- ✅ Build exitoso
- ✅ Servidor corriendo en Node 20
- ✅ Backend funcionando sin errores
- ✅ Onboarding QR generando correctamente

### Servicios Activos:
- ✅ Firebase conectado
- ✅ WhatsApp Handler inicializado
- ✅ Baileys event listeners configurados
- ✅ Socket.IO funcionando
- ✅ Heartbeat monitor activo

---

## 🔗 Enlaces de Deploy

- **Build Logs:** https://railway.com/project/e0dd8cc4-c263-4912-ac23-b18142f8910e/service/b8f72ca4-7fa7-4c1b-ad67-1ba8cd583198?id=54ddda71-7681-4821-af96-6b656b3f6a26
- **Dashboard Railway:** https://railway.app/project/e0dd8cc4-c263-4912-ac23-b18142f8910e

---

## 🎉 RESULTADO FINAL

### Problema Original (Inicio del día):
- ❌ Railway servía versión antigua del frontend
- ❌ Error de build: npm ci fallaba
- ❌ Circular dependencies en backend
- ❌ Frontend mostraba login.html legacy
- ❌ Onboarding QR fallaba con "sock is not defined"

### Estado Actual (Fin):
- ✅ Railway sirve versión correcta del frontend
- ✅ Build exitoso con Node 20
- ✅ Backend sin circular dependencies
- ✅ Frontend correcto (auth.html → select.html)
- ✅ Onboarding QR funcionando
- ✅ Todos los servicios operacionales

---

**Última actualización:** 21 de enero de 2026, 16:45  
**Status:** 🟢 OPERACIONAL
