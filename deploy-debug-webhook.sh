#!/bin/bash

# Script para desplegar cambios de debug del webhook

echo "🚀 Desplegando cambios de debug para webhook de Wompi"
echo ""

# Mostrar archivos modificados
echo "📝 Archivos modificados:"
git status --short

echo ""
echo "🔍 Agregando archivos al commit..."
git add server/routes/payments.js
git add server/payments/adapters/wompi-adapter.js
git add PLAN-DEBUG-PAYMENT-LINK-ID.md
git add RESPUESTA-CAMBIOS-RECIENTES.md
git add DIAGNOSTICO-ERROR-WEBHOOK.md

echo ""
echo "💾 Creando commit..."
git commit -m "feat: add comprehensive webhook debugging for payment_link_id troubleshooting

- Add detailed logging in webhook handler to capture full transaction object
- Log all available fields in transaction including payment_link_id
- Add debug logging in Wompi adapter to trace payment_link_id extraction
- Document debugging plan and troubleshooting steps
- Clarify that recent changes are for debugging, not fixing the issue yet

The actual fix will be implemented after analyzing the webhook logs."

echo ""
echo "📤 Pusheando a Railway..."
git push origin main

echo ""
echo "✅ Cambios desplegados!"
echo ""
echo "⏳ Espera 2-3 minutos a que Railway despliegue"
echo ""
echo "🧪 Luego sigue estos pasos:"
echo "1. Genera un nuevo link de pago a través de tu app"
echo "2. Haz un pago de prueba"
echo "3. Revisa los logs de Railway"
echo "4. Busca la sección: 🔍 [DEBUG CRÍTICO] Datos de la transacción"
echo "5. Comparte esos logs para continuar con la solución"
echo ""
