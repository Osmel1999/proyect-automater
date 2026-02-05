# Fix: Dashboard Stats usando ruta correcta (historial)

## Fecha
5 de Febrero, 2026

## Problema
El dashboard mostraba siempre "0" en "Pedidos Hoy" y "0" en "Ventas Hoy" porque estaba consultando la ruta incorrecta de Firebase:
- ❌ Usaba: `tenants/{tenantId}/pedidos`
- ✅ Debería usar: `tenants/{tenantId}/historial`

## Investigación
Usamos Firebase CLI para inspeccionar la estructura real de la base de datos:

```bash
firebase database:get / --project kds-app-7f1d3 --pretty
```

Confirmamos que:
- Los pedidos completados se guardan en `tenants/{tenantId}/historial`
- Cada pedido tiene un campo `timestamp` que permite filtrar por fecha
- Los pedidos también se registran en `analytics/{tenantId}/{fecha}/orders_completed`

## Cambios Realizados

### 1. Actualizar `js/dashboard.js`
**Archivo:** `/kds-webapp/js/dashboard.js`

**Cambio:** Línea ~332-345 (función `loadDashboardStats`)

```javascript
// ANTES ❌
const ordersSnapshot = await firebase.database()
  .ref(`tenants/${tenantId}/pedidos`)
  .orderByChild('timestamp')
  .startAt(todayTimestamp)
  .once('value');

// DESPUÉS ✅
const ordersSnapshot = await firebase.database()
  .ref(`tenants/${tenantId}/historial`)
  .orderByChild('timestamp')
  .startAt(todayTimestamp)
  .once('value');
```

**Versión actualizada:**
```javascript
// Version: 2026-02-05-v2 - Fix: Usar tenants/${tenantId}/historial (ruta real de pedidos)
```

### 2. Actualizar Firebase Rules
**Archivo:** `/kds-webapp/database.rules.json`

Agregamos reglas específicas para permitir leer desde `historial`:

```json
{
  "tenants": {
    "$tenantId": {
      "historial": {
        ".read": true,
        ".write": true,
        ".indexOn": ["timestamp", "estado", "paymentStatus", "fecha"],
        "$pedidoId": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

### 3. Forzar Actualización de Caché
**Archivo:** `/kds-webapp/dashboard.html`

Actualizada la versión del script:

```html
<!-- ANTES -->
<script src="js/dashboard.js?v=20260205"></script>

<!-- DESPUÉS -->
<script src="js/dashboard.js?v=20260205v2"></script>
```

## Deploy Realizado

1. ✅ Desplegadas las reglas de Firebase:
```bash
firebase deploy --only database --project kds-app-7f1d3
```

2. ✅ Commit y push al repositorio:
```bash
git add -A
git commit -m "Fix: Actualizar dashboard para usar ruta correcta de historial"
git push origin main
```

3. ✅ Railway desplegará automáticamente los cambios

## Verificación

Para verificar que funciona correctamente:

1. **Abrir el dashboard:** https://app.kdsapp.site/dashboard.html
2. **Forzar recarga del caché:** Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac)
3. **Abrir DevTools Console** (F12) y buscar logs:
   ```
   🔍 [Dashboard] Cargando stats para tenant: ...
   📦 [Dashboard] Pedidos obtenidos: X
   📊 [Dashboard] Total pedidos: X
   📊 [Dashboard] Total ventas: $X
   ```
4. **Verificar que las tarjetas muestran datos reales** (no "0")

## Estructura de Datos Confirmada

```
tenants/
  {tenantId}/
    historial/          ← AQUÍ están los pedidos completados
      {pedidoId}/
        - timestamp: number (milliseconds)
        - total: number
        - estado: string
        - items: array
        - cliente: string
        - direccion: string
        - metodoPago: string
        ...
    
    stats/              ← Estadísticas pre-calculadas (opcional)
      - ordersToday: number
      - totalOrders: number
      - lastOrderAt: string

analytics/             ← Analytics agregados por fecha
  {tenantId}/
    {fecha}/            ← formato: "DD-MM-YY"
      orders_completed/
        {orderId}/
          - timestamp
          - total
          - items
          ...
```

## Mejoras Futuras

1. **Optimizar consulta:** Considerar usar `analytics` para stats diarias (más rápido)
2. **Caché local:** Cachear stats por 5 minutos en localStorage
3. **Real-time updates:** Usar `.on('value')` en vez de `.once('value')` para actualizaciones en tiempo real
4. **Indicador de loading:** Mostrar skeleton mientras cargan los stats

## Referencias
- Commit: `c10e996`
- Fecha: 5 de Febrero, 2026
- Branch: `main`
- Deploy: Railway (automático)

## Autor
Sistema de corrección automática
