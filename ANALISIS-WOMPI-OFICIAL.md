# Análisis Documentación Oficial Wompi - Payment Links

**Fecha:** 2025-01-15
**Objetivo:** Corregir integración de webhooks según documentación oficial de Wompi

---

## 📚 Fuentes Oficiales Consultadas

- **Eventos (Webhooks):** https://docs.wompi.co/docs/colombia/eventos/
- **Payment Links:** https://docs.wompi.co/docs/colombia/links-de-pago/
- **API Reference:** https://app.swaggerhub.com/apis-docs/waybox/wompi/1.2.0

---

## 🔍 Hallazgos Clave

### 1. Estructura del Webhook `transaction.updated`

Según la documentación oficial, el payload del webhook tiene esta estructura:

```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "1234-1610641025-49201",
      "amount_in_cents": 4490000,
      "reference": "MZQ3X2DE2SMX",
      "customer_email": "juan.perez@gmail.com",
      "currency": "COP",
      "payment_method_type": "NEQUI",
      "redirect_url": "https://mitienda.com.co/pagos/redireccion",
      "status": "APPROVED",
      "shipping_address": null,
      "payment_link_id": null,  // ⚠️ CAMPO CLAVE
      "payment_source_id": null
    }
  },
  "environment": "prod",
  "signature": {
    "properties": [
      "transaction.id",
      "transaction.status",
      "transaction.amount_in_cents"
    ],
    "checksum": "3476DDA50F64CD7CBD160689640506FEBEA93239BC524FC0469B2C68A3CC8BD0"
  },
  "timestamp": 1530291411,
  "sent_at": "2018-07-20T16:45:05.000Z"
}
```

### 2. Campo `payment_link_id` 

**Documentación oficial:**
- ✅ El campo `payment_link_id` **SÍ existe** en el objeto `transaction` del webhook
- ✅ Tiene valor cuando la transacción proviene de un Payment Link
- ❌ Es `null` cuando la transacción NO proviene de un Payment Link (ej: transacción directa por API)

### 3. Campo `reference` en Payment Links

**DESCUBRIMIENTO CRÍTICO:**
- ❌ **NO es posible** establecer un `reference` personalizado al crear un Payment Link
- ✅ Wompi **autogenera** el `reference` cuando se crea una transacción desde un Payment Link
- ✅ El `reference` es diferente para cada pago que se realiza a través del mismo link

**Campos disponibles al crear un Payment Link:**
```json
{
  "name": "Pago de arriendo edificio Lombardía - AP 505",
  "description": "Arriendo mensual",
  "single_use": false,
  "collect_shipping": false,
  "currency": "COP",
  "amount_in_cents": 500000,
  "expires_at": "2022-12-10T14:30:00",
  "redirect_url": null,
  "image_url": null,
  "sku": null,  // Identificador interno del producto (máx 36 caracteres)
  "customer_data": {
    "customer_references": [
      {
        "label": "Número de Apartamento",
        "is_required": true
      }
    ]
  },
  "taxes": []
}
```

**NOTA:** No hay campo `reference` en la creación del Payment Link.

### 4. Respuesta al crear un Payment Link

```json
{
  "data": {
    "id": "3Z0Cfi",  // ⚠️ ESTE es el payment_link_id
    "name": "Pago de arriendo edificio Lombardía - AP 505",
    "description": "Arriendo mensual del apto 505",
    "single_use": true,
    "collect_shipping": false,
    "currency": "COP",
    "amount_in_cents": null,
    "sku": null,
    "expires_at": null,
    "redirect_url": null,
    "image_url": null,
    "active": true,
    "customer_data": {...},
    "created_at": "2020-08-16T20:40:36.667Z",
    "updated_at": "2020-08-16T20:40:36.667Z",
    "merchant_public_key": "pub_prod_RP111hNRg000QOwT33337bjF7M222Bbu"
  },
  "meta": {}
}
```

El Payment Link se comparte así: `https://checkout.wompi.co/l/3Z0Cfi`

---

## ✅ Estrategia Correcta de Integración

### Flujo Completo:

1. **Al crear el Payment Link:**
   - ✅ Guardar el `payment_link_id` (viene como `data.id` en la respuesta)
   - ✅ NO intentar enviar un `reference` personalizado (Wompi lo ignora)
   - ✅ Usar el campo `sku` si necesitas un identificador interno (opcional, máx 36 caracteres)
   - ✅ Guardar en Firebase:
     ```javascript
     {
       transactionId: "3Z0Cfi",        // ID del payment link
       paymentLinkId: "3Z0Cfi",         // Duplicado para claridad
       reference: "REST123_ORDER456_timestamp", // Nuestra referencia INTERNA
       orderId: "ORDER456",
       restaurantId: "REST123",
       // ... otros campos
     }
     ```

