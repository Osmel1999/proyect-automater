# 🎯 FLUJO COMPLETO DE PAGOS - DOCUMENTACIÓN TÉCNICA

## 📋 Resumen Ejecutivo

Este documento describe el flujo completo de pagos desde que el usuario hace un pedido por WhatsApp hasta que recibe la confirmación del pago.

---

## 🔄 FLUJO END-TO-END

### 1️⃣ **Usuario hace un pedido por WhatsApp**

```
Usuario → WhatsApp → Bot KDS
"Quiero 2 hamburguesas con papas"
```

**Backend**: `server/bot-logic.js`
- El bot procesa el pedido
- Calcula el total
- Genera un ID de pedido único
- Llama a `paymentService.createPaymentLink()`

---

### 2️⃣ **Backend genera enlace de pago**

**Archivo**: `server/payment-service.js`

```javascript
const result = await paymentService.createPaymentLink({
  restaurantId: 'tenant_xxx',
  orderId: 'ORDER_123',
  amount: 40000, // En centavos
  customerPhone: '3042734424',
  customerName: 'Juan Pérez',
  customerEmail: '3042734424@kdsapp.site',
  orderDetails: { items: [...] }
});
```

**Flujo interno**:
1. Obtiene configuración del gateway (Wompi) de Firebase
2. Valida credenciales del restaurante
3. Prepara datos del pago
4. Llama a `gatewayManager.createPaymentLink()`

---

### 3️⃣ **Gateway Manager delega a Wompi Adapter**

**Archivo**: `server/payments/gateway-manager.js`

```javascript
const result = await this.wompiAdapter.createPaymentLink(credentials, paymentData);
```

**Wompi Adapter** (`server/payments/adapters/wompi-adapter.js`):
1. Valida datos (monto, email, referencia)
2. Construye URL de redirect con parámetros:
   ```
   https://kdsapp.site/payment-success.html?orderId=XXX&amount=40000&phone=3042734424&restaurantId=tenant_xxx
   ```
3. Crea el payment link en Wompi:
   ```javascript
   POST https://api.wompi.sv/v1/payment_links
   {
     "amount_in_cents": 40000,
     "currency": "COP",
     "customer_email": "customer@example.com",
     "reference": "ORDER_123_timestamp",
     "redirect_url": "https://kdsapp.site/payment-success.html?..."
   }
   ```
4. Wompi responde con:
   ```json
   {
     "data": {
       "id": "test_xc3vcH",
       "amount_in_cents": 40000,
       "status": "OPEN"
     }
   }
   ```
5. Construye la URL del checkout:
   ```
   https://checkout.wompi.co/l/test_xc3vcH
   ```

---

### 4️⃣ **Bot envía enlace al usuario**

**Archivo**: `server/bot-logic.js`

```
💳 *PAGO SEGURO EN LÍNEA*

👉 *Haz clic aquí para pagar ahora:*
https://checkout.wompi.co/l/test_xc3vcH

✅ Puedes pagar con tarjeta, PSE o Nequi
🔒 Pago 100% seguro
```

---

### 5️⃣ **Usuario paga en Wompi**

```
Usuario → Click en enlace → Wompi Checkout
→ Ingresa tarjeta/PSE/Nequi
→ Confirma pago
```

**Wompi procesa el pago**:
1. Valida datos de pago
2. Procesa transacción
3. Cambia estado a `APPROVED`
4. Redirige a `redirectUrl` con parámetros

---

### 6️⃣ **Redirección a página de éxito**

**URL de redirección**:
```
https://kdsapp.site/payment-success.html?orderId=ORDER_123&amount=40000&phone=3042734424&restaurantId=tenant_xxx
```

**Archivo**: `payment-success.html` (Firebase Hosting)

**Funcionalidades**:
1. ✅ Muestra mensaje de éxito
2. ✅ Extrae parámetros de la URL (orderId, amount, phone)
3. ✅ Muestra información del pedido
4. ✅ Auto-redirección a WhatsApp después de 5 segundos
5. ✅ Botón manual para volver a WhatsApp

**JavaScript en la página**:
```javascript
const orderId = urlParams.get('orderId');
const phone = urlParams.get('phone');
const amount = urlParams.get('amount');

// Construir enlace de WhatsApp
const message = `✅ Mi pago para el pedido #${orderId} fue exitoso...`;
const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

