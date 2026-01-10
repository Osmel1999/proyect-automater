# Plan de Implementación: Dashboard de Conversaciones WhatsApp

**Fecha:** 8 de enero de 2026  
**Objetivo:** Integrar un módulo de conversaciones en tiempo real para que los clientes puedan ver y responder mensajes de WhatsApp desde el KDS.

---

## 🎯 Visión General

Agregar un botón en la página actual del KDS (`/kds`) que envíe al usuario a una nueva página (`/conversaciones`) donde pueda:
- Ver todas las conversaciones activas
- Leer mensajes en tiempo real
- Responder manualmente a los clientes
- Ver historial completo de cada conversación
- Recibir notificaciones de mensajes nuevos

---

## 📐 Arquitectura del Sistema

### 1. Frontend

```
┌─────────────────────────────────────────┐
│  kds.html (Página actual)               │
│  [Pedidos] [💬 Conversaciones] [Salir] │
│                    ↓                     │
│         Click en "Conversaciones"       │
│                    ↓                     │
│     window.location.href =              │
│     '/conversaciones'                   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  conversaciones.html (Nueva página)     │
│                                         │
│  ┌─────────────┬─────────────────────┐ │
│  │  INBOX      │  CHAT VIEW          │ │
│  │             │                     │ │
│  │ 👤 Juan P.  │  [Juan Pérez]       │ │
│  │ 👤 María L. │  Cliente: Hola...   │ │
│  │ 👤 Pedro G. │  Bot: Sí, tenemos...│ │
│  │             │  Cliente: Quiero... │ │
│  │             │                     │ │
│  │             │  [Responder...] 📤  │ │
│  └─────────────┴─────────────────────┘ │
└─────────────────────────────────────────┘
```

### 2. Backend (Webhook + API)

```
┌──────────────────────────────────────────┐
│  WhatsApp Cloud API                      │
│  (Meta)                                  │
└──────────────┬───────────────────────────┘
               │
               │ Webhook (mensajes entrantes)
               ↓
┌──────────────────────────────────────────┐
│  server/index.js                         │
│  POST /webhook/whatsapp                  │
│                                          │
│  1. Recibe mensaje                       │
│  2. Guarda en Firebase                   │
│  3. Procesa con bot-logic.js (pedidos)   │
│  4. Envía respuesta automática           │
└──────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  Firebase Realtime Database              │
│  tenants/{tenantId}/conversaciones/      │
└──────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  conversaciones.html                     │
│  (Escucha cambios en tiempo real)        │
└──────────────────────────────────────────┘
```

---

## 🗂️ Estructura de Datos en Firebase

### Esquema propuesto:

```javascript
tenants/
  {tenantId}/                    // Ej: "restaurante-123"
    pedidos/                     // Ya existe
      {pedidoId}/
        // ... datos del pedido
    
    conversaciones/              // NUEVO
      {phoneNumber}/             // Ej: "+523311234567"
        metadata/
          nombre: "Juan Pérez"
          ultimoMensaje: "2026-01-08T14:32:00Z"
          ultimoTexto: "Quiero modificar mi pedido"
          noLeidos: 2
          estado: "activa" | "archivada"
          avatar: null | "url-imagen"
        
        mensajes/
          {messageId}/           // Ej: "msg_1704718320000"
            id: "wamid.abc123..."
            tipo: "recibido" | "enviado"
            from: "+523311234567"
            to: "+523311234568"
            texto: "Hola, ¿tienen pizza?"
            timestamp: "2026-01-08T14:30:00Z"
            leido: true | false
            estado: "enviado" | "entregado" | "leido" | "fallido"
            // Opcional: si es pedido
            esPedido: true | false
            pedidoId: "pedido_123"
            // Opcional: multimedia
            mediaUrl: null | "url-imagen/audio/video"
            mediaType: null | "image" | "audio" | "video" | "document"
```

---

## 📋 Tareas de Implementación

### **FASE 1: Preparación del Backend**

#### 1.1. Configurar Webhook de WhatsApp
- [ ] Registrar webhook en Meta Business Dashboard
- [ ] Configurar URL del webhook: `https://tu-dominio.com/webhook/whatsapp`
- [ ] Configurar token de verificación
- [ ] Suscribirse a eventos: `messages`, `message_status`

