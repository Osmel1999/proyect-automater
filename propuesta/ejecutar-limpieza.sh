#!/bin/bash

# Script de Limpieza del Proyecto KDS-WebApp
# Fecha: 15 de enero de 2026
# Mueve archivos obsoletos a un archivo por seguridad

set -e  # Detener en caso de error

echo "🧹 Iniciando limpieza del proyecto..."
echo ""

# Crear carpeta de archivo
ARCHIVE_DIR="archive_20260115"
mkdir -p "$ARCHIVE_DIR"
echo "✅ Carpeta de archivo creada: $ARCHIVE_DIR"
echo ""

# Contador
MOVED=0

# Función para mover archivo
move_file() {
    if [ -f "$1" ]; then
        mv "$1" "$ARCHIVE_DIR/"
        echo "  ✓ Movido: $1"
        ((MOVED++))
    else
        echo "  ⚠ No existe: $1"
    fi
}

# 1. DOCUMENTACIÓN OBSOLETA
echo "📄 Moviendo documentación obsoleta..."
move_file "ANALISIS-SOLUCIONES-NO-OFICIALES.md"
move_file "ARQUITECTURA-DUAL.md"
move_file "CHECKLIST-PRUEBA-ONBOARDING.md"
move_file "CONCEPTO-FROM-TO-WHATSAPP.md"
move_file "CONFIGURACION-META-CHECKLIST-FINAL.md"
move_file "DEBUG-ONBOARDING-LEGACY.md"
move_file "ESTRATEGIA-ANTI-BAN-SAAS.md"
move_file "ESTRATEGIA-POST-SELECCION.md"
move_file "FLUJO-CLIENTE-COMPLETO.md"
move_file "FLUJO-ONBOARDING-CORREGIDO.md"
move_file "GUIA-API-TESTING-WHATSAPP.md"
move_file "GUIA-FACEBOOK-LOGIN-QUICKSTART.md"
move_file "GUIA-SISTEMA-DUAL.md"
move_file "IMPLEMENTACION-DUAL-COMPLETADA.md"
move_file "INDEX-DOCUMENTACION-DUAL.md"
move_file "INVESTIGACION-AUTHRESPONSE-NULL.md"
move_file "PLAN-ACCION-AUTHRESPONSE.md"
move_file "PLAN-DASHBOARD-CONVERSACIONES.md"
move_file "PLAN-MIGRACION-SAAS-DIRECTO.md"
move_file "PROBLEMA-APP-SECRET.md"
move_file "PROBLEMA-RESUELTO-CALLBACK.md"
move_file "PRUEBA-SISTEMA-DUAL.md"
move_file "QUICK-REF-API-TESTING.md"
move_file "RESUMEN-EJECUTIVO-ESTADO.md"
move_file "RESUMEN-SOLUCION-PRESELECCION.md"
move_file "SIGUIENTE-PRUEBA-LOGGING.md"
move_file "SISTEMA-DUAL-README.md"
move_file "SOLUCION-CUENTA-DESHABILITADA.md"
move_file "SOLUCION-ERROR-ONBOARDING.md"
move_file "SOLUCION-PORTFOLIO-PRESELECTION.md"
move_file "SOLUCION-SIGNEDRQUEST-FIX.md"
move_file "TESTING-VALIDACION-PORTFOLIO.md"
move_file "URLS-CORRECTAS-META.md"
move_file "VERIFICACION-PRE-FILL-PORTFOLIO.md"
echo ""

# 2. SCRIPTS OBSOLETOS
echo "📜 Moviendo scripts obsoletos..."
move_file "cleanup.sh"
move_file "diagnosticar-phone-number.sh"
move_file "diagnostico-dual.sh"
move_file "monitor-legacy.sh"
move_file "preview-cleanup.sh"
move_file "test-dual.sh"
move_file "test-validation-endpoint.sh"
move_file "test-whatsapp-api.sh"
move_file "verify-dual-config.sh"
echo ""

# 3. CONFIGURACIONES OBSOLETAS
echo "⚙️  Moviendo configuraciones obsoletas..."
move_file ".env.dual.example"
move_file ".env.n8n"
move_file ".env.railway"
move_file ".env.whatsapp.template"
move_file "dual-config.js"
move_file "facebook-config-legacy.js"
echo ""

# 4. HTML DE TESTING
echo "🌐 Moviendo HTML de testing..."
move_file "onboarding-2.html"
move_file "onboarding-debug.html"
move_file "onboarding-legacy-validation.html"
move_file "test-messaging.html"
move_file "test-preselection-variants.html"
echo ""

# 5. ARCHIVOS TEMPORALES
echo "🗑️  Eliminando archivos temporales..."
if [ -f ".cleanup-plan.txt" ]; then
    rm -f ".cleanup-plan.txt"
    echo "  ✓ Eliminado: .cleanup-plan.txt"
fi
echo ""

# 6. RESUMEN
echo "======================================"
echo "✅ LIMPIEZA COMPLETADA"
echo "======================================"
echo "📦 Archivos movidos: $MOVED"
echo "📁 Ubicación: $ARCHIVE_DIR/"
echo ""
echo "📋 Archivos MD restantes en raíz:"
ls -1 *.md 2>/dev/null | wc -l | xargs echo "   "
echo ""
echo "💡 Próximos pasos:"
echo "   1. Verificar que el proyecto funciona: npm start"
echo "   2. Si todo está bien, comprimir: tar -czf archive_20260115.tar.gz $ARCHIVE_DIR/"
echo "   3. Eliminar carpeta: rm -rf $ARCHIVE_DIR/"
echo "   4. Opcional: Eliminar backup antiguo: rm -rf backup_20260112_194608/"
echo ""
