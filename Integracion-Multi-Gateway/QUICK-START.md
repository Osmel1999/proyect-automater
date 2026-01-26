# 🚀 Quick Start: Sistema de Pagos Multi-Gateway

**Guía rápida para probar el sistema de pagos implementado**

---

## 📦 Prerequisitos

1. Node.js 18+ instalado
2. Firebase configurado (.env con credenciales)
3. Servidor corriendo (`npm start`)
4. Tenant con gateway configurado en Firebase

---

## ⚡ Inicio Rápido (5 minutos)

### 1. Verificar Credenciales del Gateway

```bash
node scripts/test-credentials.js
```

**Resultado esperado:**
```
🧪 Probando gateway: wompi
  ✅ PUBLIC_KEY válido
  ✅ PRIVATE_KEY válido
  ✅ INTEGRITY_SECRET válido
  🎉 Credencias válidas y funcionales
```

---

### 2. Configurar Gateway para un Restaurante

En **Firebase Console**, navega a:
```
tenants/<tenantId>/payments/gateway
```

Agrega esta configuración:
```json
{
  "enabled": true,
  "gateway": "wompi",
  "credentials": {
    "publicKey": "pub_test_...",
    "privateKey": "prv_test_...",
    "integritySecret": "test-integrity-..."
  }
}
```

💡 **Tip:** Usa las credenciales de sandbox de Wompi (ver `.env.example`)

---

### 3. Probar Flujo Completo End-to-End

```bash
node scripts/test-payment-flow-e2e.js <tenantId> <phoneNumber>

# Ejemplo
node scripts/test-payment-flow-e2e.js tenant-ABC 573001234567
```

**El script hará:**
1. ✅ Verificar configuración del restaurante
2. ✅ Crear pedido de prueba
3. ✅ Generar enlace de pago
4. ✅ Simular pago exitoso (webhook)
5. ✅ Verificar estado final

---

## 🔌 Endpoints Disponibles

### Webhook de Pago
```bash
POST http://localhost:3000/api/payments/webhook/:restaurantId/:gateway

# Ejemplo
POST http://localhost:3000/api/payments/webhook/tenant-ABC/wompi
```

### Estado de Transacción
```bash
GET http://localhost:3000/api/payments/status/:transactionId

# Ejemplo
GET http://localhost:3000/api/payments/status/12345-6789
```

### Probar Gateway (Testing)
```bash
POST http://localhost:3000/api/payments/test
Content-Type: application/json

{
  "restaurantId": "tenant-ABC",
  "orderId": "order-123",
  "amount": 5500000,
  "customerPhone": "573001234567",
  "customerName": "Juan Pérez",
  "customerEmail": "juan@example.com"
}
```

---

## 💬 Probar desde WhatsApp

### Flujo Completo

1. **Iniciar conversación:**
   ```
   Cliente: "hola"
   ```

2. **Ver menú:**
   ```
   Bot: [Muestra menú completo]
   ```

3. **Hacer pedido:**
   ```
   Cliente: "quiero 2 hamburguesas y 1 coca cola"
   Bot: [Confirmación del pedido parseado]
   ```

4. **Confirmar:**
   ```
   Cliente: "sí"
   Bot: [Solicita dirección]
   ```

5. **Dar dirección:**
   ```
   Cliente: "Calle 80 #12-34"
   Bot: [Solicita teléfono]
   ```

6. **Dar teléfono:**
   ```
   Cliente: "3001234567"
   Bot: [Genera y envía enlace de pago]
   ```

### Mensaje del Bot con Pago

```
🎉 ¡Tu pedido está casi listo!

📋 Número de pedido: #A3F5B2
📍 Dirección: Calle 80 #12-34
📱 Teléfono de contacto: 300 123 4567
💰 Total a pagar: $55.000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💳 PAGO SEGURO

👉 Haz clic aquí para pagar ahora:
https://checkout.wompi.co/l/ABC123

✅ Puedes pagar con tarjeta de crédito/débito, PSE o Nequi
🔒 Pago 100% seguro y encriptado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una vez confirmes el pago, Mi Restaurante empezará a preparar tu pedido.

🕒 Tiempo estimado: 30-40 minutos

Te avisaremos cuando esté listo para entrega 🛵
```

---

## 🧪 Testing con Postman

### 1. Crear Enlace de Pago

```http
POST http://localhost:3000/api/payments/test
Content-Type: application/json

{
  "restaurantId": "tenant-ABC",
  "orderId": "test-order-123",
  "amount": 5500000,
  "customerPhone": "573001234567",
  "customerName": "Cliente Test",
  "customerEmail": "test@example.com"
}
```

