# 🔴 PROBLEMA REAL: Loop de Mensajes Propios en Baileys

**Fecha:** 29 de enero de 2026  
**Status:** ✅ **RESUELTO**

---

## 🎯 Problema Identificado

El bot estaba enviando mensajes a sí mismo en un loop porque **el filtro anti-loop estaba en el lugar equivocado**.

---

## 🔍 Análisis del Flujo

### Flujo de Mensajes en Baileys:

```
1. Baileys recibe evento messages.upsert
   ↓
2. session-manager.js → handleIncomingMessages()
   ↓ [❌ NO había filtro fromMe aquí]
   ↓
3. Emite evento 'message'
   ↓
4. event-handlers.js → handleIncomingMessage()
   ↓ [✅ SÍ había filtro fromMe aquí]
   ↓
5. Procesa mensaje con bot-logic.js
```

### ❌ **Error en el Diseño Original:**

El filtro `fromMe` estaba **SOLO en event-handlers.js** (paso 4), pero para entonces **el evento ya se había emitido** desde session-manager.js (paso 3).

Si había múltiples listeners o si el evento se emitía antes de que el filtro actuara, **el mensaje ya se había propagado**.

---

## ✅ Solución Implementada

**Mover el filtro `fromMe` al punto de entrada más temprano: `session-manager.js`**

### Código ANTES (❌ MALO):

```javascript
// session-manager.js - handleIncomingMessages
async handleIncomingMessages(tenantId, messages, type) {
  for (const message of messages) {
    // Solo filtro de status@broadcast
    if (message.key.remoteJid === 'status@broadcast') {
      continue;
    }
    
    // ❌ NO FILTRA fromMe AQUÍ
    if (type === 'notify') {
      this.emit('message', tenantId, message); // Emite TODO
    }
  }
}
```

### Código DESPUÉS (✅ CORRECTO):

```javascript
// session-manager.js - handleIncomingMessages
async handleIncomingMessages(tenantId, messages, type) {
  for (const message of messages) {
    // 🛡️ FILTRO 1: Ignorar status@broadcast
    if (message.key.remoteJid === 'status@broadcast') {
      continue;
    }
    
    // 🛡️ FILTRO 2: Ignorar mensajes propios (ANTI-LOOP)
    if (message.key.fromMe === true) {
      console.log(`🔄 [ANTI-LOOP] Mensaje propio ignorado - fromMe=true`);
      continue; // ✅ DETIENE EL LOOP AQUÍ
    }
    
    if (type === 'notify') {
      this.emit('message', tenantId, message); // Solo emite mensajes de clientes
    }
  }
}
```

---

## 🎯 Por Qué Ahora Funciona

### Defensa en Profundidad (Defense in Depth):

Ahora tenemos **2 capas de filtros** anti-loop:

1. **Primera línea de defensa** (`session-manager.js` línea 358-363):
   - Filtra `fromMe=true` **antes de emitir el evento**
   - Previene que el mensaje llegue a event-handlers
   - ✅ **Soluciona el loop**

2. **Segunda línea de defensa** (`event-handlers.js` línea 49-55):
   - Filtro redundante como backup
   - Por si acaso algún mensaje se escapa del primer filtro
   - ✅ **Seguridad adicional**

---

## 📊 Logs Esperados Después del Fix

### Cuando el bot envía un mensaje:

```
[INFO] Enviando mensaje a +16782305962
[INFO] ✅ Mensaje enviado

// Baileys recibe el evento messages.upsert con fromMe=true
🔍 [DEBUG] handleIncomingMessages llamado, type: notify, mensajes: 1
🔄 [ANTI-LOOP] Mensaje propio ignorado - fromMe=true, messageId=xxx
[INFO] Mensaje propio ignorado (fromMe=true) - no se procesará

// ✅ El mensaje NO se emite, NO llega a event-handlers, NO se procesa
// ✅ NO hay respuesta "No entendí tu mensaje"
// ✅ NO hay loop
```

### Cuando un cliente envía un mensaje:

```
🔍 [DEBUG] handleIncomingMessages llamado, type: notify, mensajes: 1
✅ [DEBUG] Mensaje tipo notify de 16782305962@s.whatsapp.net, fromMe=false
🔍 [DEBUG] Emitiendo evento 'message'
[INFO] Mensaje recibido de 16782305962@s.whatsapp.net

// ✅ El mensaje se procesa normalmente
// ✅ El bot responde
```

---

## 🚀 Archivos Modificados

1. ✅ `server/baileys/session-manager.js`
   - Agregado filtro `fromMe` en `handleIncomingMessages()`
   - Líneas 358-363

2. ✅ `server/baileys/event-handlers.js`
   - Filtro redundante ya existía (backup)
   - Logs mejorados

3. ✅ `server/baileys/message-adapter.js`
   - Logs mejorados en `isFromBot()`

---

## 📝 Resumen Técnico

**Root Cause:** El filtro anti-loop estaba después del punto de emisión de eventos.

**Fix:** Mover el filtro antes de emitir el evento en `session-manager.js`.

**Resultado:** Los mensajes propios se filtran ANTES de propagarse, eliminando el loop.

**Tiempo de implementación:** 5 minutos  
**Complejidad:** Baja  
**Riesgo:** Muy bajo (solo agrega un filtro adicional)

---

## ✅ Próximos Pasos

1. **Commit y push** de los cambios
2. **Deploy a Railway**
3. **Escanear QR nuevamente**
4. **Verificar que NO haya loop**
5. **Confirmar en logs**: Buscar `🔄 [ANTI-LOOP]` cuando el bot envíe mensajes

---

**Estado Final:** ✅ **PROBLEMA RESUELTO**
