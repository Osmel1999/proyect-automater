# 📝 Fix: Notas a Nivel de Pedido Completo

**Fecha:** 5 de febrero de 2026  
**Problema detectado:** Las notas entre paréntesis se asignaban a productos individuales en lugar de al pedido completo  
**Estado:** ✅ RESUELTO

---

## 🔍 Problema Original

### Comportamiento Anterior (❌ Incorrecto)
Cuando un cliente escribía:
```
"Quiero dos salchipapas sencillas (una sin lechuga)"
```

El sistema intentaba:
- Buscar "una sin lechuga" como producto
- Asignar la nota a cada producto individual
- Las notas se guardaban en `item.notas` (nivel de producto)

### Problemas Detectados
1. ✗ "una sin lechuga" confundía al parser porque "una" se interpretaba como cantidad
2. ✗ Las notas se asignaban por producto, no al pedido completo
3. ✗ No estaba claro para el usuario que las notas son para todo el pedido
4. ✗ El mensaje de confirmación no mencionaba opciones de "editar" o "cambiar"

---

## ✅ Solución Implementada

### 1. Extracción de Notas a Nivel de Pedido

**Archivo:** `server/pedido-parser.js`

**Cambios en `parsearPedido()`:**

```javascript
function parsearPedido(textoPedido, menuCustom = null) {
  const items = [];
  const errores = [];
  let notasPedido = null; // 📝 NUEVO: Notas a nivel de pedido completo
  
  // PASO 0.5: Extraer notas entre paréntesis del pedido completo
  const matchNotasPedido = texto.match(/\(([^)]+)\)/);
  if (matchNotasPedido && matchNotasPedido[1]) {
    notasPedido = matchNotasPedido[1].trim();
    // Eliminar las notas del texto para que no interfieran con el parsing
    texto = texto.replace(/\([^)]+\)/g, '').trim();
  }
  
  // ...procesamiento de productos...
  
  return {
    items,
    errores,
    notas: notasPedido, // 📝 Retornar notas del pedido completo
    exitoso: items.length > 0
  };
}
```

**Antes:**
```javascript
// Notas se asignaban por producto
if (notas) {
  item.notas = notas; // ❌ Por producto
}
```

**Ahora:**
```javascript
// Notas se retornan a nivel de pedido
return {
  items,
  errores,
  notas: notasPedido, // ✅ Para todo el pedido
  exitoso: items.length > 0
};
```

---

### 2. Actualización del Mensaje de Confirmación

**Archivo:** `server/pedido-parser.js` - función `generarMensajeConfirmacion()`

```javascript
// 📝 Mostrar notas del pedido si existen
if (resultado.notas) {
  mensaje += `\n📝 *Nota:* ${resultado.notas}\n`;
}

mensaje += `\n💰 Total: $${formatearPrecio(total)}\n\n`;
```

**Resultado visual:**
```
Perfecto, te confirmo tu pedido:

dos salchipapas sencillas, ¿correcto?

*Detalle:*
• 2x Salchipapa Sencilla - $40.000

📝 *Nota:* una sin lechuga

💰 Total: $40.000

¿Está todo correcto?
Responde *sí* para confirmar, *editar* o *cambiar* si quieres modificar algo, o *cancelar* para empezar de nuevo.
```

---

### 3. Integración en Bot Logic

**Archivo:** `server/bot-logic.js`

#### A. Flujo Conversacional
```javascript
const resultado = parsearPedido(textoOriginal, menuTenant);

if (resultado.exitoso && resultado.items.length > 0) {
  sesion.esperandoConfirmacion = true;
  sesion.pedidoPendiente = resultado.items;
  // 📝 NUEVO: Guardar notas del pedido
  sesion.comentario = resultado.notas || sesion.comentario || null;
  
  return generarMensajeConfirmacion(resultado);
}
```

#### B. Pedido Rápido (Formulario)
```javascript
// 📝 Usar notas del parseo si existen, si no usar el comentario del pedido rápido
sesion.comentario = resultadoParseo.notas || datosPedido.comentario || null;
```

#### C. Ver Carrito
```javascript
// 📝 Mostrar notas del pedido si existen
if (sesion.comentario) {
  mensaje += `\n📝 *Nota:* ${sesion.comentario}\n`;
}
```

#### D. Resumen Pedido Rápido
```javascript
return `📋 *Resumen de tu pedido:*

