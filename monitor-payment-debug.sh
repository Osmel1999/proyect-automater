#!/bin/bash

# 🔍 Script de Monitoreo en Tiempo Real - Pedidos con Tarjeta

echo "🔍 =================================="
echo "   MONITOR: Pedidos con Tarjeta"
echo "   =================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📡 Conectando a logs de Railway...${NC}"
echo ""

# Verificar que railway CLI esté instalado
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI no está instalado${NC}"
    echo ""
    echo "Instalar con:"
    echo "  npm install -g @railway/cli"
    echo ""
    exit 1
fi

# Verificar que estamos en el proyecto correcto
if [ ! -f "railway.toml" ]; then
    echo -e "${RED}❌ No se encontró railway.toml en este directorio${NC}"
    echo ""
    echo "Asegúrate de estar en el directorio kds-webapp"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI detectado${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}📋 INSTRUCCIONES:${NC}"
echo ""
echo "1. Haz una prueba de pago con tarjeta desde WhatsApp"
echo "2. Observa los logs en tiempo real abajo"
echo "3. Busca estos mensajes clave:"
echo ""
echo -e "${GREEN}   ✅ [handleWebhookEvent] Webhook recibido: APPROVED${NC}"
echo -e "${GREEN}   ✅ [_createOrderInKDS] Creando pedido en KDS...${NC}"
echo -e "${GREEN}   ✅ [_createOrderInKDS] Pedido creado en KDS exitosamente${NC}"
echo ""
echo "4. Si ves errores rojos (❌), cópialos para el debug"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}🚀 Iniciando logs en tiempo real...${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Filtrar logs relevantes para el debug de pagos
railway logs --tail 200 | grep -E "(handleWebhookEvent|_createOrderInKDS|_confirmPayment|_notifyCustomer|ERROR|❌|✅|🔥)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}💡 TIP:${NC}"
echo "Si no ves logs, verifica:"
echo "  1. Railway CLI está conectado: railway whoami"
echo "  2. Estás en el proyecto correcto: railway status"
echo "  3. El servidor está corriendo: railway ps"
echo ""
