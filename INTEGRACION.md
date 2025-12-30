# 🔗 Integración n8n → Firebase KDS

## Workflow de n8n para enviar pedidos al KDS

### Método 1: HTTP Request Directa a Firebase

```json
{
  "nodes": [
    {
      "parameters": {
        "url": "=https://TU-PROYECTO-default-rtdb.firebaseio.com/pedidos/{{ $json.orderId }}.json",
        "method": "PUT",
        "bodyParametersUi": {
          "parameter": [
            {
              "name": "id",
              "value": "={{ $json.orderId }}"
            },
            {
              "name": "cliente",
              "value": "={{ $json.customerName }}"
            },
            {
              "name": "telefono",
              "value": "={{ $json.customerPhone }}"
            },
            {
              "name": "items",
              "value": "={{ $json.items }}"
            },
            {
              "name": "total",
              "value": "={{ $json.total }}"
            },
            {
              "name": "estado",
              "value": "pendiente"
            },
            {
              "name": "timestamp",
              "value": "={{ Date.now() }}"
            }
          ]
        },
        "options": {}
      },
      "name": "Enviar a KDS",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [1000, 300]
    }
  ]
}
```

### Método 2: Usando el Nodo de Firebase

Si instalas el nodo de Firebase en n8n:

```json
{
  "nodes": [
    {
      "parameters": {
        "operation": "set",
        "path": "=pedidos/{{ $json.orderId }}",
        "value": "={{ {\n  id: $json.orderId,\n  cliente: $json.customerName,\n  telefono: $json.customerPhone,\n  items: $json.items,\n  total: $json.total,\n  estado: 'pendiente',\n  timestamp: Date.now()\n} }}"
      },
      "name": "Firebase - Crear Pedido",
      "type": "n8n-nodes-base.firebase",
      "typeVersion": 1,
      "position": [1000, 300]
    }
  ]
}
```

---

## 🔥 Workflow Completo: WhatsApp → Pago → KDS

### Estructura del Workflow

```
┌─────────────────┐
│ WhatsApp Trigger│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Procesar Menú   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Calcular Total  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Esperar Pago    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validar Pago    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generar ID      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Enviar a KDS    │ ← Firebase
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Confirmar Pedido│
└─────────────────┘
```

### Nodo: Generar ID de Pedido

```javascript
// Código en nodo "Function"
const today = new Date();
const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
const orderNumber = Math.floor(Math.random() * 9000) + 1000;
const orderId = `${dateStr}-${orderNumber}`;

return {
  json: {
    ...items[0].json,
    orderId: orderId
  }
};
```

### Nodo: Enviar a Firebase

```javascript
// URL del HTTP Request
https://TU-PROYECTO-default-rtdb.firebaseio.com/pedidos/{{ $json.orderId }}.json

// Método: PUT

// Body (JSON):
{
  "id": "{{ $json.orderId }}",
  "cliente": "{{ $json.customerName }}",
  "telefono": "{{ $json.customerPhone }}",
  "items": {{ $json.items }},
  "total": {{ $json.total }},
  "estado": "pendiente",
  "timestamp": {{ Date.now() }},
  "origen": "whatsapp"
}
```

---

## 📋 Estructura de Datos Recomendada

### Items Array

```json
{
  "items": [
    {
      "nombre": "Hamburguesa Especial",
      "cantidad": 2,
      "precio": 15000,
      "notas": "Sin cebolla, extra queso"
    },
    {
      "nombre": "Papas Grandes",
      "cantidad": 1,
      "precio": 8000,
      "notas": ""
    }
  ]
}
```

### Pedido Completo

```json
{
  "id": "20251230-4521",
  "cliente": "Juan Pérez",
  "telefono": "3001234567",
  "items": [
    {
      "nombre": "Hamburguesa Especial",
      "cantidad": 2,
      "precio": 15000,
      "notas": "Sin cebolla"
    }
  ],
  "total": 30000,
  "estado": "pendiente",
  "timestamp": 1735516800000,
  "origen": "whatsapp",
  "direccion": "Calle 123 #45-67",
  "metodoPago": "nequi"
}
```

