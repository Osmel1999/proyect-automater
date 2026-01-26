# 🔔 Configuración de Webhooks de Wompi

**Fecha:** 26 de enero de 2026  
**Sistema:** KDS SaaS WhatsApp Bot  
**Gateway:** Wompi

---

## ⚠️ **IMPORTANTE: DEBES CONFIGURAR ESTO**

La **URL de Eventos** es **OBLIGATORIA** para que tu sistema funcione. Sin ella:
- ❌ Los pedidos no se crearán automáticamente
- ❌ Los clientes no recibirán confirmación por WhatsApp
- ❌ Los restaurantes no verán los pedidos en el KDS

---

## 🔗 Tu URL de Webhook

### **URL Base (Dominio Personalizado):**
```
https://api.kdsapp.site/api/payments/webhook/wompi/{RESTAURANT_ID}
```

### **URL Alternativa (Railway):**
```
https://kds-backend-production.up.railway.app/api/payments/webhook/wompi/{RESTAURANT_ID}
```

---

## 📋 Pasos para Configurar en Wompi

### **Opción A: URL Genérica (Recomendada si tienes UN SOLO restaurante)**

Si solo tienes un restaurante de prueba ahora, usa:

```
https://api.kdsapp.site/api/payments/webhook/wompi/default
```

O reemplaza `default` con el ID real de tu restaurante de prueba.

---

### **Opción B: URL Dinámica (Multi-Tenant)**

Para tu sistema multi-tenant (múltiples restaurantes), cada restaurante debe configurar su propia URL con su ID:

**Restaurante 1:**
```
https://api.kdsapp.site/api/payments/webhook/wompi/rest_ABC123
```

**Restaurante 2:**
```
https://api.kdsapp.site/api/payments/webhook/wompi/rest_XYZ789
```

---

## 🔐 Configuración Paso a Paso en Wompi

### 1. **Inicia sesión en tu cuenta de Wompi**
   - Sandbox: https://comercios-sandbox.wompi.co/
   - Producción: https://comercios.wompi.co/

### 2. **Ve a "Configuraciones avanzadas para programadores"**
   - En el menú lateral, busca "Integraciones" o "Configuraciones"

### 3. **Encuentra "URL de Eventos" o "Webhook URL"**
   - Puede estar en una sección llamada "Eventos" o "Webhooks"

### 4. **Pega tu URL de webhook**
   
   **Para pruebas (ahora):**
   ```
   https://api.kdsapp.site/api/payments/webhook/wompi/default
   ```

   **Para producción (después):**
   ```
   https://api.kdsapp.site/api/payments/webhook/wompi/{ID_DEL_RESTAURANTE}
   ```

### 5. **Guarda los cambios**
   - Haz clic en "Guardar" o "Actualizar"

### 6. **Copia la "Llave secreta de eventos" (Event Secret)**
   - Wompi te mostrará una llave secreta
   - **CÓPIALA** - la necesitarás para configurar tu backend

---

## 🔑 Configurar Event Secret en Railway

Después de configurar la URL en Wompi, necesitas agregar el **Event Secret** a tu backend:

### 1. **Ve al Dashboard de Railway**
   - https://railway.app/project/tu-proyecto

### 2. **Selecciona tu servicio (kds-backend)**

### 3. **Ve a "Variables"**

### 4. **Agrega estas variables de entorno:**

```bash
# Event Secret de Wompi (cópialo del dashboard de Wompi)
WOMPI_EVENT_SECRET=tu_event_secret_aqui

# Si usas Integrity Secret también
WOMPI_INTEGRITY_SECRET=tu_integrity_secret_aqui
```

### 5. **Redeploy el servicio**
   - Railway detectará los cambios y redeployará automáticamente

---

## 🧪 Probar el Webhook

### Método 1: Realizar un Pago de Prueba

1. Genera un link de pago desde tu app
2. Completa el pago con tarjeta de prueba de Wompi
3. Verifica los logs en Railway:

