#!/bin/bash

##############################################
# Script de Deploy Automatizado a Railway
# KDS WhatsApp SaaS
##############################################

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY A RAILWAY - KDS WHATSAPP SAAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI no está instalado"
    echo ""
    echo "Instálalo con uno de estos comandos:"
    echo "  • macOS: brew install railway"
    echo "  • npm:   npm install -g @railway/cli"
    echo ""
    exit 1
fi

print_success "Railway CLI encontrado"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Asegúrate de estar en el directorio del proyecto."
    exit 1
fi

print_success "Directorio del proyecto verificado"

# Verificar archivo .env
if [ ! -f ".env" ]; then
    print_error "No se encontró archivo .env"
    echo ""
    echo "Copia .env.example y configúralo:"
    echo "  cp .env.example .env"
    echo ""
    exit 1
fi

print_success "Archivo .env encontrado"

# Verificar Firebase Service Account
if [ ! -f "server/firebase-service-account.json" ]; then
    print_error "No se encontró server/firebase-service-account.json"
    echo ""
    echo "Descarga el archivo desde Firebase Console:"
    echo "  https://console.firebase.google.com/project/kds-app-7f1d3/settings/serviceaccounts/adminsdk"
    echo ""
    exit 1
fi

print_success "Firebase Service Account encontrado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 SELECCIONA MÉTODO DE DEPLOY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1) Nuevo Proyecto (primera vez)"
echo "2) Proyecto Existente (actualizar)"
echo "3) Solo Variables de Entorno"
echo "4) Solo Deploy de Código"
echo ""
read -p "Selecciona una opción (1-4): " option

case $option in
    1)
        echo ""
        print_info "Creando nuevo proyecto en Railway..."
        echo ""
        
        # Login
        print_info "Iniciando sesión en Railway..."
        railway login
        
        # Inicializar proyecto
        print_info "Inicializando proyecto..."
        railway init
        
        # Configurar variables
        print_info "Configurando variables de entorno..."
        echo ""
        
        # Cargar desde .env
        source .env
        
        railway variables set WHATSAPP_APP_ID="$WHATSAPP_APP_ID"
        railway variables set WHATSAPP_APP_SECRET="$WHATSAPP_APP_SECRET"
        railway variables set WHATSAPP_VERIFY_TOKEN="$WHATSAPP_VERIFY_TOKEN"
        railway variables set ENCRYPTION_KEY="$ENCRYPTION_KEY"
        railway variables set FACEBOOK_APP_ID="$FACEBOOK_APP_ID"
        railway variables set FACEBOOK_APP_SECRET="$FACEBOOK_APP_SECRET"
        railway variables set FIREBASE_DATABASE_URL="$FIREBASE_DATABASE_URL"
        railway variables set FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID"
        railway variables set PORT="3000"
        railway variables set NODE_ENV="production"
        
        print_success "Variables configuradas"
        
        # Firebase Service Account
        print_info "Configurando Firebase Service Account..."
        FIREBASE_BASE64=$(base64 -i server/firebase-service-account.json)
        railway variables set FIREBASE_SERVICE_ACCOUNT_KEY="$FIREBASE_BASE64"
        print_success "Firebase Service Account configurado"
        
        # Deploy
        print_info "Desplegando aplicación..."
        railway up
        
        # Obtener URL
        echo ""
        print_success "¡Deploy completado!"
        echo ""
        print_info "Obteniendo URL de tu aplicación..."
        RAILWAY_URL=$(railway domain 2>&1 | grep -o 'https://[^ ]*')
        
        if [ -n "$RAILWAY_URL" ]; then
            echo ""
            print_success "Tu aplicación está disponible en:"
            echo ""
            echo "  🌐 $RAILWAY_URL"
            echo ""
            print_warning "IMPORTANTE: Actualiza estas URLs en Meta Dashboard:"
            echo ""
            echo "  • Redirect URI: $RAILWAY_URL/api/whatsapp/callback"
            echo "  • Webhook URL: $RAILWAY_URL/webhook/whatsapp"
            echo ""
            
            # Actualizar BASE_URL
            print_info "Actualizando BASE_URL..."
            railway variables set BASE_URL="$RAILWAY_URL"
            railway variables set REDIRECT_URI="$RAILWAY_URL/api/whatsapp/callback"
            print_success "URLs actualizadas"
        fi
        ;;
        
    2)
        echo ""
        print_info "Actualizando proyecto existente..."
        
        # Verificar si está vinculado
        if ! railway status &> /dev/null; then
            print_error "No estás vinculado a ningún proyecto"
            echo ""
            print_info "Vinculando con proyecto..."
            railway link
        fi
        
        # Deploy
        print_info "Desplegando actualizaciones..."
        railway up
        
        print_success "¡Actualización completada!"
        ;;
        
    3)
        echo ""
        print_info "Configurando solo variables de entorno..."
        
        # Cargar desde .env
        source .env
        
        echo ""
        read -p "¿Actualizar todas las variables? (s/n): " update_all
        
        if [ "$update_all" = "s" ]; then
            railway variables set WHATSAPP_APP_ID="$WHATSAPP_APP_ID"
            railway variables set WHATSAPP_APP_SECRET="$WHATSAPP_APP_SECRET"
            railway variables set WHATSAPP_VERIFY_TOKEN="$WHATSAPP_VERIFY_TOKEN"
            railway variables set ENCRYPTION_KEY="$ENCRYPTION_KEY"
            railway variables set FACEBOOK_APP_ID="$FACEBOOK_APP_ID"
            railway variables set FACEBOOK_APP_SECRET="$FACEBOOK_APP_SECRET"
            railway variables set FIREBASE_DATABASE_URL="$FIREBASE_DATABASE_URL"
            railway variables set FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID"
            railway variables set PORT="3000"
            railway variables set NODE_ENV="production"
            
            print_success "Variables actualizadas"
        else
            echo ""
            print_info "Variables disponibles para actualizar individualmente:"
            echo "  • WHATSAPP_APP_ID"
            echo "  • WHATSAPP_APP_SECRET"
            echo "  • WHATSAPP_VERIFY_TOKEN"
            echo "  • ENCRYPTION_KEY"
            echo "  • Y más..."
            echo ""
            print_info "Usa: railway variables set VARIABLE=valor"
        fi
        ;;
        
    4)
        echo ""
        print_info "Desplegando solo código..."
        railway up
        print_success "¡Deploy completado!"
        ;;
        
    *)
        print_error "Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PRÓXIMOS PASOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Ver logs:"
echo "   railway logs --tail"
echo ""
echo "2. Verificar health:"
echo "   curl \$(railway domain)/health"
echo ""
echo "3. Configurar webhook en Meta:"
echo "   https://developers.facebook.com/apps/1860852208127086/whatsapp-business/wa-settings"
echo ""
echo "4. Probar onboarding:"
echo "   open \$(railway domain)/onboarding.html"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
