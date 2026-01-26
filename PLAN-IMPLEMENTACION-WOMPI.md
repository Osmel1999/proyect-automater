# 🚀 Plan de Implementación: Wompi Marketplace como Solución Principal

**Fecha:** 22 de enero de 2026  
**Decisión:** Usar Wompi Marketplace (Split Payment) como solución principal de pagos  
**Estado:** Listo para implementar

---

## 🎯 Decisión Estratégica

### **Por qué Wompi Marketplace en lugar de Nequi API:**

| Criterio | Nequi API | Wompi Marketplace |
|----------|-----------|-------------------|
| **Dinero directo al restaurante** | ✅ Sí | ✅ Sí |
| **Tu comisión** | ❌ Manual | ✅ **Automática** |
| **Credenciales sensibles** | ⚠️ Sí (riesgoso) | ✅ No |
| **Validación** | ✅ API | ✅ Webhook |
| **Setup restaurante** | 1-3 días | 2-3 días |
| **Cliente sale de WhatsApp** | ❌ No | ⚠️ Sí |
| **Costo para cliente** | $0 | +4.8% |
| **Fraude** | Bajo | Muy bajo |
| **Escalabilidad** | Media | ✅ **Infinita** |
| **Legal/fiscal** | ✅ Limpio | ✅ **Limpio** |

### **Conclusión:**
Wompi Marketplace es la solución más profesional, escalable y segura para un SaaS multi-tenant.

---

## 🏗️ Arquitectura del Sistema

### **Modelo de Planes:**

```
┌─────────────────────────────────────────────────────┐
│ PLAN BÁSICO (Gratis)                                │
│ - Transfer manual + OCR                             │
│ - Validación manual (dashboard)                     │
│ - 2-5 min de aprobación                             │
│ - Cliente NO sale de WhatsApp                       │
│ - Sin costo extra al cliente                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ PLAN PREMIUM ($50k/mes o 5% comisión)               │
│ - Pagos online con Wompi                            │
│ - Validación 100% automática                        │
│ - Split automático: 95% restaurante + 5% tú         │
│ - Cliente sale de WhatsApp (link)                   │
│ - Cliente paga +4.8% (comisión Wompi)               │
└─────────────────────────────────────────────────────┘
```

### **Flujo Técnico: Plan Premium (Wompi)**

```
1. Cliente hace pedido por WhatsApp
   "Quiero 2 pizzas hawaianas"
   ↓
2. Bot confirma pedido y total
   "Total: $50.000 COP"
   ↓
3. Backend genera link de pago Wompi con split
   POST /v1/payment_links
   split_payment: {
     restaurante: 95% ($47.500),
     plataforma: 5% ($2.500)
   }
   ↓
4. Bot envía link al cliente
   "Paga aquí: https://wompi.co/l/abc123"
   "Métodos: PSE, tarjeta, Nequi, Bancolombia"
   ↓
5. Cliente hace clic (sale de WhatsApp)
   ↓
6. Cliente completa pago en Wompi
   - Elige método (PSE/tarjeta/Nequi)
   - Paga $52.395 (incluye comisión Wompi)
   ↓
7. Wompi procesa y divide automáticamente
   $47.500 → Cuenta del restaurante
   $2.500 → Tu cuenta
   $2.395 → Comisión Wompi
   ↓
8. Wompi envía webhook a tu backend
   POST /webhook/wompi
   { status: "APPROVED", pedido_id: "123" }
   ↓
9. Backend actualiza Firebase
   estado_pago: "pagado"
   metodo_pago: "wompi_online"
   split: { restaurante: 47500, plataforma: 2500 }
   ↓
10. Bot notifica al cliente
    "✅ Pago confirmado! Preparando tu pedido..."
    ↓
11. Dashboard del restaurante se actualiza
    Pedido visible en KDS para cocinar
```

### **Flujo Técnico: Plan Básico (OCR + Manual)**