#### 1.2. Crear endpoint para recibir mensajes
**Archivo:** `server/whatsapp-webhook.js` (nuevo)
```javascript
// Funcionalidades:
// - Verificar firma de Meta
// - Parsear mensajes entrantes
// - Guardar en Firebase
// - Responder automáticamente (bot-logic.js)
```

#### 1.3. Crear endpoint para enviar mensajes
**Archivo:** `server/whatsapp-sender.js` (nuevo)
```javascript
// Funcionalidades:
// - Enviar mensaje de texto
// - Enviar mensaje con multimedia
// - Marcar mensaje como leído
// - Actualizar estado en Firebase
```

#### 1.4. Actualizar `server/index.js`
- [ ] Importar nuevos módulos
- [ ] Agregar ruta `POST /webhook/whatsapp`
- [ ] Agregar ruta `GET /webhook/whatsapp` (verificación)
- [ ] Agregar ruta `POST /api/conversaciones/enviar`
- [ ] Agregar ruta `POST /api/conversaciones/marcar-leido`
- [ ] Agregar middleware de autenticación

---

### **FASE 2: Modificar KDS Actual**

#### 2.1. Agregar botón de conversaciones
**Archivo:** `kds.html`
- [ ] Agregar botón "💬 Conversaciones" en la barra superior
- [ ] Posición: Entre "Pedidos" y "Salir"
- [ ] Estilo: Consistente con diseño actual
- [ ] Action: `window.location.href = '/conversaciones'`

**Ubicación del botón:**
```html
<!-- En kds.html, barra superior -->
<div class="header">
  <h1>Kitchen Display System</h1>
  <div class="nav-buttons">
    <button id="btnPedidos" class="active">📋 Pedidos</button>
    <button id="btnConversaciones">💬 Conversaciones</button> <!-- NUEVO -->
    <button id="btnSalir">🚪 Salir</button>
  </div>
</div>
```

#### 2.2. Agregar estilos CSS
**Archivo:** `kds.html` (dentro de `<style>`)
- [ ] Estilos para botón de conversaciones
- [ ] Badge para notificaciones (mensajes no leídos)

---

### **FASE 3: Crear Página de Conversaciones**

#### 3.1. Crear HTML principal
**Archivo:** `conversaciones.html` (nuevo)

**Estructura:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Conversaciones - KDS</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>💬 Conversaciones WhatsApp</h1>
    <button onclick="volverKDS()">← Volver al KDS</button>
  </div>

  <!-- Contenedor principal -->
  <div class="conversaciones-container">
    
    <!-- Panel izquierdo: Lista de conversaciones -->
    <div class="inbox-panel">
      <div class="inbox-header">
        <h2>Conversaciones</h2>
        <span id="badge-total">0</span>
      </div>
      
      <div class="inbox-filters">
        <button class="filter-btn active" data-filter="activas">Activas</button>
        <button class="filter-btn" data-filter="archivadas">Archivadas</button>
      </div>
      
      <div class="inbox-search">
        <input type="text" placeholder="Buscar conversación...">
      </div>
      
      <div id="lista-conversaciones" class="conversaciones-lista">
        <!-- Se llenará dinámicamente con JS -->
      </div>
    </div>

    <!-- Panel derecho: Vista de chat -->
    <div class="chat-panel">
      <div id="chat-vacio" class="chat-vacio">
        <p>Selecciona una conversación para comenzar</p>
      </div>
      
      <div id="chat-activo" class="chat-activo" style="display: none;">
        <!-- Header del chat -->
        <div class="chat-header">
          <div class="chat-info">
            <h3 id="chat-nombre">Juan Pérez</h3>
            <span id="chat-telefono">+52 33 1234 5678</span>
          </div>
          <div class="chat-actions">
            <button onclick="archivarConversacion()">📁 Archivar</button>
            <button onclick="verPedidos()">📋 Ver Pedidos</button>
          </div>
        </div>
        
        <!-- Mensajes -->
        <div id="chat-mensajes" class="chat-mensajes">
          <!-- Se llenará dinámicamente con JS -->
        </div>
        
        <!-- Input para responder -->
        <div class="chat-input">
          <textarea 
            id="mensaje-texto" 
            placeholder="Escribe tu respuesta..."
            rows="2"
          ></textarea>
          <button id="btn-enviar" onclick="enviarMensaje()">
            📤 Enviar
          </button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-database-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth-compat.js"></script>
  <script src="config.js"></script>
  <script src="conversaciones.js"></script>
