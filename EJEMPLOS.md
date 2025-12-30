# 📋 Ejemplos de Pedidos para Pruebas

## Insertar Directamente en Firebase Console

Ve a Firebase Console → Realtime Database → Pestaña "Datos"

Clic en el `+` junto a la raíz y pega estos ejemplos:

---

## Pedido Simple

```json
{
  "pedidos": {
    "20251230-001": {
      "id": "20251230-001",
      "cliente": "Laura Ramírez",
      "telefono": "3001234567",
      "items": [
        {
          "nombre": "Hamburguesa Clásica",
          "cantidad": 1,
          "precio": 12000,
          "notas": ""
        }
      ],
      "total": 12000,
      "estado": "pendiente",
      "timestamp": 1735516800000,
      "origen": "whatsapp"
    }
  }
}
```

---

## Pedido Grande

```json
{
  "pedidos": {
    "20251230-002": {
      "id": "20251230-002",
      "cliente": "Pedro Sánchez",
      "telefono": "3109876543",
      "items": [
        {
          "nombre": "Pizza Familiar Carnes",
          "cantidad": 2,
          "precio": 45000,
          "notas": "Extra queso, borde relleno"
        },
        {
          "nombre": "Alitas BBQ",
          "cantidad": 1,
          "precio": 18000,
          "notas": "Picantes"
        },
        {
          "nombre": "Coca-Cola 2L",
          "cantidad": 2,
          "precio": 6000,
          "notas": ""
        }
      ],
      "total": 108000,
      "estado": "pendiente",
      "timestamp": 1735516900000,
      "origen": "whatsapp"
    }
  }
}
```

---

## Pedido con Muchas Notas

```json
{
  "pedidos": {
    "20251230-003": {
      "id": "20251230-003",
      "cliente": "Ana Gómez",
      "telefono": "3157778888",
      "items": [
        {
          "nombre": "Hamburguesa Vegetariana",
          "cantidad": 1,
          "precio": 15000,
          "notas": "Sin mayonesa, extra aguacate, pan integral, tomate en rodajas gruesas"
        },
        {
          "nombre": "Ensalada César",
          "cantidad": 1,
          "precio": 12000,
          "notas": "Aderezo aparte, sin crutones, pollo a la plancha"
        },
        {
          "nombre": "Jugo Natural de Lulo",
          "cantidad": 1,
          "precio": 5000,
          "notas": "Sin azúcar, con hielo"
        }
      ],
      "total": 32000,
      "estado": "pendiente",
      "timestamp": 1735517000000,
      "origen": "whatsapp"
    }
  }
}
```

---

## Pedido Urgente (más de 25 min)

```json
{
  "pedidos": {
    "20251230-004": {
      "id": "20251230-004",
      "cliente": "Carlos Urgente",
      "telefono": "3001112222",
      "items": [
        {
          "nombre": "Hot Dog Premium",
          "cantidad": 3,
          "precio": 10000,
          "notas": ""
        }
      ],
      "total": 30000,
      "estado": "cocinando",
      "timestamp": 1735515200000,
      "inicioCocinado": 1735515300000,
      "origen": "whatsapp"
    }
  }
}
```

**Nota:** Este pedido se creó hace más de 25 minutos, por lo que mostrará el indicador "🔥 Urgente"

---

## Pedido Ya Listo

```json
{
  "pedidos": {
    "20251230-005": {
      "id": "20251230-005",
      "cliente": "Sofía Martínez",
      "telefono": "3203334444",
      "items": [
        {
          "nombre": "Sandwich Club",
          "cantidad": 2,
          "precio": 14000,
          "notas": ""
        },
        {
          "nombre": "Papas Francesas",
          "cantidad": 1,
          "precio": 7000,
          "notas": ""
        }
      ],
      "total": 35000,
      "estado": "listo",
      "timestamp": 1735516500000,
      "inicioCocinado": 1735516600000,
      "horaListo": 1735517100000,
      "origen": "whatsapp"
    }
  }
}
```

---

## Insertar con cURL

Si prefieres usar terminal:

```bash
# Reemplaza TU-PROYECTO con el ID de tu proyecto Firebase
curl -X PUT \
  'https://TU-PROYECTO-default-rtdb.firebaseio.com/pedidos/TEST-001.json' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "TEST-001",
    "cliente": "Test Cliente",
    "telefono": "3001234567",
    "items": [
      {
        "nombre": "Producto Test",
        "cantidad": 1,
        "precio": 10000,
        "notas": "Pedido de prueba"
      }
    ],
    "total": 10000,
    "estado": "pendiente",
    "timestamp": '$(date +%s000)'
  }'
```

