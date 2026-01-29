# 🔍 DEBUG: Loop de Mensajes Propios en Baileys

**Fecha:** 29 de enero de 2026  
**Status:** 🔧 En Investigación

---

## 📋 Problema Reportado

El bot está enviando mensajes a sí mismo en un loop infinito. Después de escanear el QR, en 1 minuto envió 4 veces el mismo mensaje:

```
❓ *No entendí tu mensaje*

💡 *Puedes ordenar de estas formas:*
...
```

---

## 🔎 Análisis Inicial

### 1. **Código de Filtro Existente**

En `event-handlers.js` línea 49, **YA existe un filtro** para ignorar mensajes propios:

```javascript
// Ignorar mensajes del bot (evitar loops)
if (messageAdapter.isFromBot(baileysMessage)) {
  logger.debug(`[${tenantId}] Mensaje propio ignorado`);
  return;
}
```

### 2. **Implementación de `isFromBot`**

En `message-adapter.js` línea 443:

```javascript
isFromBot(baileysMessage) {
  return baileysMessage.key.fromMe === true;
}
```

**Lógica:** Verifica si `fromMe` es `true` para identificar mensajes enviados por el bot.

### 3. **¿Por qué NO funciona?**

**Posibles causas:**

#### A) `fromMe` no se está seteando correctamente
- Los mensajes enviados por el bot **no tienen** `fromMe: true`
- Baileys no está marcando correctamente los mensajes salientes

#### B) El mensaje se procesa ANTES de que Baileys marque `fromMe`
- Race condition: el webhook llega antes de que se setee el flag

#### C) Los mensajes vienen de un evento diferente
- Podrían venir como `type: 'append'` en lugar de `type: 'notify'`
- Los logs muestran: `🔍 [DEBUG] Mensaje ignorado, type: append`

---

## 🔧 Solución Implementada

### Paso 1: Logs de Debug Mejorados

**En `message-adapter.js`:**
```javascript
isFromBot(baileysMessage) {
  const fromMe = baileysMessage.key.fromMe === true;
  console.log(`🔍 [isFromBot] Verificando mensaje:`, {
    messageId: baileysMessage.key.id,
    fromMe: baileysMessage.key.fromMe,
    result: fromMe
  });
  return fromMe;
}
```

**En `event-handlers.js`:**
```javascript
async handleIncomingMessage(tenantId, baileysMessage) {
  console.log(`🔍 [DEBUG] handleIncomingMessage llamado para tenant ${tenantId}`);
  console.log(`🔍 [DEBUG] baileysMessage.key:`, JSON.stringify(baileysMessage.key, null, 2));
  console.log(`🔍 [DEBUG] baileysMessage.message:`, JSON.stringify(baileysMessage.message, null, 2));
  
  const isFromBot = messageAdapter.isFromBot(baileysMessage);
  console.log(`🔍 [DEBUG] isFromBot result: ${isFromBot}`);
  
  if (isFromBot) {
    console.log(`🔄 [ANTI-LOOP] Mensaje propio ignorado - fromMe=true`);
    return;
  }
  
  console.log(`✅ [DEBUG] No es mensaje del bot, convirtiendo a formato interno`);
  // ...
}
```

---

## 📊 Qué Esperamos Ver en los Logs

### Escenario 1: El filtro funciona correctamente ✅

```
🔍 [DEBUG] handleIncomingMessage llamado para tenant xxx
🔍 [DEBUG] baileysMessage.key: { "id": "...", "fromMe": true, "remoteJid": "..." }
🔍 [isFromBot] Verificando mensaje: { messageId: "...", fromMe: true, result: true }
🔍 [DEBUG] isFromBot result: true
🔄 [ANTI-LOOP] Mensaje propio ignorado - fromMe=true
```

### Escenario 2: fromMe es false (PROBLEMA) ❌

```
🔍 [DEBUG] handleIncomingMessage llamado para tenant xxx
🔍 [DEBUG] baileysMessage.key: { "id": "...", "fromMe": false, "remoteJid": "..." }
🔍 [isFromBot] Verificando mensaje: { messageId: "...", fromMe: false, result: false }
🔍 [DEBUG] isFromBot result: false
✅ [DEBUG] No es mensaje del bot, convirtiendo a formato interno
```

Si vemos **Escenario 2**, significa que Baileys **NO está marcando `fromMe: true`** en los mensajes enviados por el bot.

---

## 🎯 Próximos Pasos Según los Logs

### Si `fromMe` es siempre `false`:

**Solución alternativa:** Filtrar por el número del remitente

```javascript
isFromBot(baileysMessage, botPhoneNumber) {
  // Opción 1: Verificar fromMe
  if (baileysMessage.key.fromMe === true) {
    return true;
  }
  
  // Opción 2: Verificar si el remitente es el bot mismo
  const from = baileysMessage.key.remoteJid;
  const normalizedFrom = from.replace('@s.whatsapp.net', '');
  const normalizedBot = botPhoneNumber.replace('@s.whatsapp.net', '');
  
  if (normalizedFrom === normalizedBot) {
    console.log(`🔄 [ANTI-LOOP] Mensaje del bot detectado por número`);
    return true;
  }
  
  return false;
}
```

### Si `fromMe` es `true` pero aún hay loop:

Verificar en `session-manager.js` que solo procese mensajes con `type: 'notify'`:

```javascript
if (type === 'notify') {
  // Solo procesar notificaciones nuevas
  this.emit('message', tenantId, message);
} else if (type === 'append') {
  // NO procesar mensajes agregados (son enviados por el bot)
  console.log(`🔄 [ANTI-LOOP] Mensaje tipo append ignorado`);
  return;
}
```

---

## 🚀 Deploy Status

- ✅ Logs mejorados committed
- ✅ Push a GitHub completado
- 🔄 Deploy a Railway en progreso...

Una vez que el deploy termine:

1. **Escanear QR nuevamente**
2. **Observar los logs de Railway**
3. **Identificar el valor de `fromMe`**
4. **Aplicar la solución correcta**

---

## 📝 Comando para Ver Logs en Tiempo Real

```bash
railway logs --tail 100
```

Buscar en los logs:
- `🔍 [isFromBot]` - Para ver el valor de `fromMe`
- `🔄 [ANTI-LOOP]` - Para ver si se está filtrando
- `✅ [DEBUG] No es mensaje del bot` - Si aparece para mensajes propios, el filtro NO funciona

---

**Siguiente actualización:** Una vez analicemos los logs después del deploy
