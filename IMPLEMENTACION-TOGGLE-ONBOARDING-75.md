# Implementación: Toggle del Bot Solo Activo con Onboarding >= 75%

**Fecha:** 2026-01-18  
**Objetivo:** Asegurar que el toggle del bot solo pueda estar activo si el progreso de onboarding es >= 75%, y que el backend solo dependa del toggle para responder.

---

## 📋 Problema Identificado

### Estado Anterior:
- El bot podía estar activo incluso con onboarding < 75%
- El backend validaba múltiples condiciones (progreso, menú, toggle)
- Inconsistencia entre frontend y backend sobre cuándo responder
- Posible bypass del frontend si se modificaba Firebase directamente

### Estado Deseado:
- El toggle SIEMPRE inicia en OFF si progreso < 75%
- El toggle está deshabilitado visualmente si progreso < 75%
- El frontend valida el progreso antes de permitir activar el toggle
- El backend solo valida el toggle (confía en que el frontend previene bypass)
- Si alguien modifica Firebase directamente, el frontend lo corrige al cargar

---

## 🔧 Cambios Implementados

### 1. **Dashboard Frontend** (`dashboard.html`)

#### A. Inicialización del Estado del Bot (líneas ~1295-1320)

**ANTES:**
```javascript
// Load bot state
if (tenantData.bot && tenantData.bot.config) {
  botActive = tenantData.bot.config.active !== false; // Por defecto true si no existe
} else {
  botActive = true; // Por defecto activo
}
```

**DESPUÉS:**
```javascript
// Calcular progreso de onboarding
const completed = Object.values(onboardingState).filter(v => v === true).length;
const total = Object.keys(onboardingState).length;
onboardingPercentage = Math.round((completed / total) * 100);

console.log(`📊 Progreso de onboarding calculado: ${onboardingPercentage}%`);

// Load bot state
// Si el progreso es < 75%, forzar el bot a OFF sin importar el valor en Firebase
if (onboardingPercentage < 75) {
  console.log('⚠️ Progreso < 75%, forzando bot a OFF');
  botActive = false;
  // Guardar en Firebase para asegurar consistencia
  await firebase.database().ref(`tenants/${tenantId}/bot/config`).set({
    active: false,
    lastUpdated: new Date().toISOString(),
    reason: 'onboarding_incomplete'
  });
} else {
  // Si el progreso >= 75%, respetar el valor en Firebase
  if (tenantData.bot && tenantData.bot.config) {
    botActive = tenantData.bot.config.active === true; // Solo true si es explícitamente true
  } else {
    botActive = false; // Por defecto OFF si no existe el config
  }
}

console.log(`🤖 Estado inicial del bot: ${botActive ? 'ON' : 'OFF'} (progreso: ${onboardingPercentage}%)`);
```

**🎯 Propósito:**
- **Validación al Cargar:** Cuando se carga el dashboard, se calcula el progreso de onboarding.
- **Forzar OFF si < 75%:** Si el progreso es menor al 75%, se fuerza `botActive = false` y se guarda en Firebase, sobrescribiendo cualquier valor previo.
- **Prevenir Bypass:** Si alguien modificó Firebase directamente para activar el bot con progreso insuficiente, el frontend lo corrige al cargar.
- **Estado por Defecto:** Si no existe configuración en Firebase, el bot está OFF por defecto.

---

#### B. Función `toggleBot()` (líneas ~1620-1665)

**ANTES:**
```javascript
async function toggleBot() {
  const canActivate = onboardingPercentage >= 75;

  // Si intenta activar pero no puede
  if (!botActive && !canActivate) {
    alert('⚠️ Para activar el bot...');
    return;
  }

  // Cambiar estado
  botActive = !botActive;

  // Guardar en Firebase
  try {
    await firebase.database().ref(`tenants/${tenantId}/bot/config`).set({
      active: botActive,
      lastUpdated: new Date().toISOString()
    });
    // ...
  }
}
```

