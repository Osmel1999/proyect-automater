# Fix Urgente para Dashboard

## Problema 1: Dashboard no carga (se queda en "Cargando...")

**Causa**: El menú no se está cargando desde Firebase antes de mostrar el dashboard, causando que `loadMenuPreview()` falle.

**Solución**: Agregar carga del menú en `loadTenantData()` ANTES de mostrar el dashboard.

### Ubicación: Línea ~1500 en dashboard.html

**ANTES** (línea 1500):
```javascript
        // Update UI
        document.getElementById('tenant-name').textContent = tenantData.restaurant?.name || 'Mi Restaurante';

        // Load onboarding state
        if (tenantData.onboarding && tenantData.onboarding.steps) {
```

**DESPUÉS**:
```javascript
        // Update UI
        document.getElementById('tenant-name').textContent = tenantData.restaurant?.name || 'Mi Restaurante';

        // 🔥 CARGAR EL MENÚ DESDE FIREBASE PRIMERO
        try {
          const menuSnapshot = await firebase.database().ref(`tenants/${tenantId}/menu/items`).once('value');
          const items = menuSnapshot.val() || {};
          menuItems = Object.values(items);
          console.log(`📋 Menú cargado: ${menuItems.length} items`);
        } catch (menuError) {
          console.warn('Error cargando menú:', menuError);
          menuItems = [];
        }

        // Load onboarding state
        if (tenantData.onboarding && tenantData.onboarding.steps) {
```

---

## Problema 2: Sigue mostrando "33% completado"

El mensaje ya está corregido en el código, pero puede que el navegador tenga la versión en caché.

**Solución**:
1. Limpiar caché del navegador (Cmd+Shift+R en Mac, Ctrl+Shift+R en Windows)
2. O agregar un timestamp al archivo para forzar recarga

### Verificar en línea ~1059 (progress-percentage):
```html
<span class="progress-percentage" id="progress-percentage">Completar configuración</span>
```

Y en línea ~1665 (updateProgress function):
```javascript
const progressText = allCriticalComplete ? '✅ Configuración completa' : 'Completar configuración';
document.getElementById('progress-percentage').textContent = progressText;
```

---

## Pasos para Aplicar el Fix:

### Opción 1: Edición Manual
1. Abrir `dashboard.html`
2. Ir a la línea ~1500
3. Agregar el código de carga del menú después de `textContent = tenantData.restaurant?.name || 'Mi Restaurante';`
4. Guardar
5. Desplegar: `firebase deploy --only hosting`

### Opción 2: Hard Refresh
1. Abrir el dashboard en el navegador
2. Presionar Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)
3. Esto forzará la recarga ignorando el caché

---

## Verificación:

Después del fix, deberías ver en la consola del navegador:
```
📋 Menú cargado: X items
📋 Estado de onboarding leído desde Firebase: {...}
📊 Progreso de onboarding calculado: 33% (1/3 pasos críticos)
```

Y el mensaje debe decir "Completar configuración" en lugar de "33% completado".
