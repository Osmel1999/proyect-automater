# 🔧 FIX: Notificaciones de Pago al Chat Correcto

## 🎯 Problema Identificado

Después de completar un pago con tarjeta, el cliente NO recibía el mensaje de confirmación en el chat de WhatsApp porque:

- Se estaba enviando al **número de contacto** proporcionado por el cliente (`telefonoContacto`)
- Pero debía enviarse al **número de WhatsApp del chat** original (`telefono`)

## 📱 Diferencia Entre Números

```javascript
// Número de WhatsApp del CHAT (donde escribe el cliente)
sesion.telefono = "573042734424"  // ✅ Chat activo con el bot

// Número de CONTACTO (para entrega)
sesion.telefonoContacto = "3991111111"  // ❌ Puede ser otro número
```

## ❌ Comportamiento Anterior

### En bot-logic.js:
```javascript
customerPhone: sesion.telefonoContacto || sesion.telefono
```
❌ Enviaba al número de contacto, no al chat

### En payment-service.js:
```javascript
await baileys.sendMessage(
  transaction.restaurantId,
  transaction.customerPhone,  // ❌ Número de contacto
  { text: message }
);
```

### Resultado:
- El webhook se procesaba correctamente ✅
- El pedido se creaba en KDS ✅
- Pero el mensaje NO llegaba al chat ❌

---

## ✅ Solución Implementada

### 1. bot-logic.js - Pasar el número de WhatsApp del chat

**Línea ~616:**
```javascript
// Generar enlace de pago
const paymentResult = await paymentService.createPaymentLink({
  restaurantId: sesion.tenantId,
  orderId: orderId,
  amount: total * 100,
  customerPhone: sesion.telefono, // 🔥 Número de WhatsApp del CHAT
  customerName: `Cliente ${sesion.telefono}`,
  customerEmail: `${sesion.telefono}@kdsapp.site`,
  orderDetails: {
    items: Object.values(itemsAgrupados).map(i => ({
      name: i.nombre,
      quantity: i.cantidad,
      price: i.precio,
    })),
    deliveryAddress: sesion.direccion,
    contactPhone: sesion.telefonoContacto, // Teléfono de contacto para entrega
    orderNumber: numeroHex,
  },
});
```

**Cambio:**
- ✅ `customerPhone` ahora es el número del chat de WhatsApp
- ✅ `contactPhone` (en orderDetails) es el número de contacto para entrega

---

### 2. payment-service.js - Guardar el número de WhatsApp

**Línea ~137:**
```javascript
const transactionData = {
  restaurantId,
  orderId,
  transactionId: result.transactionId,
  paymentLinkId: result.transactionId,
  gateway: gatewayConfig.gateway,
  reference: paymentData.reference,
  amount,
  customerPhone, // Número de WhatsApp del chat
  whatsappPhone: customerPhone, // 🔥 Explícito para claridad
  customerName,
  status: 'PENDING',
  paymentLink: result.paymentLink,
  createdAt: Date.now(),
};
```

**Cambio:**
- ✅ Se guarda `whatsappPhone` explícitamente
- ✅ Es el mismo que `customerPhone` pero con nombre claro

---

### 3. payment-service.js - Enviar al número correcto

**Línea ~655:**
```javascript
// 🔥 Usar el número de WhatsApp original del chat (no el teléfono de contacto)
const whatsappNumber = transaction.whatsappPhone || transaction.customerPhone;
console.log(`📱 [_notifyCustomer] Enviando al número de WhatsApp: ${whatsappNumber}`);
```

**Línea ~733:**
```javascript
// Enviar mensaje usando Baileys al número de WhatsApp del chat
const result = await baileys.sendMessage(
  transaction.restaurantId,
  whatsappNumber, // 🔥 Usar el número de WhatsApp del chat
  { text: message },
  { humanize: true }
);
```

**Cambios:**
- ✅ Se usa `whatsappNumber` en lugar de `customerPhone`
- ✅ Log adicional para debugging
- ✅ Fallback a `customerPhone` por compatibilidad

---

## 📊 Flujo Corregido

```
1. Cliente hace pedido desde WhatsApp
   📱 Número del chat: 573042734424

2. Cliente proporciona teléfono de contacto
   📞 Para entrega: 3991111111

3. Se genera link de pago
   ✅ customerPhone = 573042734424 (chat)
   ✅ contactPhone = 3991111111 (entrega)

4. Cliente paga en Wompi
   💳 Pago aprobado

5. Webhook llega al servidor
   ✅ Se crea pedido en KDS
   ✅ Se actualiza transacción

6. Se envía notificación
   ✅ Al número: 573042734424 (CHAT)
   ✅ El mensaje llega al chat correcto! 🎉
```

---

## 🧪 Prueba de Validación

### Escenario:
- Cliente: 573042734424 (chat de WhatsApp)
- Contacto: 3991111111 (teléfono de entrega)

### Resultado Esperado:
```javascript
// En los logs:
📱 [_notifyCustomer] Enviando al número de WhatsApp: 573042734424
✅ Mensaje enviado exitosamente

// En WhatsApp:
El cliente recibe en su CHAT (573042734424):

🎉 ¡Tu pedido está confirmado!

✅ Pago recibido exitosamente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Detalles de tu pedido:
...
```

---

## 📝 Archivos Modificados

### 1. `server/bot-logic.js`
- **Línea ~616**: Cambiar `customerPhone` a `sesion.telefono`
- **Efecto**: Pasar el número del chat, no el de contacto

### 2. `server/payment-service.js`
- **Línea ~137**: Agregar `whatsappPhone` a transactionData
- **Línea ~655**: Obtener `whatsappNumber` de la transacción
- **Línea ~733**: Usar `whatsappNumber` al enviar mensaje
- **Efecto**: Enviar notificaciones al chat correcto

---

## ✅ Beneficios del Fix

1. ✅ **Continuidad de Conversación**: El mensaje llega al mismo chat donde se hizo el pedido
2. ✅ **Mejor UX**: Cliente no tiene que revisar otro número
3. ✅ **Menos Confusión**: Todo en un solo chat
4. ✅ **Más Natural**: La conversación fluye sin interrupciones

---

## 🎯 Compatibilidad

El cambio es **retrocompatible**:
- Transacciones viejas sin `whatsappPhone`: Usa `customerPhone` como fallback ✅
- Transacciones nuevas con `whatsappPhone`: Usa el número correcto ✅

```javascript
const whatsappNumber = transaction.whatsappPhone || transaction.customerPhone;
```

---

## 🚀 Próximo Deploy

```bash
git add server/bot-logic.js server/payment-service.js
git commit -m "🔧 fix: Enviar notificaciones de pago al chat correcto de WhatsApp"
git push origin main
```

Railway desplegará automáticamente.

---

**Fecha del Fix**: 27 de enero de 2026  
**Estado**: ✅ Implementado  
**Prioridad**: 🔴 Alta (Afecta UX del cliente)
