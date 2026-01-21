#!/bin/bash

# 🔍 Script de Verificación del Deploy en Railway
# Verifica que el archivo auth.html desplegado tiene la redirección correcta

clear
echo "🔍 VERIFICACIÓN DEL DEPLOY EN RAILWAY"
echo "======================================"
echo ""

# Obtener la URL de Railway desde las variables de entorno o solicitar al usuario
RAILWAY_URL="${RAILWAY_URL:-}"

if [ -z "$RAILWAY_URL" ]; then
    echo "📝 Ingresa la URL de tu aplicación en Railway:"
    echo "   Ejemplo: https://kds-webapp-production.up.railway.app"
    echo ""
    read -p "URL: " RAILWAY_URL
    
    if [ -z "$RAILWAY_URL" ]; then
        echo "❌ URL no proporcionada. Saliendo..."
        exit 1
    fi
fi

# Eliminar trailing slash si existe
RAILWAY_URL="${RAILWAY_URL%/}"

echo "🌐 URL de Railway: $RAILWAY_URL"
echo ""

# 1. Verificar que el servidor está respondiendo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 1. Verificando conectividad..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/auth.html")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Servidor responde correctamente (HTTP $HTTP_CODE)"
else
    echo "❌ Error: Servidor responde con HTTP $HTTP_CODE"
    exit 1
fi
echo ""

# 2. Verificar headers de caché
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚫 2. Verificando headers anti-caché..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CACHE_CONTROL=$(curl -s -I "$RAILWAY_URL/auth.html" | grep -i "cache-control" || echo "No encontrado")
PRAGMA=$(curl -s -I "$RAILWAY_URL/auth.html" | grep -i "pragma" || echo "No encontrado")

echo "Cache-Control: $CACHE_CONTROL"
echo "Pragma: $PRAGMA"

if echo "$CACHE_CONTROL" | grep -q "no-store\|no-cache"; then
    echo "✅ Headers anti-caché configurados correctamente"
else
    echo "⚠️  WARNING: Headers anti-caché no encontrados"
fi
echo ""

# 3. Verificar el comentario de deploy (prueba de que se desplegó la versión nueva)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📅 3. Verificando versión del archivo (comentario de deploy)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DEPLOY_COMMENT=$(curl -s "$RAILWAY_URL/auth.html" | grep -o "Deploy: [0-9-]* [0-9:]* [APM]* - Fix")

if [ -n "$DEPLOY_COMMENT" ]; then
    echo "✅ Versión del deploy encontrada: $DEPLOY_COMMENT"
else
    echo "⚠️  WARNING: No se encontró el comentario de deploy"
    echo "   Esto podría significar que se está sirviendo una versión cacheada"
fi
echo ""

# 4. Verificar la redirección a select.html (el fix principal)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 4. Verificando redirección correcta a /select.html..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Buscar la línea de redirección después del login
REDIRECT_LINE=$(curl -s "$RAILWAY_URL/auth.html" | grep -A 2 "Login exitoso" | grep "window.location.href")

echo "Línea de redirección encontrada:"
echo "$REDIRECT_LINE"
echo ""

if echo "$REDIRECT_LINE" | grep -q "/select.html"; then
    echo "✅ ¡CORRECTO! Redirige a /select.html"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 ¡DEPLOY VERIFICADO EXITOSAMENTE!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ El servidor está sirviendo la versión correcta"
    echo "✅ La redirección a /select.html está configurada"
    echo ""
elif echo "$REDIRECT_LINE" | grep -q "/onboarding.html"; then
    echo "❌ ERROR: Todavía redirige a /onboarding.html (versión antigua)"
    echo ""
    echo "🔧 POSIBLES SOLUCIONES:"
    echo "   1. Esperar 2-3 minutos más (Railway puede estar usando caché)"
    echo "   2. Hacer otro deploy con: railway up --force"
    echo "   3. Verificar que el último commit se desplegó correctamente"
    exit 1
else
    echo "⚠️  WARNING: No se pudo determinar la redirección"
    echo ""
fi

# 5. Instrucciones finales para el usuario
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PRÓXIMOS PASOS PARA EL USUARIO:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 🔓 Abrir ventana de INCÓGNITO (Cmd+Shift+N)"
echo ""
echo "2. 🌐 Ir a: $RAILWAY_URL/auth.html"
echo ""
echo "3. 🔐 Hacer login con credenciales válidas"
echo ""
echo "4. ✅ Verificar que redirige a: $RAILWAY_URL/select.html"
echo "   (NO a /onboarding.html)"
echo ""
echo "5. ⚙️  En select.html, verificar:"
echo "   - Se muestran dos opciones: KDS y Dashboard"
echo "   - Al hacer click en Dashboard, pide PIN"
echo "   - Badge de progreso de onboarding si < 100%"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🆘 SI FUNCIONA EN INCÓGNITO PERO NO EN MODO NORMAL:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "El problema es CACHÉ LOCAL del navegador. Soluciones:"
echo ""
echo "A) Hard Reload:"
echo "   - Cmd + Shift + R (Mac)"
echo "   - Ctrl + Shift + R (Windows/Linux)"
echo ""
echo "B) DevTools Console:"
echo "   localStorage.clear();"
echo "   sessionStorage.clear();"
echo "   location.reload();"
echo ""
echo "C) Limpiar todo:"
echo "   - DevTools (F12) → Application → Clear site data"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
