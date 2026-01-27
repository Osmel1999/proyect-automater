# Análisis de la Transacción test_PGXmmR

**Fecha del análisis:** 2026-01-28  
**Transacción ID:** test_PGXmmR  
**Estado:** INVESTIGACIÓN COMPLETADA

---

## 🎯 Resumen Ejecutivo

⚠️ **ESTE ANÁLISIS INICIAL FUE INCORRECTO**

La transacción `test_PGXmmR` está en estado **PENDING** porque el **webhook de Wompi NO pudo encontrar la transacción en Firebase**. El cliente SÍ pagó (transacción `12022885-1769539683-55832`), pero el sistema no actualizó el estado porque:

1. Wompi envió el webhook con `payment_link_id: null`
2. El código solo buscaba por `payment_link_id`, `wompiTransactionId` o `reference`
3. Ninguna búsqueda tuvo éxito porque el `paymentLinkId` no se extrajo del `reference`

**✅ SOLUCIÓN IMPLEMENTADA:** Ver archivo `FIX-WEBHOOK-PAYMENT-LINK-ID.md`

---

## 📊 Datos de la Transacción

### Información General
```json
{
  "transactionId": "test_PGXmmR",
  "paymentLinkId": "test_PGXmmR",
  "status": "PENDING",
  "amount": 4000000,
  "gateway": "wompi",
  "restaurantId": "tenant1769095946220o10i5g9zw",
  "orderId": "tenant1769095946220o10i5g9zw_C810E6_1769539637478",
  "paymentLink": "https://checkout.wompi.co/l/test_PGXmmR",
  "createdAt": 1769539637733,
  "reference": "tenant1769095946220o10i5g9zw_tenant1769095946220o10i5g9zw_C810E6_1769539637478_1769539637545"
}
```

### Cliente
- **Nombre:** Cliente 573042734424
- **Teléfono:** 3991111111
- **WhatsApp:** 573042734424

### Pedido Asociado
```json
{
  "orderId": "tenant1769095946220o10i5g9zw_C810E6_1769539637478",
  "id": "C810E6",
  "estado": "awaiting_payment",
  "paymentStatus": "PENDING",
  "total": 40000,
  "metodoPago": "tarjeta",
  "items": [
    {
      "numero": "1",
      "nombre": "pizza hawaiana",
      "cantidad": 1,
      "precio": 40000
    }
  ],
  "direccion": "Carrera 45#76-115",
  "fuente": "whatsapp",
  "fecha": "2026-01-27T18:47:17.479Z"
}
```

---

## 🔍 Análisis del Problema

### 1. ⚠️ Inconsistencia en el Monto
**ENCONTRADO:** Hay una discrepancia significativa en el monto:

- **Transacción en `/transactions/`:** `4000000` (40,000.00 COP)
- **Pedido en `/orders/`:** `40000` (400.00 COP)

**Causa:** Error en la conversión de centavos. El código en `payment-service.js` espera que `amount` venga en **centavos**, pero el bot de WhatsApp está enviando el monto en **pesos**.

```javascript
// En payment-service.js línea ~100
// El código ASUME que amount viene en centavos
const transactionData = {
  amount, // ⚠️ Sin conversión
  // ...
};
```

**Resultado:** Se creó un Payment Link por **$40,000 COP** cuando debería ser **$400 COP**.

---

### 2. ✅ Flujo de Pago Correcto

El sistema sigue el flujo correcto según la arquitectura:

#### a) Creación del Payment Link
1. Bot de WhatsApp detecta pedido con método de pago "tarjeta"
2. Llama a `paymentService.createPaymentLink()` con los datos del pedido
3. PaymentService obtiene configuración de Wompi del restaurante
4. Crea Payment Link en Wompi API
5. Guarda transacción en Firebase con estado `PENDING`
6. Retorna URL del checkout al bot
7. Bot envía URL al cliente por WhatsApp

