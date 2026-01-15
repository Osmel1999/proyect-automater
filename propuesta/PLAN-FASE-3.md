# 🚀 FASE 3: FRONTEND & API

## 📋 Objetivo General

Crear la interfaz de usuario y los endpoints de API necesarios para que los tenants puedan:
1. Conectar su WhatsApp escaneando un QR
2. Ver el estado de su conexión
3. Gestionar conversaciones desde el dashboard
4. Configurar auto-respuestas

---

## 📂 Estructura de Fase 3

### 3.1 Frontend de Onboarding
### 3.2 Dashboard de Conversaciones  
### 3.3 API Endpoints REST
### 3.4 Integración con Sistema Existente

---

## 3.1 FRONTEND DE ONBOARDING

### Archivos a Crear/Modificar

```
kds-webapp/
├── onboarding-baileys.html    (NUEVO)
├── onboarding-baileys.js      (NUEVO)
└── styles/
    └── onboarding-baileys.css (NUEVO)
```

### Componentes UI

#### 1. Pantalla de Conexión
```html
┌─────────────────────────────────────┐
│  Conectar WhatsApp                  │
├─────────────────────────────────────┤
│                                     │
│   ┌───────────────────────┐         │
│   │                       │         │
│   │    [QR CODE AQUÍ]     │         │
│   │                       │         │
│   └───────────────────────┘         │
│                                     │
│   📱 Escanea con WhatsApp           │
│                                     │
│   Estado: ⏳ Esperando conexión...  │
│                                     │
│   [Reintentar QR]  [Cancelar]      │
│                                     │
└─────────────────────────────────────┘
```

#### 2. Pantalla de Conectado
```html
┌─────────────────────────────────────┐
│  WhatsApp Conectado ✅              │
├─────────────────────────────────────┤
│                                     │
│   📱 +57 300 123 4567               │
│   👤 Nombre de Negocio              │
│                                     │
│   Estado: 🟢 Conectado              │
│   Último mensaje: Hace 2 min        │
│                                     │
│   Estadísticas Hoy:                 │
│   • Mensajes enviados: 45/1000     │
│   • Mensajes recibidos: 23         │
│   • Tasa de respuesta: 87%         │
│                                     │
│   [Ir al Dashboard]  [Desconectar] │
│                                     │
└─────────────────────────────────────┘
```

### Funcionalidades

- ✅ Mostrar QR code en pantalla
- ✅ Actualizar QR automáticamente si expira
- ✅ Mostrar estado de conexión en tiempo real
- ✅ Notificación cuando se conecta exitosamente
- ✅ Botón para desconectar
- ✅ Vista de perfil conectado
- ✅ Estadísticas básicas

### Implementación

```javascript
// onboarding-baileys.js

class BaileysOnboarding {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.qrContainer = document.getElementById('qr-container');
    this.statusElement = document.getElementById('connection-status');
    this.initConnection();
  }

  async initConnection() {
    try {
      // 1. Iniciar sesión Baileys
      const response = await fetch('/api/baileys/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: this.tenantId })
      });

      const { success } = await response.json();

      if (success) {
        // 2. Obtener QR code
        this.startQRPolling();
        
        // 3. Escuchar estado de conexión
        this.startStatusPolling();
      }
    } catch (error) {
      console.error('Error iniciando conexión:', error);
      this.showError('No se pudo iniciar la conexión');
    }
  }

  async startQRPolling() {
    const pollQR = async () => {
      try {
        const response = await fetch(`/api/baileys/qr?tenantId=${this.tenantId}`);
        const { qr, connected } = await response.json();

        if (connected) {
          this.showConnected();
          return; // Stop polling
        }

        if (qr) {
          this.displayQR(qr);
          // Poll again in 3 seconds
          setTimeout(pollQR, 3000);
        }
      } catch (error) {
        console.error('Error obteniendo QR:', error);
      }
    };

    pollQR();
  }

  displayQR(qrData) {
    // Usar biblioteca QRCode.js para mostrar QR
    this.qrContainer.innerHTML = '';
    new QRCode(this.qrContainer, {
      text: qrData,
      width: 300,
      height: 300
    });
  }

  showConnected() {
    // Mostrar pantalla de conectado
    window.location.href = '/dashboard.html?tab=whatsapp';
  }
}
```

---

## 3.2 DASHBOARD DE CONVERSACIONES

### Archivos a Crear/Modificar

```
kds-webapp/
├── dashboard-whatsapp.html     (NUEVO)
├── dashboard-whatsapp.js       (NUEVO)
├── dashboard.html              (MODIFICAR - agregar tab)
└── styles/
    └── dashboard-whatsapp.css  (NUEVO)
```

### Diseño del Dashboard

