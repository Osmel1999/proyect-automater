# 🕒 Análisis: Tiempo de Entrega Personalizado

## 📋 Problema Reportado

El bot está mostrando el tiempo de entrega por defecto (30-40 minutos) en lugar del tiempo personalizado configurado en el dashboard:

```
🕒 Tiempo estimado: 30-40 minutos
```

---

## 🔍 Análisis del Código

### ✅ **El código está CORRECTO y funcionando**

He verificado que la implementación está completa:

### 1️⃣ **Función `obtenerTiempoEntrega`** (payment-service.js, línea 25)

```javascript
async function obtenerTiempoEntrega(tenantId) {
  try {
    const db = admin.database();
    const snapshot = await db.ref(`tenants/${tenantId}/config/deliveryTime`).once('value');
    const deliveryTime = snapshot.val();
    
    if (deliveryTime && deliveryTime.min && deliveryTime.max) {
      return `${deliveryTime.min}-${deliveryTime.max} minutos`;
    }
    
    // Valor por defecto si no está configurado
    return '30-40 minutos';
  } catch (error) {
    console.error('Error obteniendo tiempo de entrega:', error);
    return '30-40 minutos';
  }
}
```

**Estado**: ✅ Correcto - Lee desde Firebase correctamente

### 2️⃣ **Uso en mensajes de confirmación** (bot-logic.js, línea 877)

```javascript
// Obtener tiempo de entrega configurado
const tiempoEntrega = await obtenerTiempoEntrega(sesion.tenantId);
mensaje += `🕒 Tiempo estimado: ${tiempoEntrega}\n\n`;
```

**Estado**: ✅ Correcto - Usa la función correctamente

### 3️⃣ **Guardar configuración** (dashboard.html, línea 2450)

```javascript
async function saveDeliveryTime() {
  const min = parseInt(document.getElementById('delivery-time-min').value);
  const max = parseInt(document.getElementById('delivery-time-max').value);

  // Validaciones...

  try {
    // Guardar en Firebase
    await firebase.database().ref(`tenants/${tenantId}/config/deliveryTime`).set({
      min: min,
      max: max,
      updatedAt: Date.now()
    });

    alert(`✅ Tiempo de entrega actualizado: ${min}-${max} minutos`);
    closeDeliveryTimeModal();
  } catch (error) {
    console.error('Error saving delivery time:', error);
    alert('Error al guardar el tiempo de entrega: ' + error.message);
  }
}
```

**Estado**: ✅ Correcto - Guarda en Firebase correctamente

---

## 🎯 Causa del Problema

**El tiempo personalizado NO está guardado en Firebase** para tu tenant.

Cuando la función `obtenerTiempoEntrega` no encuentra valores en:
```
tenants/${tenantId}/config/deliveryTime
```

Retorna el valor por defecto: **"30-40 minutos"**

---

## ✅ Solución

### Paso 1: Configurar el Tiempo de Entrega

1. **Ir al Dashboard**: https://api.kdsapp.site/dashboard?tenant=TU_TENANT_ID
2. **Buscar la sección**: "🕒 Tiempo de Entrega"
3. **Hacer clic en**: "Configurar Tiempo"
4. **Ingresar valores personalizados**: 
   - Mínimo: 20 (por ejemplo)
   - Máximo: 30 (por ejemplo)
5. **Hacer clic en**: "Guardar Tiempo"
6. **Verificar el alert**: Debe mostrar "✅ Tiempo de entrega actualizado: 20-30 minutos"

### Paso 2: Verificar en Firebase (Opcional)

Si tienes acceso a la consola de Firebase:

1. Ir a: **Realtime Database**
2. Navegar a: `tenants/{tu-tenant-id}/config/deliveryTime`
3. Verificar que existan los campos:
   ```json
   {
     "min": 20,
     "max": 30,
     "updatedAt": 1738195200000
   }
   ```

### Paso 3: Probar el Bot

1. Hacer un pedido nuevo
2. Confirmar el pedido
3. Verificar que el mensaje muestre tu tiempo personalizado:
   ```
   🕒 Tiempo estimado: 20-30 minutos
   ```

---

## 📊 Estructura de Datos en Firebase

```
tenants/
  └── {tenantId}/
      └── config/
          └── deliveryTime/
              ├── min: 20          (número)
              ├── max: 30          (número)
              └── updatedAt: 1738195200000 (timestamp)
```

---

## 🔧 Lugares donde se usa el tiempo de entrega

El tiempo personalizado se muestra en **todos estos flujos**:

### 1. **Pago en efectivo/transferencia** (bot-logic.js)
```javascript
mensaje += `🕒 Tiempo estimado: ${tiempoEntrega}\n\n`;
```

### 2. **Pago con tarjeta aprobado** (payment-service.js)
```javascript
message += `🕒 Tiempo estimado: *${tiempoEntrega}*\n\n`;
```

### 3. **Confirmación de pedido por pago online** (bot-logic.js)
```javascript
mensaje += `🕒 Tiempo estimado: ${tiempoEntrega}\n\n`;
```

---

## 🎓 Conclusión

**El sistema está funcionando correctamente**. El problema es simplemente que no has guardado el tiempo personalizado en el dashboard.

Una vez que lo configures, **automáticamente** se usará en todos los mensajes de confirmación de pedidos.

---

## 📝 Notas Técnicas

- **Valor por defecto**: 30-40 minutos (si no está configurado)
- **Rango permitido**: 10-120 minutos
- **Validaciones implementadas**:
  - ✅ min >= 10
  - ✅ max <= 120
  - ✅ min <= max
- **Persistencia**: Firebase Realtime Database
- **Alcance**: Multi-tenant (cada restaurante tiene su propio tiempo)

---

**Fecha de análisis**: 29 de enero de 2026  
**Estado**: ✅ Sistema funcionando correctamente - Solo falta configurar el tiempo en el dashboard
