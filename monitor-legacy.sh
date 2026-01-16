#!/bin/bash

echo "🔍 MONITOREANDO ONBOARDING LEGACY EN TIEMPO REAL"
echo "================================================"
echo ""
echo "Presiona Ctrl+C para detener"
echo ""
echo "Esperando callback de Meta..."
echo ""

railway logs --tail 200 | grep --line-buffered -E "callback|CALLBACK|LEGACY|error|Error|ERROR|oauth|OAuth" | while read line; do
    echo "[$(date '+%H:%M:%S')] $line"
done
