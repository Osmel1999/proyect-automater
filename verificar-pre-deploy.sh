#!/bin/bash
# Script de verificación pre-deploy
# Verifica que todos los cambios estén listos antes de desplegar

echo "🔍 VERIFICACIÓN PRE-DEPLOY - KDS App"
echo "===================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASS=0
FAIL=0
WARN=0

# Función para verificar archivo existe
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} Archivo existe: $1"
        PASS=$((PASS+1))
        return 0
    else
        echo -e "${RED}❌${NC} Archivo NO existe: $1"
        FAIL=$((FAIL+1))
        return 1
    fi
}

# Función para verificar contenido en archivo
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $3"
        PASS=$((PASS+1))
        return 0
    else
        echo -e "${RED}❌${NC} $3"
        FAIL=$((FAIL+1))
        return 1
    fi
}

# Función para verificar que NO existe contenido
check_not_content() {
    if ! grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $3"
        PASS=$((PASS+1))
        return 0
    else
        echo -e "${YELLOW}⚠️${NC} $3"
        WARN=$((WARN+1))
        return 1
    fi
}

echo "📁 1. VERIFICANDO ESTRUCTURA DE ARCHIVOS"
echo "----------------------------------------"

# Verificar archivos principales
check_file "auth.html"
check_file "select.html"
check_file "dashboard.html"
check_file "kds.html"
check_file "whatsapp-connect.html"

# Verificar que onboarding.html NO existe (debe estar renombrado)
if [ ! -f "onboarding.html" ]; then
    echo -e "${GREEN}✅${NC} onboarding.html NO existe (correcto, renombrado a whatsapp-connect.html)"
    PASS=$((PASS+1))
else
    echo -e "${RED}❌${NC} onboarding.html EXISTE (debería estar renombrado)"
    FAIL=$((FAIL+1))
fi

# Verificar backend
check_file "server/index.js"
check_file "firebase.json"

echo ""
echo "🔧 2. VERIFICANDO REFERENCIAS EN BACKEND"
echo "----------------------------------------"

# Verificar que server/index.js tiene la referencia correcta
check_content "server/index.js" "whatsapp-connect.html" "server/index.js usa whatsapp-connect.html"

# Verificar que NO tiene referencias a onboarding-2.html
check_not_content "server/index.js" "onboarding-2.html" "server/index.js NO tiene onboarding-2.html"

echo ""
echo "🌐 3. VERIFICANDO REFERENCIAS EN FRONTEND"
echo "----------------------------------------"

# Verificar dashboard.html (puede usar /whatsapp-connect o /whatsapp-connect.html)
if grep -q "whatsapp-connect" "dashboard.html" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} dashboard.html usa whatsapp-connect"
    PASS=$((PASS+1))
else
    echo -e "${RED}❌${NC} dashboard.html usa whatsapp-connect"
    FAIL=$((FAIL+1))
fi

# kds.html NO necesita tener referencia a whatsapp-connect (es solo para ver pedidos)
echo -e "${GREEN}✅${NC} kds.html es solo para ver pedidos (no necesita whatsapp-connect)"
PASS=$((PASS+1))

# Verificar auth.html
check_content "auth.html" "select.html" "auth.html redirige a select.html"
check_content "auth.html" "createUserWithEmailAndPassword" "auth.html usa Firebase Auth (registro)"
check_content "auth.html" "signInWithEmailAndPassword" "auth.html usa Firebase Auth (login)"

# Verificar select.html
check_content "select.html" "kds.html" "select.html enlaza a kds.html"
check_content "select.html" "dashboard.html" "select.html enlaza a dashboard.html"

echo ""
echo "🔥 4. VERIFICANDO FIREBASE CONFIG"
echo "----------------------------------------"

# Verificar firebase.json
check_content "firebase.json" "whatsapp-connect.html" "firebase.json tiene rewrite a whatsapp-connect.html"

# Verificar que NO tiene rewrites a onboarding.html antiguo (si es que tenía)
# (esto es opcional, puede que nunca haya existido)

echo ""
echo "📦 5. VERIFICANDO ESTRUCTURA DE DATOS"
echo "----------------------------------------"

# Verificar que auth.html crea tenant
check_content "auth.html" "firebase.database().ref('tenants/' + tenantId)" "auth.html crea tenant en registro"

# Verificar que auth.html crea usuario
check_content "auth.html" "firebase.database().ref('users/' + userId)" "auth.html crea usuario en registro"

# Verificar que guarda tenantId en localStorage
check_content "auth.html" "localStorage.setItem('tenantId', tenantId)" "auth.html guarda tenantId en localStorage"

echo ""
echo "🔐 6. VERIFICANDO SEGURIDAD"
echo "----------------------------------------"

# Verificar que auth.html hashea el PIN
check_content "auth.html" "hashPin" "auth.html hashea el PIN"

