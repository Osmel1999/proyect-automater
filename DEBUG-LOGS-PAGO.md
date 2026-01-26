# 🔍 Logs Detallados para Debuggear Enlace de Pago

## Fecha
24 de enero de 2026

## Problema
El sistema no genera el enlace de pago cuando un cliente elige pagar con tarjeta.

## Solución Implementada
Se agregaron logs detallados en todo el flujo de generación de enlace de pago para identificar el problema exacto.

---

## 📊 Logs Agregados

### 1. **bot-logic.js** (Punto de Inicio)
```javascript
// Logs al verificar método de pago y llamar a createPaymentLink
- Método de pago elegido
- Tenant ID
- Pedido Key
- Todos los parámetros enviados a createPaymentLink
- Resultado del servicio de pagos
```

### 2. **payment-service.js** (Orquestador)
```javascript
// Logs en cada paso del proceso:
PASO 1: Obtener configuración del gateway
  - restaurantId recibido
  - Configuración encontrada/no encontrada
  - Gateway habilitado/deshabilitado
  
PASO 2: Validar monto
  - Monto en centavos
  - Monto en COP
  
PASO 3: Preparar datos del pago
  - reference, amountInCents, customerData, etc.
  
PASO 4: Crear enlace con gateway
  - Gateway usado
  - Resultado (success, paymentLink, error)
  
PASO 5: Guardar transacción
  - Datos guardados en Firebase
```

### 3. **payment-config-service.js** (Persistencia)
```javascript
// Logs al obtener configuración:
- tenantId buscado
- Path en Firebase: tenants/${tenantId}/paymentConfig
- Snapshot existe o no
- Configuración encontrada (enabled, gateway, credentials)
- Desencriptación de credenciales
- Claves disponibles en credenciales
```

---

## 🎯 Cómo Usar los Logs

### Para el Usuario:
1. **Hacer un nuevo pedido de prueba:**
   - Abrir WhatsApp y enviar mensaje al bot
   - Realizar un pedido completo
   - Elegir "Tarjeta" como método de pago
   - Enviar el pedido

2. **Revisar logs en Railway:**
   ```bash
   railway logs --tail 200 | grep -A 10 -B 10 "createPaymentLink\|PASO\|ERROR"
   ```

3. **Buscar los siguientes indicadores:**

   ✅ **Si TODO está bien, verás:**
   ```
   🔵 INICIO - createPaymentLink
   ✅ Gateway configurado correctamente
   ✅ Monto válido
   ✅ Datos del pago preparados
   ✅ Enlace de pago creado exitosamente
   ✅ Transacción guardada exitosamente
   🟢 FIN - createPaymentLink EXITOSO
   ```

   ❌ **Si hay problema, verás uno de estos errores:**
   ```
   ❌ ERROR: No se encontró configuración para restaurante X
   ❌ ERROR: Gateway deshabilitado para restaurante X
   ❌ ERROR: Monto inválido
   ❌ ERROR creando enlace de pago: [mensaje]
   🔴 ERROR en createPaymentLink
   ```

---

## 📋 Checklist de Verificación

Cuando veas los logs, verifica:

- [ ] **TenantId correcto**: ¿El tenantId del mensaje coincide con alguno configurado?
- [ ] **Configuración existe**: ¿Se encontró configuración en Firebase?
- [ ] **Gateway habilitado**: ¿La configuración tiene `enabled: true`?
- [ ] **Credenciales presentes**: ¿Tiene credenciales encriptadas?
- [ ] **Desencriptación exitosa**: ¿Se pudieron desencriptar las credenciales?
- [ ] **Monto válido**: ¿El monto es mayor a 0?
- [ ] **Gateway responde**: ¿El gateway de Wompi respondió exitosamente?

---

## 🔧 Posibles Problemas y Soluciones

### Problema 1: "No se encontró configuración"
**Causa:** El tenant no tiene pagos configurados en Firebase.

