# ✅ Flujo de Navegación Corregido

## Problema Identificado

**ANTES DEL FIX:**
- Usuario iniciaba sesión → auth.html
- Iba al selector → select.html
- Elegía Dashboard → verificaba PIN
- **❌ Si onboarding < 100%, mostraba confirm prompt y redirigía a onboarding.html**
- **❌ Esto sobrescribía datos del tenant en Firebase (aunque ya estaba parcialmente mitigado)**

**Comportamiento incorrecto:**
```javascript
// CÓDIGO INCORRECTO (YA ELIMINADO)
if (!onboarding || onboarding.progress < 100) {
    if (confirm('¿Ir al onboarding?')) {
        window.location.href = '/onboarding.html';  // ❌ NUNCA DEBE IR AQUÍ
    }
}
```

---

## Solución Implementada

**DESPUÉS DEL FIX:**
- Usuario iniciaba sesión → auth.html
- Va al selector → select.html
- Elige Dashboard → verifica PIN
- **✅ SIEMPRE va directo a dashboard.html**
- **✅ NUNCA se redirige a onboarding.html desde el selector**

**Código corregido en `select.html` (línea 512-516):**
```javascript
if (hashedPin === userData.pin) {
    // PIN correct, redirect to dashboard directly
    // NEVER redirect to onboarding from here - onboarding is only for initial setup
    closePinModal();
    window.location.href = `/dashboard.html?tenant=${currentTenantId}`;
}
```

---

## Flujo de Navegación Correcto

### 1️⃣ **Primer Login (Usuario Nuevo)**
```
auth.html
   ↓
select.html
   ↓
Dashboard (PIN) → dashboard.html
   ↓
Usuario hace click en "Completar Onboarding" (botón explícito)
   ↓
onboarding.html
```

### 2️⃣ **Logins Subsecuentes (Usuario Existente)**
```
auth.html
   ↓
select.html
   ↓ (elige KDS)
kds.html

   O

   ↓ (elige Dashboard + PIN)
dashboard.html
```

### 3️⃣ **Cuándo se debe mostrar onboarding.html**
- ✅ **Primera vez que el usuario configura su cuenta** (nuevo tenant)
- ✅ **Desde el dashboard**, si el usuario hace click en un botón explícito como "Completar configuración inicial"
- ✅ **Nunca automáticamente** desde el selector

---

## Cambios Realizados

### Archivo: `select.html`
**Líneas modificadas: 512-516**

**ANTES:**
```javascript
if (hashedPin === userData.pin) {
    closePinModal();
    
    // Check if we should go to onboarding first
    const snapshot = await firebase.database().ref(`tenants/${currentTenantId}/onboarding`).once('value');
    const onboarding = snapshot.val();
    
    if (!onboarding || onboarding.progress < 100) {
        if (confirm('¿Deseas ir al asistente de configuración?')) {
            window.location.href = '/onboarding.html';
        } else {
            window.location.href = `/dashboard.html?tenant=${currentTenantId}`;
        }
    } else {
        window.location.href = `/dashboard.html?tenant=${currentTenantId}`;
    }
}
```

**DESPUÉS:**
```javascript
if (hashedPin === userData.pin) {
    // PIN correct, redirect to dashboard directly
    // NEVER redirect to onboarding from here - onboarding is only for initial setup
    closePinModal();
    window.location.href = `/dashboard.html?tenant=${currentTenantId}`;
}
```

---

## Verificación

### ✅ Checklist de Pruebas

1. **Login y Navegación Básica**
   - [ ] Login en auth.html funciona
   - [ ] Redirige correctamente a select.html
   - [ ] Se muestra información del usuario (nombre, negocio)

2. **Selector de Opciones**
   - [ ] Botón KDS redirige a kds.html
   - [ ] Botón Dashboard muestra modal de PIN
   - [ ] Badge de onboarding muestra % correcto (si aplica)

3. **Flujo Dashboard**
   - [ ] Ingresar PIN correcto cierra el modal
   - [ ] **NUNCA muestra confirm prompt de onboarding**
   - [ ] **SIEMPRE redirige directo a dashboard.html**
   - [ ] Dashboard carga correctamente con tenant correcto

4. **Datos en Firebase**
   - [ ] Navegar desde select → dashboard NO sobrescribe datos
   - [ ] Progreso de onboarding se mantiene intacto
   - [ ] Configuración de menú/mensajes se preserva

---

## Deploy

### Para deployar estos cambios:

```bash
# Frontend (Firebase Hosting)
firebase deploy --only hosting

# No requiere cambios en backend (Railway)
```

### URLs de Verificación

- **Frontend:** https://kdsapp.site/select.html
- **Backend API:** https://api.kdsapp.site/api/health
- **Test Flow:** 
  1. https://kdsapp.site/auth.html
  2. Login → select.html
  3. Dashboard + PIN → dashboard.html ✅

---

## Notas Importantes

1. **onboarding.html ya tenía protección parcial** contra sobrescritura de datos (código de línea 836-868), pero la corrección en select.html elimina la raíz del problema.

2. **El badge de progreso** en select.html se mantiene (muestra "X% completado") pero es solo **informativo**, no fuerza redirección.

3. **Si en el futuro** se necesita que los usuarios completen el onboarding, debe hacerse:
   - Con un botón/link explícito en el dashboard
   - Con un banner informativo (no modal bloqueante)
   - Con navegación voluntaria del usuario

---

## Historial de Cambios

- **2025-01-XX**: Fix implementado - Eliminada redirección automática a onboarding.html desde select.html
- **2025-01-XX**: Verificado que onboarding.html no sobrescribe datos del tenant
- **2025-01-XX**: Documentado flujo de navegación correcto

---

## Contacto / Soporte

Si encuentras algún problema con el flujo de navegación:
1. Verificar que estés usando la última versión de select.html
2. Revisar console.log en DevTools para errores
3. Verificar que Firebase tenga los datos correctos del tenant
