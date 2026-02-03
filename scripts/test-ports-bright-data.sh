#!/bin/bash

# Script para probar diferentes puertos de Bright Data
# Basado en los puertos habilitados por defecto

PROXY_BASE="socks5://brd-customer-hl_e851436d-zone-whatsapp_bot-country-us:kpwm3gjtjv1l@brd.superproxy.io"

# Puertos habilitados según screenshot
PORTS=(22225 80 443 8080 8443 5678 1962 2000 4443 4433 4430 4444 1969)

echo "🔍 Probando puertos habilitados de Bright Data..."
echo ""

for PORT in "${PORTS[@]}"; do
  echo "📡 Probando puerto $PORT..."
  PROXY_URL="$PROXY_BASE:$PORT"
  
  # Probar conectividad con curl
  RESULT=$(curl -x "$PROXY_URL" -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://api.ipify.org/?format=json" 2>&1)
  
  if [ "$RESULT" = "200" ]; then
    echo "   ✅ Puerto $PORT: FUNCIONA"
    echo "   URL: $PROXY_URL"
    echo ""
  else
    echo "   ❌ Puerto $PORT: FALLO (HTTP $RESULT)"
  fi
done

echo ""
echo "🎯 Recomendación: Usa el primer puerto que funcionó"
