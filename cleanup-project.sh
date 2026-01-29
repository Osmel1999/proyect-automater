#!/bin/bash

echo "🧹 Limpiando proyecto de archivos temporales y de desarrollo..."

# Crear carpeta para archivar documentación
mkdir -p docs-archive

# Archivos MD que queremos MANTENER en la raíz
KEEP_MD=(
    "README.md"
)

# Mover todos los demás MD a docs-archive
echo "📦 Archivando documentación temporal..."
for file in *.md; do
    if [[ -f "$file" ]]; then
        # Verificar si está en la lista de archivos a mantener
        should_keep=false
        for keep in "${KEEP_MD[@]}"; do
            if [[ "$file" == "$keep" ]]; then
                should_keep=true
                break
            fi
        done
        
        if [[ "$should_keep" == false ]]; then
            echo "  → $file"
            mv "$file" docs-archive/
        fi
    fi
done

# Eliminar scripts de test y verificación
echo ""
echo "🗑️  Eliminando scripts de desarrollo..."
rm -f test-*.sh
rm -f verify-*.sh
rm -f verificar-*.sh
rm -f validar-*.sh
rm -f diagnostico-*.sh
rm -f diagnose-*.sh
rm -f deploy-*.sh
rm -f aplicar-*.sh
rm -f cambiar-*.sh
rm -f check-*.sh
rm -f forzar-*.sh
rm -f fix-*.sh
rm -f push-*.sh
rm -f regenerar-*.sh
rm -f apply-*.sh
rm -f monitor-*.sh

# Eliminar archivos JS de demo/diagnóstico
echo ""
echo "🗑️  Eliminando archivos JS temporales..."
rm -f demo-natural-language.js
rm -f deploy-verification.js
rm -f diagnose-payment-issue.js
rm -f dual-config.js
rm -f facebook-config-legacy.js
rm -f monitor-legacy.sh

# Eliminar backups HTML
echo ""
echo "🗑️  Eliminando archivos backup..."
rm -f *.backup
rm -f *-OLD-BACKUP.html

# Eliminar archivos JS temporales en raíz
echo ""
echo "🗑️  Limpiando archivos JavaScript de debug..."
rm -f CODIGO-JAVASCRIPT-WEBHOOK.js

echo ""
echo "✅ Limpieza completada!"
echo ""
echo "📊 Resumen:"
echo "  - Documentación archivada en: docs-archive/"
echo "  - Scripts de desarrollo eliminados"
echo "  - Archivos temporales eliminados"
echo "  - README.md mantenido en la raíz"
echo ""
echo "💡 Revisa la carpeta docs-archive/ si necesitas recuperar algún documento"
