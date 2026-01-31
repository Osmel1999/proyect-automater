# Sistema de Membresías - KDS App

**Fecha de implementación**: 31 de Enero 2026  
**Última actualización**: 31 de Enero 2026

---

## 1. Resumen del Sistema

El sistema de membresías de KDS App controla el acceso a la plataforma basado en:

- **Trial gratuito** de 30 días para nuevos usuarios
- **3 planes de suscripción** para usuarios que pagan
- **Verificación en tiempo real** tanto en el bot como en el frontend

---

## 2. Estructura de Datos

### En Firebase (por tenant)

```javascript
tenants/{tenantId}/membership: {
  plan: "trial" | "basic" | "professional" | "premium",
  status: "active" | "inactive" | "suspended" | "cancelled",
  trialStartDate: 1738368000000, // timestamp
  trialEndDate: 1740960000000,   // timestamp (30 días después)
  createdAt: 1738368000000
}
```

### Planes disponibles

| Plan | Precio/mes | Pedidos/día | Soporte |
|------|------------|-------------|---------|
| **Trial** | Gratis (30 días) | Ilimitado | Email |
| **Emprendedor** | $90.000 COP | 25 | Email |
| **Profesional** | $120.000 COP | 50 | Email + WhatsApp |
| **Empresarial** | $150.000 COP | 100 | Prioritario |

---

## 3. Flujo de Registro

1. Usuario se registra en `/auth.html`
2. Se crea el tenant con membresía `trial` activa
3. Se calculan fechas de inicio y fin del trial (30 días)
4. Se guarda en localStorage los datos de membresía

```javascript
// Al registrar nuevo tenant
const membership = {
  plan: 'trial',
  status: 'active',
  trialStartDate: Date.now(),
  trialEndDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
  createdAt: Date.now()
};
```

---

## 4. Verificación en el Bot (Backend)

Archivo: `server/bot-logic.js`

El bot verifica la membresía **una vez al día** usando un caché en memoria:

```javascript
// Caché de membresías (24 horas TTL)
const membershipCache = new Map();
const MEMBERSHIP_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// En processMessage()
let membershipResult;
const cached = membershipCache.get(tenantId);
const now = Date.now();

if (cached && (now - cached.checkedAt) < MEMBERSHIP_CACHE_TTL) {
  // Usar caché (no consulta Firebase)
  membershipResult = cached.result;
} else {
  // Verificar y guardar en caché por 24 horas
  membershipResult = await membershipService.verifyMembership(tenantId);
  membershipCache.set(tenantId, { result: membershipResult, checkedAt: now });
}
```

### Invalidar caché manualmente

Cuando se activa un plan desde el dashboard, se puede invalidar el caché:

```javascript
const botLogic = require('./bot-logic');
botLogic.invalidarCacheMembership(tenantId); // Invalida un tenant
botLogic.invalidarCacheMembership(); // Invalida todo el caché
```

**Mensaje cuando el trial expira:**

El bot **no responde nada** al cliente final. Simplemente ignora el mensaje.

- ✅ No se envía mensaje de expiración
- ✅ No se notifica al cliente del restaurante  
- ✅ Solo se registra en logs del servidor
- ✅ El dueño del restaurante ve el aviso en su dashboard

---

## 5. Verificación en el Frontend

Archivo: `js/membership-check.js`

Se incluye en todas las páginas protegidas:

- `/select.html` - Página principal después del login
- `/kds.html` - Vista de cocina
- `/dashboard.html` - Panel de configuración

### Uso:

```html
<!-- Después de config.js -->
<script src="js/membership-check.js"></script>
<script>
  MembershipCheck.init({ blockOnExpired: true });
</script>
```

### Opciones de configuración:

```javascript
MembershipCheck.init({
  blockOnExpired: true,     // Muestra modal bloqueante
  redirectOnExpired: false, // Redirige a otra página
  redirectUrl: '/select.html',
  showBadge: false          // Muestra badge de estado
});
```

---

## 6. Componentes UI

### Badge de Estado (en select.html)

Muestra el estado actual de la membresía:

- 🔵 **Trial: X días** - Durante el período de prueba
- 🟡 **Trial: X días** - Cuando quedan 5 días o menos (warning)
- 🔴 **Trial Expirado** - Cuando el trial ha terminado
- 🟢 **Plan [Nombre]** - Para suscriptores activos

### Modal de Trial Expirado

Aparece cuando el trial ha expirado:

- Icono animado de reloj
- Mensaje explicativo
- Lista de planes disponibles con precios
- Botón "Ver Planes y Precios" → `/index.html#pricing`
- Botón "Contactar Soporte" → WhatsApp

---

## 7. Archivos del Sistema

```
kds-webapp/
├── js/
│   ├── auth.js              # Registro con membresía
│   └── membership-check.js  # Verificación en frontend
├── css/
│   └── select-modern.css    # Estilos del modal y badge
├── server/
│   ├── membership-service.js # Servicio de membresía (backend)
│   └── bot-logic.js          # Integración con el bot
└── docs/
    └── SISTEMA-MEMBRESIAS.md # Esta documentación
```

---

## 8. Próximos Pasos

### Pendientes de implementar:

1. **Límites por plan** - Controlar la cantidad de pedidos/día según el plan
2. **Pasarela de pago** - Integrar Wompi para cobros automáticos
3. **Cambio de plan** - UI para upgrade/downgrade
4. **Notificaciones por email** - Avisos antes de que expire el trial
5. **Panel de administración** - Ver todos los tenants y sus membresías
6. **Webhooks de pago** - Actualizar membresía automáticamente al pagar

### Mejoras de UX:

1. Mostrar contador de días restantes en el dashboard
2. Banner de advertencia cuando quedan pocos días
3. Email recordatorio 7 días antes del fin del trial
4. Página dedicada de "Activar Plan"

---

## 9. Testing

### Simular trial expirado (para pruebas):

```javascript
// En la consola del navegador o en Firebase
firebase.database().ref('tenants/TU_TENANT_ID/membership').update({
  trialEndDate: Date.now() - (1000 * 60 * 60) // Hace 1 hora
});
```

### Restaurar trial:

```javascript
firebase.database().ref('tenants/TU_TENANT_ID/membership').update({
  trialEndDate: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 días
});
```

---

## 10. Seguridad

⚠️ **Importante**: La verificación en el frontend es solo para UX. La **verificación real** debe hacerse siempre en el backend (bot-logic.js y membership-service.js) para evitar que usuarios malintencionados bypaseen el control.

Las reglas de Firebase también deberían validar el estado de la membresía para operaciones críticas.
