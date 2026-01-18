# 🐛 BUG FIX #5: Validación de Onboarding y Mensajes Personalizados

**Fecha:** 2026-01-18 19:30 UTC  
**Severidad:** ALTA  
**Estado:** ✅ RESUELTO

## 📝 Descripción de los Bugs

### Bug 5a: Bot responde aunque onboarding <75%
El bot respondía a mensajes aunque el progreso del onboarding fuera menor al 75%, ignorando la regla de negocio que establece que el bot solo debe estar activo si se ha completado al menos el 75% del onboarding.

### Bug 5b: No usa mensajes personalizados
Cuando el usuario escribía "hola", el bot respondía solo con el menú, sin mostrar el mensaje de bienvenida personalizado configurado en el dashboard.

## 🔍 Diagnóstico

### Síntomas Bug 5a
- ✅ Dashboard muestra toggle deshabilitado si onboarding < 75%
- ❌ Backend permite que el bot responda aunque onboarding < 75%
- ❌ No se valida que el menú esté configurado

### Síntomas Bug 5b
- ❌ Usuario escribe "hola" → bot responde solo con menú
- ❌ No se usa el mensaje de bienvenida personalizado de Firebase
- ❌ Ignora otros mensajes configurados (despedida, confirmación, etc.)

### Causa Raíz

**Bug 5a:**
En `bot-logic.js`, la función `processMessage()` solo verificaba:
- ✅ Si el bot está activo (toggle)
- ❌ NO verificaba el progreso del onboarding
- ❌ NO verificaba si el menú está configurado

**Bug 5b:**
En `bot-logic.js`, línea 118:
```javascript
if (texto === 'hola' || texto === 'menu' || ...) {
  return await mostrarMenu(tenantId); // ❌ Solo retorna menú
}
```

No consultaba los mensajes personalizados de Firebase.

## 🔧 Solución Implementada

### Cambio 1: Validación completa de requisitos del bot

**Archivo:** `/server/bot-logic.js`  
**Función:** `processMessage()`  
**Líneas:** 84-124

```javascript
// ====================================
// VALIDAR PROGRESO DE ONBOARDING Y ESTADO DEL BOT
// ====================================
try {
  // 1. Verificar progreso del onboarding
  const onboardingSnapshot = await firebaseService.database
    .ref(`tenants/${tenantId}/onboarding`)
    .once('value');
  const onboarding = onboardingSnapshot.val();
  const progress = onboarding?.progress || 0;
  
  console.log(`🔍 Debug - Progreso de onboarding: ${progress}%`);
  
  // El bot solo puede estar activo si el onboarding está al menos al 75%
  if (progress < 75) {
    console.log(`🔴 Onboarding incompleto (${progress}%). Bot no disponible.`);
    return null; // No responder nada
  }
  
  // 2. Verificar si el menú está configurado
  const menuSnapshot = await firebaseService.database
    .ref(`tenants/${tenantId}/menu/items`)
    .once('value');
  const menuItems = menuSnapshot.val();
  
  if (!menuItems || Object.keys(menuItems).length === 0) {
    console.log(`🔴 Menú no configurado. Bot no disponible.`);
    return null; // No responder nada
  }
  
  console.log(`✅ Menú configurado: ${Object.keys(menuItems).length} items`);
  
  // 3. Verificar si el bot está activo (toggle en dashboard)
  const botConfig = await firebaseService.database
    .ref(`tenants/${tenantId}/bot/config`)
    .once('value');
  const config = botConfig.val();
  
  const botActive = config?.active !== false;
  
  if (!botActive) {
    console.log(`🔴 Bot desactivado manualmente. Ignorando mensaje.`);
    return null; // No responder nada
  }
  
  console.log(`🟢 Bot activo (onboarding: ${progress}%, toggle: ${botActive})`);
  
} catch (error) {
  console.error(`⚠️ Error verificando estado del bot:`, error);
  return null; // En caso de error, NO responder (fail-safe)
}
```

### Cambio 2: Usar mensajes personalizados

**Archivo:** `/server/bot-logic.js`  
**Función:** `processMessage()` - Comando "hola"  
**Líneas:** 126-152

```javascript
// Saludo inicial o ayuda
if (texto === 'hola' || texto === 'menu' || texto === 'empezar' || texto === 'start') {
  sesion.esperandoConfirmacion = false;
  sesion.pedidoPendiente = null;
  
  // Obtener mensaje de bienvenida personalizado
  try {
    const messagesSnapshot = await firebaseService.database
      .ref(`tenants/${tenantId}/bot/messages`)
      .once('value');
    const messages = messagesSnapshot.val();
    
    console.log(`🔍 Debug - Mensajes configurados:`, messages);
    
    let welcomeMessage = '';
    
    // Si el usuario escribió "hola", usar el mensaje de bienvenida
    if (texto === 'hola') {
      welcomeMessage = messages?.welcome || 
        '👋 *¡Hola! Bienvenido a nuestro restaurante*\n\n';
    }
    
    // Obtener el menú
    const menuMessage = await mostrarMenu(tenantId);
    
    // Combinar bienvenida + menú
    return welcomeMessage + menuMessage;
    
  } catch (error) {
    console.error(`⚠️ Error obteniendo mensajes personalizados:`, error);
    // Fallback: solo mostrar menú
    return await mostrarMenu(tenantId);
  }
}
```

