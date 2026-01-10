#!/bin/bash

# ================================================
# SCRIPT: VERIFICAR CONFIGURACIÓN DE DOMINIO
# ================================================
# Este script verifica que todo esté configurado
# correctamente para el dominio unificado
# ================================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🔍 VERIFICACIÓN DE DOMINIO UNIFICADO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Contadores
PASSED=0
FAILED=0
WARNINGS=0

# ================================================
# 1. VERIFICAR DNS
# ================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  VERIFICANDO DNS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Frontend
echo -n "🌐 kdsapp.site (frontend): "
if nslookup kdsapp.site > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Resuelve${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ No resuelve${NC}"
    FAILED=$((FAILED + 1))
fi

# Backend API
echo -n "🌐 api.kdsapp.site (backend): "
if nslookup api.kdsapp.site > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Resuelve${NC}"
    PASSED=$((PASSED + 1))
    
    # Verificar que sea CNAME a Railway
    CNAME=$(dig api.kdsapp.site CNAME +short)
    if [[ $CNAME == *"railway.app"* ]]; then
        echo -e "   ${GREEN}↳ CNAME correcto: $CNAME${NC}"
    else
        echo -e "   ${YELLOW}⚠️  CNAME inesperado: $CNAME${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ No resuelve - Configura el CNAME en tu proveedor DNS${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# ================================================
# 2. VERIFICAR SSL/HTTPS
# ================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  VERIFICANDO SSL/HTTPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Frontend SSL
echo -n "🔒 https://kdsapp.site: "
if curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://kdsapp.site | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ SSL activo${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  No responde (puede estar configurándose)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Backend API SSL
echo -n "🔒 https://api.kdsapp.site: "
if curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://api.kdsapp.site/health | grep -q "200"; then
    echo -e "${GREEN}✅ SSL activo y API responde${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ No responde - Verifica Railway Dashboard${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# ================================================
# 3. VERIFICAR HEALTH CHECK
# ================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  VERIFICANDO HEALTH CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -n "🏥 Health endpoint: "
HEALTH_RESPONSE=$(curl -s --max-time 10 https://api.kdsapp.site/health 2>&1 || echo "error")

if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Backend saludable${NC}"
    echo "   Response: $HEALTH_RESPONSE"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ Backend no responde correctamente${NC}"
    echo "   Response: $HEALTH_RESPONSE"
    FAILED=$((FAILED + 1))
fi

echo ""

# ================================================
# 4. VERIFICAR ARCHIVOS DE CONFIGURACIÓN
# ================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  VERIFICANDO ARCHIVOS DE CONFIGURACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# facebook-config.js
echo -n "📄 facebook-config.js: "
if [ -f "facebook-config.js" ]; then
    if grep -q "callbackUrl: '/api/whatsapp/callback'" facebook-config.js; then
        echo -e "${GREEN}✅ Configurado correctamente${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠️  Revisar callbackUrl${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ No encontrado${NC}"
    FAILED=$((FAILED + 1))
fi

# .env.railway
echo -n "📄 .env.railway: "
if [ -f ".env.railway" ]; then
    if grep -q "BASE_URL=https://api.kdsapp.site" .env.railway; then
        echo -e "${GREEN}✅ BASE_URL correcto${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠️  BASE_URL debe ser https://api.kdsapp.site${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "REDIRECT_URI=https://api.kdsapp.site/api/whatsapp/callback" .env.railway; then
        echo -e "   ${GREEN}✅ REDIRECT_URI correcto${NC}"
    else
        echo -e "   ${YELLOW}⚠️  REDIRECT_URI debe actualizarse${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ No encontrado${NC}"
    FAILED=$((FAILED + 1))
fi

# firebase.json
echo -n "📄 firebase.json: "
if [ -f "firebase.json" ]; then
    echo -e "${GREEN}✅ Existe${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ No encontrado${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# ================================================
# 5. VERIFICAR RUTAS DE FRONTEND
# ================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  VERIFICANDO RUTAS DE FRONTEND"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ROUTES=(
    "/"
    "/onboarding.html"
    "/onboarding-success.html"
    "/privacy-policy.html"
    "/terms.html"
    "/kds"
    "/login"
)

for route in "${ROUTES[@]}"; do
    echo -n "🌐 $route: "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://kdsapp.site$route" 2>&1 || echo "000")
    
    if [[ $STATUS == "200" ]]; then
        echo -e "${GREEN}✅ OK ($STATUS)${NC}"
        PASSED=$((PASSED + 1))
    elif [[ $STATUS == "301" ]] || [[ $STATUS == "302" ]]; then
        echo -e "${YELLOW}⚠️  Redirect ($STATUS)${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${YELLOW}⚠️  No desplegado aún ($STATUS)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""

# ================================================
# 6. VERIFICAR ENDPOINTS DE API
# ================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  VERIFICANDO ENDPOINTS DE API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

API_ENDPOINTS=(
    "/health"
    "/api/webhooks/whatsapp"
    "/api/whatsapp/callback"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    echo -n "🔌 $endpoint: "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://api.kdsapp.site$endpoint" 2>&1 || echo "000")
    
    if [[ $STATUS == "200" ]]; then
        echo -e "${GREEN}✅ OK ($STATUS)${NC}"
        PASSED=$((PASSED + 1))
    elif [[ $STATUS == "404" ]] && [[ $endpoint != "/health" ]]; then
        echo -e "${GREEN}✅ Accesible ($STATUS - esperado para GET)${NC}"
        PASSED=$((PASSED + 1))
    elif [[ $STATUS == "000" ]]; then
        echo -e "${RED}❌ No responde${NC}"
        FAILED=$((FAILED + 1))
    else
        echo -e "${YELLOW}⚠️  Status: $STATUS${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""

# ================================================
# 7. RESUMEN
# ================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 RESUMEN${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Passed:   $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed:   $FAILED${NC}"
echo ""

# Determinar estado general
if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡TODO PERFECTO! Sistema listo para producción${NC}"
    echo ""
    EXIT_CODE=0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Sistema mayormente funcional, revisar advertencias${NC}"
    echo ""
    EXIT_CODE=0
else
    echo -e "${RED}❌ Se encontraron problemas que deben resolverse${NC}"
    echo ""
    EXIT_CODE=1
fi

# ================================================
# 8. PRÓXIMOS PASOS
# ================================================
if [ $FAILED -gt 0 ] || [ $WARNINGS -gt 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 PRÓXIMOS PASOS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if [[ $(nslookup api.kdsapp.site 2>&1) == *"can't find"* ]]; then
        echo "1. Configura DNS: Agregar CNAME api → railway.app"
    fi
    
    if [ $FAILED -gt 0 ]; then
        echo "2. Revisa Railway Dashboard: railway open"
        echo "3. Verifica variables de entorno en Railway"
        echo "4. Revisa logs: railway logs"
    fi
    
    if [ $WARNINGS -gt 0 ]; then
        echo "5. Despliega frontend: firebase deploy --only hosting"
        echo "6. Actualiza Meta Dashboard con nuevas URLs"
    fi
    
    echo ""
    echo "📚 Consulta: CHECKLIST-DOMINIO-UNIFICADO.md"
    echo ""
fi

exit $EXIT_CODE
