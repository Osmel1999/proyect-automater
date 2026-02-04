# 🏗️ Arquitectura Frontend del Sistema de Túnel

## 📋 Estado Actual

### ✅ Separación Correcta por Página

Cada página mantiene su arquitectura separada:

#### **KDS (kds.html)**
- HTML: `kds.html`
- CSS: `css/kds-modern.css`
- JS: `js/kds.js`
- Compartido: `app.js` (lógica de negocio)
- Túnel: `js/tunnel-worker-register.js`

#### **Dashboard (dashboard.html)**
- HTML: `dashboard.html`
- CSS: `css/dashboard.css`
- JS: `js/dashboard.js`
- Túnel: `js/tunnel-worker-register.js`

#### **WhatsApp Connect (whatsapp-connect.html)**
- HTML: `whatsapp-connect.html`
- CSS: `css/whatsapp-connect.css`
- JS: `js/whatsapp-connect.js`
- Túnel: `js/tunnel-worker-register.js`

### 🔧 Módulos Compartidos

#### Service Worker (`sw-tunnel.js`)
- ✅ Ubicación correcta en raíz
- ✅ Funcionalidad completa implementada
- ✅ Manejo de prioridad de clientes
- ✅ Reconexión automática
- ✅ Notificación de desconexión al backend

#### Registro del Túnel (`js/tunnel-worker-register.js`)
- ✅ Ubicación correcta en carpeta js
- ✅ Funciona como módulo independiente
- ✅ No interfiere con lógica de cada página
- ✅ Incluido en las 3 páginas prioritarias

---

## 🎯 Mejoras Necesarias

### 1. **Namespace Global para Túnel**
Actualmente el módulo está en IIFE anónimo, pero necesitamos exponer una API para que cada página pueda:
- Obtener estado del túnel
- Forzar reconexión
- Obtener información de conexión

### 2. **Integración con Estado de Cada Página**
Cada página debe poder:
- Saber si el túnel está activo
- Mostrar indicador personalizado (respetando su CSS)
- Manejar eventos de desconexión

### 3. **Manejo de Errores Mejorado**
- Notificaciones más descriptivas
- Log estructurado para debugging
- Fallback visual cuando Service Worker no está disponible

### 4. **Optimización de Recursos**
- Lazy loading del indicador visual
- Cache de estado para reducir queries
- Throttling de reconexiones

---

## 📐 Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    NAVEGADOR DEL RESTAURANTE                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   KDS.HTML   │  │DASHBOARD.HTML│  │WHATSAPP.HTML │      │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤      │
│  │ kds.js       │  │ dashboard.js │  │whatsapp-c.js │      │
│  │ kds.css      │  │ dashboard.css│  │whatsapp-c.css│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│         └──────────────────┴──────────────────┘              │
│                            │                                  │
│              ┌─────────────▼─────────────┐                   │
│              │  tunnel-worker-register.js │                   │
│              │  (Módulo Compartido)       │                   │
│              └─────────────┬─────────────┘                   │
│                            │                                  │
│              ┌─────────────▼─────────────┐                   │
│              │    sw-tunnel.js            │                   │
│              │  (Service Worker)          │                   │
│              │  - Prioridad: KDS > WC > D │                   │
│              │  - Reconexión automática   │                   │
│              │  - Notificación backend    │                   │
│              └─────────────┬─────────────┘                   │
└────────────────────────────┼─────────────────────────────────┘
                             │ WebSocket
                             │
                  ┌──────────▼──────────┐
                  │   RAILWAY BACKEND    │
                  │  /tunnel endpoint    │
                  │  tunnel-manager.js   │
                  │  (⏳ Por implementar) │
                  └──────────┬──────────┘
                             │
                  ┌──────────▼──────────┐
                  │   BAILEYS/WHATSAPP  │
                  │  session-manager.js │
                  └─────────────────────┘
