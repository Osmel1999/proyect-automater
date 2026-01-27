#!/bin/bash

# Script para probar la creación de un link de pago a través de la app
# Esto garantiza que la transacción se guarde en Firebase con el paymentLinkId correcto

echo "════════════════════════════════════════════════════════════"
echo "🧪 TEST: Crear Link de Pago a través de la App"
echo "════════════════════════════════════════════════════════════"
echo ""

# URL del backend (cambiar si es necesario)
BASE_URL="${BASE_URL:-https://api.kdsapp.site}"

# Datos de prueba
RESTAURANT_ID="rest_test_$(date +%s)"
ORDER_ID="order_test_$(date +%s)"
AMOUNT=50000  # $500 COP
CUSTOMER_PHONE="+573001234567"
CUSTOMER_NAME="Test Usuario"
CUSTOMER_EMAIL="test@kdsapp.site"

echo "📝 Datos de la prueba:"
echo "   Restaurant ID: $RESTAURANT_ID"
echo "   Order ID: $ORDER_ID"
echo "   Amount: $AMOUNT centavos ($((AMOUNT / 100)) COP)"
echo "   Customer: $CUSTOMER_NAME"
echo "   Phone: $CUSTOMER_PHONE"
echo "   Email: $CUSTOMER_EMAIL"
echo ""

# Crear el payload JSON
PAYLOAD=$(cat <<EOF
{
  "restaurantId": "$RESTAURANT_ID",
  "orderId": "$ORDER_ID",
  "amount": $AMOUNT,
  "customerPhone": "$CUSTOMER_PHONE",
  "customerName": "$CUSTOMER_NAME",
  "customerEmail": "$CUSTOMER_EMAIL",
  "orderDetails": {
    "items": ["Pizza Margarita x1", "Coca Cola x1"],
    "address": "Calle 123 #45-67, Bogotá",
    "notes": "Test de integración"
  }
}
EOF
)

echo "────────────────────────────────────────────────────────────"
echo "📤 Enviando solicitud al backend..."
echo "   Endpoint: $BASE_URL/api/payments/create-payment-link"
echo "────────────────────────────────────────────────────────────"
echo ""

# Hacer la petición
RESPONSE=$(curl -s -X POST "$BASE_URL/api/payments/create-payment-link" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Verificar si hubo error
if [ $? -ne 0 ]; then
  echo "❌ Error al conectar con el servidor"
  exit 1
fi

# Mostrar la respuesta
echo "📥 Respuesta del servidor:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Extraer el payment link si existe
PAYMENT_LINK=$(echo "$RESPONSE" | jq -r '.paymentLink' 2>/dev/null)
TRANSACTION_ID=$(echo "$RESPONSE" | jq -r '.transactionId' 2>/dev/null)
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)

if [ "$SUCCESS" = "true" ] && [ "$PAYMENT_LINK" != "null" ]; then
  echo "════════════════════════════════════════════════════════════"
  echo "✅ LINK DE PAGO CREADO EXITOSAMENTE"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo "🔗 Payment Link:"
  echo "   $PAYMENT_LINK"
  echo ""
  echo "🆔 Transaction ID (Payment Link ID):"
  echo "   $TRANSACTION_ID"
  echo ""
  echo "📋 Reference generado:"
  echo "   ${RESTAURANT_ID}_${ORDER_ID}_*"
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "🎯 PRÓXIMOS PASOS:"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo "1. Abre el link de pago en tu navegador:"
  echo "   $PAYMENT_LINK"
  echo ""
  echo "2. Usa los datos de prueba de Wompi (sandbox):"
  echo "   Tarjeta: 4242 4242 4242 4242"
  echo "   CVV: 123"
  echo "   Fecha: 12/25 (cualquier fecha futura)"
  echo "   Cuotas: 1"
  echo ""
  echo "3. Completa el pago"
  echo ""
  echo "4. Verifica los logs del backend:"
  echo "   railway logs --tail"
  echo ""
  echo "5. Deberías ver:"
  echo "   ✅ Webhook procesado exitosamente"
  echo "   ✅ Transacción encontrada en Firebase"
  echo "   ✅ Payment Link ID: $TRANSACTION_ID"
  echo ""
  echo "════════════════════════════════════════════════════════════"
else
  echo "════════════════════════════════════════════════════════════"
  echo "❌ ERROR AL CREAR EL LINK DE PAGO"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo "Verifica:"
  echo "  1. Que el backend esté corriendo"
  echo "  2. Que las credenciales de Wompi estén configuradas"
  echo "  3. Que el restaurante tenga un gateway configurado"
  echo ""
fi
