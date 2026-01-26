# 🏗️ Arquitectura Multi-Gateway - Validación de Pagos Descentralizada

**Fecha:** 23 de enero de 2026  
**Modelo:** SaaS con mensualidad fija (sin comisión por transacción)  
**Enfoque:** Agnóstico a pasarela de pagos

---

## 🎯 CONCEPTO CLAVE

**NO cobras comisión por transacción → NO necesitas split payment**

Tu modelo de negocio:
- ✅ Mensualidad fija al restaurante ($50k-$150k/mes según plan)
- ✅ Cada restaurante usa SU propia cuenta de pasarela
- ✅ Tu sistema solo **valida** el pago vía webhook
- ✅ Dinero va 100% directo al restaurante

**Ventaja:** Puedes soportar **cualquier pasarela** (Wompi, Bold, PayU, Mercado Pago, etc.)

---

## 🚀 ARQUITECTURA MODULAR

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                    TU SISTEMA (SaaS)                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Gateway Manager (Abstracción)                │  │
│  │                                                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │  │
│  │  │  Wompi   │  │   Bold   │  │  PayU    │  ...    │  │
│  │  │ Adapter  │  │ Adapter  │  │ Adapter  │         │  │
│  │  └──────────┘  └──────────┘  └──────────┘         │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│                  Webhook Router                             │
│                           ↓                                 │
│              Validación → WhatsApp Bot                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │Restaurant│        │Restaurant│        │Restaurant│
  │    A     │        │    B     │        │    C     │
  │          │        │          │        │          │
  │ Wompi    │        │ Bold     │        │ PayU     │
  │ Account  │        │ Account  │        │ Account  │
  └──────────┘        └──────────┘        └──────────┘
```

---

## 💡 VENTAJAS DE ESTE MODELO

### 1. **Flexibilidad Total**
- ✅ Cada restaurante elige la pasarela que prefiera
- ✅ Puedes negociar comisiones con múltiples proveedores
- ✅ No dependes de una sola plataforma

### 2. **Menor Fricción**
```
Restaurante ya tiene Bold → Usa Bold
Restaurante prefiere Wompi → Usa Wompi
Restaurante quiere PayU → Usa PayU
```

### 3. **Legal y Fiscalmente Limpio**
- ✅ Nunca tocas el dinero del cliente
- ✅ Cada restaurante maneja su propia facturación
- ✅ Tú solo cobras la mensualidad del servicio

### 4. **Escalabilidad**
- ✅ Agregar nuevo gateway = crear un adapter
- ✅ Sin límite de restaurantes
- ✅ Sin límite de transacciones

### 5. **Competitivo en Costos**
```
Bold:     1.79% + $500  ← Más barato que Wompi
Wompi:    2.65% + $700
PayU:     2.99% + $900
```
El restaurante puede elegir el más económico para su caso.

---

## 🏗️ IMPLEMENTACIÓN TÉCNICA

### 1. Configuración por Restaurante

```javascript
// Firestore: restaurants/{restaurant_id}
{
  id: "rest_001",
  name: "Pizzería Don Mario",
  
  // Configuración del gateway elegido
  payment_gateway: {
    provider: "wompi", // o "bold", "payu", "mercadopago"
    config: {
      public_key: "pub_prod_xxxxx",
      private_key: "prv_prod_xxxxx", // Encriptado
      webhook_secret: "secret_xxxxx"
    },
    status: "active"
  },
  
  // Tu modelo de negocio
  subscription: {
    plan: "premium",
    monthly_fee: 100000,
    status: "active",
    next_billing_date: "2026-02-23"
  }
}
```

---

### 2. Gateway Manager (Abstracción)

```javascript
// server/services/GatewayManager.js

class GatewayManager {
  constructor() {
    this.adapters = {
      wompi: new WompiAdapter(),
      bold: new BoldAdapter(),
      payu: new PayUAdapter(),
      mercadopago: new MercadoPagoAdapter()
    };
  }

  // Interfaz unificada
  async createPaymentLink(restaurantId, orderData) {
    const restaurant = await getRestaurant(restaurantId);
    const provider = restaurant.payment_gateway.provider;
    const adapter = this.adapters[provider];
    
    return await adapter.createPaymentLink(
      restaurant.payment_gateway.config,
      orderData
    );
  }

  async verifyWebhook(provider, payload, signature, secret) {
    const adapter = this.adapters[provider];
    return await adapter.verifyWebhook(payload, signature, secret);
  }

