#!/bin/bash

##############################################
# Configurar Variables de Entorno en Railway
# KDS WhatsApp SaaS
##############################################

set -e

echo "🔐 Configurando variables de entorno en Railway..."
echo ""

# Verificar que firebase service account existe
if [ ! -f "server/firebase-service-account.json" ]; then
    echo "❌ No se encontró server/firebase-service-account.json"
    exit 1
fi

echo "🔑 Generando Firebase Service Account Key en Base64..."
FIREBASE_KEY=$(base64 -i server/firebase-service-account.json | tr -d '\n')

echo "📦 Configurando todas las variables..."
echo ""

# Configurar todas las variables de una vez
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
  --set "NODE_ENV=production"

echo ""
echo "✅ Variables configuradas correctamente"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Todas las variables configuradas correctamente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  NOTA: BASE_URL y REDIRECT_URI se configurarán"
echo "   después del primer deploy cuando tengamos la URL"
echo ""
echo "📋 SIGUIENTE PASO: Ejecutar el deploy"
echo "   railway up"
echo ""