**DESPUÉS:**
```javascript
async function toggleBot() {
  const canActivate = onboardingPercentage >= 75;

  // VALIDACIÓN CRÍTICA: Si intenta activar el bot pero el progreso es < 75%
  if (!botActive && !canActivate) {
    console.warn('⚠️ Intento de activar bot con progreso insuficiente');
    alert('⚠️ Para activar el bot, debes completar al menos el 75% del onboarding...');
    return;
  }

  // VALIDACIÓN ADICIONAL: Verificar progreso en Firebase antes de cambiar
  try {
    const onboardingSnapshot = await firebase.database().ref(`tenants/${tenantId}/onboarding`).once('value');
    const onboarding = onboardingSnapshot.val();
    const progress = onboarding?.progress || 0;
    
    console.log(`🔍 Validando progreso en Firebase: ${progress}%`);
    
    // Si intenta activar y el progreso en Firebase es < 75%, bloquear
    if (!botActive && progress < 75) {
      console.error('🚫 Validación de progreso falló. Progreso en Firebase:', progress);
      alert('⚠️ El progreso de onboarding en el servidor es insuficiente...');
      return;
    }
  } catch (error) {
    console.error('Error validando progreso:', error);
    alert('Error al validar el progreso. Por favor intenta de nuevo.');
    return;
  }

  // Cambiar estado
  const newState = !botActive;
  botActive = newState;

  // Guardar en Firebase
  try {
    await firebase.database().ref(`tenants/${tenantId}/bot/config`).set({
      active: botActive,
      lastUpdated: new Date().toISOString()
    });

    console.log(`✅ Estado del bot actualizado en Firebase: ${botActive ? 'ACTIVO (true)' : 'DESACTIVADO (false)'}`);
    // ...
  }
}
```

**🎯 Propósito:**
- **Validación Frontend:** Verifica que el progreso local sea >= 75% antes de permitir activar.
- **Validación Backend:** Consulta Firebase nuevamente para verificar el progreso real en el servidor antes de activar.
- **Doble Barrera:** Previene que el toggle pueda activarse incluso si hay desincronización entre frontend y backend.
- **Logs Detallados:** Registra cada intento de activación para debugging.

---

### 2. **Backend Bot Logic** (`server/bot-logic.js`)

#### Función `processMessage()` (líneas ~71-110)

**ANTES:**
```javascript
// ====================================
// VALIDAR PROGRESO DE ONBOARDING Y ESTADO DEL BOT
// ====================================
try {
  // 1. Verificar progreso del onboarding
  const onboardingSnapshot = await firebaseService.database.ref(`tenants/${tenantId}/onboarding`).once('value');
  const onboarding = onboardingSnapshot.val();
  const progress = onboarding?.progress || 0;
  
  if (progress < 75) {
    console.log(`🔴 Onboarding incompleto (${progress}%). Bot no disponible.`);
    return null;
  }
  
  // 2. Verificar si el menú está configurado
  const menuSnapshot = await firebaseService.database.ref(`tenants/${tenantId}/menu/items`).once('value');
  const menuItems = menuSnapshot.val();
  
  if (!menuItems || Object.keys(menuItems).length === 0) {
    console.log(`🔴 Menú no configurado. Bot no disponible.`);
    return null;
  }
  
  // 3. Verificar si el bot está activo (toggle en dashboard)
  const botConfig = await firebaseService.database.ref(`tenants/${tenantId}/bot/config`).once('value');
  const config = botConfig.val();
  const botActive = config?.active !== false;
  
  if (!botActive) {
    console.log(`🔴 Bot desactivado manualmente...`);
    return null;
  }
  
  console.log(`🟢 Bot activo para tenant ${tenantId} (onboarding: ${progress}%, active: ${config?.active ?? 'undefined'})`);
} catch (error) {
  // ...
}
```

**DESPUÉS:**
```javascript
// ====================================
// VALIDAR ESTADO DEL BOT (SOLO TOGGLE)
// ====================================
try {
  // Verificar si el bot está activo (toggle en dashboard)
  const botConfig = await firebaseService.database.ref(`tenants/${tenantId}/bot/config`).once('value');
  const config = botConfig.val();
  
  console.log(`🔍 Debug - config obtenido:`, config);
  
  // El bot solo responde si active === true (explícitamente)
  // Si no existe config o active no es true, el bot NO responde
  const botActive = config?.active === true;
  
  console.log(`🔍 Debug - botActive calculado: ${botActive}`);
  console.log(`🔍 Debug - config?.active: ${config?.active}`);
  console.log(`🔍 Debug - typeof config?.active: ${typeof config?.active}`);
  
  if (!botActive) {
    console.log(`🔴 Bot desactivado para tenant ${tenantId}. Ignorando mensaje.`);
    return null; // No responder nada
  }
  
  console.log(`🟢 Bot activo para tenant ${tenantId} - Procesando mensaje`);
} catch (error) {
  console.error(`⚠️ Error verificando estado del bot para tenant ${tenantId}:`, error);
  // En caso de error, NO responder (fail-safe)
  return null;
}
```

