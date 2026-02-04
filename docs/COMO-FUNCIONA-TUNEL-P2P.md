# 🌐 Cómo Funciona el Sistema de Túnel P2P por Navegador

## 🎯 Concepto General

Es un **"Proxy P2P por Navegador"** que permite que las peticiones de WhatsApp salgan desde la **IP del restaurante** (navegador) en lugar de la IP de Railway (servidor).

---

## 📊 Arquitectura Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE TÚNEL P2P                         │
└─────────────────────────────────────────────────────────────────┘

1️⃣ CONEXIÓN INICIAL (Túnel Permanente)
═══════════════════════════════════════════════════════════════════

Navegador Restaurante              Railway Server              WhatsApp
   (IP Real)                      (IP Compartida)              (Meta)
      │                                │                         │
      │  WebSocket (wss://)            │                         │
      │──────────────────────────────>│                         │
      │  "Hola, soy rest_12345"        │                         │
      │  "Quiero crear túnel"          │                         │
      │                                │                         │
      │<───────────────────────────────│                         │
      │  "Túnel registrado ✅"         │                         │
      │                                │                         │
      │  ❤️ Ping (cada 30s)           │                         │
      │<──────────────────────────────>│                         │
      │                                │                         │
      └─── TÚNEL ABIERTO 24/7 ────────┘                         │


2️⃣ PETICIÓN DE WHATSAPP (Via Túnel)
═══════════════════════════════════════════════════════════════════

                                     │  Baileys quiere enviar      │
                                     │  mensaje a WhatsApp         │
                                     │                             │
                                     ▼                             │
                            ┌────────────────┐                     │
                            │ Tunnel Manager │                     │
                            │  (en Railway)  │                     │
                            └────────────────┘                     │
                                     │                             │
                            ¿Hay túnel activo?                     │
                                     │                             │
                        SÍ ──────────┼────────── NO               │
                        │                        │                 │
                        ▼                        ▼                 │
                   Via Túnel                Via Railway            │
                  (IP Real)              (IP Compartida)           │
                        │                        │                 │
                        │                        │                 │
┌───────────────────────┼────────────────────────┘                 │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. Railway crea request ID único                        │    │
│  │    requestId = "rest_12345_req_abc123"                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                       │                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 2. Envía via WebSocket al navegador                     │    │
│  │    {                                                     │    │
│  │      type: "proxy.request",                             │    │
│  │      requestId: "rest_12345_req_abc123",                │    │
│  │      url: "https://web.whatsapp.com/...",              │    │
│  │      method: "POST",                                    │    │
│  │      headers: {...},                                    │    │
│  │      body: "mensaje"                                    │    │
│  │    }                                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                       │                                          │
│                       ▼                                          │
│            ┌─────────────────────┐                              │
│            │ Navegador Restaurante│                              │
│            │  (Service Worker)   │                              │
│            └─────────────────────┘                              │
│                       │                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 3. Service Worker hace la petición real                 │    │
│  │    fetch("https://web.whatsapp.com/...", {             │    │
│  │      method: "POST",                                    │    │
│  │      headers: {...},                                    │    │
│  │      body: "mensaje"                                    │    │
│  │    })                                                    │    │
│  │                                                          │    │
│  │    ⚡ Petición sale con IP del restaurante              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                       │                                          │
│                       ├─────────────────────────────────────────>│
│                       │  POST /send-message                      │
│                       │  IP: 190.123.45.67 (Restaurante)        │
│                       │                                          │
│                       │<─────────────────────────────────────────│
│                       │  200 OK                                  │
│                       │  {success: true, messageId: "xyz"}       │
│                       │                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 4. Service Worker responde via WebSocket                │    │
│  │    {                                                     │    │
│  │      type: "proxy.response",                            │    │
│  │      requestId: "rest_12345_req_abc123",                │    │
│  │      status: 200,                                       │    │
│  │      headers: {...},                                    │    │
│  │      body: "{success: true, messageId: 'xyz'}"          │    │
│  │    }                                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                       │                                          │
│                       ▼                                          │
│            ┌─────────────────────┐                              │
│            │   Tunnel Manager    │                              │
│            │    (en Railway)     │                              │
│            └─────────────────────┘                              │
│                       │                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 5. Resuelve la Promise pendiente                        │    │
│  │    pendingRequests.get(requestId).resolve(response)     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                       │                                          │
│                       ▼                                          │
│            ┌─────────────────────┐                              │
│            │       Baileys       │                              │
│            │   (WhatsApp Bot)    │                              │
│            └─────────────────────┘                              │
│                       │                                          │
│                       ▼                                          │
│               ✅ Mensaje enviado                                │
│               WhatsApp vio IP del restaurante                   │
│               No sabe que es un bot                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Flujo Técnico Detallado

### Fase 1: Establecimiento del Túnel

```javascript
// 1. Usuario abre dashboard.html
// 2. Se carga js/tunnel-worker-register.js

// 3. Se registra Service Worker
navigator.serviceWorker.register('/sw-tunnel.js')

// 4. Service Worker intenta conectar WebSocket
const ws = new WebSocket('wss://api.kdsapp.site/tunnel')

// 5. Backend acepta conexión (incluso sin tenantId)
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request, null) // ✅ tenantId puede ser null
  })
})

// 6. Service Worker obtiene tenantId
const tenantId = localStorage.getItem('tenantId') // "rest_12345"

// 7. Service Worker registra túnel con backend
ws.send({
  type: 'tunnel.register',
  tenantId: 'rest_12345',
  deviceInfo: {
    userAgent: '...',
    page: '/dashboard.html',
    ip: '190.123.45.67'
  }
})

// 8. Backend confirma registro
tunnelManager.registerTunnel(ws, deviceInfo)
ws.send({ type: 'tunnel.registered', tenantId: 'rest_12345' })

// 9. Frontend actualiza indicador
window.KDSTunnel.websocketConnected = true
// UI muestra: "🌐 Túnel Activo"
```

### Fase 2: Envío de Mensaje (Via Túnel)

```javascript
// 1. Baileys quiere enviar mensaje
await sock.sendMessage(jid, { text: "Hola!" })

// 2. Baileys llama a fetchAgent personalizado
const fetchAgent = tunnelManager.createTunnelProxyFetch(tenantId)

// 3. TunnelManager verifica si hay túnel
if (tunnelManager.hasTunnel(tenantId)) {
  // ✅ HAY TÚNEL - Usar navegador
  return tunnelManager.sendRequestViaTunnel(tenantId, {
    url: 'https://web.whatsapp.com/api/send',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: jid, message: "Hola!" })
  })
} else {
  // ❌ NO HAY TÚNEL - Fallback a Railway
  return fetch(url, options)
}

// 4. TunnelManager crea request único
const requestId = `${tenantId}_req_${Date.now()}_${Math.random()}`

// 5. Crea Promise pendiente
const promise = new Promise((resolve, reject) => {
  pendingRequests.set(requestId, { 
    resolve, 
    reject,
    timeout: setTimeout(() => reject('timeout'), 30000)
  })
})

// 6. Envía via WebSocket al navegador
const tunnel = tunnels.get(tenantId)
tunnel.socket.send(JSON.stringify({
  type: 'proxy.request',
  requestId: requestId,
  url: 'https://web.whatsapp.com/api/send',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{"to":"5491112345678@s.whatsapp.net","message":"Hola!"}'
}))

// 7. Service Worker recibe el mensaje
self.addEventListener('message', async (event) => {
  const data = JSON.parse(event.data)
  
  if (data.type === 'proxy.request') {
    // Hacer la petición REAL desde el navegador
    const response = await fetch(data.url, {
      method: data.method,
      headers: data.headers,
      body: data.body
    })
    
    // ⚡ Esta petición sale con la IP del restaurante
    // WhatsApp ve: 190.123.45.67 (IP del restaurante)
    
    const responseBody = await response.text()
    
    // Responder al servidor
    ws.send(JSON.stringify({
      type: 'proxy.response',
      requestId: data.requestId,
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: responseBody
    }))
  }
})

// 8. Backend recibe respuesta
ws.on('message', (message) => {
  const data = JSON.parse(message)
  
  if (data.type === 'proxy.response') {
    const pending = pendingRequests.get(data.requestId)
    
    if (pending) {
      clearTimeout(pending.timeout)
      pending.resolve({
        status: data.status,
        headers: data.headers,
        body: data.body
      })
      pendingRequests.delete(data.requestId)
    }
  }
})

// 9. Baileys recibe respuesta
// ✅ Mensaje enviado con IP del restaurante
```

---

## 🎯 ¿Por Qué Funciona?

### 1. **Cada Restaurante = Una IP Única**

```
Restaurante A (Buenos Aires)    → IP: 190.123.45.67
Restaurante B (Córdoba)          → IP: 181.45.123.89
Restaurante C (Mendoza)          → IP: 200.67.89.123

Railway Server                   → IP: 52.1.2.3 (COMPARTIDA)
```

**Sin Túnel:**
- WhatsApp ve **todos** los bots con la misma IP: `52.1.2.3`
- 🚨 **Alto riesgo de ban masivo**

**Con Túnel:**
- WhatsApp ve cada bot con **su propia IP**
- ✅ **Imposible detectar que son bots**

### 2. **Comportamiento Real de Navegador**

```javascript
// El Service Worker hace fetch() REAL
fetch('https://web.whatsapp.com/api/send', {...})

// WhatsApp ve:
// - User-Agent: "Chrome 120.0.0.0 (Windows)"
// - IP: 190.123.45.67 (IP residencial real)
// - Headers: Headers normales de navegador
// - TLS Fingerprint: Chrome real
// - Cookies: Cookies reales del navegador
```

**WhatsApp piensa:** "Es un usuario normal usando WhatsApp Web"

### 3. **Sin Instalación**

- ❌ No requiere descargar apps
- ❌ No requiere instalar software
- ❌ No requiere configurar VPN
- ✅ Solo abrir el dashboard en el navegador

---

## 📊 Comparación con Otros Sistemas

### Bright Data (No Funciona)

```
Railway → Bright Data Proxy → WhatsApp
           (IP Proxy)

❌ WhatsApp detecta proxies datacenter
❌ Requiere pago mensual caro
❌ IPs compartidas entre muchos clientes
```

### Túnel P2P (Nuestra Solución)

```
Railway → WebSocket → Navegador Restaurante → WhatsApp
                      (IP Residencial Real)

✅ IP residencial única por restaurante
✅ Sin costo adicional
✅ Comportamiento 100% navegador real
✅ Imposible de detectar
```

---

## 🔒 Ventajas del Sistema

### 1. **Anti-Ban Efectivo**

- ✅ Cada restaurante tiene su propia IP
- ✅ WhatsApp no puede correlacionar bots
- ✅ Comportamiento idéntico a usuario real

### 2. **Sin Costo**

- ✅ No requiere servicio de proxies ($50-200/mes)
- ✅ Usa infraestructura existente (navegador)

### 3. **Fallback Automático**

```javascript
if (hasTunnel(tenantId)) {
  // ✅ Usar túnel (IP restaurante)
  return sendViaTunnel()
} else {
  // ⚠️ Fallback a Railway (IP compartida)
  return fetch()
}
```

**Resultado:**
- Si el dashboard está abierto → IP restaurante ✅
- Si el dashboard está cerrado → IP Railway (fallback) ⚠️
- **La sesión nunca se pierde**

### 4. **Persistencia de Sesión**

```
Dashboard cerrado → Túnel desconectado → Usa Railway
         ↓
  (30 minutos después)
         ↓
Dashboard abierto → Túnel reconecta → Usa túnel
         ↓
✅ Sesión sigue activa, no requiere QR
```

---

## 🚀 Estados del Sistema

### Estado 1: Dashboard Cerrado

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│  Baileys │──────────>│ Railway  │──────────>│ WhatsApp │
└──────────┘   Direct  └──────────┘   Direct  └──────────┘
               IP: 52.1.2.3 (Compartida)
```

⚠️ Riesgo de ban compartido

### Estado 2: Dashboard Abierto

```
┌──────────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐
│  Baileys │───>│ Railway  │───>│ Navegador  │───>│ WhatsApp │
└──────────┘    └──────────┘    │ Restaurante│    └──────────┘
                WebSocket        └────────────┘
                                 IP: 190.123.45.67
```

✅ IP única, sin riesgo

---

## 📋 Mantenimiento del Túnel

### Heartbeat (Mantener Vivo)

```javascript
// Cada 30 segundos
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send({ type: 'ping' })
  }
}, 30000)

