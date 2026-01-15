#!/bin/bash

# Script de limpieza del proyecto KDS
# Elimina archivos de documentación y scripts innecesarios
# Mantiene solo archivos esenciales para producción

echo "🧹 Iniciando limpieza del proyecto KDS..."
echo ""

# Crear directorio de backup por seguridad
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creando backup en: $BACKUP_DIR"

# ============================================
# ARCHIVOS .md A MANTENER (ESENCIALES)
# ============================================
KEEP_MD=(
    "README.md"
    "SOLUCION-CUENTA-DESHABILITADA.md"
    "PLAN-MIGRACION-SAAS-DIRECTO.md"
    "FLUJO-ONBOARDING-CORREGIDO.md"
    "FLUJO-CLIENTE-COMPLETO.md"
    "PLAN-DASHBOARD-CONVERSACIONES.md"
)

# ============================================
# SCRIPTS .sh A MANTENER (ESENCIALES)
# ============================================
KEEP_SH=(
    # Ninguno - todos los scripts son para desarrollo/deploy
)

# ============================================
# ELIMINAR ARCHIVOS .md INNECESARIOS
# ============================================
echo ""
echo "🗑️  Eliminando archivos .md innecesarios..."

MD_COUNT=0
for file in *.md; do
    if [[ -f "$file" ]]; then
        # Verificar si está en la lista de mantener
        SHOULD_KEEP=false
        for keep in "${KEEP_MD[@]}"; do
            if [[ "$file" == "$keep" ]]; then
                SHOULD_KEEP=true
                break
            fi
        done
        
        if [[ "$SHOULD_KEEP" == false ]]; then
            echo "  ❌ $file"
            cp "$file" "$BACKUP_DIR/"
            rm "$file"
            ((MD_COUNT++))
        else
            echo "  ✅ $file (mantenido)"
        fi
    fi
done

# ============================================
# ELIMINAR SCRIPTS .sh INNECESARIOS
# ============================================
echo ""
echo "🗑️  Eliminando scripts .sh innecesarios..."

SH_COUNT=0
for file in *.sh; do
    if [[ -f "$file" ]] && [[ "$file" != "cleanup.sh" ]]; then
        # Verificar si está en la lista de mantener
        SHOULD_KEEP=false
        for keep in "${KEEP_SH[@]}"; do
            if [[ "$file" == "$keep" ]]; then
                SHOULD_KEEP=true
                break
            fi
        done
        
        if [[ "$SHOULD_KEEP" == false ]]; then
            echo "  ❌ $file"
            cp "$file" "$BACKUP_DIR/"
            rm "$file"
            ((SH_COUNT++))
        else
            echo "  ✅ $file (mantenido)"
        fi
    fi
done

# ============================================
# ELIMINAR OTROS ARCHIVOS TEMPORALES
# ============================================
echo ""
echo "🗑️  Eliminando archivos temporales..."

TEMP_COUNT=0

# Archivos .txt de documentación
if [[ -f "ESTADO-VISUAL.txt" ]]; then
    echo "  ❌ ESTADO-VISUAL.txt"
    cp "ESTADO-VISUAL.txt" "$BACKUP_DIR/"
    rm "ESTADO-VISUAL.txt"
    ((TEMP_COUNT++))
fi

# Archivos de test
for file in test-*.js verificar-*.js; do
    if [[ -f "$file" ]]; then
        echo "  ❌ $file"
        cp "$file" "$BACKUP_DIR/"
        rm "$file"
        ((TEMP_COUNT++))
    fi
done

# ============================================
# RESUMEN
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ LIMPIEZA COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Archivos eliminados:"
echo "   • Archivos .md:  $MD_COUNT"
echo "   • Scripts .sh:   $SH_COUNT"
echo "   • Temporales:    $TEMP_COUNT"
echo "   • Total:         $((MD_COUNT + SH_COUNT + TEMP_COUNT))"
echo ""
echo "📦 Backup guardado en: $BACKUP_DIR/"
echo ""
echo "📁 Archivos mantenidos:"
for keep in "${KEEP_MD[@]}"; do
    if [[ -f "$keep" ]]; then
        echo "   ✅ $keep"
    fi
done
echo ""
echo "🎯 Proyecto limpio y listo para producción"
echo ""