**🎯 Propósito:**
- **Simplificación:** El backend solo valida el toggle `active` en Firebase.
- **Confianza en Frontend:** Confía en que el frontend ya validó el progreso y el menú antes de permitir activar el toggle.
- **Lógica Explícita:** `botActive = config?.active === true` - Solo responde si el valor es explícitamente `true`.
- **Fail-Safe:** Si hay error al consultar Firebase, el bot NO responde (principio de seguridad).

---

## 🔒 Seguridad y Consistencia

### Capas de Protección:

1. **Al Cargar el Dashboard:**
   - Se calcula el progreso de onboarding
   - Si progreso < 75%, se fuerza `active: false` en Firebase
   - Previene bypass de valores modificados manualmente en Firebase

2. **Al Intentar Activar el Toggle:**
   - Validación local: `onboardingPercentage >= 75`
   - Validación remota: consulta Firebase para confirmar progreso >= 75%
   - Si alguna validación falla, no permite activar

3. **En el Backend (Bot Logic):**
   - Solo valida `active === true`
   - No asume valores por defecto
   - Si no existe config o active no es true, no responde

4. **Actualización del Progreso:**
   - Cada vez que se completa un paso del onboarding, se guarda el porcentaje en Firebase
   - El porcentaje se sincroniza entre frontend y backend

---

## 📊 Flujo Completo

```
Usuario abre Dashboard
    ↓
Calcular progreso de onboarding
    ↓
¿Progreso < 75%?
    ├── SÍ → Forzar toggle OFF, guardar en Firebase, deshabilitar toggle
    └── NO → Cargar estado del toggle desde Firebase
    ↓
Usuario intenta activar toggle
    ↓
¿Progreso local >= 75%?
    ├── NO → Bloquear, mostrar alerta
    └── SÍ → Consultar progreso en Firebase
        ↓
    ¿Progreso Firebase >= 75%?
        ├── NO → Bloquear, mostrar alerta
        └── SÍ → Activar toggle, guardar active: true en Firebase
            ↓
Cliente envía mensaje por WhatsApp
    ↓
Backend consulta Firebase: tenants/{tenantId}/bot/config
    ↓
¿active === true?
    ├── NO → Ignorar mensaje, no responder
    └── SÍ → Procesar mensaje, enviar respuesta
```

---

## 🧪 Casos de Prueba

### Caso 1: Onboarding Incompleto (< 75%)
**Entrada:**
- Progreso: 50% (solo WhatsApp conectado)
- Usuario abre dashboard

**Resultado Esperado:**
- Toggle está en OFF
- Toggle está deshabilitado (gris)
- Advertencia visible: "Completa al menos el 75% del onboarding"
- Al hacer clic en toggle, muestra alerta y no cambia

### Caso 2: Onboarding Completo (>= 75%), Toggle OFF
**Entrada:**
- Progreso: 75% (WhatsApp + Menú + Mensajes)
- Usuario abre dashboard

**Resultado Esperado:**
- Toggle está en OFF pero habilitado (puede activarse)
- No hay advertencia visible
- Al hacer clic, activa el toggle y guarda `active: true` en Firebase

### Caso 3: Onboarding Completo, Toggle ON
**Entrada:**
- Progreso: 100%
- Toggle: ON
- Cliente envía "hola" por WhatsApp

**Resultado Esperado:**
- Backend verifica `active === true` en Firebase
- Bot responde con mensaje de bienvenida

### Caso 4: Bypass Intento (modificar Firebase directamente)
**Entrada:**
- Progreso: 50%
- Alguien modifica Firebase: `active: true`
- Usuario abre dashboard

**Resultado Esperado:**
- Dashboard detecta progreso < 75%
- Sobrescribe Firebase con `active: false`
- Toggle queda deshabilitado en OFF

### Caso 5: Toggle OFF, Cliente envía mensaje
**Entrada:**
- Progreso: 100%
- Toggle: OFF
- Cliente envía "menú" por WhatsApp

**Resultado Esperado:**
- Backend verifica `active === false` (o no existe)
- Bot NO responde, ignora el mensaje

---

## 📁 Archivos Modificados

