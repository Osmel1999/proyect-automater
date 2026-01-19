# Sistema de Auto-Reconexión de WhatsApp (Baileys)

## 📋 Descripción General

Sistema automático de reconexión para bots de WhatsApp usando Baileys en Railway. Cuando Railway pone el servidor en sleep y luego lo despierta, el sistema automáticamente:

1. ✅ **Detecta** que el bot está desconectado
2. ✅ **Carga** las credenciales guardadas de Firestore
3. ✅ **Reconecta** automáticamente sin necesidad de escanear QR
4. ✅ **Procesa** los mensajes que llegaron mientras estaba desconectado

## 🏗️ Arquitectura

```
┌─────────────┐
│   Railway   │  (Duerme después de inactividad)
│   Server    │
└──────┬──────┘
       │ Despierta
       ▼
┌──────────────────────────────────────────────────┐
│  1. Usuario envía mensaje                        │
│  2. event-handlers.handleIncomingMessage()       │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  3. connectionManager.ensureConnected()          │
│     ├─ ¿Está conectado? ✅ → Procesar mensaje   │
│     └─ ¿Desconectado? ❌ → Intentar reconectar  │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  4. storage.loadSessionFromFirebase()            │
│     ├─ Cargar credenciales desde Firestore       │
│     └─ Si no hay credenciales → Notificar admin  │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  5. sessionManager.initSession()                 │
│     └─ Reconectar con credenciales guardadas     │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  6. messageQueue.processQueue()                  │
│     └─ Procesar mensajes pendientes              │
└──────────────────────────────────────────────────┘
```

## 📦 Componentes Clave

### 1. **storage.js** - Persistencia de Credenciales

**Ubicación:** `server/baileys/storage.js`

**Funciones principales:**

```javascript
// Guardar credenciales en Firestore
await storage.saveSessionToFirebase(tenantId, sessionData);

// Cargar credenciales desde Firestore
const credentials = await storage.loadSessionFromFirebase(tenantId);

// Obtener AuthState compatible con Baileys
const { state, saveCreds } = await storage.getAuthState(tenantId);
```

**Datos guardados en Firestore:**

```
baileys_sessions/{tenantId}
├── creds: { ... }        // Credenciales completas de Baileys
├── keys: { ... }         // Keys de encriptación
├── updatedAt: timestamp
└── savedAt: timestamp
```

---

### 2. **connection-manager.js** - Auto-Reconexión

**Ubicación:** `server/baileys/connection-manager.js`

**Funciones principales:**

```javascript
// Verificar y reconectar si es necesario
const isConnected = await connectionManager.ensureConnected(tenantId);

// Actualizar estado de conexión
connectionManager.updateConnectionState(tenantId, true/false);

// Obtener estadísticas
const stats = connectionManager.getConnectionStats(tenantId);
```

**Lógica de reconexión:**

- ✅ **Cooldown:** 30 segundos entre intentos
- ✅ **Límite:** 3 intentos máximo
- ✅ **Reset:** Contador se resetea después de 5 minutos
- ✅ **Notificaciones:** Si falla, notifica al admin

---

### 3. **message-queue.js** - Cola de Mensajes Pendientes

**Ubicación:** `server/baileys/message-queue.js`

**Funciones principales:**

```javascript
// Agregar mensaje a la cola
await messageQueue.enqueue(tenantId, internalMessage);

// Procesar cola cuando se reconecta
await messageQueue.processQueue(tenantId, async (message) => {
  // Procesar mensaje
});

// Obtener tamaño de la cola
const size = messageQueue.getQueueSize(tenantId);
```

**Datos guardados en Firestore:**

```
message_queue/{tenantId}
├── messages: [
│   ├── { from, text, timestamp, queuedAt, attempts }
│   └── ...
│ ]
└── updatedAt: timestamp
```

**Características:**

- ✅ **Persistencia:** Cola guardada en Firestore
- ✅ **Reintentos:** Hasta 3 intentos por mensaje
- ✅ **Dead Letter Queue:** Mensajes fallidos se guardan para revisión

---

### 4. **event-handlers.js** - Integración

**Ubicación:** `server/baileys/event-handlers.js`

**Flujo de mensaje entrante:**

