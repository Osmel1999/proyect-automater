#!/bin/bash

# Script de Prueba Completa del Bot de WhatsApp
# Verifica el flujo completo de mensajes

echo "🧪 ====================================="
echo "   PRUEBA COMPLETA DEL BOT WHATSAPP"
echo "====================================="
echo ""

# Configuración
BASE_URL="https://api.kdsapp.site"
TENANT_ID="${1:-default}"
FROM="${2:-5493516666666}"
MESSAGE="${3:-hola}"

echo "📋 Configuración:"
echo "   URL: $BASE_URL"
echo "   Tenant ID: $TENANT_ID"
echo "   From: $FROM"
echo "   Mensaje: $MESSAGE"
echo ""

# Paso 1: Health Check
echo "🔍 Paso 1: Health Check del servidor..."
HEALTH=$(curl -s "$BASE_URL/health")
echo "$HEALTH" | jq '.'

if echo "$HEALTH" | jq -e '.status == "ok"' > /dev/null; then
  echo "✅ Servidor OK"
else
  echo "❌ Servidor no responde"
  exit 1
fi
echo ""

# Paso 2: Verificar estado de Baileys
echo "🔍 Paso 2: Verificar estado de sesión Baileys..."
STATUS=$(curl -s "$BASE_URL/api/baileys/status?tenantId=$TENANT_ID")
echo "$STATUS" | jq '.'

if echo "$STATUS" | jq -e '.connected == true' > /dev/null; then
  PHONE=$(echo "$STATUS" | jq -r '.phoneNumber')
  echo "✅ Sesión conectada: $PHONE"
else
  echo "⚠️  Sesión NO conectada"
  echo ""
  echo "💡 Pasos para conectar:"
  echo "   1. Ir a https://app.kdsapp.site/onboarding"
  echo "   2. Escanear el código QR con WhatsApp"
  echo "   3. Esperar confirmación de conexión"
  echo "   4. Volver a ejecutar este script"
  echo ""
  exit 1
fi
echo ""

# Paso 3: Enviar mensaje de prueba
echo "🔍 Paso 3: Enviar mensaje de prueba..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/baileys/test-message" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"from\": \"$FROM\",
    \"message\": \"$MESSAGE\"
  }")

echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
  BOT_RESPONSE=$(echo "$RESPONSE" | jq -r '.response')
  
  if [ "$BOT_RESPONSE" = "true" ]; then
    echo "✅ Bot procesó y respondió correctamente"
  elif [ "$BOT_RESPONSE" = "null" ]; then
    echo "⚠️  Bot procesó pero no respondió (puede estar desactivado)"
  else
    echo "❌ Respuesta inesperada: $BOT_RESPONSE"
  fi
else
  echo "❌ Error en la prueba"
  exit 1
fi
echo ""

# Paso 4: Verificar logs (opcional)
echo "🔍 Paso 4: Instrucciones para verificar logs..."
echo ""
echo "Para ver logs detallados en Railway:"
echo "   railway logs --tail 50 | grep -A 5 'DEBUG\\|response'"
echo ""

echo "✅ ====================================="
echo "   PRUEBA COMPLETADA"
echo "====================================="
echo ""
echo "📝 Próximos pasos:"
echo "   1. Si la prueba pasó, enviar un mensaje REAL desde WhatsApp"
echo "   2. Verificar que el bot responde en el chat de WhatsApp"
echo "   3. Revisar logs en Railway si hay problemas"
echo ""
