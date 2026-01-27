# 🔍 DIAGNÓSTICO - Problema de Pago con Wompi

## 📋 Síntomas Detectados

1. ✅ El usuario completa el pago en Wompi
2. ❌ Wompi redirige a `https://checkout.wompi.co/summary` (pantalla en blanco)
3. ❌ La transacción aparece como "error" en el historial de Wompi
4. ❌ El webhook NO está llegando al backend (sin logs de `📥 WEBHOOK RECIBIDO`)
5. ❌ El bot NO envía mensaje de confirmación de pago al cliente

---

## 🔎 Análisis del Problema

### Problema Principal: **Webhook NO Configurado en Wompi**

El backend está esperando recibir notificaciones del webhook en:
```
POST https://api.kdsapp.site/api/payments/webhook/wompi/{restaurantId}
```

Pero según los logs del backend, **NUNCA SE RECIBE NINGUNA NOTIFICACIÓN** de Wompi.

### Causas Posibles

#### 1. **URL del Webhook NO configurada en Wompi** ⚠️ **MÁS PROBABLE**
   - El restaurante configuró sus credenciales de Wompi en el dashboard
   - PERO no configuró la URL del webhook en el panel de Wompi
   - Por lo tanto, Wompi procesa el pago pero nunca notifica al backend

#### 2. **URL del Webhook Incorrecta**
   - La URL debe ser exactamente: `https://api.kdsapp.site/api/payments/webhook/wompi/{restaurantId}`
   - Si tiene un error de tipeo, las notificaciones fallarán

#### 3. **Events Secret Incorrecto**
   - El Events Secret en el dashboard no coincide con el de Wompi
   - Wompi rechaza enviar notificaciones si no puede validar la firma

#### 4. **Sandbox vs Producción**
   - Si las credenciales son de sandbox pero el webhook es de producción (o viceversa)
   - Las notificaciones no llegarán

---

## 🛠️ Solución Paso a Paso

### Paso 1: Verificar Configuración del Webhook en Wompi

1. **Ir al panel de Wompi**: https://comercios.wompi.co/login

2. **Navegar a**: `Desarrollo → Programadores`

3. **Buscar la sección**: "URL de Eventos"

4. **Verificar que la URL esté configurada**:
   ```
   https://api.kdsapp.site/api/payments/webhook/wompi/{restaurantId}
   ```
   
   **Ejemplo para tenant `tenant1769095946220o10i5g9zw`:**
   ```
   https://api.kdsapp.site/api/payments/webhook/wompi/tenant1769095946220o10i5g9zw
   ```

5. **Guardar cambios** si la URL no está configurada o está incorrecta

### Paso 2: Verificar Events Secret

1. En el mismo panel de Wompi (`Desarrollo → Programadores`)

2. Copiar el **Events Secret** (algo como `test_events_xxx`)

3. Ir al dashboard de KDS: `https://kdsapp.site/dashboard?tenant={restaurantId}`

4. Hacer clic en "💳 Configurar Pagos"

5. Verificar que el **Events Secret** sea exactamente el mismo que el de Wompi

6. Si es diferente, actualizarlo y guardar

### Paso 3: Probar con una Nueva Transacción

1. Hacer una nueva transacción de prueba

2. Completar el pago en Wompi

3. **Verificar que ahora sí se reciba el webhook** en los logs del backend:
   ```
   📥 WEBHOOK RECIBIDO
      Gateway: wompi
      Restaurante: tenant1769095946220o10i5g9zw
   ```

4. **Verificar que el bot envíe el mensaje de confirmación** al WhatsApp del cliente

---

## 🧪 Cómo Probar el Webhook Manualmente

Si quieres probar que el webhook funciona sin hacer un pago real:

### Opción 1: Usar cURL (desde terminal)

```bash
curl -X POST https://api.kdsapp.site/api/payments/webhook/wompi/tenant1769095946220o10i5g9zw \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transaction.updated",
    "data": {
      "transaction": {
        "id": "test_123",
        "reference": "tenant1769095946220o10i5g9zw_test_order",
        "status": "APPROVED",
        "amount_in_cents": 50000,
        "currency": "COP",
        "payment_method_type": "CARD"
      }
    },
    "sent_at": "2026-01-27T15:00:00.000Z"
  }'
```

### Opción 2: Usar Postman

1. **Method**: POST
2. **URL**: `https://api.kdsapp.site/api/payments/webhook/wompi/tenant1769095946220o10i5g9zw`
3. **Headers**:
   ```
   Content-Type: application/json
   ```
4. **Body** (raw JSON):
   ```json
   {
     "event": "transaction.updated",
     "data": {
       "transaction": {
         "id": "test_123",
         "reference": "tenant1769095946220o10i5g9zw_test_order",
         "status": "APPROVED",
         "amount_in_cents": 50000,
         "currency": "COP",
         "payment_method_type": "CARD"
       }
     },
     "sent_at": "2026-01-27T15:00:00.000Z"
   }
   ```

**Resultado esperado**:
- Backend debe mostrar en logs: `📥 WEBHOOK RECIBIDO`
- Backend debe procesar el pago y crear el pedido en Firebase
- Bot debe enviar mensaje de confirmación al cliente

