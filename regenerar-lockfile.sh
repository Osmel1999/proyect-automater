#!/bin/bash

# Script para regenerar package-lock.json limpiamente
# Usa esto si sospechas que el lockfile está corrupto

echo "🔄 Regenerando package-lock.json..."
echo ""

# Backup del lockfile actual
if [ -f "package-lock.json" ]; then
    cp package-lock.json package-lock.json.backup
    echo "✅ Backup creado: package-lock.json.backup"
fi

# Limpiar cache de npm
echo "🧹 Limpiando cache de npm..."
npm cache clean --force

# Eliminar node_modules y lockfile
echo "🗑️  Eliminando node_modules y package-lock.json..."
rm -rf node_modules
rm -f package-lock.json

# Regenerar con npm install (crea lockfile automáticamente)
echo "📦 Instalando dependencias y regenerando lockfile..."
npm install

echo ""
echo "✅ package-lock.json regenerado"
echo ""

# Verificar integridad
echo "🔍 Verificando integridad..."
if npm ls >/dev/null 2>&1; then
    echo "✅ Todas las dependencias están correctamente instaladas"
else
    echo "⚠️  Hay problemas con las dependencias - Revisa con: npm ls"
fi

echo ""
echo "📊 Estadísticas:"
echo "- Tamaño: $(du -h package-lock.json | cut -f1)"
echo "- Líneas: $(wc -l < package-lock.json)"

echo ""
echo "🎉 Regeneración completada"
echo ""
echo "📝 Próximos pasos:"
echo "1. Verifica que la app funcione localmente: npm start"
echo "2. Si todo está bien, commitea el nuevo lockfile:"
echo "   git add package-lock.json"
echo "   git commit -m 'Regenerar package-lock.json'"
echo "3. Deploy a Railway: ./deploy-railway-mejorado.sh"
