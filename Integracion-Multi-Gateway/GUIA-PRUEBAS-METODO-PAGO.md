# 🧪 Guía de Pruebas - Flujo de Método de Pago

Esta guía te permite probar manualmente el flujo completo del bot con el nuevo método de pago.

---

## 📱 Prueba 1: Flujo Completo con TARJETA

### Pasos:

1. **Iniciar conversación**
   ```
   Tú: hola
   Bot: [Muestra menú del restaurante]
   ```

2. **Hacer pedido**
   ```
   Tú: Quiero 2 hamburguesas y 1 coca cola
   Bot: 📋 Tu pedido:
        • 2x Hamburguesa - $40.000
        • 1x Coca Cola - $5.000
        
        💰 Total: $45.000
        
        ¿Confirmas este pedido? (Escribe "confirmar" o "sí")
   ```

3. **Confirmar pedido**
   ```
   Tú: sí
   Bot: 📍 ¡Perfecto! Solo necesitamos tu dirección
        
        Por favor envíanos la dirección completa de entrega.
        
        📝 Formato: Calle/Carrera + # + número
        Ejemplo: Calle 80 #12-34
        
        ¿A dónde enviamos tu pedido? 🏠
   ```

4. **Ingresar dirección**
   ```
   Tú: Calle 80 #12-34
   Bot: 📱 ¡Genial! Ahora necesitamos tu número de contacto
        
        Por favor envíanos un número de teléfono al cual podamos 
        llamarte para avisar cuando el pedido llegue.
        
        📝 Formato: 10 dígitos (puede incluir espacios o guiones)
        Ejemplos:
        • 3001234567
        • 300 123 4567
        • 300-123-4567
        
        ¿Cuál es tu número de contacto? ☎️
   ```

5. **Ingresar teléfono**
   ```
   Tú: 3001234567
   Bot: 💳 ¿Cómo deseas pagar tu pedido?
        
        💰 Total a pagar: $45.000
        
        📱 Selecciona una opción:
        
        1️⃣ Tarjeta - Pago seguro en línea
           • Tarjeta de crédito/débito
           • PSE (transferencia bancaria)
           • Nequi
           🔒 100% seguro y encriptado
        
        2️⃣ Efectivo/Transferencia - Al recibir
           • Paga en efectivo al domiciliario
           • O confirma tu transferencia después
        
        Responde tarjeta o efectivo para continuar.
   ```

6. **Elegir TARJETA**
   ```
   Tú: tarjeta
   Bot: 🎉 ¡Tu pedido está casi listo!
        
        📋 Número de pedido: #A3F5B2
        📍 Dirección: Calle 80 #12-34
        📱 Teléfono de contacto: 300 123 4567
        💰 Total a pagar: $45.000
        
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        💳 PAGO SEGURO EN LÍNEA
        
        👉 Haz clic aquí para pagar ahora:
        https://checkout.wompi.co/l/aBc123...
        
        ✅ Puedes pagar con tarjeta de crédito/débito, PSE o Nequi
        🔒 Pago 100% seguro y encriptado
        
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        Una vez confirmes el pago, La Vaca Loca empezará a preparar tu pedido.
        
        🕒 Tiempo estimado: 30-40 minutos
        
        Te avisaremos cuando esté listo para entrega 🛵
   ```

### ✅ Verificación en Firebase:

```
tenants/
  └─ {tenantId}/
      └─ pedidos/
          └─ {pedidoKey}/
              ├─ id: "A3F5B2"
              ├─ estado: "pendiente_pago"
              ├─ paymentStatus: "PENDING"
              ├─ metodoPago: "tarjeta"
              ├─ paymentLink: "https://checkout.wompi.co/l/..."
              ├─ paymentTransactionId: "wompi_txn_12345"
              ├─ total: 45000
              └─ ...
```

---

## 💵 Prueba 2: Flujo Completo con EFECTIVO

### Pasos 1-5: [Iguales a Prueba 1]

6. **Elegir EFECTIVO**
   ```
   Tú: efectivo
   Bot: 🎉 ¡Listo! Tu pedido está confirmado
        
        📋 Número de pedido: #B4G6C3
        📍 Dirección: Calle 80 #12-34
        📱 Teléfono de contacto: 300 123 4567
        💰 Total: $45.000
        💵 Forma de pago: Efectivo
        
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        Ya lo enviamos a la cocina de La Vaca Loca. 👨‍🍳
        
        💵 Pago:
        • Puedes pagar en efectivo al domiciliario
        • O si prefieres transferencia, pregunta los datos al domiciliario
        
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        Te llamaremos cuando el domiciliario esté en camino. 🛵
        
        🕒 Tiempo estimado: 30-40 minutos
        
        ¿Quieres pedir algo más? Escribe menu cuando quieras.
   ```

### ✅ Verificación en Firebase:

```
tenants/
  └─ {tenantId}/
      └─ pedidos/
          └─ {pedidoKey}/
              ├─ id: "B4G6C3"
              ├─ estado: "pendiente"
              ├─ paymentStatus: "CASH"
              ├─ metodoPago: "efectivo"
              ├─ total: 45000
              └─ ... (SIN paymentLink ni transactionId)
```

---

## 🔄 Prueba 3: Cliente indeciso (respuesta ambigua)