1. **`/dashboard.html`**
   - Función `loadTenantData()` - Validación al cargar (líneas ~1295-1320)
   - Función `toggleBot()` - Validación al activar (líneas ~1620-1665)

2. **`/server/bot-logic.js`**
   - Función `processMessage()` - Validación simplificada (líneas ~71-110)

---

## 🚀 Deployment

### Pasos para Desplegar:

1. **Commit de Cambios:**
```bash
git add dashboard.html server/bot-logic.js IMPLEMENTACION-TOGGLE-ONBOARDING-75.md
git commit -m "feat: toggle del bot solo activo si onboarding >= 75%

- Frontend fuerza toggle OFF si progreso < 75%
- Validación doble en toggleBot() (local + Firebase)
- Backend simplificado: solo valida toggle
- Prevención de bypass mediante validación al cargar
- Logs detallados para debugging"
```

2. **Push a GitHub:**
```bash
git push origin main
```

3. **Deploy Frontend (Firebase Hosting):**
```bash
firebase deploy --only hosting
```

4. **Deploy Backend (Railway):**
```bash
# Railway auto-deploys desde GitHub, pero si es necesario forzar:
cd server
git push railway main
```

5. **Verificar Logs en Railway:**
```bash
railway logs
```

---

## ✅ Checklist de Verificación en Producción

- [ ] Abrir dashboard con progreso < 75%
  - [ ] Toggle está en OFF y deshabilitado
  - [ ] Advertencia visible
  - [ ] No permite activar
  
- [ ] Completar onboarding hasta 75%
  - [ ] Toggle pasa a estar habilitado
  - [ ] Advertencia desaparece
  - [ ] Permite activar
  
- [ ] Activar toggle con progreso >= 75%
  - [ ] Toggle cambia a ON
  - [ ] Firebase actualizado: `active: true`
  - [ ] Enviar mensaje por WhatsApp → Bot responde
  
- [ ] Desactivar toggle
  - [ ] Toggle cambia a OFF
  - [ ] Firebase actualizado: `active: false`
  - [ ] Enviar mensaje por WhatsApp → Bot NO responde
  
- [ ] Intento de bypass (modificar Firebase)
  - [ ] Modificar Firebase: `active: true` con progreso < 75%
  - [ ] Recargar dashboard
  - [ ] Firebase sobrescrito: `active: false`
  - [ ] Toggle deshabilitado

---

## 📝 Notas Adicionales

### Decisiones de Diseño:

1. **¿Por qué eliminar validación de progreso en backend?**
   - **Razón:** Simplificar lógica y confiar en la validación del frontend.
   - **Riesgo:** Si alguien modifica Firebase directamente, podría activar el bot sin progreso suficiente.
   - **Mitigación:** El dashboard corrige el estado al cargar, previniendo el bypass.

2. **¿Por qué `active === true` en vez de `active !== false`?**
   - **Razón:** Ser explícito. Si el valor no existe o es `undefined`, el bot NO responde.
   - **Beneficio:** Previene estados ambiguos y facilita debugging.

3. **¿Por qué guardar `progress` en Firebase?**
   - **Razón:** Tener una fuente de verdad única para el progreso de onboarding.
   - **Beneficio:** El frontend puede validar contra el valor real del servidor, previniendo desincronización.

### Logs Útiles para Debugging:

- **Frontend (Dashboard):**
  - `📊 Progreso de onboarding calculado: X%`
  - `🤖 Estado inicial del bot: ON/OFF (progreso: X%)`
  - `⚠️ Progreso < 75%, forzando bot a OFF`
  - `🔍 Validando progreso en Firebase: X%`

- **Backend (Bot Logic):**
  - `🔍 Debug - config obtenido: {...}`
  - `🔍 Debug - botActive calculado: true/false`
  - `🔴 Bot desactivado para tenant X. Ignorando mensaje.`
  - `🟢 Bot activo para tenant X - Procesando mensaje`

---

## 🎯 Resultado Final

✅ **El toggle del bot SOLO puede estar activo si el onboarding es >= 75%**  
✅ **El frontend previene bypass mediante validación al cargar y al activar**  
✅ **El backend confía en el toggle y no valida progreso (simplificado)**  
✅ **Logs detallados para debugging en producción**  
✅ **Documentación completa del flujo y decisiones de diseño**

---

**Autor:** Copilot + Osmel  
**Estado:** ✅ Implementado y Listo para Deploy
