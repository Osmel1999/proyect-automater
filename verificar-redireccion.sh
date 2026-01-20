#!/bin/bash

# 🔍 Script de Verificación de Deploy y Redirección
# Verifica que los cambios de redirección estén desplegados correctamente

echo "🔍 Iniciando diagnóstico de redirección..."
echo ""

# 1. Verificar Git Status
echo "📋 1. Verificando estado de Git..."
git status --short
echo ""

# 2. Verificar últimos commits
echo "📜 2. Últimos 5 commits:"
git log --oneline -5
echo ""

# 3. Verificar el contenido actual de auth.html (línea de redirección)
echo "🔎 3. Verificando redirección en auth.html (debe ser /select.html):"
grep -n "window.location.href = '/select.html'" auth.html
if [ $? -eq 0 ]; then
    echo "✅ auth.html tiene la redirección correcta a /select.html"
else
    echo "❌ ERROR: auth.html NO tiene la redirección correcta"
    echo "   Buscando redirecciones en auth.html:"
    grep -n "window.location.href" auth.html | grep -v "//.*window.location.href"
fi
echo ""

# 4. Verificar select.html (no debe tener redirección automática a onboarding)
echo "🔎 4. Verificando que select.html NO redirige automáticamente:"
grep -n "window.location.href.*onboarding" select.html
if [ $? -eq 0 ]; then
    echo "❌ ERROR: select.html tiene redirección automática a onboarding.html"
else
    echo "✅ select.html NO tiene redirección automática (correcto)"
fi
echo ""

# 5. Verificar archivos legacy eliminados
echo "📁 5. Verificando que archivos legacy fueron movidos:"
if [ -f "login.html" ]; then
    echo "⚠️  WARNING: login.html aún existe en raíz"
else
    echo "✅ login.html eliminado de raíz"
fi

if [ -f "onboarding-baileys.js" ]; then
    echo "⚠️  WARNING: onboarding-baileys.js aún existe en raíz"
else
    echo "✅ onboarding-baileys.js eliminado de raíz"
fi
echo ""

# 6. Verificar que hay cambios pendientes por commitear
echo "🔄 6. Verificando cambios pendientes:"
CHANGES=$(git status --porcelain | wc -l)
if [ $CHANGES -gt 0 ]; then
    echo "⚠️  Hay $CHANGES archivo(s) con cambios sin commitear:"
    git status --short
    echo ""
    echo "¿Deseas commitear estos cambios? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        git add .
        git commit -m "docs: diagnostico y verificacion de redireccion"
        echo "✅ Cambios commiteados"
    fi
else
    echo "✅ No hay cambios pendientes"
fi
echo ""

# 7. Sugerencias de prueba
echo "📝 7. PASOS DE PRUEBA RECOMENDADOS:"
echo ""
echo "   A. Limpiar caché local:"
echo "      - Abrir DevTools (Cmd+Option+I en Mac)"
echo "      - Cmd + Shift + R para hard reload"
echo "      - O probar en modo incógnito"
echo ""
echo "   B. Limpiar localStorage:"
echo "      - Abrir DevTools > Console"
echo "      - Ejecutar: localStorage.clear(); sessionStorage.clear();"
echo "      - Recargar la página"
echo ""
echo "   C. Verificar Service Workers:"
echo "      - DevTools > Application > Service Workers"
echo "      - Unregister todos los service workers"
echo ""
echo "   D. Si usas Railway:"
echo "      - Hacer git push origin main para re-deployar"
echo "      - Verificar logs: railway logs"
echo ""

# 8. Verificar contenido de archivos críticos
echo "🔍 8. RESUMEN DE ARCHIVOS CRÍTICOS:"
echo ""
echo "auth.html - Líneas con window.location.href:"
grep -n "window.location.href" auth.html | grep -v "//" | grep -v "^\s*//"
echo ""
echo "select.html - Líneas con window.location.href:"
grep -n "window.location.href" select.html | grep -v "//" | grep -v "^\s*//"
echo ""

echo "✅ Diagnóstico completado."
echo ""
echo "🎯 FLUJO ESPERADO:"
echo "   1. Login en auth.html → Redirección a /select.html"
echo "   2. En select.html → Usuario elige destino (KDS o Dashboard)"
echo "   3. Si elige Dashboard → Se pide PIN"
echo "   4. Si onboarding < 100% → Se muestra badge de advertencia"
echo ""