---

## 📊 Flujo Correcto de Pago (Con Webhook)

```
Cliente → Bot WhatsApp
    ↓
Bot genera link de pago
    ↓
Cliente hace clic en el link
    ↓
Wompi muestra formulario de pago
    ↓
Cliente completa el pago
    ↓
✅ Pago APROBADO en Wompi
    ↓
Wompi envía webhook a: https://api.kdsapp.site/api/payments/webhook/wompi/{restaurantId}
    ↓
Backend recibe webhook (📥 WEBHOOK RECIBIDO)
    ↓
Backend verifica firma con Events Secret
    ↓
Backend crea pedido en Firebase KDS
    ↓
Backend notifica al bot
    ↓
✅ Bot envía mensaje de confirmación al cliente
    ↓
Cliente ve pantalla de éxito: https://kdsapp.site/payment-success.html
```

---

## ❌ Flujo Actual (Sin Webhook Configurado)

```
Cliente → Bot WhatsApp
    ↓
Bot genera link de pago
    ↓
Cliente hace clic en el link
    ↓
Wompi muestra formulario de pago
    ↓
Cliente completa el pago
    ↓
✅ Pago APROBADO en Wompi
    ↓
❌ Wompi NO envía webhook (no configurado)
    ↓
❌ Backend NO recibe notificación
    ↓
❌ NO se crea pedido en KDS
    ↓
❌ Bot NO envía mensaje de confirmación
    ↓
❌ Cliente ve pantalla en blanco: https://checkout.wompi.co/summary
```

---

## 🔧 Código Relevante

### Backend - Webhook Endpoint

**Archivo**: `/server/routes/payments.js` (líneas 31-89)

```javascript
router.post('/webhook/:gateway/:restaurantId', async (req, res) => {
  const { gateway, restaurantId } = req.params;
  const payload = req.body;
  const headers = req.headers;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📥 WEBHOOK RECIBIDO`);
    console.log(`   Gateway: ${gateway}`);
    console.log(`   Restaurante: ${restaurantId}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);

    // Log del payload (útil para debugging)
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    // Procesar el webhook usando el PaymentService
    const result = await paymentService.processWebhook(
      gateway,
      payload,
      headers,
      restaurantId
    );

    if (!result.success) {
      console.error(`❌ Error procesando webhook: ${result.error}`);
      
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    console.log(`✅ Webhook procesado exitosamente`);
    console.log(`   Estado: ${result.status}`);
    console.log(`   Transaction ID: ${result.transactionId}\n`);

    // Siempre retornar 200 OK para que el gateway no reintente
    res.status(200).json({
      success: true,
      status: result.status,
      message: 'Webhook procesado correctamente'
    });

  } catch (error) {
    console.error('❌ Error inesperado procesando webhook:', error);
    console.error('   Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
```

**Nota**: Este código DEBERÍA aparecer en los logs cuando Wompi envíe el webhook. Si no aparece, es porque el webhook NO está llegando.

---

## 📝 Checklist de Verificación

- [ ] **Verificar URL del webhook en Wompi** (`Desarrollo → Programadores → URL de Eventos`)
- [ ] **Verificar que la URL sea exactamente**: `https://api.kdsapp.site/api/payments/webhook/wompi/{restaurantId}`
- [ ] **Verificar Events Secret** (debe coincidir con el del dashboard)
- [ ] **Verificar que las credenciales sean de sandbox** (pub_test_, prv_test_, test_events_, test_integrity_)
- [ ] **Hacer una nueva transacción de prueba**
- [ ] **Verificar logs del backend** (debe aparecer `📥 WEBHOOK RECIBIDO`)
- [ ] **Verificar que el bot envíe mensaje de confirmación**
- [ ] **Verificar que el pedido aparezca en el KDS**

---

## 🆘 Si el Problema Persiste

Si después de configurar el webhook correctamente el problema persiste:

1. **Verificar que el backend esté corriendo**:
   ```bash
   curl https://api.kdsapp.site/health
   ```
   Debe retornar: `{"status":"ok",...}`

2. **Verificar que la ruta del webhook exista**:
   ```bash
   curl -X POST https://api.kdsapp.site/api/payments/webhook/wompi/test \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```
   Debe retornar un JSON (no 404)

3. **Revisar logs de Railway** en tiempo real:
   - Ir a: https://railway.app
   - Abrir el proyecto
   - Ver logs en tiempo real
   - Hacer una nueva transacción
   - Verificar si llega el webhook

4. **Verificar Firewall/CORS**:
   - Wompi debe poder hacer POST a `api.kdsapp.site`
   - No debe haber bloqueo de IP

---

## 📞 Contacto para Soporte

Si necesitas ayuda adicional:
- **Documentación de Wompi**: https://docs.wompi.co/
- **Soporte de Wompi**: soporte@wompi.co

---

**Fecha**: 27 de enero de 2026  
**Estado**: 🔴 PROBLEMA IDENTIFICADO - Webhook no configurado  
**Prioridad**: 🔥 ALTA - Afecta todos los pagos
