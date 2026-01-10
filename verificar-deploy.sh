#!/bin/bash

##############################################
# Script de Verificación Post-Deploy
# KDS WhatsApp SaaS
##############################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 VERIFICACIÓN DEL DEPLOY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

URL="https://kds-backend-production.up.railway.app"

# 1. Health Check
echo "1️⃣  Health Check..."
HEALTH=$(curl -s -w "\n%{http_code}" "$URL/health" | tail -1)

if [ "$HEALTH" = "200" ]; then
    echo "   ✅ Servidor respondiendo correctamente"
    echo "   Respuesta:"
    curl -s "$URL/health" | jq '.' 2>/dev/null || curl -s "$URL/health"
else
    echo "   ❌ Servidor no responde (HTTP $HEALTH)"
    echo "   Ejecuta: railway logs"
fi

echo ""

# 2. Verificar Onboarding Page
echo "2️⃣  Página de Onboarding..."
ONBOARDING=$(curl -s -w "\n%{http_code}" "$URL/onboarding.html" | tail -1)

if [ "$ONBOARDING" = "200" ]; then
    echo "   ✅ Página de onboarding accesible"
else
    echo "   ❌ Página no accesible (HTTP $ONBOARDING)"
fi

echo ""

# 3. Verificar Variables
echo "3️⃣  Variables de Entorno..."
railway variables --kv 2>/dev/null | head -5
echo "   (Mostrando primeras 5 variables)"

echo ""

# 4. Estado del Deploy
echo "4️⃣  Estado del Proyecto..."
railway status

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$HEALTH" = "200" ] && [ "$ONBOARDING" = "200" ]; then
    echo "✅ DEPLOY EXITOSO"
    echo ""
    echo "🎯 Próximos pasos:"
    echo "   1. Configurar Webhook en Meta Dashboard"
    echo "   2. Configurar OAuth Redirect en Meta Dashboard"
    echo "   3. Probar flujo de onboarding"
    echo ""
    echo "📖 Lee: README-DEPLOY.md"
else
    echo "⚠️  Hay problemas en el deploy"
    echo ""
    echo "🔍 Verificar:"
    echo "   railway logs"
    echo ""
    echo "📖 Lee: FIX-TWILIO-REMOVIDO.md"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
