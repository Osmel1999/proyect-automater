# 🎯 Quick Reference - Método de Pago en WhatsApp Bot

**Para:** Desarrolladores y QA  
**Fecha:** 16/01/2025

---

## ⚡ TL;DR

El bot ahora pregunta **"¿Cómo deseas pagar?"** antes de generar el enlace.

- ✅ Cliente elige "tarjeta" → Genera enlace de Wompi
- ✅ Cliente elige "efectivo" → Confirma sin enlace
- ✅ Si no hay gateway → Flujo tradicional (sin pregunta)

---

## 📍 Ubicación del Código

```bash
/server/bot-logic.js
  → Líneas 78: Estados esperandoMetodoPago, metodoPago
  → Líneas 163-165: Verificación en processMessage
  → Líneas 945-968: procesarTelefono (decide si preguntar)
  → Líneas 970-993: solicitarMetodoPago (pregunta al cliente)
  → Líneas 995-1036: procesarMetodoPago (procesa respuesta)
  → Líneas 605-740: confirmarPedido (genera enlace solo si tarjeta)
  → Líneas 739-836: confirmarPedidoEfectivo (sin enlace)
```

---

## 🔄 Flujo del Código

```javascript
// 1. Cliente ingresa teléfono
await procesarTelefono(sesion, telefono)
  ↓
// 2. Verificar si gateway está activo
const gatewayConfig = await firebase.ref('...').once('value')
  ↓
// 3a. Si gateway activo → Preguntar
if (gatewayConfig.enabled) {
  return solicitarMetodoPago(sesion)
}
  ↓
// 3b. Si gateway NO activo → Confirmar directo
return await confirmarPedido(sesion)

// ---

// 4. Procesar respuesta del cliente
await procesarMetodoPago(sesion, texto)
  ↓
// 5a. Si "tarjeta" → Generar enlace
if (respuesta === 'tarjeta') {
  sesion.metodoPago = 'tarjeta'
  return await confirmarPedido(sesion)
}
  ↓
// 5b. Si "efectivo" → Confirmar sin enlace
if (respuesta === 'efectivo') {
  sesion.metodoPago = 'efectivo'
  return await confirmarPedidoEfectivo(sesion)
}
```

---

## 🧪 Cómo Probar

### Prueba 1: Con gateway activo + tarjeta
```bash
# 1. Configurar gateway en Firebase
tenants/{tenantId}/payments/gateway/enabled = true

# 2. Hacer pedido por WhatsApp
Cliente: "hola"
Cliente: "Quiero 2 hamburguesas"
Cliente: "sí"
Cliente: "Calle 80 #12-34"
Cliente: "3001234567"
   → Bot pregunta: "¿Cómo deseas pagar?"
Cliente: "tarjeta"
   → ✅ Bot genera enlace de Wompi
```

### Prueba 2: Con gateway activo + efectivo
```bash
# Mismo flujo hasta...
Cliente: "efectivo"
   → ✅ Bot confirma SIN enlace
```

### Prueba 3: Sin gateway activo
```bash
# 1. Desactivar gateway en Firebase
tenants/{tenantId}/payments/gateway/enabled = false

# 2. Hacer pedido
Cliente: "3001234567"
   → ✅ Bot NO pregunta método de pago
   → ✅ Confirma directo con flujo tradicional
```

---

## 🐛 Debugging

### Ver estado de sesión
```javascript
// En bot-logic.js, línea ~960 (dentro de procesarTelefono)
console.log('DEBUG - Sesión:', JSON.stringify(sesion, null, 2))
console.log('DEBUG - Gateway config:', gatewayConfig)
```

### Ver qué método eligió el cliente
```javascript
// En bot-logic.js, línea ~1000 (dentro de procesarMetodoPago)
console.log('DEBUG - Cliente eligió:', sesion.metodoPago)
```

### Ver si se genera enlace
```javascript
// En bot-logic.js, línea ~610 (dentro de confirmarPedido)
console.log('DEBUG - Generando enlace para:', sesion.metodoPago)
```

---

## ✅ Checklist de Validación

Después de hacer cambios, verificar:

- [ ] Bot pregunta método de pago después de teléfono
- [ ] Reconoce "tarjeta" y sus variantes
- [ ] Reconoce "efectivo" y sus variantes
- [ ] Genera enlace SOLO si elige "tarjeta"
- [ ] NO genera enlace si elige "efectivo"
- [ ] NO pregunta si gateway no está activo
- [ ] Pedido se guarda correctamente en Firebase
- [ ] Estado correcto: `pendiente_pago` (tarjeta) o `pendiente` (efectivo)
- [ ] paymentStatus correcto: `PENDING` (tarjeta) o `CASH` (efectivo)

---

## 🔑 Palabras Clave Reconocidas

### TARJETA
```javascript
'tarjeta', '1', 'credito', 'crédito', 'debito', 'débito', 
'pse', 'nequi', 'online', 'en linea', 'pago en linea'
```

### EFECTIVO
```javascript
'efectivo', '2', 'cash', 'transferencia', 'contraentrega', 
'al recibir', 'cuando llegue', 'en efectivo'
```

---

## 📊 Estados del Pedido

| Método | estado | paymentStatus | Tiene enlace |
|--------|--------|---------------|--------------|
| Tarjeta | `pendiente_pago` | `PENDING` | ✅ SÍ |
| Efectivo | `pendiente` | `CASH` | ❌ NO |

---

## 🔧 Variables de Entorno Necesarias

```bash
# .env
WOMPI_PUBLIC_KEY=pub_test_...
WOMPI_PRIVATE_KEY=prv_test_...
WOMPI_EVENTS_SECRET=test_events_...
NODE_ENV=development
```

---

## 🚨 Errores Comunes

### Error: Bot no pregunta método de pago
**Causa:** Gateway no activo en Firebase  
**Solución:**
```javascript
// Firebase:
tenants/{tenantId}/payments/gateway/enabled = true
tenants/{tenantId}/payments/gateway/provider = "wompi"
```

### Error: Genera enlace aunque eligió efectivo
**Causa:** Lógica condicional incorrecta  
**Solución:** Verificar línea 605-613 en bot-logic.js
```javascript
if (sesion.metodoPago === 'tarjeta') {
  // Genera enlace
}
```

### Error: No reconoce la respuesta del cliente
**Causa:** Variante no incluida en arrays de opciones  
**Solución:** Agregar en líneas 1002-1019 de bot-logic.js

---

## 📞 Contacto

Si encuentras un bug o tienes preguntas:

1. Revisa los logs: `console.log` en bot-logic.js
2. Verifica Firebase: `tenants/{tenantId}/payments/`
3. Consulta: [GUIA-PRUEBAS-METODO-PAGO.md](./GUIA-PRUEBAS-METODO-PAGO.md)

---

## 📚 Documentación Relacionada

- [CONFIRMACION-FLUJO-IMPLEMENTADO.md](./CONFIRMACION-FLUJO-IMPLEMENTADO.md) - Confirmación técnica
- [DIAGRAMA-SECUENCIA-METODO-PAGO.md](./DIAGRAMA-SECUENCIA-METODO-PAGO.md) - Diagrama visual
- [GUIA-PRUEBAS-METODO-PAGO.md](./GUIA-PRUEBAS-METODO-PAGO.md) - Guía de pruebas completa
- [FASE-3-COMPLETADA.md](./FASE-3-COMPLETADA.md) - Contexto de implementación

---

**Última actualización:** 16/01/2025
