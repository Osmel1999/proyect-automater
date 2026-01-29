# 🔍 DEBUG: Pedidos con Tarjeta No Aparecen en KDS

## Problema Reportado
Los pedidos pagados con tarjeta (después de la aprobación de Wompi) no aparecen en el KDS, aunque el flujo de pago se complete exitosamente.

## Flujo Actual Correcto (Código)

### 1. **Creación del Pedido con Tarjeta** (`bot-logic.js`)
```javascript
// Se crea pedido temporal en /orders/{orderId}
const pedidoTemporal = {
  id: numeroHex,
  tenantId: sesion.tenantId,
  cliente: sesion.contacto || `Cliente ${sesion.telefono}`,
  telefono: sesion.telefono,
  telefonoContacto: sesion.telefonoContacto,
  direccion: sesion.direccion,
  items: Object.values(itemsAgrupados),
  total: total,
  estado: 'awaiting_payment',
  paymentStatus: 'PENDING',
  metodoPago: 'tarjeta',
};

await firebaseService.database.ref(`orders/${orderId}`).set(pedidoTemporal);
```

### 2. **Webhook de Wompi** (`payment-service.js`)
```javascript
// Cuando llega evento APPROVED
if (event.status === 'APPROVED') {
  await this._confirmPayment(transaction);
  // Dentro de _confirmPayment:
  await this._createOrderInKDS(transaction);
  await this._notifyCustomer(transaction, 'PAYMENT_CONFIRMED');
}
```

### 3. **Creación en KDS** (`payment-service.js` - `_createOrderInKDS`)
```javascript
// 🔥 RUTA CORRECTA
const pedidoRef = this.db.ref(`tenants/${transaction.restaurantId}/pedidos`);
const pedidoSnapshot = await pedidoRef.push(kdsOrder);

// kdsOrder tiene el formato:
{
  id: numeroHex,
  tenantId: restaurantId,
  cliente: ...,
  telefono: ...,
  telefonoContacto: ...,
  direccion: ...,
  items: [...],
  total: amount,
  estado: 'pendiente',
  timestamp: Date.now(),
  fecha: new Date().toISOString(),
  fuente: 'whatsapp',
  restaurante: restaurantName,
  paymentStatus: 'PAID',
  metodoPago: 'tarjeta',
}
```

### 4. **KDS Escuchando** (`app.js`)
```javascript
// 🔥 MISMA RUTA
const ordersRef = window.db.ref(`tenants/${currentTenantId}/pedidos`);
ordersRef.on('value', (snapshot) => {
  const orders = snapshot.val() || {};
  renderOrders(orders);
});
```

## ✅ Verificaciones de Código

### ✓ Ruta de Firebase Coincide
- **Backend guarda en**: `tenants/${restaurantId}/pedidos`
- **KDS escucha en**: `tenants/${currentTenantId}/pedidos`
- **Estado**: ✅ CORRECTO

### ✓ Método de Guardado Correcto
- **Backend usa**: `.push()` (genera key automática)
- **KDS espera**: Objeto con keys automáticas
- **Estado**: ✅ CORRECTO

### ✓ Estructura del Objeto
- **Backend crea**: Objeto con campos: id, tenantId, cliente, items, total, estado, etc.
- **KDS espera**: Mismo formato que pedidos efectivo
- **Estado**: ✅ CORRECTO

### ✓ Estado Inicial
- **Backend setea**: `estado: 'pendiente'`
- **KDS filtra por**: `estado === 'pendiente'` para columna pendientes
- **Estado**: ✅ CORRECTO

## 🔍 Posibles Causas del Problema

### 1. **Webhook No Está Llegando**
- Verificar que Wompi esté enviando webhooks a la URL correcta
- Revisar logs del servidor para ver si el webhook llega
- Verificar que el evento sea `APPROVED`

