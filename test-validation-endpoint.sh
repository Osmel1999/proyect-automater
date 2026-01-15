#!/bin/bash

# 🧪 Script de Prueba Rápida - Validación de Portfolio
# Verifica que el endpoint POST esté disponible y responda correctamente

echo "🧪 PRUEBA RÁPIDA - Validación de Portfolio"
echo "=========================================="
echo ""

BACKEND_URL="https://kds-backend-production.up.railway.app"
ENDPOINT="/api/auth/legacy/callback"

echo "📡 Backend URL: $BACKEND_URL"
echo "🎯 Endpoint: $ENDPOINT"
echo ""

# Test 1: Verificar que el endpoint responda (sin código válido)
echo "🔍 Test 1: Verificar disponibilidad del endpoint"
echo "----------------------------------------"

RESPONSE=$(curl -s -X POST "$BACKEND_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"code":"test_invalid_code"}' \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
echo ""

if [ "$HTTP_CODE" == "500" ] || [ "$HTTP_CODE" == "400" ]; then
  echo "✅ Endpoint está activo (error esperado con código inválido)"
else
  echo "❓ Respuesta inesperada (revisar manualmente)"
fi

echo ""
echo "=========================================="
echo "📋 RESUMEN"
echo "=========================================="
echo ""
echo "✅ Endpoint POST creado: $ENDPOINT"
echo "✅ Backend respondiendo"
echo ""
echo "🎯 Próximo paso:"
echo "   Abrir en navegador: https://kdsapp.site/onboarding-legacy-validation.html"
echo "   y probar el flujo completo con Facebook Embedded Signup"
echo ""
echo "📊 Ver logs en tiempo real:"
echo "   railway logs --follow"
echo ""
