# 🐛 Análisis del Problema - Enlace de Pago No Generado

## Fecha
26 de enero de 2026

## Resumen del Problema
El sistema muestra el error "Hubo un problema generando el enlace de pago" cuando el cliente elige pagar con tarjeta.

---

## 🔍 Diagnóstico Realizado

### Primera Iteración - Logs Detallados
**Problema encontrado:** No había logs suficientes para identificar el error.

**Solución:** Agregamos logs detallados en:
- `payment-service.js` - Cada paso del proceso
- `payment-config-service.js` - Búsqueda de configuración
- `bot-logic.js` - Llamada inicial

**Resultado:** ✅ Logs implementados exitosamente

---

### Segunda Iteración - Validación de Monto
**Problema encontrado:** 
```
❌ ERROR: amount debe ser mayor a 0
```

**Causa raíz:** 
El `wompi-adapter.js` esperaba el campo `amount` pero `payment-service.js` enviaba `amountInCents`.

**Solución:**
- Modificar `wompi-adapter.js` para aceptar ambos formatos
- Extraer `customerEmail` de `customerData` si no viene directo
- Agregar `paymentLink` al retorno de `gateway-manager.js`

**Código modificado:**
```javascript
// wompi-adapter.js
let finalAmountInCents;
if (amountInCents) {
  finalAmountInCents = amountInCents;
} else if (amount) {
  finalAmountInCents = Math.round(amount * 100);
}

const email = customerEmail || customerData?.email;
```

**Resultado:** ✅ Error de validación resuelto

---

### Tercera Iteración - PaymentLink Undefined
**Problema encontrado:**
```
❌ Error: set failed: value argument contains undefined in property 'transactions.test_z455J2.paymentLink'
```

**Logs reveladores:**
```
✅ [GatewayManager] Enlace de pago creado exitosamente
   Gateway: wompi
   Transaction ID: test_z455J2
   Payment URL: undefined  ⬅️ PROBLEMA
```

**Causa raíz:**
El adapter de Wompi retorna `paymentUrl: data.permalink` pero `data.permalink` es `undefined`.

**Estado actual:**
- ✅ La configuración se encuentra correctamente
- ✅ El monto se valida correctamente
- ✅ Los datos se preparan correctamente
- ✅ La petición a Wompi se envía correctamente
- ✅ Wompi responde con un `transaction_id: test_z455J2`
- ❌ El campo `permalink` en la respuesta de Wompi es `undefined`

---

## 📊 Flujo del Problema

```
1. Bot recibe pedido con método "tarjeta" ✅
   ↓
2. payment-service.createPaymentLink() ✅
   ↓
3. Obtiene configuración de Firebase ✅
   ↓
4. Valida monto (4000000 centavos = $40,000 COP) ✅
   ↓
5. Prepara paymentData con customerData ✅
   ↓
6. gateway-manager.createPaymentLink() ✅
   ↓
7. wompi-adapter.createPaymentLink() ✅
   ↓
8. POST a https://sandbox.wompi.co/v1/payment_links ✅
   ↓
9. Wompi responde con { data: { id: "test_z455J2", ... } } ✅
   ↓
10. data.permalink = undefined ❌ ⬅️ PROBLEMA AQUÍ
    ↓
11. Retorna { paymentUrl: undefined } ❌
    ↓
12. gateway-manager retorna { paymentLink: undefined } ❌
    ↓
13. payment-service intenta guardar con paymentLink: undefined ❌
    ↓
14. Firebase rechaza: "value argument contains undefined" ❌
```

---

## 🔍 Próximos Pasos

### Hipótesis
La API de Wompi en sandbox puede retornar la URL del payment link en un campo diferente a `permalink`, o el endpoint está cambiado.

### Acción Inmediata
Agregar logs para ver la **respuesta completa de Wompi API**:

```javascript
console.log(`📊 [WompiAdapter] Respuesta completa de Wompi:`, JSON.stringify(response.data, null, 2));
console.log(`   Data completo:`, JSON.stringify(data, null, 2));
```

### Opciones a Verificar

1. **Campo diferente:** Tal vez Wompi retorna `url`, `checkout_url`, `payment_url` en lugar de `permalink`

2. **Endpoint diferente:** Tal vez el endpoint correcto no es `/v1/payment_links` sino otro

3. **Estructura diferente:** Tal vez `response.data.data` no es la estructura correcta

4. **Credenciales:** Las credenciales de sandbox pueden tener algún problema

---

## 📝 Documentación de Wompi

Según la documentación oficial de Wompi:
- Endpoint: `POST /v1/payment_links`
- Respuesta esperada:
  ```json
  {
    "data": {
      "id": "123",
      "permalink": "https://checkout.wompi.co/l/..."
    }
  }
  ```

**PERO** esto puede haber cambiado o ser diferente en sandbox.

---

## 🎯 Solución Temporal

Mientras investigamos, podríamos:
1. Hacer un test directo con curl a la API de Wompi
2. Revisar la documentación actualizada
3. Contactar soporte de Wompi

O simplemente revisar los logs de la próxima prueba que incluirán la respuesta completa.

---

## 📁 Archivos Modificados en Esta Sesión

```
✅ server/payment-service.js (logs detallados)
✅ server/payments/payment-config-service.js (logs detallados)
✅ server/bot-logic.js (logs detallados)
✅ server/payments/adapters/wompi-adapter.js (validación de campos + logs)
✅ server/payments/gateway-manager.js (retornar paymentLink)
✅ scripts/diagnostico-pago-detallado.js (script de diagnóstico)
✅ scripts/verificar-tenant-config.js (script de verificación)
✅ scripts/buscar-pedido.js (script de búsqueda)
✅ DEBUG-LOGS-PAGO.md (documentación)
```

---

## ✅ Estado Actual

**Despliegue:** ✅ Completado (Build time: 23.13 seconds)

**Esperando:** Nuevo pedido de prueba para ver la respuesta completa de Wompi API

**Siguiente:** Identificar el campo correcto en la respuesta de Wompi y corregir el código