</body>
</html>
```

#### 3.2. Crear JavaScript de la página
**Archivo:** `conversaciones.js` (nuevo)

**Funcionalidades principales:**

```javascript
// 1. Inicialización
// - Verificar autenticación
// - Obtener tenantId del usuario
// - Inicializar Firebase listeners

// 2. Cargar lista de conversaciones
function cargarConversaciones() {
  // Escuchar cambios en Firebase
  // Renderizar lista en panel izquierdo
  // Ordenar por último mensaje (más reciente primero)
  // Mostrar badge de no leídos
}

// 3. Seleccionar conversación
function seleccionarConversacion(phoneNumber) {
  // Marcar conversación como activa
  // Cargar mensajes del chat
  // Marcar mensajes como leídos
  // Mostrar panel de chat
}

// 4. Cargar mensajes de un chat
function cargarMensajes(phoneNumber) {
  // Escuchar nuevos mensajes en tiempo real
  // Renderizar mensajes (recibidos vs enviados)
  // Auto-scroll al último mensaje
  // Formatear timestamp
}

// 5. Enviar mensaje
async function enviarMensaje() {
  // Validar que no esté vacío
  // Obtener texto del textarea
  // Llamar a API del backend: POST /api/conversaciones/enviar
  // Guardar en Firebase
  // Limpiar textarea
  // Mostrar mensaje en el chat inmediatamente
}

// 6. Marcar como leído
function marcarComoLeido(phoneNumber) {
  // Actualizar Firebase: leido = true
  // Actualizar badge de no leídos
  // Llamar a API de WhatsApp
}

// 7. Buscar conversaciones
function buscarConversacion(query) {
  // Filtrar por nombre o teléfono
}

// 8. Archivar conversación
function archivarConversacion(phoneNumber) {
  // Actualizar estado en Firebase
  // Mover a "Archivadas"
}

// 9. Ver pedidos del cliente
function verPedidos(phoneNumber) {
  // Buscar pedidos en Firebase del mismo teléfono
  // Mostrar modal con lista de pedidos
}

// 10. Notificaciones en tiempo real
function inicializarNotificaciones() {
  // Escuchar nuevos mensajes
  // Mostrar notificación del navegador
  // Reproducir sonido (opcional)
  // Actualizar título de la pestaña con contador
}

// 11. Formato de mensajes
function formatearMensaje(mensaje) {
  // Renderizar HTML del mensaje
  // Detectar si es enviado o recibido
  // Formatear timestamp (ej: "14:32" o "Ayer 10:15")
  // Mostrar estado (✓ enviado, ✓✓ leído)
}

// 12. Auto-actualización
function inicializarAutoActualizacion() {
  // Firebase Realtime Database listener
  // Actualizar UI automáticamente cuando llegue nuevo mensaje
}
```

#### 3.3. Crear estilos CSS
**Archivo:** `conversaciones.css` (nuevo)

**Secciones de estilos:**
- Layout de dos columnas (inbox + chat)
- Lista de conversaciones (estilo WhatsApp)
- Vista de chat (burbujas de mensajes)
- Input de texto
- Badges de notificaciones
- Estados de mensajes (enviado, leído, etc.)
- Responsive design (mobile-friendly)

---

### **FASE 4: Integración con Sistema Actual**

#### 4.1. Modificar `bot-logic.js`
**Archivo:** `server/bot-logic.js`
- [ ] Al procesar un pedido, también guardar el mensaje en conversaciones
- [ ] Link entre pedido y conversación (guardar phoneNumber en pedido)
- [ ] Guardar respuestas automáticas en conversaciones

#### 4.2. Actualizar `firebase.json`
**Archivo:** `firebase.json`
```json
{
  "hosting": {
    "public": ".",
    "rewrites": [
      {
        "source": "/kds",
        "destination": "/kds.html"
      },
      {
        "source": "/conversaciones",
        "destination": "/conversaciones.html"
      }
    ]
  }
}
```

#### 4.3. Crear script de inicialización de estructura
**Archivo:** `scripts/init-conversaciones-structure.js` (nuevo)
```javascript
// Crear estructura inicial en Firebase
// Migrar conversaciones existentes (si las hay)
```

---

### **FASE 5: Configuración de WhatsApp API**

#### 5.1. Configurar Webhook en Meta Dashboard
**Pasos:**
1. Ir a Meta Business Dashboard
2. Seleccionar la app de WhatsApp Business
3. Ir a "Webhooks"
4. Agregar URL: `https://tu-dominio.com/webhook/whatsapp`
5. Agregar token de verificación
6. Suscribirse a campos:
   - `messages` (mensajes entrantes)
   - `message_status` (estado de mensajes enviados)

