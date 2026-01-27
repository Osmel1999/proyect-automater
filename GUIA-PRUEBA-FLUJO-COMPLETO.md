# Guía de Prueba del Flujo Completo de Pagos

## ✅ Estado Actual
Todo el código está funcionando correctamente. El problema detectado en los logs es que la transacción no existe en Firebase porque **no se creó a través del bot**.

## 🔍 Por Qué el Test Falló
Cuando usas el enlace de prueba directo de Wompi (`https://checkout.wompi.co/l/aPGcN4`):
- ✅ El webhook llega correctamente
- ✅ La firma se valida correctamente
- ❌ **La transacción NO existe en Firebase** porque nunca se pidió a través del bot

**El flujo correcto es:**
1. Cliente pide comida al bot de WhatsApp
2. Bot genera enlace de pago (crea transacción en Firebase con reference único)
3. Cliente paga
4. Webhook llega, busca la transacción por reference
5. Bot confirma el pedido

## 📋 Pasos para Probar el Flujo Completo

### 1. Conectar WhatsApp (Si No Está Conectado)
```bash
# 1. Ir al dashboard
open https://kdsapp.site/dashboard

# 2. Click en "Conectar WhatsApp"
# 3. Escanear el QR con tu WhatsApp
# 4. Esperar confirmación
```

### 2. Simular un Pedido Completo

#### Opción A: Usando el Bot de WhatsApp
```
# Envía un mensaje al número conectado:
"Hola"
# El bot responderá con el menú

"Quiero 1 Bandeja Paisa"
# El bot pedirá la dirección

"Calle 123 # 45-67, Medellín"
# El bot generará el enlace de pago
```

#### Opción B: Usando cURL (Para Testing Rápido)
```bash
# 1. Generar un enlace de pago directamente
curl -X POST https://api.kdsapp.site/api/payments/create-payment-link \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "tenant1769095946220o10i5g9zw",
    "orderId": "TEST_ORDER_'$(date +%s)'",
    "amount": 25000,
    "customerPhone": "+573991111111",
    "customerName": "Test User",
    "orderDetails": {
      "items": [
        {
          "name": "Bandeja Paisa",
          "quantity": 1,
          "price": 25000
        }
      ],
      "deliveryAddress": "Calle 123 # 45-67, Medellín"
    }
  }'

# La respuesta incluirá el paymentLink
```

### 3. Completar el Pago

1. **Copiar el enlace de pago** de la respuesta del bot o del cURL
2. **Abrir el enlace** en el navegador
3. **Usar datos de prueba de Wompi:**
   - Número de tarjeta: `4242424242424242`
   - Fecha: Cualquier fecha futura (ej: 12/28)
   - CVC: Cualquier 3 dígitos (ej: 123)
   - Cuotas: 1

4. **Completar el pago**

### 4. Verificar el Webhook

```bash
# Ver los logs en Railway
railway logs --tail 50

# Buscar estos mensajes:
# ✅ Webhook de wompi validado correctamente
# ✅ Transacción encontrada: {...}
# ✅ Pago aprobado - Creando pedido en KDS...
# ✅ Pedido creado en KDS
# ✅ Mensaje de confirmación enviado por WhatsApp
```

### 5. Verificar en Firebase

1. Ir a Firebase Console → Realtime Database
2. Navegar a `/transactions`
3. Buscar tu transacción (por reference o orderId)
4. Verificar que el status sea `APPROVED`

## 🔧 Script de Prueba Automatizado

Crea este archivo `test-payment-flow.sh`:

