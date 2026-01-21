# ✅ Flujo Corregido: Creación de Datos en Registro

**Fecha:** 21 de enero de 2026  
**Problema Resuelto:** Datos de tenant no se creaban al registrarse

---

## 🔍 Problema Identificado

**ANTES DEL FIX:**
1. Usuario se registra en `auth.html`
2. Se crea solo el usuario en `users/{userId}` 
3. ❌ **NO se crea el tenant en `tenants/{tenantId}`**
4. Usuario va a `select.html` → Dashboard
5. ❌ **Datos del tenant no existen en Firebase**
6. El tenant solo se creaba si pasaba por `onboarding.html`

**Consecuencia:**
- Si el usuario NO pasaba por onboarding, no tenía tenant
- Menú dinámico del bot no funcionaba (no había datos)
- Dashboard no mostraba configuración

---

## ✅ Solución Implementada

### 1. **Creación de Tenant en Registro (`auth.html`)**

**Ubicación:** Líneas 605-648

**Qué se hace ahora:**
```javascript
// Al registrar usuario nuevo
await firebase.database().ref('users/' + userId).set({
    email: email,
    name: name,
    businessName: businessName,
    pin: hashedPin,
    tenantId: tenantId,
    createdAt: new Date().toISOString(),
    onboardingCompleted: false,
    whatsappConnected: false,
    firebaseUid: user.uid
});

// ✅ NUEVO: Crear tenant inmediatamente
await firebase.database().ref('tenants/' + tenantId).set({
    userId: userId,
    email: email,
    restaurant: {
        name: businessName,
        phone: '',
        whatsappConnected: false
    },
    onboarding: {
        steps: {
            whatsapp_connected: false,
            menu_configured: false,
            messages_configured: false,
            test_completed: false
        },
        progress: 0,
        currentStep: 'whatsapp',
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    },
    menu: {
        categories: [],
        items: []
    },
    messages: {
        welcome: '¡Hola! 👋 Bienvenido a ' + businessName,
        orderConfirm: 'Perfecto, tu pedido ha sido confirmado. ✅',
        goodbye: '¡Gracias por tu pedido! 😊'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
});
```

**Beneficios:**
- ✅ Tenant existe desde el registro
- ✅ Datos iniciales están disponibles inmediatamente
- ✅ Menú dinámico del bot funciona (con menú vacío de ejemplo)
- ✅ Dashboard puede mostrar configuración

---

### 2. **Actualización Segura en Onboarding (`onboarding.html`)**

**Ubicación:** Líneas 830-888

**Qué se hace ahora:**
```javascript
// Verificar si tenant existe
const snapshot = await tenantRef.once('value');
const existingData = snapshot.val();

if (!existingData) {
    // Caso legacy: crear tenant (solo si no existe)
    console.warn('⚠️ Tenant no existe, creándolo ahora...');
    await tenantRef.set({ ...datos iniciales... });
    return;
}

// ✅ MEJOR PRÁCTICA: Usar update() en lugar de set()
// Esto actualiza SOLO los campos especificados, preservando el resto
await tenantRef.update({
    'restaurant/phone': phoneNumber,
    'restaurant/whatsappConnected': true,
    'restaurant/connectedAt': new Date().toISOString(),
    'onboarding/steps/whatsapp_connected': true,
    'onboarding/lastUpdated': new Date().toISOString(),
    'updatedAt': new Date().toISOString()
});
```

**Beneficios:**
- ✅ NO sobrescribe `menu` configurado por el usuario
- ✅ NO sobrescribe `messages` configurados
- ✅ NO sobrescribe `onboarding/progress`
- ✅ Solo actualiza campos relacionados con WhatsApp

---

## 📋 Flujos Completos

### Flujo 1: Usuario Nuevo (Registro)
```
1. auth.html → Usuario completa formulario de registro
2. Firebase Auth crea cuenta (email/password)
3. ✅ Se crea usuario en users/{userId}
4. ✅ Se crea tenant en tenants/{tenantId} (NUEVO)
5. LocalStorage guarda userId, tenantId, etc.
6. Redirige a select.html
7. Usuario puede elegir:
   a) Dashboard → dashboard.html (con datos del tenant)
   b) KDS → kds.html
```

### Flujo 2: Usuario Existente (Login)
```
1. auth.html → Usuario ingresa email/password
2. Firebase Auth valida credenciales
3. ✅ Lee userId y tenantId desde Firebase Database
4. LocalStorage guarda userId, tenantId, etc.
5. Redirige a select.html
6. Usuario puede elegir:
   a) Dashboard → dashboard.html (con datos existentes)
   b) KDS → kds.html
```

### Flujo 3: Conectar WhatsApp (Onboarding)
```
1. Usuario en dashboard hace click en "Conectar WhatsApp"
2. Va a onboarding.html
3. Escanea QR de WhatsApp
4. ✅ Onboarding actualiza SOLO campos de WhatsApp con update()
5. ✅ Preserva menu, messages, y otros datos configurados
6. Usuario regresa a dashboard
```

---

## 🗂️ Estructura de Datos en Firebase

### `users/{userId}`
```json
{
  "email": "user@example.com",
  "name": "Juan Pérez",
  "businessName": "Restaurante El Sabor",
  "pin": "hashed_pin_sha256",
  "tenantId": "tenant123abc",
  "createdAt": "2026-01-21T...",
  "onboardingCompleted": false,
  "whatsappConnected": false,
  "firebaseUid": "firebase_auth_uid"
}
```

