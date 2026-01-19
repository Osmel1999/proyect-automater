#!/bin/bash

# Script de Prueba: Validación de Toggle del Bot con Onboarding >= 75%
# Este script valida que el toggle del bot solo puede estar activo si el onboarding es >= 75%

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
TENANT_ID="${1:-tenant_testing}"
BASE_URL="https://kds-app-7f1d3.web.app"
API_URL="https://api.kdsapp.site"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Prueba: Toggle del Bot Solo Activo si Onboarding >= 75%  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Tenant ID: ${TENANT_ID}${NC}"
echo -e "${YELLOW}Frontend: ${BASE_URL}${NC}"
echo -e "${YELLOW}Backend: ${API_URL}${NC}"
echo ""

# ============================================================
# CASO 1: Onboarding Incompleto (< 75%)
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CASO 1: Onboarding Incompleto (< 75%)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📋 Configurando progreso de onboarding a 50%...${NC}"
echo ""
echo "  ⚙️  Instrucciones manuales (Firebase Console):"
echo "  1. Abrir: https://console.firebase.google.com/project/kds-app-7f1d3/database/kds-app-7f1d3-default-rtdb/data"
echo "  2. Navegar a: tenants/${TENANT_ID}/onboarding"
echo "  3. Configurar:"
echo "     - steps.whatsapp_connected: true"
echo "     - steps.menu_configured: false"
echo "     - steps.messages_customized: false"
echo "     - steps.bot_tested: false"
echo "     - progress: 50"
echo ""
echo -e "${YELLOW}Presiona ENTER cuando hayas completado la configuración...${NC}"
read -r

echo -e "${YELLOW}✅ Abriendo dashboard en el navegador...${NC}"
open "${BASE_URL}/dashboard.html?tenant=${TENANT_ID}"

echo ""
echo -e "${GREEN}✓ Dashboard abierto${NC}"
echo ""
echo "  🔍 Verificar manualmente:"
echo "  ✓ Toggle está en OFF"
echo "  ✓ Toggle está deshabilitado (gris)"
echo "  ✓ Advertencia visible: 'Completa al menos el 75% del onboarding'"
echo "  ✓ Al hacer clic en toggle → Muestra alerta y NO cambia"
echo ""
echo -e "${YELLOW}¿El comportamiento es correcto? (y/n): ${NC}"
read -r respuesta1

if [ "$respuesta1" != "y" ]; then
  echo -e "${RED}❌ CASO 1 FALLÓ${NC}"
  exit 1
fi

echo -e "${GREEN}✅ CASO 1 PASÓ${NC}"
echo ""

