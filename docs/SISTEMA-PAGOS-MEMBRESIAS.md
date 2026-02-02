# Sistema de Pagos y Recomendación de Planes

**Fecha de implementación**: 2 de Febrero 2026

---

## 1. Resumen

El sistema integra:
- **Wompi** como pasarela de pagos para suscripciones
- **Recomendación inteligente** de plan basada en analytics

La recomendación solo se calcula cuando el usuario va a pagar (eficiente).

---

## 2. Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  (Página de planes / Checkout)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Usuario va a pagar ──► GET /api/membership/recommend/:id    │
│                                   │                              │
│                                   ▼                              │
│                    ┌──────────────────────────┐                 │
│                    │ plan-recommendation-     │                 │
│                    │ service.js               │                 │
│                    │                          │                 │
│                    │ Consulta analytics:      │                 │
│                    │ - orders_completed       │                 │
│                    │ - orders_lost            │                 │
│                    └──────────────────────────┘                 │
│                                   │                              │
│                                   ▼                              │
│               Respuesta: { recommendedPlan, reasons, stats }    │
│                                                                  │
│  2. Usuario elige plan ──► POST /api/membership/checkout        │
│                                   │                              │
│                                   ▼                              │
│                    ┌──────────────────────────┐                 │
│                    │ wompi-service.js         │                 │
│                    │                          │                 │
│                    │ Crea enlace de pago      │                 │
│                    └──────────────────────────┘                 │
│                                   │                              │
│                                   ▼                              │
│               Redirect a Wompi / Widget embebido                │
│                                                                  │
│  3. Wompi confirma pago ──► POST /api/membership/webhook        │
│                                   │                              │
│                                   ▼                              │
│                    ┌──────────────────────────┐                 │
│                    │ membership-service.js    │                 │
│                    │                          │                 │
│                    │ activatePaidPlan()       │                 │
│                    └──────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Endpoints API

### Planes y Recomendaciones

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/membership/plans` | GET | Lista todos los planes disponibles |
| `/api/membership/recommend/:tenantId` | GET | Obtiene recomendación personalizada |
| `/api/membership/compare/:tenantId` | GET | Compara todos los planes para el tenant |
| `/api/membership/lost-orders/:tenantId` | GET | Resumen de pedidos perdidos |

### Pagos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/membership/checkout` | POST | Crear enlace/checkout de pago |
| `/api/membership/webhook` | POST | Webhook de Wompi (confirmación) |
| `/api/membership/transaction/:id` | GET | Verificar estado de transacción |
| `/api/membership/activate-manual` | POST | Activar plan (admin) |

---

## 4. Sistema de Recomendación

### Datos que analiza

```
analytics/{tenantId}/{date}/orders_completed  ──► Pedidos exitosos
analytics/{tenantId}/{date}/orders_lost       ──► Pedidos perdidos por límite
```

### Lógica de recomendación

```javascript
// 1. Si tiene pedidos perdidos = Upgrade urgente
if (totalOrdersLost > 0) {
  urgency = 'high';
  reasons.push('Perdiste X pedidos por límite');
}

// 2. Basado en el pico de pedidos en un día
if (maxOrdersInOneDay > 75) → empresarial
if (maxOrdersInOneDay > 40) → profesional
if (maxOrdersInOneDay > 20) → emprendedor

// 3. Calcular ROI
lostRevenue = ordersLost × avgTicket (30,000 COP)
if (lostRevenue > planCost) → ROI positivo
```

### Respuesta de recomendación

```javascript
{
  success: true,
  currentPlan: "trial",
  recommendedPlan: "profesional",
  planInfo: {
    name: "Plan Profesional",
    price: 120000,
    ordersPerDay: 50
  },
  reasons: [
    "Perdiste 8 pedidos potenciales esta semana",
    "Ingreso estimado perdido: $240,000 COP",
    "ROI positivo: recuperarías $120,000 COP más de lo que pagas"
  ],
  stats: {
    ordersPerDay: 35,
    maxOrders: 48,
    lostOrders: 8,
    period: "7 días"
  },
  financials: {
    lostRevenue: 240000,
    planCost: 120000,
    potentialSavings: 120000
  },
  urgency: "high"
}
```

---

## 5. Configuración Wompi

### Variables de entorno requeridas

```bash
# .env
WOMPI_PUBLIC_KEY=pub_test_xxx
WOMPI_PRIVATE_KEY=prv_test_xxx
WOMPI_EVENTS_SECRET=xxx          # Para verificar webhooks
WOMPI_INTEGRITY_SECRET=xxx       # Para firmar enlaces de pago
WOMPI_ENVIRONMENT=sandbox        # sandbox | production
APP_URL=https://tu-dominio.com   # Para redirects
```

### Webhook en Wompi Dashboard

Configurar webhook en: `https://comercios.wompi.co/`

- **URL**: `https://tu-dominio.com/api/membership/webhook`
- **Eventos**: `transaction.updated`

---

## 6. Planes Disponibles

| Plan | Precio/mes | Pedidos/día | Límite |
|------|------------|-------------|--------|
| **Emprendedor** | $90,000 COP | 25 | Para negocios nuevos |
| **Profesional** | $120,000 COP | 50 | Para negocios en crecimiento |
| **Empresarial** | $150,000 COP | 100 | Para alto volumen |

---

## 7. Flujo de Pago Completo

```
1. Usuario accede a página de planes
   │
2. Frontend llama: GET /api/membership/recommend/:tenantId
   │
3. Se muestra recomendación con razones
   │
4. Usuario selecciona plan
   │
5. Frontend llama: POST /api/membership/checkout
   Body: { tenantId, plan, email }
   │
6. Backend crea enlace de pago en Wompi
   │
7. Usuario es redirigido a Wompi / Widget
   │
8. Usuario completa pago
   │
9. Wompi envía webhook a /api/membership/webhook
   │
10. Backend activa plan (membershipService.activatePaidPlan)
    │
11. Usuario redirigido a /payment-success.html
```

---

## 8. Estructura en Firebase

```
tenants/{tenantId}/
├── membership: {
│     plan: "profesional",
│     status: "active",
│     paidPlanStartDate: "2026-02-02T...",
│     paidPlanEndDate: "2026-03-02T...",
│     lastPaymentDate: "2026-02-02T..."
│   }
│
└── payments/
    └── {pushId}: {
          transactionId: "xxx",
          plan: "profesional",
          amount: 120000,
          reference: "KDS-tenant123-profesional-1706...",
          paymentMethod: "CARD",
          status: "APPROVED",
          createdAt: timestamp
        }
```

---

## 9. Testing

### Activar plan manualmente (desarrollo)

```bash
curl -X POST http://localhost:3000/api/membership/activate-manual \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tu-tenant-id",
    "plan": "profesional",
    "days": 30,
    "adminKey": "dev-admin-key"
  }'
```

### Verificar recomendación

```bash
curl http://localhost:3000/api/membership/recommend/tu-tenant-id
```

### Ver pedidos perdidos

```bash
curl http://localhost:3000/api/membership/lost-orders/tu-tenant-id?days=7
```
