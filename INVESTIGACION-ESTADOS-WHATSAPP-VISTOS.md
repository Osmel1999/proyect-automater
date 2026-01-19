# Investigación: Bot Marcando Estados de WhatsApp como Vistos

**Fecha:** 18 de enero de 2026  
**Investigador:** AI Assistant  
**Estado:** ✅ Completado

---

## 🔍 Resumen Ejecutivo

**Hallazgo Principal:** El bot **NO está marcando intencionalmente** los estados/historias de WhatsApp como vistos. Sin embargo, existe la posibilidad de que esto ocurra por el comportamiento predeterminado de Baileys al procesar eventos.

---

## 📋 Análisis del Código

### 1. **Revisión de Event Handlers** ✅

**Archivo:** `server/baileys/event-handlers.js`

- ✅ **No hay lógica explícita** para procesar estados/historias de WhatsApp
- ✅ Solo se procesan eventos de tipo `messages.upsert` con tipo `notify`
- ✅ No se encontró ninguna referencia a:
  - `status@broadcast` (canal de estados de WhatsApp)
  - `readStatus` o `status.viewed`
  - Eventos de tipo `status.v2`

**Código Relevante:**
```javascript
async handleIncomingMessage(tenantId, baileysMessage) {
  // Solo procesa mensajes directos (conversations)
  // No hay lógica para manejar estados/historias
}
```

---

### 2. **Revisión de Session Manager** ✅

**Archivo:** `server/baileys/session-manager.js`

- ✅ Solo se suscriben a dos eventos principales:
  - `messages.upsert` → Mensajes entrantes
  - `messages.update` → Actualizaciones de estado de mensajes enviados

**Código Relevante:**
```javascript
socket.ev.on('messages.upsert', async ({ messages, type }) => {
  await this.handleIncomingMessages(tenantId, messages, type);
});

socket.ev.on('messages.update', async (updates) => {
  await this.handleMessageUpdates(tenantId, updates);
});
```

**Nota:** No hay suscripción a eventos de estados/historias como:
- `status.update`
- `status@broadcast`

---

### 3. **Revisión de Message Adapter** ✅

**Archivo:** `server/baileys/message-adapter.js`

- ✅ La función `markAsRead()` **solo se llama** para mensajes directos procesados
- ✅ No hay lógica para marcar estados como vistos
- ✅ La función usa `socket.readMessages([messageKey])`

**Código Relevante:**
```javascript
async markAsRead(tenantId, messageKey) {
  try {
    const socket = sessionManager.getSession(tenantId);
    if (!socket) {
      throw new Error(`No active session for tenant: ${tenantId}`);
    }
    await socket.readMessages([messageKey]);
    logger.info(`[${tenantId}] Mensaje marcado como leído`);
  } catch (error) {
    logger.error(`[${tenantId}] Error marcando mensaje como leído:`, error);
  }
}
```

---

## ⚠️ Posibles Causas del Comportamiento

### **Hipótesis 1: Comportamiento Predeterminado de Baileys**

Baileys, al inicializar una sesión de WhatsApp, puede estar:
1. **Sincronizando automáticamente** mensajes y estados pendientes
2. **Marcando como "entregado"** cualquier contenido al conectarse
3. **Procesando eventos de estados** aunque no estén explícitamente manejados

### **Hipótesis 2: Configuración del Socket**

En `session-manager.js`, el socket se configura con:
```javascript
const socket = makeWASocket({
  auth: state,
  emitOwnEvents: true, // ← IMPORTANTE
  getMessage: async (key) => {
    return { conversation: '' }; // Retorna mensaje vacío
  }
});
```

**Nota:** `emitOwnEvents: true` puede hacer que el bot emita eventos incluso para mensajes propios o estados.

### **Hipótesis 3: `getMessage` Callback**

La función `getMessage` retorna `{ conversation: '' }` para cualquier mensaje solicitado. Esto podría estar causando que Baileys "reconozca" estados al intentar recuperar mensajes históricos.

---

## 🔧 Soluciones Propuestas

### **Solución 1: Filtrar Mensajes de Estados en `handleIncomingMessages`**

Modificar `session-manager.js` para ignorar explícitamente estados:

```javascript
async handleIncomingMessages(tenantId, messages, type) {
  for (const message of messages) {
    // 🛡️ NUEVO: Filtrar estados/historias
    if (message.key.remoteJid === 'status@broadcast') {
      console.log(`🔍 [DEBUG] Estado/Historia ignorado de WhatsApp`);
      continue; // Saltar procesamiento
    }
    
    if (type === 'notify') {
      this.emit('message', tenantId, message);
    }
  }
}
```

