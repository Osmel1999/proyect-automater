#!/bin/bash
# Script de diagnóstico del Sistema Anti-Ban

echo "🔍 DIAGNÓSTICO DEL SISTEMA ANTI-BAN"
echo "==================================="
echo ""

echo "📊 1. Verificando logs recientes del servidor..."
echo "---"
railway logs -n 200 2>&1 | grep -E "Túnel|tunnel|TunnelManager|Request via|Request directo|WebSocket|/tunnel" | tail -20

echo ""
echo "📡 2. Verificando conexiones WebSocket activas..."
echo "---"
railway logs -n 100 2>&1 | grep -i "websocket" | tail -10

echo ""
echo "🔧 3. Verificando registros de túnel..."
echo "---"
railway logs -n 100 2>&1 | grep -E "registerTunnel|Tunnel registered|Túnel conectado|Túnel registrado" | tail -10

echo ""
echo "📤 4. Verificando requests HTTP..."
echo "---"
railway logs -n 100 2>&1 | grep -E "Request via túnel|Request directo Railway|🔧|📡" | tail -10

echo ""
echo "⚠️  5. Verificando errores..."
echo "---"
railway logs -n 100 2>&1 | grep -iE "error|fail|disconnect" | tail -10

echo ""
echo "✅ Diagnóstico completado"