## ✅ Validación de Requisitos

Ahora el bot solo responde si se cumplen **TODOS** estos requisitos:

### 1. ✅ Onboarding al menos 75%
```
tenants/${tenantId}/onboarding/progress >= 75
```

### 2. ✅ Menú configurado
```
tenants/${tenantId}/menu/items
```
Debe tener al menos 1 item disponible.

### 3. ✅ Toggle activado
```
tenants/${tenantId}/bot/config/active === true
```

### 4. ✅ Usa mensajes personalizados
```
tenants/${tenantId}/bot/messages/welcome
```
Si existe, se usa. Si no, usa mensaje predeterminado.

## 📊 Resultado Esperado

### Escenario 1: Onboarding < 75%
```
Usuario: "hola"
Bot: [No responde]
```

### Escenario 2: Onboarding ≥ 75%, Toggle OFF
```
Usuario: "hola"
Bot: [No responde]
```

### Escenario 3: Onboarding ≥ 75%, Toggle ON, Sin menú
```
Usuario: "hola"
Bot: [No responde]
```

### Escenario 4: Todo OK, Sin mensaje personalizado
```
Usuario: "hola"
Bot: "👋 ¡Hola! Bienvenido a nuestro restaurante

🍽️ *MENÚ DE HOY*
..."
```

### Escenario 5: Todo OK, Con mensaje personalizado
```
Usuario: "hola"
Bot: "¡Hola! 👋 Bienvenido a [Nombre del Restaurante]

Estamos felices de atenderte. Aquí está nuestro menú:

🍽️ *MENÚ DE HOY*
..."
```

## 🧪 Pruebas

### Prueba 1: Verificar que no responde si onboarding < 75%

1. Crear un tenant nuevo (onboarding automático en 0%)
2. Conectar WhatsApp
3. Enviar "hola"
4. **Resultado esperado:** Bot no responde

### Prueba 2: Verificar que no responde si no hay menú

1. Tenant con onboarding al 75%
2. Borrar todos los items del menú
3. Enviar "hola"
4. **Resultado esperado:** Bot no responde

### Prueba 3: Verificar mensaje personalizado

1. Configurar mensaje de bienvenida en dashboard
2. Completar onboarding al 75%+
3. Activar toggle
4. Enviar "hola"
5. **Resultado esperado:** Recibe mensaje personalizado + menú

### Prueba 4: Verificar comando "menu"

1. Enviar "menu" (en lugar de "hola")
2. **Resultado esperado:** Solo recibe menú (sin bienvenida)

## 📝 Logs Esperados

### Bot disponible:
```
📩 Procesando mensaje en tenant XXX
🔍 Debug - Progreso de onboarding: 100%
✅ Menú configurado: 8 items
🟢 Bot activo (onboarding: 100%, toggle: true)
🔍 Debug - Mensajes configurados: { welcome: '...', ... }
📋 Generando menú para tenant XXX
✅ Menú generado
```

### Bot no disponible (onboarding <75%):
```
📩 Procesando mensaje en tenant XXX
🔍 Debug - Progreso de onboarding: 50%
🔴 Onboarding incompleto (50%). Bot no disponible.
ℹ️  Sin respuesta (bot desactivado o sin configurar)
```

## 📊 Commits

```
fix: validar onboarding 75% y usar mensajes personalizados

- Bot solo responde si onboarding >= 75%
- Bot verifica que el menú esté configurado
- Comando "hola" usa mensaje de bienvenida personalizado
- Fail-safe: en caso de error, bot no responde
- Logs detallados de validación
- Fixes bugs #5a y #5b
```

## 🚀 Despliegue

```bash
git add -A
git commit -m "fix: validar onboarding 75% y usar mensajes personalizados"
git push origin main
railway up --detach
```

## ✅ Checklist de Verificación

- [x] Bot valida progreso de onboarding (>= 75%)
- [x] Bot verifica que exista menú configurado
- [x] Bot verifica toggle activo
- [x] Comando "hola" usa mensaje de bienvenida personalizado
- [x] Logs de debug muestran todas las validaciones
- [x] Fail-safe: error → no responder
- [ ] Probado en producción con onboarding < 75%
- [ ] Probado en producción con mensaje personalizado
- [ ] Verificado en logs de Railway

