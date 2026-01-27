# 🔍 Plan de Debug: Payment Link ID en Webhook

**Fecha:** 27 de enero de 2026  
**Problema:** El campo `payment_link_id` llega como `null` en el webhook de Wompi, causando que no se encuentre la transacción en Firebase.

---

## 📊 Situación Actual

### Lo que sabemos:
1. ✅ Nunca has generado links desde el dashboard de Wompi
2. ✅ Los links se generan a través de la aplicación
3. ❌ El webhook muestra `Payment Link ID: N/A`
4. ❌ La transacción no se encuentra en Firebase

### Log del último error:
```
❌ Transacción no encontrada en Firebase
   - Payment Link ID: N/A
   - Wompi Transaction ID: 12022885-1769537660-40049
   - Reference: test_UaGxZz_1769537642_c1G7xm1lV
```

---

## 🤔 Posibles Causas

### Hipótesis 1: Wompi no incluye `payment_link_id` en el webhook
**Razón:** Algunos gateways solo incluyen ciertos campos en eventos específicos.

**Solución:** Verificar la estructura exacta del webhook que llega.

### Hipótesis 2: El usuario no está pagando a través del Payment Link
**Razón:** Si el usuario usa otro método (widget embebido, API directa), no habrá `payment_link_id`.

**Solución:** Asegurarse de que el flujo es: App → Payment Link → Usuario Paga → Webhook.

### Hipótesis 3: Timing - El webhook llega antes de la asociación
**Razón:** En algunos casos, el webhook puede llegar antes de que Wompi asocie la transacción al link.

**Solución:** Implementar búsqueda por múltiples campos como fallback.

---

## 🛠️ Cambios Implementados para Debug

### 1. ✅ Logging detallado en el webhook handler
**Archivo:** `server/routes/payments.js`

Ahora se loguea:
- Payload completo del webhook
- Headers completos
- Campos específicos: `transaction.id`, `transaction.reference`, `transaction.payment_link_id`
- Lista de todos los campos disponibles en el objeto `transaction`

### 2. ✅ Logging detallado en el adapter de Wompi
**Archivo:** `server/payments/adapters/wompi-adapter.js`

Ahora se loguea:
- Estructura completa del objeto `transaction`
- Intentos de extracción del `payment_link_id` desde múltiples fuentes
- Valor final del `payment_link_id` extraído

### 3. ✅ Comentarios explicativos en el código
Se documentó según la documentación oficial de Wompi que:
- Payment Links NO permiten `reference` personalizado
- El `payment_link_id` debe estar presente en webhooks de transacciones creadas desde links
- La búsqueda en Firebase debe usar el `payment_link_id` como identificador principal

---

## 🧪 Pasos para Debuggear

### Paso 1: Desplegar los cambios
```bash
git add .
git commit -m "feat: add comprehensive webhook debugging for payment_link_id"
git push origin main
```

Esperar a que Railway despliegue (aprox. 2-3 minutos).

### Paso 2: Generar un nuevo Payment Link a través de la app

**Opción A: Usando el bot de WhatsApp**
1. Envía un mensaje al bot de WhatsApp
2. Crea un pedido
3. Solicita el link de pago
4. **NO PAGUES TODAVÍA**

**Opción B: Usando el endpoint HTTP**
```bash
curl -X POST https://api.kdsapp.site/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "test",
    "orderId": "test_order_'$(date +%s)'",
    "amount": 10000,
    "customerPhone": "+573001234567",
    "customerName": "Test User",
    "customerEmail": "test@example.com"
  }'
```

### Paso 3: Verificar que el link se guardó en Firebase
1. Ir a Firebase Console
2. Navegar a Realtime Database → `transactions`
3. Buscar la transacción recién creada
4. Verificar que tenga:
   - `paymentLinkId`: debe ser algo como `18219-1737994486-28499`
   - `transactionId`: debe ser el mismo valor que `paymentLinkId`
   - `status`: debe ser `PENDING`

### Paso 4: Realizar el pago
1. Abrir el link de pago en el navegador
2. Completar el proceso de pago (usar tarjeta de prueba de Wompi)
3. **Inmediatamente después**, ir a Railway y revisar los logs

### Paso 5: Analizar los logs del webhook
Buscar en los logs de Railway la sección:
```
🔍 [DEBUG CRÍTICO] Datos de la transacción en el webhook:
   - transaction.id: XXXX
   - transaction.reference: YYYY
   - transaction.payment_link_id: ZZZZ
   - Campos disponibles en transaction: [...]
```

**Analizar:**
- ¿El campo `payment_link_id` está presente?
- ¿Tiene un valor o es `null`/`undefined`?
- ¿Qué otros campos tiene el objeto `transaction`?

---

## 📋 Checklist de Verificación

- [ ] Cambios desplegados en Railway
- [ ] Nuevo link generado a través de la app
- [ ] Link verificado en Firebase (tiene `paymentLinkId`)
- [ ] Pago completado
- [ ] Logs del webhook revisados
- [ ] Campo `payment_link_id` identificado en el webhook

---

## 🎯 Resultados Esperados

### Caso 1: `payment_link_id` está presente en el webhook
✅ **Solución:** El código actual debería funcionar.  
🔍 **Acción:** Investigar por qué no se está encontrando la transacción (posible problema en Firebase queries).

### Caso 2: `payment_link_id` es `null` en el webhook
❌ **Problema:** Wompi no está incluyendo el campo.  
🔍 **Acción:** Buscar alternativa - usar `transaction.id` + metadata + timestamp para conciliar.

### Caso 3: El campo se llama diferente
🤔 **Problema:** Wompi usa un nombre diferente para el campo.  
🔍 **Acción:** Ajustar el código para usar el campo correcto.

---

## 💡 Plan B: Si `payment_link_id` no está disponible

Si confirmamos que Wompi NO envía el `payment_link_id` en el webhook, implementaremos una estrategia alternativa:

### Estrategia de Conciliación Alternativa

1. **Al crear el Payment Link:**
   - Guardar en metadata del link: `orderId`, `restaurantId`, `timestamp`
   - Guardar en Firebase: el `payment_link_id` Y el reference que Wompi genera

2. **En el webhook:**
   - Buscar por `wompiTransactionId` (primer intento)
   - Si no existe, buscar transacciones recientes (últimos 30 min) que estén PENDING
   - Comparar montos y timestamps para hacer match
   - Actualizar la transacción con el `wompiTransactionId`

3. **Implementar endpoint de reconciliación manual:**
   - Permitir reconciliar manualmente transacciones no encontradas
   - Consultar la API de Wompi para obtener detalles completos de la transacción

---

## 📞 Próximos Pasos

1. **Desplegar y probar** con los nuevos logs
2. **Compartir los logs completos** del webhook
3. **Decidir estrategia** basado en lo que encontremos
4. **Implementar la solución** definitiva

---

## 📚 Referencias

- [Documentación oficial de Wompi - Payment Links](https://docs.wompi.co/docs/colombia/enlaces-de-pago/)
- [Documentación oficial de Wompi - Webhooks](https://docs.wompi.co/docs/colombia/eventos/)
- [Ejemplo de estructura de webhook](https://docs.wompi.co/docs/colombia/eventos/#ejemplo-de-evento)
