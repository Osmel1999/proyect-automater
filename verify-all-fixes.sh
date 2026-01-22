#!/bin/bash

echo "=================================================="
echo "🔍 VERIFICACIÓN COMPLETA - SELECT + DASHBOARD"
echo "=================================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_count=0
pass_count=0

echo "📡 Descargando archivos de producción..."
curl -s "https://kds-app-7f1d3.web.app/select.html" > /tmp/select-prod.html
curl -s "https://kds-app-7f1d3.web.app/dashboard.html" > /tmp/dashboard-prod.html

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 SELECT.HTML"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check 1: Versión de select.html
((check_count++))
echo -n "1. Versión correcta (2.0.0 - 22-ene): "
if grep -q "2026-01-22-fix-progress-message" /tmp/select-prod.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi

# Check 2: Mensaje sin porcentaje en HTML
((check_count++))
echo -n "2. Badge HTML dice 'Completar configuración': "
if grep -q 'id="onboardingBadge".*Completar configuración' /tmp/select-prod.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi

# Check 3: NO debe tener % completado en HTML
((check_count++))
echo -n "3. NO tiene '% completado' en badge HTML: "
if ! grep -q 'id="onboardingBadge".*% completado' /tmp/select-prod.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi

# Check 4: Función usa onboarding/steps
((check_count++))
echo -n "4. Función lee 'onboarding/steps': "
if grep -q "onboarding/steps" /tmp/select-prod.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi

# Check 5: Valida los 3 campos
((check_count++))
echo -n "5. Valida whatsapp_connected: "
if grep -q "whatsapp_connected" /tmp/select-prod.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 DASHBOARD.HTML"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check 6: Versión de dashboard.html
((check_count++))
echo -n "6. Versión correcta (2.0.0 - 21-ene): "
if grep -q "2026-01-21-fix-dashboard" /tmp/dashboard-prod.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi

# Check 7: Mensaje "Completar configuración"
((check_count++))
echo -n "7. Tiene mensaje 'Completar configuración': "
if grep -q "Completar configuración" /tmp/dashboard-prod.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi

# Check 8: Toggle con validación
((check_count++))
echo -n "8. Toggle valida 3 campos (canActivate): "
if grep -q "canActivate" /tmp/dashboard-prod.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi

# Check 9: Dashboard completo
((check_count++))
echo -n "9. Tiene dashboard completo (stats): "
if grep -q "dashboard-main" /tmp/dashboard-prod.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi

# Check 10: Función de limpieza
((check_count++))
echo -n "10. Tiene función de limpieza: "
if grep -q "cleanupFirebaseFields" /tmp/dashboard-prod.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $pass_count -eq $check_count ]; then
    echo -e "${GREEN}🎉 ÉXITO TOTAL: $pass_count/$check_count checks pasados${NC}"
    echo ""
    echo "✅ Todos los cambios están correctamente desplegados"
    echo ""
    echo "🧹 SIGUIENTE PASO:"
    echo "   1. Cierra la ventana de incógnito actual"
    echo "   2. Abre una NUEVA ventana de incógnito"
    echo "   3. Ve a: https://kds-app-7f1d3.web.app"
    echo "   4. Haz login"
    echo "   5. Verifica que dice 'Completar configuración' (sin %)"
else
    echo -e "${RED}⚠️  ATENCIÓN: $pass_count/$check_count checks pasados${NC}"
    echo ""
    echo "Algunos checks fallaron. Puede ser:"
    echo "1. Caché de Firebase Hosting (espera 5-10 minutos)"
    echo "2. Necesitas otro deploy: firebase deploy --only hosting --force"
fi

echo ""
echo "🔗 URLs para verificar manualmente:"
echo "   Select: https://kds-app-7f1d3.web.app/select.html"
echo "   Dashboard: https://kds-app-7f1d3.web.app/dashboard.html"

echo ""
echo "=================================================="

# Limpiar archivos temporales
rm /tmp/select-prod.html /tmp/dashboard-prod.html
