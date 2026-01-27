# 🎯 FIX FINAL - Búsqueda de Transacción Corregida

**Fecha**: 27 de enero de 2026  
**Problema**: Transacción no encontrada en Firebase al procesar webhook

---

## 🐛 Problema Identificado

### Error en Logs:
```
📊 Evento parseado: APPROVED - 12022885-1769528723-39391
⚠️ Transacción 12022885-1769528723-39391 no encontrada en Firebase
```

### Causa Raíz:

**Lo que estábamos haciendo (INCORRECTO)**:
1. Al crear el payment link, guardamos la transacción con:
   ```javascript
   {
     reference: "tenant_order_timestamp",  // Nuestra referencia
     transactionId: "test_xxxxx"           // ID del payment link
   }
   ```

2. Wompi procesa el pago y genera su propio ID de transacción: `12022885-1769528723-39391`

3. El webhook llega con:
   ```javascript
   {
     transaction: {
       id: "12022885-1769528723-39391",        // ID de la transacción real
       reference: "tenant_order_timestamp"     // Nuestra referencia
     }
   }
   ```

4. **Estábamos buscando por `event.transactionId`** (el ID de Wompi)
5. **Pero en Firebase teníamos guardado nuestro `reference`**
6. **Resultado**: No encontraba la transacción ❌

---

## ✅ Solución Aplicada

### Cambio en el Código:

**Antes (INCORRECTO)**:
```javascript
// Buscar por transaction ID de Wompi (que no existe en Firebase)
const transaction = await this._getTransactionByReference(event.transactionId);
```

**Después (CORRECTO)**:
```javascript
// Buscar por nuestra reference (que sí existe en Firebase)
const transaction = await this._getTransactionByReference(event.reference);
```

### Mejoras Adicionales:

1. **Logs mejorados**:
   ```javascript
   console.log(`📊 Reference del evento: ${event.reference}`);
   console.log(`✅ Transacción encontrada en Firebase:`, {
     id: transaction.id,
     reference: transaction.reference,
     orderId: transaction.orderId
   });
   ```

2. **Guardar el ID de Wompi**:
   ```javascript
   await this._updateTransactionStatus(
     transaction.id,
     event.status,
     {
       wompiTransactionId: event.transactionId, // ← Guardar para referencia
       paymentMethod: event.paymentMethod,
       message: event.message
     }
   );
   ```

---

## 📊 Flujo Correcto

### 1. Crear Payment Link
```javascript
// payment-service.js - createPaymentLink()
const transactionData = {
  reference: "tenant_order_123456",  // ← Nuestra clave primaria
  transactionId: "test_abc",         // ← ID del payment link (no de la transacción)
  // ...
};
await this._saveTransaction(transactionData);
```

### 2. Usuario Paga en Wompi
- Wompi crea transacción real: `12022885-1769528723-39391`
- Vincula con nuestra reference: `tenant_order_123456`

### 3. Webhook Llega
```javascript
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "12022885-1769528723-39391",      // ← ID de Wompi
      "reference": "tenant_order_123456",      // ← Nuestra reference
      "status": "APPROVED"
    }
  }
}
```

### 4. Buscar en Firebase
```javascript
// ✅ CORRECTO: Buscar por reference
const transaction = await this._getTransactionByReference(event.reference);
// Encuentra: { id: "xxx", reference: "tenant_order_123456", ... }
```

### 5. Actualizar Transacción
```javascript
// Guardar el ID de Wompi para referencia
await this._updateTransactionStatus(transaction.id, 'APPROVED', {
  wompiTransactionId: event.transactionId,  // ← Guardar ID de Wompi
  // ...
});
```

---

## 🧪 Prueba para Verificar el Fix

### Paso 1: Crear un nuevo pedido
1. Generar link de pago
2. Ver en logs:
   ```
   ✅ Transacción guardada exitosamente
   reference: tenant_order_xxxxx
   ```

### Paso 2: Pagar con datos de prueba
- **Nequi**: `3991111111`
- **Tarjeta**: `4242 4242 4242 4242`

### Paso 3: Verificar logs del webhook

