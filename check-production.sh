#!/bin/bash

echo "=================================================="
echo "🔍 VERIFICACIÓN RÁPIDA DEL DASHBOARD"
echo "=================================================="
echo ""

echo "📡 Descargando dashboard.html de producción..."
curl -s "https://automater-e51cc.web.app/dashboard.html" > /tmp/dashboard-prod.html

echo ""
echo "1️⃣ Verificando versión del código..."
if grep -q "Version: 2.0.0 - 2026-01-21-fix-dashboard" /tmp/dashboard-prod.html; then
    echo "✅ Versión correcta encontrada: 2.0.0"
else
    echo "❌ ERROR: Versión no encontrada o incorrecta"
    echo "   Puede ser un problema de caché de Firebase Hosting"
fi

echo ""
echo "2️⃣ Verificando mensaje de progreso..."
if grep -q "Completar configuración" /tmp/dashboard-prod.html; then
    echo "✅ Mensaje 'Completar configuración' encontrado"
else
    echo "❌ ERROR: Mensaje no encontrado"
fi

echo ""
echo "3️⃣ Verificando lógica del toggle..."
if grep -q "menu_configured && messages_customized && whatsapp_connected" /tmp/dashboard-prod.html; then
    echo "✅ Lógica del toggle correcta (3 campos)"
else
    echo "❌ ERROR: Lógica del toggle no encontrada"
fi

echo ""
echo "4️⃣ Verificando dashboard completo..."
if grep -q "dashboard-main" /tmp/dashboard-prod.html; then
    echo "✅ Dashboard completo encontrado"
else
    echo "❌ ERROR: Dashboard completo no encontrado"
fi

echo ""
echo "5️⃣ Verificando función de limpieza..."
if grep -q "cleanupFirebaseFields" /tmp/dashboard-prod.html; then
    echo "✅ Función de limpieza encontrada"
else
    echo "❌ ERROR: Función de limpieza no encontrada"
fi

echo ""
echo "=================================================="
echo "📊 RESUMEN"
echo "=================================================="

# Contar checks exitosos
SUCCESS_COUNT=0
grep -q "Version: 2.0.0" /tmp/dashboard-prod.html && ((SUCCESS_COUNT++))
grep -q "Completar configuración" /tmp/dashboard-prod.html && ((SUCCESS_COUNT++))
grep -q "menu_configured && messages_customized && whatsapp_connected" /tmp/dashboard-prod.html && ((SUCCESS_COUNT++))
grep -q "dashboard-main" /tmp/dashboard-prod.html && ((SUCCESS_COUNT++))
grep -q "cleanupFirebaseFields" /tmp/dashboard-prod.html && ((SUCCESS_COUNT++))

echo ""
if [ $SUCCESS_COUNT -eq 5 ]; then
    echo "🎉 ÉXITO: Todos los cambios están en producción ($SUCCESS_COUNT/5)"
    echo ""
    echo "Si sigues viendo la versión antigua:"
    echo "1. Limpia el caché del navegador (Cmd+Shift+R o Ctrl+Shift+R)"
    echo "2. Prueba en modo incógnito"
    echo "3. Verifica en la consola del navegador (F12) que veas 'Version: 2.0.0'"
else
    echo "⚠️  ATENCIÓN: Algunos cambios no se detectaron ($SUCCESS_COUNT/5)"
    echo ""
    echo "Esto puede deberse a:"
    echo "1. Caché de Firebase Hosting (espera 5-10 minutos)"
    echo "2. Caché de CDN (espera hasta 1 hora)"
    echo ""
    echo "Para forzar actualización:"
    echo "  firebase deploy --only hosting --force"
fi

echo ""
echo "🔗 URLs para verificar manualmente:"
echo "   Dashboard: https://automater-e51cc.web.app/dashboard.html"
echo "   Firebase: https://console.firebase.google.com/project/automater-e51cc"

echo ""
echo "=================================================="

# Limpiar archivo temporal
rm /tmp/dashboard-prod.html
