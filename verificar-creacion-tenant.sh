#!/bin/bash

# Script de Verificación: Creación de Tenant en Registro
# Fecha: 21 de enero de 2026

echo "======================================"
echo "🧪 VERIFICACIÓN: Creación de Tenant"
echo "======================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "📋 CHECKLIST DE VERIFICACIÓN"
echo "-----------------------------------"
echo ""

echo "1️⃣  Verificar que auth.html tiene el código de creación de tenant..."
if grep -q "Create tenant data in database" /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp/auth.html; then
    echo -e "${GREEN}✅ auth.html tiene código de creación de tenant${NC}"
else
    echo -e "${RED}❌ auth.html NO tiene código de creación de tenant${NC}"
fi
echo ""

echo "2️⃣  Verificar que onboarding.html usa update() en lugar de set()..."
if grep -q "tenantRef.update({" /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp/onboarding.html; then
    echo -e "${GREEN}✅ onboarding.html usa update() correctamente${NC}"
else
    echo -e "${RED}❌ onboarding.html NO usa update()${NC}"
fi
echo ""

echo "3️⃣  Verificar deploy en producción..."
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://kdsapp.site/auth.html)
if [ "$AUTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ auth.html está activo en producción${NC}"
else
    echo -e "${RED}❌ auth.html no responde (status: $AUTH_STATUS)${NC}"
fi
echo ""

echo "4️⃣  Verificar que auth.html en producción tiene el fix..."
if curl -s https://kdsapp.site/auth.html | grep -q "Create tenant data in database"; then
    echo -e "${GREEN}✅ Fix deployado correctamente en producción${NC}"
else
    echo -e "${RED}❌ Fix NO está en producción (caché o deploy fallido)${NC}"
    echo -e "${YELLOW}   Sugerencia: Limpiar caché de Firebase o forzar redeploy${NC}"
fi
echo ""

echo "======================================"
echo "📊 ESTADO DEL DEPLOY"
echo "======================================"
echo ""

# Verificar último commit
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
echo -e "${BLUE}CASO 1: Registro de Usuario Nuevo${NC}"
echo "-----------------------------------"
echo "1. Ir a https://kdsapp.site/auth.html"
echo "2. Hacer click en pestaña 'Registrarse'"
echo "3. Completar formulario:"
echo "   - Nombre"
echo "   - Nombre del negocio"
echo "   - Email"
echo "   - Contraseña (mínimo 6 caracteres)"
echo "   - Confirmar contraseña"
echo "   - PIN de 4 dígitos"
echo "4. Click en 'Crear Cuenta'"
echo "5. Verificar redirección a select.html"
echo ""
echo "6. ✅ VERIFICAR EN FIREBASE CONSOLE:"
echo "   • Ir a https://console.firebase.google.com"
echo "   • Abrir proyecto kds-app-7f1d3"
echo "   • Ir a Realtime Database"
echo "   • Verificar que existe users/{userId}"
echo "   • ✅ VERIFICAR que existe tenants/{tenantId}"
echo "   • ✅ VERIFICAR estructura del tenant:"
echo "       - restaurant (name, phone, whatsappConnected)"
echo "       - menu (categories, items)"
echo "       - messages (welcome, orderConfirm, goodbye)"
echo "       - onboarding (steps, progress, currentStep)"
echo ""
echo -e "${BLUE}CASO 2: Login de Usuario Existente${NC}"
echo "-----------------------------------"
echo "1. Ir a https://kdsapp.site/auth.html"
echo "2. Ingresar email y contraseña"
echo "3. Click en 'Iniciar Sesión'"
echo "4. Verificar redirección a select.html"
echo "5. ✅ VERIFICAR que localStorage tiene:"
echo "   - currentUserId"
echo "   - currentTenantId"
echo "   - userEmail"
echo "   - userName"
echo "   - businessName"
echo ""
echo -e "${BLUE}CASO 3: Dashboard con Tenant Existente${NC}"
echo "-----------------------------------"
echo "1. Desde select.html, hacer click en 'Dashboard'"
echo "2. Ingresar PIN correcto"
echo "3. ✅ VERIFICAR que dashboard carga correctamente"
echo "4. ✅ VERIFICAR que muestra datos del tenant:"
echo "   - Nombre del negocio"
echo "   - Estado de WhatsApp"
echo "   - Opciones de configuración"
echo ""
echo -e "${BLUE}CASO 4: Onboarding NO Sobrescribe Datos${NC}"
echo "-----------------------------------"
echo "1. Ir a dashboard.html"
echo "2. Configurar algunos datos (ej: mensajes personalizados)"
echo "3. Ir a onboarding.html para conectar WhatsApp"
echo "4. Escanear QR de WhatsApp"
echo "5. ✅ VERIFICAR EN FIREBASE que los datos configurados NO se sobrescribieron"
echo "6. ✅ VERIFICAR que solo se actualizaron campos de WhatsApp:"
echo "   - restaurant/phone"
echo "   - restaurant/whatsappConnected"
echo "   - restaurant/connectedAt"
echo "   - onboarding/steps/whatsapp_connected"
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
echo "Firebase Console:"
echo "  - Database:  https://console.firebase.google.com/project/kds-app-7f1d3/database"
echo "  - Auth:      https://console.firebase.google.com/project/kds-app-7f1d3/authentication"
echo ""
echo "Backend (Railway):"
echo "  - API:       https://api.kdsapp.site"
echo "  - Baileys:   https://api.kdsapp.site/api/baileys/status"
echo ""

echo "======================================"
echo "📚 DOCUMENTACIÓN"
echo "======================================"
echo ""
echo "Ver archivo: FIX-CREACION-TENANT-REGISTRO.md"
echo "  - Problema identificado"
echo "  - Solución implementada"
echo "  - Estructura de datos"
echo "  - Flujos completos"
echo ""

echo "======================================"
echo "✅ VERIFICACIÓN COMPLETADA"
echo "======================================"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "Probar MANUALMENTE el flujo de registro para confirmar que:"
echo "  1. El tenant se crea correctamente en Firebase"
echo "  2. Los datos están disponibles inmediatamente"
echo "  3. El dashboard puede acceder a la configuración"
echo "  4. El bot de WhatsApp puede leer el menú (aunque esté vacío)"
echo ""
