#!/bin/bash

echo "=================================================="
echo "  SOLUCIÓN: Root Directory Incorrecto en Railway"
echo "=================================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar ubicación actual
CURRENT_DIR=$(pwd)
echo -e "${BLUE}📍 Ubicación actual:${NC} $CURRENT_DIR"
echo ""

# Detectar si estamos en automater o kds-webapp
if [[ "$CURRENT_DIR" == *"kds-webapp"* ]]; then
    echo -e "${YELLOW}⚠️  Estás en el directorio kds-webapp${NC}"
    echo "   Cambiando al directorio padre..."
    cd ..
    PARENT_DIR=$(pwd)
else
    PARENT_DIR="$CURRENT_DIR"
fi

echo -e "${GREEN}✓${NC} Directorio padre: $PARENT_DIR"
echo ""

# Verificar si railway.toml existe
if [ -f "$PARENT_DIR/railway.toml" ]; then
    echo -e "${GREEN}✓ railway.toml encontrado en el directorio raíz${NC}"
    echo ""
    echo "Contenido:"
    cat "$PARENT_DIR/railway.toml"
else
    echo -e "${RED}✗ railway.toml NO encontrado${NC}"
    echo "  Necesitas crear railway.toml en: $PARENT_DIR"
    exit 1
fi

echo ""
echo "=================================================="
echo "  PASOS A SEGUIR:"
echo "=================================================="
echo ""
echo -e "${YELLOW}1. COMMIT Y PUSH del railway.toml:${NC}"
echo "   cd $PARENT_DIR"
echo "   git add railway.toml"
echo "   git commit -m 'fix: configurar root directory para Railway'"
echo "   git push origin main"
echo ""
echo -e "${YELLOW}2. DEPLOY desde Railway:${NC}"
echo "   cd $PARENT_DIR/kds-webapp"
echo "   railway up"
echo ""
echo -e "${YELLOW}3. VERIFICAR en Railway Dashboard:${NC}"
echo "   a) Ve a: https://railway.app/dashboard"
echo "   b) Selecciona tu proyecto/servicio"
echo "   c) Ve a Deployments → último deploy"
echo "   d) Verifica que el log muestre:"
echo "      ./package.json (NO ./kds-webapp/package.json)"
echo ""
echo -e "${YELLOW}4. ALTERNATIVA (si railway.toml no funciona):${NC}"
echo "   a) Ve a Railway Dashboard"
echo "   b) Settings → Service Settings"
echo "   c) Busca 'Root Directory' o 'Source Directory'"
echo "   d) Configura: kds-webapp"
echo "   e) Guarda y haz nuevo deploy"
echo ""
echo "=================================================="
echo "  VERIFICACIÓN POST-DEPLOY:"
echo "=================================================="
echo ""
echo "Una vez que el deploy sea exitoso, verifica:"
echo ""
echo "1. Login.html debe retornar 404:"
echo "   curl -I https://tu-dominio.railway.app/login.html"
echo ""
echo "2. Auth.html debe tener la versión nueva:"
echo "   curl https://tu-dominio.railway.app/auth.html | grep select.html"
echo ""
echo "3. Prueba el flujo de login completo en el navegador"
echo ""
echo -e "${GREEN}✓ Listo para aplicar la solución${NC}"
echo ""
echo "¿Quieres hacer el commit y push ahora? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Haciendo commit y push..."
    cd "$PARENT_DIR"
    git add railway.toml
    git add kds-webapp/SOLUCION-ROOT-DIRECTORY.md
    git commit -m "fix: configurar root directory kds-webapp para Railway"
    git push origin main
    
    echo ""
    echo -e "${GREEN}✓ Cambios enviados a GitHub${NC}"
    echo ""
    echo "Ahora ve a Railway y verifica que el deploy automático use el directorio correcto."
    echo "O ejecuta manualmente:"
    echo "  cd kds-webapp && railway up"
else
    echo ""
    echo "OK, puedes hacer el commit manualmente cuando estés listo."
fi
