# 🔧 Backend del Sistema de Túnel - Completado

## 📋 Implementación Completada

### ✅ Módulo: `tunnel-manager.js`

Gestor central del sistema de túnel que maneja todas las conexiones WebSocket desde los navegadores de los restaurantes.

#### **Características Principales**

1. **Gestión de Túneles**
   - Registro/desregistro automático
   - Mapeo túnel ↔ tenant
   - Reemplazo de túneles (si hay reconexión)
   - Estadísticas por túnel y globales

2. **Sistema de Requests Proxy**
   - Enviar requests HTTP a través del navegador
   - Manejo de respuestas asíncronas
   - Timeout configurable (30s)
   - Cola de requests pendientes

3. **Heartbeat & Health Check**
   - Ping cada 30 segundos
   - Detección de túneles no saludables
   - Reconexión automática

4. **Eventos**
   - `tunnel:connected` - Nuevo túnel establecido
   - `tunnel:disconnected` - Túnel perdido
   - `tunnel:unhealthy` - Túnel no responde

---

### ✅ Endpoint WebSocket: `/tunnel`

Implementado en `server/index.js` usando el módulo nativo `ws`.

#### **Conexión**
```javascript
// Desde el navegador
ws://api.kdsapp.site/tunnel?tenantId=tenant_123
```

#### **Mensajes Soportados**

**Del Navegador → Servidor:**
- `tunnel.init` - Inicialización del túnel
- `ping` - Mantener conexión viva
- `pong` - Respuesta a ping del servidor
- `proxy.response` - Respuesta de HTTP request
- `proxy.error` - Error en HTTP request

**Del Servidor → Navegador:**
- `ping` - Verificar conexión
- `pong` - Respuesta a ping
- `proxy.request` - Solicitud de HTTP request

---

### ✅ Rutas API REST

#### **1. Estado del Túnel**
```http
GET /api/tunnel/status/:tenantId
```

**Respuesta:**
```json
{
  "success": true,
  "hasTunnel": true,
  "tunnel": {
    "tenantId": "tenant_123",
    "deviceInfo": {
      "userAgent": "Mozilla/5.0...",
      "page": "/kds.html"
    },
    "connectedAt": 1234567890,
    "uptime": 45000,
    "stats": {
      "requestsSent": 10,
      "requestsSuccess": 8,
      "requestsFailed": 2,
      "bytesProxied": 5120
    },
    "isHealthy": true
  }
}
```

#### **2. Notificar Desconexión**
```http
POST /api/tunnel/disconnected
Content-Type: application/json

{
  "tenantId": "tenant_123",
  "timestamp": 1234567890,
  "reason": "connection_closed"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Desconexión registrada",
  "fallbackActive": true
}
```

#### **3. Estadísticas del Túnel**
```http
GET /api/tunnel/stats
```

**Respuesta:**
```json
{
  "success": true,
  "stats": {
    "totalConnections": 150,
    "activeConnections": 12,
    "requestsSent": 1234,
    "requestsSuccess": 1100,
    "requestsFailed": 134,
    "bytesProxied": 2048000,
    "activeTunnels": 12,
    "pendingRequests": 3,
    "tunnels": [
      {
        "tenantId": "tenant_123",
        "uptime": 45000,
        "stats": { ... },
        "isHealthy": true
      }
    ]
  }
}
```

---

## 🔌 Integración con Baileys

### **Paso 1: Detectar Túnel Disponible**

```javascript
// En session-manager.js o connection-manager.js

const tunnelManager = require('../tunnel-manager');

async function createConnection(tenantId) {
  // Verificar si hay túnel activo
  const hasTunnel = tunnelManager.hasTunnel(tenantId);
  
  if (hasTunnel) {
    console.log(`✅ Usando túnel para ${tenantId}`);
    // Usar túnel como proxy
    return createConnectionWithTunnel(tenantId);
  } else {
    console.log(`⚠️ Sin túnel, usando Railway para ${tenantId}`);
    // Usar IP de Railway directamente
    return createConnectionDirect(tenantId);
  }
}
```

### **Paso 2: Proxy Requests a Través del Túnel**

