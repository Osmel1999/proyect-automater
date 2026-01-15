# 📋 PROPUESTA DE MIGRACIÓN: Meta WhatsApp API → Baileys

**Fecha**: 15 de enero de 2026  
**Estado**: 🔍 ANÁLISIS - NO IMPLEMENTADO  
**Autor**: AI Assistant  
**Versión**: 1.0

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### Arquitectura Existente

```
┌─────────────────────────────────────────┐
│  FRONTEND (Firebase Hosting)            │
│  - kdsapp.site                          │
│  - Onboarding con Embedded Signup       │
│  - Dashboard para gestión               │
│  - KDS para visualizar pedidos          │
└──────────────────┬──────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────┐
│  BACKEND (Railway - Node.js/Express)    │
│  - server/index.js (API REST)           │
│  - server/whatsapp-handler.js (Meta)    │
│  - server/bot-logic.js (IA del bot)     │
│  - server/tenant-service.js (Multi)     │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴───────────┐
        │                      │
┌───────▼────────┐  ┌──────────▼──────────┐
│  Meta Graph    │  │  Firebase Database  │
│  WhatsApp API  │  │  - Tenants          │
│  v21.0         │  │  - Pedidos          │
└────────────────┘  │  - Sesiones         │
                    └─────────────────────┘
```

### Componentes Clave

| Componente | Función | Dependencia Meta |
|------------|---------|------------------|
| `whatsapp-handler.js` | Envío/recepción mensajes | ✅ 100% Meta API |
| `bot-logic.js` | Lógica conversacional | ❌ Independiente |
| `tenant-service.js` | Gestión multi-tenant | ⚠️ Usa tokens Meta |
| `index.js` | Webhooks + OAuth | ✅ 100% Meta |
| `onboarding.html` | Embedded Signup | ✅ 100% Meta |

---

## 🎯 OBJETIVO DE LA MIGRACIÓN

### **De:**
```javascript
// Meta WhatsApp Business API
axios.post(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
  messaging_product: 'whatsapp',
  to: phoneNumber,
  text: { body: message }
}, {
  headers: { Authorization: `Bearer ${accessToken}` }
});
```

### **A:**
```javascript
// Baileys (WhatsApp Multi-Device Protocol)
await sock.sendMessage(jid, { 
  text: message 
});
```

---

## 📐 ARQUITECTURA PROPUESTA CON BAILEYS

### Nuevo Flujo

```
┌─────────────────────────────────────────┐
│  FRONTEND (Firebase Hosting)            │
│  - kdsapp.site                          │
│  ❌ SIN Embedded Signup                 │
│  ✅ QR Code Pairing                     │
│  - Dashboard para gestión               │
│  - KDS para visualizar pedidos          │
└──────────────────┬──────────────────────┘
                   │ WebSocket + HTTPS
┌──────────────────▼──────────────────────┐
│  BACKEND (Railway - Node.js/Express)    │
│  - server/index.js (API REST)           │
│  ✅ server/baileys-handler.js (NUEVO)   │
│  ✅ server/session-manager.js (NUEVO)   │
│  ✅ server/warmup-controller.js (NUEVO) │
│  - server/bot-logic.js (sin cambios)    │
│  - server/tenant-service.js (adaptado)  │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴───────────┐
        │                      │
┌───────▼────────┐  ┌──────────▼──────────┐
│  WhatsApp WS   │  │  Firebase Database  │
│  (Baileys)     │  │  - Tenants          │
│  Multi-Device  │  │  - Pedidos          │
└────────────────┘  │  - Sesiones WA      │
                    │  - QR Codes         │
                    └─────────────────────┘
```

---

## 🔧 COMPONENTES A CREAR/MODIFICAR

### 1. ✅ NUEVO: `server/baileys-handler.js`

**Función**: Reemplazar `whatsapp-handler.js` con Baileys

