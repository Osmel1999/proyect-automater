# 🔧 FIX: Indicador se Queda en "Activando"

## ❌ Problema Reportado

El indicador visual mostraba **"Activando"** y no cambiaba, a pesar de que los logs del backend mostraban:

```
✅ [TunnelManager] Túnel registrado: tenant1770048862553p1dcfnuzr
```

## 🔍 Causa del Problema

El Service Worker enviaba el mensaje `tunnel.connected` **inmediatamente** cuando el WebSocket abría, **antes** de:

1. ✅ Obtener el `tenantId` del cliente
2. ✅ Enviar el registro al backend
3. ✅ Esperar confirmación del backend

Esto causaba que el frontend recibiera la notificación "conectado" cuando en realidad el túnel aún no estaba registrado con el backend.

## ✅ Solución Implementada

### Cambio 1: Notificar Solo Con TenantId

**Archivo:** `sw-tunnel.js`

```javascript
// ANTES: Notificaba siempre al abrir WebSocket
tunnelSocket.addEventListener('open', async () => {
  // ... código de registro ...
  
  // ❌ Notificaba sin importar si había tenantId
  notifyAllClients({ 
    type: 'tunnel.connected',
    tenantId: currentTenantId 
  });
});

// DESPUÉS: Solo notifica si tiene tenantId
tunnelSocket.addEventListener('open', async () => {
  // ... código de registro ...
  
  if (currentTenantId) {
    // ✅ Notifica solo si tiene tenantId
    notifyAllClients({ 
      type: 'tunnel.connected',
      tenantId: currentTenantId 
    });
  } else {
    // ⚠️ NO notifica hasta tener tenantId
  }
});
```

### Cambio 2: Notificar Cuando Backend Confirma

```javascript
// Manejar registro exitoso del backend
if (data.type === 'tunnel.registered') {
  console.log(`✅ [SW] Túnel registrado en backend: ${data.tenantId}`);
  currentTenantId = data.tenantId;
  
  // ✅ NUEVO: Notificar ahora que backend confirmó
  notifyAllClients({ 
    type: 'tunnel.connected',
    tenantId: currentTenantId 
  });
}
```

### Cambio 3: Notificar Cuando Cliente Envía TenantId

```javascript
// Cuando cliente envía tenantId después de conectar
if (!hadTenantId && currentTenantId && tunnelSocket.readyState === WebSocket.OPEN) {
  tunnelSocket.send({
    type: 'tunnel.register',
    tenantId: currentTenantId
  });
  
  // ✅ NUEVO: Notificar después de registrar
  notifyAllClients({ 
    type: 'tunnel.connected',
    tenantId: currentTenantId 
  });
}
```

## 🎯 Flujo Corregido

### Escenario 1: Con TenantId Desde el Inicio

```
1. WebSocket conecta
2. SW tiene tenantId → envía tunnel.register
3. SW notifica tunnel.connected → UI muestra "🌐 Túnel Activo" ✅
4. Backend confirma tunnel.registered
```

### Escenario 2: Sin TenantId Inicial

```
1. WebSocket conecta
2. SW no tiene tenantId → envía tunnel.init
3. SW NO notifica → UI muestra "⏳ Activando..." ⏳
4. Usuario hace login → tenantId disponible
5. SW recibe tenantId → envía tunnel.register
6. SW notifica tunnel.connected → UI muestra "🌐 Túnel Activo" ✅
7. Backend confirma tunnel.registered
```

### Escenario 3: Backend Confirma Registro Tardío

```
1. WebSocket conecta
2. SW envía tunnel.register
3. Backend procesa y envía tunnel.registered
4. SW recibe tunnel.registered
5. SW notifica tunnel.connected → UI muestra "🌐 Túnel Activo" ✅
```

## 📊 Verificación

### Logs del Backend (Ya funcionaba)

```bash
railway logs --filter "Tunnel"
```

```
✅ [Tunnel] Upgrade a WebSocket: sin tenant ID inicial
📝 [Tunnel] Registro tardío: tenant1770048862553p1dcfnuzr
✅ [TunnelManager] Túnel registrado: tenant1770048862553p1dcfnuzr
```

### Console del Navegador (Ahora debería funcionar)

```javascript
window.KDSTunnel.getStatus()

// Debe mostrar:
{
  status: "active",  // ✅ Ya no se queda en "pending"
  websocketConnected: true,
  tenantId: "tenant1770048862553p1dcfnuzr"
}
```

### Indicador Visual

- ❌ **ANTES:** Se quedaba en "⏳ Activando..." o mostraba "Activo" sin conexión real
- ✅ **DESPUÉS:** Muestra "🌐 Túnel Activo" solo cuando WebSocket conectado Y registrado

## 🚀 Deploy

Los cambios ya están pusheados. Railway los desplegará automáticamente en 2-3 minutos.

## ✅ Qué Esperar Ahora

1. **Recarga el dashboard** (Ctrl+Shift+R) para limpiar caché del Service Worker
2. **Espera 5-10 segundos** para que se registre
3. **Debes ver** "🌐 Túnel Activo" en la esquina inferior derecha
4. **Si ejecutas** `window.KDSTunnel.getStatus()` debe mostrar `websocketConnected: true`

## 🔄 Si Aún No Funciona

1. **Desregistra el Service Worker:**
   - DevTools → Application → Service Workers
   - Click "Unregister"
   - Recargar página

2. **Verifica logs del Service Worker:**
   - DevTools → Application → Service Workers
   - Click en "sw-tunnel.js"
   - Busca "✅ [SW] Túnel registrado en backend"

3. **Usa la herramienta de diagnóstico:**
   ```
   https://kdsapp.site/check-tunnel-status.html
   ```

---

**Fecha:** 4 de febrero de 2025
**Commit:** `0fc4ddb` - "fix: indicador se queda en 'Activando'"
**Estado:** ✅ Desplegado, esperando confirmación
