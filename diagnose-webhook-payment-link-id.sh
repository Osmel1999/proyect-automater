#!/bin/bash

# 🔍 Script de Diagnóstico - Webhook de Wompi
# Verifica que el payment_link_id se esté propagando correctamente

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 DIAGNÓSTICO: Payment Link ID en Webhooks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Buscando logs recientes de webhook..."
echo ""

# Obtener los últimos 200 logs
LOGS=$(railway logs --tail 200)

# Verificar si hay webhooks recientes
if echo "$LOGS" | grep -q "Webhook completo recibido de Wompi"; then
    echo -e "${GREEN}✅ Se encontraron webhooks de Wompi en los logs${NC}"
    echo ""
    
    # Extraer payment_link_id del webhook
    PAYMENT_LINK_ID=$(echo "$LOGS" | grep "Payment Link ID:" | tail -1 | awk '{print $NF}')
    
    if [ ! -z "$PAYMENT_LINK_ID" ]; then
        echo -e "${GREEN}✅ Payment Link ID detectado en webhook: ${PAYMENT_LINK_ID}${NC}"
        
        # Verificar si se extrajo correctamente en wompi-adapter
        if echo "$LOGS" | grep -q "Payment Link ID final: ${PAYMENT_LINK_ID}"; then
            echo -e "${GREEN}✅ wompi-adapter.parseWebhookEvent() - OK${NC}"
        else
            echo -e "${RED}❌ wompi-adapter.parseWebhookEvent() - FAIL${NC}"
        fi
        
        # Verificar si llegó a gateway-manager
        if echo "$LOGS" | grep -q "paymentLinkId:.*${PAYMENT_LINK_ID}"; then
            echo -e "${GREEN}✅ gateway-manager.processWebhookEvent() - OK${NC}"
        else
            echo -e "${RED}❌ gateway-manager.processWebhookEvent() - FAIL${NC}"
        fi
        
        # Verificar si llegó a payment-service
        if echo "$LOGS" | grep -q "Payment Link ID extraído:.*${PAYMENT_LINK_ID}"; then
            echo -e "${GREEN}✅ payment-service.processWebhook() - OK${NC}"
        else
            if echo "$LOGS" | grep -q "Payment Link ID extraído: undefined"; then
                echo -e "${RED}❌ payment-service.processWebhook() - FAIL (undefined)${NC}"
            else
                echo -e "${YELLOW}⚠️  payment-service.processWebhook() - Log no encontrado${NC}"
            fi
        fi
        
        # Verificar si se encontró la transacción
        if echo "$LOGS" | grep -q "Transacción encontrada por paymentLinkId"; then
            echo -e "${GREEN}✅ Transacción encontrada en Firebase - OK${NC}"
        else
            echo -e "${RED}❌ Transacción NO encontrada en Firebase - FAIL${NC}"
        fi
        
        # Verificar el estado final del webhook
        if echo "$LOGS" | grep -q "Webhook procesado exitosamente: APPROVED"; then
            echo -e "${GREEN}✅ Webhook procesado exitosamente - OK${NC}"
        elif echo "$LOGS" | grep -q "TRANSACTION_NOT_FOUND"; then
            echo -e "${RED}❌ Estado: TRANSACTION_NOT_FOUND - FAIL${NC}"
        fi
        
    else
        echo -e "${YELLOW}⚠️  No se pudo extraer el Payment Link ID de los logs${NC}"
    fi
    
else
    echo -e "${YELLOW}⚠️  No se encontraron webhooks recientes de Wompi${NC}"
    echo ""
    echo "💡 Para probar:"
    echo "   1. Crea un link de pago desde WhatsApp"
    echo "   2. Realiza un pago de prueba"
    echo "   3. Ejecuta este script nuevamente"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resumen de Logs Relevantes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Mostrar logs relevantes
echo "$LOGS" | grep -A 3 "Payment Link ID final:" | tail -20
echo ""
echo "$LOGS" | grep -A 2 "event.data completo:" | tail -10
echo ""
echo "$LOGS" | grep "Payment Link ID extraído:" | tail -5
echo ""
echo "$LOGS" | grep "Transacción encontrada" | tail -5
echo ""
echo "$LOGS" | grep "Webhook procesado exitosamente" | tail -5
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 Comandos Útiles"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ver logs en tiempo real:"
echo "  railway logs --tail 50"
echo ""
echo "Buscar webhooks específicos:"
echo "  railway logs --tail 200 | grep -A 20 'Webhook completo'"
echo ""
echo "Ver transacciones en Firebase:"
echo "  firebase database:get /transactions"
echo ""
