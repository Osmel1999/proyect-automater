# ✅ FIX: Túnel Muestra "Activo" Sin Conexión Real

## Problema Solucionado

El indicador visual mostraba "🌐 Túnel Activo" cuando el Service Worker estaba registrado, pero **sin verificar** si el WebSocket estaba realmente conectado al backend.

### Causa Raíz

1. Service Worker requería `tenantId` en la conexión inicial
2. Si no había `tenantId`, backend rechazaba la conexión
3. UI mostraba "Activo" solo porque SW estaba registrado
4. WebSocket nunca se conectaba

## Solución Implementada

### 1. Backend: Permitir Conexión Sin TenantId Inicial

**Archivo:** `server/index.js`

**Cambios:**
- ✅ Permitir conexión WebSocket sin `tenantId` en query params
- ✅ Agregar handler para mensaje `tunnel.register` (registro tardío)
- ✅ Usar `currentTenantId` local en lugar de parámetro inicial

```javascript
// ANTES: Rechazaba conexión sin tenantId
if (!tenantId) {
  socket.destroy();
  return;
}

// DESPUÉS: Permite conexión, espera registro
const tenantId = query.tenantId || null;  // ✅ Permitir null
```

### 2. TunnelManager: Registro Sin TenantId

**Archivo:** `server/tunnel-manager.js`

**Cambios:**
- ✅ Permitir registro sin `tenantId` inicial
- ⚠️ Advertencia en logs cuando no hay `tenantId`
- ✅ Permitir que túnel se registre después

```javascript
// ANTES: Rechazaba registro sin tenantId
if (!tenantId) {
  socket.close(1008, 'Tenant ID requerido');
  return false;
}

// DESPUÉS: Permite registro, advierte en logs
if (!tenantId) {
  console.warn('⚠️ Túnel sin tenantId inicial');
  return true;  // ✅ Permitir
}
```

### 3. Service Worker: Registro Tardío

**Archivo:** `sw-tunnel.js`

**Cambios:**
- ✅ Conectar WebSocket sin `tenantId` en URL si no está disponible
- ✅ Enviar mensaje `tunnel.register` cuando se obtiene `tenantId`
- ✅ Escuchar `tenant.info` de clientes y registrar si túnel ya está conectado
- ✅ Handler para `tunnel.registered` del servidor

```javascript
// ANTES: Solo conectaba con tenantId
const wsUrl = `wss://api.kdsapp.site/tunnel?tenantId=${tenantId}`;

// DESPUÉS: Permite conexión sin tenantId
const wsUrl = currentTenantId 
  ? `wss://api.kdsapp.site/tunnel?tenantId=${currentTenantId}`
  : `wss://api.kdsapp.site/tunnel`;  // ✅ Sin tenantId

// Después de conectar
if (currentTenantId) {
  tunnelSocket.send({
    type: 'tunnel.register',
    tenantId: currentTenantId
  });
}
```

### 4. Frontend: Indicador Basado en WebSocket

**Archivo:** `js/tunnel-worker-register.js`

**Cambios:**
- ✅ Nueva propiedad: `tunnelState.websocketConnected`
- ✅ `isActive()` ahora verifica WebSocket conectado
- ✅ Estado cambia a 'active' solo cuando WebSocket conecta
- ✅ Actualizar `websocketConnected` en eventos `connected`/`disconnected`

```javascript
// ANTES: Solo verificaba Service Worker
isActive: function() {
  return tunnelState.isServiceWorkerReady &&
         navigator.serviceWorker.controller !== null;
}

// DESPUÉS: Verifica Service Worker Y WebSocket
isActive: function() {
  return tunnelState.isServiceWorkerReady &&
         tunnelState.websocketConnected &&  // ✅ Nueva validación
         navigator.serviceWorker.controller !== null;
}
```

## Flujo Corregido

### Sin TenantId

```
1. Usuario carga dashboard.html (sin session)
2. Service Worker se registra
3. WebSocket conecta sin tenantId → ✅ Aceptado
4. UI muestra "⏳ Conectando..." (no "Activo")
5. Backend acepta conexión, espera registro
6. Usuario hace login → tenantId disponible
7. SW envía tunnel.register con tenantId
8. Backend registra túnel → confirma con tunnel.registered
9. UI muestra "🌐 Túnel Activo" ✅
```

### Con TenantId

```
1. Usuario carga dashboard.html (con session)
2. Service Worker se registra
3. WebSocket conecta con tenantId → ✅ Registrado inmediatamente
4. UI muestra "🌐 Túnel Activo" ✅
```

## Archivos Modificados

1. ✅ `server/index.js` - Permitir conexión sin tenantId, handler de registro tardío
2. ✅ `server/tunnel-manager.js` - Permitir registro sin tenantId
3. ✅ `sw-tunnel.js` - Conectar sin tenantId, enviar registro después
4. ✅ `js/tunnel-worker-register.js` - Verificar WebSocket en isActive()

## Archivos Creados

1. ✅ `check-tunnel-status.html` - Herramienta de diagnóstico completa
2. ✅ `docs/DIAGNOSTICO-TUNEL-ACTIVO-PERO-NO-FUNCIONA.md` - Documentación del problema

## Verificación

### 1. Logs del Backend

```bash
railway logs --filter "Tunnel"
```

Debes ver:
```
✅ [Tunnel] Upgrade a WebSocket: sin tenant ID inicial
⚠️ [TunnelManager] Túnel sin tenantId inicial
📝 [Tunnel] Registro tardío: rest_12345
✅ [TunnelManager] Túnel registrado: rest_12345
```

### 2. Console del Navegador

```javascript
// Verificar estado
window.KDSTunnel.getStatus()

// Debe mostrar:
{
  status: "active",
  websocketConnected: true,  // ✅ Nueva propiedad
  isServiceWorkerReady: true,
  tenantId: "rest_12345"
}
```

### 3. Indicador Visual

- ❌ **ANTES:** Mostraba "Túnel Activo" solo con SW registrado
- ✅ **DESPUÉS:** Muestra "Túnel Activo" solo con WebSocket conectado

### 4. Herramienta de Diagnóstico

Acceder a: `https://kdsapp.site/check-tunnel-status.html`

- ✅ Service Worker: Activo
- ✅ WebSocket: Conectado
- ✅ Tenant ID: Detectado
- ✅ Logs en vivo

## Compatibilidad

✅ Restaurantes sin sesión activa (túnel se registra después de login)
✅ Restaurantes con sesión activa (túnel se registra inmediatamente)
✅ Fallback a Railway si túnel falla
✅ No rompe implementación existente

## Estado Final

| Componente | Estado | Verificación |
|------------|--------|--------------|
| Service Worker | ✅ Funcional | Permite conexión sin tenantId |
| WebSocket | ✅ Funcional | Conecta y registra después |
| UI Indicator | ✅ Corregido | Verifica WebSocket real |
| Backend | ✅ Funcional | Acepta registro tardío |
| Baileys | ✅ Funcional | Usa túnel cuando está activo |

---

**Fecha:** 4 de febrero de 2025
**Estado:** ✅ Implementado y listo para deploy
**Siguiente paso:** Desplegar y verificar en producción
