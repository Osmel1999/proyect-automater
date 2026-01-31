# Análisis de Costos Operativos - KDS WhatsApp Bot

**Fecha de análisis**: 31 de Enero 2026

---

## 1. Resumen de Servicios Contratados

| Servicio | Tipo de cobro | Uso principal |
|----------|---------------|---------------|
| **Railway** | Fijo mensual | Backend Node.js + Bot WhatsApp |
| **Firebase Hosting** | Por consumo | Frontend estático (HTML/CSS/JS) |
| **Firebase Realtime Database** | Por consumo | Datos en tiempo real |

---

## 2. Análisis de Consumo por Componente

### 2.1 Bot WhatsApp (Mayor consumo)

El bot es el componente que más consume porque:
- Mantiene conexión WebSocket constante con WhatsApp
- Lee/escribe en Firebase en cada mensaje
- Procesa lógica de pedidos en tiempo real

**Operaciones Firebase por mensaje del cliente:**

| Operación | Lecturas | Escrituras | Descripción |
|-----------|----------|------------|-------------|
| Verificar estado bot | 1 | 0 | `tenants/{id}/bot/config` |
| Obtener menú | 1 | 0 | `tenants/{id}/menu` |
| Obtener tiempo entrega | 1 | 0 | `tenants/{id}/config/deliveryTime` |
| Guardar pedido | 0 | 1 | `tenants/{id}/pedidos` |
| **Total por mensaje** | **3** | **1** | - |

**Escenario típico de pedido (5 mensajes promedio):**
- Cliente: "Hola" → 3 lecturas
- Bot: envía menú → 0 (ya en memoria)
- Cliente: "Quiero 2 pizzas" → 3 lecturas
- Cliente: "Dirección: Calle 50" → 0 (sesión en memoria)
- Cliente: "Confirmar" → 3 lecturas + 1 escritura

**Total por pedido completo: ~9 lecturas + 1 escritura**

---

### 2.2 KDS (Kitchen Display System) - Alto consumo

El KDS consume mucho por el listener en tiempo real:

```javascript
ordersRef.on('value', (snapshot) => { ... });
```

**Consumo del listener `on('value')`:**
- Se descarga TODO el nodo `tenants/{id}/pedidos` cada vez que hay un cambio
- Si hay 10 pedidos activos y llega 1 nuevo → se descargan los 11

**Estimación por restaurante activo:**

| Actividad | Lecturas/hora | Descripción |
|-----------|---------------|-------------|
| KDS abierto (sin cambios) | 0 | Solo al conectar |
| Cada nuevo pedido | 1 (nodo completo) | Descarga todos los pedidos |
| Cada cambio de estado | 1 (nodo completo) | Descarga todos los pedidos |
| **Promedio hora pico** | **20-40** | 20-40 cambios/hora |

---

### 2.3 Dashboard - Consumo Moderado

**Operaciones al cargar:**

| Operación | Lecturas | Descripción |
|-----------|----------|-------------|
| Cargar datos tenant | 1 | `tenants/{id}` completo |
| Verificar WhatsApp | 0 | API call a Railway |
| **Total al cargar** | **1** | - |

**Operaciones durante uso:**
- Guardar configuración: 1 escritura
- Actualizar menú: 1 escritura por item
- Toggle bot: 1 escritura

---

## 3. Precios Firebase (Plan Spark → Blaze)

### Firebase Realtime Database

| Concepto | Gratis (Spark) | Precio (Blaze) |
|----------|----------------|----------------|
| **Almacenamiento** | 1 GB | $5/GB/mes |
| **Descargas** | 10 GB/mes | $1/GB |
| **Conexiones simultáneas** | 100 | Incluidas |

### Firebase Hosting

| Concepto | Gratis | Precio |
|----------|--------|--------|
| **Almacenamiento** | 10 GB | $0.026/GB |
| **Transferencia** | 360 MB/día | $0.15/GB |

---

## 4. Cálculo de Costos por Cliente

### 4.1 Costo de Inscripción (Una vez)

**Flujo de inscripción:**
1. Registro (auth.html) → 0 lecturas (Firebase Auth gratuito)
2. Crear tenant → 1 escritura
3. Configurar restaurante → 3 escrituras
4. Conectar WhatsApp → 2 escrituras (estado)
5. Configurar menú (10 items) → 10 escrituras
6. 3 pruebas del bot → 27 lecturas + 3 escrituras

| Concepto | Cantidad | Tamaño estimado |
|----------|----------|-----------------|
| Lecturas | ~30 | ~50 KB total |
| Escrituras | ~20 | ~10 KB total |
| **Costo Firebase** | - | **~$0.001 (prácticamente gratis)** |

### 4.2 Costo Mensual por Cliente Activo

**Supuestos para restaurante típico:**
- 50 pedidos/día (1,500/mes)
- KDS abierto 12 horas/día
- Dashboard abierto 2 horas/día
- Promedio 10 pedidos activos simultáneos

**Cálculo detallado:**

#### Bot WhatsApp
| Concepto | Cálculo | Total/mes |
|----------|---------|-----------|
| Lecturas por pedido | 9 × 1,500 | 13,500 |
| Escrituras por pedido | 1 × 1,500 | 1,500 |
| Tamaño datos | ~5 KB/pedido | 7.5 MB |

#### KDS
| Concepto | Cálculo | Total/mes |
|----------|---------|-----------|
| Cambios por pedido | 3 (nuevo, cocinando, listo) | 4,500 eventos |
| Lecturas por evento | 10 pedidos × 0.5 KB | 2.25 MB |
| Conexión inicial | 30 días × 1 | 30 |

