# 🔍 DIAGNÓSTICO: Bot No Responde a Mensajes

**Fecha:** 2026-01-18
**Problema:** El bot no está respondiendo a los mensajes entrantes

## 📋 Checklist de Diagnóstico

### 1. ✅ Verificar que el callback esté registrado
- **Estado:** El log muestra `[INFO] [*] Message callback registrado`
- **Ubicación:** `/server/index.js` línea 625
- **Resultado:** ✅ Callback registrado correctamente

### 2. 🔍 Verificar flujo de mensajes

El flujo debería ser:
```
WhatsApp → Baileys Session Manager → Event Handler → Bot Logic → Respuesta
```

**Puntos de verificación:**

1. **Session Manager recibe mensaje:**
   - `session-manager.js` línea 257: `handleIncomingMessages()`
   - Debe emitir evento `'message'` con tenantId y mensaje

2. **Event Handler procesa mensaje:**
   - `event-handlers.js` línea 44: `handleIncomingMessage()`
   - Debe buscar callback y ejecutarlo

3. **Bot Logic procesa:**
   - `bot-logic.js` línea 71: `processMessage()`
   - Debe verificar si bot está activo y generar respuesta

4. **Respuesta se envía:**
   - `index.js` línea 635-638: Envía respuesta con `baileys.sendMessage()`

### 3. 🐛 Posibles Causas del Problema

#### A. Mensajes no llegan al Session Manager
**Síntoma:** No hay log `[tenantId] Mensaje recibido de ...`
**Solución:** Verificar que la sesión esté conectada

#### B. Event Handler no encuentra callback
**Síntoma:** Log `No hay callback registrado para mensajes`
**Solución:** El callback está registrado con `'*'` (global), debería funcionar

#### C. Bot Logic no procesa correctamente
**Síntoma:** Error o respuesta null
**Causas posibles:**
- Bot desactivado en Firebase
- Error al consultar Firebase
- Error en lógica de procesamiento

#### D. Respuesta no se envía
**Síntoma:** Respuesta generada pero no llega al usuario
**Causas posibles:**
- Error en `baileys.sendMessage()`
- Sesión desconectada
- Error en message-adapter

### 4. 🔧 Solución Propuesta

Agregar logs detallados en cada punto del flujo para identificar dónde se detiene.