### `tenants/{tenantId}` (Creado en Registro)
```json
{
  "userId": "user123",
  "email": "user@example.com",
  "restaurant": {
    "name": "Restaurante El Sabor",
    "phone": "",
    "whatsappConnected": false
  },
  "onboarding": {
    "steps": {
      "whatsapp_connected": false,
      "menu_configured": false,
      "messages_configured": false,
      "test_completed": false
    },
    "progress": 0,
    "currentStep": "whatsapp",
    "startedAt": "2026-01-21T...",
    "lastUpdated": "2026-01-21T..."
  },
  "menu": {
    "categories": [],
    "items": []
  },
  "messages": {
    "welcome": "¡Hola! 👋 Bienvenido a Restaurante El Sabor",
    "orderConfirm": "Perfecto, tu pedido ha sido confirmado. ✅",
    "goodbye": "¡Gracias por tu pedido! 😊"
  },
  "createdAt": "2026-01-21T...",
  "updatedAt": "2026-01-21T..."
}
```

### `tenants/{tenantId}` (Después de Conectar WhatsApp)
```json
{
  // ...campos anteriores preservados...
  "restaurant": {
    "name": "Restaurante El Sabor",
    "phone": "+1234567890",              // ✅ Actualizado
    "whatsappConnected": true,            // ✅ Actualizado
    "connectedAt": "2026-01-21T12:34:56Z" // ✅ Nuevo
  },
  "onboarding": {
    "steps": {
      "whatsapp_connected": true,         // ✅ Actualizado
      "menu_configured": false,
      "messages_configured": false,
      "test_completed": false
    },
    "progress": 0,                        // ✅ Preservado
    "currentStep": "whatsapp",            // ✅ Preservado
    "startedAt": "2026-01-21T...",        // ✅ Preservado
    "lastUpdated": "2026-01-21T12:34:56Z" // ✅ Actualizado
  },
  "menu": {                               // ✅ Preservado
    "categories": [...],
    "items": [...]
  },
  "messages": {                           // ✅ Preservado
    "welcome": "...",
    "orderConfirm": "...",
    "goodbye": "..."
  }
}
```

---

## ✅ Verificación

### Checklist de Pruebas

**1. Registro de Usuario Nuevo**
- [ ] Completar formulario de registro en auth.html
- [ ] Verificar creación de usuario en Firebase Console → `users/{userId}`
- [ ] **Verificar creación de tenant en Firebase Console → `tenants/{tenantId}`** ✅
- [ ] Verificar que localStorage tiene userId y tenantId
- [ ] Redirige correctamente a select.html

**2. Login de Usuario Existente**
- [ ] Completar formulario de login en auth.html
- [ ] Verificar que localStorage carga userId y tenantId existentes
- [ ] Redirige correctamente a select.html
- [ ] Dashboard carga datos del tenant correctamente

**3. Conexión de WhatsApp (Onboarding)**
- [ ] Ir a onboarding.html desde dashboard
- [ ] Escanear QR de WhatsApp
- [ ] Verificar que SOLO se actualizan campos de WhatsApp
- [ ] **Verificar que menu NO se sobrescribe** ✅
- [ ] **Verificar que messages NO se sobrescribe** ✅
- [ ] **Verificar que progress NO se sobrescribe** ✅

**4. Bot de WhatsApp (Menú Dinámico)**
- [ ] Enviar mensaje al bot desde WhatsApp
- [ ] Verificar que bot lee menú desde Firebase (menu-service.js)
- [ ] Si menu está vacío, muestra menú de ejemplo (fallback)
- [ ] Configurar menú en dashboard
- [ ] Verificar que bot muestra el nuevo menú

---

## 📦 Archivos Modificados

### 1. `auth.html`
**Líneas modificadas:** 605-648
- ✅ Agregada creación de tenant en registro
- ✅ Tenant tiene estructura completa con datos iniciales

### 2. `onboarding.html`
**Líneas modificadas:** 830-888
- ✅ Cambiado de `set()` a `update()` para preservar datos
- ✅ Agregado fallback para crear tenant si no existe (legacy)
- ✅ Solo actualiza campos específicos de WhatsApp

---

## 🚀 Deploy

### Para deployar estos cambios:

```bash
# Frontend (Firebase Hosting)
firebase deploy --only hosting

# Backend NO requiere cambios
```

---

## 📝 Notas Importantes

1. **Retrocompatibilidad:** El código en onboarding.html tiene un fallback para crear el tenant si no existe (usuarios legacy).

2. **Método update() vs set():**
   - `set()`: Reemplaza TODOS los datos del nodo
   - `update()`: Actualiza SOLO los campos especificados ✅

3. **Menú de ejemplo:** Si el tenant tiene menu vacío, el bot usa el fallback de menu-service.js.

4. **Progreso de onboarding:** Se puede implementar lógica para actualizar `onboarding/progress` cuando el usuario configure menu/messages en el dashboard.

---

## 🎯 Resultado Final

| Aspecto | Antes | Después |
|---------|-------|---------|
| Creación de tenant | ❌ Solo en onboarding | ✅ En registro |
| Datos disponibles | ❌ Después de onboarding | ✅ Inmediatamente |
| Sobrescritura | ❌ Riesgo con set() | ✅ Seguro con update() |
| Menú dinámico | ❌ No funcionaba | ✅ Funciona siempre |
| Dashboard | ❌ Sin datos iniciales | ✅ Con datos completos |

---

**Estado:** ✅ IMPLEMENTADO  
**Pendiente:** Deploy a producción  
**Próximo paso:** Pruebas de registro y verificación de datos en Firebase