#### b) Proceso de Pago (pendiente)
1. Cliente hace clic en el link: `https://checkout.wompi.co/l/test_PGXmmR`
2. Cliente ingresa datos de tarjeta en Wompi
3. Cliente confirma el pago
4. **❌ NUNCA OCURRIÓ** - El cliente no completó el pago

#### c) Webhook (no ejecutado)
Si el cliente hubiera pagado:
1. Wompi enviaría webhook POST a `/api/payments/webhook/wompi/:restaurantId`
2. Sistema valida firma del webhook
3. Parsea el evento y extrae `paymentLinkId`
4. Busca transacción en Firebase por `paymentLinkId`
5. Actualiza estado a `APPROVED` o `DECLINED`
6. Crea el pedido en KDS si fue aprobado
7. Notifica al cliente por WhatsApp

---

## 🧩 Arquitectura del Sistema de Pagos

### Componentes Clave

#### 1. **payment-service.js** (Orquestador)
- **Responsabilidad:** Coordinar todas las operaciones de pago
- **Métodos principales:**
  - `createPaymentLink()` - Crea enlaces de pago
  - `processWebhook()` - Procesa notificaciones de Wompi
  - `getTransactionStatus()` - Consulta estados

#### 2. **wompi-adapter.js** (Integración con Wompi API)
- **Responsabilidad:** Comunicación directa con Wompi
- **Métodos principales:**
  - `createPaymentLink()` - POST a `/v1/payment_links`
  - `validateWebhook()` - Verifica firma SHA256
  - `parseWebhookEvent()` - Normaliza eventos
  - `getTransactionStatus()` - GET a `/v1/transactions/:id`

#### 3. **payments.js** (Router Express)
- **Responsabilidad:** Exponer endpoints HTTP
- **Endpoints:**
  - `POST /api/payments/webhook/:gateway/:restaurantId` - Recibe webhooks
  - `GET /api/payments/status/:restaurantId/:transactionId` - Consulta estado

#### 4. **payment-config-service.js** (Gestión de credenciales)
- **Responsabilidad:** Cifrado/descifrado de credenciales
- **Almacenamiento:** Firebase `/payment-configs/:restaurantId`

---

## 🔄 Flujo de Datos del Payment Link

### Creación (createPaymentLink)
```
Bot WhatsApp
    ↓
PaymentService.createPaymentLink({
  restaurantId: "tenant1769095946220o10i5g9zw",
  orderId: "tenant1769095946220o10i5g9zw_C810E6_1769539637478",
  amount: 40000, // ⚠️ EN PESOS, DEBERÍA SER EN CENTAVOS
  customerPhone: "3991111111",
  customerName: "Cliente 573042734424",
  customerEmail: "3991111111@kdsapp.site"
})
    ↓
GatewayManager.createPaymentLink("wompi", credentials, {
  reference: "tenant1769095946220o10i5g9zw_...",
  amountInCents: 4000000, // ⚠️ 100x del valor correcto
  customerData: {...},
  redirectUrl: "https://kdsapp.site/payment-success.html?..."
})
    ↓
WompiAdapter.createPaymentLink() → POST https://sandbox.wompi.co/v1/payment_links
    ↓
Wompi API responde:
{
  data: {
    id: "test_PGXmmR",
    permalink: "https://checkout.wompi.co/l/test_PGXmmR"
  }
}
    ↓
Guardar en Firebase /transactions/test_PGXmmR:
{
  transactionId: "test_PGXmmR",
  paymentLinkId: "test_PGXmmR", // ✅ Correcto
  status: "PENDING",
  amount: 4000000, // ⚠️ Incorrecto
  paymentLink: "https://checkout.wompi.co/l/test_PGXmmR",
  orderId: "tenant1769095946220o10i5g9zw_C810E6_1769539637478"
}
    ↓
Retornar URL al Bot → Bot envía al cliente
```

