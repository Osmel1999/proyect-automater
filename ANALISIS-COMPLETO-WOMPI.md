# 🔍 Análisis Completo - Problemas con Integración Wompi

**Fecha**: 27 de enero de 2026  
**Documentación analizada**: https://docs.wompi.co/docs/colombia/eventos/

---

## ❌ Problemas Identificados

### **PROBLEMA 1: Validación de Firma INCORRECTA** ⚠️ CRÍTICO

**Estado**: ✅ CORREGIDO

**Descripción**:  
El código estaba usando HMAC-SHA256 cuando Wompi usa SHA256 simple.

**Documentación Wompi**:
```
Paso 1: Concatenar valores de signature.properties
Paso 2: Concatenar timestamp
Paso 3: Concatenar Event Secret
Paso 4: Aplicar SHA256 (NO HMAC)
Paso 5: Comparar checksums
```

**Ejemplo de Wompi**:
```
transaction.id + transaction.status + transaction.amount_in_cents + timestamp + eventSecret
↓ SHA256
3476DDA50F64CD7CBD160689640506FEBEA93239BC524FC0469B2C68A3CC8BD0
```

**Lo que hacía el código (INCORRECTO)**:
```javascript
const signatureString = `${timestamp}.${bodyString}`;
const expectedSignature = crypto
  .createHmac('sha256', this.eventSecret)  // ❌ HMAC
  .update(signatureString)
  .digest('hex');
```

**Corrección aplicada**:
```javascript
// PASO 1: Concatenar properties
let concatenated = '';
for (const prop of properties) {
  const value = getNestedValue(payload.data, prop);
  concatenated += String(value);
}

// PASO 2: Concatenar timestamp
concatenated += String(timestamp);

// PASO 3: Concatenar Event Secret
concatenated += this.eventSecret;

// PASO 4: SHA256 simple (NO HMAC)
const checksum = crypto
  .createHash('sha256')  // ✅ HASH
  .update(concatenated)
  .digest('hex')
  .toUpperCase();
```

---

### **PROBLEMA 2: Configuración de URLs en Wompi** ⚠️ CRÍTICO

**Estado**: ⚠️ REQUIERE ACCIÓN DEL USUARIO

**Descripción**:  
Wompi requiere URLs separadas para Sandbox y Producción.

**Según documentación**:
> "Ten presente que tanto para Sandbox como Producción, debes configurar una URL de eventos diferente para cada ambiente."

**URLs correctas a configurar**:

#### Sandbox (Pruebas):
```
https://automater-production.up.railway.app/api/payments/webhook/wompi/[TU_TENANT_ID]
```

#### Producción:
```
https://automater-production.up.railway.app/api/payments/webhook/wompi/[TU_TENANT_ID]
```

**Dónde configurarlas**:
1. Ir a: https://comercios.wompi.co
2. Menú: **Configuración → Webhook**
3. Configurar ambas URLs (Sandbox y Producción)

**Ejemplo con tenant real**:
```
https://automater-production.up.railway.app/api/payments/webhook/wompi/tenant1769095946220o10i5g9zw
```

---

### **PROBLEMA 3: Event Secret** ⚠️ IMPORTANTE

**Estado**: ⚠️ REQUIERE VERIFICACIÓN

**Descripción**:  
El Event Secret es diferente para cada ambiente.

**Según documentación**:
> "Un Secreto conocido únicamente por el comercio y Wompi, que está disponible en Mi cuenta del Dashboard de Comercios, bajo la sección Secretos para integración técnica."

**Formatos**:
- Sandbox: `test_events_XXXXXXXXXXXXXXXXX`
- Producción: `prod_events_XXXXXXXXXXXXXXXXX`

**Dónde encontrarlo**:
1. Ir a: https://comercios.wompi.co/my-account
2. Sección: **Secretos para integración técnica**
3. Copiar el correcto según ambiente

**IMPORTANTE**:  
Debes guardar AMBOS Event Secrets en tu configuración de pagos del dashboard.

---

### **PROBLEMA 4: Respuesta HTTP 200** ✅ OK

**Estado**: ✅ YA ESTÁ CORRECTO

**Según documentación**:
> "Tu sistema deberá responder con un status HTTP 200"

**Nuestro código**:
```javascript
res.status(200).json({
  success: true,
  status: result.status,
  message: 'Webhook procesado correctamente'
});
```

✅ **Correcto**

---

### **PROBLEMA 5: Reintentos de Webhook** ℹ️ INFO

**Según documentación**:
> "Mientras el status HTTP de la respuesta sea diferente a 200, Wompi considerará que el evento no pudo ser notificado correctamente y reintentará notificar nuevamente el evento, máximo 3 veces durante las siguientes 24 horas"

**Calendario de reintentos**:
1. Primer reintento: 30 minutos después
2. Segundo reintento: 3 horas después
3. Tercer reintento: 24 horas después

**Implicaciones**:
- Si el webhook falla, Wompi lo reintentará automáticamente
- Tu backend debe ser idempotente (manejar reintentos duplicados)
- Debes verificar en logs de Wompi si hay reintentos

---

## ✅ Aspectos Correctos del Código

### 1. Estructura del Endpoint ✅
```javascript
router.post('/webhook/:gateway/:restaurantId', async (req, res) => {
```
**Formato correcto**: `/api/payments/webhook/wompi/[TENANT_ID]`

### 2. Logs Detallados ✅
```javascript
console.log(`\n${'='.repeat(60)}`);
console.log(`📥 WEBHOOK RECIBIDO`);
console.log(`   Gateway: ${gateway}`);
console.log(`   Restaurante: ${restaurantId}`);
```
**Excelente para debugging**