${resumenItems}
${sesion.comentario ? `\n📝 *Nota:* ${sesion.comentario}\n` : ''}
----------------------
💰 Subtotal: $${formatearPrecio(subtotal)}
...
```

---

### 4. Actualización de Opciones de Confirmación

**Archivo:** `server/bot-logic.js` - función `verCarrito()`

**Antes:**
```
Responde *sí* para confirmar o *cancelar* si quieres modificar algo.
```

**Ahora:**
```
Responde *sí* para confirmar, *editar* o *cambiar* si quieres modificar algo, o *cancelar* para empezar de nuevo.
```

---

### 5. Actualización de Instrucciones del Menú

**Archivo:** `server/bot-logic.js` - función `mostrarMenu()`

**Agregado:**
```javascript
mensaje += '📝 *Agregar notas:*\n';
mensaje += 'Usa parentesis para notas especiales:\n';
mensaje += '_"2 hamburguesas (sin cebolla)"_\n\n';
```

**Resultado visual:**
```
📝 *¿Como ordenar?*

*Opcion 1 - Lenguaje Natural:*
Escribe tu pedido directamente:
_"Quiero 2 hamburguesas y 1 coca cola"_

*Opcion 2 - Por Nombre:*
Envia el nombre del producto.
Ejemplo: *pizza* para agregar una pizza

📝 *Agregar notas:*
Usa parentesis para notas especiales:
_"2 hamburguesas (sin cebolla)"_
```

---

## 📊 Flujo de Datos

### Todos los Tipos de Pedido

```
┌─────────────────────────────────────────┐
│  Cliente escribe:                       │
│  "2 salchipapas (una sin lechuga)"      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  parsearPedido()                        │
│  1. Extrae nota: "una sin lechuga"      │
│  2. Remueve paréntesis del texto        │
│  3. Parsea productos: "2 salchipapas"   │
│  4. Retorna:                            │
│     items: [{nombre: "Salchipapa",...}] │
│     notas: "una sin lechuga"            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Bot Logic                              │
│  sesion.carrito = items                 │
│  sesion.comentario = resultado.notas    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Confirmación / Ver Carrito             │
│  Muestra:                               │
│  • 2x Salchipapa - $40.000              │
│  📝 Nota: una sin lechuga               │
│  💰 Total: $40.000                      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Firebase (al confirmar)                │
│  pedido: {                              │
│    items: [...],                        │
│    comentario: "una sin lechuga",       │
│    ...                                  │
│  }                                      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  KDS (app.js)                           │
│  Muestra:                               │
│  • 2x Salchipapa Sencilla               │
│  📝 Nota del cliente: una sin lechuga   │
└─────────────────────────────────────────┘
```

---

## 🎯 Casos de Uso Soportados

### ✅ Flujo Conversacional - Opción 1 (Lenguaje Natural)

```
Cliente: "Quiero dos salchipapas sencillas (una sin lechuga)"

Bot:     Perfecto, te confirmo tu pedido:
         
         dos salchipapas sencillas, ¿correcto?
         
         *Detalle:*
         • 2x Salchipapa Sencilla - $40.000
         
         📝 *Nota:* una sin lechuga
         
         💰 Total: $40.000
         
         Responde *sí* para confirmar, *editar* o *cambiar*...
```

### ✅ Flujo Conversacional - Opción 2 (Por Nombre)

```
Cliente: "salchipapa sencilla"

Bot:     ✅ Agregado: Salchipapa Sencilla
         💰 Precio: $20.000

Cliente: "ver"

Bot:     Perfecto, llevas en tu pedido:
         
         una salchipapa sencilla
         
         *Detalle:*
         • 1x Salchipapa Sencilla - $20.000
         
         💰 Total: $20.000
```

_Nota: En el modo "por nombre", las notas se agregan durante la confirmación o mediante el comando "ver"_

### ✅ Pedido Rápido (Formulario)

```
Cliente envía formulario:
📱 PEDIDO RAPIDO:
- 2 hamburguesas (sin cebolla)
- Mi direccion es Calle 123

Bot:     📋 *Resumen de tu pedido:*
         
         - 2x Hamburguesa Especial - $60.000
         
         📝 *Nota:* sin cebolla
         
         ----------------------
         💰 Subtotal: $60.000
         Envio: $5.000
         💳 *Total:* $65.000
         ...
```

---

## 🏗️ Compatibilidad

### ✅ Mantiene Retrocompatibilidad

1. **Pedidos sin notas:** Funcionan igual que antes
2. **Campo `comentario`:** Sigue existiendo en Firebase
3. **KDS:** Ya tenía soporte para mostrar `order.comentario`
4. **Pedido rápido con sección "Comentario:":** Aún funciona (legacy)

### 📝 Estructura en Firebase

```javascript
{
  "pedidos": {
    "tenant123": {
      "pedido456": {
        "items": [
          {
            "numero": 1,
            "nombre": "Salchipapa Sencilla",
            "precio": 20000,
            "cantidad": 2
            // ❌ Ya NO tiene: "notas": "una sin lechuga"
          }
        ],
        "comentario": "una sin lechuga", // ✅ Nota a nivel de pedido
        "cliente": "Juan Pérez",
        "telefono": "3001234567",
        "direccion": "Calle 123",
        "metodoPago": "efectivo",
        "estado": "pendiente",
        ...
      }
    }
  }
}
```

---

## 🎨 Visualización en KDS

El KDS (`app.js`) ya soportaba mostrar comentarios a nivel de pedido:

```javascript
${order.comentario ? `
<div class="order-comment">
    <svg ...></svg>
    <span><strong>Nota del cliente:</strong> ${order.comentario}</span>
</div>
` : ''}
```

**Resultado visual en KDS:**

```
┌─────────────────────────────────────┐
│ 🕐 10:30 AM - 5 min                 │
│ 👤 Juan Pérez - 300-123-4567        │
│                                     │
│ • 2x Salchipapa Sencilla            │
│                                     │
│ 💬 Nota del cliente: una sin lechuga│
│                                     │
│ [Empezar a Cocinar]                 │
└─────────────────────────────────────┘
```

---

## 📝 Instrucciones Actualizadas para Usuarios

### En el Menú Principal

```
📝 *¿Como ordenar?*

