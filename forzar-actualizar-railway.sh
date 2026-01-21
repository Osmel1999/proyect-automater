#!/bin/bash

# 🔧 Script: Forzar Actualización de Railway
# Resuelve el problema de Railway no actualizando archivos

clear
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 FORZAR ACTUALIZACIÓN DE RAILWAY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "auth.html" ]; then
    echo "❌ ERROR: No estás en el directorio kds-webapp"
    echo "   Ejecuta: cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp"
    exit 1
fi

echo "✅ Directorio correcto verificado"
echo ""

# Paso 1: Commitear cambios pendientes
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PASO 1: Commitear cambios locales"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

git add -A
if git diff --cached --quiet; then
    echo "✅ No hay cambios pendientes"
else
    git commit -m "fix: forzar actualización de Railway con archivo de verificación"
    echo "✅ Cambios commiteados"
fi
echo ""

# Paso 2: Eliminar cache local de Railway (si existe)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗑️  PASO 2: Limpiar cache local de Railway"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Eliminar .railway cache local si existe
rm -rf .railway 2>/dev/null && echo "✅ Cache local eliminado" || echo "ℹ️  No hay cache local"
echo ""

# Paso 3: Railway up --force
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 PASO 3: Deployar con railway up --force"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "⏳ Ejecutando railway up..."
echo "   (Esto puede tardar 2-3 minutos)"
echo ""

railway up

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERROR: railway up falló"
    echo ""
    echo "🔧 Posibles soluciones:"
    echo "   1. Verificar que estás autenticado: railway login"
    echo "   2. Verificar que el proyecto está vinculado: railway status"
    echo "   3. Intentar manualmente: railway up --force"
    echo ""
    exit 1
fi

echo ""
echo "✅ Deploy completado"
echo ""

# Paso 4: Esperar a que Railway reinicie
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰ PASO 4: Esperando a que Railway reinicie..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for i in {180..1}; do
    printf "\r   Esperando: %3d segundos restantes..." $i
    sleep 1
done
echo ""
echo ""

# Paso 5: Verificar el deploy
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PASO 5: Verificar que se actualizó"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Ingresa la URL de tu app en Railway:"
echo "Ejemplo: https://kds-webapp-production.up.railway.app"
read -p "URL: " RAILWAY_URL

if [ -z "$RAILWAY_URL" ]; then
    echo "⚠️  No ingresaste URL, saltando verificación"
else
    # Eliminar trailing slash
    RAILWAY_URL="${RAILWAY_URL%/}"
    
    echo ""
    echo "🧪 Verificando archivos..."
    echo ""
    
    # Verificar login.html (NO debe existir)
    echo -n "   login.html: "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/login.html")
    if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "500" ]; then
        echo "✅ NO EXISTE (HTTP $HTTP_CODE) - CORRECTO"
    else
        echo "❌ TODAVÍA EXISTE (HTTP $HTTP_CODE) - ERROR"
    fi
    
    # Verificar auth.html (debe existir)
    echo -n "   auth.html: "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/auth.html")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ EXISTE (HTTP $HTTP_CODE) - CORRECTO"
    else
        echo "❌ NO EXISTE (HTTP $HTTP_CODE) - ERROR"
    fi
    
    # Verificar archivo de verificación
    echo -n "   deploy-verification.js: "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/deploy-verification.js")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ EXISTE (HTTP $HTTP_CODE) - Deploy actualizado"
    else
        echo "⚠️  NO ENCONTRADO (HTTP $HTTP_CODE) - Deploy puede estar desactualizado"
    fi
    
    echo ""
fi

# Resultado final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 RESULTADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "500" ]; then
    echo "✅ ¡ÉXITO! Railway se actualizó correctamente"
    echo ""
    echo "🧪 Ahora prueba en el navegador:"
    echo "   1. Abre modo incógnito (Cmd+Shift+N)"
    echo "   2. Abre DevTools Console (F12)"
    echo "   3. Ve a: $RAILWAY_URL/auth.html"
    echo "   4. Haz login"
    echo "   5. Verifica que redirige a /select.html"
    echo ""
else
    echo "⚠️  Railway puede NO haberse actualizado correctamente"
    echo ""
    echo "🔧 Próximos pasos:"
    echo "   1. Ve al Railway Dashboard: https://railway.app"
    echo "   2. Selecciona tu proyecto"
    echo "   3. Ve a Settings → Delete Service Cache"
    echo "   4. Espera que haga rebuild"
    echo "   5. Vuelve a verificar"
    echo ""
    echo "O lee: SOLUCION-RAILWAY-NO-ACTUALIZA.md"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