```

---

## 🔄 Flujo de Inicialización

### **1. Carga de Página (cualquiera)**
```javascript
// HTML carga en orden:
1. config.js (Firebase)
2. app.js (si aplica)
3. membership-check.js
4. tunnel-worker-register.js  ← MÓDULO DE TÚNEL
5. [página].js (kds/dashboard/whatsapp)
```

### **2. Registro del Service Worker**
```javascript
// tunnel-worker-register.js
window.addEventListener('load', () => {
  registerTunnelWorker()  // Registra sw-tunnel.js
  setupCommunication()    // Establece mensajería
})
```

### **3. Establecimiento del Túnel**
```javascript
// sw-tunnel.js
establishTunnel() → {
  1. Seleccionar cliente por prioridad
  2. Obtener tenantId
  3. Conectar WebSocket a Railway
  4. Notificar éxito/error a clientes
}
```

---

## 🛠️ API Propuesta para Túnel

### **Namespace Global: `window.KDSTunnel`**

```javascript
// Exponer API global para que cada página pueda usar
window.KDSTunnel = {
  // Estado
  isActive: () => boolean,
  getStatus: () => { status, tenantId, page, timestamp },
  
  // Control
  forceReconnect: () => Promise<void>,
  disconnect: () => void,
  
  // Eventos
  on: (event, callback) => void,
  off: (event, callback) => void,
  
  // Indicador
  showIndicator: (options) => void,
  hideIndicator: () => void,
  updateIndicator: (status) => void
}
```

### **Eventos Disponibles**
```javascript
KDSTunnel.on('connected', (data) => {
  console.log('Túnel conectado:', data.tenantId)
})

KDSTunnel.on('disconnected', (data) => {
  console.log('Túnel desconectado:', data.reason)
  console.log('Fallback activo:', data.fallbackToRailway)
})

KDSTunnel.on('error', (error) => {
  console.error('Error en túnel:', error)
})

KDSTunnel.on('status-change', (status) => {
  console.log('Estado cambió:', status)
})
```

### **Uso en Páginas Individuales**

```javascript
// En js/kds.js
document.addEventListener('DOMContentLoaded', () => {
  // Verificar túnel
  if (KDSTunnel.isActive()) {
    console.log('✅ KDS usando túnel de navegador')
  }
  
  // Escuchar eventos
  KDSTunnel.on('disconnected', (data) => {
    showKDSNotification('Usando conexión Railway temporalmente')
  })
})
```

---

## 🎨 Indicador Visual Mejorado

### **Configuración Flexible**
```javascript
// Cada página puede personalizar su indicador
KDSTunnel.showIndicator({
  position: 'bottom-right',  // top-right, bottom-left, etc.
  style: 'minimal',          // minimal, full, badge
  autoHide: false,           // Auto-ocultar cuando está activo
  theme: 'auto'              // auto, light, dark
})
```

### **Estados del Indicador**
- 🟢 **active**: Túnel conectado (verde)
- 🟡 **pending**: Activando túnel (amarillo)
- 🟡 **disconnected**: Reconectando (amarillo)
- 🔴 **error**: Error (rojo)
- ⚪ **fallback**: Usando Railway (gris/amarillo)

---

## ✅ Checklist de Mejoras

### **Fase 1: API y Namespace**
- [ ] Crear namespace `window.KDSTunnel`
- [ ] Exponer métodos públicos
- [ ] Sistema de eventos personalizado
- [ ] Documentar API

### **Fase 2: Indicador Visual**
- [ ] Indicador configurable por página
- [ ] Temas (light/dark)
- [ ] Animaciones suaves
- [ ] Responsive design

### **Fase 3: Integración**
- [ ] Integrar en `js/kds.js`
- [ ] Integrar en `js/dashboard.js`
- [ ] Integrar en `js/whatsapp-connect.js`
- [ ] Pruebas de compatibilidad

### **Fase 4: Optimización**
- [ ] Lazy loading de componentes
- [ ] Cache de estado
- [ ] Throttling de reconexiones
- [ ] Compresión de mensajes WebSocket

---

## 📊 Prioridades de Implementación

### **🔥 Crítico (Ahora)**
1. Exponer API global básica
2. Mejorar manejo de errores
3. Indicador visual responsive

### **⚠️ Importante (Después del Backend)**
1. Integración con páginas individuales
2. Sistema de eventos robusto
3. Optimizaciones de rendimiento

### **📈 Nice to Have (Futuro)**
1. Panel de diagnóstico del túnel
2. Estadísticas de conexión
3. Modo debug avanzado

---

## 🚀 Siguiente Paso

Implementar las mejoras del frontend ANTES de iniciar el backend, para asegurar que:
1. La arquitectura esté limpia y separada
2. Cada página tenga control sobre el túnel
3. El indicador sea flexible y configurable
4. Los eventos estén bien estructurados
