# Fase 3 Parte 2: Dashboard de Conversaciones y WebSocket

## 🎯 Objetivo
Implementar el dashboard de conversaciones en tiempo real, integración con el sistema actual y WebSocket para actualizaciones live.

## 📋 Componentes a Implementar

### 1. Dashboard de Conversaciones (Frontend)
**Archivo**: Actualizar `dashboard.html` con tab de WhatsApp

**Funcionalidades**:
- ✅ Lista de conversaciones activas
- ✅ Vista de mensajes por conversación
- ✅ Estado de conexión de WhatsApp (conectado/desconectado)
- ✅ Indicador de mensajes entrantes en tiempo real
- ✅ Botón para enviar mensajes de prueba
- ✅ Estadísticas de mensajes (enviados hoy, límite diario)

### 2. WebSocket para Actualizaciones en Tiempo Real
**Archivo**: `server/websocket/baileys-socket.js`

**Eventos a emitir**:
- `message:received` - Nuevo mensaje entrante
- `message:sent` - Mensaje enviado confirmado
- `connection:status` - Cambio de estado de conexión
- `qr:updated` - Nuevo QR generado

### 3. API REST Complementaria
**Endpoints adicionales**:
```javascript
GET  /api/baileys/conversations/:tenantId  // Lista de conversaciones
GET  /api/baileys/messages/:tenantId/:chatId  // Mensajes de un chat
POST /api/baileys/send-message  // Enviar mensaje manual
GET  /api/baileys/profile/:tenantId  // Info del perfil conectado
```

### 4. Integración con Sistema Actual
**Archivos a modificar**:
- `server/whatsapp-handler.js` - Enrutador de mensajes
- `server/bot-logic.js` - Usar adaptador unificado
- `server/firebase-config.js` - Guardar conversaciones

### 5. Sistema de Notificaciones
**Funcionalidad**:
- Notificaciones browser cuando llega mensaje
- Badge de contador de mensajes no leídos
- Sonido de notificación (opcional)

---

## 🚀 Plan de Implementación

### Paso 1: WebSocket Setup (30 min)
1. Instalar dependencias de WebSocket
2. Configurar servidor WebSocket
3. Conectar con eventos de Baileys

### Paso 2: API de Conversaciones (45 min)
1. Endpoint para listar conversaciones
2. Endpoint para obtener mensajes de un chat
3. Endpoint para enviar mensajes manuales

### Paso 3: Dashboard UI (1.5 horas)
1. Tab de WhatsApp en dashboard
2. Lista de conversaciones
3. Vista de chat individual
4. Formulario de envío de mensajes

### Paso 4: Integración en Tiempo Real (45 min)
1. Conectar WebSocket en frontend
2. Actualizar UI cuando llegan mensajes
3. Mostrar estado de conexión en tiempo real

### Paso 5: Testing Completo (30 min)
1. Probar envío/recepción de mensajes
2. Verificar WebSocket funcionando
3. Validar integración con bot actual

---

## 📝 Estructura de Datos

### Conversación en Firestore
```javascript
{
  tenantId: "test_demo",
  chatId: "1234567890@s.whatsapp.net",
  contact: {
    name: "Juan Pérez",
    phoneNumber: "+1234567890",
    profilePic: "https://..."
  },
  lastMessage: {
    text: "Último mensaje",
    timestamp: Timestamp,
    fromMe: false
  },
  unreadCount: 3,
  updatedAt: Timestamp
}
```

### Mensaje en Firestore
```javascript
{
  tenantId: "test_demo",
  chatId: "1234567890@s.whatsapp.net",
  messageId: "3EB0ABCDEF1234567890",
  from: "1234567890@s.whatsapp.net",
  fromMe: false,
  text: "Hola, quiero hacer un pedido",
  timestamp: Timestamp,
  status: "delivered", // sent, delivered, read
  type: "text", // text, image, audio, video
  mediaUrl: null
}
```

---

## 🎨 Mockup del Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard - WhatsApp                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Estado: 🟢 Conectado (+1234567890)                     │
│  Mensajes hoy: 45 / 1000                                │
│                                                          │
├──────────────────┬──────────────────────────────────────┤
│ Conversaciones   │  Chat con Juan Pérez                 │
│                  │                                       │
│ 🟢 Juan Pérez    │  Juan:                               │
│    Último msg... │  Hola, quiero hacer pedido           │
│    hace 2 min    │  12:30 PM                            │
│                  │                                       │
│ ⚪ María López   │  Bot:                                │
│    Gracias por   │  ¡Hola! ¿Qué te gustaría ordenar?   │
│    hace 1 hora   │  12:31 PM                            │
│                  │                                       │
│ ⚪ Pedro García  │  [Formulario enviar mensaje]         │
│    Pedido #123   │  ┌──────────────────────┐           │
│    hace 2 horas  │  │ Escribe un mensaje   │           │
│                  │  └──────────────────────┘           │
│                  │  [Enviar]                            │
└──────────────────┴──────────────────────────────────────┘
```

---

## ✅ Criterios de Éxito

1. ✅ **WebSocket funcionando**: Mensajes llegan en tiempo real sin refresh
2. ✅ **Dashboard completo**: Ver todas las conversaciones activas
3. ✅ **Envío manual**: Poder responder mensajes desde el dashboard
4. ✅ **Integración**: Bot sigue funcionando normalmente
5. ✅ **Performance**: <100ms latencia en mensajes
6. ✅ **Estabilidad**: Sin memory leaks en 1 hora de uso

---

## 🔄 Siguientes Pasos

Después de completar esta fase:
1. **Fase 4**: Integración completa con sistema de pedidos
2. **Fase 5**: Testing exhaustivo con múltiples tenants
3. **Fase 6**: Despliegue a producción con clientes piloto
