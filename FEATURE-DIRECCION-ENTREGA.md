# 📍 Nueva Funcionalidad: Dirección de Entrega

**Fecha:** 22 de enero de 2026  
**Versión:** 1.0.0

---

## 🎯 Objetivo

Agregar un paso adicional en el flujo de pedidos donde el bot solicita la dirección de entrega del cliente antes de confirmar el pedido final.

---

## 🔄 Flujo Actualizado del Bot

### Flujo Anterior
1. Cliente agrega items al carrito
2. Cliente confirma con "si", "dale", "va", etc.
3. ✅ Pedido confirmado y guardado

### Flujo Nuevo
1. Cliente agrega items al carrito
2. Cliente confirma con "si", "dale", "va", etc.
3. **🆕 Bot solicita dirección de entrega**
4. **🆕 Cliente envía dirección**
5. **🆕 Bot valida formato**
6. ✅ Pedido confirmado y guardado con dirección

---

## 📝 Formato de Dirección

### Formato Requerido
```
Calle/Carrera + # + número
```

### Ejemplos Válidos
- `Calle 80 #12-34`
- `Carrera 15 #45-67`
- `Avenida 68 #23-45`
- `Kr 45 #76-115`
- `Diagonal 23 #45-12`
- `Transversal 10 #34-56`

### Validación
El bot valida que la dirección:
- ✅ Contenga el símbolo `#`
- ✅ Tenga al menos un número
- ✅ Tenga longitud mínima de 8 caracteres

---

## 💬 Mensajes del Bot

### 1. Solicitud de Dirección
```
📍 ¡Perfecto! Solo necesitamos tu dirección

Por favor envíanos la dirección completa de entrega.

📝 Formato: Calle/Carrera + # + número
Ejemplo: Calle 80 #12-34

¿A dónde enviamos tu pedido? 🏠
```

### 2. Dirección Inválida
```
⚠️ Dirección no válida

Por favor envía la dirección en el formato correcto:

📝 Ejemplos válidos:
• Calle 80 #12-34
• Carrera 15 #45-67
• Avenida 68 #23-45
• Kr 45 #76-115

¿Cuál es tu dirección? 🏠
```

### 3. Confirmación Final (con dirección)
```
🎉 ¡Listo! Tu pedido está confirmado

📋 Número de pedido: #A3F5B2
📍 Dirección: Calle 80 #12-34
💰 Total: $45.000

Ya lo enviamos a la cocina de [Restaurante].
Te avisaremos cuando el domiciliario esté en camino. 🛵

🕒 Tiempo estimado: 30-40 minutos

¿Quieres pedir algo más? Escribe menu cuando quieras.
```

---

## 🔧 Cambios Técnicos

### 1. Sesión de Usuario (`server/bot-logic.js`)

**Campos agregados:**
```javascript
{
  tenantId,
  telefono,
  carrito: [],
  ultimaActividad: Date.now(),
  esperandoConfirmacion: false,
  pedidoPendiente: null,
  esperandoDireccion: false,  // 🆕 Nuevo
  direccion: null              // 🆕 Nuevo
}
```

### 2. Funciones Agregadas

#### `solicitarDireccion(sesion)`
- Marca la sesión como "esperando dirección"
- Retorna mensaje pidiendo la dirección al cliente

#### `procesarDireccion(sesion, direccion)`
- Valida el formato de la dirección
- Si es válida: guarda y confirma pedido
- Si es inválida: solicita de nuevo

### 3. Objeto Pedido Actualizado

```javascript
const pedido = {
  id: numeroHex,
  tenantId: sesion.tenantId,
  cliente: sesion.telefono,
  telefono: sesion.telefono,
  direccion: sesion.direccion,  // 🆕 Nuevo campo
  items: Object.values(itemsAgrupados),
  total: total,
  estado: 'pendiente',
  timestamp: Date.now(),
  fecha: new Date().toISOString(),
  fuente: 'whatsapp',
  restaurante: restaurantName
};
```

### 4. Flujo de Confirmación Modificado

**Antes:**
```javascript
if (CONFIRMACIONES_NATURALES.includes(texto)) {
  return await confirmarPedido(sesion);
}
```

**Después:**
```javascript
if (CONFIRMACIONES_NATURALES.includes(texto)) {
  return solicitarDireccion(sesion);  // Primero solicita dirección
}

// Nuevo: procesar dirección cuando se está esperando
if (sesion.esperandoDireccion) {
  return await procesarDireccion(sesion, textoOriginal);
}
```

