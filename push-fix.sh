#!/bin/bash

# 🎯 Script de Push Rápido para Resolver la Redirección
# Este script te guiará paso a paso para hacer push a GitHub/Railway

clear
echo "🎯 PUSH PARA RESOLVER REDIRECCIÓN A SELECT.HTML"
echo "================================================"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "auth.html" ]; then
    echo "❌ ERROR: No estás en el directorio correcto"
    echo "   Ejecuta: cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp"
    exit 1
fi

echo "✅ Directorio correcto verificado"
echo ""

# Mostrar commits pendientes
echo "📋 COMMITS PENDIENTES DE PUSH:"
echo "================================"
git log origin/main..HEAD --oneline
echo ""

# Preguntar qué método de autenticación usar
echo "🔐 SELECCIONA MÉTODO DE AUTENTICACIÓN:"
echo ""
echo "1) GitHub CLI (gh) - Recomendado"
echo "2) Token Personal de GitHub"
echo "3) SSH Key"
echo "4) Cancelar"
echo ""
read -p "Selecciona una opción (1-4): " auth_method

case $auth_method in
    1)
        echo ""
        echo "📦 Verificando GitHub CLI..."
        if ! command -v gh &> /dev/null; then
            echo "⚠️  GitHub CLI no está instalado"
            echo ""
            echo "Instalando GitHub CLI..."
            brew install gh
        fi
        
        echo "🔐 Autenticando con GitHub CLI..."
        gh auth login
        
        echo ""
        echo "🚀 Haciendo push..."
        git push origin main
        ;;
    
    2)
        echo ""
        echo "📝 PASOS PARA USAR TOKEN PERSONAL:"
        echo "1. Ve a: https://github.com/settings/tokens"
        echo "2. Click en 'Generate new token (classic)'"
        echo "3. Selecciona el scope 'repo'"
        echo "4. Copia el token generado"
        echo ""
        read -p "Pega tu token aquí: " github_token
        
        if [ -z "$github_token" ]; then
            echo "❌ Token vacío. Cancelando."
            exit 1
        fi
        
        echo "🔧 Configurando remote con token..."
        git remote set-url origin https://${github_token}@github.com/Osmel1999/proyect-automater.git
        
        echo "🚀 Haciendo push..."
        git push origin main
        
        # Restaurar URL sin token por seguridad
        git remote set-url origin https://github.com/Osmel1999/proyect-automater.git
        ;;
    
    3)
        echo ""
        echo "📝 PASOS PARA USAR SSH:"
        echo ""
        
        if [ ! -f "$HOME/.ssh/id_ed25519" ] && [ ! -f "$HOME/.ssh/id_rsa" ]; then
            echo "⚠️  No se encontró clave SSH"
            echo "¿Deseas generar una clave SSH ahora? (y/n)"
            read -r generate_ssh
            
            if [[ "$generate_ssh" =~ ^([yY][eE][sS]|[yY])$ ]]; then
                read -p "Ingresa tu email de GitHub: " github_email
                ssh-keygen -t ed25519 -C "$github_email"
                
                echo ""
                echo "📋 Copia esta clave pública y agrégala a GitHub:"
                echo "   Ir a: https://github.com/settings/ssh/new"
                echo ""
                cat ~/.ssh/id_ed25519.pub
                echo ""
                read -p "Presiona Enter cuando hayas agregado la clave a GitHub..."
            else
                echo "Cancelado."
                exit 0
            fi
        fi
        
        echo "🔧 Configurando remote con SSH..."
        git remote set-url origin git@github.com:Osmel1999/proyect-automater.git
        
        echo "🚀 Haciendo push..."
        git push origin main
        ;;
    
    4)
        echo "Cancelado."
        exit 0
        ;;
    
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

# Verificar si el push fue exitoso
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡PUSH EXITOSO!"
    echo ""
    echo "📊 PRÓXIMOS PASOS:"
    echo "1. Esperar 2-3 minutos para que Railway despliegue"
    echo "2. Verificar logs: railway logs --tail"
    echo "3. Probar en modo incógnito:"
    echo "   - Ir a: https://tu-app.railway.app/auth.html"
    echo "   - Hacer login"
    echo "   - Verificar que redirige a /select.html ✅"
    echo ""
    echo "4. Si funciona en incógnito pero NO en modo normal:"
    echo "   - Limpiar caché: Cmd+Shift+R"
    echo "   - O ejecutar en DevTools Console:"
    echo "     localStorage.clear(); sessionStorage.clear(); location.reload();"
    echo ""
    
    # Preguntar si quiere ver los logs de Railway
    echo "¿Deseas ver los logs de Railway ahora? (y/n)"
    read -r show_logs
    
    if [[ "$show_logs" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo ""
        echo "📊 Mostrando logs de Railway..."
        railway logs --tail
    fi
else
    echo ""
    echo "❌ ERROR AL HACER PUSH"
    echo ""
    echo "🔍 Posibles causas:"
    echo "- Autenticación fallida"
    echo "- Sin conexión a internet"
    echo "- Conflictos con origin/main"
    echo ""
    echo "💡 Soluciones:"
    echo "1. Verifica tu autenticación"
    echo "2. Intenta con otro método"
    echo "3. Usa GitHub Desktop como alternativa"
    echo "4. O haz push manualmente desde VS Code"
fi
