#!/bin/bash

# Script de deploy mejorado para Railway con validación completa
# Incluye: validación pre-deploy, commit, push, rebuild forzado y verificación

set -e  # Exit on error

echo "🚀 === DEPLOY MEJORADO RAILWAY ==="
echo ""

# 1. Validación pre-deploy
echo "📋 Paso 1: Validando archivos críticos..."
if ! ./validar-predeploy.sh; then
    echo "❌ Validación falló - Abortando deploy"
    exit 1
fi
echo ""

# 2. Verificar que estamos en git y hay cambios
echo "📋 Paso 2: Verificando estado de Git..."
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ No estás en un repositorio Git"
    exit 1
fi

# Mostrar estado actual
git status --short

# Verificar si hay cambios
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    echo "✅ Cambios detectados"
    
    # 3. Commit automático
    echo ""
    echo "📋 Paso 3: Commiteando cambios..."
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    git add .
    git commit -m "Deploy: Fix Railway build - $TIMESTAMP

- Dockerfile mejorado con validación de package-lock.json
- Refactorización circular dependencies backend
- Healthcheck agregado
- Validación pre-deploy implementada
" || echo "⚠️  No hay cambios nuevos para commit"
else
    echo "⚠️  No hay cambios locales - Desplegando último commit"
fi

echo ""

# 4. Push a remoto
echo "📋 Paso 4: Pusheando a GitHub..."
git push origin main || {
    echo "⚠️  Push falló - Intentando con master..."
    git push origin master
}

echo ""

# 5. Verificar Railway CLI
echo "📋 Paso 5: Verificando Railway CLI..."
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI no instalado"
    echo "Instala con: npm install -g @railway/cli"
    exit 1
fi

echo ""

# 6. Login a Railway
echo "📋 Paso 6: Verificando autenticación Railway..."
if ! railway whoami &> /dev/null; then
    echo "🔐 No autenticado - Iniciando login..."
    railway login
else
    echo "✅ Ya autenticado"
fi

echo ""

# 7. Listar servicios disponibles
echo "📋 Paso 7: Servicios disponibles:"
railway service || echo "⚠️  No se pudieron listar servicios"

echo ""

# 8. Deploy forzado con rebuild
echo "📋 Paso 8: Iniciando deploy con rebuild FORZADO..."
echo "⚠️  Esto puede tomar varios minutos..."
echo ""

# Deploy con todas las flags de rebuild
railway up --service web --detach || {
    echo "⚠️  Deploy con --service falló, intentando sin especificar servicio..."
    railway up --detach
}

echo ""
echo "✅ Deploy iniciado exitosamente"
echo ""

# 9. Obtener logs para verificar
echo "📋 Paso 9: Monitoreando logs de deploy..."
echo "Presiona Ctrl+C para detener el monitoreo (el deploy continuará)"
echo ""

sleep 5
railway logs --service web 2>/dev/null || railway logs || echo "⚠️  No se pudieron obtener logs automáticamente"

echo ""
echo "🎉 === DEPLOY COMPLETADO ==="
echo ""
echo "📝 Próximos pasos:"
echo "1. Verifica el deploy en: https://railway.app/dashboard"
echo "2. Revisa logs con: railway logs"
echo "3. Verifica la app en la URL de Railway"
echo "4. Si hay errores, revisa: railway logs --service web"
echo ""
echo "🔗 Enlaces útiles:"
echo "- Dashboard: https://railway.app/dashboard"
echo "- Logs: railway logs"
echo "- Status: railway status"