```bash
railway logs
```

Deberías ver algo como:

```
============================================================
📥 WEBHOOK RECIBIDO
   Gateway: wompi
   Restaurante: default
   Timestamp: 2026-01-26T...
============================================================

📦 Payload: {...}
✅ Webhook validado correctamente
✅ Pago aprobado, creando pedido en KDS...
✅ Pedido creado exitosamente en KDS
📲 Enviando notificación por WhatsApp...
✅ Notificación enviada exitosamente
✅ Webhook procesado exitosamente
```

---

### Método 2: Simular Webhook con cURL

Puedes probar tu endpoint con cURL (para desarrollo):

```bash
curl -X POST https://api.kdsapp.site/api/payments/webhook/wompi/default \
  -H "Content-Type: application/json" \
  -H "x-signature: test-signature" \
  -H "x-timestamp: $(date +%s)" \
  -d '{
    "event": "transaction.updated",
    "data": {
      "transaction": {
        "id": "test-123",
        "status": "APPROVED",
        "reference": "rest_ABC_order_123_1234567890",
        "amount_in_cents": 5000,
        "payment_method_type": "CARD"
      }
    }
  }'
```

**Nota:** Este método no validará la firma correctamente, pero te permite probar el flujo.

---

## 📊 Estructura del Webhook de Wompi

Cuando ocurre un evento, Wompi enviará un POST a tu URL con este formato:

```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "5432-1234-5678-9012",
      "status": "APPROVED",
      "reference": "rest_ABC123_order_456_1706284800000",
      "amount_in_cents": 25000,
      "currency": "COP",
      "customer_email": "cliente@example.com",
      "payment_method_type": "CARD",
      "payment_method": {
        "type": "CARD",
        "extra": {
          "bin": "424242",
          "last_four": "4242",
          "card_holder": "JOHN DOE",
          "exp_month": "12",
          "exp_year": "25"
        }
      },
      "created_at": "2026-01-26T12:00:00.000Z",
      "finalized_at": "2026-01-26T12:00:05.000Z"
    }
  },
  "sent_at": "2026-01-26T12:00:06.000Z"
}
```

---

## 🛡️ Seguridad del Webhook

Tu sistema **valida automáticamente** la firma del webhook para asegurar que viene de Wompi:

1. **Wompi firma cada webhook** con tu Event Secret
2. **Tu servidor verifica la firma** antes de procesar
3. **Si la firma no coincide**, el webhook es rechazado

Código en `wompi-adapter.js`:

```javascript
async validateWebhook(payload, headers) {
  const signature = headers['x-signature'];
  const timestamp = headers['x-timestamp'];
  
  const signatureString = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSignature = crypto
    .createHmac('sha256', this.eventSecret)
    .update(signatureString)
    .digest('hex');
  
  return signature === expectedSignature;
}
```

---

## 🔄 Flujo Completo con Webhook

### 1. **Cliente genera pedido**
```
Cliente → Bot WhatsApp → Genera link de pago Wompi
```

### 2. **Cliente paga**
```
Cliente → Abre link → Completa pago en Wompi
```

### 3. **Wompi notifica tu servidor**
```
Wompi → Envía webhook → https://api.kdsapp.site/api/payments/webhook/wompi/rest123
```

### 4. **Tu servidor procesa**
```
1. Valida firma del webhook ✅
2. Verifica que el pago fue aprobado ✅
3. Crea el pedido en el KDS ✅
4. Envía notificación por WhatsApp al cliente ✅
```

### 5. **Cliente recibe confirmación**
```
Cliente recibe mensaje de WhatsApp:
"🎉 ¡Pago confirmado exitosamente!
✅ Tu pago de $25,000 ha sido procesado correctamente.
📋 Detalles de tu pedido:
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔢 Número de pedido: #ORDER_456
💰 Total pagado: $25,000
🕒 Tiempo estimado: 30-40 minutos
..."
```

---

