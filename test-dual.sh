#!/bin/bash

# ====================================
# TEST RÁPIDO - Sistema Dual
# ====================================
# Comandos útiles para probar el sistema
# ====================================

echo "🧪 Test Rápido - Sistema Dual"
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ====================================
# Menú de opciones
# ====================================
echo -e "${BLUE}¿Qué quieres hacer?${NC}"
echo ""
echo "1. Verificar configuración local"
echo "2. Abrir onboarding principal en navegador"
echo "3. Abrir onboarding legacy en navegador"
echo "4. Ver logs del servidor local"
echo "5. Ver logs de Railway"
echo "6. Iniciar servidor local"
echo "7. Ver estructura de archivos"
echo "8. Verificar portfolios en archivos"
echo "9. Test completo (verificación + logs)"
echo "0. Salir"
echo ""

read -p "Selecciona una opción [0-9]: " option

case $option in
  1)
    echo -e "${BLUE}🔍 Verificando configuración...${NC}"
    ./verify-dual-config.sh
    ;;
    
  2)
    echo -e "${GREEN}🌐 Abriendo onboarding principal...${NC}"
    echo "   URL: https://kdsapp.site/onboarding.html"
    echo "   Portfolio: 880566844730976"
    open "https://kdsapp.site/onboarding.html"
    ;;
    
  3)
    echo -e "${YELLOW}🌐 Abriendo onboarding legacy...${NC}"
    echo "   URL: https://kdsapp.site/onboarding-2.html"
    echo "   Portfolio: 1473689432774278"
    open "https://kdsapp.site/onboarding-2.html"
    ;;
    
  4)
    echo -e "${BLUE}📋 Ver logs del servidor local...${NC}"
    echo ""
    echo "Presiona Ctrl+C para salir"
    echo ""
    npm start
    ;;
    
  5)
    echo -e "${BLUE}📋 Ver logs de Railway...${NC}"
    echo ""
    echo "Presiona Ctrl+C para salir"
    echo ""
    railway logs
    ;;
    
  6)
    echo -e "${GREEN}🚀 Iniciando servidor local...${NC}"
    echo ""
    echo "El servidor se iniciará en http://localhost:3000"
    echo "Presiona Ctrl+C para detener"
    echo ""
    npm start
    ;;
    
  7)
    echo -e "${BLUE}📁 Estructura de archivos del sistema dual:${NC}"
    echo ""
    echo "Frontend:"
    ls -lh onboarding.html onboarding-2.html facebook-config*.js dual-config.js 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
    echo ""
    echo "Backend:"
    ls -lh server/index.js 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
    echo ""
    echo "Documentación:"
    ls -lh *DUAL*.md 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
    echo ""
    echo "Scripts:"
    ls -lh verify-dual-config.sh 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
    ;;
    
  8)
    echo -e "${BLUE}🔍 Verificando portfolios en archivos...${NC}"
    echo ""
    echo "Portfolio Principal (880566844730976):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    grep -n "880566844730976" onboarding.html facebook-config.js 2>/dev/null | head -3
    echo ""
    echo "Portfolio Legacy (1473689432774278):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    grep -n "1473689432774278" onboarding-2.html facebook-config-legacy.js 2>/dev/null | head -3
    echo ""
    echo "Endpoints en servidor:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    grep -n "callback\|webhook" server/index.js | grep "app.get\|app.post" | head -8
    ;;
    
  9)
    echo -e "${GREEN}🧪 Test completo...${NC}"
    echo ""
    
    # Verificación
    ./verify-dual-config.sh
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Portfolios
    echo -e "${BLUE}📋 Configuración de Portfolios:${NC}"
    echo ""
    echo "Principal:"
    grep "880566844730976" onboarding.html | head -1 | sed 's/^[[:space:]]*/   /'
    echo ""
    echo "Legacy:"
    grep "1473689432774278" onboarding-2.html | head -1 | sed 's/^[[:space:]]*/   /'
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # URLs
    echo -e "${GREEN}🌐 URLs disponibles:${NC}"
    echo ""
    echo "   Principal: https://kdsapp.site/onboarding.html"
    echo "   Legacy:    https://kdsapp.site/onboarding-2.html"
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Estado
    echo -e "${GREEN}✅ Sistema dual verificado y listo${NC}"
    ;;
    
  0)
    echo "👋 ¡Hasta luego!"
    exit 0
    ;;
    
  *)
    echo -e "${YELLOW}⚠️  Opción inválida${NC}"
    exit 1
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para más información, lee:"
echo "  • SISTEMA-DUAL-README.md"
echo "  • GUIA-SISTEMA-DUAL.md"
echo "  • ARQUITECTURA-DUAL.md"
echo ""
