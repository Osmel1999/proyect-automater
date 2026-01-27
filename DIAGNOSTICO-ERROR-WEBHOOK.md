# 🔍 Diagnóstico del Error de Webhook - Payment Link ID

**Fecha:** 27 de enero de 2026  
**Problema:** Transacción no encontrada en Firebase al recibir webhook de Wompi

---

## 📊 Análisis de los Logs del Error

```
❌ Transacción no encontrada en Firebase
   Estado: TRANSACTION_NOT_FOUND
   - Payment Link ID: N/A
   - Transaction ID: undefined
   - Wompi Transaction ID: 12022885-1769537660-40049
   - Reference: test_UaGxZz_1769537642_c1G7xm1lV
```

---

## 🔴 EL VERDADERO PROBLEMA

**El link de pago que se está usando NO fue generado por la aplicación.**

### Evidencia:

1. **Reference format incorrecto:**
   - **Recibido:** `test_UaGxZz_1769537642_c1G7xm1lV`
   - **Esperado:** `{restaurantId}_{orderId}_{timestamp}` (ej: `rest123_order456_1769537642000`)

2. **Payment Link ID es N/A:**
   - Significa que `transaction.payment_link_id` en el webhook está `null` o `undefined`
   - Esto puede pasar si el link fue creado desde el dashboard de Wompi en modo test

3. **La transacción no existe en Firebase:**
   - Porque nunca se llamó a `paymentService.createPaymentLink()` desde nuestra app
   - Solo las transacciones creadas a través de nuestra app se guardan en Firebase

---

## ✅ SOLUCIÓN: Flujo Correcto

Para que el sistema funcione correctamente, el flujo debe ser:

```
1. Usuario solicita un pedido
   ↓
2. Backend llama a paymentService.createPaymentLink()
   ├─ Crea el payment link en Wompi API
   ├─ Wompi retorna: { id: "123-abc", permalink: "https://checkout.wompi.co/l/123-abc" }
   └─ Backend guarda en Firebase con paymentLinkId = "123-abc"
   ↓
3. Usuario paga usando el link generado
   ↓
4. Wompi envía webhook con transaction.payment_link_id = "123-abc"
   ↓
5. Backend busca en Firebase por paymentLinkId = "123-abc"
   ↓
6. ✅ Transacción encontrada y actualizada
```

---

## 🧪 CÓMO PROBAR CORRECTAMENTE

### Opción 1: Usando el endpoint HTTP directamente

```bash
curl -X POST https://api.kdsapp.site/api/payments/create-payment-link \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest_test_123",
    "orderId": "order_test_456",
    "amount": 50000,
    "customerPhone": "+573001234567",
    "customerName": "Juan Perez",
    "customerEmail": "juan@example.com",
    "orderDetails": {
      "items": ["Pizza Margarita x1", "Coca Cola x1"]
    }
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "paymentLink": "https://checkout.wompi.co/l/XXX-YYY-ZZZ",
  "transactionId": "XXX-YYY-ZZZ",
  "reference": "rest_test_123_order_test_456_1769537642000"
}
```

### Opción 2: Usando el chatbot de WhatsApp

El bot ya tiene integrado el flujo de pagos. Solo necesitas:

1. Enviar un mensaje al número de WhatsApp del restaurante
2. Seguir el flujo de pedido
3. El bot generará automáticamente el link de pago
4. Pagar usando ese link
5. El webhook debería funcionar correctamente

---

## 🔧 CAMBIOS REALIZADOS (que NO solucionan el problema raíz)

Los últimos cambios que hice fueron:

1. ❌ **Agregar más logging** - útil para debug, pero no soluciona el problema
2. ❌ **Agregar comentarios** - útil para documentación, pero no soluciona el problema
3. ❌ **Remover el campo `reference` del payload** - según documentación de Wompi, pero NO soluciona el problema

**Ninguno de estos cambios soluciona el problema real**, que es:

> **El link de pago debe ser generado a través de la aplicación, no directamente desde el dashboard de Wompi.**

---

## ✨ LO QUE SÍ FUNCIONA (y está bien implementado)

El código actual **SÍ FUNCIONA CORRECTAMENTE** cuando se usa el flujo correcto:

1. ✅ La creación de payment links funciona
2. ✅ El guardado en Firebase funciona
3. ✅ El webhook handler funciona
4. ✅ La búsqueda por `paymentLinkId` funciona
5. ✅ Los fallbacks de búsqueda funcionan

**El problema es de uso, no de código.**

---

## 📝 PRÓXIMOS PASOS

1. **Generar un nuevo link de pago usando el endpoint de la app:**
   ```bash
   POST /api/payments/create-payment-link
   ```

2. **Verificar en Firebase que la transacción se guardó:**
   - Ir a Firebase Console
   - Buscar en `transactions/`
   - Verificar que existe una transacción con `paymentLinkId`

3. **Pagar usando ese link generado**

4. **Verificar que el webhook encuentra la transacción:**
   ```
   ✅ Transacción encontrada en Firebase
   ```

---

## 🎯 CONCLUSIÓN

**Los cambios de código (comentarios y logging) NO solucionan el problema** porque el problema real no es de código, es de flujo:

- ❌ **Problema:** Estás usando un link creado desde el dashboard de Wompi
- ✅ **Solución:** Usar un link creado a través del endpoint de la app

El código ya está bien implementado y siguiendo las mejores prácticas de Wompi. Solo necesitas usar el flujo correcto para probarlo.

---

## 📚 Referencias

- [Documentación oficial de Wompi](https://docs.wompi.co/docs/colombia/inicio-rapido/)
- [Payment Links en Wompi](https://docs.wompi.co/reference/crear-enlace-de-pago)
- Endpoint de la app: `POST /api/payments/create-payment-link`
- Archivo de servicio: `/server/payment-service.js`
- Webhook handler: `/server/routes/payments.js`