// Auto-redirección
setTimeout(() => window.location.href = whatsappUrl, 5000);
```

---

### 7️⃣ **Webhook de Wompi notifica al backend** (OPCIONAL)

**Endpoint**: `POST /api/payments/webhook/wompi/:restaurantId`

**Archivo**: `server/routes/payments.js`

**Flujo**:
1. Wompi envía webhook cuando el pago cambia de estado
2. Backend valida firma del webhook
3. Parsea el evento (APPROVED, DECLINED, etc.)
4. Actualiza transacción en Firebase
5. Actualiza pedido en Firebase
6. **Envía notificación al cliente por WhatsApp** (bot)

**Payload del webhook**:
```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "xxx",
      "status": "APPROVED",
      "reference": "ORDER_123_timestamp",
      "amount_in_cents": 40000
    }
  },
  "timestamp": 1234567890
}
```

---

## 🗂️ ESTRUCTURA DE ARCHIVOS

```
kds-webapp/
├── payment-success.html              # 🌐 Página de éxito (Firebase Hosting)
│
└── server/
    ├── payment-service.js            # 🎯 Orquestador principal
    ├── bot-logic.js                  # 🤖 Bot de WhatsApp
    │
    ├── payments/
    │   ├── gateway-manager.js        # 🔀 Selector de gateway
    │   ├── payment-config-service.js # ⚙️  Config persistencia
    │   │
    │   └── adapters/
    │       └── wompi-adapter.js      # 💳 Integración Wompi API
    │
    └── routes/
        └── payments.js               # 🔔 Webhooks y endpoints
```

---

## 🔗 URLs CLAVE

### Frontend (Firebase Hosting)
- **Hosting**: `https://kdsapp.site`
- **Página de éxito**: `https://kdsapp.site/payment-success.html`

### Backend (Railway)
- **API**: `https://api.kdsapp.site`
- **Health**: `https://api.kdsapp.site/health`
- **Webhook Wompi**: `https://api.kdsapp.site/api/payments/webhook/wompi/:restaurantId`

### Wompi
- **API**: `https://api.wompi.sv/v1`
- **Checkout**: `https://checkout.wompi.co/l/:payment_link_id`
- **Docs**: `https://docs.wompi.sv`

---

## 📊 ESTADOS DE TRANSACCIÓN

| Estado | Descripción | Acción |
|--------|-------------|--------|
| `PENDING` | Pago creado, esperando confirmación | Enviar enlace al usuario |
| `APPROVED` | Pago exitoso | ✅ Actualizar pedido, notificar cliente |
| `DECLINED` | Pago rechazado | ❌ Notificar rechazo |
| `VOIDED` | Pago anulado | ⚠️ Notificar anulación |
| `ERROR` | Error en procesamiento | 🔴 Investigar error |

---

## 🔐 SEGURIDAD

### Credenciales Wompi

**Almacenadas en Firebase**:
```
/tenants/{restaurantId}/paymentConfig
{
  "enabled": true,
  "gateway": "wompi",
  "credentials": {
    "publicKey": "pub_xxxxx",
    "privateKey": "priv_xxxxx", // 🔒 Encriptado
    "currency": "COP",
    "sandbox": true
  }
}
```

### Validación de Webhook

1. **Firma HMAC**: Wompi firma eventos con secret key
2. **Verificación**: Backend valida firma antes de procesar
3. **Timestamp**: Se valida que el evento no sea muy antiguo

---

## 🧪 TESTING

### Test Manual del Flujo Completo

1. **Crear pedido por WhatsApp**
   ```
   Enviar mensaje al bot: "Quiero 2 hamburguesas"
   ```

2. **Verificar enlace de pago**
   ```
   Bot debe responder con enlace de Wompi
   ```

3. **Pagar en Wompi**
   ```
   - Click en enlace
   - Usar tarjeta de prueba: 4242 4242 4242 4242
   - CVV: cualquier 3 dígitos
   - Fecha: cualquier fecha futura
   ```

4. **Verificar redirección**
   ```
   - Debe redirigir a payment-success.html
   - Debe mostrar información del pedido
   - Debe auto-redirigir a WhatsApp
   ```

5. **Verificar notificación**
   ```
   - Bot debe enviar confirmación de pago
   - Pedido debe actualizarse en Firebase
   ```

