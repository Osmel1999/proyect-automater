# 💳 Solución: Wompi Marketplace (Split Payment)

**Fecha:** 22 de enero de 2026  
**Pregunta:** ¿Wompi puede enviar dinero directo a la cuenta del restaurante?  
**Respuesta:** SÍ, con Wompi Marketplace o Wompi Connect

---

## 🎯 La Solución Perfecta: Wompi Marketplace

### **Cómo funciona:**

```
Cliente paga $50.000 por WhatsApp
  ↓
Bot genera link de pago de Wompi
  ↓
Cliente abre link y paga (PSE, tarjeta, Nequi)
  ↓
Wompi DIVIDE el pago automáticamente:
  ├─ $47.500 (95%) → Cuenta del restaurante ✅
  └─ $2.500 (5%)   → Tu cuenta (comisión) ✅
  ↓
Webhook notifica a tu backend
  ↓
Bot confirma pedido al cliente
```

### **Ventajas ENORMES:**

1. ✅ **Dinero va DIRECTO al restaurante** (no pasa por ti)
2. ✅ **Tu comisión se retiene automáticamente**
3. ✅ **Validación 100% automática** (webhook de Wompi)
4. ✅ **Legal y fiscal limpio** (no intermedias dinero)
5. ✅ **Sin capturas de pantalla** (pago online)
6. ✅ **Sin OCR necesario**
7. ✅ **Sin credenciales del restaurante**

---

## 🏗️ Arquitectura con Wompi Marketplace

### **Flujo Completo:**

```
┌──────────────────────────────────────────────────────┐
│ 1. Cliente hace pedido por WhatsApp                 │
│    "Quiero 2 pizzas hawaianas"                      │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ 2. Bot confirma pedido                               │
│    "Total: $50.000"                                  │
│    "Genera link de pago"                             │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ 3. Backend llama a Wompi API                         │
│    - Crear pago con split                            │
│    - 95% → restaurante                               │
│    - 5% → tu cuenta                                  │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ 4. Bot envía link por WhatsApp                       │
│    "Paga aquí: https://wompi.co/l/abc123"           │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ 5. Cliente hace clic y paga                          │
│    - Se abre navegador o app                         │
│    - Elige método: PSE, tarjeta, Nequi              │
│    - Completa pago                                   │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ 6. Wompi divide el pago automáticamente              │
│    → $47.500 a cuenta del restaurante                │
│    → $2.500 a tu cuenta                              │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ 7. Wompi envía webhook a tu backend                 │
│    "Pago completado, pedido #123"                   │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ 8. Backend actualiza estado en Firebase             │
│    estado_pago: "pagado"                             │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ 9. Bot notifica al cliente                           │
│    "✅ Pago confirmado! Preparando tu pedido..."     │
└──────────────────────────────────────────────────────┘
```

---

## 💻 Implementación con Wompi Marketplace

### **Paso 1: Onboarding del Restaurante**

```javascript
// Dashboard del restaurante

<div class="wompi-setup">
  <h3>💳 Configurar Pagos Online con Wompi</h3>
  
  <p>Recibe pagos directamente en tu cuenta bancaria.</p>
  
  <label>Email registrado en Wompi:</label>
  <input type="email" id="wompi-email" placeholder="tu@email.com">
  
  <label>Número de cuenta bancaria:</label>
  <input type="text" id="banco-cuenta" placeholder="123456789">
  
  <label>Banco:</label>
  <select id="banco-nombre">
    <option>Bancolombia</option>
    <option>Davivienda</option>
    <option>Banco de Bogotá</option>
    <option>BBVA</option>
  </select>
  
  <button onclick="conectarWompi()">Conectar Wompi</button>
  
  <div class="info">
    <p>💡 Wompi enviará el dinero directo a tu cuenta.</p>
    <p>💰 Comisión: 2.99% + $900 COP (pagada por el cliente)</p>
    <p>⏱️ Dinero disponible: 24-48 horas</p>
  </div>
</div>

<script>
async function conectarWompi() {
  const email = document.getElementById('wompi-email').value;
  const cuenta = document.getElementById('banco-cuenta').value;
  const banco = document.getElementById('banco-nombre').value;
  
  // Llamar a tu backend para registrar en Wompi Marketplace
  const response = await fetch('/api/wompi/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurante_id: restauranteId,
      email,
      cuenta_bancaria: cuenta,
      banco
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('✅ Wompi configurado! Ya puedes recibir pagos online.');
  } else {
    alert('Error: ' + data.error);
  }
}
</script>
```

---

### **Paso 2: Backend - Registrar Restaurante en Wompi**