  async getTransactionStatus(restaurantId, transactionId) {
    const restaurant = await getRestaurant(restaurantId);
    const provider = restaurant.payment_gateway.provider;
    const adapter = this.adapters[provider];
    
    return await adapter.getTransactionStatus(
      restaurant.payment_gateway.config,
      transactionId
    );
  }
}

module.exports = new GatewayManager();
```

---

### 3. Adapters (Uno por Gateway)

#### Wompi Adapter
```javascript
// server/adapters/WompiAdapter.js

class WompiAdapter {
  async createPaymentLink(config, orderData) {
    const response = await fetch('https://production.wompi.co/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.private_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Pedido #${orderData.order_id}`,
        description: orderData.description,
        single_use: true,
        collect_shipping: false,
        amount_in_cents: orderData.amount * 100,
        currency: 'COP',
        redirect_url: orderData.redirect_url
      })
    });
    
    const data = await response.json();
    return {
      provider: 'wompi',
      payment_url: data.data.permalink,
      payment_id: data.data.id
    };
  }

  async verifyWebhook(payload, signature, secret) {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return hash === signature;
  }

  async getTransactionStatus(config, transactionId) {
    const response = await fetch(
      `https://production.wompi.co/v1/transactions/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.public_key}`
        }
      }
    );
    
    const data = await response.json();
    return {
      status: data.data.status, // APPROVED, DECLINED, PENDING
      amount: data.data.amount_in_cents / 100,
      reference: data.data.reference
    };
  }
}
```

#### Bold Adapter
```javascript
// server/adapters/BoldAdapter.js

class BoldAdapter {
  async createPaymentLink(config, orderData) {
    // Bold tiene menor comisión: 1.79% + $500
    const response = await fetch('https://api.bold.co/v1/payment_links', {
      method: 'POST',
      headers: {
        'x-api-key': config.api_key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: orderData.order_id,
        description: orderData.description,
        amount: orderData.amount,
        currency: 'COP',
        redirectUrl: orderData.redirect_url
      })
    });
    
    const data = await response.json();
    return {
      provider: 'bold',
      payment_url: data.paymentUrl,
      payment_id: data.paymentId
    };
  }

  async verifyWebhook(payload, signature, secret) {
    // Implementación específica de Bold
    // ...
  }

  async getTransactionStatus(config, transactionId) {
    // Implementación específica de Bold
    // ...
  }
}
```

---

### 4. Webhook Router Universal

```javascript
// server/routes/webhooks.js

const express = require('express');
const router = express.Router();
const GatewayManager = require('../services/GatewayManager');