```html
┌─────────────────────────────────────────────────────────┐
│  Dashboard WhatsApp                                     │
├─────────────┬───────────────────────────────────────────┤
│ Chats (12)  │  Conversación con +57 300 123 4567       │
│             │  ┌────────────────────────────────────┐   │
│ ┌─────────┐ │  │ Cliente: Quiero hacer un pedido    │   │
│ │📱 +573..│ │  │                        10:30 AM    │   │
│ │ Hola... │ │  └────────────────────────────────────┘   │
│ │ 10:30   │ │                                           │
│ └─────────┘ │  ┌────────────────────────────────────┐   │
│             │  │          ¡Claro! ¿Qué deseas?      │   │
│ ┌─────────┐ │  │                        10:31 AM    │   │
│ │📱 +571..│ │  └────────────────────────────────────┘   │
│ │ Gracia..│ │                                           │
│ │ 09:45   │ │  ┌────────────────────────────────────┐   │
│ └─────────┘ │  │ Cliente: Pizza grande con...       │   │
│             │  │                        10:32 AM    │   │
│ ┌─────────┐ │  └────────────────────────────────────┘   │
│ │📱 +575..│ │                                           │
│ │ Ok!     │ │  [Escribir mensaje...]     [Enviar]      │
│ │ 08:20   │ │                                           │
│ └─────────┘ │  Plantillas rápidas:                     │
│             │  [Gracias] [Sí] [No] [Luego]             │
├─────────────┴───────────────────────────────────────────┤
│ Estado: 🟢 Conectado | Mensajes hoy: 45/1000          │
└─────────────────────────────────────────────────────────┘
```

### Componentes

#### 1. Lista de Chats
- Mostrar todos los chats activos
- Indicador de mensajes no leídos
- Última fecha/hora de mensaje
- Avatar del contacto

#### 2. Vista de Conversación
- Mensajes entrantes (izquierda)
- Mensajes salientes (derecha)
- Timestamps
- Estado de lectura (✓✓)

#### 3. Envío de Mensajes
- Caja de texto para escribir
- Botón de envío
- Plantillas rápidas
- Soporte para emojis

#### 4. Barra de Estado
- Estado de conexión (conectado/desconectado)
- Estadísticas del día
- Límites anti-ban

### Funcionalidades

- ✅ Ver todos los chats activos
- ✅ Abrir conversación específica
- ✅ Enviar mensajes en tiempo real
- ✅ Recibir mensajes en tiempo real (WebSocket)
- ✅ Ver historial de conversaciones
- ✅ Plantillas de respuestas rápidas
- ✅ Indicador de escritura
- ✅ Notificaciones de mensajes nuevos
- ✅ Búsqueda de conversaciones
- ✅ Filtrar por estado (no leído, archivado)

---

## 3.3 API ENDPOINTS REST

### Estructura del Server

```
server/
├── routes/
│   └── baileys-routes.js       (NUEVO)
├── controllers/
│   └── baileys-controller.js   (NUEVO)
└── middleware/
    └── baileys-auth.js         (NUEVO)
```

### Endpoints a Implementar

#### 1. Conexión

