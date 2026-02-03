# 🛡️ Sistema Anti-Ban Multi-Capa

## 📋 Resumen

Este documento describe todas las capas de protección implementadas en el sistema para evitar baneos de WhatsApp.

---

## 🔐 Capa 1: IPs Únicas por Tenant (Proxies Rotativos)

### ✅ Implementado

Cada restaurante se conecta a WhatsApp desde una IP única mediante proxies rotativos.

**Archivos:**
- `server/baileys/proxy-manager.js` - Gestión de proxies
- `server/baileys/session-manager.js` - Integración con Baileys

**Configuración:**
Ver `PROXY-SETUP-GUIDE.md` para instrucciones detalladas.

**Verificación:**
```bash
curl https://tu-app.railway.app/api/proxy/stats
```

---

## ⏱️ Capa 2: Rate Limiting y Humanización

### ✅ Implementado Parcialmente

**Implementado:**
- Delays aleatorios entre mensajes (2-5 segundos)
- Sistema de "typing" para simular escritura

**Ubicación:**
- `server/baileys/anti-ban.js` - Servicio de humanización
- `server/baileys/message-adapter.js` - Delays en envío

### ⚠️ Pendiente de Mejorar:

#### **A. Delays más agresivos**

**Actual:**
```javascript
const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seg
```

**Recomendado:**
```javascript
const baseDelay = Math.floor(Math.random() * 2000) + 3000; // 3-5 seg
const extraDelay = messageLength > 100 ? 2000 : 0; // +2 seg si mensaje largo
const totalDelay = baseDelay + extraDelay; // 3-7 seg
```

#### **B. Límite de mensajes por hora**

**Pendiente:**
```javascript
// En bot-logic.js, antes de procesar mensaje
const messagesInLastHour = await getMessageCount(tenantId, Date.now() - 3600000);
if (messagesInLastHour > 50) {
  logger.warn(`[${tenantId}] Límite de mensajes alcanzado, pausando...`);
  return null; // No responder
}
```

#### **C. Variación de timing según contexto**

**Pendiente:**
```javascript
// Mensaje simple: 2-3 seg
// Confirmación de pedido: 5-8 seg
// Mensaje con cálculos: 8-12 seg
```

---

## 🕐 Capa 3: Horarios de Actividad Humanos

### ❌ No Implementado

**Objetivo:** Pausar bot fuera de horarios laborales del restaurante.

**Implementación sugerida:**

```javascript
// En bot-logic.js, dentro de processMessage()

// Obtener horario del restaurante
const config = await firebaseService.database
  .ref(`tenants/${tenantId}/config/businessHours`)
  .once('value');

const businessHours = config.val() || {
  enabled: false,
  start: '08:00',
  end: '23:00',
  timezone: 'America/Bogota'
};

if (businessHours.enabled) {
  const now = new Date();
  const hour = now.getHours();
  const [startHour] = businessHours.start.split(':').map(Number);
  const [endHour] = businessHours.end.split(':').map(Number);
  
  if (hour < startHour || hour >= endHour) {
    logger.info(`[${tenantId}] Fuera de horario laboral, no responder`);
    return null;
  }
}
```

**Ubicación recomendada:**
- `server/bot-logic.js` línea ~980 (después de validar membresía)

---

## 🔄 Capa 4: Delay de Reconexión Gradual

### ❌ No Implementado

**Problema actual:** Si hay desconexión, el bot reconecta inmediatamente.

**Ubicación:** `server/baileys/session-manager.js` línea ~180

**Actual:**
```javascript
if (shouldReconnect) {
  setTimeout(() => {
    this.initSession(tenantId);
  }, 3000); // Solo 3 segundos
}
```

**Recomendado:**
```javascript
// Contador de reconexiones en los últimos 10 minutos
if (!this.reconnectAttempts) this.reconnectAttempts = new Map();

const attempts = this.reconnectAttempts.get(tenantId) || 0;
this.reconnectAttempts.set(tenantId, attempts + 1);

// Delay exponencial: 5seg, 30seg, 2min, 5min, 10min
const delays = [5000, 30000, 120000, 300000, 600000];
const delay = delays[Math.min(attempts, delays.length - 1)];

logger.warn(`[${tenantId}] Reconexión #${attempts + 1} en ${delay/1000}seg`);

if (shouldReconnect) {
  setTimeout(() => {
    this.initSession(tenantId);
  }, delay);
}

// Resetear contador después de 10 minutos
setTimeout(() => {
  this.reconnectAttempts.set(tenantId, 0);
}, 600000);
```

---

## 🚦 Capa 5: Warm-up para Números Nuevos

### ✅ Implementado (Básico)

**Ubicación:** `server/baileys/anti-ban.js`

**Implementado:**
- Detección de número nuevo vs existente
- Rate limits más estrictos para números nuevos

**Mejoras pendientes:**

```javascript
// Progresivo en 7 días
const daysActive = getDaysSinceFirstConnection(tenantId);