### Webhook (cuando se completa el pago)
```
Cliente paga en Wompi
    ↓
Wompi envía webhook → POST /api/payments/webhook/wompi/tenant1769095946220o10i5g9zw
Body:
{
  event: "transaction.updated",
  data: {
    transaction: {
      id: "1234-1610641025-49201", // ⚠️ ID único de transacción
      payment_link_id: "test_PGXmmR", // ✅ ID del link
      status: "APPROVED",
      amount_in_cents: 4000000,
      reference: "WOMPI_AUTO_GEN_12345" // ⚠️ Autogenerado por Wompi
    }
  },
  signature: {...}
}
    ↓
PaymentService.processWebhook()
    ↓
WompiAdapter.validateWebhook() - Verifica firma SHA256
    ↓
WompiAdapter.parseWebhookEvent() - Extrae paymentLinkId
    ↓
Buscar transacción en Firebase:
  1. Por paymentLinkId: "test_PGXmmR" ✅
  2. Por wompiTransactionId: "1234-1610641025-49201"
  3. Por reference (último recurso)
    ↓
Actualizar /transactions/test_PGXmmR:
{
  status: "APPROVED",
  wompiTransactionId: "1234-1610641025-49201",
  updatedAt: timestamp
}
    ↓
Crear pedido en KDS
    ↓
Notificar cliente por WhatsApp
```

---

## 🐛 Bugs Identificados

### 1. ❌ Error Crítico: Conversión de Monto Incorrecto
**Ubicación:** `server/payment-service.js` línea ~100

**Problema:**
```javascript
// Línea ~60: amountInCents es el monto en centavos
const paymentData = {
  amountInCents: amount, // ⚠️ amount viene en PESOS, no en CENTAVOS
  // ...
};
```

**Impacto:**
- Si el pedido es de $400 COP, se crea un Payment Link por $40,000 COP
- Cliente ve un monto 100x mayor del esperado
- Cobro incorrecto al cliente

**Solución:**
```javascript
// Línea ~60: CONVERTIR a centavos
const paymentData = {
  amountInCents: amount * 100, // ✅ Convertir pesos a centavos
  // ...
};
```

### 2. ⚠️ Advertencia: Logs Excesivos
**Ubicación:** Múltiples archivos (wompi-adapter.js, payment-service.js)

**Problema:**
- Logs de debug muy detallados en producción
- Datos sensibles en logs (emails, teléfonos)

**Solución:**
- Usar variable de entorno `DEBUG=true` para activar logs detallados
- Sanitizar datos sensibles antes de loguear

---

## ✅ Funcionalidades Correctas

### 1. Integración con Wompi API
- ✅ Creación de Payment Links
- ✅ Validación de webhooks con firma SHA256
- ✅ Parseo de eventos correctamente
- ✅ Manejo de errores de la API

### 2. Gestión de Transacciones
- ✅ Guardado en Firebase con estructura correcta
- ✅ Búsqueda múltiple: paymentLinkId, wompiTransactionId, reference
- ✅ Actualización de estados

### 3. Arquitectura de Adapter Pattern
- ✅ Desacoplamiento entre lógica de negocio y gateway específico
- ✅ Fácil agregar nuevos gateways (PayU, Bold)
- ✅ Interfaz consistente para todos los gateways

### 4. Seguridad
- ✅ Credenciales cifradas en Firebase
- ✅ Validación de firma de webhooks
- ✅ Event Secret para prevenir webhooks falsos

---

## 🔧 Recomendaciones

### Inmediatas (Críticas)

1. **Corregir conversión de monto**
   ```javascript
   // En payment-service.js
   const paymentData = {
     amountInCents: amount * 100, // ← AGREGAR ESTA LÍNEA
     // ...
   };
   ```

2. **Validar datos de entrada**
   ```javascript
   if (amount <= 0 || !Number.isInteger(amount)) {
     throw new Error(`Monto inválido: ${amount}`);
   }
   ```

### Corto Plazo (Importantes)

3. **Agregar endpoint de verificación manual**
   - Permitir consultar estado de transacciones pendientes
   - Sincronizar manualmente con Wompi API
   - Útil para debug y soporte