```
1. Cliente hace pedido por WhatsApp
   ↓
2. Bot envía cuenta del restaurante
   "Transfiere $50.000 a Nequi: 300-123-4567"
   ↓
3. Cliente transfiere manualmente
   ↓
4. Cliente envía captura por WhatsApp
   ↓
5. Backend recibe imagen
   ↓
6. OCR extrae datos (Google Vision API)
   { monto: 50000, fecha: "2026-01-22", banco: "Nequi" }
   ↓
7. Pre-validación automática
   - Monto correcto?
   - Fecha reciente?
   - Imagen duplicada?
   ↓
8. Dashboard muestra para aprobación manual
   Restaurante ve: captura + datos OCR
   ↓
9. Restaurante aprueba/rechaza
   ↓
10. Firebase actualiza estado
    ↓
11. Bot notifica al cliente
```

---

## 💻 Implementación Técnica

### **Fase 1: Backend - Integración Wompi API**

#### **1.1 Registro de Restaurantes (Merchants)**

```javascript
// server/wompi/register-merchant.js

const axios = require('axios');

const WOMPI_API_KEY = process.env.WOMPI_PRIVATE_KEY;
const WOMPI_BASE_URL = 'https://production.wompi.co/v1';

/**
 * Registra un restaurante como "merchant" en Wompi Marketplace
 */
async function registrarRestauranteWompi(restauranteData) {
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
    
    const merchantId = response.data.data.id;
    
    // Guardar en Firebase
    await db.collection('restaurantes').doc(restauranteData.id).update({
      wompi_merchant_id: merchantId,
      wompi_configurado: true,
      wompi_fecha_config: admin.firestore.FieldValue.serverTimestamp(),
      plan: 'premium'
    });
    
    console.log(`✅ Restaurante ${restauranteData.nombre} registrado en Wompi: ${merchantId}`);
    
    return { success: true, merchant_id: merchantId };
    
  } catch (error) {
    console.error('❌ Error al registrar merchant:', error.response?.data);
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
    'Banco de Occidente': '1023',
    'Banco Popular': '1002',
    'ITAÚ': '1006',
    'Banco Agrario': '1040',
    'Banco Caja Social': '1032',
    'Banco AV Villas': '1052'
  };
  return bancos[nombreBanco] || '1007';
}

module.exports = { registrarRestauranteWompi };
```

#### **1.2 Generación de Links de Pago con Split**