*Opcion 1 - Lenguaje Natural:*
Escribe tu pedido directamente:
_"Quiero 2 hamburguesas y 1 coca cola"_

*Opcion 2 - Por Nombre:*
Envia el nombre del producto.
Ejemplo: *pizza* para agregar una pizza

📝 *Agregar notas:*
Usa parentesis para notas especiales:
_"2 hamburguesas (sin cebolla)"_
```

### En Mensajes de Error

```
💡 *Tip:* Puedes pedir así:
• "Quiero 2 hamburguesas y 1 coca cola"
• "1 pizza con 3 cervezas"
• "Dame una milanesa y papas fritas"

📝 *Agregar notas:* Usa paréntesis
• "2 hamburguesas (sin cebolla)"
• "1 pizza (extra queso, bien cocida)"
```

---

## 🧪 Casos de Prueba

### Caso 1: Nota Simple
```
Input:  "2 salchipapas (sin lechuga)"
Output: 2x Salchipapa + Nota: "sin lechuga"
```

### Caso 2: Nota con "una"
```
Input:  "2 salchipapas (una sin lechuga)"
Output: 2x Salchipapa + Nota: "una sin lechuga"
```

### Caso 3: Nota Compleja
```
Input:  "3 hamburguesas (una sin cebolla, dos con extra queso)"
Output: 3x Hamburguesa + Nota: "una sin cebolla, dos con extra queso"
```

### Caso 4: Sin Notas
```
Input:  "2 salchipapas"
Output: 2x Salchipapa + Sin nota
```

### Caso 5: Múltiples Productos con Nota
```
Input:  "2 hamburguesas y 1 coca cola (la coca sin hielo)"
Output: 2x Hamburguesa + 1x Coca Cola + Nota: "la coca sin hielo"
```

---

## ✅ Checklist de Implementación

- [x] Parser extrae notas del texto completo del pedido
- [x] Parser retorna `notas` en el resultado
- [x] Notas se eliminan del texto antes de parsear productos
- [x] Bot logic guarda notas en `sesion.comentario`
- [x] Mensaje de confirmación muestra notas del pedido
- [x] Ver carrito muestra notas del pedido
- [x] Resumen de pedido rápido muestra notas
- [x] Instrucciones del menú explican uso de paréntesis
- [x] Mensaje de confirmación incluye opciones "editar" y "cambiar"
- [x] KDS muestra correctamente las notas (ya existía)
- [x] Compatibilidad con pedidos sin notas
- [x] Compatibilidad con pedido rápido legacy

---

## 🎉 Resultado Final

### ✅ Problemas Resueltos

1. ✓ Las notas ahora son para el pedido completo, no por producto
2. ✓ "una sin lechuga" ya no confunde al parser
3. ✓ Las notas se muestran claramente en todos los mensajes de confirmación
4. ✓ El KDS muestra las notas correctamente
5. ✓ Los usuarios tienen instrucciones claras sobre cómo usar paréntesis
6. ✓ Las opciones de "editar" y "cambiar" están disponibles

### 📊 Impacto

- **Sin cambios breaking:** Todo el código anterior sigue funcionando
- **Mejor UX:** Instrucciones más claras para los usuarios
- **Más flexible:** Soporta notas complejas para el pedido completo
- **Consistente:** Mismo comportamiento en todos los flujos de pedido

---

## 🔧 Archivos Modificados

1. `server/pedido-parser.js`
   - Extracción de notas a nivel de pedido
   - Actualización de mensaje de confirmación
   - Eliminación de lógica de notas por producto

2. `server/bot-logic.js`
   - Integración de notas en flujo conversacional
   - Integración de notas en pedido rápido
   - Actualización de mensaje de ver carrito
   - Actualización de instrucciones del menú
   - Actualización de opciones de confirmación

3. `app.js` (KDS)
   - Sin cambios (ya soportaba `order.comentario`)

---

**Fecha de implementación:** 5 de febrero de 2026  
**Estado:** ✅ COMPLETADO Y PROBADO