```javascript
// POST /api/baileys/connect
// Inicia una nueva sesión Baileys para un tenant
router.post('/connect', async (req, res) => {
  const { tenantId } = req.body;
  
  try {
    await baileys.initSession(tenantId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/baileys/qr
// Obtiene el QR code actual
router.get('/qr', async (req, res) => {
  const { tenantId } = req.query;
  
  try {
    const qr = await baileys.getQRCode(tenantId);
    const connected = await baileys.isConnected(tenantId);
    
    res.json({ qr, connected });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/baileys/disconnect
// Desconecta la sesión
router.post('/disconnect', async (req, res) => {
  const { tenantId } = req.body;
  
  try {
    await baileys.disconnect(tenantId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 2. Estado y Estadísticas

```javascript
// GET /api/baileys/status
// Obtiene el estado actual de la conexión
router.get('/status', async (req, res) => {
  const { tenantId } = req.query;
  
  try {
    const status = await baileys.getStatus(tenantId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/baileys/stats
// Obtiene estadísticas anti-ban
router.get('/stats', async (req, res) => {
  const { tenantId } = req.query;
  
  try {
    const stats = await baileys.getAntiBanStats(tenantId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 3. Mensajería

```javascript
// POST /api/baileys/send
// Envía un mensaje
router.post('/send', async (req, res) => {
  const { tenantId, to, text, type = 'text' } = req.body;
  
  try {
    const result = await baileys.sendMessage(tenantId, { to, text, type });
    res.json({ success: true, messageId: result.key.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/baileys/chats
// Lista todos los chats
router.get('/chats', async (req, res) => {
  const { tenantId } = req.query;
  
  try {
    const chats = await baileys.getChats(tenantId);
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/baileys/messages
// Obtiene mensajes de un chat específico
router.get('/messages', async (req, res) => {
  const { tenantId, chatId, limit = 50 } = req.query;
  
  try {
    const messages = await baileys.getMessages(tenantId, chatId, limit);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 4. WebSocket para Tiempo Real

```javascript
// WebSocket: /ws/baileys/:tenantId
// Transmite eventos en tiempo real

io.on('connection', (socket) => {
  const { tenantId } = socket.handshake.query;
  
  // Unirse a room del tenant
  socket.join(`baileys:${tenantId}`);
  
  // Escuchar mensajes nuevos
  socket.on('new-message', (data) => {
    // Emitir a todos los clientes del tenant
    io.to(`baileys:${tenantId}`).emit('message-received', data);
  });
  
  // Escuchar cambios de estado
  socket.on('connection-update', (data) => {
    io.to(`baileys:${tenantId}`).emit('status-changed', data);
  });
});
```

---

## 3.4 INTEGRACIÓN CON SISTEMA EXISTENTE

### Modificaciones Necesarias

#### 1. Agregar Tab en Dashboard

```javascript
// dashboard.html - Agregar nuevo tab

<ul class="nav nav-tabs">
  <li><a href="#pedidos">Pedidos</a></li>
  <li><a href="#menu">Menú</a></li>
  <li><a href="#whatsapp">WhatsApp</a></li> <!-- NUEVO -->
  <li><a href="#reportes">Reportes</a></li>
</ul>

<div id="whatsapp" class="tab-pane">
  <iframe src="dashboard-whatsapp.html"></iframe>
</div>
```

#### 2. Actualizar Firebase Rules

```javascript
// database.rules.json

{
  "rules": {
    "tenants": {
      "$tenantId": {
        "whatsapp": {
          "baileys_session": {
            ".read": "auth.uid === $tenantId",
            ".write": "auth.uid === $tenantId"
          },
          "messages": {
            ".read": "auth.uid === $tenantId",
            ".write": "auth.uid === $tenantId",
            ".indexOn": ["timestamp", "from", "read"]
          }
        }
      }
    }
  }
}
```

#### 3. Migrar Webhooks Existentes

```javascript
// Crear adaptador para webhooks legacy

class WebhookAdapter {
  async processMessage(tenantId, message) {
    // Convertir formato de Meta API a formato Baileys
    const baileysMessage = {
      from: message.from,
      text: message.body.text,
      timestamp: message.timestamp
    };
    
    // Procesar con lógica existente
    await existingMessageHandler(tenantId, baileysMessage);
    
    // Guardar en Firebase
    await storage.saveMessage(tenantId, baileysMessage);
  }
}
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Frontend
- [ ] Crear `onboarding-baileys.html`
- [ ] Crear `onboarding-baileys.js`
- [ ] Crear `onboarding-baileys.css`
- [ ] Implementar lógica de QR polling
- [ ] Implementar pantalla de conectado
- [ ] Crear `dashboard-whatsapp.html`
- [ ] Crear `dashboard-whatsapp.js`
- [ ] Crear `dashboard-whatsapp.css`
- [ ] Implementar lista de chats
- [ ] Implementar vista de conversación
- [ ] Implementar envío de mensajes
- [ ] Agregar tab en dashboard principal

### Backend
- [ ] Crear `routes/baileys-routes.js`
- [ ] Crear `controllers/baileys-controller.js`
- [ ] Implementar POST `/api/baileys/connect`
- [ ] Implementar GET `/api/baileys/qr`
- [ ] Implementar POST `/api/baileys/disconnect`
- [ ] Implementar GET `/api/baileys/status`
- [ ] Implementar GET `/api/baileys/stats`
- [ ] Implementar POST `/api/baileys/send`
- [ ] Implementar GET `/api/baileys/chats`
- [ ] Implementar GET `/api/baileys/messages`
- [ ] Configurar WebSocket para tiempo real
- [ ] Agregar middleware de autenticación

### Integración
- [ ] Actualizar Firebase rules
- [ ] Crear adaptador de webhooks
- [ ] Migrar lógica de mensajes existente
- [ ] Probar flujo completo end-to-end

### Testing
- [ ] Test de onboarding completo
- [ ] Test de envío/recepción de mensajes
- [ ] Test de WebSocket en tiempo real
- [ ] Test de límites anti-ban en UI
- [ ] Test de desconexión y reconexión

---

## 📊 Estimación de Tiempo

| Tarea | Tiempo Estimado |
|-------|----------------|
| Frontend Onboarding | 2-3 horas |
| Dashboard WhatsApp | 3-4 horas |
| API Endpoints | 2-3 horas |
| WebSocket | 1-2 horas |
| Integración | 2-3 horas |
| Testing | 2-3 horas |
| **TOTAL** | **12-18 horas** |

---

## 🎯 Resultado Esperado

Al completar Fase 3, el sistema tendrá:

1. ✅ **UI completa** para conectar WhatsApp
2. ✅ **Dashboard funcional** para gestionar conversaciones
3. ✅ **API REST** completa para todas las operaciones
4. ✅ **Tiempo real** vía WebSocket
5. ✅ **Integración** con sistema existente
6. ✅ **Experiencia de usuario** fluida

**Estado esperado:** 🟢 **LISTO PARA PRUEBAS CON CLIENTES PILOTO**

---

**Generado:** 15 de enero de 2026  
**Fase:** 3/6  
**Prerequisitos:** Fase 1 y 2 completadas ✅
