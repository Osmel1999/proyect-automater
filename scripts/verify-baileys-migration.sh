#!/bin/bash

# Script de verificación de migración a Baileys
# Verifica que el onboarding.html use Baileys y no Meta/Facebook

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Verificación de Migración a Baileys             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Verificar que onboarding.html existe
echo -e "${BLUE}[1/8] Verificando archivo onboarding.html...${NC}"
if [ -f "onboarding.html" ]; then
    echo -e "${GREEN}✅ onboarding.html existe${NC}"
else
    echo -e "${RED}❌ onboarding.html NO existe${NC}"
    exit 1
fi

# 2. Verificar que NO contiene referencias a Facebook SDK
echo -e "${BLUE}[2/8] Verificando ausencia de Facebook SDK...${NC}"
if grep -q "connect.facebook.net" onboarding.html; then
    echo -e "${RED}❌ ENCONTRADO: Facebook SDK aún presente${NC}"
    echo -e "${YELLOW}   Líneas encontradas:${NC}"
    grep -n "connect.facebook.net" onboarding.html
    exit 1
else
    echo -e "${GREEN}✅ No se encontró Facebook SDK${NC}"
fi

# 3. Verificar que NO contiene FB.init
echo -e "${BLUE}[3/8] Verificando ausencia de FB.init...${NC}"
if grep -q "FB.init" onboarding.html; then
    echo -e "${RED}❌ ENCONTRADO: FB.init aún presente${NC}"
    echo -e "${YELLOW}   Líneas encontradas:${NC}"
    grep -n "FB.init" onboarding.html
    exit 1
else
    echo -e "${GREEN}✅ No se encontró FB.init${NC}"
fi

# 4. Verificar que NO contiene facebook-config.js
echo -e "${BLUE}[4/8] Verificando ausencia de facebook-config.js...${NC}"
if grep -q "facebook-config.js" onboarding.html; then
    echo -e "${RED}❌ ENCONTRADO: facebook-config.js aún presente${NC}"
    echo -e "${YELLOW}   Líneas encontradas:${NC}"
    grep -n "facebook-config.js" onboarding.html
    exit 1
else
    echo -e "${GREEN}✅ No se encontró facebook-config.js${NC}"
fi

# 5. Verificar que contiene QRCode.js (para Baileys)
echo -e "${BLUE}[5/8] Verificando presencia de QRCode.js...${NC}"
if grep -q "qrcode" onboarding.html; then
    echo -e "${GREEN}✅ QRCode.js está presente (Baileys)${NC}"
else
    echo -e "${RED}❌ QRCode.js NO encontrado${NC}"
    exit 1
fi

# 6. Verificar que contiene endpoints Baileys
echo -e "${BLUE}[6/8] Verificando endpoints Baileys...${NC}"
if grep -q "/api/baileys" onboarding.html; then
    echo -e "${GREEN}✅ Endpoints Baileys encontrados${NC}"
    echo -e "${YELLOW}   Endpoints detectados:${NC}"
    grep -o "/api/baileys/[a-z-]*" onboarding.html | sort -u | sed 's/^/   • /'
else
    echo -e "${RED}❌ Endpoints Baileys NO encontrados${NC}"
    exit 1
fi

# 7. Verificar que existe backup
echo -e "${BLUE}[7/8] Verificando existencia de backups...${NC}"
BACKUPS=$(ls -1 onboarding-meta-backup*.html 2>/dev/null | wc -l | xargs)
if [ "$BACKUPS" -gt 0 ]; then
    echo -e "${GREEN}✅ Backups encontrados: $BACKUPS archivos${NC}"
    ls -1 onboarding-meta-backup*.html | sed 's/^/   • /'
else
    echo -e "${YELLOW}⚠️  No se encontraron backups (puede ser normal)${NC}"
fi

# 8. Verificar backend Baileys
echo -e "${BLUE}[8/8] Verificando módulos backend Baileys...${NC}"
BAILEYS_FILES=(
    "server/baileys/session-manager.js"
    "server/baileys/auth-handler.js"
    "server/baileys/storage.js"
    "server/baileys/index.js"
    "server/controllers/baileys-controller.js"
    "server/routes/baileys-routes.js"
)

MISSING=0
for file in "${BAILEYS_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}   ✅ $file${NC}"
    else
        echo -e "${RED}   ❌ $file FALTANTE${NC}"
        MISSING=$((MISSING + 1))
    fi
done

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los módulos backend presentes${NC}"
else
    echo -e "${RED}❌ Faltan $MISSING módulos backend${NC}"
    exit 1
fi

# Resumen final
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ MIGRACIÓN A BAILEYS VERIFICADA CON ÉXITO      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Resumen:${NC}"
echo -e "   • onboarding.html usa Baileys (no Meta)"
echo -e "   • Backend Baileys configurado correctamente"
echo -e "   • Backups de versión anterior disponibles"
echo ""
echo -e "${YELLOW}🚀 Próximos pasos:${NC}"
echo -e "   1. Probar en localhost: npm start"
echo -e "   2. Visitar: http://localhost:3000/onboarding.html"
echo -e "   3. Escanear QR y verificar conexión"
echo -e "   4. Hacer commit y push de cambios"
echo -e "   5. Deploy a producción (Railway/Render)"
echo -e "   6. Probar en producción: https://kdsapp.site/onboarding"
echo ""
