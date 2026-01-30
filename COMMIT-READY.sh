#!/bin/bash

echo "=========================================="
echo "  🚀 Preparando Commit de Migración"
echo "=========================================="
echo ""

# Verificar archivos nuevos
echo "📁 Verificando archivos CSS nuevos..."
ls -lh css/payment-success.css css/index.css css/legal.css 2>/dev/null && echo "✅ CSS OK" || echo "❌ CSS faltante"
echo ""

echo "📁 Verificando archivos JS nuevos..."
ls -lh js/payment-success.js js/onboarding-success.js 2>/dev/null && echo "✅ JS OK" || echo "❌ JS faltante"
echo ""

echo "📁 Verificando backups..."
ls -lh *-backup.html 2>/dev/null | wc -l | xargs -I {} echo "✅ {} backups encontrados"
echo ""

echo "�� Verificando documentación..."
ls -lh RESUMEN*.md MIGRACION*.md GIT-COMMIT*.md CHECKLIST*.md RESUMEN-EJECUTIVO.md 2>/dev/null | wc -l | xargs -I {} echo "✅ {} archivos de documentación"
echo ""

echo "=========================================="
echo "  📝 Git Status"
echo "=========================================="
git status --short
echo ""

echo "=========================================="
echo "  ✅ Archivos listos para commit"
echo "=========================================="
echo ""
echo "Comando sugerido:"
echo ""
echo 'git add css/payment-success.css css/index.css css/legal.css'
echo 'git add js/payment-success.js js/onboarding-success.js'
echo 'git add payment-success.html index.html landing.html'
echo 'git add privacy-policy.html terms.html onboarding-success.html'
echo 'git add *-backup.html'
echo 'git add RESUMEN*.md MIGRACION*.md GIT-COMMIT*.md CHECKLIST*.md RESUMEN-EJECUTIVO.md'
echo ''
echo 'git commit -m "feat: Migrar 6 archivos HTML restantes a arquitectura de 3 archivos

- Migrar payment-success.html con clase PaymentSuccess
- Migrar index.html (landing principal)
- Migrar landing.html reutilizando index.css
- Migrar privacy-policy.html y terms.html con legal.css compartido
- Completar migración de onboarding-success.html con Firebase loading
- Crear documentación completa de migración

BREAKING CHANGE: Archivos HTML ahora requieren CSS y JS externos

Archivos migrados:
✅ payment-success.html → css/payment-success.css + js/payment-success.js
✅ index.html → css/index.css
✅ landing.html → css/index.css (compartido)
✅ privacy-policy.html → css/legal.css
✅ terms.html → css/legal.css (compartido)
✅ onboarding-success.html → js/onboarding-success.js (completado)

Progreso total: 12/13 archivos (92.3%)
Best practices aplicadas: ✅
Documentación completa: ✅
Backups creados: ✅"'
echo ""
echo "=========================================="
echo "  🎉 ¡Listo para commit!"
echo "=========================================="
