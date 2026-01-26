# ✨ ACTUALIZACIÓN: Flujo de Selección de Método de Pago

**Fecha:** 23 de Enero de 2026  
**Cambio:** Se agregó pregunta sobre método de pago antes de generar enlace

---

## 🎯 ¿QUÉ CAMBIÓ?

Antes, el bot generaba automáticamente el enlace de pago si el restaurante tenía gateway configurado. Ahora, **el bot pregunta al cliente cómo desea pagar** y solo genera el enlace si elige "tarjeta".

---

## 💬 NUEVO FLUJO COMPLETO

### 1️⃣ Cliente hace pedido
```
Cliente: "quiero 2 hamburguesas y 1 coca cola"
Bot: "✅ Entendí tu pedido: 
     2x Hamburguesa - $50.000
     1x Coca Cola - $5.000
     Total: $55.000
     ¿Está correcto?"
```

### 2️⃣ Cliente confirma
```
Cliente: "sí"
Bot: "📍 ¡Perfecto! Solo necesitamos tu dirección
     Por favor envíanos la dirección completa de entrega.
     
     📝 Formato: Calle/Carrera + # + número
     Ejemplo: Calle 80 #12-34
     
     ¿A dónde enviamos tu pedido? 🏠"
```

### 3️⃣ Cliente da dirección
```
Cliente: "Calle 80 #12-34"
Bot: "📱 ¡Genial! Ahora necesitamos tu número de contacto
     Por favor envíanos un número de teléfono al cual
     podamos llamarte para avisar cuando el pedido llegue.
     
     📝 Formato: 10 dígitos
     Ejemplos:
     • 3001234567
     • 300 123 4567
     
     ¿Cuál es tu número de contacto? ☎️"
```

### 4️⃣ Cliente da teléfono
```
Cliente: "3001234567"
```

### 5️⃣ ✨ NUEVO: Bot pregunta método de pago
```
Bot: "💳 ¿Cómo deseas pagar tu pedido?

     💰 Total a pagar: $55.000
     
     📱 Selecciona una opción:
     
     1️⃣ Tarjeta - Pago seguro en línea
        • Tarjeta de crédito/débito
        • PSE (transferencia bancaria)
        • Nequi
        🔒 100% seguro y encriptado
     
     2️⃣ Efectivo/Transferencia - Al recibir
        • Paga en efectivo al domiciliario
        • O confirma tu transferencia después
     
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     Responde tarjeta o efectivo para continuar."
```

---

## 🔀 DOS CAMINOS POSIBLES

### Camino A: Cliente elige "TARJETA" 💳

```
Cliente: "tarjeta"

Bot: "🎉 ¡Tu pedido está casi listo!

     📋 Número de pedido: #A3F5B2
     📍 Dirección: Calle 80 #12-34
     📱 Teléfono de contacto: 300 123 4567
     💰 Total a pagar: $55.000
     
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     💳 PAGO SEGURO EN LÍNEA
     
     👉 Haz clic aquí para pagar ahora:
     https://checkout.wompi.co/l/ABC123XYZ
     
     ✅ Puedes pagar con tarjeta de crédito/débito, PSE o Nequi
     🔒 Pago 100% seguro y encriptado
     
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     Una vez confirmes el pago, Mi Restaurante
     empezará a preparar tu pedido.
     
     🕒 Tiempo estimado: 30-40 minutos
     
     Te avisaremos cuando esté listo para entrega 🛵"
```

**En Firebase:**
```javascript
{
  estado: "pendiente_pago",
  paymentStatus: "PENDING",
  metodoPago: "tarjeta",
  paymentLink: "https://checkout.wompi.co/l/ABC123XYZ",
  paymentTransactionId: "12345-6789"
}
```

### Camino B: Cliente elige "EFECTIVO" 💵

```
Cliente: "efectivo"

Bot: "🎉 ¡Listo! Tu pedido está confirmado

     📋 Número de pedido: #A3F5B2
     📍 Dirección: Calle 80 #12-34
     📱 Teléfono de contacto: 300 123 4567
     💰 Total: $55.000
     💵 Forma de pago: Efectivo
     
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     Ya lo enviamos a la cocina de Mi Restaurante. 👨‍🍳
     
     💵 Pago:
     • Puedes pagar en efectivo al domiciliario
     • O si prefieres transferencia, pregunta los datos al domiciliario
     
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     
     Te llamaremos al número que nos diste cuando
     el domiciliario esté en camino. 🛵
     
     🕒 Tiempo estimado: 30-40 minutos
     
     ¿Quieres pedir algo más? Escribe menu cuando quieras."
```

**En Firebase:**
```javascript
{
  estado: "pendiente",
  paymentStatus: "CASH",
  metodoPago: "efectivo",
  // NO tiene paymentLink ni paymentTransactionId
}
```

---

## 🎯 PALABRAS CLAVE RECONOCIDAS

### Para "Tarjeta" ✅
- `tarjeta`
- `1`
- `tarjetas`
- `credito` / `crédito`
- `debito` / `débito`
- `pse`
- `nequi`
- `online`
- `en linea` / `en línea`
- `pago en linea` / `pago en línea`
- `pago online`

### Para "Efectivo" ✅
- `efectivo`
- `2`
- `cash`
- `transferencia`
- `contraentrega`
- `al recibir`
- `cuando llegue`
- `en efectivo`

### Respuesta no reconocida ❓
```
Cliente: "no sé"

Bot: "❓ No entendí tu respuesta

     Por favor indica cómo deseas pagar:
     
     • Responde tarjeta para pago en línea
     • Responde efectivo para pago al recibir
     
     ¿Cómo deseas pagar? 💳"
```

---

