# 🔍 DIAGNÓSTICO: Túnel Muestra "Activo" pero No Funciona

## ❌ Problema Identificado

El indicador visual muestra "🌐 Túnel Activo" pero el backend no registra actividad del túnel.

### Causa Raíz

**El Service Worker se activa ANTES de tener el Tenant ID**, causando que:

1. ✅ Service Worker se registra correctamente
2. ✅ UI muestra "Túnel Activo" (porque SW está registrado)
3. ❌ WebSocket NO se conecta (porque falta `tenantId` requerido)
4. ❌ Backend rechaza la conexión sin `tenantId`

### Flujo Actual (Problemático)

```
1. Usuario carga dashboard.html
2. tunnel-worker-register.js se ejecuta
3. Service Worker se registra → UI muestra "Activo" ✅
4. Service Worker intenta conectar WebSocket
5. NO tiene tenantId → conexión rechazada ❌
6. Usuario ve "Activo" pero túnel NO funciona
```

### Evidencia del Problema

**Frontend (`sw-tunnel.js` línea 138):**
```javascript
const wsUrl = currentTenantId 
  ? `wss://api.kdsapp.site/tunnel?tenantId=${currentTenantId}`
  : `wss://api.kdsapp.site/tunnel`;  // ❌ Sin tenantId
```

**Backend (`server/index.js` línea 138):**
```javascript
if (!tenantId) {
  console.error('❌ [Tunnel] Upgrade rechazado: falta tenantId');
  socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
  socket.destroy();
  return;
}
```

**Lógica del Indicador (`tunnel-worker-register.js` línea 262):**
```javascript
// Esto se activa cuando SW está REGISTRADO, no cuando túnel está CONECTADO
if (navigator.serviceWorker.controller) {
  tunnelState.isServiceWorkerReady = true;
  updateState('active', null, 'Service Worker activo');  // ⚠️ Falso positivo
}
```

## ✅ Solución

### Opción 1: Permitir Conexión Sin TenantId (Recomendada)

Modificar el backend para permitir conexiones sin `tenantId` inicial, y que el Service Worker lo envíe después:

```javascript
// server/index.js
server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;
  
  if (pathname === '/tunnel') {
    const query = url.parse(request.url, true).query;
    const tenantId = query.tenantId || null;  // ✅ Permitir null

    console.log(`🔄 [Tunnel] Upgrade a WebSocket: ${tenantId || 'Sin tenant ID'}`);
    
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, tenantId);  // Pasar null si no hay
    });
  }
});
```

Luego, el Service Worker envía el `tenantId` cuando lo obtiene:

```javascript
// sw-tunnel.js
tunnelSocket.addEventListener('open', () => {
  // Esperar a tener tenantId
  getTenantIdFromClients().then(tenantId => {
    if (tenantId) {
      currentTenantId = tenantId;
      tunnelSocket.send(JSON.stringify({
        type: 'tunnel.register',
        tenantId: tenantId,
        deviceInfo: deviceInfo
      }));
    }
  });
});
```

### Opción 2: Esperar TenantId Antes de Registrar SW

Modificar `tunnel-worker-register.js` para NO registrar el Service Worker hasta tener `tenantId`:

```javascript
async function initializeTunnel() {
  // Esperar a tener tenantId
  const tenantId = await waitForTenantId();
  
  if (!tenantId) {
    console.warn('⚠️ No se puede inicializar túnel sin tenant ID');
    updateState('error', null, 'Falta tenant ID');
    return;
  }

  // Ahora sí, registrar SW
  await registerTunnelWorker();
}
```

### Opción 3: Corregir Lógica del Indicador

Cambiar el indicador para que muestre "Activo" solo cuando el WebSocket esté conectado:

```javascript
// tunnel-worker-register.js
window.KDSTunnel = {
  isActive: function() {
    // ✅ Verificar WebSocket, no solo SW
    return tunnelState.status === 'active' && 
           tunnelState.isServiceWorkerReady &&
           tunnelState.websocketConnected &&  // Nueva validación
           navigator.serviceWorker.controller !== null;
  }
};
```

## 🧪 Cómo Verificar

### 1. Herramienta de Diagnóstico

Accede a:
```
https://kdsapp.site/check-tunnel-status.html
```

Esta página muestra:
- ✅ Estado real del Service Worker
- ✅ Estado del API del túnel
- ✅ Tenant ID detectado
- ✅ Prueba de WebSocket en vivo

### 2. Logs del Backend

```bash
railway logs --filter "Tunnel"
```

Debes ver:
```
✅ [Tunnel] Upgrade a WebSocket: rest_12345
✅ [TunnelManager] Túnel registrado: rest_12345
```

Si ves:
```
❌ [Tunnel] Upgrade rechazado: falta tenantId
```

Confirma el problema.

### 3. Console del Navegador

Abre DevTools → Console y ejecuta:

```javascript
// Verificar estado del túnel
window.KDSTunnel.getStatus()

// Verificar Service Worker
navigator.serviceWorker.controller

// Verificar si SW tiene WebSocket activo
// (necesitas revisar logs del Service Worker)
```

## 📋 Checklist de Verificación

- [ ] Service Worker registrado (`navigator.serviceWorker.controller` no null)
- [ ] Tenant ID disponible en localStorage/URL
- [ ] WebSocket conectado (backend logs muestran "Túnel registrado")
- [ ] UI muestra "Túnel Activo" Y backend confirma conexión
- [ ] Requests de WhatsApp pasan por el túnel (logs muestran "Request vía túnel")

## 🎯 Siguiente Paso

Implementar **Opción 1** (Permitir conexión sin tenantId inicial) es la mejor solución porque:

✅ No rompe el flujo existente
✅ Permite que el túnel se conecte inmediatamente
✅ El tenantId se envía después cuando esté disponible
✅ Compatible con restaurantes sin sesión activa

## 📊 Estado Actual

| Componente | Estado | Problema |
|------------|--------|----------|
| Service Worker | ✅ Registrado | Ninguno |
| UI Indicator | ✅ Mostrando | Falso positivo |
| WebSocket | ❌ Rechazado | Falta tenantId |
| Backend | ✅ Funcionando | Requiere tenantId |
| Baileys | ✅ Funcionando | Sin túnel fallback |

## 🔧 Archivos a Modificar

1. `server/index.js` - Línea 138: Permitir tenantId null
2. `server/tunnel-manager.js` - Línea 65: Manejar registro tardío
3. `sw-tunnel.js` - Línea 136: Enviar tenantId después
4. `js/tunnel-worker-register.js` - Línea 48: Validar WebSocket conectado

---

**Fecha:** 30 de enero de 2025
**Estado:** Problema diagnosticado, solución lista para implementar