---

## Insertar con JavaScript (Node.js)

```javascript
const fetch = require('node-fetch');

const pedido = {
  id: "JS-001",
  cliente: "Desde JavaScript",
  telefono: "3009998888",
  items: [
    {
      nombre: "Pizza Hawaiana",
      cantidad: 1,
      precio: 25000,
      notas: ""
    }
  ],
  total: 25000,
  estado: "pendiente",
  timestamp: Date.now()
};

fetch('https://TU-PROYECTO-default-rtdb.firebaseio.com/pedidos/JS-001.json', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(pedido)
})
.then(res => res.json())
.then(data => console.log('Pedido creado:', data))
.catch(err => console.error('Error:', err));
```

---

## Script para Generar Pedidos de Prueba Masivos

```javascript
// Ejecutar en la consola del navegador (F12)
// Estando en la página del KDS

async function crearPedidosPrueba(cantidad) {
  const nombres = ['Juan', 'María', 'Pedro', 'Ana', 'Carlos', 'Sofía'];
  const apellidos = ['García', 'López', 'Martínez', 'Rodríguez', 'González'];
  const productos = [
    { nombre: 'Hamburguesa', precio: 15000 },
    { nombre: 'Pizza', precio: 25000 },
    { nombre: 'Hot Dog', precio: 10000 },
    { nombre: 'Papas', precio: 8000 },
    { nombre: 'Gaseosa', precio: 5000 }
  ];

  for (let i = 0; i < cantidad; i++) {
    const nombre = nombres[Math.floor(Math.random() * nombres.length)];
    const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
    const producto = productos[Math.floor(Math.random() * productos.length)];
    const cantidad = Math.floor(Math.random() * 3) + 1;
    
    const pedido = {
      id: `TEST-${Date.now()}-${i}`,
      cliente: `${nombre} ${apellido}`,
      telefono: `300${Math.floor(Math.random() * 9000000) + 1000000}`,
      items: [
        {
          nombre: producto.nombre,
          cantidad: cantidad,
          precio: producto.precio,
          notas: Math.random() > 0.7 ? "Sin cebolla" : ""
        }
      ],
      total: producto.precio * cantidad,
      estado: "pendiente",
      timestamp: Date.now() - (Math.random() * 1800000) // Últimos 30 min
    };

    await fetch(`https://TU-PROYECTO-default-rtdb.firebaseio.com/pedidos/${pedido.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido)
    });

    console.log(`Pedido ${i+1}/${cantidad} creado:`, pedido.id);
    
    // Esperar 500ms entre pedidos
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`✅ ${cantidad} pedidos de prueba creados`);
}

// Usar así:
// crearPedidosPrueba(10); // Crea 10 pedidos
```

---

## Limpiar Todos los Pedidos

Para eliminar todos los pedidos de prueba:

### Desde Firebase Console:
1. Ve a Realtime Database
2. Busca el nodo "pedidos"
3. Click derecho → Delete

### Con cURL:
```bash
curl -X DELETE \
  'https://TU-PROYECTO-default-rtdb.firebaseio.com/pedidos.json'
```

### Con JavaScript:
```javascript
fetch('https://TU-PROYECTO-default-rtdb.firebaseio.com/pedidos.json', {
  method: 'DELETE'
})
.then(() => console.log('✅ Todos los pedidos eliminados'))
.catch(err => console.error('Error:', err));
```

---

## Ver el Historial

Para consultar pedidos completados:

```bash
curl 'https://TU-PROYECTO-default-rtdb.firebaseio.com/historial.json' | python3 -m json.tool
```

O en la consola del navegador:

```javascript
fetch('https://TU-PROYECTO-default-rtdb.firebaseio.com/historial.json')
  .then(res => res.json())
  .then(data => console.table(Object.values(data)))
  .catch(err => console.error(err));
```

---

## Estadísticas Rápidas

Ver cuántos pedidos hay por estado:

```javascript
fetch('https://TU-PROYECTO-default-rtdb.firebaseio.com/pedidos.json')
  .then(res => res.json())
  .then(data => {
    const pedidos = Object.values(data || {});
    const stats = pedidos.reduce((acc, p) => {
      acc[p.estado] = (acc[p.estado] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Estadísticas:', stats);
    console.log(`Total: ${pedidos.length} pedidos`);
  });
```

---

**¡Usa estos ejemplos para probar tu KDS! 🧪**
