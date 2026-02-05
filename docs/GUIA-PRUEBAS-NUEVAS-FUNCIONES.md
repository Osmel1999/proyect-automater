# 🧪 Guía de Pruebas - Nuevas Funcionalidades

**Fecha:** 30 de enero de 2025  
**Versión:** 1.0.0

---

## 📋 Casos de Prueba

### ✅ Prueba 1: Comentario en Flujo Conversacional

**Objetivo:** Verificar que el cliente puede agregar comentarios durante el flujo conversacional.

**Pasos:**
1. Iniciar conversación con el bot (enviar "Hola")
2. Seleccionar productos del menú
3. Agregar al menos 2 productos al carrito
4. Cuando el bot solicite el teléfono, proporcionarlo
5. **NUEVO:** El bot preguntará si deseas agregar comentarios
6. Escribir un comentario (ej: "Sin cebolla, con extra queso")
7. Continuar con el método de pago
8. Confirmar el pedido

**Resultado Esperado:**
- El bot debe aceptar el comentario
- Mostrar confirmación: "✅ Comentario guardado: [tu comentario]"
- El pedido debe guardarse con el comentario en Firebase
- El comentario debe aparecer en el KDS con fondo amarillo destacado

**Comandos de Prueba (WhatsApp):**
```
> Hola
> 1
> 2
> 3001234567
> Sin cebolla, extra queso por favor
> tarjeta
> confirmar
```

---

### ✅ Prueba 2: Omitir Comentario en Flujo Conversacional

**Objetivo:** Verificar que el cliente puede omitir el comentario.

**Pasos:**
1. Iniciar conversación con el bot
2. Agregar productos al carrito
3. Proporcionar teléfono
4. Cuando el bot solicite comentarios, responder "no" u "omitir"
5. Continuar con el flujo normal

**Resultado Esperado:**
- El bot debe continuar sin guardar comentario
- El pedido se guarda sin campo `comentario`
- El KDS no muestra sección de comentario

**Comandos de Prueba:**
```
> Hola
> 1
> 3001234567
> no
> efectivo
> confirmar
```

---

### ✅ Prueba 3: Comentario en Pedido Rápido

**Objetivo:** Verificar que el formato estructurado acepta comentarios.

**Pasos:**
1. Enviar un pedido rápido estructurado con la sección `Comentario:`

**Comando de Prueba:**
```
Pedido:
1. Hamburguesa Clásica
2. Papas Fritas

Dirección: Calle 123 #45-67, Apt 301

Teléfono: 3001234567

Comentario: Masa delgada, bien cocida, sin tomate

Pago: Tarjeta
```

**Resultado Esperado:**
- El bot debe parsear correctamente el comentario
- El comentario debe guardarse en la sesión
- Debe aparecer en el resumen del pedido
- Debe mostrarse en el KDS

---

### ✅ Prueba 4: Pedido Rápido sin Comentario

**Objetivo:** Verificar que el pedido rápido funciona sin comentario.

**Comando de Prueba:**
```
Pedido:
1. Pizza Familiar

Dirección: Calle 456 #78-90

Teléfono: 3009876543

Pago: Efectivo
```

**Resultado Esperado:**
- El pedido se procesa normalmente
- No hay campo `comentario` en Firebase
- El KDS no muestra sección de comentario

---

### ✅ Prueba 5: Recomendación de Envío Gratis - Cliente Cerca

**Objetivo:** Verificar que el bot recomienda productos adicionales cuando el cliente está cerca del monto mínimo.

**Precondiciones:**
- Configurar en Firebase: `deliveryCost.freeDeliveryMin = 50000`
- Configurar en Firebase: `deliveryCost.cost = 5000`

**Pasos:**
1. Agregar productos cuyo subtotal sea $42.000 - $47.000 (dentro del 30% del mínimo)
2. Llegar al paso de método de pago

**Resultado Esperado:**
```
💳 ¿Cómo deseas pagar tu pedido?

💰 Total a pagar: $47.000

🎁 ¡Estás cerca del domicilio gratis!
   Solo te faltan $3.000 para obtener envío sin costo.
   ¿Quieres agregar algo más? 😊

   Escribe "menu" para ver opciones o continúa con tu pago.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Comandos de Prueba:**
```
> Hola
> 1  (producto de $22.000)
> 2  (producto de $25.000)
> 3001234567
> no  (sin comentario)
[AQUÍ DEBE APARECER LA RECOMENDACIÓN]
> menu  (para ver opciones y agregar más)
```

---

### ✅ Prueba 6: Recomendación de Envío Gratis - Cliente Calificó

**Objetivo:** Verificar que el bot felicita al cliente cuando alcanza el envío gratis.

**Pasos:**
1. Agregar productos cuyo subtotal sea ≥ $50.000
2. Llegar al paso de método de pago

**Resultado Esperado:**
```
💳 ¿Cómo deseas pagar tu pedido?

💰 Total a pagar: $55.000

🎉 ¡Felicidades! Tu domicilio es GRATIS
   Tu pedido supera los $50.000 ✨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Comandos de Prueba:**
