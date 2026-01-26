#!/bin/bash

# Script para ejecutar pruebas de FASE 4
# Inicia el servidor si no está corriendo y ejecuta las pruebas

cd "$(dirname "$0")/.."

echo "🔍 Verificando si el servidor está corriendo..."

# Verificar si el servidor ya está corriendo
if curl -s http://localhost:3000/api/payments/health > /dev/null 2>&1; then
    echo "✅ Servidor ya está corriendo"
else
    echo "🚀 Iniciando servidor..."
    node server/index.js > server.log 2>&1 &
    SERVER_PID=$!
    echo "📝 PID del servidor: $SERVER_PID"
    
    # Esperar a que el servidor esté listo
    echo "⏳ Esperando a que el servidor se inicialice..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/api/payments/health > /dev/null 2>&1; then
            echo "✅ Servidor listo!"
            break
        fi
        echo "   Intento $i/30..."
        sleep 1
    done
    
    # Verificar si el servidor respondió
    if ! curl -s http://localhost:3000/api/payments/health > /dev/null 2>&1; then
        echo "❌ Error: El servidor no respondió después de 30 segundos"
        echo "📋 Últimas líneas del log:"
        tail -20 server.log
        exit 1
    fi
fi

echo ""
echo "🧪 Ejecutando pruebas de FASE 4..."
echo "================================================"
echo ""

node scripts/test-payments-fase4.js

TEST_RESULT=$?

echo ""
echo "================================================"
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ Pruebas completadas exitosamente"
else
    echo "❌ Las pruebas encontraron errores"
fi

exit $TEST_RESULT