**Funcionalidades:**
```javascript
class BaileysHandler {
  // Gestión de conexión
  async initConnection(tenantId)
  async disconnectSession(tenantId)
  async getQRCode(tenantId)
  
  // Envío de mensajes (compatible con API actual)
  async sendTextMessage(tenantId, to, message)
  async sendButtonMessage(tenantId, to, bodyText, buttons)
  async sendImageMessage(tenantId, to, imageUrl, caption)
  
  // Recepción de mensajes
  handleIncomingMessage(tenantId, message)
  
  // Simulación humana
  async simulateTyping(jid, duration)
  async simulatePresence(jid, state)
  
  // Warmup
  async applyWarmupRules(tenantId, action)
}
```

**Compatibilidad**: 
- ✅ Mantiene la misma interfaz que `whatsapp-handler.js`
- ✅ `bot-logic.js` NO requiere cambios
- ✅ Multi-tenant funciona igual

---

### 2. ✅ NUEVO: `server/session-manager.js`

**Función**: Gestionar sesiones de WhatsApp por tenant

**Estructura de Sesión:**
```javascript
{
  tenantId: 'tenant_123',
  phoneNumber: '+573101234567',
  status: 'connected', // connecting, connected, disconnected, failed
  qrCode: 'data:image/png;base64,...', // null si conectado
  createdAt: '2026-01-15T...',
  lastActivity: '2026-01-15T...',
  warmup: {
    startDate: '2026-01-15',
    currentPhase: 1, // 1-4 (semanas)
    messagesLeftToday: 50,
    dailyLimit: 50
  },
  auth: {
    creds: {...}, // Baileys auth state
    keys: {...}
  }
}
```

**Funciones:**
```javascript
class SessionManager {
  async createSession(tenantId, phoneNumber)
  async loadSession(tenantId)
  async saveSession(tenantId, authState)
  async deleteSession(tenantId)
  async listSessions()
  async getQRCode(tenantId)
  async isSessionActive(tenantId)
}
```

**Persistencia**: Firebase Realtime Database
```
/whatsapp_sessions/
  /tenant_123/
    phoneNumber: "+573101234567"
    status: "connected"
    createdAt: "2026-01-15T..."
    warmup: {...}
    /auth/
      creds: {...}
      keys: {...}
```

---

### 3. ✅ NUEVO: `server/warmup-controller.js`

**Función**: Implementar estrategia de warmeo progresivo

**Fases:**
```javascript
const WARMUP_PHASES = {
  PHASE_1: { // Semana 1
    duration: 7,
    dailyLimit: 20,
    messageDelay: [3000, 8000], // 3-8 segundos
    description: 'Actividad mínima'
  },
  PHASE_2: { // Semana 2
    duration: 7,
    dailyLimit: 50,
    messageDelay: [2000, 6000],
    description: 'Crecimiento moderado'
  },
  PHASE_3: { // Semana 3
    duration: 7,
    dailyLimit: 100,
    messageDelay: [1500, 5000],
    description: 'Uso normal'
  },
  PHASE_4: { // Semana 4+
    duration: Infinity,
    dailyLimit: 200,
    messageDelay: [1000, 4000],
    description: 'Operación completa'
  }
};
```

**Funciones:**
```javascript
class WarmupController {
  async initializeWarmup(tenantId)
  async checkMessageQuota(tenantId)
  async incrementMessageCount(tenantId)
  async getRandomDelay(tenantId)
  async getCurrentPhase(tenantId)
  async canSendMessage(tenantId)
}
```

---

### 4. ✅ NUEVO: `server/human-simulator.js`

**Función**: Simular comportamiento humano

