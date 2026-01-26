# 🔄 Flujo de Integración: Bot WhatsApp + Sistema Multi-Gateway

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura Actual del Bot](#arquitectura-actual-del-bot)
3. [Puntos de Integración](#puntos-de-integración)
4. [Flujo Completo Paso a Paso](#flujo-completo-paso-a-paso)
5. [Cambios Necesarios en el Código](#cambios-necesarios-en-el-código)
6. [Casos de Uso y Ejemplos](#casos-de-uso-y-ejemplos)
7. [Seguridad y Validación](#seguridad-y-validación)

---

## 🎯 Resumen Ejecutivo

Este documento describe **EXACTAMENTE** cómo se integra el bot de WhatsApp (que toma pedidos) con el sistema multi-gateway (que valida pagos). La integración es **no intrusiva** y agrega validación de pago **DESPUÉS** de que el cliente confirme su pedido.

### Flujo Actual (Sin Pagos)
```
Cliente → Selecciona items → Confirma pedido → Proporciona dirección → Proporciona teléfono 
   → ✅ Pedido guardado en Firebase
```

### Flujo Nuevo (Con Validación de Pagos)
```
Cliente → Selecciona items → Confirma pedido → Proporciona dirección → Proporciona teléfono 
   → 🆕 Selecciona método de pago → 🆕 Realiza pago → 🆕 Sistema valida pago 
   → ✅ Pedido guardado en Firebase
```

**Ventajas:**
- ✅ No cambia la experiencia del usuario (solo agrega paso de pago)
- ✅ Funciona con cualquier gateway (Wompi, Bold, PayU)
- ✅ El restaurante puede activar/desactivar pagos en cualquier momento
- ✅ Si no hay gateway configurado, funciona como antes (sin pago)

---

## 🏗️ Arquitectura Actual del Bot

### Flujo de Mensajes
```
WhatsApp → Webhook → whatsapp-handler.js → bot-logic.js → Firebase
                         ↓
                   Sesiones de Usuario
                   (carrito, estado, datos)
```

### Archivo: `server/bot-logic.js`
**Función principal:** `processMessage(tenantId, from, texto)`

**Flujo actual:**
1. Cliente envía mensaje
2. Bot parsea el mensaje (menú, agregar item, confirmar, etc.)
3. Bot mantiene sesión en memoria (carrito, dirección, teléfono)
4. Cuando cliente escribe "confirmar":
   - Solicita dirección → `solicitarDireccion(sesion)`
   - Solicita teléfono → `solicitarTelefono(sesion)`
   - Guarda pedido en Firebase → `confirmarPedido(sesion)`

### Estructura de Sesión (Memoria)
```javascript
{
  tenantId: 'rest123',
  telefono: '573001234567',
  carrito: [
    { numero: '1', nombre: 'Hamburguesa', precio: 15000, cantidad: 2 },
    { numero: '3', nombre: 'Coca Cola', precio: 3000, cantidad: 1 }
  ],
  direccion: 'Calle 80 #12-34',
  telefonoContacto: '3001234567',
  esperandoDireccion: false,
  esperandoTelefono: false,
  esperandoConfirmacion: false
}
```

---

## 🔌 Puntos de Integración

### 1. Después de Obtener Teléfono de Contacto

**Archivo:** `server/bot-logic.js`  
**Función:** `procesarTelefono(sesion, telefono)`  
**Línea:** ~730

**Código actual:**
```javascript
async function procesarTelefono(sesion, telefono) {
  // ... validaciones ...
  
  sesion.telefonoContacto = telefonoLimpio;
  sesion.esperandoTelefono = false;
  
  // Ahora sí confirmar el pedido con dirección y teléfono
  return await confirmarPedido(sesion);  // ← AQUÍ SE INTEGRA EL SISTEMA DE PAGOS
}
```

**Nueva implementación:**
```javascript
async function procesarTelefono(sesion, telefono) {
  // ... validaciones ...
  
  sesion.telefonoContacto = telefonoLimpio;
  sesion.esperandoTelefono = false;
  
  // 🆕 NUEVO: Verificar si el tenant tiene pagos habilitados
  const tenant = await tenantService.getTenantById(sesion.tenantId);
  const paymentsEnabled = tenant.payments?.enabled === true;
  
  if (paymentsEnabled) {
    return await solicitarMetodoPago(sesion);  // ← NUEVO FLUJO
  } else {
    return await confirmarPedido(sesion);  // ← FLUJO ANTIGUO (sin pagos)
  }
}
```

### 2. Nueva Función: Solicitar Método de Pago

**Archivo:** `server/bot-logic.js` (nuevo código)

```javascript
const paymentService = require('./payment-service');

/**
 * Solicita al cliente que seleccione un método de pago
 */
async function solicitarMetodoPago(sesion) {
  sesion.esperandoMetodoPago = true;
  
  // Obtener métodos de pago configurados para este tenant
  const metodosDisponibles = await paymentService.getAvailablePaymentMethods(sesion.tenantId);
  
  if (metodosDisponibles.length === 0) {
    // Fallback: si el restaurante no tiene gateway configurado, proceder sin pago
    console.warn(`⚠️ Tenant ${sesion.tenantId} no tiene métodos de pago configurados`);
    return await confirmarPedido(sesion);
  }
  
  // Calcular total del pedido
  const total = sesion.carrito.reduce((sum, item) => sum + item.precio, 0);
  
  let mensaje = '💳 *Selecciona tu método de pago*\n\n';
  mensaje += `💰 Total a pagar: $${formatearPrecio(total)}\n\n`;
  mensaje += '*Métodos disponibles:*\n';
  
  metodosDisponibles.forEach((metodo, index) => {
    mensaje += `${index + 1}. ${metodo.nombre}\n`;
  });
  
  mensaje += '\nResponde con el número del método que prefieres.';
  
  return mensaje;
}
```

### 3. Nueva Función: Procesar Selección de Método de Pago

```javascript
/**
 * Procesa la selección de método de pago del cliente
 */
async function procesarMetodoPago(sesion, texto) {
  const opcion = parseInt(texto.trim());
  
  const metodosDisponibles = await paymentService.getAvailablePaymentMethods(sesion.tenantId);
  
  if (isNaN(opcion) || opcion < 1 || opcion > metodosDisponibles.length) {
    return '⚠️ Opción no válida. Por favor responde con el número del método de pago.';
  }
  
  const metodoSeleccionado = metodosDisponibles[opcion - 1];
  sesion.metodoPago = metodoSeleccionado.id;
  sesion.esperandoMetodoPago = false;
  
  // Generar enlace de pago
  return await generarEnlacePago(sesion);
}
```

### 4. Nueva Función: Generar Enlace de Pago

```javascript
/**
 * Genera un enlace de pago y lo envía al cliente
 */
async function generarEnlacePago(sesion) {
  try {
    // Calcular total
    const total = sesion.carrito.reduce((sum, item) => sum + item.precio, 0);
    
    // Generar referencia única de pago
    const referencia = `${sesion.tenantId}_${Date.now()}_${sesion.telefono.slice(-4)}`;
    
    // Guardar estado del pedido (pre-pago)
    sesion.referenciaPago = referencia;
    sesion.estadoPago = 'pendiente';
    
    // Crear transacción de pago
    const pagoData = {
      tenantId: sesion.tenantId,
      referencia: referencia,
      monto: total,
      moneda: 'COP',
      cliente: {
        nombre: sesion.nombre || 'Cliente WhatsApp',
        telefono: sesion.telefonoContacto,
        email: sesion.email || `${sesion.telefono}@whatsapp.local`
      },
      items: sesion.carrito,
      metadata: {
        direccion: sesion.direccion,
        telefono: sesion.telefonoContacto,
        fuente: 'whatsapp'
      }
    };
    
    // Generar enlace de pago usando el gateway configurado
    const resultadoPago = await paymentService.createPaymentLink(
      sesion.tenantId,
      pagoData
    );
    
    if (!resultadoPago.success) {
      throw new Error('No se pudo generar el enlace de pago');
    }
    
    // Guardar transacción en Firebase (estado: pendiente)
    await firebaseService.database.ref(`tenants/${sesion.tenantId}/pagos/${referencia}`).set({
      referencia: referencia,
      estado: 'pendiente',
      monto: total,
      cliente: sesion.telefono,
      direccion: sesion.direccion,
      items: sesion.carrito,
      fechaCreacion: Date.now(),
      enlace: resultadoPago.paymentUrl
    });
    
    let mensaje = '💳 *¡Perfecto! Tu pedido está casi listo*\n\n';
    mensaje += `💰 Total a pagar: $${formatearPrecio(total)}\n`;
    mensaje += `📍 Dirección: ${sesion.direccion}\n`;
    mensaje += `📱 Teléfono: ${sesion.telefonoContacto}\n\n`;
    mensaje += '🔗 *Haz clic en el siguiente enlace para pagar:*\n';
    mensaje += `${resultadoPago.paymentUrl}\n\n`;
    mensaje += '⏱️ Una vez que completes el pago, te confirmaremos tu pedido automáticamente.\n\n';
    mensaje += '⚠️ *Importante:* El pedido solo se enviará a la cocina después de validar tu pago.';
    
    return mensaje;
    
  } catch (error) {
    console.error('❌ Error generando enlace de pago:', error);
    return '⚠️ *Error al generar enlace de pago*\n\n' +
           'Hubo un problema al procesar tu solicitud. Por favor intenta de nuevo o contacta a soporte.';
  }
}
```

### 5. Webhook: Validar Pago y Confirmar Pedido

**Archivo:** `server/routes/webhooks.js` (nuevo archivo)

```javascript
const express = require('express');
const router = express.Router();
const paymentService = require('../payment-service');
const firebaseService = require('../firebase-service');
const whatsappHandler = require('../whatsapp-handler');
const tenantService = require('../tenant-service');

/**
 * Webhook para recibir notificaciones de pago
 * Endpoint: POST /api/webhooks/payment/:gateway
 */
router.post('/payment/:gateway', async (req, res) => {
  const gateway = req.params.gateway; // 'wompi', 'bold', 'payu', etc.
  
  try {
    console.log(`📥 Webhook recibido de ${gateway}:`, JSON.stringify(req.body, null, 2));
    
    // Validar firma del webhook
    const isValid = await paymentService.validateWebhook(gateway, req.body, req.headers);
    
    if (!isValid) {
      console.error('❌ Firma de webhook inválida');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Procesar evento de pago
    const evento = await paymentService.processWebhookEvent(gateway, req.body);
    
    if (evento.tipo === 'transaction.updated' && evento.estado === 'APPROVED') {
      // Pago aprobado - confirmar pedido
      await confirmarPedidoDespuesDePago(evento);
    } else if (evento.estado === 'DECLINED') {
      // Pago rechazado - notificar al cliente
      await notificarPagoRechazado(evento);
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Confirma el pedido después de validar el pago
 */
async function confirmarPedidoDespuesDePago(evento) {
  const referencia = evento.referencia;
  const tenantId = evento.tenantId;
  
  // Obtener datos del pago de Firebase CON TRANSACCIÓN para evitar duplicados
  const pagoRef = firebaseService.database.ref(`tenants/${tenantId}/pagos/${referencia}`);
  const pagoSnapshot = await pagoRef.transaction((pagoActual) => {
    if (!pagoActual) return null;
    
    if (pagoActual.estado === 'completado') {
      // Ya fue procesado, abortar transacción
      console.log(`⚠️ Pago ${referencia} ya fue procesado anteriormente`);
      return undefined; // Aborta sin cambios
    }
    
    // Marcar como completado
    pagoActual.estado = 'completado';
    pagoActual.fechaPago = Date.now();
    pagoActual.transaccionId = evento.transaccionId;
    return pagoActual;
  });
  
  if (!pagoSnapshot.committed) {
    console.log(`⚠️ Webhook duplicado ignorado para ${referencia}`);
    return;
  }
  
  const pagoData = pagoSnapshot.snapshot.val();
  
  if (!pagoData) {
    console.error(`❌ No se encontró pago con referencia ${referencia}`);
    return;
  }
  
  // Validar monto (CRÍTICO para prevenir fraude)
  if (evento.monto !== pagoData.monto) {
    console.error(`❌ FRAUDE DETECTADO: Montos no coinciden para ${referencia}`);
    console.error(`   Esperado: ${pagoData.monto}`);
    console.error(`   Recibido: ${evento.monto}`);
    
    // NO crear pedido y notificar al admin
    await notificarFraude(tenantId, referencia, pagoData.monto, evento.monto);
    return;
  }
  
  // Obtener información del tenant
  const tenant = await tenantService.getTenantById(tenantId);
  const restaurantName = tenant.restaurant?.name || 'Restaurante';
  
  // Crear pedido en Firebase
  const numeroHex = Date.now().toString(16).slice(-6).toUpperCase();
  const pedido = {
    id: numeroHex,
    tenantId: tenantId,
    cliente: pagoData.cliente,
    telefono: pagoData.cliente,
    telefonoContacto: pagoData.metadata?.telefono || pagoData.cliente,
    direccion: pagoData.direccion,
    items: pagoData.items,
    total: pagoData.monto,
    estado: 'pendiente',
    timestamp: Date.now(),
    fecha: new Date().toISOString(),
    fuente: 'whatsapp',
    restaurante: restaurantName,
    pago: {
      referencia: referencia,
      transaccionId: evento.transaccionId,
      metodoPago: evento.metodoPago,
      gateway: evento.gateway,
      estado: 'completado',
      fechaPago: Date.now()
    }
  };
  
  await firebaseService.database
    .ref(`tenants/${tenantId}/pedidos`)
    .push(pedido);
  
  console.log(`✅ Pedido ${numeroHex} confirmado después de pago ${referencia}`);
  
  // Incrementar estadísticas del tenant
  await tenantService.incrementOrderStats(tenantId);
  
  // Enviar mensaje de confirmación al cliente por WhatsApp
  await notificarClienteConfirmacion(tenantId, pagoData.cliente, numeroHex, pagoData.monto, evento.metodoPago);
}

/**
 * Notifica al cliente que su pedido fue confirmado
 */
async function notificarClienteConfirmacion(tenantId, telefono, numeroPedido, total, metodoPago) {
  try {
    const formatearPrecio = (precio) => {
      return Number(precio).toLocaleString('es-CO');
    };
    
    const mensaje = `🎉 *¡Pago confirmado!*\n\n` +
                    `Tu pedido #${numeroPedido} ha sido confirmado y enviado a la cocina.\n\n` +
                    `💰 Pago procesado: $${formatearPrecio(total)}\n` +
                    `💳 Método: ${metodoPago}\n\n` +
                    `🕒 Tiempo estimado: 30-40 minutos\n` +
                    `Te llamaremos cuando el domiciliario esté en camino. 🛵`;
    
    await whatsappHandler.sendTextMessage(tenantId, telefono, mensaje);
  } catch (error) {
    console.error('❌ Error enviando notificación de confirmación:', error);
  }
}

/**
 * Notifica al cliente que su pago fue rechazado
 */
async function notificarPagoRechazado(evento) {
  try {
    const referencia = evento.referencia;
    const tenantId = evento.tenantId;
    
    // Obtener datos del pago
    const pagoSnapshot = await firebaseService.database
      .ref(`tenants/${tenantId}/pagos/${referencia}`)
      .once('value');
    
    const pagoData = pagoSnapshot.val();
    
    if (!pagoData) return;
    
    // Actualizar estado
    await firebaseService.database
      .ref(`tenants/${tenantId}/pagos/${referencia}`)
      .update({
        estado: 'rechazado',
        motivoRechazo: evento.mensaje || 'Pago rechazado'
      });
    
    // Notificar al cliente
    const mensaje = '❌ *Pago rechazado*\n\n' +
                    `Motivo: ${evento.mensaje || 'No especificado'}\n\n` +
                    'Por favor intenta de nuevo con otro método de pago o verifica tus fondos.\n\n' +
                    'Responde *menu* si quieres hacer un nuevo pedido.';
    
    await whatsappHandler.sendTextMessage(tenantId, pagoData.cliente, mensaje);
  } catch (error) {
    console.error('❌ Error notificando pago rechazado:', error);
  }
}

/**
 * Notifica al admin sobre posible fraude
 */
async function notificarFraude(tenantId, referencia, montoEsperado, montoRecibido) {
  // TODO: Implementar notificación a admin (email, Slack, etc.)
  console.error(`🚨 ALERTA DE FRAUDE`);
  console.error(`   Tenant: ${tenantId}`);
  console.error(`   Referencia: ${referencia}`);
  console.error(`   Monto esperado: ${montoEsperado}`);
  console.error(`   Monto recibido: ${montoRecibido}`);
}

module.exports = router;
```

---

## 📊 Flujo Completo Paso a Paso

### Diagrama de Secuencia Detallado

```
┌─────────┐          ┌──────────┐          ┌───────────┐          ┌─────────┐          ┌──────────┐
│ Cliente │          │    Bot   │          │  Payment  │          │ Gateway │          │ Firebase │
│WhatsApp │          │  Logic   │          │  Service  │          │ (Wompi) │          │          │
└────┬────┘          └─────┬────┘          └─────┬─────┘          └────┬────┘          └────┬─────┘
     │                     │                      │                     │                    │
     │ 1. "Quiero 2       │                      │                     │                    │
     │    hamburguesas"    │                      │                     │                    │
     ├────────────────────>│                      │                     │                    │
     │                     │                      │                     │                    │
     │ 2. "¿Confirmas?     │                      │                     │                    │
     │     Total: $30.000" │                      │                     │                    │
     │<────────────────────┤                      │                     │                    │
     │                     │                      │                     │                    │
     │ 3. "Sí"             │                      │                     │                    │
     ├────────────────────>│                      │                     │                    │
     │                     │                      │                     │                    │
     │ 4. "¿Dirección?"    │                      │                     │                    │
     │<────────────────────┤                      │                     │                    │
     │                     │                      │                     │                    │
     │ 5. "Calle 80 #12"   │                      │                     │                    │
     ├────────────────────>│                      │                     │                    │
     │                     │                      │                     │                    │
     │ 6. "¿Teléfono?"     │                      │                     │                    │
     │<────────────────────┤                      │                     │                    │
     │                     │                      │                     │                    │
     │ 7. "3001234567"     │                      │                     │                    │
     ├────────────────────>│                      │                     │                    │
     │                     │                      │                     │                    │
     │                     │ 🆕 8. getAvailableMethods()                 │                    │
     │                     ├─────────────────────>│                     │                    │
     │                     │                      │                     │                    │
     │                     │ 9. [Wompi, Bold]     │                     │                    │
     │                     │<─────────────────────┤                     │                    │
     │                     │                      │                     │                    │
     │ 10. "Selecciona     │                      │                     │                    │
     │     método:         │                      │                     │                    │
     │     1. Wompi        │                      │                     │                    │
     │     2. Bold"        │                      │                     │                    │
     │<────────────────────┤                      │                     │                    │
     │                     │                      │                     │                    │
     │ 11. "1" (Wompi)     │                      │                     │                    │
     ├────────────────────>│                      │                     │                    │
     │                     │                      │                     │                    │
     │                     │ 🆕 12. createPaymentLink({                  │                    │
     │                     │        referencia,                          │                    │
     │                     │        monto: 30000,                        │                    │
     │                     │        cliente: {...}                       │                    │
     │                     │      })                                     │                    │
     │                     ├─────────────────────>│                     │                    │
     │                     │                      │                     │                    │
     │                     │                      │ 13. POST /merchants/                     │
     │                     │                      │     {transaction}   │                    │
     │                     │                      ├────────────────────>│                    │
     │                     │                      │                     │                    │
     │                     │                      │ 14. {paymentUrl}    │                    │
     │                     │                      │<────────────────────┤                    │
     │                     │                      │                     │                    │
     │                     │                      │ 15. Save pending payment                 │
     │                     │                      ├─────────────────────────────────────────>│
     │                     │                      │                     │                    │
     │                     │ 16. {               │                     │                    │
     │                     │       success: true,│                     │                    │
     │                     │       paymentUrl    │                     │                    │
     │                     │     }               │                     │                    │
     │                     │<─────────────────────┤                     │                    │
     │                     │                      │                     │                    │
     │ 17. "💳 Paga aquí:  │                      │                     │                    │
     │     wompi.co/xyz"   │                      │                     │                    │
     │<────────────────────┤                      │                     │                    │
     │                     │                      │                     │                    │
     │ 18. [Click enlace]  │                      │                     │                    │
     ├──────────────────────────────────────────────────────────────────>│                    │
     │                     │                      │                     │                    │
     │ 19. Ingresa datos   │                      │                     │                    │
     │     de pago (Nequi) │                      │                     │                    │
     ├<─────────────────────────────────────────────────────────────────┤                    │
     │                     │                      │                     │                    │
     │ 20. ✅ "Pago        │                      │                     │                    │
     │     exitoso"        │                      │                     │                    │
     │<────────────────────────────────────────────────────────────────┤                     │
     │                     │                      │                     │                    │
     │                     │                      │ 🔔 21. POST /webhooks/payment/wompi     │
     │                     │                      │     {                                    │
     │                     │                      │       event: "transaction.updated",      │
     │                     │                      │       status: "APPROVED",                │
     │                     │                      │       reference: "...",                  │
     │                     │                      │       signature: "..."                   │
     │                     │                      │     }                                    │
     │                     │                      │<────────────────────┤                    │
     │                     │                      │                     │                    │
     │                     │                      │ 22. validateWebhook() ✅                 │
     │                     │                      │                     │                    │
     │                     │                      │ 23. processWebhookEvent()                │
     │                     │                      │     → APPROVED      │                    │
     │                     │                      │                     │                    │
     │                     │                      │ 24. Update payment status                │
     │                     │                      ├─────────────────────────────────────────>│
     │                     │                      │     (Transaction)   │                    │
     │                     │                      │                     │                    │
     │                     │                      │ 25. Create order    │                    │
     │                     │                      ├─────────────────────────────────────────>│
     │                     │                      │                     │                    │
     │ 26. 🎉 "¡Pago       │<─ sendTextMessage() ─┤                     │                    │
     │     confirmado!     │                      │                     │                    │
     │     Pedido #A3F5B2" │                      │                     │                    │
     │<────────────────────┤                      │                     │                    │
     │                     │                      │                     │                    │
```

### Explicación de Cada Paso

#### Pasos 1-7: Tomar Pedido (Sin Cambios)
El bot sigue funcionando exactamente igual que antes:
- Cliente solicita items
- Bot confirma el pedido
- Solicita dirección de entrega
- Solicita teléfono de contacto

#### Pasos 8-9: Verificar Métodos de Pago Disponibles (NUEVO)
```javascript
// bot-logic.js, en procesarTelefono()
const tenant = await tenantService.getTenantById(sesion.tenantId);
if (tenant.payments?.enabled === true) {
  const metodos = await paymentService.getAvailablePaymentMethods(tenantId);
  // ...
}
```

**Firebase:** Lee configuración del tenant:
```javascript
tenants/rest123/payments:
{
  enabled: true,
  wompi: {
    enabled: true,
    publicKey: "pub_test_xxx",
    privateKey: "prv_test_yyy"
  },
  bold: {
    enabled: false
  }
}
```

#### Pasos 10-11: Cliente Selecciona Método (NUEVO)
Bot muestra opciones disponibles y cliente responde con número.

#### Pasos 12-16: Generar Enlace de Pago (NUEVO)
1. `bot-logic.js` llama a `paymentService.createPaymentLink()`
2. `payment-service.js` determina qué gateway usar (Wompi en este caso)
3. `wompi-adapter.js` crea transacción en Wompi API
4. Wompi devuelve URL de checkout
5. Se guarda transacción en Firebase con estado "pendiente"

#### Paso 17: Enviar Enlace al Cliente
Bot envía mensaje con el enlace de pago.

#### Pasos 18-20: Cliente Paga
Cliente hace clic, ingresa datos de pago, y Wompi procesa la transacción.

#### Pasos 21-25: Webhook Confirma Pago (NUEVO)
1. Wompi envía webhook POST a `/api/webhooks/payment/wompi`
2. Servidor valida firma del webhook (CRÍTICO)
3. Extrae referencia del pago
4. Actualiza estado en Firebase usando transacción (evita duplicados)
5. Valida que el monto sea correcto (previene fraude)
6. Crea pedido en Firebase

#### Paso 26: Notificar al Cliente
Bot envía confirmación automática por WhatsApp.

---

## 🛠️ Cambios Necesarios en el Código

### 1. Archivo: `server/bot-logic.js`

#### A. Agregar require de payment-service

```javascript
// Al inicio del archivo, después de los requires existentes
const paymentService = require('./payment-service');
```

#### B. Modificar función `procesarTelefono()`

**UBICACIÓN:** Línea ~720

**ANTES:**
```javascript
async function procesarTelefono(sesion, telefono) {
  // ... validaciones ...
  
  sesion.telefonoContacto = telefonoLimpio;
  sesion.esperandoTelefono = false;
  
  // Ahora sí confirmar el pedido con dirección y teléfono
  return await confirmarPedido(sesion);
}
```

**DESPUÉS:**
```javascript
async function procesarTelefono(sesion, telefono) {
  // Limpiar teléfono: remover espacios, guiones, paréntesis
  const telefonoLimpio = telefono.replaceAll(/[\s\-()]/g, '');
  
  // Validación: debe tener 10 dígitos y solo números
  const soloNumeros = /^\d+$/.test(telefonoLimpio);
  const longitudCorrecta = telefonoLimpio.length === 10;
  
  if (!soloNumeros || !longitudCorrecta) {
    return '⚠️ *Número de teléfono no válido*\n\n' +
           'Por favor envía un número de teléfono válido de 10 dígitos.\n\n' +
           '📝 *Ejemplos válidos:*\n' +
           '• 3001234567\n' +
           '• 300 123 4567\n' +
           '• 300-123-4567\n\n' +
           '¿Cuál es tu número de contacto? ☎️';
  }
  
  // Guardar teléfono
  sesion.telefonoContacto = telefonoLimpio;
  sesion.esperandoTelefono = false;
  
  // 🆕 NUEVO: Verificar si el tenant tiene pagos habilitados
  try {
    const tenant = await tenantService.getTenantById(sesion.tenantId);
    const paymentsEnabled = tenant.payments?.enabled === true;
    
    if (paymentsEnabled) {
      // Verificar si hay métodos de pago disponibles
      const metodosDisponibles = await paymentService.getAvailablePaymentMethods(sesion.tenantId);
      
      if (metodosDisponibles.length > 0) {
        return await solicitarMetodoPago(sesion);  // ← NUEVO FLUJO
      }
    }
    
    // Fallback: si no hay pagos habilitados o no hay métodos disponibles
    return await confirmarPedido(sesion);  // ← FLUJO ANTIGUO
    
  } catch (error) {
    console.error('❌ Error verificando configuración de pagos:', error);
    // En caso de error, proceder sin pago
    return await confirmarPedido(sesion);
  }
}
```

#### C. Agregar condición en `processMessage()` para detectar selección de método

**UBICACIÓN:** Línea ~220, después de las validaciones de dirección y teléfono

```javascript
async function processMessage(tenantId, from, texto) {
  // ... código existente ...
  
  // Si está esperando dirección, validar y guardar
  if (sesion.esperandoDireccion) {
    return await procesarDireccion(sesion, textoOriginal);
  }
  
  // Si está esperando teléfono, validar y guardar
  if (sesion.esperandoTelefono) {
    return await procesarTelefono(sesion, textoOriginal);
  }
  
  // 🆕 NUEVO: Si está esperando método de pago
  if (sesion.esperandoMetodoPago) {
    return await procesarMetodoPago(sesion, texto);
  }
  
  // ... resto del código ...
}
```

#### D. Agregar nuevas funciones al final del archivo

```javascript
/**
 * Solicita al cliente que seleccione un método de pago
 */
async function solicitarMetodoPago(sesion) {
  sesion.esperandoMetodoPago = true;
  
  try {
    // Obtener métodos de pago configurados para este tenant
    const metodosDisponibles = await paymentService.getAvailablePaymentMethods(sesion.tenantId);
    
    if (metodosDisponibles.length === 0) {
      // Fallback: si el restaurante no tiene gateway configurado, proceder sin pago
      console.warn(`⚠️ Tenant ${sesion.tenantId} no tiene métodos de pago configurados`);
      sesion.esperandoMetodoPago = false;
      return await confirmarPedido(sesion);
    }
    
    // Calcular total del pedido
    const total = sesion.carrito.reduce((sum, item) => sum + item.precio, 0);
    
    let mensaje = '💳 *Selecciona tu método de pago*\n\n';
    mensaje += `💰 Total a pagar: $${formatearPrecio(total)}\n\n`;
    mensaje += '*Métodos disponibles:*\n';
    
    metodosDisponibles.forEach((metodo, index) => {
      mensaje += `${index + 1}. ${metodo.nombre}\n`;
    });
    
    mensaje += '\nResponde con el número del método que prefieres.';
    
    return mensaje;
    
  } catch (error) {
    console.error('❌ Error solicitando método de pago:', error);
    sesion.esperandoMetodoPago = false;
    return await confirmarPedido(sesion);
  }
}

/**
 * Procesa la selección de método de pago del cliente
 */
async function procesarMetodoPago(sesion, texto) {
  try {
    const opcion = parseInt(texto.trim());
    
    const metodosDisponibles = await paymentService.getAvailablePaymentMethods(sesion.tenantId);
    
    if (isNaN(opcion) || opcion < 1 || opcion > metodosDisponibles.length) {
      return '⚠️ Opción no válida. Por favor responde con el número del método de pago.';
    }
    
    const metodoSeleccionado = metodosDisponibles[opcion - 1];
    sesion.metodoPago = metodoSeleccionado.id;
    sesion.esperandoMetodoPago = false;
    
    // Generar enlace de pago
    return await generarEnlacePago(sesion);
    
  } catch (error) {
    console.error('❌ Error procesando método de pago:', error);
    return '⚠️ *Error al procesar tu selección*\n\nPor favor intenta de nuevo.';
  }
}

/**
 * Genera un enlace de pago y lo envía al cliente
 */
async function generarEnlacePago(sesion) {
  try {
    // Calcular total
    const total = sesion.carrito.reduce((sum, item) => sum + item.precio, 0);
    
    // Generar referencia única de pago
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const referencia = `${sesion.tenantId}_${timestamp}_${randomSuffix}`;
    
    // Guardar estado del pedido (pre-pago)
    sesion.referenciaPago = referencia;
    sesion.estadoPago = 'pendiente';
    
    // Crear transacción de pago
    const pagoData = {
      tenantId: sesion.tenantId,
      referencia: referencia,
      monto: total,
      moneda: 'COP',
      cliente: {
        nombre: sesion.nombre || 'Cliente WhatsApp',
        telefono: sesion.telefonoContacto,
        email: sesion.email || `${sesion.telefono}@whatsapp.local`
      },
      items: sesion.carrito,
      metadata: {
        direccion: sesion.direccion,
        telefono: sesion.telefonoContacto,
        fuente: 'whatsapp',
        clienteWhatsApp: sesion.telefono
      }
    };
    
    // Generar enlace de pago usando el gateway configurado
    const resultadoPago = await paymentService.createPaymentLink(
      sesion.tenantId,
      pagoData
    );
    
    if (!resultadoPago.success) {
      throw new Error(resultadoPago.error || 'No se pudo generar el enlace de pago');
    }
    
    // Guardar transacción en Firebase (estado: pendiente)
    await firebaseService.database.ref(`tenants/${sesion.tenantId}/pagos/${referencia}`).set({
      referencia: referencia,
      estado: 'pendiente',
      monto: total,
      cliente: sesion.telefono,
      direccion: sesion.direccion,
      telefonoContacto: sesion.telefonoContacto,
      items: sesion.carrito,
      fechaCreacion: timestamp,
      enlace: resultadoPago.paymentUrl,
      gateway: resultadoPago.gateway,
      transaccionId: resultadoPago.transactionId
    });
    
    console.log(`✅ Enlace de pago generado para ${sesion.tenantId}: ${referencia}`);
    
    let mensaje = '💳 *¡Perfecto! Tu pedido está casi listo*\n\n';
    mensaje += `💰 Total a pagar: $${formatearPrecio(total)}\n`;
    mensaje += `📍 Dirección: ${sesion.direccion}\n`;
    mensaje += `📱 Teléfono: ${sesion.telefonoContacto}\n\n`;
    mensaje += '🔗 *Haz clic en el siguiente enlace para pagar:*\n';
    mensaje += `${resultadoPago.paymentUrl}\n\n`;
    mensaje += '⏱️ Una vez que completes el pago, te confirmaremos tu pedido automáticamente.\n\n';
    mensaje += '⚠️ *Importante:* El pedido solo se enviará a la cocina después de validar tu pago.';
    
    return mensaje;
    
  } catch (error) {
    console.error('❌ Error generando enlace de pago:', error);
    console.error('   Stack:', error.stack);
    
    return '⚠️ *Error al generar enlace de pago*\n\n' +
           'Hubo un problema al procesar tu solicitud. Por favor intenta de nuevo o contacta a soporte.\n\n' +
           'Puedes responder *menu* para hacer un nuevo pedido.';
  }
}
```

### 2. Archivo: `server/payment-service.js` (NUEVO)

Crear este archivo completo con todo el código mostrado en la sección de "Puntos de Integración".

### 3. Archivo: `server/routes/webhooks.js` (NUEVO)

Crear este archivo completo con todo el código mostrado en la sección de "Webhooks".

### 4. Archivo: `server/app.js` (MODIFICAR)

```javascript
// Agregar después de las rutas existentes
const webhooksRouter = require('./routes/webhooks');
app.use('/api/webhooks', webhooksRouter);
```

---

## 🎭 Casos de Uso y Ejemplos

### Caso 1: Flujo Completo Exitoso ✅

**Escenario:** Cliente hace pedido, selecciona Wompi, paga con Nequi, recibe confirmación.

```
Cliente: "Quiero 2 hamburguesas y 1 coca cola"
Bot: "Perfecto, llevas: 2 hamburguesas y 1 coca cola. Total: $33.000. ¿Confirmas?"
Cliente: "Sí"
Bot: "¿A dónde enviamos tu pedido?"
Cliente: "Calle 80 #12-34"
Bot: "¿Cuál es tu número de contacto?"
Cliente: "3001234567"
Bot: "💳 Selecciona tu método de pago
      Total: $33.000
      Métodos disponibles:
      1. Wompi (Tarjeta/Nequi/PSE)
      2. Bold (Tarjeta)
      
      Responde con el número del método que prefieres."
Cliente: "1"
Bot: "💳 ¡Perfecto! Tu pedido está casi listo

      💰 Total a pagar: $33.000
      📍 Dirección: Calle 80 #12-34
      📱 Teléfono: 3001234567

      🔗 Haz clic en el siguiente enlace para pagar:
      https://checkout.wompi.co/l/xyz123

      ⏱️ Una vez que completes el pago, te confirmaremos tu pedido automáticamente.

      ⚠️ Importante: El pedido solo se enviará a la cocina después de validar tu pago."

[Cliente hace clic y paga con Nequi]

[5 segundos después, automáticamente:]

Bot: "🎉 ¡Pago confirmado!

      Tu pedido #A3F5B2 ha sido confirmado y enviado a la cocina.

      💰 Pago procesado: $33.000
      💳 Método: Nequi

      🕒 Tiempo estimado: 30-40 minutos
      Te llamaremos cuando el domiciliario esté en camino. 🛵"
```

**Estado en Firebase:**
```javascript
// tenants/rest123/pagos/rest123_1738281234_abc123
{
  referencia: "rest123_1738281234_abc123",
  estado: "completado",
  monto: 33000,
  cliente: "573001234567",
  direccion: "Calle 80 #12-34",
  telefonoContacto: "3001234567",
  items: [...],
  fechaCreacion: 1738281234000,
  fechaPago: 1738281245000,
  enlace: "https://checkout.wompi.co/l/xyz123",
  gateway: "wompi",
  transaccionId: "987654-wompi"
}

// tenants/rest123/pedidos/-N1234567890
{
  id: "A3F5B2",
  tenantId: "rest123",
  cliente: "573001234567",
  telefono: "573001234567",
  telefonoContacto: "3001234567",
  direccion: "Calle 80 #12-34",
  items: [...],
  total: 33000,
  estado: "pendiente",
  timestamp: 1738281245000,
  fecha: "2025-01-30T12:34:05.000Z",
  fuente: "whatsapp",
  pago: {
    referencia: "rest123_1738281234_abc123",
    transaccionId: "987654-wompi",
    metodoPago: "Nequi",
    gateway: "wompi",
    estado: "completado",
    fechaPago: 1738281245000
  }
}
```

### Caso 2: Cliente No Paga (Pago Pendiente) ⏳

**Escenario:** Cliente recibe enlace pero no completa el pago.

```
[Flujo normal hasta generar enlace...]

Bot: "Haz clic aquí para pagar: https://checkout.wompi.co/l/xyz123"

[Cliente hace clic, ve el checkout de Wompi, pero cierra la pestaña sin pagar]
```

**Resultado:**
- Pago queda en estado "pendiente" en Firebase
- NO se crea pedido
- Cliente puede hacer clic en el enlace de nuevo más tarde
- **OPCIONAL:** Implementar recordatorio automático después de 10 minutos

**Implementación de Recordatorio (OPCIONAL):**

```javascript
// En generarEnlacePago(), al final:
const referencia = ...;

// Programar recordatorio para 10 minutos después
setTimeout(async () => {
  try {
    const pagoSnapshot = await firebaseService.database
      .ref(`tenants/${sesion.tenantId}/pagos/${referencia}`)
      .once('value');
    
    const pagoData = pagoSnapshot.val();
    
    // Si el pago sigue pendiente después de 10 minutos
    if (pagoData && pagoData.estado === 'pendiente') {
      const mensaje = '⏱️ *Recordatorio de pago pendiente*\n\n' +
                      `Tienes un pago pendiente de $${formatearPrecio(pagoData.monto)}.\n\n` +
                      `🔗 Enlace de pago:\n${pagoData.enlace}\n\n` +
                      '¿Necesitas ayuda para completarlo?\n' +
                      'Responde *menu* si prefieres hacer un nuevo pedido.';
      
      await whatsappHandler.sendTextMessage(sesion.tenantId, pagoData.cliente, mensaje);
    }
  } catch (error) {
    console.error('❌ Error enviando recordatorio de pago:', error);
  }
}, 10 * 60 * 1000); // 10 minutos
```

### Caso 3: Pago Rechazado ❌

**Escenario:** Cliente intenta pagar pero el pago es rechazado por el banco.

**Webhook de Wompi:**
```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "987654-wompi",
      "reference": "rest123_1738281234_abc123",
      "status": "DECLINED",
      "status_message": "Fondos insuficientes",
      "amount_in_cents": 3300000
    }
  },
  "signature": { ... }
}
```

**Acción del servidor:**
```javascript
// En webhooks.js, función processWebhookEvent:
if (evento.estado === 'DECLINED') {
  await notificarPagoRechazado(evento);
}

async function notificarPagoRechazado(evento) {
  // Actualizar estado del pago
  await firebaseService.database
    .ref(`tenants/${tenantId}/pagos/${referencia}`)
    .update({
      estado: 'rechazado',
      motivoRechazo: evento.mensaje,
      fechaRechazo: Date.now()
    });
  
  // Obtener datos del pago para notificar
  const pagoSnapshot = await firebaseService.database
    .ref(`tenants/${tenantId}/pagos/${referencia}`)
    .once('value');
  
  const pagoData = pagoSnapshot.val();
  
  // Notificar al cliente
  const mensaje = '❌ *Pago rechazado*\n\n' +
                  `Motivo: ${evento.mensaje}\n\n` +
                  'Por favor:\n' +
                  '• Verifica que tengas fondos suficientes\n' +
                  '• Intenta con otro método de pago\n' +
                  '• O contacta a tu banco\n\n' +
                  'Responde *menu* si quieres hacer un nuevo pedido.';
  
  await whatsappHandler.sendTextMessage(tenantId, pagoData.cliente, mensaje);
}
```

**Resultado:**
- Pago marcado como "rechazado" en Firebase
- Cliente recibe notificación automática
- NO se crea pedido
- Cliente puede intentar de nuevo

### Caso 4: Restaurante Sin Pagos Configurados 🔧

**Escenario:** Restaurante no tiene gateway configurado, o pagos están deshabilitados.

**Firebase:**
```javascript
tenants/rest123/payments:
{
  enabled: false  // ← Pagos deshabilitados
}

// O simplemente no existe el nodo "payments"
```

**Flujo:**
```javascript
// En procesarTelefono():
const tenant = await tenantService.getTenantById(sesion.tenantId);
const paymentsEnabled = tenant.payments?.enabled === true;  // false

if (paymentsEnabled) {
  // ...
} else {
  return await confirmarPedido(sesion);  // ← PROCEDE SIN PAGO
}
```

**Resultado:**
- Bot funciona exactamente como antes (sin pago)
- Pedido se crea inmediatamente después de obtener teléfono
- No se solicita método de pago

### Caso 5: Pago Exitoso pero Webhook No Llega 🔄

**Escenario:** Cliente paga, Wompi aprueba, pero el webhook falla o se demora.

**Causas posibles:**
- Red caída temporalmente
- Servidor saturado
- Wompi con problemas internos

**Solución: Polling Manual (OPCIONAL)**

```javascript
// server/payment-poller.js (nuevo archivo)
const paymentService = require('./payment-service');
const firebaseService = require('./firebase-service');

/**
 * Verifica pagos pendientes cada 2 minutos
 */
async function pollPendingPayments() {
  try {
    const tenantsSnapshot = await firebaseService.database.ref('tenants').once('value');
    const tenants = tenantsSnapshot.val();
    
    for (const tenantId in tenants) {
      const pagosSnapshot = await firebaseService.database
        .ref(`tenants/${tenantId}/pagos`)
        .orderByChild('estado')
        .equalTo('pendiente')
        .once('value');
      
      const pagos = pagosSnapshot.val();
      
      if (!pagos) continue;
      
      for (const pagoId in pagos) {
        const pago = pagos[pagoId];
        
        // Solo verificar pagos creados hace más de 2 minutos
        if (Date.now() - pago.fechaCreacion < 2 * 60 * 1000) continue;
        
        // Si el pago tiene más de 30 minutos, marcarlo como expirado
        if (Date.now() - pago.fechaCreacion > 30 * 60 * 1000) {
          await firebaseService.database
            .ref(`tenants/${tenantId}/pagos/${pagoId}`)
            .update({ estado: 'expirado' });
          continue;
        }
        
        // Consultar estado actual en el gateway
        const estadoActual = await paymentService.checkPaymentStatus(
          tenantId,
          pago.referencia,
          pago.gateway
        );
        
        if (estadoActual === 'APPROVED') {
          // Pago fue aprobado pero no recibimos el webhook
          console.log(`🔄 Pago aprobado detectado por polling: ${pago.referencia}`);
          
          // Simular evento de webhook
          const evento = {
            tipo: 'transaction.updated',
            estado: 'APPROVED',
            referencia: pago.referencia,
            tenantId: tenantId,
            transaccionId: pago.transaccionId,
            monto: pago.monto,
            metodoPago: 'Desconocido',
            gateway: pago.gateway
          };
          
          await confirmarPedidoDespuesDePago(evento);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error en payment poller:', error);
  }
}

// Ejecutar cada 2 minutos
setInterval(pollPendingPayments, 2 * 60 * 1000);

module.exports = { pollPendingPayments };
```

**Agregar en `server/app.js`:**
```javascript
require('./payment-poller'); // Iniciar poller
```

---

## 🔒 Seguridad y Validación

### 1. Validación de Webhooks (CRÍTICO ⚠️)

**SIEMPRE** validar la firma del webhook para evitar fraudes.

```javascript
// server/payments/adapters/wompi-adapter.js
async validateWebhook(body, headers) {
  const signature = headers['x-event-signature'];
  const secret = this.config.eventSecret; // WOMPI_EVENT_SECRET
  
  const calculatedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  
  const isValid = signature === calculatedSignature;
  
  if (!isValid) {
    console.error('❌ Firma de webhook inválida');
    console.error(`   Recibida: ${signature}`);
    console.error(`   Calculada: ${calculatedSignature}`);
  }
  
  return isValid;
}
```

**Wompi:**
- Usa header `X-Event-Signature`
- HMAC-SHA256 del body con el `event_secret`

**Bold:**
- Incluye `token` en el body que debe coincidir con tu token configurado

**PayU:**
- Usa firma MD5 del formato: `ApiKey~merchantId~referenceCode~amount~currency~state`

### 2. Prevenir Procesamiento Duplicado (CRÍTICO ⚠️)

Los gateways pueden enviar el mismo webhook múltiples veces. SIEMPRE usar transacciones de Firebase.

```javascript
async function confirmarPedidoDespuesDePago(evento) {
  const referencia = evento.referencia;
  const tenantId = evento.tenantId;
  
  // Usar TRANSACCIÓN para evitar race conditions
  const pagoRef = firebaseService.database.ref(`tenants/${tenantId}/pagos/${referencia}`);
  const pagoSnapshot = await pagoRef.transaction((pagoActual) => {
    if (!pagoActual) {
      console.error(`❌ Pago ${referencia} no encontrado`);
      return null; // Abortar
    }
    
    if (pagoActual.estado === 'completado') {
      // Ya fue procesado, abortar transacción
      console.log(`⚠️ Pago ${referencia} ya fue procesado anteriormente`);
      return undefined; // Aborta sin cambios
    }
    
    // Marcar como completado
    pagoActual.estado = 'completado';
    pagoActual.fechaPago = Date.now();
    pagoActual.transaccionId = evento.transaccionId;
    return pagoActual; // Commit
  });
  
  if (!pagoSnapshot.committed) {
    console.log(`⚠️ Webhook duplicado ignorado para ${referencia}`);
    return; // Salir sin crear pedido
  }
  
  // Proceder a crear el pedido...
  console.log(`✅ Procesando pago ${referencia} por primera vez`);
  // ...
}
```

### 3. Validar Monto del Pago (CRÍTICO ⚠️)

**SIEMPRE** validar que el monto pagado coincida con el esperado.

```javascript
async function confirmarPedidoDespuesDePago(evento) {
  const pagoData = /* ... obtener de Firebase ... */;
  
  // Validar monto
  if (evento.monto !== pagoData.monto) {
    console.error(`❌ FRAUDE DETECTADO: Montos no coinciden`);
    console.error(`   Referencia: ${evento.referencia}`);
    console.error(`   Esperado: ${pagoData.monto}`);
    console.error(`   Recibido: ${evento.monto}`);
    
    // Marcar como fraudulento
    await firebaseService.database
      .ref(`tenants/${tenantId}/pagos/${referencia}`)
      .update({
        estado: 'fraude_detectado',
        montoEsperado: pagoData.monto,
        montoRecibido: evento.monto
      });
    
    // NO crear pedido
    // Notificar al admin inmediatamente
    await notificarFraude(tenantId, referencia, pagoData.monto, evento.monto);
    return;
  }
  
  // Monto correcto, proceder...
}
```

### 4. Rate Limiting en Webhooks

Prevenir ataques DDoS al endpoint de webhooks.

```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // Máximo 100 requests por minuto
  message: { error: 'Too many webhook requests' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

router.post('/payment/:gateway', webhookLimiter, async (req, res) => {
  // ... procesar webhook ...
});
```

### 5. Logs de Auditoría

Registrar TODOS los eventos de pago para auditoría.

```javascript
async function logPaymentEvent(tenantId, evento, tipo, datos) {
  await firebaseService.database
    .ref(`tenants/${tenantId}/analytics/payment_events`)
    .push({
      timestamp: Date.now(),
      tipo: tipo,
      evento: evento,
      datos: datos,
      ip: datos.ip || null
    });
}

// Uso:
await logPaymentEvent(tenantId, 'pago_iniciado', 'info', {
  referencia: referencia,
  monto: total,
  gateway: 'wompi'
});

await logPaymentEvent(tenantId, 'webhook_recibido', 'info', {
  gateway: gateway,
  referencia: referencia,
  estado: evento.estado,
  ip: req.ip
});

await logPaymentEvent(tenantId, 'pedido_confirmado', 'success', {
  referencia: referencia,
  pedidoId: numeroHex
});
```

### 6. Configuración de Entorno Segura

**NUNCA** hardcodear credenciales. SIEMPRE usar variables de entorno.

```javascript
// .env
WOMPI_PUBLIC_KEY=pub_prod_xxx
WOMPI_PRIVATE_KEY=prv_prod_yyy
WOMPI_EVENT_SECRET=secret_prod_zzz

BOLD_API_KEY=your_bold_key
BOLD_WEBHOOK_TOKEN=your_bold_token

PAYU_API_KEY=your_payu_key
PAYU_API_LOGIN=your_payu_login
PAYU_MERCHANT_ID=12345

BASE_URL=https://tuservidor.com
```

```javascript
// server/payments/adapters/wompi-adapter.js
class WompiAdapter {
  constructor(config) {
    this.publicKey = config.publicKey || process.env.WOMPI_PUBLIC_KEY;
    this.privateKey = config.privateKey || process.env.WOMPI_PRIVATE_KEY;
    this.eventSecret = config.eventSecret || process.env.WOMPI_EVENT_SECRET;
    
    if (!this.privateKey || !this.eventSecret) {
      throw new Error('Wompi credentials not configured');
    }
  }
  // ...
}
```

---

## ✅ Checklist de Implementación

### Fase 1: Código Base (2 días)
- [ ] Crear `server/payment-service.js`
- [ ] Crear `server/payments/gateway-manager.js`
- [ ] Crear `server/payments/adapters/wompi-adapter.js`
- [ ] Crear `server/payments/adapters/bold-adapter.js`
- [ ] Crear `server/routes/webhooks.js`
- [ ] Agregar ruta de webhooks en `server/app.js`

### Fase 2: Modificar Bot (1 día)
- [ ] Agregar `require('./payment-service')` en `bot-logic.js`
- [ ] Modificar `procesarTelefono()` para verificar pagos habilitados
- [ ] Agregar `solicitarMetodoPago()` en `bot-logic.js`
- [ ] Agregar `procesarMetodoPago()` en `bot-logic.js`
- [ ] Agregar `generarEnlacePago()` en `bot-logic.js`
- [ ] Agregar condición en `processMessage()` para detectar selección de método

### Fase 3: Webhooks (1 día)
- [ ] Implementar validación de firmas para Wompi
- [ ] Implementar validación de firmas para Bold
- [ ] Implementar prevención de duplicados (transacciones Firebase)
- [ ] Implementar `confirmarPedidoDespuesDePago()`
- [ ] Implementar `notificarClienteConfirmacion()`
- [ ] Implementar manejo de estados: APPROVED, DECLINED, PENDING

### Fase 4: Seguridad (1 día)
- [ ] Rate limiting en webhooks
- [ ] Validación de montos (prevenir fraude)
- [ ] Logs de auditoría estructurados
- [ ] Alertas de fraude (notificar admin)
- [ ] Configurar variables de entorno (.env)

### Fase 5: Testing en Sandbox (2 días)
- [ ] Configurar cuenta de prueba en Wompi
- [ ] Probar flujo completo con pago exitoso
- [ ] Probar pago rechazado
- [ ] Probar webhook duplicado
- [ ] Probar monto incorrecto
- [ ] Probar firma inválida
- [ ] Probar sin gateway configurado (fallback)

### Fase 6: Documentación (1 día)
- [ ] Documentar para restaurantes cómo configurar Wompi
- [ ] Documentar para restaurantes cómo configurar Bold
- [ ] Crear video tutorial paso a paso
- [ ] Crear guía de troubleshooting
- [ ] Documentar códigos de error y soluciones

---

## 🎯 Próximos Pasos

1. **Implementar PaymentService y Adapters** (1-2 días)
   - Crear estructura base
   - Implementar adapter de Wompi
   - Implementar adapter de Bold

2. **Modificar bot-logic.js** (1 día)
   - Agregar todas las funciones nuevas
   - Probar localmente con datos simulados

3. **Implementar webhooks** (1 día)
   - Crear endpoint
   - Implementar validación de firmas
   - Implementar creación de pedidos

4. **Testing exhaustivo** (2 días)
   - Testing en sandbox de cada gateway
   - Testing de todos los casos de uso
   - Testing de seguridad

5. **Documentar y capacitar** (1 día)
   - Crear documentación técnica
   - Crear tutoriales para restaurantes
   - Capacitar equipo de soporte

**Total estimado:** 6-8 días de desarrollo

---

## 📞 Soporte y Troubleshooting

### Problema: "No se pudo generar el enlace de pago"

**Causas posibles:**
1. Credenciales incorrectas en Firebase
2. Gateway en modo sandbox pero usando credenciales de producción
3. Monto inválido (negativo o cero)

**Solución:**
```bash
# Verificar credenciales en Firebase Console
# Verificar logs del servidor
tail -f server.log | grep "Error generando enlace"
```

### Problema: "Webhook no llega después del pago"

**Causas posibles:**
1. URL del webhook mal configurada en el gateway
2. Firewall bloqueando las IPs del gateway
3. Certificado SSL inválido o expirado

**Solución:**
```bash
# Verificar que el endpoint es accesible públicamente
curl -X POST https://tuservidor.com/api/webhooks/payment/wompi \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verificar logs de Wompi en su dashboard
# Implementar polling como backup (ver Caso 5)
```

### Problema: "Pago aprobado pero pedido no se crea"

**Causas posibles:**
1. Error en validación de firma del webhook
2. Error en creación del pedido en Firebase
3. Webhook duplicado procesado incorrectamente

**Solución:**
```bash
# Ver logs del webhook
tail -f server.log | grep "Webhook recibido"

# Verificar estado del pago en Firebase Console
# tenants/{tenantId}/pagos/{referencia}

# Ejecutar manualmente el procesamiento del pago
node scripts/reprocess-payment.js {referencia}
```

---

**Última actualización:** 30 Enero 2025  
**Versión:** 2.0 (Actualización completa con código real del bot)  
**Autor:** Equipo de Desarrollo