```javascript
// server/wompi-marketplace.js

const axios = require('axios');

const WOMPI_API_KEY = process.env.WOMPI_PRIVATE_KEY;
const WOMPI_BASE_URL = 'https://production.wompi.co/v1';

// Registrar restaurante como "merchant" en Wompi Marketplace
async function registrarMerchantWompi(restauranteData) {
  try {
    const response = await axios.post(
      `${WOMPI_BASE_URL}/merchants`,
      {
        email: restauranteData.email,
        legal_name: restauranteData.nombre_legal,
        bank_account: {
          account_number: restauranteData.cuenta_bancaria,
          account_type: 'savings', // o 'checking'
          bank_code: obtenerCodigoBanco(restauranteData.banco)
        },
        // Documentos requeridos
        documents: {
          rut: restauranteData.rut,
          cedula: restauranteData.cedula_representante
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WOMPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Guardar merchant_id en Firebase
    await db.collection('restaurantes').doc(restauranteData.id).update({
      wompi_merchant_id: response.data.data.id,
      wompi_configurado: true,
      wompi_fecha_config: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      merchant_id: response.data.data.id
    };
    
  } catch (error) {
    console.error('Error al registrar merchant:', error.response?.data);
    return {
      success: false,
      error: error.response?.data?.error?.reason || error.message
    };
  }
}

function obtenerCodigoBanco(nombreBanco) {
  const bancos = {
    'Bancolombia': '1007',
    'Davivienda': '1051',
    'Banco de Bogotá': '1001',
    'BBVA': '1013',
    // ... otros bancos
  };
  return bancos[nombreBanco] || '1007';
}
```

---

### **Paso 3: Generar Link de Pago con Split**

```javascript
// server/payment-handler.js

async function generarLinkPagoConSplit(pedido) {
  try {
    // Obtener datos del restaurante
    const restauranteDoc = await db.collection('restaurantes').doc(pedido.restaurante_id).get();
    const restaurante = restauranteDoc.data();
    
    if (!restaurante.wompi_merchant_id) {
      throw new Error('Restaurante no tiene Wompi configurado');
    }
    
    // Calcular split (tu comisión)
    const total = pedido.total;
    const comisionPorcentaje = 0.05; // 5%
    const tuComision = Math.round(total * comisionPorcentaje);
    const montoRestaurante = total - tuComision;
    
    // Crear pago con split
    const response = await axios.post(
      `${WOMPI_BASE_URL}/payment_links`,
      {
        name: `Pedido #${pedido.numero}`,
        description: `Pedido de ${pedido.cliente_nombre}`,
        single_use: true,
        amount_in_cents: total * 100,
        currency: 'COP',
        redirect_url: `https://kdsapp.site/pago-exitoso?pedido=${pedido.id}`,
        
        // 🎯 SPLIT PAYMENT
        split_payment: {
          enabled: true,
          splits: [
            {
              // Restaurante recibe 95%
              merchant_id: restaurante.wompi_merchant_id,
              amount_in_cents: montoRestaurante * 100,
              description: 'Venta de comida'
            },
            {
              // Tú recibes 5% (tu comisión)
              merchant_id: process.env.WOMPI_TU_MERCHANT_ID,
              amount_in_cents: tuComision * 100,
              description: 'Comisión plataforma KDS'
            }
          ]
        },
        
        // Metadata para identificar el pedido
        metadata: {
          pedido_id: pedido.id,
          restaurante_id: pedido.restaurante_id,
          cliente_telefono: pedido.cliente_telefono
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WOMPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const linkPago = response.data.data.permalink;
    
    // Guardar link en el pedido
    await db.collection('pedidos').doc(pedido.id).update({
      link_pago: linkPago,
      link_pago_id: response.data.data.id,
      metodo_pago: 'wompi_online',
      estado_pago: 'esperando_pago',
      split_configurado: {
        restaurante: montoRestaurante,
        plataforma: tuComision
      }
    });
    
    console.log('✅ Link de pago creado con split:', linkPago);
    return linkPago;
    
  } catch (error) {
    console.error('❌ Error al crear link de pago:', error.response?.data);
    throw error;
  }
}

module.exports = {
  generarLinkPagoConSplit
};
```

---

### **Paso 4: Bot Envía Link de Pago**

```javascript
// server/bot-logic.js

