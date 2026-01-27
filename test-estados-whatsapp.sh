#!/bin/bash

# 🧪 Script de Prueba: Validar Filtro de Estados de WhatsApp
# Fecha: 18 de enero de 2026
# Objetivo: Confirmar que el bot NO procesa estados/historias de WhatsApp

echo "════════════════════════════════════════════════════════════════"
echo "🧪 PRUEBA: Filtro de Estados de WhatsApp"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URL del backend (Railway o local)
read -p "🌐 URL del backend (Railway o local, default: http://localhost:3000): " BACKEND_URL
BACKEND_URL=${BACKEND_URL:-http://localhost:3000}

# Tenant ID
read -p "🏢 Tenant ID (default: test-tenant): " TENANT_ID
TENANT_ID=${TENANT_ID:-test-tenant}

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📋 INSTRUCCIONES PARA LA PRUEBA MANUAL"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Para validar que el bot NO marca estados como vistos:"
echo ""
echo "1️⃣  Conecta el bot de WhatsApp (si no está conectado)"
echo "2️⃣  Desde OTRO teléfono (no el del bot), publica un estado/historia"
echo "3️⃣  Espera 10-15 segundos"
echo "4️⃣  Verifica en el teléfono del bot si el estado aparece como 'visto'"
echo ""
echo -e "${YELLOW}Nota: Si el filtro funciona correctamente, el estado NO debe aparecer como visto${NC}"
echo ""

# Función para verificar logs en Railway
check_railway_logs() {
    echo "════════════════════════════════════════════════════════════════"
    echo "📊 Revisando Logs del Backend (Railway)"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Ejecuta en otra terminal:"
    echo ""
    echo -e "${BLUE}railway logs --tail${NC}"
    echo ""
    echo "Busca estas líneas en los logs:"
    echo ""
    echo -e "${GREEN}✅ Esperado (estado ignorado):${NC}"
    echo '   "Estado/Historia de WhatsApp ignorado (status@broadcast)"'
    echo '   "Estado/Historia de WhatsApp ignorado - no se procesará"'
    echo ""
    echo -e "${RED}❌ NO Esperado (estado procesado):${NC}"
    echo '   "Mensaje recibido de status@broadcast"'
    echo ""
}

# Función para verificar logs locales
check_local_logs() {
    echo "════════════════════════════════════════════════════════════════"
    echo "📊 Revisando Logs del Backend (Local)"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Si estás corriendo el backend localmente, verifica en la consola:"
    echo ""
    echo -e "${GREEN}✅ Esperado (estado ignorado):${NC}"
    echo '   🔍 [DEBUG] Estado/Historia de WhatsApp ignorado (status@broadcast)'
    echo ""
    echo -e "${RED}❌ NO Esperado (estado procesado):${NC}"
    echo '   🔍 [DEBUG] Mensaje tipo notify de status@broadcast'
    echo ""
}

# Verificar si el backend está en Railway o local
if [[ "$BACKEND_URL" == *"railway"* ]]; then
    check_railway_logs
else
    check_local_logs
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔍 Verificación del Código"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Validando que el filtro está implementado en el código..."
echo ""

# Verificar que el filtro está en el código
if grep -q "status@broadcast" "/Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp/server/baileys/session-manager.js"; then
    echo -e "${GREEN}✅ Filtro de estados encontrado en session-manager.js${NC}"
else
    echo -e "${RED}❌ ERROR: Filtro de estados NO encontrado en session-manager.js${NC}"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📝 Checklist de Prueba"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Marca cada paso que hayas completado:"
echo ""
echo "[ ] 1. Bot conectado a WhatsApp"
echo "[ ] 2. Estado publicado desde otro teléfono"
echo "[ ] 3. Esperados 10-15 segundos"
echo "[ ] 4. Verificado que estado NO aparece como 'visto' en el teléfono del bot"
echo "[ ] 5. Logs revisados para confirmar filtrado"
echo ""

# Preguntar resultado de la prueba
echo "════════════════════════════════════════════════════════════════"
read -p "❓ ¿El estado fue marcado como 'visto' en el teléfono del bot? (s/n): " RESULT

if [[ "$RESULT" == "n" || "$RESULT" == "N" ]]; then
    echo ""
    echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ PRUEBA EXITOSA${NC}"
    echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "El filtro de estados está funcionando correctamente."
    echo "El bot NO está marcando estados/historias como vistos."
    echo ""
elif [[ "$RESULT" == "s" || "$RESULT" == "S" ]]; then
    echo ""
    echo -e "${RED}══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}❌ PRUEBA FALLIDA${NC}"
    echo -e "${RED}══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "El bot SIGUE marcando estados como vistos."
    echo ""
    echo "Posibles causas:"
    echo ""
    echo "1. El código no fue deployado correctamente a Railway"
    echo "2. Baileys está marcando estados a nivel interno (antes del filtro)"
    echo "3. El filtro necesita ser más agresivo"
    echo ""
    echo "Soluciones sugeridas:"
    echo ""
    echo "A) Verificar que el deploy se completó:"
    echo "   railway logs --tail"
    echo ""
    echo "B) Reiniciar el servicio de Railway:"
    echo "   railway restart"
    echo ""
    echo "C) Revisar configuración de Baileys en session-manager.js"
    echo ""
else
    echo ""
    echo -e "${YELLOW}⚠️  Respuesta no válida. Ejecuta el script nuevamente.${NC}"
    echo ""
fi

echo "════════════════════════════════════════════════════════════════"
echo "📋 Reporte Guardado"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Los resultados de esta prueba deben documentarse en:"
echo "INVESTIGACION-ESTADOS-WHATSAPP-VISTOS.md"
echo ""
echo "Fecha de prueba: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "✅ Script de Prueba Completado"
echo "════════════════════════════════════════════════════════════════"