```javascript
async function createConnectionWithTunnel(tenantId) {
  // Configurar Baileys para usar túnel como proxy
  const socket = makeWASocket({
    auth: state,
    // IMPORTANTE: No configurar fetchAgent aquí
    // Los requests se interceptan y envían por túnel
  });
  
  // Interceptar requests de Baileys
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    try {
      // Enviar request a través del túnel
      const response = await tunnelManager.proxyRequest(tenantId, {
        url: url.toString(),
        method: options?.method || 'GET',
        headers: options?.headers,
        body: options?.body
      });
      
      // Convertir respuesta a formato de fetch
      return {
        status: response.status,
        headers: new Headers(response.headers),
        text: () => Promise.resolve(response.body),
        json: () => Promise.resolve(JSON.parse(response.body))
      };
    } catch (error) {
      console.error('❌ Error en proxy request:', error);
      // Fallback a fetch original (Railway)
      return originalFetch(url, options);
    }
  };
  
  return socket;
}
```

### **Paso 3: Fallback Automático**

```javascript
// Escuchar eventos de desconexión
tunnelManager.on('tunnel:disconnected', ({ tenantId, reason }) => {
  console.log(`⚠️ Túnel perdido para ${tenantId}: ${reason}`);
  console.log(`🔄 Fallback a Railway - Sesión persiste`);
  
  // NO hacer nada con la conexión de Baileys
  // Los requests automáticamente usarán Railway
  // La sesión WhatsApp NO se desconecta
});

// Escuchar reconexiones
tunnelManager.on('tunnel:connected', ({ tenantId }) => {
  console.log(`✅ Túnel restaurado para ${tenantId}`);
  console.log(`🔧 Requests ahora usan túnel nuevamente`);
  
  // Los requests automáticamente vuelven a usar túnel
});
```

---

## 🏗️ Arquitectura Completa

```
┌──────────────────────────────────────────────────────────┐
│              NAVEGADOR DEL RESTAURANTE                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────┐         │
│  │  Service Worker (sw-tunnel.js)             │         │
│  │  • Registra túnel al cargar                │         │
│  │  • Envía device info                       │         │
│  │  • Mantiene conexión con heartbeat         │         │
│  │  • Ejecuta HTTP requests desde navegador   │         │
│  └────────────────┬───────────────────────────┘         │
│                   │                                       │
└───────────────────┼───────────────────────────────────────┘
                    │ WebSocket
                    │ wss://api.kdsapp.site/tunnel
                    │
┌───────────────────▼───────────────────────────────────────┐
│               RAILWAY BACKEND                             │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────┐         │
│  │  WebSocket Server (/tunnel)                │         │
│  │  • Acepta conexiones con tenantId          │         │
│  │  • Maneja mensajes ping/pong               │         │
│  │  • Retransmite requests/responses          │         │
│  └────────────────┬───────────────────────────┘         │
│                   │                                       │
│  ┌────────────────▼───────────────────────────┐         │
│  │  Tunnel Manager (tunnel-manager.js)        │         │
│  │  • Registra túneles activos                │         │
│  │  • Gestiona requests pendientes            │         │
│  │  • Heartbeat & health check                │         │
│  │  • Estadísticas                            │         │
│  │  • Eventos (connected/disconnected)        │         │
│  └────────────────┬───────────────────────────┘         │
│                   │                                       │
│  ┌────────────────▼───────────────────────────┐         │
│  │  Session Manager (session-manager.js)      │         │
│  │  • Detecta túnel disponible                │         │
│  │  • Configura Baileys con/sin túnel         │         │
│  │  • Intercepta HTTP requests                │         │
│  │  • Fallback automático a Railway           │         │
│  └────────────────┬───────────────────────────┘         │
│                   │                                       │
│  ┌────────────────▼───────────────────────────┐         │
│  │  Baileys (WhatsApp Connection)             │         │
│  │  • Requests HTTP usan túnel si disponible  │         │
│  │  • Fallback a Railway si túnel falla       │         │
│  │  • Sesión persiste durante cambios         │         │
│  └────────────────────────────────────────────┘         │
│                                                           │
└───────────────────────────────────────────────────────────┘
                    │
                    │ WhatsApp Servers
                    │ ven IP del navegador
                    ▼
         🟢 WhatsApp Web API
```

---

## 📊 Flujo de Datos

### **Escenario 1: Túnel Activo**

```
1. Baileys necesita hacer request a WhatsApp
   ↓
2. Request interceptado por Session Manager
   ↓
3. Session Manager envía a Tunnel Manager
   ↓
4. Tunnel Manager envía por WebSocket al navegador
   ↓
5. Service Worker ejecuta request desde navegador
   ↓
6. Respuesta vuelve por WebSocket
   ↓
7. Tunnel Manager retorna a Session Manager
   ↓
8. Baileys recibe respuesta
```

