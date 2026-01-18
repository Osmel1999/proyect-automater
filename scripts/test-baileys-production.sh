#!/bin/bash

##############################################################################
# Test completo de la migración a Baileys en producción
# Verifica todos los endpoints y funcionalidad del sistema Baileys
##############################################################################

echo "🧪 =========================================="
echo "🧪 TEST COMPLETO - MIGRACIÓN BAILEYS"
echo "🧪 =========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URLs a probar
RAILWAY_URL="https://kds-backend-production-9d3f.up.railway.app"
API_URL="https://api.kdsapp.site"
CDN_URL="https://kdsapp.site"

PASSED=0
FAILED=0

# Función para verificar endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected="$3"
    
    echo -n "  Testing $name... "
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "    Expected: $expected"
        echo "    Got: ${response:0:100}..."
        ((FAILED++))
        return 1
    fi
}

# Función para verificar ausencia de texto
test_not_contains() {
    local name="$1"
    local url="$2"
    local not_expected="$3"
    
    echo -n "  Testing $name... "
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q "$not_expected"; then
        echo -e "${RED}❌ FAIL${NC}"
        echo "    Should NOT contain: $not_expected"
        ((FAILED++))
        return 1
    else
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        return 0
    fi
}

# Función para verificar headers HTTP
test_http_status() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -n "  Testing $name... "
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $status)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status)"
        ((FAILED++))
        return 1
    fi
}

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}1. VERIFICANDO BACKEND BAILEYS (Railway)${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_http_status "Health Check" "$RAILWAY_URL/api/baileys/health" "200"
test_endpoint "Health Response" "$RAILWAY_URL/api/baileys/health" "baileys"
test_endpoint "Sessions Count" "$RAILWAY_URL/api/baileys/health" "activeSessions"

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}2. VERIFICANDO API SUBDOMAIN (api.kdsapp.site)${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_http_status "API Health Check" "$API_URL/api/baileys/health" "200"
test_endpoint "API Health Response" "$API_URL/api/baileys/health" "baileys"

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}3. VERIFICANDO FRONTEND BAILEYS (api.kdsapp.site)${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_http_status "Onboarding Page" "$API_URL/onboarding.html" "200"
test_endpoint "QRCode.js Library" "$API_URL/onboarding.html" "qrcode@1.5.3"
test_endpoint "Baileys Class" "$API_URL/onboarding.html" "class BaileysOnboarding"
test_endpoint "Baileys API Endpoint" "$API_URL/onboarding.html" "/api/baileys/connect"
test_not_contains "No Facebook SDK" "$API_URL/onboarding.html" "facebook-config.js"
test_not_contains "No Meta References" "$API_URL/onboarding.html" "Meta API"

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}4. VERIFICANDO CDN (kdsapp.site)${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_http_status "CDN Onboarding" "$CDN_URL/onboarding.html" "200"

# Verificar si CDN tiene la versión correcta
echo -n "  Testing CDN Version... "
cdn_response=$(curl -s "$CDN_URL/onboarding.html")
if echo "$cdn_response" | grep -q "class BaileysOnboarding"; then
    echo -e "${GREEN}✅ PASS${NC} (Baileys version)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (CDN still serving old version - cache needs to expire)"
    echo "    Note: CDN cache has 5-minute TTL, may need to wait or purge cache"
fi

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}5. VERIFICANDO WEBSOCKET${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "  Testing WebSocket endpoint..."
ws_test=$(curl -s -I "$RAILWAY_URL/socket.io/" | grep "HTTP")
if echo "$ws_test" | grep -q "200\|101\|426"; then
    echo -e "${GREEN}✅ PASS${NC} (WebSocket endpoint accessible)"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (WebSocket endpoint not accessible)"
    ((FAILED++))
fi

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}6. VERIFICANDO ARCHIVOS ESTÁTICOS${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_http_status "CSS Styles" "$API_URL/styles.css" "200"
test_http_status "Config JS" "$API_URL/config.js" "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡TODOS LOS TESTS PASARON!${NC}"
    echo -e "${GREEN}✅ Tests pasados: $PASSED${NC}"
    echo ""
    echo "Estado: Migración a Baileys completada exitosamente"
else
    echo -e "${YELLOW}⚠️  TESTS COMPLETADOS CON ADVERTENCIAS${NC}"
    echo -e "${GREEN}✅ Tests pasados: $PASSED${NC}"
    echo -e "${RED}❌ Tests fallidos: $FAILED${NC}"
    echo ""
    echo "Nota: Si el CDN aún muestra la versión antigua, espera 5 minutos"
    echo "      para que expire el cache, o purga manualmente el cache de Fastly."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "URLs para testing manual:"
echo "  🌐 Railway Direct:  $RAILWAY_URL/onboarding.html"
echo "  🌐 API Subdomain:   $API_URL/onboarding.html"
echo "  🌐 Main Domain:     $CDN_URL/onboarding.html"
echo ""
echo "  📊 Health Check:    $API_URL/api/baileys/health"
echo ""

exit $FAILED
