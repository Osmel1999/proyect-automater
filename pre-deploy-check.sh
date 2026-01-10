#!/bin/bash

# Script de Pre-Deploy - Verificación Frontend
# Este script verifica que todo esté listo antes de hacer deploy a Firebase

echo "🔍 Verificando configuración del frontend..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función de verificación
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Verificar que estamos en el directorio correcto
echo "1️⃣  Verificando directorio..."
if [ -f "firebase.json" ]; then
    check "Directorio correcto (firebase.json encontrado)"
else
    echo -e "${RED}❌ No se encontró firebase.json. Asegúrate de estar en el directorio kds-webapp${NC}"
    exit 1
fi

# 2. Verificar archivos HTML principales
echo ""
echo "2️⃣  Verificando archivos HTML..."
REQUIRED_FILES=("index.html" "landing.html" "login.html" "home.html" "privacy-policy.html" "terms.html" "onboarding.html")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        check "$file existe"
    else
        warning "$file no encontrado"
    fi
done

# 3. Verificar firebase.json
echo ""
echo "3️⃣  Verificando firebase.json..."
if grep -q '"public": "."' firebase.json; then
    check "Public directory configurado correctamente"
else
    warning "Public directory puede no estar configurado"
fi

if grep -q "rewrites" firebase.json; then
    check "Rewrites configurados"
else
    warning "No se encontraron rewrites"
fi

# 4. Verificar que server/ no esté en public
echo ""
echo "4️⃣  Verificando que server/ esté excluido..."
if grep -q '"server/"' firebase.json || grep -q '"server/**"' firebase.json || grep -q '"./**"' firebase.json; then
    check "Carpeta server excluida del hosting"
else
    warning "Verifica que server/ esté en .firebaseignore o en ignore de firebase.json"
fi

# 5. Verificar configuración de Firebase CLI
echo ""
echo "5️⃣  Verificando Firebase CLI..."
if command -v firebase &> /dev/null; then
    check "Firebase CLI instalado"
    firebase --version
else
    echo -e "${RED}❌ Firebase CLI no está instalado${NC}"
    echo "Instala con: npm install -g firebase-tools"
    exit 1
fi

# 6. Verificar login de Firebase
echo ""
echo "6️⃣  Verificando autenticación Firebase..."
if firebase projects:list &> /dev/null; then
    check "Autenticado en Firebase"
else
    echo -e "${RED}❌ No estás autenticado en Firebase${NC}"
    echo "Ejecuta: firebase login"
    exit 1
fi

# 7. Verificar proyecto de Firebase
echo ""
echo "7️⃣  Verificando proyecto Firebase configurado..."
if [ -f ".firebaserc" ]; then
    PROJECT=$(grep -o '"default": "[^"]*"' .firebaserc | cut -d'"' -f4)
    if [ -n "$PROJECT" ]; then
        check "Proyecto Firebase configurado: $PROJECT"
    else
        warning "No se pudo detectar el proyecto en .firebaserc"
    fi
else
    warning ".firebaserc no encontrado"
fi

# 8. Resumen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Archivos HTML: ${#REQUIRED_FILES[@]} verificados"
echo "Configuración: firebase.json ✓"
echo "Firebase CLI: Instalado ✓"
echo ""

# 9. Verificación de dominio
echo "🌐 VERIFICACIÓN DE DOMINIO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Frontend: https://kdsapp.site"
echo "Backend:  https://api.kdsapp.site"
echo ""

# 10. Probar DNS
echo "Verificando DNS del backend..."
if nslookup api.kdsapp.site | grep -q "u3ldf50v.up.railway.app"; then
    check "DNS del backend configurado correctamente"
else
    warning "DNS del backend puede no estar propagado aún"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PRE-DEPLOY CHECK COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Para hacer deploy, ejecuta:"
echo ""
echo "   firebase deploy --only hosting"
echo ""
echo "📝 O para preview primero:"
echo ""
echo "   firebase hosting:channel:deploy preview"
echo ""
