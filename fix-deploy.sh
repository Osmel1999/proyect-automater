#!/bin/bash

##############################################
# Configurar Variables CORRECTAMENTE en Railway
# KDS WhatsApp SaaS
##############################################

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Configurando Variables de Entorno en Railway"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que firebase service account existe
if [ ! -f "server/firebase-service-account.json" ]; then
    echo "❌ No se encontró server/firebase-service-account.json"
    exit 1
fi

echo "✅ Firebase Service Account encontrado"
echo ""

# Generar Base64 del Firebase Service Account
echo "🔑 Generando Firebase Service Account Key en Base64..."
FIREBASE_KEY=$(base64 -i server/firebase-service-account.json | tr -d '\n')
echo "✅ Key generada (${#FIREBASE_KEY} caracteres)"
echo ""

# URL de Railway
RAILWAY_URL="https://kds-backend-production.up.railway.app"

echo "📦 Configurando TODAS las variables..."
echo ""

# Configurar todas las variables en una sola llamada
railway variables \
  --set "WHATSAPP_APP_ID=1860852208127086" \
  --set "WHATSAPP_APP_SECRET=0be9ae1fd6c26f086f5602eac3c7055c" \
  --set "WHATSAPP_VERIFY_TOKEN=8a7f5e9c3b2d1a6f4e8c9b7a5d3f1e2c" \
  --set "ENCRYPTION_KEY=rK8mP3nL9xQ2wV7yT4bN6jH5gF1dS8zA" \
  --set "FACEBOOK_APP_ID=1860852208127086" \
  --set "FACEBOOK_APP_SECRET=0be9ae1fd6c26f086f5602eac3c7055c" \
  --set "FIREBASE_DATABASE_URL=https://kds-app-7f1d3-default-rtdb.firebaseio.com" \
  --set "FIREBASE_PROJECT_ID=kds-app-7f1d3" \
  --set "FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_KEY" \
  --set "PORT=3000" \
  --set "NODE_ENV=production" \
  --set "BASE_URL=$RAILWAY_URL" \
  --set "REDIRECT_URI=$RAILWAY_URL/api/whatsapp/callback"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Todas las variables configuradas"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Variables configuradas:"
echo "   • WHATSAPP_APP_ID"
echo "   • WHATSAPP_APP_SECRET"
echo "   • WHATSAPP_VERIFY_TOKEN"
echo "   • ENCRYPTION_KEY"
echo "   • FACEBOOK_APP_ID"
echo "   • FACEBOOK_APP_SECRET"
echo "   • FIREBASE_DATABASE_URL"
echo "   • FIREBASE_PROJECT_ID"
echo "   • FIREBASE_SERVICE_ACCOUNT_KEY"
echo "   • PORT"
echo "   • NODE_ENV"
echo "   • BASE_URL = $RAILWAY_URL"
echo "   • REDIRECT_URI = $RAILWAY_URL/api/whatsapp/callback"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Redesplegando la aplicación..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Redeployar automáticamente
railway up --detach

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deploy iniciado"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Ver logs en tiempo real:"
echo "   railway logs"
echo ""
echo "🌐 URL de la aplicación:"
echo "   $RAILWAY_URL"
echo ""
echo "✅ Verificar health check (espera 1-2 minutos):"
echo "   curl $RAILWAY_URL/health"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
