# 🔧 Fix: CORS y Heartbeat - Sistema Túnel P2P

## 📅 Fecha
30 de enero de 2025

## 🎯 Problemas Identificados

### 1. Error CORS en Service Worker
```
Access to fetch at 'https://api.kdsapp.site/api/tunnel/disconnected' from origin 'https://api.kdsapp.site' has been blocked by CORS policy
```

**Causa**: El endpoint `/api/tunnel/disconnected` no tenía headers CORS explícitos para Service Worker.

### 2. WebSocket se Cierra Inmediatamente (Código 1006)
```
🔌 [Tunnel] Conexión cerrada: restaurante-demo
   📝 Code: 1006, Reason: unknown
```

**Causa**: El sistema de heartbeat era demasiado agresivo y cerraba conexiones prematuramente.

### 3. Tarjeta Amarilla en UI
La interfaz mostraba advertencias falsas de "Túnel Desconectado" porque el WebSocket se cerraba demasiado rápido.

---

## ✅ Soluciones Implementadas

### 1. CORS Explícito en `/api/tunnel/disconnected`

**Archivo**: `server/index.js`

```javascript
app.post('/api/tunnel/disconnected', express.json(), (req, res) => {
  // ✅ Headers CORS explícitos para Service Worker
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // ...resto del código
});
```

**Resultado**: Service Worker puede notificar desconexiones sin errores CORS.

---

### 2. Heartbeat Más Robusto y Tolerante

**Archivo**: `server/tunnel-manager.js`

#### Cambio 1: Timeout Más Largo
```javascript
this.config = {
  heartbeatInterval: 30000,   // 30 segundos entre pings
  heartbeatTimeout: 90000     // 90 segundos antes de considerar muerto (3x)
}
```

**Antes**: 60 segundos (2x intervalo)
**Ahora**: 90 segundos (3x intervalo)

#### Cambio 2: Verificación de Estado del Socket
```javascript
// Verificar si el socket está abierto antes de enviar ping
if (tunnel.socket.readyState !== 1) { // 1 = OPEN
  console.warn(`⚠️ Socket no está abierto, estado: ${tunnel.socket.readyState}`);
  return; // No cerrar aún, solo advertir
}
```

#### Cambio 3: Cierre Solo por Timeout Crítico
```javascript
if (timeSinceHeartbeat > this.config.heartbeatTimeout) {
  console.error(`❌ Túnel muerto por timeout: ${tenantId}`);
  this.unregisterTunnel(tenantId, 'heartbeat_timeout');
}
```

**Antes**: Cerraba conexión al primer signo de problema
**Ahora**: Solo cierra si excede 90 segundos sin respuesta

---

### 3. Mejor Manejo de Errores en WebSocket

**Archivo**: `server/index.js`

```javascript
ws.on('close', (code, reason) => {
  const reasonStr = reason ? reason.toString() : 'unknown';
  console.log(`🔌 [Tunnel] Conexión cerrada: ${currentTenantId}`);
  console.log(`   📝 Code: ${code}, Reason: ${reasonStr}`);
  // ...
});

ws.on('error', (error) => {
  console.error(`❌ [Tunnel] Error en WebSocket: ${error.message}`);
  // ...
});
```

**Mejora**: Logs más claros con mensajes de error legibles.

---

## 📊 Resultados Esperados

### ✅ CORS Resuelto
- Service Worker puede notificar desconexiones sin errores
- Endpoint `/api/tunnel/disconnected` responde correctamente

### ✅ WebSocket Estable
- Conexión permanece abierta por más de 30 segundos
- Pings y pongs funcionan sin cerrar la conexión
- Solo se cierra si realmente hay un problema (timeout > 90s)

### ✅ UI Sin Tarjetas Amarillas
- Indicador "🌐 Túnel Activo" se mantiene verde
- No hay alertas falsas de desconexión
- Transiciones suaves entre estados

### ✅ Logs Claros
```
🔌 [Tunnel] Nueva conexión WebSocket: restaurante-demo
✅ [TunnelManager] Túnel registrado: restaurante-demo
🔧 [Tunnel] Túnel inicializado: restaurante-demo
📝 [Tunnel] Registro tardío: restaurante-demo
✅ Heartbeat actualizado: restaurante-demo
🔌 ping → pong (sin cerrar conexión)
```

---

## 🧪 Verificación

### 1. Probar CORS
```bash
# Desde la consola del navegador (Service Worker)
await fetch('https://api.kdsapp.site/api/tunnel/disconnected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantId: 'restaurante-demo',
    timestamp: Date.now(),
    reason: 'test'
  })
});
```

**Resultado esperado**: ✅ `{ success: true, ... }`

### 2. Probar Estabilidad del WebSocket
```bash
# En logs de Railway
railway logs --filter "Tunnel"
```

**Resultado esperado**: 
- Conexión se mantiene abierta > 30 segundos
- Pings y pongs sin errores
- No hay cierres con código 1006

### 3. Probar en UI
1. Abrir `/whatsapp-connect.html?tenant=restaurante-demo`
2. Esperar 60 segundos
3. Verificar que el indicador permanece "🌐 Túnel Activo"

**Resultado esperado**: Sin tarjetas amarillas ni alertas

### 4. Probar `/test-tunel`
1. Enviar `/test-tunel` por WhatsApp
2. Verificar logs en Railway

**Resultado esperado**:
```
📤 [TunnelManager] Enviando request a través de túnel
🌐 [SessionManager] Request VIA TÚNEL para restaurante-demo
📥 [TunnelManager] Respuesta recibida
✅ Imagen enviada correctamente
```

---

## 📝 Checklist de Verificación

- [ ] ✅ CORS resuelto en `/api/tunnel/disconnected`
- [ ] ✅ WebSocket permanece abierto > 30 segundos
- [ ] ✅ Heartbeat funciona sin cerrar conexión
- [ ] ✅ UI muestra "🌐 Túnel Activo" sin errores
- [ ] ✅ Comando `/test-tunel` envía imagen
- [ ] ✅ Logs muestran "Request VIA TÚNEL"
- [ ] ✅ Sin errores 1006 en WebSocket
- [ ] ✅ Sin tarjetas amarillas en UI

---

## 🚀 Próximos Pasos

1. **Esperar despliegue de Railway**
2. **Verificar logs en tiempo real** con `railway logs --filter "Tunnel"`
3. **Probar `/test-tunel`** para confirmar que HTTP requests van vía túnel
4. **Confirmar estabilidad** del WebSocket durante 2-3 minutos
5. **Documentar verificación final** en `/docs/VERIFICACION-TUNEL-FINAL.md`

---

## 🎓 Lecciones Aprendidas

### 1. CORS en Service Workers
Los Service Workers necesitan headers CORS explícitos, no pueden confiar en el middleware global de CORS.

### 2. Heartbeat Tolerante
Los sistemas de heartbeat deben ser tolerantes a latencia de red y no cerrar conexiones al primer problema.

### 3. Logs Descriptivos
Los logs deben incluir códigos de error, razones, y contexto para facilitar debugging.

### 4. Timeouts 3x Intervalo
Una buena práctica es usar un timeout de 3x el intervalo de heartbeat antes de considerar una conexión muerta.

---

## 📚 Referencias

- **CORS en Service Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- **WebSocket Readiness States**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
- **WebSocket Close Codes**: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code

---

**Estado**: ✅ Correcciones Implementadas - Esperando Verificación
**Commit**: `978c76c` - "🔧 Fix: CORS en /api/tunnel/disconnected y heartbeat más robusto"
