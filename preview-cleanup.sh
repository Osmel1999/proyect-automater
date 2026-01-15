#!/bin/bash

echo "🔍 PREVIEW DE LIMPIEZA - No se eliminará nada aún"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Archivos a mantener
KEEP_MD=(
    "README.md"
    "SOLUCION-CUENTA-DESHABILITADA.md"
    "PLAN-MIGRACION-SAAS-DIRECTO.md"
    "FLUJO-ONBOARDING-CORREGIDO.md"
    "FLUJO-CLIENTE-COMPLETO.md"
    "PLAN-DASHBOARD-CONVERSACIONES.md"
)

echo ""
echo "✅ ARCHIVOS QUE SE MANTENDRÁN:"
echo ""
echo "📄 Documentación esencial:"
for keep in "${KEEP_MD[@]}"; do
    if [[ -f "$keep" ]]; then
        echo "   ✅ $keep"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🗑️  ARCHIVOS QUE SE ELIMINARÁN:"
echo ""

MD_COUNT=0
SH_COUNT=0
TEMP_COUNT=0

echo "📝 Archivos .md de documentación temporal:"
for file in *.md; do
    if [[ -f "$file" ]]; then
        SHOULD_KEEP=false
        for keep in "${KEEP_MD[@]}"; do
            if [[ "$file" == "$keep" ]]; then
                SHOULD_KEEP=true
                break
            fi
        done
        
        if [[ "$SHOULD_KEEP" == false ]]; then
            echo "   ❌ $file"
            ((MD_COUNT++))
        fi
    fi
done

echo ""
echo "🔧 Scripts de desarrollo/deploy:"
for file in *.sh; do
    if [[ -f "$file" ]] && [[ "$file" != "cleanup.sh" ]] && [[ "$file" != "preview-cleanup.sh" ]]; then
        echo "   ❌ $file"
        ((SH_COUNT++))
    fi
done

echo ""
echo "🧪 Archivos de testing:"
for file in test-*.js verificar-*.js; do
    if [[ -f "$file" ]]; then
        echo "   ❌ $file"
        ((TEMP_COUNT++))
    fi
done

if [[ -f "ESTADO-VISUAL.txt" ]]; then
    echo "   ❌ ESTADO-VISUAL.txt"
    ((TEMP_COUNT++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 RESUMEN:"
echo "   • Archivos .md a eliminar:  $MD_COUNT"
echo "   • Scripts .sh a eliminar:   $SH_COUNT"
echo "   • Archivos temp a eliminar: $TEMP_COUNT"
echo "   • TOTAL A ELIMINAR:         $((MD_COUNT + SH_COUNT + TEMP_COUNT))"
echo ""
echo "💾 Se creará un backup automático antes de eliminar"
echo ""
echo "Para ejecutar la limpieza, ejecuta: ./cleanup.sh"
echo ""
