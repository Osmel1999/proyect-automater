# Modal "Mi Plan" - Dashboard

**Fecha:** 6 de febrero de 2026  
**Propósito:** Mostrar información del plan actual del usuario sin redirigir a la página de selección de planes

---

## 🎯 Problema Resuelto

El botón "Mi Plan" en las acciones rápidas del dashboard estaba redirigiendo a `/plans.html` (página de selección de planes) en lugar de mostrar la información del plan actual del usuario.

### Comportamiento Anterior
```javascript
// ❌ Redirigía a la página de planes
<div class="action-card" onclick="window.location.href='plans.html'">
```

### Comportamiento Nuevo
```javascript
// ✅ Abre modal con información del plan actual
<div class="action-card" onclick="openMyPlanModal()">
```

---

## 📋 Cambios Implementados

### 1. HTML - dashboard.html

#### a) Cambio en el botón "Mi Plan"
```html
<!-- Línea 353 -->
<div class="action-card" onclick="openMyPlanModal()">
  <div class="action-icon">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
    </svg>
  </div>
  <h3>Mi Plan</h3>
  <p>Ver y actualizar tu membresía</p>
</div>
```

#### b) Nuevo Modal "My Plan"
```html
<!-- Agregado antes del cierre del body -->
<div class="modal-overlay" id="my-plan-modal">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">
        <svg class="icon-lg">...</svg>
        Mi Plan
      </h2>
      <button class="modal-close" onclick="closeMyPlanModal()">×</button>
    </div>
    
    <div class="modal-body">
      <!-- Loading State -->
      <div id="plan-loading">
        <div class="spinner"></div>
        <p>Cargando información de tu plan...</p>
      </div>
      
      <!-- Content -->
      <div id="plan-content" style="display: none;">
        <!-- Plan Badge -->
        <div id="plan-badge">Plan Básico</div>
        
        <!-- Plan Details -->
        <div>
          <div id="plan-status">Estado</div>
          <div id="plan-start-date">Inicio del plan</div>
          <div id="plan-expiry-date">Vence el</div>
          <div id="plan-days-remaining">Días restantes</div>
        </div>
        
        <!-- Features -->
        <div id="plan-features">
          <!-- Features dynamically loaded -->
        </div>
        
        <!-- Upgrade Suggestion -->
        <div id="upgrade-suggestion" style="display: none;">
          <h3>🚀 Mejora tu plan</h3>
          <button onclick="window.location.href='plans.html'">
            Ver planes disponibles
          </button>
        </div>
      </div>
      
      <!-- Error State -->
      <div id="plan-error" style="display: none;">
        <p>Error al cargar la información</p>
      </div>
    </div>
    
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeMyPlanModal()">Cerrar</button>
      <button class="btn-primary" onclick="window.location.href='plans.html'">
        Cambiar Plan
      </button>
    </div>
  </div>
</div>
```

### 2. JavaScript - dashboard.js

#### a) Función `openMyPlanModal()`
```javascript
/**
 * Abre el modal de Mi Plan y carga la información
 */
async function openMyPlanModal() {
  const modal = document.getElementById('my-plan-modal');
  const loading = document.getElementById('plan-loading');
  const content = document.getElementById('plan-content');
  const error = document.getElementById('plan-error');
  
  // Mostrar modal y loading
  modal.style.display = 'flex';
  loading.style.display = 'block';
  content.style.display = 'none';
  error.style.display = 'none';
  
  try {
    // Obtener información del plan desde Firebase
    const snapshot = await firebase.database()
      .ref(`tenants/${tenantId}/membership`)
      .once('value');
    const membership = snapshot.val();
    
    if (!membership) {
      throw new Error('No se encontró información de membresía');
    }
    
    // Procesar información del plan
    const plan = membership.plan || 'trial';
    const status = membership.status || 'active';
    const startDate = membership.paidPlanStartDate || membership.createdAt;
    const expiryDate = membership.paidPlanEndDate || membership.trialEndDate;
    
    // Calcular días restantes
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    // Actualizar UI del plan
    updatePlanUI(plan, status, startDate, expiryDate, daysRemaining);
    
    // Mostrar contenido
    loading.style.display = 'none';
    content.style.display = 'block';
    
  } catch (err) {
    console.error('Error cargando información del plan:', err);
    loading.style.display = 'none';
    error.style.display = 'block';
  }
}
```

#### b) Función `updatePlanUI()`
```javascript
/**
 * Actualiza la UI del modal con la información del plan
 */
function updatePlanUI(plan, status, startDate, expiryDate, daysRemaining) {
  // Plan Badge
  const planNames = {
    'trial': 'Plan Prueba',
    'basico': 'Plan Básico',
    'profesional': 'Plan Profesional',
    'premium': 'Plan Premium'
  };
  
  const planColors = {
    'trial': 'linear-gradient(135deg, #718096 0%, #4a5568 100%)',
    'basico': 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
    'profesional': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'premium': 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)'
  };
  
  // Actualizar badge, estado, fechas, días restantes, características
  // ...
  
  // Características del plan
  const features = {
    'trial': [
      '✅ Bot de WhatsApp básico',
      '✅ Menú digital',
      '✅ Gestión de pedidos',
      '⏰ 7 días de prueba'
    ],
    'basico': [
      '✅ Bot de WhatsApp completo',
      '✅ Menú digital ilimitado',
      '✅ Gestión de pedidos',
      '✅ KDS (Kitchen Display System)',
      '✅ Reportes básicos',
      '✅ Soporte por correo'
    ],
    'profesional': [
      '✅ Todo lo del plan Básico',
      '✅ Pagos en línea (Wompi)',
      '✅ Múltiples sucursales',
      '✅ Reportes avanzados',
      '✅ Personalización avanzada',
      '✅ Soporte prioritario'
    ],
    'premium': [
      '✅ Todo lo del plan Profesional',
      '✅ Integración con delivery apps',
      '✅ API personalizada',
      '✅ Análisis predictivo',
      '✅ Consultoría mensual',
      '✅ Soporte 24/7'
    ]
  };
  
  // Sugerencia de upgrade (solo para trial y básico)
  if (plan === 'trial' || plan === 'basico') {
    upgradeSuggestion.style.display = 'block';
  }
}
```

