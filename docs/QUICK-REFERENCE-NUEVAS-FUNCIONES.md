# 🚀 Guía Rápida: Comentarios y Envío Gratis

**Para Desarrolladores** - Referencia de 5 minutos

---

## 📝 Comentarios del Cliente

### Cómo Funciona

**En el Flujo Conversacional:**
```
Cliente → Agrega productos → Proporciona teléfono
     ↓
Bot: "¿Comentarios especiales?"
     ↓
Cliente: "Sin cebolla" O "no"
     ↓
Bot guarda en sesion.comentario
     ↓
Se incluye en pedido en Firebase
```

**En Pedido Rápido:**
```
Pedido:
1. Hamburguesa
Dirección: Calle 123
Teléfono: 300123456
Comentario: Sin cebolla    ← Se parsea automáticamente
```

### Código Clave

**Solicitar comentario:**
```javascript
// server/bot-logic.js ~línea 2007
function solicitarComentario(sesion) {
  sesion.esperandoComentario = true;
  return mensaje;
}
```

**Guardar comentario:**
```javascript
// server/bot-logic.js ~línea 1498, 1602, 1738
comentario: sesion.comentario || null
```

**Mostrar en KDS:**
```javascript
// app.js ~línea 315
${order.comentario ? `
  <div class="order-comment">
    <span><strong>Nota del cliente:</strong> ${order.comentario}</span>
  </div>
` : ''}
```

---

## 🎁 Recomendación de Envío Gratis

### Cómo Funciona

```
Bot calcula subtotal
     ↓
Obtiene config: freeDeliveryMin
     ↓
Compara: subtotal vs mínimo
     ↓
Si diferencia ≤ 30% → "¡Estás cerca!"
Si subtotal ≥ mínimo → "¡Felicidades!"
```

### Código Clave

**Obtener config:**
```javascript
// server/bot-logic.js ~línea 105
const envioData = await obtenerCostoEnvio(tenantId, subtotal);
// Retorna: { cost, freeShippingThreshold, isFreeShipping, isFree }
```

**Lógica de recomendación:**
```javascript
// server/bot-logic.js ~línea 2055
const diferencia = freeShippingThreshold - subtotal;

if (diferencia > 0 && diferencia <= threshold * 0.3) {
  // Mostrar "¡Estás cerca!"
} else if (subtotal >= threshold) {
  // Mostrar "¡Felicidades!"
}
```

---

## 🔧 Configuración Firebase

```json
{
  "tenants": {
    "tu-restaurante": {
      "config": {
        "deliveryCost": {
          "cost": 5000,
          "freeDeliveryMin": 50000,  ← ESTO activa la feature
          "enabled": true
        }
      },
      "pedidos": {
        "abc123": {
          "comentario": "Sin cebolla",  ← Campo opcional
          "items": [...],
          // ... otros campos
        }
      }
    }
  }
}
```

---

## 🧪 Prueba Rápida

### Comentario
```
> Hola
> 1
> 3001234567
> Sin cebolla
> tarjeta
> confirmar
```

### Envío Gratis
```
Subtotal: $45.000
Mínimo: $50.000
→ Bot dice: "¡Estás cerca! Faltan $5.000"
```

---

## 📁 Archivos Modificados

```
server/bot-logic.js       ← Backend principal (2 funciones nuevas)
app.js                    ← KDS frontend (1 sección nueva)
css/kds-modern.css        ← Estilos (1 clase nueva)
```

---

## 🐛 Debug

**Ver logs de comentario:**
```javascript
console.log('Comentario guardado:', sesion.comentario);
```

**Ver logs de envío:**
```javascript
console.log('Envío data:', envioData);
```

**Firebase Console:**
```
tenants/{id}/pedidos/{orderId}/comentario
tenants/{id}/config/deliveryCost/freeDeliveryMin
```

---

## ✅ Checklist Pre-Deploy

- [ ] `freeDeliveryMin` configurado en Firebase
- [ ] Probado flujo conversacional
- [ ] Probado pedido rápido
- [ ] Verificado en KDS
- [ ] Sin errores en consola

---

**Listo!** 🚀

Docs completas en:
- `docs/NUEVAS-FUNCIONES-COMENTARIOS-DOMICILIO-GRATIS.md`
- `docs/GUIA-PRUEBAS-NUEVAS-FUNCIONES.md`
- `docs/RESUMEN-IMPLEMENTACION-FINAL.md`