**Respuesta:**
```json
{
  "success": true,
  "paymentLink": "https://checkout.wompi.co/l/ABC123",
  "transactionId": "12345-6789",
  "reference": "tenant-ABC_test-order-123_1705504800000"
}
```

### 2. Simular Webhook (Wompi)

```http
POST http://localhost:3000/api/payments/webhook/tenant-ABC/wompi
Content-Type: application/json
X-Event: transaction.updated
X-Signature: <calcular HMAC>

{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "12345-6789",
      "reference": "tenant-ABC_test-order-123_1705504800000",
      "amount_in_cents": 5500000,
      "status": "APPROVED",
      "payment_method_type": "CARD",
      "customer_email": "test@example.com",
      "finalized_at": "2025-01-17T10:30:00Z"
    }
  },
  "sent_at": "2025-01-17T10:30:00Z"
}
```

**Respuesta:**
```json
{
  "success": true,
  "status": "APPROVED",
  "message": "Webhook procesado exitosamente"
}
```

### 3. Consultar Estado

```http
GET http://localhost:3000/api/payments/status/12345-6789
```

**Respuesta:**
```json
{
  "success": true,
  "transactionId": "12345-6789",
  "status": "APPROVED",
  "amount": 5500000,
  "timestamp": 1705504800000,
  "gateway": "wompi"
}
```

---

## 🔍 Verificar en Firebase

### Estructura del Pedido con Pago

```
tenants/
  <tenantId>/
    pedidos/
      <pedidoKey>/
        ├── id: "A3F5B2"
        ├── estado: "pendiente_pago" → "confirmado"
        ├── paymentStatus: "PENDING" → "APPROVED"
        ├── paymentLink: "https://..."
        ├── paymentTransactionId: "12345-6789"
        ├── paymentReference: "tenant-ABC_..."
        ├── items: [...]
        ├── total: 55000
        └── timestamp: 1705504800000
```

### Estructura de la Transacción

```
tenants/
  <tenantId>/
    transactions/
      <transactionId>/
        ├── restaurantId: "tenant-ABC"
        ├── orderId: "<pedidoKey>"
        ├── gateway: "wompi"
        ├── status: "APPROVED"
        ├── amount: 5500000
        ├── createdAt: 1705504800000
        └── webhookData: { ... }
```

---

## 🐛 Troubleshooting

### Error: "Gateway no configurado"

**Solución:** Verifica que el restaurante tenga la configuración en Firebase:
```
tenants/<tenantId>/payments/gateway
```

### Error: "Credenciales inválidas"

**Solución:**
1. Ejecuta `node scripts/test-credentials.js`
2. Verifica el `.env`
3. Asegúrate de usar credenciales de sandbox

### Webhook no se procesa

**Solución:**
1. Verifica la firma HMAC (X-Signature header)
2. Revisa los logs del servidor
3. Usa el script de test E2E para simular

### Rate Limiting (429 Error)

**Solución:**
- Webhooks: Máximo 100 requests/minuto
- Tests: Máximo 10 requests/5 minutos
- Espera un momento e intenta de nuevo

---

## 📊 Logs del Servidor

### Flujo Normal

```
📩 Procesando mensaje en tenant tenant-ABC
   Cliente: 3001234567
   Mensaje: "sí"

💳 Generando enlace de pago para pedido #A3F5B2...
✅ Enlace de pago generado: https://checkout.wompi.co/l/ABC123

🔔 Procesando webhook de wompi para restaurante tenant-ABC
✅ Webhook validado correctamente
✅ Estado del pedido actualizado: confirmado
```

### Con Errores

```
❌ Error en createPaymentLink: Restaurante tenant-ABC no tiene gateway configurado
⚠️ Error generando enlace de pago: Gateway no configurado
   Continuando con flujo tradicional (sin pago)
```

---

## 🎯 Siguiente Paso

Una vez probado el flujo completo:

1. **FASE 4:** Implementar Dashboard UI
   - Formulario para configurar gateway
   - Input de credenciales
   - Toggle activar/desactivar pagos

2. **FASE 5:** Piloto con Restaurantes
   - Onboarding guiado
   - Testing en producción
   - Feedback y ajustes

---

## 📞 Soporte

¿Problemas? Revisa:
- [FASE-3-COMPLETADA.md](./FASE-3-COMPLETADA.md) - Documentación completa
- [02-ARQUITECTURA-TECNICA.md](./02-ARQUITECTURA-TECNICA.md) - Detalles técnicos
- Logs del servidor en consola

---

**¡El sistema está funcionando! 🚀💳**