**Solución:**
1. Ir a: https://kdsapp.site/dashboard.html
2. Hacer clic en "Configurar Pagos"
3. Ingresar credenciales de Wompi sandbox
4. Activar toggle "Habilitar pagos en línea"
5. Guardar

### Problema 2: "Gateway deshabilitado"
**Causa:** La configuración existe pero está deshabilitada.

**Solución:**
1. Ir al dashboard
2. Hacer clic en "Configurar Pagos"
3. Activar el toggle
4. Guardar

### Problema 3: "Error desencriptando credenciales"
**Causa:** La clave de encriptación cambió o las credenciales están corruptas.

**Solución:**
1. Re-ingresar las credenciales en el dashboard
2. Guardar nuevamente

### Problema 4: "tenantId no está asignado"
**Causa:** La sesión del bot no tiene tenantId configurado.

**Solución:**
1. Verificar que el bot asigna tenantId al crear la sesión
2. Revisar el código en bot-logic.js donde se inicializa la sesión

### Problema 5: "Error del gateway de Wompi"
**Causa:** Credenciales incorrectas o API de Wompi caída.

**Solución:**
1. Verificar credenciales en el dashboard de Wompi
2. Probar con el endpoint de prueba: POST /api/payments/test

---

## 📁 Archivos Modificados

```
✅ server/payment-service.js
✅ server/payments/payment-config-service.js
✅ server/bot-logic.js
```

---

## 🚀 Despliegue

```bash
# Cambios committeados
git commit -m "feat: agregar logs detallados para debuggear generación de enlace de pago"

# Desplegado a Railway
railway up

# Build time: 30.84 seconds
# Deploy: ✅ Complete
```

---

## 📞 Próximo Paso

**IMPORTANTE:** Hacer un pedido de prueba AHORA y compartir los logs.

Para obtener los logs relevantes:
```bash
railway logs --tail 200 | grep -E "(INICIO|PASO|FIN|ERROR|createPaymentLink|tenantId)" > debug-pago.log
```

Esto creará un archivo con solo los logs relevantes que podemos analizar.

---

## ✅ Formato de Logs

Los logs están formateados con:
- 🔵 Inicio de proceso
- 🔍 Cada paso del proceso
- ✅ Éxito
- ❌ Error
- 🟢 Fin exitoso
- 🔴 Fin con error
- Separadores visuales (=====) para facilitar lectura

---

## 📊 Ejemplo de Logs Exitosos

```
======================================================================
🔵 INICIO - createPaymentLink
======================================================================
📝 Parámetros recibidos:
   - restaurantId: tenant1769095946220o10i5g9zw
   - orderId: -OBxyz123
   - amount: 4000000
   - customerPhone: 3042734424
   
🔍 PASO 1: Obteniendo configuración del gateway...
   🔍 [_getRestaurantGatewayConfig] Buscando config para: tenant1769095946220o10i5g9zw
      🔍 [getConfig] Buscando configuración para tenantId: tenant1769095946220o10i5g9zw
      ✅ [getConfig] Configuración encontrada:
         enabled: true
         gateway: wompi
         hasCredentials: true
   ✅ Gateway configurado correctamente

🔍 PASO 2: Validando monto...
✅ Monto válido: 4000000 centavos (40000 COP)

🔍 PASO 3: Preparando datos del pago...
✅ Datos del pago preparados

🔍 PASO 4: Creando enlace con gateway wompi...
✅ Enlace de pago creado exitosamente: https://checkout.wompi.co/l/...

🔍 PASO 5: Guardando transacción en Firebase...
✅ Transacción guardada exitosamente

======================================================================
🟢 FIN - createPaymentLink EXITOSO
======================================================================
```

---

## 🎯 Objetivo

Con estos logs, podremos identificar EXACTAMENTE en qué paso falla la generación del enlace de pago y por qué.

**Status:** ✅ Desplegado y listo para pruebas
**Siguiente:** Hacer pedido de prueba y analizar logs