### Paso 6:
```
Tú: no sé
Bot: ❓ No entendí tu respuesta
     
     Por favor indica cómo deseas pagar:
     
     • Responde tarjeta para pago en línea
     • Responde efectivo para pago al recibir
     
     ¿Cómo deseas pagar? 💳
```

### Luego:
```
Tú: tarjeta
Bot: [Genera enlace de pago]
```

---

## 🏢 Prueba 4: Restaurante SIN gateway configurado

### Configuración en Firebase:
```
tenants/
  └─ {tenantId}/
      └─ payments/
          └─ gateway/
              └─ enabled: false  (o no existe)
```

### Comportamiento Esperado:

**Después de ingresar teléfono**, el bot **NO pregunta** método de pago y va directo a:

```
Bot: 🎉 ¡Listo! Tu pedido está confirmado
     
     [Flujo tradicional sin enlace de pago]
```

---

## 🎯 Variantes de Respuesta que el Bot Reconoce

### Para TARJETA:
```
✅ tarjeta
✅ 1
✅ credito / crédito
✅ debito / débito
✅ pse
✅ nequi
✅ online
✅ en linea / en línea
✅ pago en linea
✅ pago online
```

### Para EFECTIVO:
```
✅ efectivo
✅ 2
✅ cash
✅ transferencia
✅ contraentrega
✅ al recibir
✅ cuando llegue
✅ en efectivo
```

---

## 🧪 Checklist de Pruebas

### Funcionalidad Básica
- [ ] Bot pregunta método de pago después de teléfono
- [ ] Muestra total del pedido en la pregunta
- [ ] Reconoce "tarjeta" y variantes
- [ ] Reconoce "efectivo" y variantes
- [ ] Maneja respuestas no reconocidas

### Flujo con TARJETA
- [ ] Genera enlace de pago de Wompi
- [ ] Envía enlace clickeable al cliente
- [ ] Guarda transactionId en Firebase
- [ ] Estado del pedido: `pendiente_pago`
- [ ] paymentStatus: `PENDING`

### Flujo con EFECTIVO
- [ ] NO genera enlace de pago
- [ ] Confirma pedido directamente
- [ ] Estado del pedido: `pendiente`
- [ ] paymentStatus: `CASH`
- [ ] Mensaje indica pago al recibir

### Casos Edge
- [ ] Gateway NO configurado → Flujo tradicional
- [ ] Gateway configurado → Flujo nuevo
- [ ] Cliente responde algo ambiguo → Pide aclaración
- [ ] Error en gateway → Fallback a efectivo

### Persistencia
- [ ] Pedido guardado correctamente en Firebase
- [ ] Todos los campos están presentes
- [ ] metodoPago guardado correctamente
- [ ] Estadísticas actualizadas

---

## 🔧 Comandos de Desarrollo

### Ver logs del servidor
```bash
npm run dev
# o
node server/index.js
```

### Verificar sintaxis
```bash
node -c server/bot-logic.js
```

### Inspeccionar sesión en memoria
```javascript
// En server/bot-logic.js, agregar console.log temporal:
console.log('Sesión actual:', JSON.stringify(sesion, null, 2));
```

---

## 📊 Datos de Prueba

### Direcciones válidas:
```
✅ Calle 80 #12-34
✅ Carrera 15 #45-67
✅ Avenida 68 #23-45
✅ Kr 45 #76-115
✅ Cll 100 #20-30
```

### Direcciones inválidas:
```
❌ Calle 80 (falta #)
❌ #12-34 (falta calle)
❌ Casa 123 (formato incorrecto)
❌ Mi casa (no tiene formato)
```

### Teléfonos válidos:
```
✅ 3001234567
✅ 300 123 4567
✅ 300-123-4567
✅ (300) 123 4567
```

### Teléfonos inválidos:
```
❌ 123456 (muy corto)
❌ 30012345678 (muy largo)
❌ abc1234567 (contiene letras)
```

---

## 🐛 Solución de Problemas

### Problema: Bot no pregunta método de pago
**Causa:** Gateway no está configurado en Firebase
**Solución:** 
```javascript
// En Firebase:
tenants/{tenantId}/payments/gateway/enabled = true
tenants/{tenantId}/payments/gateway/provider = "wompi"
```

### Problema: No genera enlace de pago
**Causa 1:** Cliente eligió "efectivo"
**Solución:** Verificar sesion.metodoPago === 'tarjeta'

**Causa 2:** Credenciales de Wompi no configuradas
**Solución:** Verificar variables en .env:
```
WOMPI_PUBLIC_KEY=pub_test_...
WOMPI_PRIVATE_KEY=prv_test_...
```

### Problema: Error al guardar en Firebase
**Causa:** Permisos de Firebase
**Solución:** Verificar rules en database.rules.json

---

## ✅ Checklist Final

Antes de pasar a producción, verificar:

- [ ] Todas las pruebas manuales pasan
- [ ] Firebase guarda datos correctamente
- [ ] Enlaces de pago funcionan (sandbox)
- [ ] Webhook procesa pagos correctamente
- [ ] Mensajes son claros y sin typos
- [ ] Estados de sesión se limpian correctamente
- [ ] Timeout de sesiones funciona
- [ ] Logs no muestran errores

---

**Última actualización:** 16/01/2025
