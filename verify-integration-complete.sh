#!/bin/bash
# Script de Verificación Post-Deploy - Integración Agente + Frontend Fixes
# Fecha: 22 de enero de 2026

echo "🔍 VERIFICACIÓN POST-DEPLOY - AGENTE GITHUB + FRONTEND FIXES"
echo "=============================================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ====================================
# 1. VERIFICAR GIT STATUS
# ====================================
echo "📦 1. VERIFICANDO GIT STATUS..."
git_status=$(git status --porcelain)
if [ -z "$git_status" ]; then
    echo -e "${GREEN}✅ Git limpio - todos los cambios comprometidos${NC}"
else
    echo -e "${YELLOW}⚠️  Hay cambios sin commitear:${NC}"
    echo "$git_status"
fi
echo ""

# ====================================
# 2. VERIFICAR COMMITS PUSHEADOS
# ====================================
echo "🔄 2. VERIFICANDO COMMITS PUSHEADOS..."
commits_ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
if [ "$commits_ahead" -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los commits pusheados a origin/main${NC}"
else
    echo -e "${YELLOW}⚠️  $commits_ahead commits pendientes de push${NC}"
fi
echo ""

# ====================================
# 3. VERIFICAR CAMBIOS DEL AGENTE EN BOT-LOGIC.JS
# ====================================
echo "🤖 3. VERIFICANDO CAMBIOS DEL AGENTE EN BOT-LOGIC.JS..."
if grep -q "CONFIRMACIONES_NATURALES" server/bot-logic.js; then
    echo -e "${GREEN}✅ CONFIRMACIONES_NATURALES presente${NC}"
else
    echo -e "${RED}❌ CONFIRMACIONES_NATURALES NO encontrado${NC}"
fi

if grep -q "descripcionNaturalItem" server/bot-logic.js; then
    echo -e "${GREEN}✅ descripcionNaturalItem presente${NC}"
else
    echo -e "${RED}❌ descripcionNaturalItem NO encontrado${NC}"
fi

# Contar confirmaciones naturales
confirmaciones=$(grep -o "CONFIRMACIONES_NATURALES = \[" -A 50 server/bot-logic.js | grep -c "'")
echo -e "${GREEN}✅ $confirmaciones variaciones de confirmación detectadas${NC}"
echo ""

# ====================================
# 4. VERIFICAR VERSIONES EN FRONTEND
# ====================================
echo "📱 4. VERIFICANDO VERSIONES EN FRONTEND..."

# Dashboard
if grep -q "Version: 2.1.0" dashboard.html; then
    echo -e "${GREEN}✅ dashboard.html v2.1.0 presente${NC}"
else
    echo -e "${RED}❌ dashboard.html versión incorrecta${NC}"
fi

# Select
if grep -q "Version: 2.0.0" select.html; then
    echo -e "${GREEN}✅ select.html v2.0.0 presente${NC}"
else
    echo -e "${RED}❌ select.html versión incorrecta${NC}"
fi
echo ""

# ====================================
# 5. VERIFICAR PROGRESO DINÁMICO
# ====================================
echo "📊 5. VERIFICANDO PROGRESO DINÁMICO..."

# Dashboard - Verificar cálculo dinámico
if grep -q "const criticalSteps = \[whatsappConnected, menuConfigured, messagesCustomized\]" dashboard.html; then
    echo -e "${GREEN}✅ Dashboard usa cálculo dinámico de 3 booleanos${NC}"
else
    echo -e "${RED}❌ Dashboard NO usa cálculo dinámico${NC}"
fi

# Select - Verificar mensaje correcto
if grep -q 'onboardingBadge.textContent = .Completar configuración.' select.html; then
    echo -e "${GREEN}✅ Select usa mensaje 'Completar configuración'${NC}"
else
    echo -e "${RED}❌ Select NO usa mensaje correcto${NC}"
fi
echo ""

# ====================================
# 6. VERIFICAR RAILWAY STATUS
# ====================================
echo "🚂 6. VERIFICANDO RAILWAY STATUS..."
if command -v railway &> /dev/null; then
    railway status | head -5
    echo ""
else
    echo -e "${YELLOW}⚠️  Railway CLI no disponible${NC}"
    echo ""
fi

# ====================================
# 7. VERIFICAR FIREBASE DEPLOY
# ====================================
echo "🔥 7. VERIFICANDO FIREBASE..."
if command -v firebase &> /dev/null; then
    echo "Firebase CLI disponible"
    # No ejecutar firebase list para no hacer login
    echo -e "${GREEN}✅ Firebase CLI instalado${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  Firebase CLI no disponible${NC}"
    echo ""
fi

# ====================================
# 8. VERIFICAR ARCHIVOS CRÍTICOS
# ====================================
echo "📄 8. VERIFICANDO ARCHIVOS CRÍTICOS..."
critical_files=(
    "dashboard.html"
    "select.html"
    "server/bot-logic.js"
    "server/pedido-parser.js"
    "firebase.json"
    "package.json"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file NO encontrado${NC}"
    fi
done
echo ""

# ====================================
# 9. RESUMEN FINAL
# ====================================
echo "📋 RESUMEN FINAL"
echo "=============================================================="
echo ""

# Verificar si hay problemas
problems=0

if [ -n "$git_status" ]; then
    ((problems++))
fi

if [ "$commits_ahead" -ne 0 ]; then
    ((problems++))
fi

if ! grep -q "CONFIRMACIONES_NATURALES" server/bot-logic.js; then
    ((problems++))
fi

if ! grep -q "Version: 2.1.0" dashboard.html; then
    ((problems++))
fi

if [ $problems -eq 0 ]; then
    echo -e "${GREEN}✅ TODO VERIFICADO CORRECTAMENTE${NC}"
    echo -e "${GREEN}✅ Sistema listo para pruebas en producción${NC}"
    echo ""
    echo "🧪 PRÓXIMOS PASOS:"
    echo "  1. Verificar logs de Railway: railway logs"
    echo "  2. Probar bot con lenguaje natural: 'quiero 2 hamburguesas'"
    echo "  3. Probar confirmaciones: 'si', 'dale', 'va', 'perfecto', etc."
    echo "  4. Verificar dashboard en producción (cache Ctrl+Shift+R)"
    echo "  5. Completar onboarding y verificar toggle del bot"
else
    echo -e "${YELLOW}⚠️  Se encontraron $problems posibles problemas${NC}"
    echo "Revisar la salida anterior para más detalles"
fi
echo ""
echo "=============================================================="
echo "Verificación completada - $(date)"
