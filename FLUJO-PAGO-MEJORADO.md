# 🔄 FLUJO DE PAGO MEJORADO - Tarjeta vs Efectivo

## 📋 Cambios Implementados

### 🎯 Objetivo
Separar completamente el flujo de pago con tarjeta del pago en efectivo:
- **Tarjeta**: NO confirmar pedido hasta recibir webhook APPROVED
- **Efectivo**: Confirmar pedido inmediatamente

---

## 🔀 FLUJO 1: Pago con Tarjeta

### 📱 Paso 1: Cliente Elige "Tarjeta"
**Archivo**: `server/bot-logic.js` → `confirmarPedido()`

**Comportamiento**:
1. ✅ Genera enlace de pago de Wompi
2. ✅ Guarda pedido TEMPORAL en `/orders/{orderId}` (NO en KDS)
3. ✅ Estado del pedido: `awaiting_payment`
4. ✅ Envía mensaje con link de pago
5. ❌ **NO** crea el pedido en KDS
6. ❌ **NO** confirma el pedido al cliente

**Mensaje al Cliente**:
```
🎉 ¡Tu pedido está casi listo!

📋 Número de pedido: #ABC123
📍 Dirección: ...
📱 Teléfono de contacto: ...
💰 Total a pagar: $40.000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💳 PAGO SEGURO EN LÍNEA

👉 Haz clic aquí para pagar ahora:
https://checkout.wompi.co/l/test_XXXXX

✅ Puedes pagar con tarjeta de crédito/débito, PSE o Nequi
🔒 Pago 100% seguro y encriptado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Una vez confirmes el pago, [Restaurante] empezará a preparar tu pedido.

🕒 Tiempo estimado: 30-40 minutos

Te avisaremos cuando el pago sea confirmado ✅
```

---

### 💳 Paso 2: Cliente Paga en Wompi

**Wompi procesa el pago** → Envía webhook a:
```
POST https://api.kdsapp.site/api/payments/webhook/wompi/{restaurantId}
```

---

### ✅ Paso 3A: Webhook APPROVED (Pago Exitoso)
**Archivo**: `server/payment-service.js` → `processWebhook()`

**Comportamiento**:
1. ✅ Valida el webhook
2. ✅ Encuentra la transacción por `paymentLinkId`
3. ✅ Actualiza estado a `APPROVED`
4. ✅ **CREA el pedido en KDS** (`_createOrderInKDS()`)
5. ✅ Actualiza el pedido en `/orders/` a `PAID`
6. ✅ Envía notificación de confirmación al cliente

**Mensaje al Cliente** (vía `_notifyCustomer()`):
```
🎉 ¡Tu pedido está confirmado!

✅ Pago recibido exitosamente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Detalles de tu pedido:

🔢 Número de pedido: #ABC123
📍 Dirección: Carrera 45#76-115 apto 102
📱 Teléfono de contacto: 399 111 1111
💰 Total pagado: $40.000
💳 Método de pago: Tarjeta (Pagado)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍🍳 Ya lo enviamos a la cocina de [Restaurante]. 🛵

🕒 Tiempo estimado: 30-40 minutos

Te avisaremos cuando esté listo para entrega ✅

¡Gracias por tu compra! 🙏
```

---

### ❌ Paso 3B: Webhook DECLINED (Pago Rechazado)
**Archivo**: `server/payment-service.js` → `processWebhook()`

**Comportamiento**:
1. ✅ Valida el webhook
2. ✅ Encuentra la transacción
3. ✅ Actualiza estado a `DECLINED`
4. ❌ **NO** crea el pedido en KDS
5. ✅ Actualiza el pedido en `/orders/` a `FAILED`
6. ✅ Envía notificación de rechazo al cliente

**Mensaje al Cliente**:
```
❌ No se pudo completar el pago

Tu pago fue rechazado por el banco o cancelado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Pedido: #ABC123
💰 Monto: $40.000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 ¿Quieres intentar nuevamente?

Puedes volver a hacer tu pedido escribiendo:
📝 menu - Para ver el menú
🛒 carrito - Para ver tu carrito

💬 Si necesitas ayuda, escribe ayuda
```

---

### 🔴 Paso 3C: Webhook ERROR (Error Técnico)
**Archivo**: `server/payment-service.js` → `processWebhook()`

**Comportamiento**:
1. ✅ Valida el webhook
2. ✅ Encuentra la transacción
3. ✅ Actualiza estado a `ERROR`
4. ❌ **NO** crea el pedido en KDS
5. ✅ Actualiza el pedido en `/orders/` a `FAILED`
6. ✅ Envía notificación de error al cliente

**Mensaje al Cliente**:
```
🔴 Error procesando el pago

Hubo un problema técnico al procesar tu pago.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Pedido: #ABC123
💰 Monto: $40.000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Por favor, intenta nuevamente en unos minutos.

Si el problema persiste:
📝 menu - Para hacer un nuevo pedido
💬 ayuda - Para asistencia inmediata

¡Estamos aquí para ayudarte! 🆘
```