## 🔧 CAMBIOS TÉCNICOS

### 1. Sesión actualizada
```javascript
{
  // ...existing fields...
  esperandoMetodoPago: false,  // ✨ Nuevo
  metodoPago: null             // ✨ 'tarjeta' o 'efectivo'
}
```

### 2. Nuevas funciones

#### `solicitarMetodoPago(sesion)`
- Se llama después de recibir el teléfono
- Pregunta al cliente cómo desea pagar
- Muestra las dos opciones claramente

#### `procesarMetodoPago(sesion, texto, textoOriginal)`
- Valida la respuesta del cliente
- Reconoce palabras clave para ambas opciones
- Llama a `confirmarPedido()` o `confirmarPedidoEfectivo()` según corresponda

#### `confirmarPedidoEfectivo(sesion, pedidoKey, numeroHex, itemsAgrupados)`
- Nueva función para manejar pago en efectivo
- NO genera enlace de pago
- Guarda pedido con estado `pendiente` y `paymentStatus: 'CASH'`
- Envía mensaje de confirmación para pago al recibir

### 3. Función `confirmarPedido()` actualizada
- Ahora solo se llama cuando el cliente eligió "tarjeta"
- Genera el enlace de pago
- Guarda `metodoPago` en el pedido

### 4. Función `procesarTelefono()` actualizada
```javascript
// Antes: Confirmaba directamente
return await confirmarPedido(sesion);

// Ahora: Pregunta método de pago (si tiene gateway) o confirma (si no tiene)
if (!gatewayConfig || !gatewayConfig.enabled) {
  return await confirmarPedido(sesion); // Flujo tradicional
}
return solicitarMetodoPago(sesion); // ✨ Pregunta método
```

---

## 📊 DIAGRAMA DE FLUJO

```
Cliente hace pedido
       ↓
Cliente confirma
       ↓
Cliente da dirección
       ↓
Cliente da teléfono
       ↓
¿Restaurante tiene gateway configurado?
       ├─ NO → confirmarPedido() (flujo tradicional, efectivo)
       │
       └─ SÍ → Bot pregunta: "¿Cómo deseas pagar?"
                      ↓
              ┌───────┴───────┐
              ↓               ↓
          "Tarjeta"      "Efectivo"
              ↓               ↓
    confirmarPedido()  confirmarPedidoEfectivo()
    (genera enlace)    (sin enlace)
              ↓               ↓
        Pago Online    Pago al recibir
```

---

## 🧪 TESTING

### Caso 1: Cliente elige tarjeta
```bash
1. Cliente: "hola"
2. Cliente: "quiero 2 hamburguesas"
3. Cliente: "sí"
4. Cliente: "Calle 80 #12-34"
5. Cliente: "3001234567"
6. Bot: "¿Cómo deseas pagar?"
7. Cliente: "tarjeta" ✅
8. Bot: [Enlace de pago]
```

### Caso 2: Cliente elige efectivo
```bash
1. Cliente: "hola"
2. Cliente: "quiero 2 hamburguesas"
3. Cliente: "sí"
4. Cliente: "Calle 80 #12-34"
5. Cliente: "3001234567"
6. Bot: "¿Cómo deseas pagar?"
7. Cliente: "efectivo" ✅
8. Bot: [Confirmación sin enlace]
```

### Caso 3: Restaurante sin gateway
```bash
1. Cliente: "hola"
2. Cliente: "quiero 2 hamburguesas"
3. Cliente: "sí"
4. Cliente: "Calle 80 #12-34"
5. Cliente: "3001234567"
6. Bot: [Confirmación directa, sin preguntar método] ✅
```

---

## 💡 VENTAJAS DEL NUEVO FLUJO

### Para el Cliente
- ✅ **Más control:** Elige cómo pagar
- ✅ **Flexibilidad:** No obligado a pagar en línea
- ✅ **Claridad:** Opciones explícitas y fáciles de entender

### Para el Restaurante
- ✅ **Menos abandonos:** Cliente puede elegir efectivo si no quiere pagar online
- ✅ **Datos útiles:** Sabe de antemano cómo va a pagar el cliente
- ✅ **Mejor preparación:** Puede preparar cambio si sabe que es efectivo

### Para el Sistema
- ✅ **Eficiencia:** Solo genera enlaces cuando realmente se necesitan
- ✅ **Ahorro de API calls:** No llama a Wompi/Bold si no es necesario
- ✅ **Trazabilidad:** Método de pago guardado en Firebase

---

## 📁 ARCHIVOS MODIFICADOS

### `server/bot-logic.js`

**Cambios:**
1. ✅ Agregado `esperandoMetodoPago` y `metodoPago` a la sesión
2. ✅ Agregado handler para `esperandoMetodoPago` en `processMessage()`
3. ✅ Nueva función `solicitarMetodoPago()`
4. ✅ Nueva función `procesarMetodoPago()`
5. ✅ Nueva función `confirmarPedidoEfectivo()`
6. ✅ Actualizada función `procesarTelefono()` para preguntar método
7. ✅ Actualizada función `confirmarPedido()` para solo generar enlace si eligió tarjeta

**Líneas agregadas:** ~200  
**Funciones nuevas:** 3

---

## 🎉 RESULTADO

El bot ahora es más **inteligente y flexible**:
- ✅ Pregunta antes de generar enlaces innecesarios
- ✅ Respeta la preferencia del cliente
- ✅ Mantiene compatibilidad con restaurantes sin gateway
- ✅ Flujo natural y fácil de entender

---

**Status:** ✅ **IMPLEMENTADO Y FUNCIONANDO**  
**Fecha:** 23 de Enero de 2026

🎯💳 **¡El cliente ahora tiene el control!**
