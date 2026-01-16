#!/bin/bash

# ====================================
# Script de Verificación - Sistema Dual
# ====================================
# Verifica que ambas configuraciones estén listas
# Fecha: 14 de enero de 2026
# ====================================

echo "🔍 Verificando Sistema Dual de Configuración..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
CHECKS_PASSED=0
CHECKS_FAILED=0

# Función para verificar
check() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}❌ $1${NC}"
    ((CHECKS_FAILED++))
  fi
}

# ====================================
# 1. Verificar archivos frontend
# ====================================
echo -e "${BLUE}📂 Verificando archivos frontend...${NC}"

[ -f "onboarding.html" ]
check "onboarding.html (principal) existe"

[ -f "onboarding-2.html" ]
check "onboarding-2.html (legacy) existe"

[ -f "facebook-config.js" ]
check "facebook-config.js (principal) existe"

[ -f "facebook-config-legacy.js" ]
check "facebook-config-legacy.js (legacy) existe"

[ -f "dual-config.js" ]
check "dual-config.js existe"

echo ""

# ====================================
# 2. Verificar configuración en archivos
# ====================================
echo -e "${BLUE}🔧 Verificando configuraciones...${NC}"

# Portfolio principal en onboarding.html
grep -q "880566844730976" onboarding.html
check "Portfolio principal (880566844730976) en onboarding.html"

# Portfolio legacy en onboarding-2.html
grep -q "1473689432774278" onboarding-2.html
check "Portfolio legacy (1473689432774278) en onboarding-2.html"

# App ID principal
grep -q "849706941272247" facebook-config.js
check "App ID principal en facebook-config.js"

# App ID legacy
grep -q "1860852208127086" facebook-config-legacy.js
check "App ID legacy en facebook-config-legacy.js"

echo ""

# ====================================
# 3. Verificar archivos backend
# ====================================
echo -e "${BLUE}⚙️  Verificando backend...${NC}"

[ -f "server/index.js" ]
check "server/index.js existe"

# Verificar endpoint principal
grep -q "/api/whatsapp/callback'" server/index.js
check "Endpoint principal /api/whatsapp/callback"

# Verificar endpoint legacy
grep -q "/api/whatsapp/callback-legacy" server/index.js
check "Endpoint legacy /api/whatsapp/callback-legacy"

# Verificar webhook principal
grep -q "/webhook/whatsapp'" server/index.js
check "Webhook principal /webhook/whatsapp"

# Verificar webhook legacy
grep -q "/webhook/whatsapp-legacy" server/index.js
check "Webhook legacy /webhook/whatsapp-legacy"

echo ""

# ====================================
# 4. Verificar variables de entorno
# ====================================
echo -e "${BLUE}🌍 Verificando variables de entorno...${NC}"

if [ -f ".env" ]; then
  echo -e "${GREEN}✅ Archivo .env encontrado${NC}"
  
  # Verificar variables principales
  if grep -q "WHATSAPP_APP_ID=" .env; then
    echo -e "${GREEN}✅ WHATSAPP_APP_ID configurada${NC}"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}❌ WHATSAPP_APP_ID no configurada${NC}"
    ((CHECKS_FAILED++))
  fi
  
  # Verificar variables legacy (opcionales)
  if grep -q "WHATSAPP_APP_ID_LEGACY=" .env; then
    echo -e "${GREEN}✅ WHATSAPP_APP_ID_LEGACY configurada (opcional)${NC}"
  else
    echo -e "${YELLOW}⚠️  WHATSAPP_APP_ID_LEGACY no configurada (opcional)${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Archivo .env no encontrado${NC}"
  echo -e "${YELLOW}   Crea uno usando: cp .env.dual.example .env${NC}"
fi

echo ""

# ====================================
# 5. Verificar estructura de directorios
# ====================================
echo -e "${BLUE}📁 Verificando estructura...${NC}"

[ -d "server" ]
check "Directorio server/ existe"

[ -d "assets" ]
check "Directorio assets/ existe"

echo ""

# ====================================
# 6. Verificar dependencias
# ====================================
echo -e "${BLUE}📦 Verificando dependencias...${NC}"

if [ -f "package.json" ]; then
  if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js instalado${NC}"
    ((CHECKS_PASSED++))
    
    if [ -d "node_modules" ]; then
      echo -e "${GREEN}✅ node_modules/ existe${NC}"
      ((CHECKS_PASSED++))
    else
      echo -e "${YELLOW}⚠️  node_modules/ no encontrado${NC}"
      echo -e "${YELLOW}   Ejecuta: npm install${NC}"
    fi
  else
    echo -e "${RED}❌ Node.js no instalado${NC}"
    ((CHECKS_FAILED++))
  fi
else
  echo -e "${RED}❌ package.json no encontrado${NC}"
  ((CHECKS_FAILED++))
fi

echo ""

# ====================================
# 7. Información de configuración
# ====================================
echo -e "${BLUE}ℹ️  Información de Configuración${NC}"
echo ""
echo "📍 URLs de Onboarding:"
echo "   Principal: https://kdsapp.site/onboarding.html"
echo "   Legacy:    https://kdsapp.site/onboarding-2.html"
echo ""
echo "📍 Endpoints Backend:"
echo "   Callback Principal: /api/whatsapp/callback"
echo "   Callback Legacy:    /api/whatsapp/callback-legacy"
echo "   Webhook Principal:  /webhook/whatsapp"
echo "   Webhook Legacy:     /webhook/whatsapp-legacy"
echo ""
echo "🏢 Portfolios:"
echo "   Principal: 880566844730976 (KDS Platform)"
echo "   Legacy:    1473689432774278 (KDS Legacy)"
echo ""

# ====================================
# 8. Resumen
# ====================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))
echo "📊 Resumen:"
echo -e "   ✅ Verificaciones pasadas: ${GREEN}${CHECKS_PASSED}${NC}"
echo -e "   ❌ Verificaciones fallidas: ${RED}${CHECKS_FAILED}${NC}"
echo -e "   📝 Total: ${TOTAL}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 ¡Sistema dual configurado correctamente!${NC}"
  echo ""
  echo "Próximos pasos:"
  echo "1. Configura las variables de entorno en Railway"
  echo "2. Despliega el backend: railway up"
  echo "3. Despliega el frontend: firebase deploy"
  echo "4. Prueba ambas URLs de onboarding"
  exit 0
else
  echo -e "${RED}⚠️  Hay problemas con la configuración${NC}"
  echo ""
  echo "Revisa los errores arriba y corrige:"
  echo "1. Archivos faltantes"
  echo "2. Variables de entorno"
  echo "3. Dependencias"
  exit 1
fi
