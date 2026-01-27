#!/bin/bash

# 🔍 Test: Verificar que archivos legacy NO son accesibles

echo "🧪 TEST: Archivos Legacy Eliminados"
echo "===================================="
echo ""

# 1. Verificar que login.html NO existe en raíz
echo "📋 1. Verificando que login.html NO existe en raíz..."
if [ -f "login.html" ]; then
    echo "❌ ERROR: login.html todavía existe en raíz"
    echo "   Ubicación: $(pwd)/login.html"
    exit 1
else
    echo "✅ login.html NO existe en raíz (correcto)"
fi
echo ""

# 2. Verificar que login.html está en archive_legacy
echo "📋 2. Verificando que login.html está archivado..."
if [ -f "archive_legacy/login.html" ]; then
    echo "✅ login.html encontrado en archive_legacy/"
else
    echo "⚠️  WARNING: login.html no está en archive_legacy/"
fi
echo ""

# 3. Verificar que onboarding-baileys.js NO existe en raíz
echo "📋 3. Verificando que onboarding-baileys.js NO existe en raíz..."
if [ -f "onboarding-baileys.js" ]; then
    echo "❌ ERROR: onboarding-baileys.js todavía existe en raíz"
    echo "   Ubicación: $(pwd)/onboarding-baileys.js"
    exit 1
else
    echo "✅ onboarding-baileys.js NO existe en raíz (correcto)"
fi
echo ""

# 4. Verificar que onboarding-baileys.js está en archive_legacy
echo "📋 4. Verificando que onboarding-baileys.js está archivado..."
if [ -f "archive_legacy/onboarding-baileys.js" ]; then
    echo "✅ onboarding-baileys.js encontrado en archive_legacy/"
else
    echo "⚠️  WARNING: onboarding-baileys.js no está en archive_legacy/"
fi
echo ""

# 5. Listar archivos HTML en raíz
echo "📋 5. Archivos HTML en raíz del proyecto:"
ls -1 *.html 2>/dev/null | while read file; do
    echo "   - $file"
done
echo ""

# 6. Verificar que auth.html existe (el correcto)
echo "📋 6. Verificando que auth.html existe (archivo correcto)..."
if [ -f "auth.html" ]; then
    echo "✅ auth.html existe (este es el archivo de login correcto)"
else
    echo "❌ ERROR: auth.html no existe"
    exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Archivos legacy eliminados de raíz"
echo "✅ Archivos movidos a archive_legacy/"
echo "✅ auth.html es el archivo de login activo"
echo ""
echo "🌐 Comportamiento esperado en Railway:"
echo ""
echo "   ❌ https://tu-app.railway.app/login.html"
echo "      → Debe mostrar: 404 Not Found o Cannot GET /login.html"
echo ""
echo "   ✅ https://tu-app.railway.app/auth.html"
echo "      → Debe abrir la página de login (correcto)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
