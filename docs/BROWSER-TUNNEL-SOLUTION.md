# 🌐 Solución: Túnel de Navegador (Browser Tunnel)

## 🎯 **Concepto**

Usar el **navegador del usuario como proxy transparente** para que WhatsApp vea la IP del restaurante, sin necesidad de instalar apps o programas.

---

## ✅ **Ventajas**

| Característica | Valor |
|----------------|-------|
| **Instalación** | ❌ CERO - Solo abrir URL |
| **Descargas** | ❌ CERO - Todo en navegador |
| **Costo** | $0/mes |
| **IP única** | ✅ Sí - IP del restaurante |
| **Cross-platform** | ✅ Windows/Mac/Android/iOS |
| **Mantenimiento** | ✅ Automático |
| **Anti-ban** | ✅ IP real del negocio |

---

## 🏗️ **Arquitectura**

```
┌───────────────────────────────────────────────┐
│  RESTAURANTE (Tablet en cocina)               │
│                                               │
│  Navegador: https://kdsapp.site/kds.html     │
│  ┌─────────────────────────────────┐         │
│  │  Service Worker (sw-tunnel.js)  │         │
│  │  ├─ WebSocket a Railway          │         │
│  │  ├─ Túnel transparente            │         │
│  │  └─ IP saliente: 123.45.67.89   │         │
│  └─────────────────────────────────┘         │
└───────────────┼───────────────────────────────┘
                │
                │ WebSocket Tunnel
                │
                ▼
┌───────────────────────────────────────────────┐
│  RAILWAY (Servidor Central)                   │
│                                               │
│  ┌─────────────────────────────────┐         │
│  │  Tunnel Manager Service          │         │
│  │  ├─ Recibe túnel del navegador   │         │
│  │  ├─ Redirige a Baileys           │         │
│  │  └─ Baileys → WhatsApp           │         │
│  └─────────────────────────────────┘         │
└───────────────┼───────────────────────────────┘
                │
                ▼
           WhatsApp Web
       (Ve IP: 123.45.67.89)
       ✅ IP del restaurante
```

---

## 🔧 **Componentes**

### **1. Service Worker (`sw-tunnel.js`)**

**Ubicación:** `/sw-tunnel.js` (raíz del proyecto)

**Función:**
- Se instala automáticamente al abrir cualquier página
- Crea túnel WebSocket con Railway
- Intercepta peticiones a WhatsApp
- Las ejecuta desde el navegador (IP del restaurante)
- Devuelve respuestas a Railway

**Características:**
- ✅ Se instala solo (sin interacción del usuario)
- ✅ Persiste entre recargas
- ✅ Funciona en background
- ✅ Auto-reconexión si se cae

---

### **2. Registro (`tunnel-worker-register.js`)**

**Ubicación:** `/js/tunnel-worker-register.js`

**Función:**
- Registra el Service Worker al cargar página
- Muestra indicador visual del estado del túnel
- Maneja actualizaciones automáticas
- Comunica tenant ID al Service Worker

**Indicadores visuales:**
```
🌐 Túnel Activo    → Todo funcionando ✅
⏳ Activando túnel → Esperando conexión
❌ Error en túnel  → Requiere recarga
```

---

### **3. Tunnel Manager (Railway)**

**Ubicación:** `/server/tunnel-manager.js` (NUEVO - por crear)

**Función:**
- Recibe conexiones WebSocket de navegadores
- Mantiene registro de túneles activos por tenant
- Redirige tráfico de Baileys a través del túnel correcto
- Maneja reconexiones automáticas

**Endpoints:**
```javascript
// WebSocket endpoint
wss://api.kdsapp.site/tunnel

// Mensajes:
{
  type: 'tunnel.init',      // Navegador se conecta
  type: 'proxy.request',    // Railway solicita hacer petición
  type: 'proxy.response',   // Navegador devuelve respuesta
  type: 'ping'              // Keep-alive
}
```

---

## 📋 **Flujo completo**

### **Paso 1: Usuario abre KDS**

```javascript
// Usuario navega a: https://kdsapp.site/kds.html
// → Se carga tunnel-worker-register.js
// → Registra sw-tunnel.js automáticamente
```

### **Paso 2: Service Worker se activa**

```javascript
// sw-tunnel.js se instala
// → Crea WebSocket: wss://api.kdsapp.site/tunnel
// → Envía tenant ID
// → Railway registra túnel: tenant123 → ws_connection_1
```

### **Paso 3: Baileys necesita conectar WhatsApp**

```javascript
// Railway (Baileys) necesita hacer petición a WhatsApp
// → Busca túnel del tenant: getTunnel('tenant123')
// → Envía petición a través del WebSocket del navegador
```

### **Paso 4: Navegador ejecuta petición**

```javascript
// Service Worker recibe: { type: 'proxy.request', url: 'https://web.whatsapp.com/...' }
// → Ejecuta fetch() desde el navegador (IP del restaurante)
// → Obtiene respuesta
// → Envía de vuelta: { type: 'proxy.response', body: ... }
```

### **Paso 5: Baileys recibe respuesta**

