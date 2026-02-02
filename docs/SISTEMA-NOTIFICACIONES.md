# 🔔 Sistema de Notificaciones por WhatsApp

Sistema de notificaciones automáticas que usa el propio bot del restaurante para enviar alertas al dueño.

## 🆕 Actualización: Límites Mensuales

A partir de esta versión, los límites de pedidos son **MENSUALES** en lugar de diarios:

| Plan | Límite Anterior | Límite Nuevo |
|------|-----------------|--------------|
| Emprendedor | 25/día | **750/mes** |
| Profesional | 50/día | **1,500/mes** |
| Empresarial | 100/día | **3,000/mes** |

### Ventajas del cambio:
- ✅ **Más justo**: El usuario paga por 30 días desde el pago, no días del calendario
- ✅ **Flexible**: Si un día tiene 50 pedidos y otro 0, no hay problema
- ✅ **Fácil de entender**: "Te quedan 450 de 750 pedidos este mes"
- ✅ **Sin desperdicio**: Los pedidos no usados no se pierden al día siguiente

## Arquitectura

El sistema usa el **mismo número de WhatsApp conectado del tenant** para enviar mensajes al dueño. Esto tiene varias ventajas:

- ✅ No requiere infraestructura adicional
- ✅ El usuario reconoce el número (es SU WhatsApp)
- ✅ Sin riesgo de ban (mensaje a sí mismo)
- ✅ Sin costos adicionales

## Tipos de Notificaciones

### 1. Plan por Vencer (`notifyPlanExpiring`)
- **7 días antes**: Recordatorio informativo
- **3 días antes**: Advertencia
- **1 día antes**: Urgente

```
🔔 *Notificación KDS*

Tu plan vence en *3 días*.

No pierdas tus pedidos automáticos. Elige un plan:
👉 https://kdsapp.site/plans.html
```

### 2. Acercándose al Límite (`notifyApproachingLimit`)
Se envía cuando el tenant usa más del 90% de su límite mensual.

```
⚠️ *Notificación KDS*

⚡ *Estás por alcanzar tu límite mensual*

Has usado *680/750* pedidos (91%).
Te quedan *70 pedidos* para los próximos 12 días.

💡 *Recomendación:* Actualiza al plan *Profesional* (1,500 pedidos/mes).

👉 Paga aquí: https://checkout.wompi.co/l/abc123
_(El nuevo plan dura 30 días desde el pago)_
```

### 3. Pedido Perdido con Enlace de Pago (`notifyLostOrderWithPaymentLink`)
Se envía cuando se pierde un pedido por límite mensual (máximo 1 vez cada 3 horas).

```
🚨 *Notificación KDS*

😔 *Perdiste un pedido*

Alcanzaste el límite de *750 pedidos* de tu plan *emprendedor*.
Tu plan actual se renueva en 12 días.

💰 *Cada pedido perdido es dinero que no entra a tu negocio.*

✅ *Solución:* Actualiza al plan *Profesional*
• 1,500 pedidos por mes
• Solo $120.000 COP
• Activo por 30 días desde el pago

👉 *Paga ahora:* https://checkout.wompi.co/l/xyz456
```

### 4. Plan Expirado (`notifyPlanExpired`)
Se envía una vez cuando el plan expira.

```
🚨 *Notificación KDS*

🔴 *Tu plan ha expirado*

El bot de pedidos está desactivado.

Para volver a recibir pedidos automáticos, elige un plan:
👉 https://kdsapp.site/plans.html
```

### 5. Pago Exitoso (`notifyPaymentSuccess`)
Se envía cuando se confirma un pago. Ahora incluye la fecha exacta de vencimiento.

```
🔔 *Notificación KDS*

✅ *¡Pago confirmado!*

Tu plan *Profesional* está ahora activo.

📦 *1,500 pedidos* disponibles
📅 Válido hasta: *5 de marzo de 2026*
_(30 días a partir de hoy)_

¡Gracias por confiar en KDS! 🙌
```

## Flujo de Notificaciones

### 1. Bot Conectado
Si el bot está conectado, la notificación se envía inmediatamente.

### 2. Bot Desconectado
Si el bot no está conectado:
1. La notificación se guarda en `tenants/{tenantId}/pendingNotifications`
2. Cuando el bot se conecta, se envían todas las pendientes
3. Las notificaciones enviadas se eliminan de pendientes

### 3. Verificación Diaria
Al iniciar el servidor (y se puede configurar como cron):
1. Se verifican todas las membresías
2. Se envían notificaciones de expiración según días restantes
3. Se marca qué se notificó hoy para evitar spam

## Estructura en Firebase

```
tenants/{tenantId}/
├── pendingNotifications/
│   └── {pushId}: {
│       message: string,
│       type: "info" | "warning" | "urgent",
│       createdAt: timestamp
│   }
├── lastNotifications/
│   ├── expiring: "2025-02-02"  // Última fecha que se notificó
│   └── expired: "2025-02-02"
└── notificationHistory/
    └── {pushId}: {
        message: string,
        type: string,
        status: "sent",
        sentAt: timestamp
    }
```

## Integración

### En `bot-logic.js`
- `notifyLostOrders()` - Cuando se pierde un pedido por límite
- `notifyApproachingLimit()` - Cuando quedan pocos pedidos del día

### En `wompi-routes.js`
- `notifyPaymentSuccess()` - Cuando se confirma un pago

### En `baileys-controller.js`
- `sendPendingNotifications()` - Cuando el bot se conecta

### En `index.js`
- `checkAllMemberships()` - Al iniciar el servidor (con delay de 30s)

## API

```javascript
const notificationService = require('./notification-service');

// Inicializar con baileys
notificationService.init(baileys);

// Enviar notificación genérica
await notificationService.sendNotification(tenantId, 'Mensaje', 'info');

// Notificaciones específicas
await notificationService.notifyPlanExpiring(tenantId, daysRemaining);
await notificationService.notifyApproachingLimit(tenantId, current, limit);
await notificationService.notifyLostOrders(tenantId, lostCount);
await notificationService.notifyPlanExpired(tenantId);
await notificationService.notifyPaymentSuccess(tenantId, plan);

// Verificar todas las membresías
await notificationService.checkAllMemberships();
```

## Configuración Anti-Spam

- **Plan por vencer**: Una notificación por día máximo
- **Límite de pedidos**: Solo cuando pasan del 90%
- **Pedidos perdidos**: Solo cada 3 pedidos perdidos
- **Plan expirado**: Una vez al día

Esto evita molestar al usuario con demasiados mensajes.