**Resultado:** WhatsApp ve IP del restaurante ✅

---

### **Escenario 2: Túnel Desconectado**

```
1. Baileys necesita hacer request a WhatsApp
   ↓
2. Request interceptado por Session Manager
   ↓
3. Session Manager detecta que túnel no está disponible
   ↓
4. Request se hace directamente desde Railway
   ↓
5. Baileys recibe respuesta
```

**Resultado:** WhatsApp ve IP de Railway ⚠️  
**Sesión:** Persiste sin desconectarse ✅

---

### **Escenario 3: Reconexión de Túnel**

```
1. Service Worker detecta que está activo
   ↓
2. Se registra en /tunnel con tenantId
   ↓
3. Tunnel Manager registra túnel
   ↓
4. Emite evento 'tunnel:connected'
   ↓
5. Session Manager recibe evento
   ↓
6. Próximos requests usan túnel automáticamente
```

**Resultado:** Túnel restaurado, vuelve a usar IP del restaurante ✅

---

## ✅ Características Implementadas

### **Backend**
- [x] `tunnel-manager.js` completo
- [x] WebSocket endpoint `/tunnel`
- [x] API REST para gestión
- [x] Sistema de heartbeat
- [x] Manejo de requests proxy
- [x] Estadísticas detalladas
- [x] Eventos de conexión/desconexión
- [x] Cleanup en shutdown

### **Integración**
- [x] Cargado en `server/index.js`
- [x] WebSocket Server configurado
- [x] Rutas API registradas
- [x] Mensajes de inicio actualizados
- [x] Cleanup en signals (SIGTERM/SIGINT)

### **Pendiente (Siguiente Paso)**
- [ ] Modificar `session-manager.js` para usar túnel
- [ ] Interceptar requests de Baileys
- [ ] Implementar fallback automático
- [ ] Testing en producción

---

## 🚀 Próximos Pasos

### **1. Integración con Baileys** 🎯 SIGUIENTE
```
Archivo: server/baileys/session-manager.js

Cambios necesarios:
1. Importar tunnelManager
2. Detectar túnel disponible
3. Interceptar fetch/requests
4. Implementar fallback
5. Escuchar eventos
```

### **2. Testing Local**
```bash
# Terminal 1: Iniciar servidor
npm start

# Terminal 2: Verificar WebSocket
wscat -c "ws://localhost:3000/tunnel?tenantId=test_123"

# Terminal 3: Probar API
curl http://localhost:3000/api/tunnel/stats
```

### **3. Testing en Producción**
```
1. Deploy a Railway
2. Abrir KDS en navegador real
3. Verificar túnel conectado
4. Conectar WhatsApp
5. Enviar mensajes de prueba
6. Monitorear logs
```

---

## 📝 Notas Importantes

### **Seguridad**
- ✅ Requiere tenantId para conectar
- ✅ WebSocket con validación
- ✅ Timeout en requests (30s)
- ✅ Límite de requests pendientes

### **Performance**
- ✅ Heartbeat optimizado (30s)
- ✅ Mapas para búsqueda O(1)
- ✅ Cleanup automático
- ✅ Estadísticas eficientes

### **Confiabilidad**
- ✅ Manejo de errores robusto
- ✅ Fallback automático
- ✅ Sesión persiste
- ✅ Logs estructurados

---

## 📦 Dependencias Agregadas

```json
{
  "uuid": "^9.0.1",  // Para request IDs únicos
  "ws": "^8.16.0"    // WebSocket Server nativo
}
```

Instaladas con:
```bash
npm install uuid ws
```

---

## 🎉 Estado del Proyecto

```
┌────────────────────────────────────────┐
│          SISTEMA ANTI-BAN              │
├────────────────────────────────────────┤
│ ✅ Frontend (Túnel)      │ 100% ████████│
│ ✅ Backend (Túnel)       │ 100% ████████│
│ ⏳ Integración Baileys   │   0%         │
│ ⏳ Testing Producción    │   0%         │
├────────────────────────────────────────┤
│ TOTAL                    │  50% ████    │
└────────────────────────────────────────┘
```

**Backend del túnel completado y listo para integrar con Baileys! 🚀**
