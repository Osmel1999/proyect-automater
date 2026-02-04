# 🔍 Debug: WebSocket se Cierra con Código 1006

## 📋 Problema

El túnel WebSocket se conecta exitosamente pero luego se cierra abruptamente con código **1006** (cierre anormal), causando:

- Indicador de túnel "🔧 Túnel Activo" parpadea (conecta → desconecta → conecta)
- El comando `/test-tunel` puede fallar intermitentemente
- Logs del navegador muestran ciclo de reconexión

### Logs Observados

```javascript
sw-tunnel.js:174 🌐 [SW] Túnel WebSocket establecido
sw-tunnel.js:240 🏓 [SW] Pong recibido del servidor
sw-tunnel.js:246 🏓 [SW] Respondiendo pong al servidor
sw-tunnel.js:254 ⚠️ [SW] Túnel cerrado: 1006  // ❌ PROBLEMA
```

## 🔎 Diagnóstico

### Verificación del Estado del Servidor

```bash
curl 'https://api.kdsapp.site/api/tunnel/status/TENANT_ID'
```

**Resultado:** El servidor SÍ tiene el túnel registrado y activo.

### Código 1006 - ¿Qué Significa?

El código **1006** indica:
- Conexión cerrada sin frame de cierre apropiado
- Puede ser por timeout de red
- Puede ser por cierre forzado del servidor
- Puede ser por proxy intermedio (Railway)

## 🎯 Causas Posibles

### 1. Railway WebSocket Timeout ⚠️

Railway puede cerrar conexiones WebSocket inactivas. **Solución:**
- ✅ Aumentar frecuencia de heartbeat de 30s a **20s**
- ✅ Reducir timeout de heartbeat de 90s a **60s**

### 2. Múltiples Service Workers 🔄

Si hay múltiples pestañas abiertas o Service Workers duplicados:
- El servidor detecta nueva conexión y cierra la anterior
- Causa ciclos de reconexión

**Solución:**
- ✅ Servidor cierra conexión anterior cuando detecta nueva
- ✅ Logging mejorado para detectar este caso

### 3. UI Reaccionando Muy Rápido ⚡

El Service Worker se reconecta automáticamente en 3 segundos, pero la UI cambia a "desconectado" inmediatamente.

**Solución:**
- ✅ UI espera 5 segundos antes de mostrar "desconectado"
- Permite que reconexión automática ocurra sin afectar UX

## 🔧 Cambios Implementados

### 1. Configuración del Túnel

**Antes:**
```javascript
heartbeatInterval: 30000,  // 30 segundos
heartbeatTimeout: 90000    // 90 segundos
```

**Ahora:**
```javascript
heartbeatInterval: 20000,  // 20 segundos (más frecuente)
heartbeatTimeout: 60000    // 60 segundos (más estricto)
```

### 2. Manejo de Desconexión en UI

**Antes:**
```javascript
case 'tunnel.disconnected':
  updateState('disconnected', null, reason);  // ❌ Inmediato
```

**Ahora:**
```javascript
case 'tunnel.disconnected':
  setTimeout(() => {
    // Solo mostrar desconectado si sigue sin conexión después de 5 seg
    if (!tunnelState.websocketConnected) {
      updateState('disconnected', null, reason);
    }
  }, 5000);  // ✅ Espera 5 segundos
```

### 3. Logging Mejorado

**Servidor:**
```javascript
console.log(`   ⏱️ Duración: ${duration}s`);
console.log(`   🔍 ReadyState antes de cerrar: ${ws.readyState}`);
```

## ✅ Verificación

### 1. Comprobar Túnel en Servidor

```bash
curl 'https://api.kdsapp.site/api/tunnel/status/TENANT_ID'
```

Debe mostrar:
```json
{
  "success": true,
  "hasTunnel": true,
  "tunnel": {
    "tenantId": "...",
    "isHealthy": true,
    "uptime": 12345
  }
}
```

### 2. Comprobar en Navegador

Abrir consola del navegador y verificar:

```javascript
// Estado del túnel
window.KDSTunnel.getDebugInfo()

// Debe mostrar:
{
  state: 'active',
  websocketConnected: true,
  // ...
}
```

### 3. Probar con `/test-tunel`

Enviar comando a WhatsApp:
```
/test-tunel
```

Verificar logs:
- ✅ Request debe ir por túnel
- ✅ Imagen debe descargarse desde WhatsApp
- ✅ No debe mostrar errores

## 📊 Monitoreo Continuo

### Logs del Servidor (Railway)

```bash
railway logs
```

Buscar:
- `🔄 [TunnelManager] Reemplazando túnel existente` → Múltiples conexiones
- `❌ [TunnelManager] Túnel muerto por timeout` → Problema de heartbeat
- `⚠️ [TunnelManager] Socket no está abierto` → Problema de estado

### Logs del Navegador

Abrir DevTools → Console, buscar:
- `⚠️ [SW] Túnel cerrado: 1006` → Cierre anormal
- `🔄 [SW] Reconectando...` → Reconexión automática
- `⚠️ [KDSTunnel] Túnel WebSocket desconectado` → UI detecta desconexión

## 🚀 Próximos Pasos

1. **Monitorear por 24 horas** para ver si los cambios estabilizan la conexión
2. **Analizar logs de Railway** para identificar patrones de cierre
3. **Considerar aumentar frecuencia de heartbeat a 15s** si sigue habiendo problemas
4. **Investigar si Railway tiene límites específicos** para conexiones WebSocket

## 📝 Notas

- El código 1006 es **normal durante reconexiones** si el navegador pierde conectividad
- Lo importante es que el Service Worker **se reconecte automáticamente**
- La UI ahora **tolera desconexiones breves** sin afectar la experiencia del usuario

---

**Última actualización:** 4 de febrero de 2026  
**Estado:** En monitoreo
