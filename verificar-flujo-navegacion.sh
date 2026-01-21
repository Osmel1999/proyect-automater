#!/bin/bash

# Script de Verificación del Flujo de Navegación Corregido
# Fecha: $(date)

echo "======================================"
echo "🔍 VERIFICACIÓN DE FLUJO DE NAVEGACIÓN"
echo "======================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 CHECKLIST DE VERIFICACIÓN"
echo "-----------------------------------"
echo ""

echo "1️⃣  Verificar select.html en producción..."
if curl -s https://kdsapp.site/select.html | grep -q "NEVER redirect to onboarding from here"; then
    echo -e "${GREEN}✅ select.html tiene el fix implementado${NC}"
else
    echo -e "${RED}❌ select.html NO tiene el fix (caché o deploy fallido)${NC}"
    echo -e "${YELLOW}   Sugerencia: Forzar redeploy o limpiar caché de Firebase${NC}"
fi
echo ""

echo "2️⃣  Verificar que no hay redirección automática a onboarding..."
if curl -s https://kdsapp.site/select.html | grep -q "if (confirm.*onboarding"; then
    echo -e "${RED}❌ Aún existe código de confirm prompt para onboarding${NC}"
else
    echo -e "${GREEN}✅ No hay confirm prompts de onboarding${NC}"
fi
echo ""

echo "3️⃣  Verificar backend (Railway) - debe estar separado del frontend..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.kdsapp.site/api/health)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend API está activo (Railway)${NC}"
else
    echo -e "${RED}❌ Backend API no responde (status: $BACKEND_STATUS)${NC}"
fi
echo ""

echo "4️⃣  Verificar que backend NO sirve archivos HTML..."
FRONTEND_ON_BACKEND=$(curl -s -o /dev/null -w "%{http_code}" https://api.kdsapp.site/select.html)
if [ "$FRONTEND_ON_BACKEND" != "200" ]; then
    echo -e "${GREEN}✅ Backend NO sirve archivos HTML (correcto)${NC}"
else
    echo -e "${RED}❌ Backend AÚN sirve HTML (debe servir solo API)${NC}"
fi
echo ""

echo "5️⃣  Verificar Firebase Hosting..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://kdsapp.site/select.html)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend está activo (Firebase Hosting)${NC}"
else
    echo -e "${RED}❌ Frontend no responde (status: $FRONTEND_STATUS)${NC}"
fi
echo ""

echo "======================================"
echo "📊 RESUMEN DE ESTADO"
echo "======================================"
echo ""

# Verificar estructura del commit
echo "Último commit:"
git log -1 --oneline
echo ""

# Verificar archivos modificados
echo "Archivos modificados en último commit:"
git diff-tree --no-commit-id --name-only -r HEAD
echo ""

echo "======================================"
echo "🧪 PRUEBAS MANUALES RECOMENDADAS"
echo "======================================"
echo ""
echo "1. Abrir https://kdsapp.site/auth.html"
echo "2. Iniciar sesión con credenciales válidas"
echo "3. Verificar redirección a select.html"
echo "4. Hacer click en 'Dashboard'"
echo "5. Ingresar PIN correcto"
echo "6. ✅ VERIFICAR: ¿Se redirige DIRECTAMENTE a dashboard.html?"
echo "7. ✅ VERIFICAR: ¿NO muestra prompt de 'ir a onboarding'?"
echo "8. ✅ VERIFICAR: ¿Datos del tenant NO fueron sobrescritos?"
echo ""

echo "======================================"
echo "🔗 URLs DE VERIFICACIÓN"
echo "======================================"
echo ""
echo "Frontend (Firebase):"
echo "  - Auth:      https://kdsapp.site/auth.html"
echo "  - Select:    https://kdsapp.site/select.html"
echo "  - Dashboard: https://kdsapp.site/dashboard.html"
echo ""
echo "Backend (Railway):"
echo "  - Health:    https://api.kdsapp.site/api/health"
echo "  - Baileys:   https://api.kdsapp.site/api/baileys/status"
echo ""

echo "======================================"
echo "✅ VERIFICACIÓN COMPLETADA"
echo "======================================"
