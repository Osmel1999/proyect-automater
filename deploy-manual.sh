#!/bin/bash

##############################################
# Deploy Manual a Railway (Simplificado)
# KDS WhatsApp SaaS
##############################################

set -e

echo "🚀 Iniciando deploy a Railway..."
echo ""

# 1. Inicializar proyecto Railway
echo "📦 Paso 1: Inicializando proyecto en Railway..."
railway init

echo ""
echo "✅ Proyecto inicializado"
echo ""

# 2. Configurar variables de entorno
echo "🔐 Paso 2: Configurando variables de entorno..."
echo ""
echo "Lee las variables desde .env y configúralas manualmente con:"
echo "  railway variables set NOMBRE=valor"
echo ""

# Leer .env y mostrar comando para cada variable
if [ -f ".env" ]; then
    echo "Variables detectadas en .env:"
    echo ""
    while IFS='=' read -r key value; do
        # Ignorar líneas vacías y comentarios
        if [[ ! -z "$key" ]] && [[ ! "$key" =~ ^[[:space:]]*# ]]; then
            # Remover espacios en blanco
            key=$(echo $key | xargs)
            value=$(echo $value | xargs)
            
            # Skip si no es BASE_URL o REDIRECT_URI (esos los configuramos después)
            if [[ "$key" != "BASE_URL" ]] && [[ "$key" != "REDIRECT_URI" ]] && [[ ! -z "$value" ]]; then
                echo "railway variables set $key=\"$value\""
            fi
        fi
    done < .env
    
    echo ""
    echo "⚠️  BASE_URL y REDIRECT_URI se configurarán después del primer deploy"
    echo ""
else
    echo "❌ No se encontró archivo .env"
    exit 1
fi

echo ""
echo "✅ Variables listadas"
echo ""

# 3. Deploy
echo "🚢 Paso 3: Desplegando a Railway..."
railway up

echo ""
echo "✅ Deploy completado"
echo ""

# 4. Obtener URL
echo "🌐 Obteniendo URL del proyecto..."
URL=$(railway domain 2>/dev/null || echo "")

if [ ! -z "$URL" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✨ ¡DEPLOY EXITOSO!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 URL: https://$URL"
    echo ""
    echo "📋 PRÓXIMOS PASOS:"
    echo ""
    echo "1️⃣  Actualizar variables en Railway:"
    echo "   railway variables set BASE_URL=\"https://$URL\""
    echo "   railway variables set REDIRECT_URI=\"https://$URL/api/whatsapp/callback\""
    echo ""
    echo "2️⃣  Configurar Meta Dashboard:"
    echo "   • Webhook URL: https://$URL/webhook/whatsapp"
    echo "   • OAuth Redirect: https://$URL/api/whatsapp/callback"
    echo ""
    echo "3️⃣  Probar el sistema:"
    echo "   curl https://$URL/health"
    echo "   open https://$URL/onboarding.html"
    echo ""
else
    echo ""
    echo "⚠️  No se pudo obtener la URL automáticamente"
    echo ""
    echo "Ejecuta: railway domain"
    echo "Y luego actualiza las variables BASE_URL y REDIRECT_URI"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
