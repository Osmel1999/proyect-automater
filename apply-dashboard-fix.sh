#!/bin/bash

# Script para fix urgente del dashboard

echo "🔧 Aplicando fix al dashboard..."

# Backup del archivo original
cp dashboard.html dashboard.html.backup
echo "✅ Backup creado: dashboard.html.backup"

# Crear archivo temporal con el fix
cat > /tmp/menu_load_fix.txt << 'EOF'

        // 🔥 CARGAR EL MENÚ DESDE FIREBASE PRIMERO
        try {
          const menuSnapshot = await firebase.database().ref(`tenants/${tenantId}/menu/items`).once('value');
          const items = menuSnapshot.val() || {};
          menuItems = Object.values(items);
          console.log(`📋 Menú cargado: ${menuItems.length} items`);
        } catch (menuError) {
          console.warn('Error cargando menú:', menuError);
          menuItems = [];
        }
EOF

# Instrucciones
echo ""
echo "📝 INSTRUCCIONES MANUALES:"
echo ""
echo "1. Abrir dashboard.html en el editor"
echo "2. Ir a la línea 1500"
echo "3. Después de esta línea:"
echo "   document.getElementById('tenant-name').textContent = tenantData.restaurant?.name || 'Mi Restaurante';"
echo ""
echo "4. Agregar este código:"
cat /tmp/menu_load_fix.txt
echo ""
echo "5. Guardar el archivo"
echo "6. Ejecutar: firebase deploy --only hosting"
echo ""
echo "7. Hacer hard refresh en el navegador (Cmd+Shift+R)"
echo ""
echo "✅ El fix está en: /tmp/menu_load_fix.txt"