**Técnicas:**
```javascript
class HumanSimulator {
  // Delays aleatorios antes de responder
  async waitBeforeResponse() {
    const delay = Math.random() * (5000 - 2000) + 2000;
    await sleep(delay);
  }
  
  // Simular que está escribiendo
  async simulateTyping(sock, jid, duration = 3000) {
    await sock.presenceUpdate('composing', jid);
    await sleep(duration);
    await sock.presenceUpdate('paused', jid);
  }
  
  // Marcar como leído con delay
  async markAsReadDelayed(sock, messageKey) {
    await sleep(Math.random() * 2000 + 1000);
    await sock.readMessages([messageKey]);
  }
  
  // Presencia online aleatoria
  async randomPresence(sock) {
    const states = ['available', 'unavailable'];
    const state = states[Math.floor(Math.random() * states.length)];
    await sock.presenceUpdate(state);
  }
}
```

---

### 5. 🔄 MODIFICAR: `server/whatsapp-handler.js`

**Opción A: Deprecar completamente**
- Renombrar a `whatsapp-handler-meta.js.old`
- Mantener como referencia

**Opción B: Mantener ambos (Híbrido)**
```javascript
// whatsapp-handler.js se convierte en wrapper
class WhatsAppHandler {
  constructor() {
    this.metaHandler = new MetaHandler(); // Original
    this.baileysHandler = new BaileysHandler(); // Nuevo
  }
  
  async sendTextMessage(tenantId, to, message) {
    const tenant = await tenantService.getTenantById(tenantId);
    
    if (tenant.whatsapp.provider === 'baileys') {
      return await this.baileysHandler.sendTextMessage(tenantId, to, message);
    } else {
      return await this.metaHandler.sendTextMessage(tenantId, to, message);
    }
  }
}
```

**Recomendación**: Opción B (Híbrido) para transición gradual

---

### 6. 🔄 MODIFICAR: `server/tenant-service.js`

**Cambios en estructura de tenant:**

```javascript
// ANTES
whatsapp: {
  businessAccountId: '...',
  phoneNumberId: '...',
  phoneNumber: '+57...',
  accessToken: 'encrypted...',  // Meta token
  webhookVerified: false
}

// DESPUÉS
whatsapp: {
  provider: 'baileys', // 'meta' | 'baileys'
  phoneNumber: '+57...',
  
  // Solo si provider === 'meta'
  meta: {
    businessAccountId: '...',
    phoneNumberId: '...',
    accessToken: 'encrypted...'
  },
  
  // Solo si provider === 'baileys'
  baileys: {
    sessionId: 'tenant_123_session',
    status: 'connected',
    warmupPhase: 2,
    messagesLeftToday: 35
  }
}
```

---

### 7. 🔄 MODIFICAR: `server/index.js`

**Cambios en endpoints:**

```javascript
// NUEVOS ENDPOINTS PARA BAILEYS

/**
 * Iniciar sesión de WhatsApp con QR
 * GET /api/whatsapp/qr/:tenantId
 */
app.get('/api/whatsapp/qr/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  
  try {
    const qrCode = await baileysHandler.getQRCode(tenantId);
    
    if (qrCode) {
      res.json({ success: true, qrCode });
    } else {
      res.json({ success: false, message: 'Ya está conectado' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Estado de la sesión
 * GET /api/whatsapp/status/:tenantId
 */
app.get('/api/whatsapp/status/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  
  const session = await sessionManager.loadSession(tenantId);
  
  res.json({
    success: true,
    status: session.status,
    phoneNumber: session.phoneNumber,
    warmup: session.warmup
  });
});

/**
 * Desconectar sesión
 * POST /api/whatsapp/disconnect/:tenantId
 */
app.post('/api/whatsapp/disconnect/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  
  await baileysHandler.disconnectSession(tenantId);
  
  res.json({ success: true });
});

// DEPRECAR (pero mantener para tenants existentes con Meta)
// app.get('/api/whatsapp/callback', ...)
// app.post('/webhook/whatsapp', ...)
```

---

### 8. ✅ NUEVO: Frontend - `qr-pairing.html`

**Función**: Reemplazar `onboarding.html` para nuevos tenants