if (daysActive < 7) {
  const maxMessagesPerDay = [20, 40, 60, 80, 100, 120, 150][daysActive];
  logger.info(`[${tenantId}] Día ${daysActive} - Límite: ${maxMessagesPerDay} msg/día`);
  
  // Aplicar límite más estricto
  if (messagesToday >= maxMessagesPerDay) {
    return null; // No responder más hoy
  }
}
```

---

## 📊 Capa 6: Monitoring y Alertas

### ❌ No Implementado

**Objetivo:** Detectar señales tempranas de posible ban.

**Señales a monitorear:**
- Mensajes que fallan al enviar consecutivamente
- Desconexiones frecuentes (>3 por hora)
- Códigos de error específicos de WhatsApp
- Latencia alta en respuestas

**Implementación sugerida:**

```javascript
// En baileys/session-manager.js

async handleConnectionUpdate(tenantId, update) {
  const { connection, lastDisconnect } = update;
  
  if (connection === 'close') {
    const { DisconnectReason } = await loadBaileys();
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    
    // Códigos de error críticos
    const BANNED_CODES = [401, 403, 428];
    const RATE_LIMIT_CODES = [429, 503];
    
    if (BANNED_CODES.includes(statusCode)) {
      logger.error(`[${tenantId}] 🚨 POSIBLE BAN - Código: ${statusCode}`);
      await notificationService.alertBan(tenantId, statusCode);
      // NO reconectar
      return;
    }
    
    if (RATE_LIMIT_CODES.includes(statusCode)) {
      logger.warn(`[${tenantId}] ⚠️ Rate limit detectado`);
      // Esperar más tiempo antes de reconectar
      const delay = 300000; // 5 minutos
      setTimeout(() => this.initSession(tenantId), delay);
      return;
    }
  }
}
```

---

## 🎯 Capa 7: Límite de Sesiones Simultáneas

### ✅ Implementado

WhatsApp permite máximo 5 dispositivos por número.

**Verificación:** El sistema usa credenciales únicas por tenant, evitando duplicados.

**Ubicación:** `server/baileys/storage.js` - Gestión de sesiones

---

## 📈 Prioridad de Implementación

### 🔴 **CRÍTICO (Hacer Ya):**

1. ✅ ~~Proxies rotativos (IPs únicas)~~ - **IMPLEMENTADO**
2. ⚠️ Rate limiting más agresivo (5-8 seg entre mensajes)
3. ⚠️ Delay de reconexión exponencial

### 🟡 **IMPORTANTE (Hacer Esta Semana):**

4. Horarios de actividad humanos
5. Monitoring de señales de ban
6. Límite de mensajes por hora

### 🟢 **MEJORAS (Hacer Este Mes):**

7. Warm-up progresivo mejorado
8. Variación de timing según contexto
9. Dashboard de métricas anti-ban

---

## 🧪 Testing

### Verificar que todo funciona:

```bash
# 1. Proxies activos
curl https://tu-app.railway.app/api/proxy/stats

# 2. Ver logs en tiempo real
railway logs --follow

# Buscar estos mensajes:
# ✅ "[tenantId] 🔐 Usando proxy para conexión"
# ✅ "[tenantId] Delay de 4.2 segundos antes de responder"
# ⚠️ "[tenantId] Límite de mensajes alcanzado"
```

### Simular carga:

```bash
# Enviar 10 mensajes seguidos desde WhatsApp
# Verificar que:
# 1. Cada respuesta tiene delay diferente (2-8 seg)
# 2. No hay errors en logs
# 3. Mensajes se entregan correctamente
```

---

## 📞 ¿Qué hacer si hay un ban?

### Pasos inmediatos:

1. **NO reconectar el número inmediatamente**
2. Esperar 24-48 horas
3. Verificar si fue ban temporal o permanente
4. Si fue temporal, revisar logs para identificar causa
5. Implementar capa adicional de protección antes de reconectar

### Diagnóstico:

```bash
# Ver logs del tenant afectado
railway logs | grep "[tenantId]" | tail -100

# Buscar:
# - Mensajes muy frecuentes (< 2 seg entre ellos)
# - Desconexiones repetidas
# - Códigos de error 401, 403, 428
```

---

## 📚 Referencias

- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)
- [Baileys Anti-Ban Best Practices](https://github.com/WhiskeySockets/Baileys/blob/master/docs/BEST-PRACTICES.md)
- Documentación de proveedores de proxies (ver PROXY-SETUP-GUIDE.md)

---

**Última actualización:** 3 de febrero de 2026
**Próxima revisión:** Implementar capas 2-6