// Webhook unificado para TODOS los gateways
router.post('/webhooks/payment/:provider', async (req, res) => {
  const { provider } = req.params;
  const payload = req.body;
  
  try {
    // 1. Identificar el restaurante por la referencia de la orden
    const order = await getOrderByReference(payload.reference || payload.orderId);
    const restaurant = await getRestaurant(order.restaurant_id);
    
    // 2. Verificar firma del webhook (específico por gateway)
    const signature = req.headers['x-signature'] || req.headers['x-bold-signature'];
    const isValid = await GatewayManager.verifyWebhook(
      provider,
      payload,
      signature,
      restaurant.payment_gateway.config.webhook_secret
    );
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // 3. Normalizar el status (cada gateway usa términos diferentes)
    const status = normalizeStatus(provider, payload.status || payload.state);
    
    // 4. Si el pago fue aprobado → Procesar pedido
    if (status === 'APPROVED') {
      await processOrder(order.id);
      
      // Enviar a cocina vía WhatsApp Bot
      await sendToWhatsApp(order);
      
      // Actualizar orden en DB
      await updateOrder(order.id, {
        payment_status: 'paid',
        payment_provider: provider,
        paid_at: new Date()
      });
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Normalizar status de diferentes gateways
function normalizeStatus(provider, status) {
  const statusMap = {
    wompi: {
      'APPROVED': 'APPROVED',
      'DECLINED': 'DECLINED',
      'PENDING': 'PENDING',
      'ERROR': 'ERROR'
    },
    bold: {
      'success': 'APPROVED',
      'failed': 'DECLINED',
      'pending': 'PENDING'
    },
    payu: {
      'APPROVED': 'APPROVED',
      'REJECTED': 'DECLINED',
      'PENDING': 'PENDING'
    }
  };
  
  return statusMap[provider][status] || 'UNKNOWN';
}

module.exports = router;
```

---

### 5. Endpoint de Creación de Pago

```javascript
// server/routes/payments.js

router.post('/api/create-payment', async (req, res) => {
  const { restaurant_id, order_id, amount, customer_info } = req.body;
  
  try {
    // 1. Obtener configuración del gateway del restaurante
    const restaurant = await getRestaurant(restaurant_id);
    
    // 2. Verificar que el restaurante tenga suscripción activa
    if (restaurant.subscription.status !== 'active') {
      return res.status(403).json({ 
        error: 'Subscription inactive',
        message: 'Por favor contacta con soporte para activar tu suscripción'
      });
    }
    
    // 3. Crear link de pago usando el gateway del restaurante
    const paymentLink = await GatewayManager.createPaymentLink(
      restaurant_id,
      {
        order_id,
        amount,
        description: `Pedido de ${customer_info.name}`,
        redirect_url: `https://tuapp.com/order-success?id=${order_id}`
      }
    );
    
    // 4. Guardar referencia del pago
    await createPaymentRecord({
      order_id,
      restaurant_id,
      provider: restaurant.payment_gateway.provider,
      payment_id: paymentLink.payment_id,
      amount,
      status: 'pending'
    });
    
    res.json({
      success: true,
      payment_url: paymentLink.payment_url,
      provider: paymentLink.provider
    });
    
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});
```

---

## 📊 COMPARATIVA DE GATEWAYS SOPORTADOS

| Gateway | Comisión | Pros | Contras | Soporte |
|---------|----------|------|---------|---------|
| **Bold** | 1.79% + $500 | ✅ Más barato<br>✅ API simple<br>✅ Colombiano | ⚠️ Menos conocido | ✅ Adapter listo |
| **Wompi** | 2.65% + $700 | ✅ Muy conocido<br>✅ Docs buenas<br>✅ Banco respaldo | ⚠️ Más caro | ✅ Adapter listo |
| **PayU** | 2.99% + $900 | ✅ Internacional<br>✅ Muchas funciones | ❌ Más caro | 🔄 Por implementar |
| **Mercado Pago** | ~3.5% | ✅ Reconocido<br>✅ Fácil UX | ❌ Caro | 🔄 Por implementar |

---

## 🎯 ONBOARDING DEL RESTAURANTE

### Paso 1: Elegir Gateway

```html
<!-- dashboard.html - Configuración de pagos -->
<div class="payment-setup">
  <h2>Configura tu método de pago</h2>
  
  <div class="gateway-selector">
    <div class="gateway-option" data-gateway="bold">
      <h3>Bold</h3>
      <p class="commission">1.79% + $500 por transacción</p>
      <span class="badge">Más económico</span>
    </div>
    
    <div class="gateway-option" data-gateway="wompi">
      <h3>Wompi</h3>
      <p class="commission">2.65% + $700 por transacción</p>
      <span class="badge">Más popular</span>
    </div>
    
    <div class="gateway-option" data-gateway="payu">
      <h3>PayU</h3>
      <p class="commission">2.99% + $900 por transacción</p>
      <span class="badge">Internacional</span>
    </div>
  </div>
</div>
```

### Paso 2: Guiar Creación de Cuenta

```javascript
// Según el gateway elegido, mostrar guía específica
const onboardingGuides = {
  bold: {
    steps: [
      '1. Ve a https://bold.co/registro',
      '2. Crea tu cuenta empresarial',
      '3. Completa verificación KYC',
      '4. Obtén tu API Key en Dashboard > Configuración',
      '5. Pega tu API Key aquí'
    ],
    video: 'https://youtube.com/bold-onboarding',
    time: '15 minutos'
  },
  wompi: {
    steps: [
      '1. Ve a https://comercios.wompi.co',
      '2. Regístrate con tus datos',
      '3. Verifica tu identidad',
      '4. En Dashboard, copia Public Key y Private Key',
      '5. Pega tus llaves aquí'
    ],
    video: 'https://youtube.com/wompi-onboarding',
    time: '20 minutos'
  }
};
```

### Paso 3: Validar Credenciales

```javascript
// Validar que las credenciales funcionan antes de guardar
router.post('/api/validate-gateway-credentials', async (req, res) => {
  const { provider, credentials } = req.body;
  
  try {
    const adapter = GatewayManager.adapters[provider];
    
    // Hacer una llamada de prueba (ej: obtener info de la cuenta)
    const isValid = await adapter.validateCredentials(credentials);
    
    if (isValid) {
      res.json({ valid: true, message: 'Credenciales válidas' });
    } else {
      res.json({ valid: false, message: 'Credenciales inválidas' });
    }
  } catch (error) {
    res.json({ valid: false, message: error.message });
  }
});
```

---

## 💰 TU MODELO DE NEGOCIO

### Planes con Mensualidad Fija

```javascript
const plans = {
  basico: {
    name: 'Plan Básico',
    monthly_fee: 50000,
    features: [
      'WhatsApp Bot automático',
      'Validación de pagos',
      'Dashboard básico',
      'Soporte por email'
    ],
    gateway_support: ['wompi', 'bold'] // Solo los más comunes
  },
  
  premium: {
    name: 'Plan Premium',
    monthly_fee: 100000,
    features: [
      'Todo lo de Básico',
      'KDS (Pantalla de cocina)',
      'Reportes avanzados',
      'Multi-sucursal',
      'Soporte prioritario'
    ],
    gateway_support: ['wompi', 'bold', 'payu'] // Más opciones
  },
  
  enterprise: {
    name: 'Plan Enterprise',
    monthly_fee: 150000,
    features: [
      'Todo lo de Premium',
      'Integraciones personalizadas',
      'API dedicada',
      'Soporte 24/7',
      'Consultoría mensual'
    ],
    gateway_support: ['wompi', 'bold', 'payu', 'mercadopago'] // Todos
  }
};
```

---

## 📈 VENTAJAS COMERCIALES

### 1. **Pitch al Restaurante**
```
"Usa la pasarela de pagos que prefieras:
- Ya tienes Bold? Úsala
- Prefieres Wompi? También funciona
- Nosotros solo validamos el pago automáticamente
- Tú recibes TODO tu dinero directo"
```

### 2. **Menor Fricción de Entrada**
- Si restaurante ya tiene cuenta en Bold → Onboarding 5 minutos
- Si no tiene → Le ayudas a elegir la más barata

### 3. **Escalabilidad**
```
MRR = # Restaurantes × Mensualidad

10 restaurantes × $100k = $1,000,000/mes
50 restaurantes × $100k = $5,000,000/mes
100 restaurantes × $100k = $10,000,000/mes
```

### 4. **Competitivo vs. Otros SaaS**
```
Otros SaaS: "Usa SOLO nuestra pasarela"
Tú: "Usa la que quieras, nosotros nos adaptamos"
```

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### Fase 1 (Semana 1-2): Core + Wompi + Bold
- [x] GatewayManager base
- [ ] WompiAdapter completo
- [ ] BoldAdapter completo
- [ ] Webhook router universal
- [ ] Onboarding UI para elegir gateway

### Fase 2 (Semana 3-4): Testing + Docs
- [ ] Tests de cada adapter
- [ ] Guías de onboarding por gateway
- [ ] Videos tutoriales
- [ ] Testing con restaurante piloto

### Fase 3 (Mes 2): Expansión
- [ ] PayUAdapter
- [ ] MercadoPagoAdapter
- [ ] Dashboard de reportes multi-gateway
- [ ] Analytics por gateway

### Fase 4 (Mes 3+): Optimización
- [ ] Cache de configuraciones
- [ ] Retry logic para webhooks
- [ ] Notificaciones de pago fallido
- [ ] Comparador de comisiones para restaurante

---

## 🎯 CONCLUSIÓN

### ✅ Modelo CORRECTO: Multi-Gateway Descentralizado

**Por qué funciona:**
1. No cobras comisión → No necesitas split payment
2. Arquitectura modular → Soportas cualquier gateway
3. Restaurante elige → Menor fricción, mayor satisfacción
4. Tú solo validas → Simple, legal, escalable

**Ingresos:**
- MRR predecible (mensualidades)
- No dependes del volumen de ventas del restaurante
- Escalas con # de restaurantes, no con # de transacciones

**Legal/Fiscal:**
- Limpio (nunca tocas dinero ajeno)
- Cada restaurante maneja su contabilidad
- Tú solo facturas tu servicio mensual

---

**Próximo documento:** `IMPLEMENTACION-WOMPI-BOLD-ADAPTERS.md`  
**Status:** 🟢 ARQUITECTURA VIABLE Y ESCALABLE