**Flujo:**
```
1. Usuario se registra
2. Redirige a qr-pairing.html
3. Frontend llama GET /api/whatsapp/qr/:tenantId
4. Muestra QR code
5. Usuario escanea con WhatsApp
6. WebSocket actualiza estado → "connected"
7. Redirige a dashboard
```

**Código simplificado:**
```javascript
// qr-pairing.html
async function startPairing() {
  const tenantId = getTenantIdFromURL();
  
  // Poll cada 3 segundos
  setInterval(async () => {
    const response = await fetch(`/api/whatsapp/qr/${tenantId}`);
    const data = await response.json();
    
    if (data.qrCode) {
      // Mostrar QR
      qrCodeImg.src = data.qrCode;
    } else {
      // Ya conectado
      window.location.href = '/dashboard.html';
    }
  }, 3000);
}
```

---

### 9. 🔄 MODIFICAR: `bot-logic.js`

**Cambios**: ✅ **NINGUNO** (o mínimos)

La lógica del bot es **independiente** del proveedor de WhatsApp.

Solo cambios menores en formato de números:
```javascript
// ANTES (Meta)
const telefono = from.replace('whatsapp:', '').replace(/\D/g, '');

// DESPUÉS (Baileys)
const telefono = from.replace('@s.whatsapp.net', '').replace(/\D/g, '');
```

---

## 📦 DEPENDENCIAS NECESARIAS

### Nuevas Dependencias

```json
{
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.0",  // Baileys actual
    "@hapi/boom": "^10.0.1",               // Error handling (requerido por Baileys)
    "pino": "^8.19.0",                     // Logger (requerido por Baileys)
    "qrcode": "^1.5.3",                    // Generar QR codes
    "qrcode-terminal": "^0.12.0"           // QR en terminal (dev)
  }
}
```

### Mantener
```json
{
  "dependencies": {
    "axios": "^1.6.2",           // Para Meta (si híbrido)
    "express": "^4.18.2",        // Backend
    "firebase-admin": "^12.0.0", // Database
    "dotenv": "^16.3.1"          // Env vars
  }
}
```

---

## 🔐 GESTIÓN DE SESIONES Y SEGURIDAD

### Estructura de Archivos (Baileys)

```
/auth_sessions/
  /tenant_123/
    creds.json          # Credenciales cifradas
    pre-key-1.json      # Keys de señal
    pre-key-2.json
    ...
```

**Recomendaciones:**
- ✅ Guardar en Firebase (no en disco)
- ✅ Cifrar con `encryption-service.js`
- ✅ Backup automático cada 24h
- ✅ Eliminar al desconectar

---

## 📊 PLAN DE MIGRACIÓN (4 FASES)

### **FASE 1: DESARROLLO PARALELO** (Semana 1)
🎯 **Objetivo**: Crear componentes de Baileys sin afectar sistema actual

**Tareas:**
- [ ] Crear `baileys-handler.js`
- [ ] Crear `session-manager.js`
- [ ] Crear `warmup-controller.js`
- [ ] Crear `human-simulator.js`
- [ ] Pruebas unitarias de cada módulo
- [ ] Documentación de APIs

**No Tocar:**
- ❌ `whatsapp-handler.js` (Meta)
- ❌ `index.js` (endpoints existentes)
- ❌ Sistema en producción

**Resultado Esperado:**
- ✅ Nuevos módulos funcionando en aislamiento
- ✅ 0% de riesgo para tenants existentes

---

### **FASE 2: INTEGRACIÓN HÍBRIDA** (Semana 2)
🎯 **Objetivo**: Permitir que ambos sistemas coexistan

**Tareas:**
- [ ] Modificar `tenant-service.js` para soportar `provider: 'baileys'`
- [ ] Crear wrapper en `whatsapp-handler.js` (routing por provider)
- [ ] Agregar endpoints de Baileys en `index.js`
- [ ] Crear `qr-pairing.html`
- [ ] Testing con 1 tenant de prueba

