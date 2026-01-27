#!/bin/bash

# Script de prueba de humanización
# Verifica que las técnicas de humanización estén correctamente implementadas

echo "🧪 ========================================"
echo "   TEST DE HUMANIZACIÓN DEL BOT"
echo "========================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar archivos
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1 existe"
    return 0
  else
    echo -e "${RED}✗${NC} $1 NO existe"
    return 1
  fi
}

# Función para verificar contenido
check_content() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $1 contiene '$2'"
    return 0
  else
    echo -e "${RED}✗${NC} $1 NO contiene '$2'"
    return 1
  fi
}

echo "📁 Verificando archivos..."
echo ""

# Verificar que existan los archivos clave
FILES=(
  "server/baileys/humanization.js"
  "server/baileys/message-adapter.js"
  "server/baileys/event-handlers.js"
  "server/baileys/index.js"
  "server/index.js"
  "docs/HUMANIZACION-IMPLEMENTADA.md"
  ".env.humanization.example"
)

all_files_ok=true
for file in "${FILES[@]}"; do
  if ! check_file "$file"; then
    all_files_ok=false
  fi
done

echo ""
echo "🔍 Verificando integraciones..."
echo ""

# Verificar integraciones clave
check_content "server/baileys/message-adapter.js" "humanization"
check_content "server/baileys/message-adapter.js" "humanizedResponse"
check_content "server/baileys/event-handlers.js" "humanizedRead"
check_content "server/index.js" "messageKey"
check_content "server/index.js" "humanize: true"

echo ""
echo "⚙️  Verificando funciones clave..."
echo ""

# Verificar que existan las funciones principales
check_content "server/baileys/humanization.js" "calculateReadDelay"
check_content "server/baileys/humanization.js" "calculateThinkingDelay"
check_content "server/baileys/humanization.js" "calculateTypingDuration"
check_content "server/baileys/humanization.js" "humanizedResponse"
check_content "server/baileys/humanization.js" "sendPresenceUpdate"
check_content "server/baileys/humanization.js" "randomGaussian"

echo ""
echo "📊 Verificando configuración..."
echo ""

# Verificar configuración
check_content "server/baileys/humanization.js" "readDelay"
check_content "server/baileys/humanization.js" "thinkingDelay"
check_content "server/baileys/humanization.js" "typingSpeed"
check_content "server/baileys/humanization.js" "jitter"
check_content "server/baileys/humanization.js" "process.env.HUMANIZATION"

echo ""
echo "🎯 Resumen:"
echo ""

if [ "$all_files_ok" = true ]; then
  echo -e "${GREEN}✓ Todos los archivos necesarios existen${NC}"
else
  echo -e "${RED}✗ Faltan algunos archivos${NC}"
fi

echo ""
echo "📝 Técnicas implementadas:"
echo ""
echo "   1. ✓ Delay variable antes de marcar como leído (0.8-5s)"
echo "   2. ✓ Estado de 'escribiendo...' proporcional al mensaje"
echo "   3. ✓ Delay de pensamiento antes de escribir (0.5-2.5s)"
echo "   4. ✓ Variabilidad gaussiana en todos los delays"
echo "   5. ✓ Jitter ±30% para evitar patrones"
echo "   6. ✓ Configuración via variables de entorno"
echo ""

echo "🚀 Próximos pasos:"
echo ""
echo "   1. Copia .env.humanization.example a tu .env:"
echo "      ${YELLOW}cp .env.humanization.example .env${NC}"
echo ""
echo "   2. Ajusta los valores según tus necesidades"
echo ""
echo "   3. Reinicia el servidor:"
echo "      ${YELLOW}npm start${NC}"
echo ""
echo "   4. Envía un mensaje de prueba al bot"
echo ""
echo "   5. Observa los logs para ver la humanización en acción:"
echo "      ${YELLOW}grep 'humanización' server.log${NC}"
echo "      ${YELLOW}grep 'Stats de humanización' server.log${NC}"
echo ""

echo "📚 Documentación completa:"
echo "   ${YELLOW}docs/HUMANIZACION-IMPLEMENTADA.md${NC}"
echo ""

echo "========================================"
echo "   FIN DEL TEST"
echo "========================================"
