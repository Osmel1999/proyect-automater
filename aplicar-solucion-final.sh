#!/bin/bash

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo "=================================================="
echo "  🚀 SOLUCIÓN RAILWAY - APLICACIÓN AUTOMÁTICA"
echo "=================================================="
echo ""

cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Error: No se encontró package.json${NC}"
    echo "  Verifica que estás en el directorio correcto"
    exit 1
fi

echo -e "${BLUE}📍 Directorio:${NC} $(pwd)"
echo ""

# Verificar railway.toml
if [ ! -f "railway.toml" ]; then
    echo -e "${RED}✗ railway.toml no encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}✓ railway.toml encontrado${NC}"
echo ""

# Mostrar contenido
echo -e "${BLUE}📄 Contenido de railway.toml:${NC}"
cat railway.toml
echo ""
echo "=================================================="
echo ""

# Git status
echo -e "${BLUE}📊 Estado de Git:${NC}"
git status --short
echo ""

# Preguntar si continuar
echo -e "${YELLOW}¿Hacer commit y push de los cambios? (y/n)${NC}"
read -r response

if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Operación cancelada."
    exit 0
fi

# Commit y push
echo ""
echo -e "${BLUE}📤 Haciendo commit y push...${NC}"
git add railway.toml \
    SOLUCION-ROOT-DIRECTORY.md \
    SOLUCION-DEFINITIVA-RAILWAY.md \
    GUIA-COMPLETA-ROOT-DIRECTORY.md \
    aplicar-solucion-root-directory.sh \
    aplicar-solucion-final.sh

git commit -m "fix: configurar Railway correctamente con railway.toml

- Agregar railway.toml para forzar detección correcta
- Eliminar confusión de monorepo
- Forzar rebuild limpio
- Documentar soluciones completas"

git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Cambios pusheados exitosamente${NC}"
else
    echo ""
    echo -e "${RED}✗ Error al hacer push${NC}"
    exit 1
fi

echo ""
echo "=================================================="
echo "  📋 SIGUIENTES PASOS MANUALES:"
echo "=================================================="
echo ""
echo -e "${YELLOW}1. Eliminar caché de Railway:${NC}"
echo "   a) Ve a: https://railway.app/dashboard"
echo "   b) Selecciona tu proyecto/servicio"
echo "   c) Settings → 'Delete Service Cache' (botón rojo)"
echo "   d) Confirma la eliminación"
echo ""
echo -e "${YELLOW}2. Deploy forzado:${NC}"
echo "   railway up --force"
echo ""
echo -e "${YELLOW}3. Monitorear logs:${NC}"
echo "   railway logs -f"
echo ""
echo -e "${YELLOW}4. Buscar en los logs:${NC}"
echo "   ✅ 'Running build command: npm install'"
echo "   ✅ './package.json' (NO './kds-webapp/package.json')"
echo ""
echo "=================================================="
echo "  🧪 VERIFICACIÓN POST-DEPLOY:"
echo "=================================================="
echo ""
echo "Después del deploy exitoso, ejecuta:"
echo ""
echo "# 1. Verificar login.html (debe dar 404)"
echo "curl -I https://tu-dominio.railway.app/login.html"
echo ""
echo "# 2. Verificar auth.html (debe tener select.html)"
echo "curl https://tu-dominio.railway.app/auth.html | grep select.html"
echo ""
echo "# 3. Probar en navegador con hard refresh (Cmd+Shift+R)"
echo ""
echo "=================================================="
echo ""
echo -e "${GREEN}✓ Preparación completada${NC}"
echo ""
echo -e "${BLUE}¿Quieres ejecutar 'railway up --force' ahora? (y/n)${NC}"
read -r deploy_response

if [[ "$deploy_response" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}🚀 Ejecutando deploy forzado...${NC}"
    railway up --force
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Deploy iniciado${NC}"
        echo ""
        echo "Monitoreando logs..."
        railway logs -f
    else
        echo ""
        echo -e "${YELLOW}⚠️  El comando falló. Posibles razones:${NC}"
        echo "  1. Railway CLI no está instalado"
        echo "  2. No estás autenticado: railway login"
        echo "  3. No estás vinculado al proyecto: railway link"
        echo ""
        echo "Instala Railway CLI:"
        echo "  brew install railway"
        echo ""
        echo "O usa el dashboard web:"
        echo "  https://railway.app/dashboard"
    fi
else
    echo ""
    echo -e "${BLUE}OK, ejecuta manualmente cuando estés listo:${NC}"
    echo ""
    echo "  1. Delete Service Cache en Railway Dashboard"
    echo "  2. railway up --force"
    echo "  3. railway logs -f"
fi