**Sistema en Producción:**
- ✅ Tenants con Meta siguen funcionando normal
- ✅ Nuevos tenants pueden usar Baileys
- ✅ Dashboard muestra el provider activo

**Resultado Esperado:**
- ✅ Sistema dual funcional
- ✅ Tenants existentes sin cambios
- ✅ Opción de migración gradual

---

### **FASE 3: PILOT CON CLIENTES REALES** (Semana 3-4)
🎯 **Objetivo**: Validar Baileys con tráfico real

**Plan:**
1. Seleccionar 3-5 restaurantes nuevos
2. Onboarding con Baileys + QR
3. Warmup progresivo (4 semanas)
4. Monitoreo intensivo:
   - Tasas de entrega
   - Tiempo de respuesta
   - Bans/warnings de WhatsApp
   - Satisfacción del cliente

**Métricas de Éxito:**
- ✅ 0 bans en las primeras 2 semanas
- ✅ 98%+ de mensajes entregados
- ✅ < 2 segundos de latencia promedio
- ✅ Satisfacción cliente >= 4.5/5

**Si falla:**
- Plan B: Revertir a Meta
- Análisis de causa
- Ajustes y re-intento

---

### **FASE 4: MIGRACIÓN MASIVA** (Mes 2+)
🎯 **Objetivo**: Migrar tenants existentes gradualmente

**Estrategia:**
1. **Semana 1-2**: Migrar 10% de tenants menos activos
2. **Semana 3-4**: Si exitoso, migrar 30% más
3. **Mes 2**: Migrar 50% restante
4. **Mes 3**: Deprecar Meta completamente

**Por cada tenant:**
```
1. Notificar al cliente (3 días antes)
2. Programar ventana de mantenimiento (5 min)
3. Desconectar Meta
4. Generar QR de Baileys
5. Cliente escanea
6. Iniciar warmup
7. Monitorear 48h
```

**Rollback Plan:**
- Mantener sesiones de Meta guardadas por 30 días
- Opción de volver en < 5 minutos

---

## ⚖️ COMPARACIÓN: META VS BAILEYS

| Aspecto | Meta WhatsApp API | Baileys |
|---------|-------------------|---------|
| **Setup** | Embedded Signup (frustrante) | QR Code (instantáneo) |
| **Costo** | Gratis hasta 1000 conv/mes | Gratis siempre |
| **Confiabilidad** | 99.9% uptime | 95% uptime (estimado) |
| **Límites** | Sin límites oficiales | Warmup + rate limits |
| **Riesgo de Ban** | 0% (oficial) | 5-10% (no oficial) |
| **Aprobación** | 1-7 días | Instantáneo |
| **Soporte** | Meta (malo) | Comunidad (bueno) |
| **Features** | Botones, plantillas, media | Texto, media básico |
| **Multi-tenant** | Nativo | Requiere gestión manual |
| **Escalabilidad** | Alta | Media |
| **Control** | Bajo (depende de Meta) | Alto (código propio) |

---

## 🚨 RIESGOS Y MITIGACIONES

### Riesgo 1: Ban de Cuentas
**Probabilidad**: Media (20-30%)  
**Impacto**: Alto (pérdida de clientes)

**Mitigaciones:**
- ✅ Warmup estricto de 4 semanas
- ✅ Delays humanizados (3-10 seg)
- ✅ Límite de mensajes por día
- ✅ Una instancia por tenant
- ✅ Números reales (no VOIPs)
- ✅ IPs residenciales o proxies
- ✅ Backup plan con Meta

**Plan B:**
- Mantener sistema Meta operativo
- Migración reversa en < 1 hora
- Números de respaldo listos

---

### Riesgo 2: Inestabilidad de Sesiones
**Probabilidad**: Media (30-40%)  
**Impacto**: Medio (downtime temporal)