#### 5.2. Obtener credenciales
**Necesario:**
- WhatsApp Business Account ID
- Phone Number ID
- Access Token (permanente)
- Webhook Verify Token (crear uno seguro)

#### 5.3. Actualizar variables de entorno
**Archivo:** `.env` o `config.js`
```javascript
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAAxxxx...
WHATSAPP_VERIFY_TOKEN=mi_token_secreto_123
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321
```

---

### **FASE 6: Seguridad y Validaciones**

#### 6.1. Validar firma de Meta
**Archivo:** `server/whatsapp-webhook.js`
```javascript
// Verificar x-hub-signature-256
// Prevenir ataques de replay
// Validar estructura del payload
```

#### 6.2. Autenticación de usuarios
**Archivo:** `conversaciones.html`
```javascript
// Verificar que el usuario esté autenticado
// Verificar que tenga permiso al tenantId
// Redirigir a login si no está autenticado
```

#### 6.3. Rate limiting
**Archivo:** `server/index.js`
```javascript
// Limitar número de mensajes por minuto
// Prevenir spam
```

---

### **FASE 7: Features Avanzadas (Opcional)**

#### 7.1. Notificaciones push
- [ ] Integrar Web Push API
- [ ] Solicitar permisos al usuario
- [ ] Enviar notificación cuando llegue mensaje nuevo

#### 7.2. Búsqueda de mensajes
- [ ] Buscar en el contenido de los mensajes
- [ ] Filtrar por fecha
- [ ] Exportar conversación (PDF o TXT)

#### 7.3. Respuestas rápidas
- [ ] Plantillas de mensajes frecuentes
- [ ] Atajos de teclado
- [ ] Guardar respuestas personalizadas

#### 7.4. Multimedia
- [ ] Enviar imágenes
- [ ] Enviar archivos
- [ ] Ver imágenes en el chat

#### 7.5. Estadísticas
- [ ] Tiempo promedio de respuesta
- [ ] Conversaciones por día
- [ ] Mensajes más frecuentes

#### 7.6. Asignación de conversaciones
- [ ] Multi-usuario (varios operadores)
- [ ] Asignar conversación a un usuario específico
- [ ] Ver quién está respondiendo

#### 7.7. Etiquetas y categorías
- [ ] Etiquetar conversaciones (ej: "urgente", "reclamo", "pedido")
- [ ] Filtrar por etiquetas
- [ ] Colores personalizados

---

## 🔧 Tecnologías y Librerías

### Frontend
- HTML5
- CSS3 (Flexbox/Grid)
- JavaScript Vanilla (sin frameworks por ahora)
- Firebase SDK (Auth + Realtime Database)

### Backend
- Node.js + Express
- Firebase Admin SDK
- Axios (para llamadas a WhatsApp API)
- Crypto (para validar firma de Meta)

### APIs Externas
- WhatsApp Cloud API (Meta)
- Firebase Realtime Database

---

## 📦 Archivos Nuevos a Crear

```
kds-webapp/
├── conversaciones.html          # Página principal de conversaciones
├── conversaciones.js            # Lógica del frontend
├── conversaciones.css           # Estilos de la página
├── server/
│   ├── whatsapp-webhook.js      # Recibir mensajes de WhatsApp
│   ├── whatsapp-sender.js       # Enviar mensajes a WhatsApp
│   └── conversaciones-service.js # Lógica de negocio
└── scripts/
    └── init-conversaciones-structure.js  # Script de inicialización
```

---

## 📝 Archivos a Modificar

```
kds-webapp/
├── kds.html                      # Agregar botón de conversaciones
├── server/index.js               # Agregar rutas de webhook y API
├── server/bot-logic.js           # Guardar conversaciones al procesar pedidos
├── firebase.json                 # Agregar rewrite para /conversaciones
└── config.js                     # Agregar variables de WhatsApp API
```