```
> Hola
> 1  (producto de $30.000)
> 2  (producto de $25.000)
> 3001234567
> no
[AQUÍ DEBE APARECER LA FELICITACIÓN]
```

---

### ✅ Prueba 7: Sin Configuración de Envío Gratis

**Objetivo:** Verificar que el flujo funciona sin configuración de envío gratis.

**Precondiciones:**
- Eliminar o no configurar `deliveryCost.freeDeliveryMin` en Firebase

**Resultado Esperado:**
- El mensaje de método de pago NO incluye recomendaciones
- El flujo continúa normalmente
- No hay errores en el backend

---

### ✅ Prueba 8: Visualización en KDS

**Objetivo:** Verificar que los comentarios se muestran correctamente en el KDS.

**Pasos:**
1. Crear un pedido con comentario
2. Abrir el KDS (`kds.html`)
3. Buscar la tarjeta del pedido

**Resultado Esperado:**
- La tarjeta muestra el pedido completo
- El comentario aparece en una sección destacada con:
  - 📝 Icono de mensaje
  - Fondo amarillo (tipo nota adhesiva)
  - Texto: "**Nota del cliente:** [comentario]"
  - Ubicado entre los items y los botones de acción

**Verificación Visual:**
```html
<div class="order-comment">
  <svg>...</svg>
  <span><strong>Nota del cliente:</strong> Sin cebolla, extra queso</span>
</div>
```

---

### ✅ Prueba 9: Múltiples Pedidos con y sin Comentarios

**Objetivo:** Verificar que el sistema maneja correctamente pedidos mixtos.

**Pasos:**
1. Crear pedido A con comentario
2. Crear pedido B sin comentario
3. Crear pedido C con comentario diferente
4. Verificar en KDS que todos se muestran correctamente

**Resultado Esperado:**
- Pedido A: Muestra su comentario
- Pedido B: No muestra sección de comentario
- Pedido C: Muestra su comentario diferente
- No hay confusión entre pedidos

---

### ✅ Prueba 10: Comentarios Largos

**Objetivo:** Verificar que el sistema maneja comentarios extensos.

**Comando de Prueba:**
```
> Hola
> 1
> 3001234567
> Sin cebolla, sin tomate, con extra queso, masa delgada, bien cocida, agregar salsa BBQ extra, papas crocantes, con ají y sin sal
> tarjeta
> confirmar
```

**Resultado Esperado:**
- El comentario completo se guarda
- Se muestra sin truncar en el KDS
- El diseño responsive se ajusta correctamente

---

## 🔍 Verificación en Firebase

### Estructura de Datos Esperada

```json
{
  "tenants": {
    "restaurante-demo": {
      "config": {
        "deliveryCost": {
          "cost": 5000,
          "freeDeliveryMin": 50000,
          "enabled": true
        }
      },
      "pedidos": {
        "abc123": {
          "orderId": "abc123",
          "displayId": "1A2B",
          "cliente": "Juan Pérez",
          "telefono": "3001234567",
          "direccion": "Calle 123 #45-67",
          "comentario": "Sin cebolla, extra queso",
          "items": [
            {
              "numero": 1,
              "nombre": "Hamburguesa Clásica",
              "precio": 15000,
              "cantidad": 1
            }
          ],
          "subtotal": 15000,
          "costoEnvio": 5000,
          "total": 20000,
          "metodoPago": "tarjeta",
          "estado": "pendiente",
          "timestamp": 1738274400000
        }
      }
    }
  }
}
```

### Consultas de Verificación

**Verificar pedidos con comentarios:**
```
Firebase Console > Database > tenants/{tenantId}/pedidos
Filtrar por: comentario != null
```

**Verificar configuración de envío:**
```
Firebase Console > Database > tenants/{tenantId}/config/deliveryCost
Verificar: freeDeliveryMin existe y tiene valor numérico
```

---

## 📊 Métricas de Éxito

### Comentarios del Cliente
- [ ] 100% de comentarios se guardan correctamente
- [ ] 100% de comentarios aparecen en KDS
- [ ] 0 errores al omitir comentarios
- [ ] Diseño responsive funciona en móvil y desktop

### Recomendación de Envío Gratis
- [ ] Recomendación aparece en el rango correcto (30% del mínimo)
- [ ] Felicitación aparece cuando se alcanza el mínimo
- [ ] No aparecen errores sin configuración
- [ ] Funciona en ambos flujos (conversacional y rápido)

---

## 🐛 Problemas Conocidos

*(Lista vacía - actualizar si se encuentran problemas)*

---

## 📞 Reportar Problemas

Si encuentras algún problema durante las pruebas:

1. **Capturar información:**
   - Screenshot del error (si aplica)
   - Logs del servidor (consola)
   - Datos de entrada que causaron el problema
   - Comportamiento esperado vs real

2. **Verificar:**
   - Configuración de Firebase
   - Versión del código
   - Estado de la sesión del usuario

3. **Documentar:**
   - Paso a paso para reproducir
   - Ambiente (desarrollo/producción)
   - Tenant ID afectado

---

**Fin de la Guía de Pruebas** ✅
