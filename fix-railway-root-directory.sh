#!/bin/bash

# 🔧 Fix: Railway está buscando en el directorio incorrecto

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 FIX: Configurar Root Directory en Railway"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "El problema:"
echo "  Railway está buscando en: /automater"
echo "  Debería buscar en: /automater/kds-webapp"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SOLUCIÓN 1: Configurar desde Railway Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Ve a: https://railway.app"
echo "2. Selecciona tu proyecto"
echo "3. Click en tu servicio"
echo "4. Ve a: Settings"
echo "5. Busca: 'Root Directory' o 'Source'"
echo "6. Configura: kds-webapp"
echo "7. Click 'Save' o 'Deploy'"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SOLUCIÓN 2: Usar railway.toml"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Crear railway.toml
cat > railway.toml << 'EOF'
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node server/index.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
EOF

if [ $? -eq 0 ]; then
    echo "✅ Creado railway.toml"
    cat railway.toml
    echo ""
else
    echo "❌ Error creando railway.toml"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SOLUCIÓN 3: Mover archivos al directorio padre"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Si las otras soluciones no funcionan:"
echo ""
echo "cd /Users/osmeldfarak/Documents/Proyectos/automater"
echo "cp kds-webapp/Dockerfile ."
echo "cp kds-webapp/railway.json ."
echo "railway up"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SOLUCIÓN 4: Re-vincular Railway desde kds-webapp"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp"
echo "railway unlink"
echo "railway link"
echo "railway up"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ RECOMENDACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Probar SOLUCIÓN 1 primero (Railway Dashboard)"
echo "Es la más rápida y no requiere cambios de código"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