**Mitigaciones:**
- ✅ Auto-reconexión con backoff exponencial
- ✅ Persistencia de sesiones en Firebase
- ✅ Monitoreo activo (alertas)
- ✅ Healthcheck cada 5 minutos
- ✅ Notificación al cliente si cae

**Código:**
```javascript
sock.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect } = update;
  
  if (connection === 'close') {
    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    
    if (shouldReconnect) {
      await sleep(5000); // Wait 5 seconds
      initConnection(tenantId); // Retry
    }
  }
});
```

---

### Riesgo 3: Performance Degradado
**Probabilidad**: Baja (10-20%)  
**Impacto**: Medio (latencia alta)

**Mitigaciones:**
- ✅ Servidor dedicado para Baileys
- ✅ Redis para caché de sesiones
- ✅ Load balancing si >50 tenants
- ✅ Optimización de queries Firebase

---

### Riesgo 4: Cambios en Protocolo WhatsApp
**Probabilidad**: Baja (5-10%)  
**Impacto**: Alto (sistema roto)

**Mitigaciones:**
- ✅ Baileys mantiene actualización activa
- ✅ Monitorear breaking changes en GitHub
- ✅ Testing pre-producción
- ✅ Sistema Meta como fallback

---

## 💰 ANÁLISIS DE COSTOS

### Costos Actuales (Meta API)

| Item | Costo Mensual |
|------|---------------|
| WhatsApp API | $0 (hasta 1000 conv) |
| Railway Backend | $5-20 |
| Firebase Hosting | $0 |
| Firebase DB | $0-25 |
| **Total** | **$5-45/mes** |

### Costos Proyectados (Baileys)

| Item | Costo Mensual |
|------|---------------|
| WhatsApp (Baileys) | $0 |
| Railway Backend | $10-40 (más recursos) |
| Firebase Hosting | $0 |
| Firebase DB | $25-50 (más sesiones) |
| Proxies (opcional) | $0-30 |
| **Total** | **$35-120/mes** |

**Ahorro vs. Meta Pagado:**
- Si > 1000 conversaciones/mes con Meta: **$200-500/mes** de ahorro
- Si < 1000 conversaciones/mes con Meta: **$30-75/mes** más caro

---

## 📈 MÉTRICAS DE ÉXITO

### KPIs Técnicos

| Métrica | Meta Actual | Target Baileys |
|---------|-------------|----------------|
| Uptime | 99.9% | 98.0% |
| Latencia | < 500ms | < 2s |
| Tasa de entrega | 99.5% | 98.0% |
| Reconexiones/día | 0 | < 5 |

### KPIs de Negocio

| Métrica | Meta Actual | Target Baileys |
|---------|-------------|----------------|
| Onboarding time | 1-7 días | < 5 min |
| Bans/mes | 0 | < 1% tenants |
| Costo/tenant/mes | $5-45 | $1-10 |
| Satisfacción | N/A | >= 4/5 |

---

## 🎯 RECOMENDACIÓN FINAL

### **Opción A: MIGRACIÓN COMPLETA A BAILEYS** 🟡
**Cuándo**: Si tienes >50 tenants o >$200/mes en costos Meta

**Pros:**
- ✅ Control total
- ✅ Sin dependencia de Meta
- ✅ Costos predecibles
- ✅ Onboarding instantáneo

**Contras:**
- ❌ Riesgo de bans
- ❌ Más mantenimiento
- ❌ Menos features

**Riesgo**: 🟡 Medio-Alto

---

### **Opción B: SISTEMA HÍBRIDO** 🟢 (RECOMENDADO)
**Cuándo**: Para transición gradual y minimizar riesgo

**Pros:**
- ✅ Nuevos tenants con Baileys
- ✅ Tenants existentes con Meta
- ✅ Migración gradual
- ✅ Rollback fácil
- ✅ Bajo riesgo

