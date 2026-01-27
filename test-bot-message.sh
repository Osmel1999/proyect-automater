#!/bin/bash

# Script para probar el bot enviando un mensaje de prueba

# Configuración
TENANT_ID="prueba-tenant"
FROM="5493516666666"  # Número de teléfono de prueba
MESSAGE="hola"

echo "📱 Probando bot con:"
echo "   Tenant: $TENANT_ID"
echo "   From: $FROM"
echo "   Mensaje: $MESSAGE"
echo ""

# Hacer request a la API de prueba
curl -X POST http://localhost:3000/api/baileys/test-message \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"from\": \"$FROM\",
    \"message\": \"$MESSAGE\"
  }"

echo ""
echo "✅ Mensaje de prueba enviado"
