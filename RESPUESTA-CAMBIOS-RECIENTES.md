# 🎯 Resumen: ¿Por qué salen esos errores?

**Fecha:** 27 de enero de 2026

---

## ❌ El Error Actual

```
❌ Transacción no encontrada en Firebase
Estado: TRANSACTION_NOT_FOUND
- Payment Link ID: N/A
- Transaction ID: undefined
- Wompi Transaction ID: 12022885-1769537660-40049
- Reference: test_UaGxZz_1769537642_c1G7xm1lV
```

---

## 🔍 ¿Por qué sale este error?

### Causa Principal: `payment_link_id` llega como `null` en el webhook

**Lo que pasa:**
1. Cuando creas un Payment Link, Wompi te da un ID (ej: `18219-1737994486-28499`)
2. Guardas ese ID en Firebase como `paymentLinkId`
3. Usuario paga a través del link
4. Wompi crea una **nueva transacción** con su propio ID (ej: `12022885-1769537660-40049`)
5. Wompi envía un webhook con los datos de esa transacción
6. **PROBLEMA:** El webhook NO incluye el campo `payment_link_id` (o viene como `null`)
7. Tu backend intenta buscar en Firebase por `paymentLinkId` pero no lo encuentra
8. Resultado: "Transacción no encontrada"

---

## 💭 ¿Los últimos cambios ayudaron?

### NO, los cambios NO solucionan el problema

**Lo que hice:**
- ✅ Agregué comentarios explicativos en el código
- ✅ Mejoré el logging para ver qué llega en el webhook
- ✅ Removí el campo `reference` que Wompi ignora
- ✅ Documenté el comportamiento según la documentación oficial

**Lo que NO hice:**
- ❌ NO arreglé el problema de que `payment_link_id` sea `null`
- ❌ NO implementé un método alternativo de búsqueda
- ❌ NO cambié la lógica de conciliación

**Conclusión:** Los cambios solo nos ayudan a **DEBUGGEAR mejor** el problema, pero no lo resuelven.

---

## 🎯 ¿Cuál es el verdadero problema?

Hay **3 posibilidades**:

### Posibilidad 1: Wompi no envía `payment_link_id` en el webhook
**Probabilidad:** 🔴 ALTA

**Razón:** Algunos gateways de pago no incluyen todos los campos en todos los eventos.

**Evidencia:**
- Los logs muestran consistentemente `Payment Link ID: N/A`
- Nunca has visto un valor válido en ese campo

**Si es esto:** Necesitamos una estrategia alternativa de conciliación.

### Posibilidad 2: Estás usando un flujo diferente
**Probabilidad:** 🟡 MEDIA

**Razón:** Si el usuario paga de una forma diferente (widget, API directa), no hay `payment_link_id`.

**Evidencia:**
- El reference tiene formato extraño: `test_UaGxZz_1769537642_c1G7xm1lV`
- No coincide con tu formato: `restaurantId_orderId_timestamp`

**Si es esto:** Necesitamos asegurarnos de que el flujo sea correcto.

### Posibilidad 3: Problema de timing
**Probabilidad:** 🟢 BAJA

**Razón:** El webhook llega antes de que Wompi asocie la transacción al link.

**Evidencia:**
- No hay evidencia de esto aún

**Si es esto:** Necesitamos implementar retry logic o búsqueda con delay.

---

## 🛠️ ¿Qué necesitamos hacer ahora?

### Paso 1: Confirmar qué llega en el webhook 🔍

**Acción:**
1. Desplegar los cambios con el logging mejorado
2. Generar un nuevo link a través de tu app
3. Hacer un pago de prueba
4. Revisar los logs del webhook

**Objetivo:** Ver EXACTAMENTE qué campos tiene el objeto `transaction` en el webhook.

### Paso 2: Implementar solución según lo que encontremos

#### Si `payment_link_id` NO está en el webhook:
```javascript
// Estrategia alternativa de conciliación
// Buscar por múltiples criterios:
// 1. Buscar por wompiTransactionId (si ya se guardó antes)
// 2. Buscar transacciones PENDING recientes (últimos 15 min)
// 3. Matchear por monto + timestamp
// 4. Actualizar con wompiTransactionId
```

#### Si `payment_link_id` SÍ está pero con otro nombre:
```javascript
// Ajustar el código para usar el campo correcto
paymentLinkId: transaction.link_id || transaction.payment_link || ...
```

#### Si el flujo está mal:
```javascript
// Asegurar que:
// 1. Siempre se usa el endpoint de tu app
// 2. El link se guarda correctamente en Firebase
// 3. Usuario paga a través de ese link específico
```

---

## 📊 Estrategia Alternativa (Plan B)

Si confirmamos que Wompi NO envía `payment_link_id`, usaremos esta estrategia:

### 1. Búsqueda Inteligente en el Webhook

```javascript
async processWebhook(gateway, payload, headers, restaurantId) {
  const event = await this.parseWebhookEvent(payload);
  
  let transaction = null;
  
  // Intento 1: Por wompiTransactionId (si ya existe)
  transaction = await this._getTransactionByWompiTransactionId(event.transactionId);
  
  // Intento 2: Por transacciones PENDING recientes
  if (!transaction) {
    const recentPending = await this._getRecentPendingTransactions(restaurantId, 15); // últimos 15 min
    
    // Matchear por monto
    transaction = recentPending.find(t => t.amount === event.amount);
  }
  
  // Intento 3: Consultar API de Wompi para más detalles
  if (!transaction) {
    const wompiDetails = await this.wompiAdapter.getTransactionDetails(event.transactionId);
    // Usar metadata de Wompi para buscar
  }
  
  if (!transaction) {
    // Guardar como "orphan transaction" para reconciliación manual
    await this._saveOrphanTransaction(event);
    return { success: true, status: 'PENDING_RECONCILIATION' };
  }
  
  // Actualizar con wompiTransactionId
  await this._updateTransaction(transaction.id, {
    wompiTransactionId: event.transactionId,
    status: event.status
  });
}
```

### 2. Endpoint de Reconciliación Manual

```javascript
// GET /api/payments/reconcile/:restaurantId
// Lista transacciones que no se pudieron conciliar automáticamente
// Permite al admin matchear manualmente
```

---

## ✅ Próxima Acción Inmediata

**TÚ DEBES:**

1. **Desplegar los cambios:**
   ```bash
   git add .
   git commit -m "feat: add webhook debugging"
   git push
   ```

2. **Generar un nuevo link de pago a través de tu app** (NO desde Wompi)

3. **Hacer un pago de prueba**

4. **Compartir los logs completos** del webhook, específicamente la sección:
   ```
   🔍 [DEBUG CRÍTICO] Datos de la transacción en el webhook:
   ```

5. Con esos logs, podremos **confirmar la causa** y **implementar la solución correcta**.

---

## 🎬 Conclusión

**Los cambios que hice NO solucionan el problema directamente**, pero nos dan las herramientas para:
- ✅ Identificar la causa raíz
- ✅ Ver exactamente qué envía Wompi
- ✅ Diseñar la solución correcta

**Necesitamos los logs del próximo pago** para continuar.