## 📝 Notas Importantes

### ⚠️ **Diferencia entre Sandbox y Producción**

- **Sandbox (Pruebas):**
  - URL de Eventos: Configure en https://comercios-sandbox.wompi.co/
  - Event Secret: Use el Event Secret de Sandbox
  - Tarjetas de prueba: Use las tarjetas de prueba de Wompi

- **Producción:**
  - URL de Eventos: Configure en https://comercios.wompi.co/
  - Event Secret: Use el Event Secret de Producción
  - **IMPORTANTE:** Cambie `WOMPI_MODE=production` en Railway

---

### 🔐 **Mantén tus secrets seguros**

**NUNCA** compartas públicamente:
- ❌ `WOMPI_PRIVATE_KEY`
- ❌ `WOMPI_EVENT_SECRET`
- ❌ `WOMPI_INTEGRITY_SECRET`

Estos deben estar **solo en variables de entorno** de Railway, nunca en el código.

---

### 🔄 **Reintentos automáticos**

Si tu servidor no responde o retorna un error 5xx:
- Wompi **reintentará** enviar el webhook
- Puede reintentar hasta 10 veces en 24 horas
- Por eso es importante que tu servidor siempre esté disponible

---

### 📊 **Monitoreo**

Para verificar que los webhooks están llegando correctamente:

```bash
# Ver logs en Railway
railway logs --tail

# Buscar webhooks específicos
railway logs | grep "WEBHOOK RECIBIDO"

# Buscar errores
railway logs | grep "ERROR"
```

---

## ✅ Checklist de Configuración

- [ ] Obtener URL de webhook: `https://api.kdsapp.site/api/payments/webhook/wompi/{RESTAURANT_ID}`
- [ ] Configurar URL de Eventos en dashboard de Wompi
- [ ] Copiar Event Secret de Wompi
- [ ] Agregar `WOMPI_EVENT_SECRET` en variables de Railway
- [ ] Redeploy del servicio en Railway
- [ ] Probar con pago de prueba
- [ ] Verificar logs en Railway
- [ ] Confirmar que se crea el pedido en KDS
- [ ] Confirmar que llega notificación por WhatsApp

---

## 🆘 Problemas Comunes

### 1. **Webhook no llega**
   - ✅ Verifica que la URL esté correcta en Wompi
   - ✅ Verifica que tu servidor esté online (https://api.kdsapp.site/)
   - ✅ Revisa los logs de Railway

### 2. **Firma inválida**
   - ✅ Verifica que `WOMPI_EVENT_SECRET` esté configurado
   - ✅ Asegúrate de usar el Event Secret correcto (Sandbox vs Producción)

### 3. **Pedido no se crea**
   - ✅ Revisa los logs: `railway logs | grep "ERROR"`
   - ✅ Verifica que el restaurante tenga configuración de pagos

### 4. **No llega notificación WhatsApp**
   - ✅ Verifica que el restaurante esté conectado a WhatsApp
   - ✅ Verifica que el número del cliente sea correcto

---

## 📚 Documentación Relacionada

- **Wompi Webhooks:** https://docs.wompi.co/docs/es/eventos-y-estados
- **Tu Adapter:** `/server/payments/adapters/wompi-adapter.js`
- **Payment Service:** `/server/payment-service.js`
- **Routes:** `/server/routes/payments.js`

---

## 🎯 Resumen

**¿Qué URL poner en Wompi?**

```
https://api.kdsapp.site/api/payments/webhook/wompi/default
```

(Reemplaza `default` con el ID real de tu restaurante)

**¿Qué más necesito?**
1. Configurar URL en Wompi ✅
2. Copiar Event Secret ✅
3. Agregar Event Secret en Railway ✅
4. Probar con pago de prueba ✅

---

**🎉 Una vez configurado, tu sistema funcionará 100% automático:**

Cliente paga → Wompi notifica → Pedido se crea → Cliente recibe WhatsApp ✨