**Contras:**
- ⚠️ Doble complejidad
- ⚠️ Más código a mantener

**Riesgo**: 🟢 Bajo

---

### **Opción C: MANTENER META Y ESPERAR** 🔵
**Cuándo**: Si Meta aprueba el portfolio en < 7 días

**Pros:**
- ✅ 0 riesgo técnico
- ✅ Sistema probado
- ✅ Features completas

**Contras:**
- ❌ Dependencia de Meta
- ❌ Aprobaciones lentas
- ❌ Costos altos a escala

**Riesgo**: 🟢 Bajo

---

## 📅 CRONOGRAMA PROPUESTO

### Si eliges **Opción B (Híbrido)**:

| Semana | Tareas | Horas | Riesgo |
|--------|--------|-------|--------|
| **1** | Desarrollo de módulos Baileys | 40h | Bajo |
| **2** | Integración híbrida + testing | 30h | Bajo |
| **3-4** | Pilot con 3-5 clientes | 20h | Medio |
| **5-8** | Migración gradual (opcional) | 40h | Medio |
| **Total** | | **130h** | |

**Tiempo hasta producción**: 2-3 semanas  
**Tiempo hasta migración completa**: 2-3 meses

---

## ✅ PRÓXIMOS PASOS (NO IMPLEMENTAR AÚN)

### **Paso 1: Decisión Estratégica**
- [ ] Revisar esta propuesta con el equipo
- [ ] Decidir entre Opción A, B o C
- [ ] Aprobar presupuesto de tiempo/recursos

### **Paso 2: Setup Inicial** (Si apruebas)
- [ ] Crear branch `feature/baileys-integration`
- [ ] Instalar dependencias
- [ ] Crear estructura de carpetas

### **Paso 3: Desarrollo Fase 1**
- [ ] Implementar `baileys-handler.js`
- [ ] Implementar `session-manager.js`
- [ ] Testing local

### **Paso 4: Pilot**
- [ ] Crear tenant de prueba
- [ ] Generar QR
- [ ] Validar mensajería
- [ ] Monitorear por 1 semana

---

## 📚 RECURSOS Y REFERENCIAS

### Documentación
- [Baileys GitHub](https://github.com/WhiskeySockets/Baileys)
- [Baileys Documentation](https://whiskeysockets.github.io/)
- [WhatsApp Multi-Device](https://github.com/WhiskeySockets/Baileys/blob/master/docs/guide.md)

### Ejemplos de Código
- [Baileys Examples](https://github.com/WhiskeySockets/Baileys/tree/master/Example)
- [Session Management](https://github.com/WhiskeySockets/Baileys/blob/master/Example/example.ts)

### Comunidad
- [WhatsApp Web.js Community](https://wwebjs.dev/)
- [Baileys Issues](https://github.com/WhiskeySockets/Baileys/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/baileys)

---

## 🤔 PREGUNTAS FRECUENTES

### Q: ¿Puedo tener Meta y Baileys al mismo tiempo?
**A:** ✅ Sí, con la Opción B (Híbrido). Cada tenant usa uno u otro.

### Q: ¿Qué pasa si me banean?
**A:** Pierdes ese número. Por eso:
1. Warmup estricto
2. Números de backup
3. Migración reversa a Meta si necesario

### Q: ¿Baileys soporta botones/plantillas?
**A:** ⚠️ Parcial. Texto e imágenes sí, botones interactivos limitados. Templates no.

### Q: ¿Cuántos tenants soporta Baileys?
**A:** ~50-100 por servidor (1 GB RAM). Para más, usar múltiples servidores.

### Q: ¿Es legal usar Baileys?
**A:** 🟡 Técnicamente viola ToS de WhatsApp, pero si solo respondes (no spam), el riesgo es bajo.

---

**FIN DE LA PROPUESTA**

¿Quieres que proceda con la implementación de alguna fase específica?
