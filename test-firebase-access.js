// Script de prueba para verificar acceso a Firebase
// Ejecutar en la consola del navegador en dashboard.html

async function testFirebaseAccess() {
  console.log('🧪 Testing Firebase access...');
  
  const tenantId = localStorage.getItem('currentTenantId');
  console.log('Tenant ID:', tenantId);
  
  if (!tenantId) {
    console.error('❌ No tenant ID found');
    return;
  }
  
  try {
    // Test 1: Leer estructura del tenant
    console.log('\n📋 Test 1: Leer estructura del tenant');
    const tenantSnapshot = await firebase.database()
      .ref(`tenants/${tenantId}`)
      .once('value');
    
    const tenantData = tenantSnapshot.val();
    console.log('✅ Tenant data:', tenantData);
    console.log('Keys:', Object.keys(tenantData || {}));
    
    // Test 2: Leer pedidos
    console.log('\n📦 Test 2: Leer todos los pedidos');
    const allPedidosSnapshot = await firebase.database()
      .ref(`tenants/${tenantId}/pedidos`)
      .once('value');
    
    const allPedidos = allPedidosSnapshot.val() || {};
    console.log('✅ Todos los pedidos:', Object.keys(allPedidos).length, 'pedidos');
    console.log('Pedidos:', allPedidos);
    
    // Test 3: Leer pedidos de hoy
    console.log('\n📅 Test 3: Leer pedidos de hoy');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    console.log('Today timestamp:', todayTimestamp);
    console.log('Today date:', today);
    
    const todayPedidosSnapshot = await firebase.database()
      .ref(`tenants/${tenantId}/pedidos`)
      .orderByChild('timestamp')
      .startAt(todayTimestamp)
      .once('value');
    
    const todayPedidos = todayPedidosSnapshot.val() || {};
    const todayPedidosList = Object.values(todayPedidos);
    
    console.log('✅ Pedidos de hoy:', todayPedidosList.length);
    console.log('Pedidos:', todayPedidos);
    
    // Mostrar detalles de cada pedido
    todayPedidosList.forEach((pedido, i) => {
      console.log(`\nPedido ${i + 1}:`, {
        id: pedido.id,
        timestamp: pedido.timestamp,
        fecha: new Date(pedido.timestamp),
        total: pedido.total,
        estado: pedido.estado
      });
    });
    
    // Test 4: Calcular ventas
    console.log('\n💰 Test 4: Calcular ventas de hoy');
    const salesTotal = todayPedidosList.reduce((sum, order) => sum + (order.total || 0), 0);
    console.log('Total ventas:', salesTotal);
    console.log('Formateado:', '$' + salesTotal.toLocaleString('es-CO'));
    
    console.log('\n✅ Todos los tests completados exitosamente');
    
    return {
      tenantId,
      totalPedidos: Object.keys(allPedidos).length,
      pedidosHoy: todayPedidosList.length,
      ventasHoy: salesTotal
    };
    
  } catch (error) {
    console.error('❌ Error en tests:', error);
    throw error;
  }
}

// Ejecutar automáticamente
testFirebaseAccess().then(result => {
  console.log('\n📊 Resultado final:', result);
}).catch(err => {
  console.error('❌ Test failed:', err);
});
