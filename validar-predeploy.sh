#!/bin/bash

# Script de validación pre-deploy para Railway
# Verifica que todos los archivos críticos estén presentes

echo "🔍 Validando archivos críticos para deploy..."

ERRORS=0

# Verificar package.json
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: package.json no encontrado"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ package.json OK"
fi

# Verificar package-lock.json
if [ ! -f "package-lock.json" ]; then
    echo "❌ ERROR: package-lock.json no encontrado"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ package-lock.json OK"
    # Verificar que no esté corrupto
    if ! grep -q "lockfileVersion" package-lock.json; then
        echo "⚠️  WARNING: package-lock.json parece corrupto"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Verificar Dockerfile
if [ ! -f "Dockerfile" ]; then
    echo "❌ ERROR: Dockerfile no encontrado"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Dockerfile OK"
fi

# Verificar server/index.js
if [ ! -f "server/index.js" ]; then
    echo "❌ ERROR: server/index.js no encontrado"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ server/index.js OK"
fi

# Verificar estructura de directorios críticos
if [ ! -d "server/baileys" ]; then
    echo "❌ ERROR: directorio server/baileys no encontrado"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ server/baileys OK"
fi

# Verificar que archivos legacy NO estén en la raíz
if [ -f "login.html" ]; then
    echo "⚠️  WARNING: login.html encontrado en raíz (debería estar en archive_legacy)"
fi

# Verificar que node_modules no esté commiteado
if [ -d "node_modules" ] && [ -z "$(git check-ignore node_modules 2>/dev/null)" ]; then
    echo "⚠️  WARNING: node_modules puede estar en git"
fi

# Mostrar tamaño del package-lock.json
if [ -f "package-lock.json" ]; then
    SIZE=$(du -h package-lock.json | cut -f1)
    echo "📦 Tamaño de package-lock.json: $SIZE"
fi

# Resultado final
echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ Validación exitosa - Listo para deploy"
    exit 0
else
    echo "❌ Validación falló con $ERRORS errores"
    exit 1
fi