```javascript
// server/wompi/create-payment-link.js

async function generarLinkPagoWompi(pedido) {
  try {
    // Obtener merchant_id del restaurante
    const restauranteDoc = await db.collection('restaurantes')
      .doc(pedido.restaurante_id)
      .get();
    
    const restaurante = restauranteDoc.data();
    
    if (!restaurante.wompi_merchant_id) {
      throw new Error('Restaurante no tiene Wompi configurado');
    }
    
    // Calcular split
    const total = pedido.total;
    const comisionPorcentaje = 0.05; // 5%
    const tuComision = Math.round(total * comisionPorcentaje);
    const montoRestaurante = total - tuComision;
    
    // Crear payment link con split
    const response = await axios.post(
      `${WOMPI_BASE_URL}/payment_links`,
      {
        name: `Pedido #${pedido.numero}`,
        description: `Pedido de ${pedido.cliente_nombre || 'Cliente'}`,
        single_use: true, // Link de un solo uso
        amount_in_cents: total * 100,
        currency: 'COP',
        redirect_url: `https://kdsapp.site/pago-exitoso?pedido=${pedido.id}`,
        
        // 🎯 SPLIT PAYMENT - LA MAGIA OCURRE AQUÍ
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
              // Tú recibes 5%
              merchant_id: process.env.WOMPI_TU_MERCHANT_ID,
              amount_in_cents: tuComision * 100,
              description: 'Comisión plataforma KDS'
            }
          ]
        },
        
        // Metadata para tracking
        metadata: {
          pedido_id: pedido.id,
          restaurante_id: pedido.restaurante_id,
          cliente_telefono: pedido.cliente_telefono,
          items: JSON.stringify(pedido.items)
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
    const linkId = response.data.data.id;
    
    // Guardar en Firebase
    await db.collection('pedidos').doc(pedido.id).update({
      link_pago: linkPago,
      link_pago_id: linkId,
      metodo_pago: 'wompi_online',
      estado_pago: 'esperando_pago',
      split_configurado: {
        restaurante: montoRestaurante,
        plataforma: tuComision,
        porcentaje_comision: comisionPorcentaje * 100
      },
      link_generado_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Link de pago creado: ${linkPago}`);
    
    return {
      success: true,
      link: linkPago,
      link_id: linkId,
      split: {
        restaurante: montoRestaurante,
        plataforma: tuComision
      }
    };
    
  } catch (error) {
    console.error('❌ Error al crear link de pago:', error.response?.data);
    throw error;
  }
}

module.exports = { generarLinkPagoWompi };
```

#### **1.3 Webhook de Confirmación**

```javascript
// server/webhooks/wompi.js

const crypto = require('crypto');

/**
 * Valida la firma del webhook de Wompi
 */
function validarFirmaWompi(req) {
  const { signature, timestamp, event } = req.body;
  
  const payload = `${timestamp}.${event}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WOMPI_EVENTS_SECRET)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
}

/**
 * Procesa webhook de Wompi
 */
app.post('/webhook/wompi', async (req, res) => {
  try {
    console.log('📨 Webhook Wompi recibido:', req.body.event);
    
    // Validar firma
    const esValido = validarFirmaWompi(req);
    if (!esValido) {
      console.error('❌ Firma de webhook inválida');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const evento = req.body;
    
    // Procesar evento de transacción actualizada
    if (evento.event === 'transaction.updated') {
      const transaccion = evento.data.transaction;
      const pedidoId = transaccion.metadata?.pedido_id;
      
      if (!pedidoId) {
        console.error('❌ Webhook sin pedido_id');
        return res.status(400).json({ error: 'Missing pedido_id' });
      }
      
      // Actualizar estado según status de Wompi
      if (transaccion.status === 'APPROVED') {
        // ✅ PAGO APROBADO
        await db.collection('pedidos').doc(pedidoId).update({
          estado_pago: 'pagado',
          pago_aprobado_at: admin.firestore.FieldValue.serverTimestamp(),
          wompi_transaction_id: transaccion.id,
          wompi_reference: transaccion.reference,
          wompi_payment_method: transaccion.payment_method_type
        });
        
        // Notificar al cliente por WhatsApp
        const pedido = (await db.collection('pedidos').doc(pedidoId).get()).data();
        await notificarPagoAprobado(pedido);
        
        console.log(`✅ Pago aprobado para pedido ${pedidoId}`);
        
      } else if (transaccion.status === 'DECLINED') {
        // ❌ PAGO RECHAZADO
        await db.collection('pedidos').doc(pedidoId).update({
          estado_pago: 'rechazado',
          pago_rechazado_at: admin.firestore.FieldValue.serverTimestamp(),
          wompi_decline_reason: transaccion.status_message
        });
        
        // Notificar al cliente
        const pedido = (await db.collection('pedidos').doc(pedidoId).get()).data();
        await notificarPagoRechazado(pedido);
        
        console.log(`❌ Pago rechazado para pedido ${pedidoId}`);
      }
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

async function notificarPagoAprobado(pedido) {
  const mensaje = `
✅ *¡Pago Confirmado!*

Tu pedido #${pedido.numero} ha sido aprobado.

Estamos preparando tu pedido 🍕

Tiempo estimado: ${pedido.tiempo_estimado || '30-40'} minutos

¡Gracias por tu compra! 🙏
  `;
  
  await enviarMensajeWhatsApp(pedido.cliente_telefono, mensaje);
}

async function notificarPagoRechazado(pedido) {
  const mensaje = `
❌ *Pago No Procesado*

Tu pago para el pedido #${pedido.numero} no pudo ser procesado.

Por favor intenta nuevamente:
${pedido.link_pago}

O contacta con el restaurante si necesitas ayuda.
  `;
  
  await enviarMensajeWhatsApp(pedido.cliente_telefono, mensaje);
}

module.exports = { validarFirmaWompi };
```

#### **1.4 Integración en el Bot de WhatsApp**

```javascript
// server/bot-logic.js

async function procesarPedidoConfirmado(pedido) {
  try {
    const restaurante = (await db.collection('restaurantes')
      .doc(pedido.restaurante_id)
      .get()).data();
    
    // Verificar si el restaurante tiene plan Premium (Wompi)
    if (restaurante.plan === 'premium' && restaurante.wompi_configurado) {
      // ✅ PLAN PREMIUM: Generar link de pago Wompi
      await enviarLinkPagoWompi(pedido);
    } else {
      // 📸 PLAN BÁSICO: Solicitar transferencia manual
      await solicitarTransferenciaManual(pedido, restaurante);
    }
    
  } catch (error) {
    console.error('Error al procesar pedido:', error);
    // Fallback: siempre solicitar transferencia manual
    await solicitarTransferenciaManual(pedido, restaurante);
  }
}

async function enviarLinkPagoWompi(pedido) {
  try {
    // Generar link con split
    const resultado = await generarLinkPagoWompi(pedido);
    
    const mensaje = `
✅ *Pedido Confirmado*

📋 *Pedido #${pedido.numero}*
${pedido.items.map(item => `- ${item.cantidad}x ${item.nombre}`).join('\n')}

💰 *Total:* $${pedido.total.toLocaleString()} COP

Para completar tu pedido, realiza el pago aquí:
👉 ${resultado.link}

*Métodos de pago disponibles:*
💳 Tarjetas débito/crédito
🏦 PSE (todos los bancos)
📱 Nequi
🏦 Bancolombia

*Pago seguro con Wompi* 🔒
Una vez confirmado el pago, comenzaremos a preparar tu pedido inmediatamente 🍕

⏱️ Este link expira en 24 horas.
    `;
    
    await enviarMensajeWhatsApp(pedido.cliente_telefono, mensaje);
    
    console.log(`📤 Link de pago Wompi enviado a ${pedido.cliente_telefono}`);
    
  } catch (error) {
    console.error('Error al enviar link Wompi:', error);
    // Fallback: transferencia manual
    await solicitarTransferenciaManual(pedido);
  }
}

async function solicitarTransferenciaManual(pedido, restaurante) {
  const mensaje = `
✅ *Pedido Confirmado*

📋 *Pedido #${pedido.numero}*
${pedido.items.map(item => `- ${item.cantidad}x ${item.nombre}`).join('\n')}

💰 *Total:* $${pedido.total.toLocaleString()} COP

Por favor realiza la transferencia a:
📱 Nequi: ${restaurante.nequi_numero || restaurante.telefono}
👤 Nombre: ${restaurante.nombre}

*Después de transferir, envía la captura de pantalla.*

Una vez validemos tu pago, comenzaremos a preparar tu pedido 🍕
  `;
  
  await enviarMensajeWhatsApp(pedido.cliente_telefono, mensaje);
  
  // Actualizar estado
  await db.collection('pedidos').doc(pedido.id).update({
    metodo_pago: 'transferencia_manual',
    estado_pago: 'esperando_comprobante'
  });
}
```

---

### **Fase 2: Dashboard - Configuración de Wompi**

#### **2.1 UI de Onboarding para Restaurantes**

```html
<!-- dashboard-wompi-config.html -->

<div class="wompi-setup-card">
  <h2>💳 Configurar Pagos Online con Wompi</h2>
  
  <p class="description">
    Activa pagos online para recibir el dinero <strong>directo en tu cuenta bancaria</strong> 
    en 24-48 horas. Tu cliente podrá pagar con PSE, tarjeta, Nequi o Bancolombia.
  </p>
  
  <div class="benefits">
    <div class="benefit">
      <span class="icon">✅</span>
      <span>Validación automática</span>
    </div>
    <div class="benefit">
      <span class="icon">⚡</span>
      <span>Confirma pedidos al instante</span>
    </div>
    <div class="benefit">
      <span class="icon">🏦</span>
      <span>Dinero directo a tu cuenta</span>
    </div>
    <div class="benefit">
      <span class="icon">🔒</span>
      <span>Pago 100% seguro</span>
    </div>
  </div>
  
  <form id="wompi-config-form">
    <div class="form-group">
      <label>Email registrado en Wompi *</label>
      <input type="email" id="wompi-email" required 
             placeholder="tu@restaurante.com">
      <small>Si no tienes cuenta, <a href="https://wompi.co/register" target="_blank">regístrate aquí</a></small>
    </div>
    
    <div class="form-group">
      <label>Nombre legal del negocio *</label>
      <input type="text" id="nombre-legal" required 
             placeholder="Restaurante Pizza Deliciosa S.A.S.">
    </div>
    
    <div class="form-group">
      <label>RUT (Registro Único Tributario) *</label>
      <input type="text" id="rut" required 
             placeholder="900123456-7">
    </div>
    
    <div class="form-group">
      <label>Cédula del representante legal *</label>
      <input type="text" id="cedula" required 
             placeholder="1234567890">
    </div>
    
    <div class="form-group">
      <label>Banco *</label>
      <select id="banco" required>
        <option value="">Selecciona tu banco</option>
        <option value="Bancolombia">Bancolombia</option>
        <option value="Davivienda">Davivienda</option>
        <option value="Banco de Bogotá">Banco de Bogotá</option>
        <option value="BBVA">BBVA</option>
        <option value="Banco de Occidente">Banco de Occidente</option>
        <option value="Banco Popular">Banco Popular</option>
        <option value="ITAÚ">ITAÚ</option>
        <option value="Banco Agrario">Banco Agrario</option>
        <option value="Banco Caja Social">Banco Caja Social</option>
        <option value="Banco AV Villas">Banco AV Villas</option>
      </select>
    </div>
    
    <div class="form-group">
      <label>Número de cuenta bancaria *</label>
      <input type="text" id="cuenta-bancaria" required 
             placeholder="123456789">
    </div>
    
    <div class="form-group">
      <label>Tipo de cuenta *</label>
      <select id="tipo-cuenta" required>
        <option value="savings">Ahorros</option>
        <option value="checking">Corriente</option>
      </select>
    </div>
    
    <div class="info-box">
      <h4>💰 Comisiones:</h4>
      <ul>
        <li><strong>Cliente paga:</strong> 2.99% + $900 COP</li>
        <li><strong>Tú recibes:</strong> 95% del pedido</li>
        <li><strong>Plataforma:</strong> 5% del pedido</li>
      </ul>
      <p>Ejemplo: Pedido de $50.000</p>
      <ul>
        <li>Cliente paga: $52.395</li>
        <li>Tú recibes: $47.500</li>
        <li>Plataforma: $2.500</li>
        <li>Wompi: $2.395</li>
      </ul>
    </div>
    
    <button type="submit" class="btn-primary">
      Conectar Wompi
    </button>
  </form>
  
  <div id="wompi-status" style="display: none;">
    <div class="success-message">
      <h3>✅ Wompi Configurado</h3>
      <p>Tu cuenta está conectada y lista para recibir pagos online.</p>
      <p><strong>Merchant ID:</strong> <span id="merchant-id"></span></p>
      <button onclick="desconectarWompi()" class="btn-secondary">
        Desconectar Wompi
      </button>
    </div>
  </div>
</div>

<script>
document.getElementById('wompi-config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    email: document.getElementById('wompi-email').value,
    nombre_legal: document.getElementById('nombre-legal').value,
    rut: document.getElementById('rut').value,
    cedula_representante: document.getElementById('cedula').value,
    banco: document.getElementById('banco').value,
    cuenta_bancaria: document.getElementById('cuenta-bancaria').value,
    tipo_cuenta: document.getElementById('tipo-cuenta').value
  };
  
  try {
    mostrarLoader('Configurando Wompi...');
    
    const response = await fetch('/api/wompi/register-merchant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        restaurante_id: getRestauranteId(),
        ...formData
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      mostrarExito('✅ Wompi configurado exitosamente!');
      document.getElementById('wompi-config-form').style.display = 'none';
      document.getElementById('wompi-status').style.display = 'block';
      document.getElementById('merchant-id').textContent = data.merchant_id;
      
      // Actualizar plan a Premium
      await actualizarPlan('premium');
    } else {
      mostrarError('Error: ' + data.error);
    }
    
  } catch (error) {
    console.error('Error al configurar Wompi:', error);
    mostrarError('Error al conectar con Wompi. Intenta nuevamente.');
  } finally {
    ocultarLoader();
  }
});
</script>
```

---

### **Fase 3: Implementación del Plan Básico (Fallback)**

Ya está implementado en documentos anteriores (OCR + validación manual). Se mantiene como respaldo para restaurantes que:
- No quieren pagar comisión de pasarela
- Prefieren transferencias directas
- Están en proceso de aprobación de Wompi

---

## 📅 Plan de Implementación

### **Semana 1: Backend Wompi**
- [ ] Día 1-2: Configurar cuenta Wompi Marketplace
- [ ] Día 3-4: Implementar endpoints de registro de merchants
- [ ] Día 4-5: Implementar generación de payment links con split
- [ ] Día 5-6: Implementar webhook de confirmación
- [ ] Día 7: Testing unitario de API

### **Semana 2: Frontend + Integración Bot**
- [ ] Día 8-9: UI de configuración Wompi en dashboard
- [ ] Día 10-11: Integrar bot con Wompi (envío de links)
- [ ] Día 12-13: Dashboard de monitoreo de pagos
- [ ] Día 14: Testing end-to-end

### **Semana 3: Pruebas y Lanzamiento**
- [ ] Día 15-16: Pruebas con restaurante piloto
- [ ] Día 17-18: Ajustes y optimizaciones
- [ ] Día 19-20: Documentación y capacitación
- [ ] Día 21: Lanzamiento oficial

---

## 💰 Costos Estimados

### **Desarrollo:**
- Tiempo: 3 semanas
- Costo: $0 (desarrollo propio)

### **Operación (por 1,000 pedidos/mes):**
- Wompi: $0 (paga el cliente)
- Tu comisión: $2.500 x 1,000 = $2.500.000 COP/mes 🎯
- Wompi retiene: ~$2.400.000 COP/mes (cobrado al cliente)

### **ROI:**
- Inmediato: tu comisión se retiene automáticamente
- Sin costos de personal para validación manual
- Escalable sin incremento de costos

---

## ✅ Próximos Pasos

1. **Registrarte como Marketplace en Wompi**
   - Crear cuenta empresarial
   - Solicitar habilitación de Split Payment
   - Obtener API keys (production)

2. **Implementar backend**
   - Endpoints de registro de merchants
   - Endpoints de generación de payment links
   - Webhook handler

3. **Actualizar dashboard**
   - Sección de configuración Wompi
   - Visualización de comisiones retenidas

4. **Probar con 1 restaurante piloto**
   - Onboarding completo
   - Primer pago con split
   - Validar webhook

5. **Escalar a más restaurantes**
   - Documentación de onboarding
   - Soporte para aprobaciones
   - Marketing del Plan Premium

---

## 📚 Referencias

- [Documentación Wompi Marketplace](https://docs.wompi.co/docs/en/marketplace)
- [API Split Payment](https://docs.wompi.co/docs/en/pagos-multiples)
- [Webhooks](https://docs.wompi.co/docs/en/webhooks)
- [Códigos de Bancos Colombia](https://docs.wompi.co/docs/en/codigos-bancos)

---

**🚀 Listo para implementar. Esta es la solución definitiva para tu SaaS.**