### 2. **Error en `_createOrderInKDS` No Manejado**
- Posible error al obtener datos del pedido temporal
- Posible error al obtener datos del tenant
- Error de permisos en Firebase

### 3. **Pedido Temporal No Existe**
- El pedido en `/orders/{orderId}` fue eliminado antes del webhook
- El orderId no coincide entre creación y webhook

### 4. **RestaurantId Incorrecto**
- El restaurantId en la transacción no coincide con el tenant actual en KDS
- Usuario abrió KDS de otro restaurante

### 5. **Firebase Realtime Database No Sincroniza**
- Problema de conexión del KDS con Firebase
- KDS abierto antes del despliegue (caché del navegador)

## 🛠️ Plan de Debug

### Paso 1: Verificar Logs del Webhook
```bash
# Revisar logs de Railway
railway logs --tail 100
```

**Buscar:**
- `[handleWebhookEvent] Webhook recibido: APPROVED`
- `[_createOrderInKDS] Creando pedido en KDS...`
- `[_createOrderInKDS] Pedido creado en KDS exitosamente`
- Cualquier error `❌`

### Paso 2: Verificar Pedido Temporal Existe
```javascript
// En _createOrderInKDS, verificar log:
console.log(`📝 [_createOrderInKDS] Pedido temporal encontrado:`, existingOrder);
```

**Si NO existe:**
- Verificar que el orderId en el webhook coincida con el orderId creado
- Verificar que el pedido no haya sido eliminado prematuramente

### Paso 3: Verificar Guardado en Firebase
```javascript
// Después de pedidoRef.push(kdsOrder), verificar:
console.log(`✅ [_createOrderInKDS] Pedido creado en KDS exitosamente`);
console.log(`   Path: tenants/${transaction.restaurantId}/pedidos/${pedidoKey}`);
```

**Si aparece el log:**
- Ir a Firebase Console y verificar manualmente que el pedido existe en esa ruta
- Verificar que el restaurantId sea correcto

### Paso 4: Verificar KDS Está Escuchando el Tenant Correcto
```javascript
// En KDS app.js, verificar:
console.log(`📡 Escuchando pedidos del tenant: ${currentTenantId}`);
```

**Comparar:**
- `currentTenantId` en KDS debe ser igual a `transaction.restaurantId` en el webhook

### Paso 5: Forzar Refresco del KDS
- Abrir KDS con `Ctrl+Shift+R` (hard refresh)
- Limpiar caché del navegador
- Verificar que no haya errores en la consola del navegador

## 📋 Checklist de Verificación

- [ ] Webhook llega al servidor (buscar logs `[handleWebhookEvent]`)
- [ ] Evento es `APPROVED` (buscar `status: 'APPROVED'`)
- [ ] `_createOrderInKDS` se ejecuta (buscar log inicio)
- [ ] Pedido temporal existe en `/orders/{orderId}`
- [ ] No hay errores en `_createOrderInKDS`
- [ ] Pedido se guarda en Firebase (verificar en Console)
- [ ] RestaurantId correcto en la transacción
- [ ] KDS escuchando el tenant correcto
- [ ] KDS sin errores en consola del navegador
- [ ] KDS actualizado (hard refresh)

## 🎯 Solución Esperada

Una vez identificado el problema específico mediante los logs:

1. **Si webhook no llega**: Reconfigurar webhook en Wompi
2. **Si pedido temporal no existe**: Revisar flujo de creación del orderId
3. **Si error en Firebase**: Revisar permisos y estructura de datos
4. **Si restaurantId incorrecto**: Revisar cómo se pasa tenantId a la transacción
5. **Si KDS no actualiza**: Problema de caché o conexión

## 📝 Próximos Pasos

1. Hacer una prueba de pago real
2. Revisar logs en tiempo real con `railway logs --tail 100`
3. Verificar en Firebase Console si el pedido se guardó
4. Verificar en KDS que esté escuchando el tenant correcto
5. Reportar hallazgos específicos para solución definitiva