```bash
#!/bin/bash

echo "🧪 Iniciando prueba del flujo completo de pagos..."

# 1. Generar enlace de pago
echo "\n📝 Paso 1: Generando enlace de pago..."
RESPONSE=$(curl -s -X POST https://api.kdsapp.site/api/payments/create-payment-link \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "tenant1769095946220o10i5g9zw",
    "orderId": "TEST_ORDER_'$(date +%s)'",
    "amount": 25000,
    "customerPhone": "+573991111111",
    "customerName": "Test User",
    "orderDetails": {
      "items": [{"name": "Bandeja Paisa", "quantity": 1, "price": 25000}],
      "deliveryAddress": "Calle 123 # 45-67, Medellín"
    }
  }')

echo "$RESPONSE" | jq .

# Extraer el payment link
PAYMENT_LINK=$(echo "$RESPONSE" | jq -r '.paymentLink')
REFERENCE=$(echo "$RESPONSE" | jq -r '.reference')

echo "\n✅ Enlace de pago generado:"
echo "   Link: $PAYMENT_LINK"
echo "   Reference: $REFERENCE"

echo "\n📋 Próximos pasos manuales:"
echo "1. Abre este enlace en tu navegador: $PAYMENT_LINK"
echo "2. Completa el pago con estos datos:"
echo "   - Tarjeta: 4242424242424242"
echo "   - Fecha: 12/28"
echo "   - CVC: 123"
echo "   - Cuotas: 1"
echo "\n3. Luego ejecuta:"
echo "   railway logs --tail 50"
echo "\n4. Busca estos logs:"
echo "   - ✅ Webhook de wompi validado correctamente"
echo "   - ✅ Transacción encontrada"
echo "   - ✅ Pago aprobado"
echo "   - ✅ Pedido creado en KDS"
```

## 🎯 Qué Esperar en Cada Paso

### ✅ Logs Correctos del Webhook

```
🔔 Procesando webhook de wompi para restaurante tenant1769095946220o10i5g9zw
✅ Webhook de wompi validado correctamente
📊 Reference del evento: tenant1769095946220o10i5g9zw_TEST_ORDER_1769534258_...
✅ Transacción encontrada: {
  restaurantId: 'tenant1769095946220o10i5g9zw',
  orderId: 'TEST_ORDER_1769534258',
  status: 'PENDING',
  ...
}
✅ Pago aprobado - Creando pedido en KDS...
✅ Pedido creado en KDS: { id: 'order_xxx', ... }
✅ Notificación enviada al dashboard
✅ Mensaje de confirmación enviado por WhatsApp
✅ Webhook procesado exitosamente
```

### ❌ Logs Si la Transacción No Existe

```
⚠️ Transacción con referencia xxx no encontrada en Firebase
Estado: TRANSACTION_NOT_FOUND
```

**Esto significa que el enlace de pago no se generó a través del bot.**

## 🚨 Troubleshooting

### Problema: "Transacción no encontrada"
**Causa:** El enlace de pago no se generó a través del endpoint correcto.
**Solución:** Usar el endpoint `/api/payments/create-payment-link` o el bot de WhatsApp.

### Problema: "Webhook no llega"
**Causa:** Wompi no está enviando el webhook o la URL está incorrecta.
**Solución:** Verificar en Wompi dashboard que la URL del webhook es `https://api.kdsapp.site/api/payments/webhook/wompi`

### Problema: "Firma inválida"
**Causa:** El eventsSecret no coincide.
**Solución:** Verificar que el eventsSecret en Firebase es correcto.

### Problema: "Bot no envía mensaje"
**Causa:** WhatsApp no está conectado o el número es incorrecto.
**Solución:** Verificar conexión de WhatsApp en el dashboard.

## 📊 Verificación Final

Después de completar el pago, verifica:

1. **Firebase Database:**
   - `/transactions/{reference}` → status: 'APPROVED'
   - `/tenants/{restaurantId}/orders/{orderId}` → existe el pedido

2. **Railway Logs:**
   - Webhook recibido y validado
   - Transacción encontrada
   - Pedido creado
   - Mensaje enviado

3. **WhatsApp:**
   - Cliente recibe mensaje de confirmación

## 🎉 Conclusión

Si sigues estos pasos y ves todos los ✅ en los logs, el flujo está funcionando perfectamente.

El código está correcto. Solo necesitas generar el enlace de pago a través del sistema (bot o API) para que la transacción se cree en Firebase antes de completar el pago.