### 3. Normalización de Estados ✅
```javascript
const statusMap = {
  'APPROVED': 'APPROVED',
  'DECLINED': 'DECLINED',
  'VOIDED': 'DECLINED',
  'ERROR': 'DECLINED',
  'PENDING': 'PENDING'
};
```
**Correcto según documentación**

### 4. Manejo de Errores ✅
```javascript
catch (error) {
  console.error('❌ Error inesperado procesando webhook:', error);
  res.status(500).json({ ... });  // Wompi reintentará
}
```
**Correcto: 500 causa reintento**

---

## 📋 Checklist de Verificación

### En el Panel de Wompi (comercios.wompi.co):

- [ ] **URL de Webhook Sandbox configurada**
  - URL: `https://automater-production.up.railway.app/api/payments/webhook/wompi/[TENANT_ID]`
  
- [ ] **URL de Webhook Producción configurada**
  - URL: `https://automater-production.up.railway.app/api/payments/webhook/wompi/[TENANT_ID]`
  
- [ ] **Event Secret Sandbox copiado**
  - Formato: `test_events_XXXXXXXXX`
  - Guardado en dashboard de pagos
  
- [ ] **Event Secret Producción copiado**
  - Formato: `prod_events_XXXXXXXXX`
  - Guardado en dashboard de pagos
  
- [ ] **Webhook habilitado** en configuración

### En tu Sistema:

- [x] **Endpoint de webhook funcionando**
  - ✅ `/api/payments/webhook/wompi/:restaurantId`
  
- [x] **Validación de firma corregida**
  - ✅ Usa SHA256 simple (no HMAC)
  - ✅ Sigue el algoritmo de Wompi
  
- [ ] **Event Secret configurado**
  - ⚠️ Verificar en dashboard de pagos
  
- [ ] **Logs de Railway monitoreados**
  - ⚠️ Ejecutar: `railway logs --tail`

---

## 🧪 Pruebas a Realizar

### Prueba 1: Test Manual del Endpoint
```bash
curl -X POST \
  https://automater-production.up.railway.app/api/payments/webhook/wompi/tenant1769095946220o10i5g9zw \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transaction.updated",
    "data": {
      "transaction": {
        "id": "test_12345",
        "reference": "test_order",
        "status": "APPROVED",
        "amount_in_cents": 50000,
        "currency": "COP"
      }
    },
    "signature": {
      "properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
      "checksum": "CALCULAR_CHECKSUM"
    },
    "timestamp": 1738000000,
    "sent_at": "2026-01-27T00:00:00.000Z"
  }'
```

**Resultado esperado**:
```
📥 WEBHOOK RECIBIDO
   Gateway: wompi
   Restaurante: tenant1769095946220o10i5g9zw
```

### Prueba 2: Transacción Real en Sandbox
1. Crear un pedido en tu app
2. Hacer clic en el link de pago
3. Completar pago en sandbox de Wompi:
   - Tarjeta: `4242424242424242`
   - CVV: `123`
   - Fecha: Cualquier fecha futura
4. Verificar logs en Railway inmediatamente después

### Prueba 3: Verificar Logs en Wompi
1. Ir a: https://comercios.wompi.co
2. Menú: **Transacciones**
3. Buscar la transacción de prueba
4. Ver si hay logs de webhook enviados

---

## 🐛 Debugging

### Si NO ves logs de webhook en Railway:

**Posibles causas**:

1. **URL mal configurada en Wompi**
   - ✅ Verificar que sea exacta (sin espacios, sin http://)
   - ✅ Debe incluir el tenant ID correcto
   - ✅ Debe usar HTTPS

2. **Event Secret incorrecto**
   - ⚠️ La validación falla y el webhook es rechazado
   - ⚠️ Verificar que sea el correcto para Sandbox/Producción

3. **Wompi no puede alcanzar el backend**
   - 🔥 Verificar que Railway no tenga firewall
   - 🔥 Probar con curl desde otro servidor

4. **Webhook no habilitado en Wompi**
   - ⚠️ Verificar en configuración de Wompi

### Si ves logs pero la firma falla:

```
❌ Firma inválida - Posible webhook fraudulento
```

**Solución**:
1. Verificar que el Event Secret sea el correcto
2. Verificar que sea para el ambiente correcto (Sandbox/Prod)
3. Los logs mostrarán la cadena concatenada para debugging

### Si ves "Webhook sin firma":

```
❌ Webhook sin firma (checksum)
```

**Posibles causas**:
- Wompi no está incluyendo la firma
- El webhook es de prueba manual (no de Wompi)
- Headers incorrectos

---

## 📊 Monitoreo

### Comando para ver logs en tiempo real:
```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
railway logs --tail
```

### Buscar webhooks específicamente:
```bash
railway logs | grep "WEBHOOK RECIBIDO"
```

### Ver últimos 100 logs:
```bash
railway logs --num 100
```

---

## 🎯 Próximos Pasos

1. ✅ **Código corregido**: Validación de firma arreglada
2. ⚠️ **Usuario debe**: Configurar URLs en Wompi
3. ⚠️ **Usuario debe**: Verificar Event Secret
4. 🧪 **Usuario debe**: Hacer prueba de pago real
5. 👀 **Usuario debe**: Monitorear logs

---

## 📚 Referencias

- [Documentación de Eventos de Wompi](https://docs.wompi.co/docs/colombia/eventos/)
- [Dashboard de Comercios Wompi](https://comercios.wompi.co)
- [Datos de Prueba en Sandbox](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/)

---

**Última actualización**: 27 de enero de 2026  
**Estado**: Código corregido - Pendiente verificación de configuración en Wompi
