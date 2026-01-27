#!/bin/bash

echo "🧪 Iniciando prueba del flujo completo de pagos..."

# 1. Generar enlace de pago
echo ""
echo "📝 Paso 1: Generando enlace de pago..."
RESPONSE=$(curl -s -X POST https://api.kdsapp.site/api/payments/create-payment-link \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "tenant1769095946220o10i5g9zw",
    "orderId": "TEST_ORDER_'$(date +%s)'",
    "amount": 150000,
    "customerPhone": "+573991111111",
    "customerName": "Test User",
    "orderDetails": {
      "items": [{"name": "Bandeja Paisa", "quantity": 1, "price": 150000}],
      "deliveryAddress": "Calle 123 # 45-67, Medellín"
    }
  }')

echo "$RESPONSE" | jq .

# Extraer el payment link
PAYMENT_LINK=$(echo "$RESPONSE" | jq -r '.paymentLink')
REFERENCE=$(echo "$RESPONSE" | jq -r '.reference')

echo ""
echo "✅ Enlace de pago generado:"
echo "   Link: $PAYMENT_LINK"
echo "   Reference: $REFERENCE"

echo ""
echo "📋 Próximos pasos manuales:"
echo "1. Abre este enlace en tu navegador: $PAYMENT_LINK"
echo "2. Completa el pago con estos datos:"
echo "   - Tarjeta: 4242424242424242"
echo "   - Fecha: 12/28"
echo "   - CVC: 123"
echo "   - Cuotas: 1"
echo ""
echo "3. Luego ejecuta:"
echo "   railway logs --tail 50"
echo ""
echo "4. Busca estos logs:"
echo "   - ✅ Webhook de wompi validado correctamente"
echo "   - ✅ Transacción encontrada"
echo "   - ✅ Pago aprobado"
echo "   - ✅ Pedido creado en KDS"