```javascript
async handleIncomingMessage(tenantId, baileysMessage) {
  // 1. Verificar que no sea mensaje propio
  if (isFromBot(baileysMessage)) return;

  // 2. 🚀 AUTO-RECONEXIÓN
  const isConnected = await connectionManager.ensureConnected(tenantId);
  
  if (!isConnected) {
    // 3. Agregar a cola si no está conectado
    await messageQueue.enqueue(tenantId, internalMessage);
    await markAsRead(tenantId, baileysMessage.key, true);
    return;
  }

  // 4. Procesar mensaje normalmente
  const response = await callback(internalMessage);
  // ...
}
```

**Flujo de reconexión:**

```javascript
async handleConnectionChange(tenantId, state, info) {
  if (state === 'open') {
    // 🚀 Procesar mensajes en cola al reconectar
    setImmediate(async () => {
      await this.processQueuedMessages(tenantId);
    });
  }
}
```

---

### 5. **session-manager.js** - Gestión de Sesiones

**Ubicación:** `server/baileys/session-manager.js`

**Modificaciones clave:**

```javascript
async initSession(tenantId, options = {}) {
  // Usar storage.getAuthState() en lugar de useMultiFileAuthState()
  const { state, saveCreds } = await storage.getAuthState(tenantId);

  const socket = makeWASocket({
    auth: state,
    // ... otras opciones
  });

  // Guardar credenciales cuando se actualizan
  socket.ev.on('creds.update', async () => {
    await saveCreds();
  });

  return socket;
}
```

**Manejo de desconexión:**

```javascript
async handleConnectionUpdate(tenantId, update) {
  if (connection === 'close') {
    // Delegar reconexión a connection-manager
    connectionManager.updateConnectionState(tenantId, false);
  } else if (connection === 'open') {
    // Actualizar estado en connection-manager
    connectionManager.updateConnectionState(tenantId, true);
  }
}
```

---

## 🔄 Flujo Completo de Reconexión

### Escenario 1: Railway despierta y llega un mensaje

```
1. Usuario envía: "Hola"
   ↓
2. Railway despierta el servidor (frío)
   ↓
3. event-handlers recibe el mensaje
   ↓
4. connectionManager.ensureConnected()
   ├─ isConnected() → false ❌
   ├─ loadSessionFromFirebase() → ✅ credenciales encontradas
   ├─ sessionManager.initSession() → Reconectando...
   └─ Espera 5 segundos
   ↓
5. ¿Reconexión exitosa?
   ├─ ✅ Sí → Procesar mensaje
   └─ ❌ No → Agregar a cola
   ↓
6. Responder al usuario
```

**Tiempo total estimado:** 3-5 segundos (aceptable)

---

### Escenario 2: Reconexión falla (sin credenciales)

```
1. Usuario envía: "Hola"
   ↓
2. connectionManager.ensureConnected()
   ├─ isConnected() → false ❌
   └─ loadSessionFromFirebase() → ❌ Sin credenciales
   ↓
3. markReconnectNeeded()
   ├─ Guardar flag en Firebase
   └─ Crear notificación para admin
   ↓
4. Agregar mensaje a la cola
   ↓
5. Marcar como leído (para no ignorar al usuario)
```

---

### Escenario 3: Reconexión exitosa + Cola pendiente

```
1. Bot se reconecta exitosamente
   ↓
2. handleConnectionChange(state='open')
   ↓
3. processQueuedMessages()
   ├─ Obtener callback registrado
   ├─ Leer cola desde Firestore
   └─ Procesar cada mensaje:
       ├─ Ejecutar callback
       ├─ Enviar respuesta
       └─ Marcar como procesado
   ↓
4. Limpiar mensajes procesados de Firestore
```

---

## 📊 Datos en Firebase

### Firestore Collections

```
baileys_sessions/{tenantId}
  ├── creds: object
  ├── keys: object
  ├── updatedAt: string
  └── savedAt: number

message_queue/{tenantId}
  ├── tenantId: string
  ├── messages: array
  │   └── { from, text, timestamp, queuedAt, attempts, maxAttempts }
  └── updatedAt: string

dead_letter_queue/{messageId}
  ├── tenantId: string
  ├── message: object
  ├── error: string
  ├── stack: string
  └── failedAt: string
```

### Realtime Database