### Logs Esperados

```bash
# Backend (Railway)
🎯 INICIO - createPaymentLink
📝 Parámetros recibidos: { restaurantId, orderId, amount }
🔍 PASO 1: Obteniendo configuración del gateway...
✅ Gateway configurado correctamente
🔍 PASO 2: Validando monto...
✅ Monto válido: 40000 centavos (400 COP)
🔍 PASO 3: Preparando datos del pago...
✅ Datos del pago preparados
🔍 PASO 4: Creando enlace de pago con gateway wompi...
📝 [WompiAdapter] Creando payment link...
✅ Enlace de pago creado exitosamente: https://checkout.wompi.co/l/test_xxx
🔍 PASO 5: Guardando transacción en Firebase...
✅ Transacción guardada exitosamente
🟢 FIN - createPaymentLink EXITOSO
```

---

## ❌ PROBLEMAS COMUNES Y SOLUCIONES

### 1. "Página no disponible" después del pago

**Causa**: `redirectUrl` apunta a URL incorrecta o inaccesible

**Solución**:
- Verificar que `payment-success.html` esté desplegado en Firebase Hosting
- Verificar que la URL sea `https://kdsapp.site/payment-success.html`
- Verificar que los parámetros de URL estén correctos

### 2. No redirige a WhatsApp

**Causa**: Parámetro `phone` no está en la URL

**Solución**:
- Verificar que `wompi-adapter.js` pase `phone` en `redirectUrl`
- Verificar que `payment-success.html` extraiga `phone` de la URL

### 3. Bot no envía confirmación de pago

**Causa**: Webhook no está configurado o falla la validación

**Solución**:
- Configurar webhook en panel de Wompi
- Verificar que la URL sea accesible: `https://api.kdsapp.site/api/payments/webhook/wompi/{restaurantId}`
- Revisar logs de Railway para errores

### 4. "Gateway no configurado"

**Causa**: No hay configuración de pagos en Firebase para el restaurante

**Solución**:
- Ir a Dashboard → Configuración de Pagos
- Activar toggle de pagos
- Ingresar credenciales de Wompi (public + private key)

---

## 📈 MÉTRICAS Y MONITOREO

### Logs Importantes

1. **Creación de enlace de pago**
   ```
   🎯 INICIO - createPaymentLink
   🟢 FIN - createPaymentLink EXITOSO
   ```

2. **Procesamiento de webhook**
   ```
   🔔 Procesando webhook de wompi para restaurante tenant_xxx
   ✅ Webhook procesado exitosamente: APPROVED
   ```

3. **Errores**
   ```
   🔴 ERROR en createPaymentLink
   ❌ Error: Gateway wompi no configurado
   ```

### Firebase Analytics (Futuro)

- Pagos iniciados
- Pagos completados
- Pagos fallidos
- Tiempo promedio de pago
- Tasa de conversión

---

## 🚀 PRÓXIMOS PASOS

### Fase Actual ✅
- [x] Generación de enlace de pago
- [x] Integración con Wompi
- [x] Página de éxito con redirección a WhatsApp
- [x] Persistencia de transacciones

### Fase Siguiente 🔄
- [ ] Configurar webhooks en producción
- [ ] Notificación automática del bot al confirmar pago
- [ ] Panel de transacciones en dashboard
- [ ] Reportes de ventas

### Mejoras Futuras 🎯
- [ ] Soporte multi-gateway (Bold, PayU)
- [ ] Pagos recurrentes
- [ ] Descuentos y cupones
- [ ] Split payments (comisiones)

---

## 📞 SOPORTE

**Documentación adicional**:
- `FIX-BUG-DESCONEXION-WHATSAPP.md` - Fix de desconexión de WhatsApp
- `DEBUG-LOGS-PAGO.md` - Logs detallados de debugging
- `ANALISIS-PROBLEMA-PAGO.md` - Análisis del problema de enlace de pago
- `Integracion-Multi-Gateway/` - Documentación completa del sistema de pagos

**Logs**:
- Railway: `railway logs` o https://railway.app/dashboard
- Firebase: Firebase Console → Hosting

---

**Fecha**: 26 de enero de 2026  
**Autor**: Copilot + Osmel  
**Estado**: ✅ FUNCIONANDO - Pendiente configurar webhooks
