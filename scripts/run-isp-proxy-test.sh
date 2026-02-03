#!/bin/bash

# 🧪 Script para ejecutar prueba de proxy ISP
# Este script carga las variables de entorno y ejecuta el test

echo "🔧 Configurando variables de entorno..."

# Cargar credenciales del proxy ISP
export PROXY_TYPE=isp
export ISP_PROXY_HOST=brd.superproxy.io
export ISP_PROXY_PORT=33335
export ISP_PROXY_USERNAME="brd-customer-hl_e851436d-zone-isp_proxy1"
export ISP_PROXY_PASSWORD="bcej6jmzlv66"

# Construir la URL del proxy
export PROXY_LIST="http://${ISP_PROXY_USERNAME}:${ISP_PROXY_PASSWORD}@${ISP_PROXY_HOST}:${ISP_PROXY_PORT}"

echo "✅ Variables configuradas"
echo ""
echo "📡 Proxy: $ISP_PROXY_HOST:$ISP_PROXY_PORT"
echo "🌎 Tipo: ISP Proxy (Residential Static IP)"
echo ""
echo "🚀 Ejecutando test..."
echo ""

# Ejecutar el test
node scripts/test-isp-proxy.js