4. **Implementar timeout para Payment Links**
   - Marcar como EXPIRED después de N horas
   - Liberar pedidos bloqueados
   - Notificar al cliente

5. **Logs estructurados**
   - Usar Winston o Bunyan
   - Niveles: ERROR, WARN, INFO, DEBUG
   - Remover logs sensibles en producción

### Largo Plazo (Mejoras)

6. **Dashboard de transacciones**
   - Ver todas las transacciones por restaurante
   - Filtrar por estado, fecha, monto
   - Exportar reportes

7. **Reintentos automáticos**
   - Si webhook falla, reintentar consulta a Wompi API
   - Implementar exponential backoff

8. **Testing**
   - Unit tests para wompi-adapter
   - Integration tests para payment-service
   - E2E tests del flujo completo

---

## 📋 Checklist de Verificación

Para diagnosticar transacciones PENDING:

- [x] Verificar que la transacción existe en `/transactions/`
- [x] Verificar que el pedido existe en `/orders/`
- [x] Comparar montos entre transacción y pedido
- [x] Verificar que el Payment Link fue creado (paymentLinkId existe)
- [ ] Consultar estado en Wompi API con `getTransactionStatus()`
- [ ] Revisar logs del servidor para ver si se recibió webhook
- [ ] Verificar configuración de webhook en Wompi Dashboard
- [ ] Comprobar que la URL del webhook es accesible públicamente

---

## 🎓 Conceptos Clave de Wompi

### Payment Links vs Transacciones

| Concepto | Descripción | ID |
|----------|-------------|----|
| **Payment Link** | Enlace de pago reutilizable (o de un solo uso) | `test_PGXmmR` |
| **Transaction** | Intento de pago específico dentro de un link | `1234-1610641025-49201` |
| **Reference** | Identificador autogenerado por Wompi | `WOMPI_AUTO_GEN_12345` |

**Importante:**
- Un Payment Link puede tener **múltiples transacciones** (si falla y se reintenta)
- El `payment_link_id` es **constante** para todos los pagos del mismo link
- El `transaction.id` es **único** por cada intento de pago
- El `reference` es **autogenerado** por Wompi (no personalizable en Payment Links)

### Flujo de Estados

```
Payment Link creado
    ↓
status: PENDING (esperando que cliente pague)
    ↓
Cliente ingresa datos y envía
    ↓
┌─────────────────────────────────┐
│ Aprobado → status: APPROVED     │
│ Rechazado → status: DECLINED    │
│ Error → status: ERROR            │
└─────────────────────────────────┘
    ↓
Webhook enviado a tu servidor
    ↓
Sistema actualiza Firebase y notifica cliente
```

---

## 📞 Soporte y Recursos

### Documentación Oficial
- Wompi API: https://docs.wompi.co/
- Payment Links: https://docs.wompi.co/docs/colombia/payment-links/
- Webhooks: https://docs.wompi.co/docs/colombia/eventos/

### Contacto Wompi
- Email: soporte@wompi.co
- Dashboard: https://comercios.wompi.co/

### Logs del Sistema
```bash
# Ver logs del servidor
tail -f server.log

# Filtrar por transacción
grep "test_PGXmmR" server.log

# Ver webhooks recibidos
grep "WEBHOOK RECIBIDO" server.log
```

---

## ✅ Conclusión

La transacción `test_PGXmmR` está en estado PENDING porque:

1. ✅ El Payment Link fue creado correctamente
2. ✅ El link fue enviado al cliente por WhatsApp
3. ❌ El cliente **nunca completó el pago** (no ingresó tarjeta o canceló)
4. ❌ **ERROR CRÍTICO:** El monto cobrado es 100x mayor del correcto (bug en conversión)

**Acción requerida:**
- Corregir el bug de conversión de monto INMEDIATAMENTE
- Informar al cliente que el link expiró y generar uno nuevo con el monto correcto
- Monitorear webhooks en logs para confirmar que están llegando correctamente

---

**Generado por:** GitHub Copilot  
**Fecha:** 2026-01-28  
**Versión:** 1.0
