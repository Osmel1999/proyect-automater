#!/bin/bash

echo "🔍 Verificando deploy del dashboard..."
echo ""

# Verificar que el archivo local tiene la versión correcta
if grep -q "Version: 2.0.0" dashboard.html; then
    echo "✅ Versión 2.0.0 encontrada en archivo local"
else
    echo "❌ Versión 2.0.0 NO encontrada en archivo local"
fi

# Verificar que el código de carga del menú existe
if grep -q "CARGAR EL MENÚ DESDE FIREBASE PRIMERO" dashboard.html; then
    echo "✅ Código de carga del menú presente"
else
    echo "❌ Código de carga del menú NO encontrado"
fi

# Verificar que el mensaje de progreso está correcto
if grep -q "'Completar configuración'" dashboard.html; then
    echo "✅ Mensaje 'Completar configuración' presente"
else
    echo "❌ Mensaje 'Completar configuración' NO encontrado"
fi

# Verificar el nuevo dashboard
if grep -q "dashboard-main" dashboard.html; then
    echo "✅ Nuevo dashboard HTML presente"
else
    echo "❌ Nuevo dashboard HTML NO encontrado"
fi

echo ""
echo "📋 Resumen:"
echo "- Hosting URL: https://kds-app-7f1d3.web.app"
echo "- Versión: 2.0.0"
echo "- Fecha: $(date)"
echo ""
echo "🚨 RECUERDA: Debes hacer HARD REFRESH en el navegador:"
echo "   Mac: Cmd + Shift + R"
echo "   Windows: Ctrl + Shift + R"
echo ""
echo "🔗 Abre el dashboard: https://kds-app-7f1d3.web.app/dashboard?tenant=tu_tenant_id"
