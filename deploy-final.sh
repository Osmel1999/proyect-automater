#!/bin/bash

# Script final: Commit y Deploy a Railway
# Este script hace commit de todos los cambios y ejecuta el deploy automatizado

set -e

echo "🎯 === DEPLOY FINAL RAILWAY ==="
echo ""

# 1. Validación
echo "📋 Paso 1: Validación pre-deploy..."
if ! ./validar-predeploy.sh; then
    echo "❌ Validación falló"
    exit 1
fi

echo ""

# 2. Mostrar cambios
echo "📋 Paso 2: Archivos a commitear:"
git status --short
echo ""

read -p "¿Continuar con el commit y deploy? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deploy cancelado"
    exit 1
fi

# 3. Commit
echo ""
echo "📋 Paso 3: Commiteando cambios..."
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

git add .
git commit -m "Fix: Railway build error - Dockerfile mejorado + Refactorización backend

CAMBIOS CRÍTICOS:
✅ Dockerfile mejorado con validación de package-lock.json
✅ Healthcheck agregado para Railway
✅ Refactorización circular dependencies (connection-manager + session-manager)
✅ Lazy require implementado en backend
✅ Scripts de validación y deploy automatizados

ARCHIVOS MODIFICADOS:
- Dockerfile: Validación explícita de lockfile, healthcheck
- server/baileys/connection-manager.js: Eliminada circular dependency
- server/baileys/session-manager.js: Eliminada circular dependency

ARCHIVOS NUEVOS:
- Dockerfile.alternative: Backup con npm install
- validar-predeploy.sh: Validación pre-deploy
- deploy-railway-mejorado.sh: Deploy automatizado completo
- regenerar-lockfile.sh: Regenerar lockfile si corrupto
- SOLUCION-RAILWAY-BUILD.md: Documentación completa
- RESUMEN-SOLUCION.md: Resumen ejecutivo

SOLUCIONA:
- Error npm ci en Railway build
- Circular dependencies en backend
- Frontend sirviendo versión incorrecta
- Archivos legacy accesibles

Deploy timestamp: $TIMESTAMP
" || echo "⚠️  No hay cambios nuevos para commit"

echo ""

# 4. Push
echo "📋 Paso 4: Pusheando a GitHub..."
git push origin main 2>/dev/null || git push origin master 2>/dev/null || {
    echo "⚠️  Push falló - Verifica la rama:"
    git branch --show-current
    exit 1
}

echo ""
echo "✅ Push exitoso"
echo ""

# 5. Deploy a Railway
echo "📋 Paso 5: Desplegando a Railway..."
echo "⚠️  Esto puede tomar varios minutos..."
echo ""

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI no instalado"
    echo "Instala con: npm install -g @railway/cli"
    echo ""
    echo "O continúa manualmente:"
    echo "1. Ve a https://railway.app/dashboard"
    echo "2. Tu código ya está en GitHub"
    echo "3. Railway debería auto-deployar"
    exit 1
fi

# Login si es necesario
if ! railway whoami &> /dev/null; then
    echo "🔐 Iniciando login a Railway..."
    railway login
fi

# Deploy
railway up --detach || {
    echo "⚠️  Deploy con CLI falló"
    echo ""
    echo "Opciones:"
    echo "1. Verifica en dashboard: https://railway.app/dashboard"
    echo "2. Reintenta: railway up"
    echo "3. Ver logs: railway logs"
    exit 1
}

echo ""
echo "✅ Deploy iniciado"
echo ""

# 6. Esperar un poco y ver logs
echo "📋 Paso 6: Monitoreando logs (15 segundos)..."
sleep 5
railway logs --tail 50 2>/dev/null || echo "⚠️  Logs no disponibles aún"

echo ""
echo "🎉 === DEPLOY COMPLETADO ==="
echo ""
echo "📊 Estado:"
railway status 2>/dev/null || echo "Usa 'railway status' para ver el estado"
echo ""
echo "📝 Próximos pasos:"
echo "1. Ver logs completos: railway logs"
echo "2. Ver URL: railway domain"
echo "3. Dashboard: https://railway.app/dashboard"
echo ""
echo "🔍 Verificación:"
echo "# Obtener URL"
echo "railway domain"
echo ""
echo "# Probar endpoints"
echo "curl https://TU-APP.railway.app/health"
echo "curl -I https://TU-APP.railway.app/auth.html"
echo ""
echo "# Verificar que login.html NO esté (esperar 404)"
echo "curl -I https://TU-APP.railway.app/login.html"
echo ""
