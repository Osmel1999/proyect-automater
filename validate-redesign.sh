#!/bin/bash

# 🎨 KDS Redesign - Quick Validation Script
# Verifica que todos los cambios del rediseño estén aplicados

echo "🔍 KDS Redesign - Validación Rápida"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0

# Function to check
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ $1${NC}"
        ((FAIL++))
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ Archivo existe: $1${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ Archivo NO existe: $1${NC}"
        ((FAIL++))
    fi
}

echo "📁 Verificando Archivos Principales..."
echo "--------------------------------------"
check_file "index.html"
check_file "dashboard.html"
check_file "css/dashboard.css"
check_file "css/index-modern.css"
check_file "js/dashboard.js"
echo ""

echo "💾 Verificando Backups..."
echo "-------------------------"
check_file "css/dashboard-old.css"
check_file "css/index-old.css"
echo ""

echo "📚 Verificando Documentación..."
echo "--------------------------------"
check_file "REDESIGN-COMPLETO-FINAL.md"
check_file "DASHBOARD-REDESIGN-COMPLETED.md"
check_file "INDEX-REDESIGN-COMPLETED.md"
check_file "COMPATIBILIDAD-RESTAURADA.md"
check_file "TESTING-GUIDE-VISUAL.md"
check_file "RESUMEN-EJECUTIVO-REDESIGN.md"
echo ""

echo "🚫 Verificando Eliminación de Emojis..."
echo "----------------------------------------"

# Check for emojis in index.html (should be 0)
EMOJI_INDEX=$(grep -o "🚀\|📱\|💰\|📊\|🎯\|⚡\|🤖\|✅\|📧" index.html 2>/dev/null | wc -l | tr -d ' ')
if [ "$EMOJI_INDEX" -eq 0 ]; then
    echo -e "${GREEN}✅ index.html: 0 emojis encontrados${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ index.html: $EMOJI_INDEX emojis encontrados (debería ser 0)${NC}"
    ((FAIL++))
fi

# Check for emojis in dashboard.html (should be 0 or minimal)
EMOJI_DASH=$(grep -o "🚀\|📱\|💰\|📊\|🎯\|⚡\|🤖\|✅\|📧" dashboard.html 2>/dev/null | wc -l | tr -d ' ')
if [ "$EMOJI_DASH" -eq 0 ]; then
    echo -e "${GREEN}✅ dashboard.html: 0 emojis encontrados${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠️  dashboard.html: $EMOJI_DASH emojis encontrados (revisar)${NC}"
fi

echo ""

echo "🎨 Verificando Iconos SVG..."
echo "----------------------------"

# Check for SVG icons in index.html
SVG_INDEX=$(grep -c "<svg" index.html 2>/dev/null)
if [ "$SVG_INDEX" -gt 15 ]; then
    echo -e "${GREEN}✅ index.html: $SVG_INDEX iconos SVG encontrados${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ index.html: $SVG_INDEX iconos SVG (debería ser 15+)${NC}"
    ((FAIL++))
fi

# Check for SVG icons in dashboard.html
SVG_DASH=$(grep -c "<svg" dashboard.html 2>/dev/null)
if [ "$SVG_DASH" -gt 5 ]; then
    echo -e "${GREEN}✅ dashboard.html: $SVG_DASH iconos SVG encontrados${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ dashboard.html: $SVG_DASH iconos SVG (debería ser 5+)${NC}"
    ((FAIL++))
fi

echo ""

echo "🔗 Verificando Enlaces CSS..."
echo "------------------------------"

# Check if index.html links to index-modern.css
if grep -q "index-modern.css" index.html; then
    echo -e "${GREEN}✅ index.html enlaza a index-modern.css${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ index.html NO enlaza a index-modern.css${NC}"
    ((FAIL++))
fi

# Check if dashboard.html links to dashboard.css
if grep -q "css/dashboard.css" dashboard.html; then
    echo -e "${GREEN}✅ dashboard.html enlaza a dashboard.css${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ dashboard.html NO enlaza a dashboard.css${NC}"
    ((FAIL++))
fi

echo ""

echo "💻 Verificando Variables CSS..."
echo "--------------------------------"

# Check for CSS variables in dashboard.css
CSS_VARS_DASH=$(grep -c "^[[:space:]]*--" css/dashboard.css 2>/dev/null)
if [ "$CSS_VARS_DASH" -gt 20 ]; then
    echo -e "${GREEN}✅ dashboard.css: $CSS_VARS_DASH variables CSS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ dashboard.css: $CSS_VARS_DASH variables CSS (debería ser 20+)${NC}"
    ((FAIL++))
fi

# Check for CSS variables in index-modern.css
CSS_VARS_INDEX=$(grep -c "^[[:space:]]*--" css/index-modern.css 2>/dev/null)
if [ "$CSS_VARS_INDEX" -gt 20 ]; then
    echo -e "${GREEN}✅ index-modern.css: $CSS_VARS_INDEX variables CSS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ index-modern.css: $CSS_VARS_INDEX variables CSS (debería ser 20+)${NC}"
    ((FAIL++))
fi

echo ""

echo "📏 Verificando Tamaño de Archivos..."
echo "-------------------------------------"

# Check file sizes
INDEX_SIZE=$(wc -c < "index.html" | tr -d ' ')
DASH_SIZE=$(wc -c < "dashboard.html" | tr -d ' ')
CSS_DASH_SIZE=$(wc -c < "css/dashboard.css" | tr -d ' ')
CSS_INDEX_SIZE=$(wc -c < "css/index-modern.css" | tr -d ' ')

echo "📄 index.html: $(numfmt --to=iec-i --suffix=B $INDEX_SIZE 2>/dev/null || echo "$INDEX_SIZE bytes")"
echo "📄 dashboard.html: $(numfmt --to=iec-i --suffix=B $DASH_SIZE 2>/dev/null || echo "$DASH_SIZE bytes")"
echo "🎨 dashboard.css: $(numfmt --to=iec-i --suffix=B $CSS_DASH_SIZE 2>/dev/null || echo "$CSS_DASH_SIZE bytes")"
echo "🎨 index-modern.css: $(numfmt --to=iec-i --suffix=B $CSS_INDEX_SIZE 2>/dev/null || echo "$CSS_INDEX_SIZE bytes")"

echo ""

# Summary
echo "======================================"
echo "📊 Resumen de Validación"
echo "======================================"
echo -e "${GREEN}✅ Tests Pasados: $PASS${NC}"
echo -e "${RED}❌ Tests Fallidos: $FAIL${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Todos los tests pasaron! El rediseño está completo.${NC}"
    echo ""
    echo "📋 Próximos pasos:"
    echo "   1. Abrir index.html en navegador"
    echo "   2. Abrir dashboard.html en navegador"
    echo "   3. Validar visualmente"
    echo "   4. Hacer testing responsive"
    echo "   5. Deploy a producción"
    exit 0
else
    echo -e "${RED}⚠️  Algunos tests fallaron. Revisa los errores arriba.${NC}"
    exit 1
fi
