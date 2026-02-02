# Sistema de Analytics - KDS App

**Fecha de implementación**: 2 de Febrero 2026  
**Última actualización**: 3 de Febrero 2026

---

## 1. Resumen del Sistema

El sistema de Analytics recopila **únicamente datos esenciales** de pedidos y pérdidas por límite de plan. Los datos se guardan crudos (sin procesar) para análisis futuro.

### Filosofía del Sistema:

- **Mínimo necesario**: Solo 2 tipos de eventos
- **Sin análisis en tiempo real**: Solo almacenamiento
- **Fail-open**: Errores de analytics nunca bloquean pedidos
- **Datos para recomendación de planes**: Identificar cuándo un tenant necesita upgrade

---

## 2. Tipos de Eventos

### 2.1 `order_completed` - Pedido Completado

Se registra cuando un pedido se completa exitosamente (efectivo o tarjeta).

```javascript
{
  userPhone: "573001234567",       // Teléfono del cliente
  contactPhone: "573009876543",    // Teléfono de contacto para entrega
  address: "Calle 123 #45-67",     // Dirección de entrega
  paymentMethod: "efectivo",       // "efectivo" | "tarjeta"
  total: 45000,                    // Total del pedido
  orderId: "A1B2C3",               // ID hexadecimal del pedido
  items: [                         // Items del pedido
    { nombre: "Pizza Grande", precio: 35000, cantidad: 1 },
    { nombre: "Gaseosa", precio: 10000, cantidad: 1 }
  ],
  date: "2026-02-03",              // Fecha YYYY-MM-DD
  timestamp: 1706972400000         // Firebase Server Timestamp
}
```

### 2.2 `order_lost` - Pedido Perdido por Límite

Se registra cuando un usuario nuevo intenta contactar pero el bot no responde porque el tenant alcanzó su límite diario.

```javascript
{
  userPhone: "573005551234",       // Teléfono del cliente potencial
  plan: "emprendedor",             // Plan actual del tenant
  ordersToday: 15,                 // Pedidos realizados hoy
  ordersLimit: 15,                 // Límite del plan
  date: "2026-02-03",              // Fecha YYYY-MM-DD
  timestamp: 1706972400000         // Firebase Server Timestamp
}
```

---

## 3. Estructura en Firebase

```
analytics/
├── {tenantId}/
│   ├── orders_completed/
│   │   └── {pushId}: { ...orderCompletedData }
│   │   └── {pushId}: { ...orderCompletedData }
│   │
│   └── orders_lost/
│       └── {pushId}: { ...orderLostData }
│       └── {pushId}: { ...orderLostData }
```

---

## 4. Uso Futuro de Datos

### 4.1 Recomendación de Planes

Con los datos de `order_lost`, se puede:

1. **Detectar pérdida de ventas**: Cuántos clientes potenciales no fueron atendidos
2. **Calcular ROI del upgrade**: Si tiene 5 `order_lost` diarios × promedio de venta = dinero perdido
3. **Alertar proactivamente**: "Esta semana perdiste 20 posibles pedidos por tu límite actual"

### 4.2 Análisis de Ventas

Con los datos de `order_completed`, se puede:

1. **Items más vendidos**: Agrupar por `items[].nombre`
2. **Métodos de pago preferidos**: Agrupar por `paymentMethod`
3. **Zonas de entrega**: Analizar `address` (requiere geocoding futuro)
4. **Ticket promedio**: Promedio de `total`
5. **Patrones por fecha**: Agrupar por `date`

---

## 5. API del Servicio

```javascript
const analyticsService = require('./analytics-service');

// Registrar pedido completado
await analyticsService.trackOrderCompleted(tenantId, userPhone, {
  items: [{ nombre: 'Pizza', precio: 30000, cantidad: 1 }],
  contactPhone: '573001234567',
  address: 'Calle 123',
  paymentMethod: 'efectivo',
  total: 30000,
  orderId: 'ABC123'
});

// Registrar pedido perdido
await analyticsService.trackOrderLost(tenantId, userPhone, {
  plan: 'emprendedor',
  ordersToday: 15,
  ordersLimit: 15
});
```

---

## 6. Principios de Diseño

1. **Fail-open**: Errores de analytics se logean pero nunca bloquean el flujo principal
2. **Async**: Todas las operaciones son fire-and-forget con `.catch()`
3. **Minimal**: Solo datos realmente útiles para decisiones de negocio
4. **Raw data**: Sin procesamiento en tiempo real, análisis se hará batch después

---

## 7. Eventos NO Incluidos (Decisión Intencional)

Los siguientes eventos fueron considerados pero **NO se implementaron** para mantener simplicidad:

- ❌ `conversation_start` - No aporta valor sin el contexto del resultado
- ❌ `item_added` - Ruido, solo importa si se completa el pedido
- ❌ `cart_view` - Ruido
- ❌ `order_abandoned` - Difícil de determinar precisamente
- ❌ `payment_link_generated` - Redundante con `order_completed`
- ❌ Metadatos temporales extensos (quincena, día de semana) - Se pueden calcular del timestamp

---

## 8. Siguientes Pasos (Futuro)

1. **Dashboard de analytics**: Visualización de datos acumulados
2. **Alertas de límite**: Notificar cuando hay muchos `order_lost`
3. **Recomendador de planes**: ML básico basado en patrones
4. **Exportación de datos**: CSV/Excel para análisis externo