#### c) Función `closeMyPlanModal()`
```javascript
/**
 * Cierra el modal de Mi Plan
 */
function closeMyPlanModal() {
  const modal = document.getElementById('my-plan-modal');
  modal.style.display = 'none';
}
```

#### d) Exposición al scope global
```javascript
// Al final del archivo, antes del cierre de DOMContentLoaded
window.openMyPlanModal = openMyPlanModal;
window.closeMyPlanModal = closeMyPlanModal;
```

---

## 🎨 Diseño del Modal

### Estados del Plan
- **Trial**: Badge gris, muestra días de prueba restantes
- **Básico**: Badge verde, características básicas
- **Profesional**: Badge morado/azul, características avanzadas
- **Premium**: Badge naranja/dorado, todas las características

### Información Mostrada
1. **Badge del Plan**: Nombre del plan con colores distintivos
2. **Estado**: Activo (🟢), Expirado (🔴), Cancelado (⚪)
3. **Fecha de Inicio**: Cuándo comenzó el plan actual
4. **Fecha de Vencimiento**: Cuándo expira el plan
5. **Días Restantes**: 
   - Verde: >7 días
   - Naranja: ≤7 días
   - Rojo: Expirado
6. **Características Incluidas**: Lista de beneficios del plan
7. **Sugerencia de Upgrade**: Solo para planes Trial y Básico

### Botones de Acción
- **Cerrar**: Cierra el modal
- **Cambiar Plan**: Redirige a `/plans.html` para seleccionar otro plan

---

## 📊 Fuente de Datos

Los datos del plan se obtienen de Firebase:
```javascript
firebase.database().ref(`tenants/${tenantId}/membership`).once('value')
```

### Estructura de Datos Esperada
```json
{
  "plan": "basico",
  "status": "active",
  "paidPlanStartDate": "2026-01-15T00:00:00.000Z",
  "paidPlanEndDate": "2026-02-15T00:00:00.000Z",
  "trialEndDate": "2026-01-22T00:00:00.000Z",
  "createdAt": "2026-01-15T00:00:00.000Z"
}
```

---

## ✅ Beneficios

1. **UX Mejorada**: El usuario ve su plan actual sin salir del dashboard
2. **Información Inmediata**: No hay navegación innecesaria
3. **Call-to-Action Claro**: Botón "Cambiar Plan" para upgrades
4. **Estados Visuales**: Colores y badges distintivos por tipo de plan
5. **Alertas Tempranas**: Advertencia visual cuando quedan pocos días

---

## 🧪 Pruebas Recomendadas

1. **Plan Trial**: Verificar que muestre correctamente los días de prueba
2. **Plan Básico**: Verificar características y sugerencia de upgrade
3. **Plan Profesional**: Verificar características avanzadas
4. **Plan Premium**: Verificar todas las características
5. **Plan Expirado**: Verificar estado rojo y mensaje
6. **Días Restantes < 7**: Verificar advertencia en naranja
7. **Error de Carga**: Verificar mensaje de error amigable

---

## 🔄 Flujo de Usuario

```
Dashboard > Acciones Rápidas > "Mi Plan"
    ↓
Modal se abre con loading
    ↓
Consulta Firebase → tenants/{tenantId}/membership
    ↓
¿Datos encontrados?
    ↙ Sí               ↘ No
Mostrar información    Mostrar error
    ↓
Usuario puede:
- Ver detalles del plan
- Cerrar modal
- Ir a "Cambiar Plan" (plans.html)
```

---

## 📝 Notas Técnicas

1. **Spinner Reutilizado**: Se usa el spinner existente de `dashboard.css`
2. **Modal Overlay**: Usa la misma estructura que otros modales del dashboard
3. **Responsive**: El modal se adapta a dispositivos móviles
4. **Accesibilidad**: Botón de cierre con × y tecla ESC (opcional)
5. **Performance**: Solo se carga la información cuando se abre el modal
6. **Consistencia**: Usa los mismos estilos que otros modales del sistema

---

## 🚀 Próximos Pasos Opcionales

1. **Cache Local**: Guardar la info del plan en localStorage para mostrarlo más rápido
2. **Auto-refresh**: Actualizar automáticamente si el plan está próximo a vencer
3. **Notificaciones**: Alert cuando quedan pocos días del plan
4. **Historial**: Mostrar pagos y renovaciones anteriores
5. **Descarga de Factura**: Botón para descargar comprobante de pago

---

**Estado:** ✅ Completado  
**Archivos Modificados:**
- `/dashboard.html`
- `/js/dashboard.js`