---

## 🧪 Testing

### Test Cases a Validar

#### Backend
- [ ] Webhook recibe mensajes correctamente
- [ ] Webhook valida firma de Meta
- [ ] Mensajes se guardan en Firebase correctamente
- [ ] API de envío funciona correctamente
- [ ] Mensajes de estado se actualizan (entregado, leído)

#### Frontend
- [ ] Lista de conversaciones se carga correctamente
- [ ] Mensajes se actualizan en tiempo real
- [ ] Enviar mensaje funciona correctamente
- [ ] Marcar como leído funciona
- [ ] Búsqueda funciona
- [ ] Archivar conversación funciona
- [ ] Responsive design en móvil

#### Integración
- [ ] Pedidos y conversaciones están linkeados
- [ ] Ver pedidos desde conversación funciona
- [ ] Bot responde automáticamente y guarda en conversaciones
- [ ] Notificaciones funcionan

---

## 📊 Métricas de Éxito

Después de implementar, medir:
- ✅ Tiempo promedio de respuesta a clientes
- ✅ Número de conversaciones activas por día
- ✅ Tasa de respuesta manual vs automática
- ✅ Satisfacción del cliente (encuesta post-compra)
- ✅ Tiempo que el operador pasa en la plataforma

---

## 🚀 Despliegue

### Pasos de Deployment

1. **Probar localmente:**
   ```bash
   npm run dev
   ```

2. **Configurar webhook en Meta:**
   - Usar ngrok para testing local
   - Validar que los mensajes llegan correctamente

3. **Desplegar a producción:**
   ```bash
   firebase deploy --only hosting,functions
   ```

4. **Actualizar webhook en Meta:**
   - Cambiar URL a la de producción
   - Validar funcionamiento

5. **Monitorear logs:**
   ```bash
   firebase functions:log
   ```

---

## ⚠️ Consideraciones Importantes

### 1. Rate Limits de WhatsApp
- Máximo 1000 mensajes por segundo (Business API)
- Ventana de 24 horas para responder a usuarios
- Después de 24h, solo se pueden enviar plantillas pre-aprobadas

### 2. Costos
- WhatsApp cobra por mensajes enviados (gratis los primeros 1000/mes)
- Firebase tiene límites en el plan gratuito
- Considerar plan de pago para producción

### 3. Privacidad y GDPR
- Guardar consentimiento del usuario
- Permitir eliminar conversaciones
- Encriptar datos sensibles
- Política de retención de datos

### 4. Escalabilidad
- Si hay muchas conversaciones, considerar paginación
- Implementar índices en Firebase para búsquedas rápidas
- Usar Firebase Cloud Functions para tareas pesadas

---

## 📚 Documentación Adicional

### Referencias útiles:
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [Web Push Notifications](https://web.dev/push-notifications/)

---

## ✅ Checklist Final

Antes de considerar completa la implementación:

- [ ] Webhook configurado y funcionando
- [ ] Mensajes se reciben correctamente
- [ ] Mensajes se envían correctamente
- [ ] UI es intuitiva y responsive
- [ ] Notificaciones funcionan
- [ ] Integración con KDS actual funciona
- [ ] Testing completo realizado
- [ ] Documentación actualizada
- [ ] Despliegue a producción exitoso
- [ ] Capacitación al cliente completada

---

## 🎓 Capacitación al Cliente

### Material a preparar:
1. Video tutorial de cómo usar la sección de conversaciones
2. Guía PDF con screenshots
3. FAQ de preguntas frecuentes
4. Buenas prácticas para responder clientes

---

## 🔮 Roadmap Futuro

### Versión 2.0 (opcional):
- [ ] Chatbot con IA (GPT) para respuestas automáticas inteligentes
- [ ] Integración con CRM
- [ ] App móvil nativa
- [ ] Soporte multicanal (Instagram, Facebook Messenger)
- [ ] Analytics avanzado
- [ ] Integración con sistema de pagos

---

**Última actualización:** 8 de enero de 2026  
**Estado:** 📋 Plan pendiente de implementación  
**Tiempo estimado de implementación:** 2-3 semanas (fullstack developer)
