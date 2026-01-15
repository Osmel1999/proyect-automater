#!/bin/bash

# =============================================================================
# DIAGNÓSTICO DE PHONE NUMBER ID - WhatsApp Business API
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# IDs de configuración
PHONE_NUMBER_ID="985474321308699"
BUSINESS_ACCOUNT_ID="1230720492271251"

echo -e "${CYAN}${BOLD}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 DIAGNÓSTICO DE PHONE NUMBER ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

echo -e "${YELLOW}📋 Información de configuración:${NC}"
echo "   Phone Number ID: $PHONE_NUMBER_ID"
echo "   Business Account ID: $BUSINESS_ACCOUNT_ID"
echo ""

# Solicitar token
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}1️⃣  OBTENER ACCESS TOKEN${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Ve a: https://developers.facebook.com/apps/849706941272247/whatsapp-business/wa-dev-console/"
echo "Click en 'Generate access token' y cópialo."
echo ""
read -p "Pega el Access Token aquí: " ACCESS_TOKEN

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Token no proporcionado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Token recibido${NC}\n"

# Verificar información del Phone Number
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}2️⃣  VERIFICAR PHONE NUMBER${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}📞 Obteniendo información del Phone Number...${NC}\n"

PHONE_INFO=$(curl -s -X GET \
  "https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}?access_token=${ACCESS_TOKEN}")

echo -e "${YELLOW}Respuesta:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$PHONE_INFO" | jq '.' 2>/dev/null || echo "$PHONE_INFO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar Business Account
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}3️⃣  VERIFICAR BUSINESS ACCOUNT${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}🏢 Obteniendo información del Business Account...${NC}\n"

BUSINESS_INFO=$(curl -s -X GET \
  "https://graph.facebook.com/v21.0/${BUSINESS_ACCOUNT_ID}?fields=id,name,timezone_id,message_template_namespace,account_review_status&access_token=${ACCESS_TOKEN}")

echo -e "${YELLOW}Respuesta:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$BUSINESS_INFO" | jq '.' 2>/dev/null || echo "$BUSINESS_INFO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Listar Phone Numbers asociados al Business Account
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}4️⃣  LISTAR PHONE NUMBERS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}📱 Obteniendo lista de números...${NC}\n"

PHONE_LIST=$(curl -s -X GET \
  "https://graph.facebook.com/v21.0/${BUSINESS_ACCOUNT_ID}/phone_numbers?access_token=${ACCESS_TOKEN}")

echo -e "${YELLOW}Respuesta:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$PHONE_LIST" | jq '.' 2>/dev/null || echo "$PHONE_LIST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Resumen y diagnóstico
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📊 RESUMEN DE DIAGNÓSTICO${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Analizar resultados
if echo "$PHONE_INFO" | grep -q '"error"'; then
    echo -e "${RED}❌ Phone Number ID tiene errores${NC}"
    echo "   Puede que el número no esté configurado correctamente"
else
    echo -e "${GREEN}✅ Phone Number ID responde correctamente${NC}"
fi

if echo "$BUSINESS_INFO" | grep -q '"error"'; then
    echo -e "${RED}❌ Business Account tiene errores${NC}"
else
    echo -e "${GREEN}✅ Business Account responde correctamente${NC}"
fi

echo ""
echo -e "${YELLOW}${BOLD}📝 POSIBLES SOLUCIONES:${NC}"
echo ""
echo -e "${YELLOW}1.${NC} Si el Phone Number ID no tiene un número registrado:"
echo "   → Ve a Meta Dashboard > WhatsApp > API Setup"
echo "   → Verifica que haya un número de teléfono asociado"
echo ""
echo -e "${YELLOW}2.${NC} Si no hay números en la lista:"
echo "   → Necesitas registrar un número nuevo usando Embedded Signup"
echo "   → O asociar un número existente desde Meta Dashboard"
echo ""
echo -e "${YELLOW}3.${NC} Si el Business Account está en revisión:"
echo "   → Espera la aprobación de Meta"
echo "   → O usa un número de prueba mientras tanto"
echo ""
echo -e "${YELLOW}4.${NC} Si todo parece correcto pero da error:"
echo "   → Verifica permisos del System User"
echo "   → Regenera el Access Token"
echo "   → Confirma que la App tenga acceso a WhatsApp Business API"
echo ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📄 Más información: GUIA-API-TESTING-WHATSAPP.md${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