# ============================================================
# CASO 2: Onboarding >= 75%, Toggle OFF
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CASO 2: Onboarding >= 75%, Toggle OFF${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📋 Configurando progreso de onboarding a 75%...${NC}"
echo ""
echo "  ⚙️  Instrucciones manuales (Firebase Console):"
echo "  1. Navegar a: tenants/${TENANT_ID}/onboarding"
echo "  2. Configurar:"
echo "     - steps.menu_configured: true"
echo "     - progress: 75"
echo ""
echo -e "${YELLOW}Presiona ENTER cuando hayas completado la configuración...${NC}"
read -r

echo -e "${YELLOW}🔄 Recargando dashboard...${NC}"
open "${BASE_URL}/dashboard.html?tenant=${TENANT_ID}"

echo ""
echo -e "${GREEN}✓ Dashboard recargado${NC}"
echo ""
echo "  🔍 Verificar manualmente:"
echo "  ✓ Toggle está en OFF pero HABILITADO (puede activarse)"
echo "  ✓ NO hay advertencia visible"
echo "  ✓ Al hacer clic en toggle → Cambia a ON y muestra confirmación"
echo ""
echo -e "${YELLOW}¿El toggle cambió a ON correctamente? (y/n): ${NC}"
read -r respuesta2

if [ "$respuesta2" != "y" ]; then
  echo -e "${RED}❌ CASO 2 FALLÓ${NC}"
  exit 1
fi

echo -e "${GREEN}✅ CASO 2 PASÓ${NC}"
echo ""

# ============================================================
# CASO 3: Bot Activo, Cliente envía mensaje
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CASO 3: Bot Activo, Cliente envía mensaje${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📱 Enviar mensaje 'hola' desde WhatsApp al número del tenant${NC}"
echo ""
echo "  🔍 Verificar manualmente:"
echo "  ✓ El bot DEBE responder con mensaje de bienvenida"
echo ""
echo -e "${YELLOW}¿El bot respondió correctamente? (y/n): ${NC}"
read -r respuesta3

if [ "$respuesta3" != "y" ]; then
  echo -e "${RED}❌ CASO 3 FALLÓ${NC}"
  exit 1
fi

echo -e "${GREEN}✅ CASO 3 PASÓ${NC}"
echo ""

# ============================================================
# CASO 4: Toggle OFF, Cliente envía mensaje
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CASO 4: Toggle OFF, Cliente envía mensaje${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}🔄 Desactivar el toggle en el dashboard${NC}"
echo ""
echo "  ⚙️  Instrucciones:"
echo "  1. Hacer clic en el toggle para desactivarlo (OFF)"
echo "  2. Confirmar que el toggle está en OFF"
echo ""
echo -e "${YELLOW}Presiona ENTER cuando hayas desactivado el toggle...${NC}"
read -r

echo -e "${YELLOW}📱 Enviar mensaje 'menú' desde WhatsApp al número del tenant${NC}"
echo ""
echo "  🔍 Verificar manualmente:"
echo "  ✓ El bot NO DEBE responder (silencio total)"
echo ""
echo -e "${YELLOW}¿El bot NO respondió (silencio total)? (y/n): ${NC}"
read -r respuesta4

if [ "$respuesta4" != "y" ]; then
  echo -e "${RED}❌ CASO 4 FALLÓ${NC}"
  exit 1
fi

echo -e "${GREEN}✅ CASO 4 PASÓ${NC}"
echo ""

# ============================================================
# CASO 5: Intento de Bypass (modificar Firebase directamente)
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CASO 5: Intento de Bypass (modificar Firebase)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}⚠️  Simulando bypass: Modificar Firebase para activar bot con progreso < 75%${NC}"
echo ""
echo "  ⚙️  Instrucciones manuales (Firebase Console):"
echo "  1. Navegar a: tenants/${TENANT_ID}/onboarding"
echo "  2. Configurar:"
echo "     - steps.menu_configured: false"
echo "     - progress: 50"
echo "  3. Navegar a: tenants/${TENANT_ID}/bot/config"
echo "  4. Configurar:"
echo "     - active: true"
echo ""
echo -e "${YELLOW}Presiona ENTER cuando hayas completado la configuración...${NC}"
read -r

echo -e "${YELLOW}🔄 Recargando dashboard...${NC}"
open "${BASE_URL}/dashboard.html?tenant=${TENANT_ID}"

echo ""
echo -e "${GREEN}✓ Dashboard recargado${NC}"
echo ""
echo "  🔍 Verificar manualmente:"
echo "  ✓ Toggle está en OFF y deshabilitado (el dashboard corrigió el bypass)"
echo "  ✓ Firebase debe haber sido sobrescrito: active: false"
echo ""
echo "  Verificar en Firebase Console:"
echo "  - tenants/${TENANT_ID}/bot/config/active debe ser false"
echo ""
echo -e "${YELLOW}¿El dashboard corrigió el bypass y el toggle está en OFF? (y/n): ${NC}"
read -r respuesta5

if [ "$respuesta5" != "y" ]; then
  echo -e "${RED}❌ CASO 5 FALLÓ${NC}"
  exit 1
fi

echo -e "${GREEN}✅ CASO 5 PASÓ${NC}"
echo ""

# ============================================================
# RESUMEN
# ============================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    RESUMEN DE PRUEBAS                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ CASO 1: Onboarding < 75% → Toggle deshabilitado${NC}"
echo -e "${GREEN}✅ CASO 2: Onboarding >= 75% → Toggle habilitado y activa${NC}"
echo -e "${GREEN}✅ CASO 3: Toggle ON → Bot responde${NC}"
echo -e "${GREEN}✅ CASO 4: Toggle OFF → Bot NO responde${NC}"
echo -e "${GREEN}✅ CASO 5: Bypass prevenido → Dashboard corrige estado${NC}"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ TODAS LAS PRUEBAS PASARON ✅                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# LOGS DE BACKEND
# ============================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}LOGS DE BACKEND (Railway)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Para ver los logs del backend:${NC}"
echo ""
echo "  railway logs"
echo ""
echo "  O visitar: https://railway.app/project/YOUR_PROJECT_ID/service/YOUR_SERVICE_ID/deployments"
echo ""
echo -e "${YELLOW}Buscar en los logs:${NC}"
echo "  - '🔍 Debug - botActive calculado: true/false'"
echo "  - '🟢 Bot activo para tenant X - Procesando mensaje'"
echo "  - '🔴 Bot desactivado para tenant X. Ignorando mensaje.'"
echo ""