```
tenants/{tenantId}/restaurant
  ├── whatsappConnected: boolean
  ├── connectedAt: string
  ├── reconnectNeeded: boolean
  └── reconnectNeededAt: string

tenants/{tenantId}/notifications/{notificationId}
  ├── type: "reconnect_needed"
  ├── message: string
  ├── priority: "high"
  ├── read: boolean
  └── createdAt: string
```

---

## 🚀 Variables de Entorno

```bash
# No se requieren variables adicionales para auto-reconexión
# El sistema usa las credenciales de Firebase existentes
```

---

## ✅ Características Implementadas (MUST HAVE)

1. **✅ Persistencia de credenciales**
   - Guardado automático en Firestore
   - Compatible con formato de Baileys
   - Carga automática al reconectar

2. **✅ Auto-reconexión con credenciales guardadas**
   - Cooldown de 30s entre intentos
   - Límite de 3 intentos
   - Notificación al admin si falla

3. **✅ Cola de mensajes pendientes**
   - Persistencia en Firestore
   - Procesamiento automático al reconectar
   - Reintentos y dead letter queue

---

## 🔧 Cómo Probar

### 1. Verificar que las credenciales se guardan

```bash
# Conectar WhatsApp (escanear QR)
# Luego verificar en Firestore:
railway run npm run firebase-cli

# En Firebase CLI:
> db.collection('baileys_sessions').doc('tenant1').get()
```

### 2. Simular sleep de Railway

```bash
# En local, matar el proceso
pkill -f "node server"

# Esperar 30 segundos

# Enviar mensaje de WhatsApp

# Iniciar servidor
npm start

# Verificar logs: debe auto-reconectar
```

### 3. Verificar cola de mensajes

```bash
# Mientras el bot está desconectado, enviar 3 mensajes
# Luego reconectar y verificar que se procesan todos

# Verificar en Firestore:
> db.collection('message_queue').doc('tenant1').get()
```

---

## 📝 Logs Importantes

```bash
# Auto-reconexión exitosa:
[tenant1] 🔍 Verificando conexión...
[tenant1] ⚠️ No está conectado, intentando reconexión automática...
[tenant1] 🔄 Reconectando con credenciales guardadas...
[tenant1] ✅ Reconexión exitosa!

# Mensaje agregado a cola:
[tenant1] Bot desconectado, agregando mensaje a la cola
[tenant1] Mensaje agregado a la cola (1 total)

# Procesando cola:
[tenant1] Conexión reestablecida, procesando mensajes en cola...
[tenant1] Procesando 3 mensajes en cola...
[tenant1] Procesando mensaje en cola de 5491112345678
[tenant1] Cola procesada completamente
```

---

## 🎯 Próximos Pasos (OPCIONAL - No implementado)

1. **Dashboard de Monitoreo**
   - Mostrar estado de conexión en tiempo real
   - Historial de reconexiones
   - Estadísticas de mensajes en cola

2. **Notificaciones Avanzadas**
   - Email al admin cuando falla reconexión
   - SMS de alerta crítica
   - Webhook a Slack/Discord

3. **Health Check Inteligente** (si se requiere en el futuro)
   - Ping periódico cada 5 minutos
   - Solo si hay mensajes pendientes

---

## 🐛 Troubleshooting

### Problema: No reconecta automáticamente

**Verificar:**

1. ¿Hay credenciales en Firestore?
   ```bash
   db.collection('baileys_sessions').doc('tenant1').get()
   ```

2. ¿Está en cooldown?
   ```bash
   # Revisar logs:
   "En cooldown, esperar Xs"
   ```

3. ¿Alcanzó límite de intentos?
   ```bash
   # Esperar 5 minutos para reset automático
   ```

### Problema: Mensajes no se procesan de la cola

**Verificar:**

1. ¿Hay callback registrado?
   ```bash
   eventHandlers.onMessage('*', async (message) => { ... })
   ```

2. ¿La cola está vacía en Firestore?
   ```bash
   db.collection('message_queue').doc('tenant1').get()
   ```

3. ¿Hay errores en el callback?
   ```bash
   # Revisar dead_letter_queue
   db.collection('dead_letter_queue').get()
   ```

---

## 📚 Referencias

- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys)
- [Railway Documentation](https://docs.railway.app/)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)

---

**✅ Sistema implementado y listo para producción**

Tiempo de respuesta después de sleep: **3-5 segundos** (aceptable según requerimientos)
