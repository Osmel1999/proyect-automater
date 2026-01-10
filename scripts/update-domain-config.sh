#!/bin/bash

# ================================================
# SCRIPT: ACTUALIZAR CONFIGURACIÓN DE DOMINIO
# ================================================
# Este script actualiza los archivos de configuración
# para usar el dominio unificado kdsapp.site
# ================================================

set -e

echo "🚀 Actualizando configuración de dominio..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ================================================
# 1. VERIFICAR QUE ESTAMOS EN EL DIRECTORIO CORRECTO
# ================================================
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Debes ejecutar este script desde la raíz del proyecto${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Directorio verificado${NC}"

# ================================================
# 2. ACTUALIZAR facebook-config.js
# ================================================
echo ""
echo "📝 Actualizando facebook-config.js..."

if [ -f "facebook-config.js" ]; then
    # Backup
    cp facebook-config.js facebook-config.js.backup
    echo -e "${YELLOW}📦 Backup creado: facebook-config.js.backup${NC}"
    
    # Actualizar baseUrl si tiene localhost o railway
    sed -i '' 's|baseUrl: window.location.origin.*|baseUrl: window.location.origin // Usará kdsapp.site en producción|g' facebook-config.js
    
    # Verificar que callbackUrl esté correcto
    if grep -q "callbackUrl: '/api/whatsapp/callback'" facebook-config.js; then
        echo -e "${GREEN}✅ callbackUrl correcto${NC}"
    else
        echo -e "${YELLOW}⚠️  Revisar callbackUrl manualmente${NC}"
    fi
    
    echo -e "${GREEN}✅ facebook-config.js actualizado${NC}"
else
    echo -e "${RED}❌ No se encontró facebook-config.js${NC}"
fi

# ================================================
# 3. ACTUALIZAR .env.railway
# ================================================
echo ""
echo "📝 Actualizando .env.railway..."

if [ -f ".env.railway" ]; then
    # Backup
    cp .env.railway .env.railway.backup
    echo -e "${YELLOW}📦 Backup creado: .env.railway.backup${NC}"
    
    # Actualizar BASE_URL y REDIRECT_URI
    sed -i '' 's|BASE_URL=.*|BASE_URL=https://api.kdsapp.site|g' .env.railway
    sed -i '' 's|REDIRECT_URI=.*|REDIRECT_URI=https://api.kdsapp.site/api/whatsapp/callback|g' .env.railway
    
    echo -e "${GREEN}✅ .env.railway actualizado${NC}"
    echo -e "${YELLOW}⚠️  Recuerda actualizar estas variables en Railway Dashboard también${NC}"
else
    echo -e "${RED}❌ No se encontró .env.railway${NC}"
fi

# ================================================
# 4. ACTUALIZAR firebase.json (agregar proxy para API)
# ================================================
echo ""
echo "📝 Actualizando firebase.json..."

if [ -f "firebase.json" ]; then
    # Backup
    cp firebase.json firebase.json.backup
    echo -e "${YELLOW}📦 Backup creado: firebase.json.backup${NC}"
    
    # Verificar si ya tiene la configuración de proxy
    if grep -q "/api" firebase.json; then
        echo -e "${GREEN}✅ firebase.json ya tiene configuración de proxy${NC}"
    else
        echo -e "${YELLOW}⚠️  Considera agregar rewrite para /api/* en firebase.json${NC}"
        echo -e "${YELLOW}    Esto permite usar /api/* en lugar de api.kdsapp.site directamente${NC}"
    fi
else
    echo -e "${RED}❌ No se encontró firebase.json${NC}"
fi

# ================================================
# 5. CREAR ARCHIVO DE CONFIGURACIÓN DE DOMINIO
# ================================================
echo ""
echo "📝 Creando archivo de configuración de dominio..."

cat > domain-config.json << 'EOF'
{
  "domain": {
    "main": "kdsapp.site",
    "api": "api.kdsapp.site",
    "protocol": "https"
  },
  "urls": {
    "frontend": "https://kdsapp.site",
    "backend": "https://api.kdsapp.site",
    "webhook": "https://api.kdsapp.site/api/webhooks/whatsapp",
    "oauth_callback": "https://api.kdsapp.site/api/whatsapp/callback",
    "onboarding_success": "https://kdsapp.site/onboarding-success",
    "privacy": "https://kdsapp.site/privacy-policy.html",
    "terms": "https://kdsapp.site/terms.html"
  },
  "meta_dashboard": {
    "webhook_url": "https://api.kdsapp.site/api/webhooks/whatsapp",
    "verify_token": "8a7f5e9c3b2d1a6f4e8c9b7a5d3f1e2c",
    "oauth_redirect_uris": [
      "https://api.kdsapp.site/api/whatsapp/callback",
      "https://kdsapp.site/onboarding-success"
    ],
    "app_domains": [
      "kdsapp.site",
      "api.kdsapp.site"
    ]
  },
  "last_updated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo -e "${GREEN}✅ domain-config.json creado${NC}"

# ================================================
# 6. MOSTRAR RESUMEN
# ================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ CONFIGURACIÓN ACTUALIZADA${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo ""
echo "1️⃣  RAILWAY DASHBOARD:"
echo "   • Agregar custom domain: api.kdsapp.site"
echo "   • Actualizar variables:"
echo "     BASE_URL=https://api.kdsapp.site"
echo "     REDIRECT_URI=https://api.kdsapp.site/api/whatsapp/callback"
echo ""
echo "2️⃣  DNS (tu proveedor):"
echo "   • Agregar CNAME: api → [railway-url].up.railway.app"
echo ""
echo "3️⃣  META DASHBOARD:"
echo "   • Webhook: https://api.kdsapp.site/api/webhooks/whatsapp"
echo "   • OAuth Redirect: https://api.kdsapp.site/api/whatsapp/callback"
echo "   • App Domains: kdsapp.site, api.kdsapp.site"
echo ""
echo "4️⃣  DESPLEGAR FRONTEND:"
echo "   firebase deploy --only hosting"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 Archivos actualizados:"
echo "  • facebook-config.js"
echo "  • .env.railway"
echo "  • domain-config.json (nuevo)"
echo ""
echo "📦 Backups creados:"
echo "  • facebook-config.js.backup"
echo "  • .env.railway.backup"
echo "  • firebase.json.backup"
echo ""
echo -e "${YELLOW}💡 Tip: Revisa CHECKLIST-DOMINIO-UNIFICADO.md para el flujo completo${NC}"
echo ""