async function enviarLinkPagoPorWhatsApp(pedido) {
  try {
    const linkPago = await generarLinkPagoConSplit(pedido);
    
    const mensaje = `
✅ *Pedido Confirmado*

📋 *Pedido #${pedido.numero}*
${pedido.items.map(item => `- ${item.cantidad}x ${item.nombre}`).join('\n')}

💰 *Total:* $${pedido.total.toLocaleString()} COP

Para completar tu pedido, realiza el pago aquí:
👉 ${linkPago}

*Métodos de pago disponibles:*
💳 Tarjetas débito/crédito
🏦 PSE (todos los bancos)
📱 Nequi
🏦 Bancolombia

*Seguro y confiable* ✅
Una vez confirmado el pago, comenzaremos a preparar tu pedido 🍕

⏱️ Este link expira en 24 horas.
    `;
    
    await enviarMensajeWhatsApp(pedido.cliente_telefono, mensaje);
    
    console.log(`📤 Link de pago enviado al cliente ${pedido.cliente_telefono}`);
    
  } catch (error) {
    console.error('Error al enviar link de pago:', error);
    // Fallback: solicitar transferencia manual
    await solicitarTransferenciaManual(pedido);
  }
}
```

---

### **Paso 5: Webhook de Confirmación**

```javascript
// server/index.js