```javascript
// Railway recibe respuesta del túnel
// → Baileys procesa respuesta
// → WhatsApp ve IP: 123.45.67.89 (del restaurante) ✅
```

---

## 🚀 **Implementación**

### **Fase 1: Archivos del navegador (✅ HECHO)**

- ✅ `sw-tunnel.js` - Service Worker
- ✅ `js/tunnel-worker-register.js` - Registro automático

### **Fase 2: Servidor (Railway) - POR HACER**

**Crear:** `/server/tunnel-manager.js`

```javascript
// Gestor de túneles activos
class TunnelManager {
  constructor() {
    this.tunnels = new Map(); // tenantId -> WebSocket
  }

  registerTunnel(tenantId, ws) {
    this.tunnels.set(tenantId, ws);
  }

  async proxyRequest(tenantId, url, options) {
    const tunnel = this.tunnels.get(tenantId);
    if (!tunnel) throw new Error('No tunnel available');

    // Enviar petición al navegador
    const requestId = generateId();
    tunnel.send(JSON.stringify({
      type: 'proxy.request',
      requestId,
      url,
      method: options.method,
      headers: options.headers,
      body: options.body
    }));

    // Esperar respuesta
    return new Promise((resolve, reject) => {
      // ... manejar respuesta
    });
  }
}
```

### **Fase 3: Integrar con Baileys**

**Modificar:** `/server/baileys/session-manager.js`

```javascript
// En lugar de usar HttpsProxyAgent, usar TunnelManager
const tunnelManager = require('../tunnel-manager');

// Al crear socket de Baileys
const socket = makeWASocket({
  auth: state,
  fetchAgent: {
    fetch: async (url, options) => {
      // Usar túnel del navegador
      return tunnelManager.proxyRequest(tenantId, url, options);
    }
  }
});
```

---

## 🧪 **Testing**

### **Test 1: Verificar Service Worker**

```bash
# Abrir consola del navegador (F12)
# Ir a Application → Service Workers
# Debería aparecer: sw-tunnel.js (activated and is running)
```

### **Test 2: Verificar túnel WebSocket**

```bash
# En consola del navegador
# Network → WS → Verificar conexión a wss://api.kdsapp.site/tunnel
```

### **Test 3: Verificar IP**

```bash
# Desde navegador del restaurante, ir a:
https://api.ipify.org/?format=json

# Anotar IP: 123.45.67.89
# Verificar que Baileys usa esa IP para conectar WhatsApp
```

---

## ⚠️ **Limitaciones y soluciones**

### **Limitación 1: Navegador debe estar abierto**

**Problema:** Si cierran el KDS, el túnel se cae.

**Solución A: PWA (Progressive Web App)**
- Convertir KDS en PWA
- Se instala como "app" en el dispositivo
- Funciona en background

**Solución B: Pestaña keep-alive**
- Abrir pestaña oculta que mantiene túnel
- Se abre automáticamente al cargar KDS
- Usuario no la ve pero túnel se mantiene

---

### **Limitación 2: Service Workers requieren HTTPS**

**Estado:** ✅ Ya resuelto (kdsapp.site tiene SSL)

---

### **Limitación 3: Algunos navegadores móviles matan Service Workers**

**Solución:** Usar "lock de wake" para mantener activo:

```javascript
// En Service Worker
let wakeLock = null;

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    console.log('🔒 Wake lock activo - Túnel protegido');
  } catch (err) {
    console.warn('⚠️ Wake lock no disponible');
  }
}
```

---

## 📊 **Comparación de soluciones**

| Solución | Instalación | IP Restaurante | Costo/mes | Complejidad |
|----------|-------------|----------------|-----------|-------------|
| **Proxy (Bright Data)** | ❌ No | ❌ No (IP proxy) | $0.21-0.42 | 🟢 Baja |
| **Agente local** | ✅ Sí (app/Docker) | ✅ Sí | $0 | 🟡 Media |
| **Browser Tunnel** ⭐ | ❌ No | ✅ Sí | $0 | 🟡 Media |
| **Raspberry Pi** | ✅ Sí (hardware) | ✅ Sí | $0 | 🟡 Media |

---

## 🎯 **Recomendación**

**Browser Tunnel es la mejor solución porque:**
- ✅ Sin instalación (requisito del usuario)
- ✅ IP del restaurante (anti-ban)
- ✅ $0 costo operativo
- ✅ Funciona en cualquier dispositivo
- ✅ Transparente para el usuario

---

## 📝 **Próximos pasos**

1. ✅ Crear Service Worker → **HECHO**
2. ✅ Crear registro automático → **HECHO**
3. ⏳ Crear Tunnel Manager en Railway → **POR HACER** (2 horas)
4. ⏳ Integrar con Baileys → **POR HACER** (1 hora)
5. ⏳ Testing con restaurante real → **POR HACER** (1 día)

---

## 🚀 **¿Listo para implementar?**

**Siguiente paso:** Crear `tunnel-manager.js` en Railway.

**Tiempo estimado:** 3-4 horas para implementación completa.

**Resultado:** WhatsApp verá IP del restaurante sin que el usuario instale nada. 🎉