2. **Al recibir el webhook:**
   - ✅ Extraer `transaction.payment_link_id` del payload
   - ✅ Buscar en Firebase por `paymentLinkId === transaction.payment_link_id`
   - ⚠️ **NO** buscar por `reference` (cada pago tiene un reference diferente autogenerado)
   - ✅ Como fallback, buscar por `wompiTransactionId` si ya se guardó en un webhook previo

3. **Identificadores importantes:**
   - `payment_link_id`: ID del link de pago (ej: "3Z0Cfi")
   - `transaction.id`: ID único de cada transacción (ej: "1234-1610641025-49201")
   - `transaction.reference`: Referencia autogenerada por Wompi para cada pago (ej: "MZQ3X2DE2SMX")
   - Nuestra `reference` interna: Solo para nuestro tracking interno (ej: "REST123_ORDER456_timestamp")

---

## 🐛 Problemas Identificados en el Código Actual

### 1. En `wompi-adapter.js` - Línea ~130

```javascript
// ❌ INCORRECTO: Wompi NO acepta reference en payment links
reference: reference, // 🔥 AGREGAR REFERENCE PERSONALIZADO
```

**Problema:** Estamos intentando enviar un `reference` al crear el Payment Link, pero Wompi lo ignora completamente.

**Solución:** 
- ✅ Remover el campo `reference` del payload
- ✅ Usar el campo `sku` si necesitamos un identificador interno (opcional)

### 2. Verificar extracción del `payment_link_id`

El código actual intenta extraer el `payment_link_id` correctamente:

```javascript
const paymentLinkId = transaction.payment_link_id 
  || transaction.payment_link 
  || payload.data.payment_link_id 
  || null;
```

✅ Esto está **CORRECTO** según la documentación oficial.

---

## 🔧 Cambios Necesarios

### 1. Remover `reference` del payload al crear Payment Link

**Archivo:** `server/payments/adapters/wompi-adapter.js`

```javascript
// Construir el payload para Wompi
const payload = {
  name: description || `Pedido ${reference}`,
  description: description || `Pago de pedido ${reference}`,
  single_use: true,
  collect_shipping: false,
  amount_in_cents: finalAmountInCents,
  currency: currency,
  redirect_url: redirectUrlWithParams,
  // ❌ REMOVER ESTA LÍNEA:
  // reference: reference, 
  
  // ✅ OPCIONAL: Agregar SKU si necesitamos un identificador interno
  // sku: reference.substring(0, 36), // Máximo 36 caracteres
  
  customer_data: {
    email: email,
    phone_number: phone,
    full_name: customerData?.fullName || metadata.customerName || 'Cliente'
  }
};
```

### 2. Validar que la búsqueda use `payment_link_id` correctamente

**Archivo:** `server/payment-service.js`

✅ El código actual ya implementa la búsqueda correcta:

```javascript
// Intento 1: Buscar por payment link ID
const paymentLinkId = event.data?.paymentLinkId;
if (paymentLinkId) {
  transaction = await this._getTransactionByPaymentLinkId(paymentLinkId);
}

// Intento 2: Buscar por wompiTransactionId (fallback)
if (!transaction) {
  transaction = await this._getTransactionByWompiTransactionId(event.transactionId);
}
```

### 3. Mejorar logging para debugging

Agregar más logs para entender qué está llegando en el webhook:

```javascript
console.log('🔍 [DEBUG] Webhook completo recibido:');
console.log('   Event:', payload.event);
console.log('   Transaction ID:', transaction.id);
console.log('   Payment Link ID:', transaction.payment_link_id);
console.log('   Reference:', transaction.reference);
console.log('   Status:', transaction.status);
console.log('   Amount:', transaction.amount_in_cents);
```

---

## ✅ Plan de Acción

1. ✅ **Remover el campo `reference` del payload** al crear Payment Links (Wompi lo ignora)
2. ✅ **Verificar que el código de extracción** de `payment_link_id` esté correcto (ya lo está)
3. ✅ **Agregar logging mejorado** en el webhook handler para debugging
4. ✅ **Realizar prueba real** con un pago y verificar logs
5. ✅ **Documentar el flujo correcto** para futuros desarrolladores

---

## 📝 Notas Importantes

- **Payment Link ID:** Es el identificador del LINK de pago (ej: "3Z0Cfi")
- **Transaction ID:** Es el identificador de cada TRANSACCIÓN que se realiza a través del link (ej: "1234-1610641025-49201")
- **Reference:** Es autogenerado por Wompi para cada transacción (ej: "MZQ3X2DE2SMX")
- **Nuestra reference interna:** Solo la usamos internamente, NO se envía a Wompi en Payment Links

---

## 🎯 Resultado Esperado

Después de los cambios:

1. ✅ El código estará alineado con la documentación oficial de Wompi
2. ✅ Los webhooks podrán relacionar correctamente las transacciones usando `payment_link_id`
3. ✅ Eliminamos el uso incorrecto del campo `reference` en Payment Links
4. ✅ El sistema será más robusto y predecible
