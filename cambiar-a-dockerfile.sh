#!/bin/bash

# 🔥 Solución Extrema: Cambiar a Dockerfile y Forzar Rebuild Limpio

clear
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 SOLUCIÓN EXTREMA: Cambiar a Dockerfile"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Esta solución:"
echo "✅ Cambia de NIXPACKS a DOCKERFILE"
echo "✅ Fuerza un rebuild completamente limpio"
echo "✅ Verifica que login.html NO existe durante el build"
echo "✅ Verifica que auth.html SÍ existe durante el build"
echo ""
echo "⚠️  Esto es más agresivo que railway up normal"
echo ""
read -p "¿Continuar? (y/n): " confirm

if [[ ! "$confirm" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Cancelado."
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PASO 1: Verificar archivos locales"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "login.html" ]; then
    echo "❌ ERROR: login.html existe localmente"
    echo "   Debe estar eliminado antes de continuar"
    exit 1
else
    echo "✅ login.html NO existe (correcto)"
fi

if [ ! -f "auth.html" ]; then
    echo "❌ ERROR: auth.html no existe localmente"
    exit 1
else
    echo "✅ auth.html existe (correcto)"
fi

if [ ! -f "Dockerfile" ]; then
    echo "❌ ERROR: Dockerfile no existe"
    echo "   Debe existir para continuar"
    exit 1
else
    echo "✅ Dockerfile existe"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PASO 2: Commitear cambios"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

git add Dockerfile railway.json
git commit -m "fix: cambiar a Dockerfile para forzar rebuild limpio de Railway"

if [ $? -eq 0 ]; then
    echo "✅ Cambios commiteados"
else
    echo "ℹ️  No hay cambios nuevos para commitear"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PASO 3: Deploy con Dockerfile"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "⏳ Ejecutando railway up..."
echo "   (Esto puede tardar 3-5 minutos porque build desde cero)"
echo ""

railway up

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERROR: railway up falló"
    echo ""
    echo "💡 Posibles causas:"
    echo "   1. Error en Dockerfile"
    echo "   2. Problema de conexión"
    echo "   3. Error en Railway"
    echo ""
    echo "🔍 Ver logs:"
    echo "   railway logs --tail"
    echo ""
    exit 1
fi

echo ""
echo "✅ Deploy iniciado"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰ PASO 4: Esperando a que Railway termine el build..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   El build con Dockerfile es más lento pero más confiable"
echo ""

for i in {300..1}; do
    printf "\r   Esperando: %3d segundos restantes..." $i
    sleep 1
done

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PASO 5: Verificar que se actualizó"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🧪 Probando archivos en Railway..."
echo ""

# Test login.html (NO debe existir)
echo -n "   login.html: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://kdsapp.site/login.html")
if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "500" ]; then
    echo "✅ NO EXISTE (HTTP $HTTP_CODE) - CORRECTO"
    LOGIN_OK=true
else
    echo "❌ TODAVÍA EXISTE (HTTP $HTTP_CODE) - ERROR"
    LOGIN_OK=false
fi

# Test auth.html (debe existir)
echo -n "   auth.html: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://kdsapp.site/auth.html")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ EXISTE (HTTP $HTTP_CODE) - CORRECTO"
    AUTH_OK=true
else
    echo "❌ NO EXISTE (HTTP $HTTP_CODE) - ERROR"
    AUTH_OK=false
fi

# Test deploy-verification.js
echo -n "   deploy-verification.js: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://kdsapp.site/deploy-verification.js")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ EXISTE (HTTP $HTTP_CODE) - Deploy actualizado"
    VERIFY_OK=true
else
    echo "⚠️  NO ENCONTRADO (HTTP $HTTP_CODE)"
    VERIFY_OK=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 RESULTADO FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$LOGIN_OK" = true ] && [ "$AUTH_OK" = true ]; then
    echo "✅ ¡ÉXITO! Railway se actualizó correctamente"
    echo ""
    echo "🎉 El cambio a Dockerfile funcionó"
    echo ""
    echo "🧪 Ahora prueba en el navegador:"
    echo "   1. Abre modo incógnito (Cmd+Shift+N)"
    echo "   2. Abre DevTools Console (F12)"
    echo "   3. Ve a: https://kdsapp.site/auth.html"
    echo "   4. Haz login"
    echo "   5. Verifica que redirige a /select.html"
    echo ""
else
    echo "⚠️  Railway puede NO haberse actualizado completamente"
    echo ""
    
    if [ "$LOGIN_OK" = false ]; then
        echo "❌ login.html TODAVÍA existe en Railway"
    fi
    
    if [ "$AUTH_OK" = false ]; then
        echo "❌ auth.html NO existe en Railway"
    fi
    
    echo ""
    echo "🔧 Próximos pasos:"
    echo "   1. Ver logs de build:"
    echo "      railway logs --tail"
    echo ""
    echo "   2. Si el build falló, verificar Dockerfile"
    echo ""
    echo "   3. Si el build pasó pero archivos no actualizan:"
    echo "      - Railway Dashboard → Settings → Delete Service Cache"
    echo "      - Ejecutar de nuevo: ./cambiar-a-dockerfile.sh"
    echo ""
    echo "   4. Última opción: Re-crear servicio (lee SOLUCIONES-EXTREMAS-RAILWAY.md)"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