**Logs esperados**:
```
📥 WEBHOOK RECIBIDO
📦 Payload: { ... }

🔐 [WompiAdapter] Validando firma del webhook...
✅ Firma válida - Webhook auténtico

📊 Evento parseado: APPROVED - 12022885-1769528723-39391
📊 Reference del evento: tenant_order_xxxxx

✅ Transacción encontrada en Firebase:  ← ✅ ESTO ES LO CLAVE
   id: -abc123
   reference: tenant_order_xxxxx
   orderId: ORDER-xxxxx

💾 Actualizando transacción en Firebase...
✅ Transacción actualizada a APPROVED

📝 Creando orden en KDS...
✅ Orden creada en Firebase

📱 Enviando notificación por WhatsApp...
✅ Mensaje enviado
```

---

## 🔍 Debugging

### Si aún no encuentra la transacción:

**Verificar en Firebase**:
1. Abrir Firebase Console
2. Ir a Realtime Database
3. Ver nodo `/transactions`
4. Buscar el `reference` del pedido
5. Verificar que exista antes del pago

**Ver en logs**:
```bash
# Ver creación de transacción
railway logs --lines 100 | grep "Transacción guardada"

# Ver webhook
railway logs --lines 100 | grep "Reference del evento"

# Ver si encuentra
railway logs --lines 100 | grep "Transacción encontrada"
```

### Si la transacción no está en Firebase:

**Posible causa**: Error al crear el payment link

**Verificar**:
```bash
railway logs --lines 200 | grep -A 10 "createPaymentLink"
```

Buscar:
- ✅ `Transacción guardada exitosamente`
- ❌ Errores al guardar

---

## 📋 Checklist de Verificación

### Antes de la Prueba:
- [x] Código modificado
- [ ] Cambios commiteados (pendiente si VSCode tiene el archivo abierto)
- [ ] Deploy terminado
- [ ] Logs de Railway abiertos

### Durante la Prueba:
- [ ] Payment link generado
- [ ] Transacción guardada en Firebase (ver logs)
- [ ] Pago completado en Wompi
- [ ] Webhook recibido

### Después de la Prueba:
- [ ] Ver log: "Transacción encontrada en Firebase" ← CLAVE
- [ ] Ver log: "Orden creada en Firebase"
- [ ] Ver log: "Mensaje enviado"
- [ ] Verificar mensaje en WhatsApp
- [ ] Verificar orden en KDS

---

## 🎯 Resultado Esperado

### Flujo Completo Exitoso:

```
1. Usuario crea pedido
   ├─ Link de pago generado
   ├─ Transacción guardada en Firebase
   └─ Reference: tenant_order_123456

2. Usuario paga en Wompi
   ├─ Wompi procesa pago
   ├─ Crea transaction ID: 12022885-xxx
   └─ Vincula con reference: tenant_order_123456

3. Webhook llega al backend
   ├─ Firma validada ✅
   ├─ Evento parseado ✅
   └─ Reference extraído: tenant_order_123456

4. Buscar en Firebase
   ├─ Buscar por reference ✅
   ├─ Transacción encontrada ✅ ← FIX APLICADO AQUÍ
   └─ Datos recuperados ✅

5. Procesar pago aprobado
   ├─ Actualizar transacción ✅
   ├─ Crear orden en KDS ✅
   └─ Notificar por WhatsApp ✅

6. Cliente recibe confirmación
   └─ "¡Tu pago ha sido aprobado!" ✅
```

---

## 🚀 Próximo Paso

**Hacer prueba con datos correctos de Sandbox**:

1. Abrir terminal:
   ```bash
   railway logs --tail | grep "Reference\|encontrada\|APPROVED"
   ```

2. Crear pedido y pagar con:
   - **Nequi**: `3991111111`
   - **Tarjeta**: `4242 4242 4242 4242`

3. Verificar que aparezca:
   ```
   ✅ Transacción encontrada en Firebase
   ```

4. Si aparece, el problema está resuelto! 🎉

---

## 💡 Lección Aprendida

**IDs vs References en integraciones de pago**:

- **Payment Link ID** (`test_xxxxx`): ID temporal del link de pago
- **Transaction ID** (`12022885-xxx`): ID real de la transacción procesada
- **Reference** (`tenant_order_xxx`): Nuestra clave para vincular todo

**Regla de oro**:
> Siempre usar **reference** para buscar transacciones en nuestro sistema, porque es el único valor que controlamos y que es consistente desde la creación hasta el webhook.

---

**Última actualización**: 27 de enero de 2026  
**Estado**: ✅ Fix aplicado - Pendiente prueba con datos de Sandbox