---

## 🔔 Webhook para Actualizar Estados

Si quieres que el KDS notifique a n8n cuando cambia el estado:

### 1. Crear Webhook en n8n

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "kds-update",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300],
      "webhookId": "abc-123"
    }
  ]
}
```

### 2. Modificar app.js para enviar notificación

Agrega en la función `changeStatus`:

```javascript
function changeStatus(orderId, newStatus) {
    const updates = {};
    updates[`pedidos/${orderId}/estado`] = newStatus;
    
    if (newStatus === 'cocinando') {
        updates[`pedidos/${orderId}/inicioCocinado`] = Date.now();
    } else if (newStatus === 'listo') {
        updates[`pedidos/${orderId}/horaListo`] = Date.now();
        
        // Notificar a n8n que el pedido está listo
        fetch('https://tu-n8n.app/webhook/kds-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: orderId,
                estado: 'listo',
                timestamp: Date.now()
            })
        });
    }
    
    window.db.ref().update(updates);
}
```

### 3. n8n envía mensaje de WhatsApp

```
Cliente, tu pedido #{{ $json.orderId }} está listo! 
Puedes pasar a recogerlo 🎉
```

---

## 🧪 Probar la Integración

### Insertar Pedido de Prueba Manualmente

Puedes agregar pedidos directo en Firebase Console:

```json
{
  "pedidos": {
    "TEST-001": {
      "id": "TEST-001",
      "cliente": "Cliente de Prueba",
      "telefono": "3001234567",
      "items": [
        {
          "nombre": "Hamburguesa Test",
          "cantidad": 1,
          "precio": 15000,
          "notas": "Esto es una prueba"
        }
      ],
      "total": 15000,
      "estado": "pendiente",
      "timestamp": 1735516800000
    }
  }
}
```

### Usando cURL

```bash
curl -X PUT \
  'https://TU-PROYECTO-default-rtdb.firebaseio.com/pedidos/TEST-002.json' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "TEST-002",
    "cliente": "Juan Test",
    "telefono": "3009876543",
    "items": [
      {
        "nombre": "Pizza Familiar",
        "cantidad": 1,
        "notas": "Extra queso"
      }
    ],
    "total": 35000,
    "estado": "pendiente",
    "timestamp": 1735516900000
  }'
```

---

## 📊 Bonus: Dashboard de Estadísticas

Puedes agregar un nodo en n8n que lea el historial diariamente:

```javascript
// Nodo Schedule Trigger: Todos los días a las 11:59 PM

// Nodo HTTP Request:
// URL: https://TU-PROYECTO-default-rtdb.firebaseio.com/historial.json
// Método: GET

// Nodo Function (Calcular estadísticas):
const orders = Object.values(items[0].json);
const today = new Date().toISOString().split('T')[0];

const todayOrders = orders.filter(o => {
  const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
  return orderDate === today;
});

const totalSales = todayOrders.reduce((sum, o) => sum + o.total, 0);
const totalOrders = todayOrders.length;

return {
  json: {
    fecha: today,
    totalPedidos: totalOrders,
    totalVentas: totalSales,
    ticketPromedio: totalSales / totalOrders
  }
};

// Luego envías esto por WhatsApp o Email
```

---

## 🎯 Checklist de Integración

- [ ] Firebase proyecto creado
- [ ] Realtime Database habilitado
- [ ] Reglas de seguridad configuradas
- [ ] config.js actualizado con credenciales
- [ ] KDS desplegado (Firebase Hosting o Netlify)
- [ ] Nodo HTTP Request en n8n creado
- [ ] URL de Firebase correcta en n8n
- [ ] Pedido de prueba enviado
- [ ] Pedido visible en KDS
- [ ] Estados cambian correctamente

---

**¡Listo para integrar! 🚀**