app.post('/webhook/wompi', async (req, res) => {
  try {
    const evento = req.body;
    
    console.log('📨 Webhook Wompi recibido:', evento.event);
    
    // Validar firma del webhook (seguridad)
    const esValido = validarFirmaWompi(req);
    if (!esValido) {
      console.error('❌ Firma de webhook inválida');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Procesar evento
    if (evento.event === 'transaction.updated') {
      const transaccion = evento.data.transaction;
      const pedidoId = transaccion.reference;
      
      console.log(`📊 Estado de transacción: ${transaccion.status}`);
      
      switch (transaccion.status) {
        case 'APPROVED':
          // ✅ PAGO EXITOSO
          await aprobarPagoWompi(pedidoId, transaccion);
          await notificarClientePagoExitoso(pedidoId);
          await notificarRestauranteNuevoPedido(pedidoId);
          break;
          
        case 'DECLINED':
        case 'ERROR':
          // ❌ PAGO FALLIDO
          await rechazarPagoWompi(pedidoId, transaccion);
          await notificarClientePagoFallido(pedidoId);
          break;
          
        case 'PENDING':
          // ⏳ PAGO PENDIENTE (PSE puede tardar)
          await actualizarEstadoPendiente(pedidoId);
          break;
      }
    }
    
    // Responder a Wompi (importante)
    res.json({ received: true });
    
  } catch (error) {
    console.error('Error en webhook Wompi:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validar firma del webhook
function validarFirmaWompi(req) {
  const crypto = require('crypto');
  const signature = req.headers['x-wompi-signature'];
  const timestamp = req.headers['x-wompi-timestamp'];
  
  if (!signature || !timestamp) {
    return false;
  }
  
  // Concatenar timestamp + body
  const payload = timestamp + JSON.stringify(req.body);
  
  // Calcular HMAC SHA256
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WOMPI_EVENT_SECRET)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
}

// Aprobar pago
async function aprobarPagoWompi(pedidoId, transaccion) {
  await db.collection('pedidos').doc(pedidoId).update({
    estado_pago: 'pagado',
    estado: 'confirmado',
    pago_wompi: {
      transaccion_id: transaccion.id,
      metodo: transaccion.payment_method_type,
      monto: transaccion.amount_in_cents / 100,
      fecha: transaccion.finalized_at,
      referencia: transaccion.reference
    },
    pago_confirmado_at: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log(`✅ Pedido ${pedidoId} pagado exitosamente`);
}

// Notificar cliente
async function notificarClientePagoExitoso(pedidoId) {
  const pedidoDoc = await db.collection('pedidos').doc(pedidoId).get();
  const pedido = pedidoDoc.data();
  
  const mensaje = `
✅ *¡Pago Confirmado!*

Tu pago de *$${pedido.total.toLocaleString()} COP* ha sido procesado exitosamente.

🍕 *¡Estamos preparando tu pedido!*
⏱️ Tiempo estimado: ${pedido.tiempo_preparacion || '30-40'} minutos

Pedido #${pedido.numero}

¡Gracias por tu compra! 🙌
  `;
  
  await enviarMensajeWhatsApp(pedido.cliente_telefono, mensaje);
}
```

---

## 💰 Costos con Wompi Marketplace

### **Comisiones:**

```
Pedido: $50.000 COP

Comisión Wompi: 2.99% + $900 = $2.395
Total pagado por cliente: $50.000 + $2.395 = $52.395

Split automático:
├─ Restaurante recibe: $47.500 (95% de $50k)
├─ Tú recibes: $2.500 (5% de $50k)
└─ Wompi retiene: $2.395 (su comisión)

Resumen:
- Cliente paga: $52.395
- Restaurante recibe: $47.500
- Tú recibes: $2.500
- Wompi recibe: $2.395
```

### **Comparativa:**

| Concepto | Manual | Wompi Marketplace |
|----------|--------|-------------------|
| **Validación** | 2-5 min | Instantánea |
| **Tu comisión** | Cobro manual | Automática |
| **Dinero al restaurante** | Transferencia manual | Directo 24-48h |
| **Fraude** | Alto riesgo | Cero riesgo |
| **Costo cliente** | $0 | +$2.395 (4.8%) |
| **Tu ganancia** | $2.500 | $2.500 |

---

## ✅ Ventajas de Wompi Marketplace

### **Vs Nequi API con credenciales:**
- ✅ Sin credenciales del restaurante
- ✅ Sin riesgos de seguridad
- ✅ Setup más simple

### **Vs OCR + Manual:**
- ✅ 100% automático
- ✅ Sin intervención humana
- ✅ Validación instantánea
- ✅ Cero fraude

### **Vs Flujo centralizado:**
- ✅ Legal (no intermedias)
- ✅ Fiscal limpio
- ✅ Sin transferencias manuales
- ✅ Sin liquidez necesaria

### **Modelo de negocio:**
- ✅ Tu comisión se retiene automáticamente
- ✅ No dependes de cobro manual
- ✅ Escalable infinitamente

---

## ⚠️ Desventajas

1. **Cliente debe salir de WhatsApp**
   - Abre link en navegador
   - Interrumpe la conversación
   - Puede abandonar (aunque es raro)

2. **Comisión visible para el cliente**
   - $50k se convierte en $52.395
   - Cliente ve el incremento
   - Puede parecer caro

3. **Wompi debe aprobar al restaurante**
   - Verificación de documentos
   - Puede tomar 2-3 días
   - No todos los negocios califican

4. **Disponibilidad del dinero**
   - Restaurante recibe en 24-48h
   - No es inmediato
   - Puede ser problema para liquidez

---

## 🎯 Comparativa Final: 3 Opciones

| | OCR + Manual | Nequi API (creds) | Wompi Marketplace |
|---|---|---|---|
| **Automatización** | ❌ Manual | ✅ 99% | ✅ 100% |
| **Seguridad** | ✅ Alta | ⚠️ Media | ✅ Alta |
| **Setup restaurante** | 5 min | 1-3 días | 2-3 días |
| **Credenciales sensibles** | ❌ No | ✅ Sí | ❌ No |
| **Cliente sale de WhatsApp** | ❌ No | ❌ No | ✅ Sí |
| **Costo cliente** | $0 | $0 | +4.8% |
| **Tu comisión** | Manual | Manual | ✅ Automática |
| **Legal/fiscal** | ✅ Limpio | ✅ Limpio | ✅ Limpio |
| **Fraude** | Medio | Bajo | Muy bajo |
| **Recomendación** | MVP | Premium | **MEJOR** |

---

## 🏆 MI RECOMENDACIÓN FINAL ACTUALIZADA

### **OPCIÓN 1: Wompi Marketplace** ⭐ MEJOR

```
✅ Implementar PRIMERO
✅ 100% automático
✅ Tu comisión se retiene sola
✅ Dinero directo al restaurante
✅ Sin credenciales sensibles
✅ Validación instantánea
✅ Escalable infinitamente

Desventaja: Cliente paga +4.8%
Solución: Transparencia ("Incluye procesamiento seguro")
```

### **OPCIÓN 2: OCR + Manual (Fallback)**

```
✅ Para clientes que no quieren pagar comisión
✅ Para restaurantes sin Wompi aprobado
✅ Para emergencias si Wompi falla

Mantenerlo como backup
```

---

## 📋 Plan de Implementación

### **Fase 1: Wompi Marketplace (Semana 1-2)**
```
✅ Crear cuenta Wompi Marketplace
✅ Registrar tu aplicación
✅ Implementar registro de merchants (restaurantes)
✅ Implementar generación de links con split
✅ Implementar webhook de confirmación
✅ Dashboard para restaurantes
✅ Documentación de onboarding
```

### **Fase 2: OCR + Manual (Semana 3)**
```
✅ Implementar como fallback
✅ Para quienes no tienen Wompi
✅ Para métodos alternativos
```

---

## ✅ Conclusión

### **Respuesta a tu pregunta:**

> "¿Wompi puede enviar dinero directo al restaurante?"

**SÍ, con Wompi Marketplace:**
- ✅ Dinero va DIRECTO a su cuenta bancaria
- ✅ Tu comisión se retiene automáticamente
- ✅ Sin credenciales del restaurante
- ✅ Legal, fiscal y técnicamente perfecto

**Es la mejor solución para tu caso de uso** 🎯

---

**¿Procedo con implementación de Wompi Marketplace?**

Tiempo: 2 semanas  
Costo: $0 setup + 2.99% por transacción (paga el cliente)  
Efectividad: 100% automático  
Complejidad: Media  
Resultado: **Solución profesional y escalable** ✅

