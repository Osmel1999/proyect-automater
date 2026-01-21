#!/bin/bash

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 DEPLOY COMPLETO RAILWAY - CLI ONLY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp

# Paso 1: Verificar archivos
echo -e "${BLUE}📋 Paso 1: Verificando archivos...${NC}"
echo ""

if [ ! -f "railway.toml" ]; then
    echo -e "${RED}✗ railway.toml no encontrado${NC}"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ package.json no encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}✓ railway.toml encontrado${NC}"
echo -e "${GREEN}✓ package.json encontrado${NC}"
echo ""

# Paso 2: Git status
echo -e "${BLUE}📊 Paso 2: Estado de Git...${NC}"
echo ""
git status --short
echo ""

# Paso 3: Commit y push
echo -e "${YELLOW}¿Hacer commit y push de los cambios? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}📤 Haciendo commit y push...${NC}"
    
    git add railway.toml \
        SOLUCION-*.md \
        RESUMEN-*.md \
        GUIA-*.md \
        INDICE-*.md \
        aplicar-*.sh \
        deploy-cli-completo.sh
    
    git commit -m "fix: configurar Railway con railway.toml - deploy CLI completo

- Agregar railway.toml para forzar detección correcta
- Eliminar confusión de monorepo
- Scripts CLI para deploy completo
- Documentación completa de soluciones"
    
    git push origin main
    
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}✗ Error al hacer push${NC}"
        echo "Verifica tu conexión y permisos de Git"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✓ Cambios pusheados exitosamente${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Deploy cancelado. Haz commit manualmente primero.${NC}"
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔧 Paso 3: Verificando Railway CLI..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}✗ Railway CLI no está instalado${NC}"
    echo ""
    echo "Instalando Railway CLI..."
    
    # Detectar sistema operativo
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install railway
        else
            echo "Instalando con npm..."
            npm i -g @railway/cli
        fi
    else
        # Linux/otros
        npm i -g @railway/cli
    fi
    
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}✗ No se pudo instalar Railway CLI${NC}"
        echo ""
        echo "Instala manualmente:"
        echo "  brew install railway    (macOS con Homebrew)"
        echo "  npm i -g @railway/cli   (con npm)"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Railway CLI disponible${NC}"
echo ""

# Paso 4: Verificar login
echo -e "${BLUE}📋 Paso 4: Verificando autenticación...${NC}"
echo ""

railway whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  No estás autenticado en Railway${NC}"
    echo ""
    echo "Abriendo login en navegador..."
    railway login
    
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}✗ Error al autenticar${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Autenticado en Railway${NC}"
railway whoami
echo ""

# Paso 5: Verificar proyecto vinculado
echo -e "${BLUE}📋 Paso 5: Verificando proyecto vinculado...${NC}"
echo ""

railway status &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  No estás vinculado a un proyecto${NC}"
    echo ""
    echo "Listando proyectos disponibles..."
    railway list
    echo ""
    echo "Vinculando al proyecto..."
    railway link
    
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}✗ Error al vincular proyecto${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Proyecto vinculado${NC}"
railway status
echo ""

# Paso 6: Deploy con variables para forzar rebuild
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Paso 6: Deploy con rebuild forzado"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${CYAN}Estrategia: Agregar variable dummy para forzar rebuild completo${NC}"
echo ""

# Agregar variable temporal para forzar rebuild
TIMESTAMP=$(date +%s)
echo -e "${BLUE}Agregando variable REBUILD_TRIGGER=${TIMESTAMP}...${NC}"
railway variables set REBUILD_TRIGGER=$TIMESTAMP

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Variable agregada${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudo agregar variable, continuando...${NC}"
fi

echo ""
echo -e "${BLUE}Ejecutando deploy...${NC}"
echo ""

# Deploy
railway up --detach

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}✗ Error en el deploy${NC}"
    echo ""
    echo "Intenta manualmente:"
    echo "  railway up"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Deploy iniciado${NC}"
echo ""

# Paso 7: Monitorear logs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 Paso 7: Monitoreando deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${CYAN}Esperando a que el deployment inicie...${NC}"
sleep 5

echo ""
echo -e "${BLUE}Mostrando logs (Ctrl+C para salir):${NC}"
echo ""

railway logs

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ DEPLOY COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Obtener URL del servicio
echo -e "${BLUE}📍 Obteniendo URL del servicio...${NC}"
URL=$(railway status 2>/dev/null | grep -i "url" | awk '{print $2}')

if [ -z "$URL" ]; then
    echo -e "${YELLOW}⚠️  No se pudo obtener la URL automáticamente${NC}"
    echo "Ejecuta: railway status"
else
    echo -e "${GREEN}✓ URL:${NC} $URL"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🧪 VERIFICACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$URL" ]; then
    echo -e "${BLUE}Verificando archivos en producción...${NC}"
    echo ""
    
    # Verificar login.html (debe dar 404)
    echo -n "1. login.html (debe dar 404): "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/login.html")
    if [ "$STATUS" = "404" ]; then
        echo -e "${GREEN}✓ 404 (correcto)${NC}"
    else
        echo -e "${YELLOW}⚠️  $STATUS (esperaba 404)${NC}"
    fi
    
    # Verificar auth.html (debe existir)
    echo -n "2. auth.html (debe existir): "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/auth.html")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✓ 200 (correcto)${NC}"
    else
        echo -e "${YELLOW}⚠️  $STATUS (esperaba 200)${NC}"
    fi
    
    # Verificar select.html (debe existir)
    echo -n "3. select.html (debe existir): "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/select.html")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✓ 200 (correcto)${NC}"
    else
        echo -e "${YELLOW}⚠️  $STATUS (esperaba 200)${NC}"
    fi
    
    # Verificar que auth.html tenga la redirección correcta
    echo -n "4. auth.html contiene 'select.html': "
    if curl -s "$URL/auth.html" | grep -q "select.html"; then
        echo -e "${GREEN}✓ Sí (correcto)${NC}"
    else
        echo -e "${YELLOW}⚠️  No encontrado${NC}"
    fi
else
    echo -e "${YELLOW}Verifica manualmente:${NC}"
    echo ""
    echo "railway status    # Ver URL"
    echo ""
    echo "curl -I https://tu-url/login.html    # Debe dar 404"
    echo "curl -I https://tu-url/auth.html     # Debe dar 200"
    echo "curl -I https://tu-url/select.html   # Debe dar 200"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 COMANDOS ÚTILES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "railway logs          # Ver logs del deployment"
echo "railway logs -f       # Ver logs en tiempo real"
echo "railway status        # Estado del servicio y URL"
echo "railway open          # Abrir en navegador"
echo "railway variables     # Ver variables de entorno"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ PROCESO COMPLETADO${NC}"
echo ""
echo "🎯 Próximos pasos:"
echo "   1. Verifica en el navegador que todo funcione"
echo "   2. Prueba el flujo de login completo"
echo "   3. Verifica que login.html no sea accesible"
echo ""