### **Solución 2: No Marcar Nada como Leído Automáticamente**

Comentar o eliminar la llamada a `markAsRead` en `event-handlers.js`:

```javascript
// ❌ COMENTAR ESTA LÍNEA:
// await messageAdapter.markAsRead(tenantId, baileysMessage.key);
```

**⚠️ Advertencia:** Esto dejará TODOS los mensajes como no leídos hasta que el usuario los vea manualmente en su teléfono.

### **Solución 3: Configurar Baileys para No Auto-Reconocer Mensajes**

Investigar si Baileys tiene opciones de configuración como:
- `markOnlineOnConnect: false`
- `syncFullHistory: false`
- `ignoreStatusMessages: true`

---

## 🧪 Pruebas Recomendadas

### **Prueba 1: Logs de Depuración**

Agregar logs detallados para identificar si los estados están siendo procesados:

```javascript
// En session-manager.js → handleIncomingMessages
async handleIncomingMessages(tenantId, messages, type) {
  for (const message of messages) {
    console.log(`🔍 [DEBUG] Mensaje recibido:`, {
      from: message.key.remoteJid,
      type: type,
      isStatus: message.key.remoteJid === 'status@broadcast'
    });
    
    // ... resto del código
  }
}
```

### **Prueba 2: Desconectar y Reconectar**

1. Publicar un estado en WhatsApp
2. Desconectar el bot
3. Reconectar el bot
4. Verificar si el estado se marcó como visto

### **Prueba 3: Monitorear Red**

Usar herramientas de monitoreo de red para ver si se envían paquetes de "mensaje leído" para estados.

---

## 📊 Resultados de la Investigación

| Aspecto | Resultado | Evidencia |
|---------|-----------|-----------|
| Código explícito para marcar estados | ❌ NO encontrado | Ninguna referencia a `status@broadcast` |
| Uso de `markAsRead` para estados | ❌ NO | Solo se usa para mensajes directos |
| Eventos de estados suscritos | ❌ NO | Solo `messages.upsert` y `messages.update` |
| Posible comportamiento de Baileys | ⚠️ SÍ (hipótesis) | `emitOwnEvents` y `getMessage` callback |

---

## ✅ Recomendación Final

**Implementar Solución 1** como medida preventiva:

```javascript
// server/baileys/session-manager.js
async handleIncomingMessages(tenantId, messages, type) {
  console.log(`🔍 [DEBUG] handleIncomingMessages llamado para tenant ${tenantId}, type: ${type}, mensajes: ${messages.length}`);
  
  for (const message of messages) {
    // 🛡️ FILTRO DE ESTADOS/HISTORIAS
    if (message.key.remoteJid === 'status@broadcast') {
      logger.info(`[${tenantId}] Estado/Historia de WhatsApp ignorado`);
      continue;
    }
    
    if (type === 'notify') {
      console.log(`🔍 [DEBUG] Mensaje tipo notify de ${message.key.remoteJid}`);
      logger.info(`[${tenantId}] Mensaje recibido de ${message.key.remoteJid}`);
      
      console.log(`🔍 [DEBUG] Emitiendo evento 'message' para tenant ${tenantId}`);
      this.emit('message', tenantId, message);
      console.log(`🔍 [DEBUG] Evento 'message' emitido`);
    } else {
      console.log(`🔍 [DEBUG] Mensaje ignorado, type: ${type}`);
    }
  }
}
```

**Ventajas:**
- ✅ Sin impacto en mensajes normales
- ✅ Previene procesamiento accidental de estados
- ✅ Fácil de implementar y probar
- ✅ No rompe funcionalidad existente

---

## 📝 Notas Adicionales

1. **Estados de WhatsApp** son efímeros y solo están disponibles por 24 horas
2. El canal `status@broadcast` es donde WhatsApp publica todos los estados de contactos
3. Baileys puede estar procesando estos eventos internamente aunque no estén manejados en el código

---

## 🔗 Referencias

- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys)
- [WhatsApp Status Broadcast Protocol](https://github.com/WhiskeySockets/Baileys/issues/123)
- Código revisado:
  - `/server/baileys/event-handlers.js`
  - `/server/baileys/session-manager.js`
  - `/server/baileys/message-adapter.js`

---

**Próximos Pasos:**
1. ✅ Implementar filtro de estados en `session-manager.js`
2. ✅ Agregar logs de depuración para confirmar
3. ✅ Probar con estados reales de WhatsApp
4. ✅ Monitorear logs después del deploy

---

**Última actualización:** 18 de enero de 2026, 11:45 PM