#### Dashboard
| Concepto | Cálculo | Total/mes |
|----------|---------|-----------|
| Cargas diarias | 30 días × 2 | 60 lecturas |
| Configuraciones | ~20/mes | 20 escrituras |

---

### 4.3 Resumen de Costos por Cliente/Mes

**Consumo total mensual por restaurante:**

| Métrica | Cantidad | Tamaño |
|---------|----------|--------|
| **Lecturas totales** | ~18,000 | ~10 MB |
| **Escrituras totales** | ~1,600 | ~8 MB |
| **Almacenamiento** | - | ~50 MB |
| **Transferencia Hosting** | - | ~100 MB |

**Costo Firebase por cliente/mes:**

| Concepto | Cálculo | Costo USD |
|----------|---------|-----------|
| Descargas (10 MB) | 0.01 GB × $1 | $0.01 |
| Almacenamiento (50 MB) | 0.05 GB × $5 | $0.25 |
| Hosting transfer (100 MB) | 0.1 GB × $0.15 | $0.015 |
| **Total Firebase** | - | **~$0.28/mes** |

---

## 5. Costo Railway (Fijo)

Railway cobra por uso de recursos, típicamente:

| Plan | Costo | Incluye |
|------|-------|---------|
| **Hobby** | $5/mes | 500 horas, 512 MB RAM |
| **Pro** | $20/mes | Ilimitado, 8 GB RAM |

**Para tu caso (multi-tenant):**
- Un solo servidor sirve a TODOS los clientes
- El costo NO escala por cliente
- Con 10-50 clientes: **$5-20/mes total** (no por cliente)

**Costo Railway por cliente:**

| Clientes | Costo total | Costo/cliente |
|----------|-------------|---------------|
| 10 | $20 | $2.00 |
| 25 | $20 | $0.80 |
| 50 | $20 | $0.40 |
| 100 | $20 | $0.20 |

---

## 6. Tabla Resumen Final

### Costo de Inscripción

| Concepto | Costo |
|----------|-------|
| Firebase (lecturas/escrituras) | ~$0.001 |
| Railway | $0 (ya pagado) |
| **Total inscripción** | **Prácticamente $0** |

### Costo Mensual por Cliente

| Concepto | 10 clientes | 25 clientes | 50 clientes | 100 clientes |
|----------|-------------|-------------|-------------|--------------|
| Firebase/cliente | $0.28 | $0.28 | $0.28 | $0.28 |
| Railway/cliente | $2.00 | $0.80 | $0.40 | $0.20 |
| **Total/cliente** | **$2.28** | **$1.08** | **$0.68** | **$0.48** |

### Margen de Ganancia (Si cobras $50,000 COP/mes ≈ $12 USD)

| Clientes | Costo/cliente | Ganancia/cliente | Margen |
|----------|---------------|------------------|--------|
| 10 | $2.28 | $9.72 | 81% |
| 25 | $1.08 | $10.92 | 91% |
| 50 | $0.68 | $11.32 | 94% |
| 100 | $0.48 | $11.52 | 96% |

---

## 7. Optimizaciones Recomendadas

### 7.1 Reducir consumo del KDS (Mayor impacto)

**Problema:** `on('value')` descarga TODO el nodo cada vez.

**Solución:** Usar `on('child_added')`, `on('child_changed')`, `on('child_removed')`:

```javascript
// En lugar de:
ordersRef.on('value', callback);

// Usar:
ordersRef.on('child_added', handleNewOrder);
ordersRef.on('child_changed', handleOrderUpdate);
ordersRef.on('child_removed', handleOrderRemoved);
```

**Ahorro:** Reduce descargas en ~80%

### 7.2 Cachear menú en memoria del bot

El menú se lee en cada mensaje pero raramente cambia.

```javascript
// Cachear por 5 minutos
const menuCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function obtenerMenuCached(tenantId) {
  const cached = menuCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const menu = await obtenerMenuTenant(tenantId);
  menuCache.set(tenantId, { data: menu, timestamp: Date.now() });
  return menu;
}
```

**Ahorro:** ~30% menos lecturas del bot

### 7.3 Limpiar pedidos antiguos

Mover pedidos completados a `/historial` reduce el tamaño de descarga del KDS.

---

## 8. Conclusiones

1. **El costo de inscripción es prácticamente $0** - Firebase maneja bien las operaciones iniciales.

2. **El costo mensual por cliente es muy bajo** - Entre $0.48 y $2.28 dependiendo de la escala.

3. **Railway es tu costo fijo principal** - $20/mes máximo, compartido entre todos los clientes.

4. **El modelo SaaS es muy rentable** - Con 25+ clientes tienes márgenes >90%.

5. **El KDS es el mayor consumidor** - Optimizar el listener puede reducir costos un 50%.

---

## 9. Proyección de Rentabilidad

| Clientes | Ingreso mensual | Costos | Ganancia neta | ROI |
|----------|-----------------|--------|---------------|-----|
| 10 | $120 USD | $42.80 | $77.20 | 180% |
| 25 | $300 USD | $47.00 | $253.00 | 538% |
| 50 | $600 USD | $54.00 | $546.00 | 1011% |
| 100 | $1,200 USD | $68.00 | $1,132.00 | 1665% |

**Nota:** Ingreso calculado a $12 USD/cliente ($50,000 COP aproximado)