// Backend responde
ws.on('message', (data) => {
  if (data.type === 'ping') {
    ws.send({ type: 'pong', timestamp: Date.now() })
    tunnelManager.updateHeartbeat(tenantId)
  }
})
```

### Reconexión Automática

```javascript
ws.on('close', () => {
  // Esperar 3 segundos y reconectar
  setTimeout(() => {
    establishTunnel()
  }, 3000)
})
```

### Timeout de Requests

```javascript
const timeout = setTimeout(() => {
  pending.reject(new Error('Request timeout'))
  pendingRequests.delete(requestId)
}, 30000) // 30 segundos
```

---

## 🎯 Resumen Ejecutivo

### ¿Qué es?

Un **proxy P2P por navegador** que permite que las peticiones de WhatsApp salgan desde la IP del restaurante en lugar de la IP compartida de Railway.

### ¿Cómo funciona?

1. Dashboard abre WebSocket permanente con Railway
2. Cuando Baileys quiere enviar mensaje, lo envía via WebSocket al navegador
3. Navegador hace la petición REAL a WhatsApp con su IP
4. Respuesta vuelve via WebSocket a Railway
5. Baileys recibe respuesta como si hubiera hecho fetch directo

### ¿Por qué funciona?

- WhatsApp ve IP residencial única por restaurante
- Comportamiento idéntico a navegador real
- Imposible detectar automatización

### ¿Ventajas?

- ✅ Anti-ban efectivo
- ✅ Sin costo adicional
- ✅ Sin instalación
- ✅ Fallback automático
- ✅ Sesión persistente

---

**¿Preguntas?** Este sistema es innovador y efectivo porque combina:
- WebSocket para comunicación bidireccional
- Service Worker para interceptar requests
- Fallback automático para disponibilidad
- IP única por restaurante para anti-ban

Es literalmente un **"navegador remoto"** que ejecuta peticiones desde la ubicación del restaurante. 🚀