---

## 💵 FLUJO 2: Pago en Efectivo

### 📱 Paso 1: Cliente Elige "Efectivo"
**Archivo**: `server/bot-logic.js` → `confirmarPedido()`

**Comportamiento**:
1. ✅ **CREA el pedido en KDS inmediatamente**
2. ✅ Guarda en `/tenants/{tenantId}/pedidos`
3. ✅ Estado del pedido: `pendiente`
4. ✅ Estado de pago: `PENDING`
5. ✅ **Confirma el pedido al cliente de inmediato**

**Mensaje al Cliente**:
```
🎉 Tu pedido está confirmado

📋 Número de pedido: #ABC123
📍 Dirección: Carrera 45#76-115 apto 102
📱 Teléfono de contacto: 399 111 1111
💰 Total: $40.000
💵 Método de pago: Efectivo

Ya lo enviamos a la cocina de [Restaurante]. 🛵

🕒 Tiempo estimado: 30-40 minutos

Te avisaremos cuando esté listo para entrega ✅
```

---

## 📊 Comparación de Flujos

| Aspecto | 💳 Tarjeta | 💵 Efectivo |
|---------|-----------|------------|
| **Crear pedido en KDS** | ❌ NO (espera webhook) | ✅ SÍ (inmediato) |
| **Confirmar al cliente** | ❌ NO (espera webhook) | ✅ SÍ (inmediato) |
| **Mensaje inicial** | "Pedido casi listo" + link | "Pedido confirmado" |
| **Ubicación en Firebase** | `/orders/{orderId}` (temporal) | `/tenants/{id}/pedidos` (KDS) |
| **Estado inicial** | `awaiting_payment` | `pendiente` |
| **Requiere webhook** | ✅ SÍ | ❌ NO |

---

## 🔧 Archivos Modificados

### 1. `server/payment-service.js`
**Función**: `_notifyCustomer(transaction, status)`

**Cambios**:
- ✅ Mejorado mensaje de APPROVED para incluir todos los detalles del pedido
- ✅ Agregado nombre del restaurante
- ✅ Formato mejorado para número de pedido (hex corto)
- ✅ Mensajes más claros para DECLINED y ERROR
- ✅ Incluye opciones de acción para el usuario

### 2. `server/bot-logic.js`
**Función**: `confirmarPedido(sesion)`

**Estado**: ✅ Ya está correctamente implementado
- Línea 585-664: Flujo para tarjeta (solo link, no KDS)
- Línea 666-730: Flujo para efectivo (crea en KDS inmediatamente)

---

## ✅ Validación del Flujo

### Escenario 1: Pago con Tarjeta Exitoso ✅
```
1. Cliente elige "tarjeta"
   → Recibe link de pago
   → NO ve confirmación de pedido

2. Cliente paga en Wompi
   → Wompi procesa el pago

3. Webhook APPROVED llega al backend
   → Se crea el pedido en KDS
   → Cliente recibe confirmación completa
   → "¡Tu pedido está confirmado!"
```

### Escenario 2: Pago con Tarjeta Rechazado ❌
```
1. Cliente elige "tarjeta"
   → Recibe link de pago

2. Cliente intenta pagar en Wompi
   → Pago rechazado por banco

3. Webhook DECLINED llega al backend
   → NO se crea el pedido en KDS
   → Cliente recibe notificación de rechazo
   → Se le pide intentar nuevamente
```

### Escenario 3: Pago en Efectivo ✅
```
1. Cliente elige "efectivo"
   → Pedido creado en KDS inmediatamente
   → Cliente recibe confirmación completa
   → "¡Tu pedido está confirmado!"
```

---

## 🎯 Beneficios de esta Implementación

1. ✅ **Experiencia Mejorada**: Cliente sabe exactamente cuándo su pedido está confirmado
2. ✅ **Gestión Eficiente**: KDS solo muestra pedidos pagados (con tarjeta) o confirmados (efectivo)
3. ✅ **Menor Confusión**: No hay pedidos "fantasma" en KDS de pagos no completados
4. ✅ **Comunicación Clara**: Mensajes específicos para cada estado del pago
5. ✅ **Recuperación de Errores**: Cliente sabe qué hacer si el pago falla

---

## 📝 Próximos Pasos Sugeridos

1. ⚠️ Implementar limpieza automática de pedidos `awaiting_payment` después de X minutos
2. ⚠️ Agregar recordatorio si el usuario no completa el pago en 10-15 minutos
3. ⚠️ Dashboard para ver pedidos pendientes de pago
4. ⚠️ Métricas de tasa de conversión (links generados vs pagos completados)

---

**Fecha de Implementación**: 27 de enero de 2026  
**Estado**: ✅ Completado y Desplegado  
**Versión**: 2.0