# Verificar que auth.html valida password
check_content "auth.html" "password.length < 6" "auth.html valida longitud de password"

# Verificar que auth.html valida PIN
check_content "auth.html" "validatePin" "auth.html valida formato de PIN"

echo ""
echo "🧪 7. VERIFICANDO WHATSAPP-CONNECT"
echo "----------------------------------------"

# Verificar que whatsapp-connect.html NO tiene formularios de registro
check_not_content "whatsapp-connect.html" "registerForm" "whatsapp-connect.html NO tiene formulario de registro"

# Verificar que whatsapp-connect.html NO tiene Facebook Login
check_not_content "whatsapp-connect.html" "FB.login" "whatsapp-connect.html NO usa Facebook Login"
check_not_content "whatsapp-connect.html" "facebook-jssdk" "whatsapp-connect.html NO carga Facebook SDK"

# Verificar que whatsapp-connect.html usa QR
check_content "whatsapp-connect.html" "qr" "whatsapp-connect.html usa código QR"

echo ""
echo "📊 8. VERIFICANDO ARCHIVOS LEGACY"
echo "----------------------------------------"

# Verificar archivos que NO deberían existir
if [ ! -f "onboarding-2.html" ]; then
    echo -e "${GREEN}✅${NC} onboarding-2.html NO existe (correcto)"
    PASS=$((PASS+1))
else
    echo -e "${YELLOW}⚠️${NC} onboarding-2.html existe (se puede eliminar si no se usa)"
    WARN=$((WARN+1))
fi

# Verificar onboarding-success.html
if [ -f "onboarding-success.html" ]; then
    echo -e "${YELLOW}⚠️${NC} onboarding-success.html existe (solo para OAuth legacy)"
    WARN=$((WARN+1))
else
    echo -e "${GREEN}✅${NC} onboarding-success.html NO existe"
    PASS=$((PASS+1))
fi

# Verificar onboarding-OLD-BACKUP.html
if [ -f "onboarding-OLD-BACKUP.html" ]; then
    echo -e "${YELLOW}⚠️${NC} onboarding-OLD-BACKUP.html existe (se puede archivar)"
    WARN=$((WARN+1))
else
    echo -e "${GREEN}✅${NC} onboarding-OLD-BACKUP.html NO existe"
    PASS=$((PASS+1))
fi

echo ""
echo "🚀 9. VERIFICANDO GIT STATUS"
echo "----------------------------------------"

# Verificar que hay cambios para commitear
if git diff --quiet server/index.js; then
    echo -e "${YELLOW}⚠️${NC} No hay cambios en server/index.js (¿ya se hizo commit?)"
    WARN=$((WARN+1))
else
    echo -e "${GREEN}✅${NC} Hay cambios en server/index.js listos para commit"
    PASS=$((PASS+1))
fi

# Mostrar archivos modificados
echo ""
echo "Archivos modificados en Git:"
git status --short | grep -E "^\s*M|^\s*A|^\s*D" | while read line; do
    echo "   $line"
done

echo ""
echo "📝 10. VERIFICANDO DOCUMENTACIÓN"
echo "----------------------------------------"

check_file "ANALISIS-FLUJO-AUTENTICACION.md"
check_file "ANALISIS-SEGURIDAD-ONBOARDING-SUCCESS.md"
check_file "CHECKLIST-DEPLOY.md"
check_file "README-MIGRACION.md"

echo ""
echo "=================================="
echo "📊 RESUMEN"
echo "=================================="
echo ""
echo -e "${GREEN}✅ PASS:${NC} $PASS"
echo -e "${YELLOW}⚠️  WARN:${NC} $WARN"
echo -e "${RED}❌ FAIL:${NC} $FAIL"
echo ""

# Determinar estado general
if [ $FAIL -eq 0 ]; then
    if [ $WARN -eq 0 ]; then
        echo -e "${GREEN}✅ TODO OK - Listo para deploy${NC}"
        echo ""
        echo "Próximos pasos:"
        echo "1. git add server/index.js"
        echo "2. git commit -m 'fix: actualizar referencia onboarding-2 → whatsapp-connect'"
        echo "3. git push origin main"
        echo "4. firebase deploy --only hosting"
        exit 0
    else
        echo -e "${YELLOW}⚠️  OK CON WARNINGS - Se puede hacer deploy${NC}"
        echo ""
        echo "Revisar warnings antes de deploy (son opcionales)"
        echo ""
        echo "Próximos pasos:"
        echo "1. git add server/index.js"
        echo "2. git commit -m 'fix: actualizar referencia onboarding-2 → whatsapp-connect'"
        echo "3. git push origin main"
        echo "4. firebase deploy --only hosting"
        exit 0
    fi
else
    echo -e "${RED}❌ FALLOS ENCONTRADOS - NO hacer deploy todavía${NC}"
    echo ""
    echo "Corregir los errores marcados arriba antes de deploy"
    exit 1
fi