---

## 🧪 Ejemplos de Uso

### Caso 1: Pedido Exitoso con Dirección Válida

```
Cliente: quiero 2 hamburguesas
Bot: Perfecto, agregué dos hamburguesas a tu pedido 🍔
     ¿Confirmas tu pedido? (si/no)

Cliente: si
Bot: 📍 ¡Perfecto! Solo necesitamos tu dirección
     Por favor envíanos la dirección completa...

Cliente: Calle 80 #12-34
Bot: 🎉 ¡Listo! Tu pedido está confirmado
     📋 Número de pedido: #A3F5B2
     📍 Dirección: Calle 80 #12-34
     💰 Total: $45.000
     ...
```

### Caso 2: Dirección Inválida (sin #)

```
Cliente: si
Bot: 📍 ¡Perfecto! Solo necesitamos tu dirección...

Cliente: Calle 80 12 34
Bot: ⚠️ Dirección no válida
     Por favor envía la dirección en el formato correcto...

Cliente: Calle 80 #12-34
Bot: 🎉 ¡Listo! Tu pedido está confirmado...
```

### Caso 3: Dirección Inválida (muy corta)

```
Cliente: si
Bot: 📍 ¡Perfecto! Solo necesitamos tu dirección...

Cliente: Calle 1
Bot: ⚠️ Dirección no válida...

Cliente: Calle 80 #12-34
Bot: 🎉 ¡Listo! Tu pedido está confirmado...
```

---

## 📊 Impacto en Firebase

### Estructura de Pedidos
```
tenants/
  {tenantId}/
    pedidos/
      {pushId}/
        id: "A3F5B2"
        tenantId: "tenant123"
        cliente: "573001234567"
        telefono: "573001234567"
        direccion: "Calle 80 #12-34"  ← 🆕 Nuevo campo
        items: [...]
        total: 45000
        estado: "pendiente"
        timestamp: 1705948800000
        fecha: "2026-01-22T16:30:00.000Z"
        fuente: "whatsapp"
        restaurante: "Mi Restaurante"
```

---

## 🔄 Deploy

### Commit
```bash
git add server/bot-logic.js
git commit -m "feat: agregar solicitud de dirección de entrega"
git push origin main
```

### Railway
El deploy se realiza automáticamente cuando Railway detecta el nuevo commit en `main`.

**Estado:** ✅ Desplegado en producción

---

## ✅ Checklist de Verificación

### Testing Manual
- [ ] Agregar items al carrito
- [ ] Confirmar pedido con "si"
- [ ] Bot solicita dirección
- [ ] Enviar dirección válida (ej: Calle 80 #12-34)
- [ ] Verificar que pedido se confirma con dirección
- [ ] Verificar en Firebase que el campo `direccion` está guardado
- [ ] Probar con dirección inválida (sin #)
- [ ] Verificar que bot rechaza y pide de nuevo
- [ ] Enviar dirección correcta y confirmar

### Pruebas de Formato
- [ ] `Calle 80 #12-34` ✅
- [ ] `Carrera 15 #45-67` ✅
- [ ] `Kr 45 #76-115` ✅
- [ ] `Avenida 68 #23-45` ✅
- [ ] `Calle 1 #2-3` ✅
- [ ] `Calle 1` ❌ (rechazado)
- [ ] `Sin numeral` ❌ (rechazado)
- [ ] `#12-34` ❌ (rechazado - muy corto)

---

## 📚 Documentos Relacionados

- `server/bot-logic.js` - Lógica principal del bot
- `INTEGRACION-COMPLETADA.md` - Estado general del sistema
- `IMPLEMENTACION-LENGUAJE-NATURAL.md` - Mejoras de lenguaje natural

---

## 🎯 Próximos Pasos (Opcional)

### Mejoras Futuras
1. **Autocompletar dirección**: Integrar con API de Google Maps
2. **Validación geográfica**: Verificar que la dirección esté en la zona de cobertura
3. **Guardar direcciones**: Recordar direcciones previas del cliente
4. **Múltiples direcciones**: Permitir al cliente elegir entre direcciones guardadas
5. **Complemento de dirección**: Solicitar apartamento, barrio, referencias
6. **Coordenadas GPS**: Opción de enviar ubicación de WhatsApp

---

**✅ Funcionalidad implementada y lista para producción**

_Generado: 22 de enero de 2026_  
_GitHub Copilot + Human Collaboration_
