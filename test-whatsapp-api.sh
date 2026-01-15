#!/bin/bash
#
# Script de prueba para WhatsApp Business API
# Usa el API Testing de Meta
#

echo "🧪 WHATSAPP BUSINESS API - TESTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración (de la captura de Meta Dashboard)
PHONE_NUMBER_ID="985474321308699"
BUSINESS_ACCOUNT_ID="1230720492271251"
API_VERSION="v22.0"

echo "📋 Configuración detectada:"
echo "   Phone Number ID: $PHONE_NUMBER_ID"
echo "   Business Account ID: $BUSINESS_ACCOUNT_ID"
echo ""

# Solicitar Access Token
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}1️⃣  PASO 1: GENERAR ACCESS TOKEN${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Ve a: https://developers.facebook.com/apps/849706941272247/whatsapp-business/wa-dev-console/"
echo "Click en 'Generate access token' y cópialo."
echo ""
read -p "Pega el Access Token aquí: " ACCESS_TOKEN

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Error: Access Token vacío${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token recibido${NC}"
echo ""

# Solicitar número de teléfono
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}2️⃣  PASO 2: NÚMERO DE DESTINO${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Opciones:"
echo "  1) Tu número (ejemplo: 573042734424)"
echo "  2) Número de prueba de Meta: 15551561260"
echo ""
read -p "Selecciona opción (1 o 2): " OPTION

if [ "$OPTION" = "1" ]; then
  read -p "Ingresa tu número (formato: 573042734424, sin + ni espacios): " TO_NUMBER
elif [ "$OPTION" = "2" ]; then
  TO_NUMBER="15551561260"
  echo "Usando número de prueba: +1 555 156 1260"
else
  echo -e "${RED}❌ Opción inválida${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Número configurado: $TO_NUMBER${NC}"
echo ""

# Mensaje
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}3️⃣  PASO 3: ENVIAR MENSAJE${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
MESSAGE="Hola 👋 Este es un mensaje de prueba desde la API de WhatsApp Business.\n\nEnviado: $TIMESTAMP\n\nSistema: KDS Platform"

echo "Mensaje a enviar:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "$MESSAGE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "¿Enviar mensaje? (s/n): " CONFIRM

if [ "$CONFIRM" != "s" ]; then
  echo "❌ Cancelado"
  exit 0
fi

echo ""
echo "📤 Enviando mensaje..."
echo ""

# Enviar mensaje
RESPONSE=$(curl -s -X POST \
  "https://graph.facebook.com/$API_VERSION/$PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"messaging_product\": \"whatsapp\",
    \"to\": \"$TO_NUMBER\",
    \"type\": \"text\",
    \"text\": {
      \"body\": \"$MESSAGE\"
    }
  }")

echo "📥 Respuesta de la API:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar si fue exitoso
if echo "$RESPONSE" | grep -q '"messages"'; then
  MESSAGE_ID=$(echo "$RESPONSE" | grep -o '"id":"wamid[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✅ MENSAJE ENVIADO EXITOSAMENTE${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "📱 Message ID: $MESSAGE_ID"
  echo "📞 Destinatario: +$TO_NUMBER"
  echo ""
  echo "🔔 Revisa tu WhatsApp para ver el mensaje"
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📊 VERIFICAR WEBHOOK${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Para ver si el webhook recibió eventos, ejecuta:"
  echo "   railway logs --tail 30"
  echo ""
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ ERROR AL ENVIAR MENSAJE${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Posibles causas:"
  echo "  • Access Token inválido o expirado (dura 60 min)"
  echo "  • Número de teléfono en formato incorrecto"
  echo "  • Número no tiene WhatsApp"
  echo ""
  echo "Solución:"
  echo "  1. Genera un nuevo Access Token en Meta Dashboard"
  echo "  2. Verifica el formato del número (ejemplo: 573042734424)"
  echo "  3. Prueba con el número de Meta: 15551561260"
  echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 Guía completa: GUIA-API-TESTING-WHATSAPP.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
