# ✅ Checklist: Deploy y Verificación Post-Refactorización

**Fecha:** 2025-01-15  
**Contexto:** Despliegue de cambios en flujo de autenticación y renombre de onboarding → whatsapp-connect  
**Estado:** 🟡 PENDIENTE DEPLOY

---

## 📋 Pre-Deploy: Verificación de Cambios

### ✅ COMPLETADO:

- [x] **Backend (server/index.js)**
  - [x] Línea 260: `onboarding-2.html` → `whatsapp-connect.html`
  - [x] Verificar que no hay otras referencias a `onboarding-2.html`
  - [x] Verificar que endpoints OAuth siguen funcionando (si se necesitan)

- [x] **Frontend (HTML)**
  - [x] `onboarding.html` renombrado a `whatsapp-connect.html`
  - [x] `auth.html`: Crear tenant en registro (ya implementado)
  - [x] `select.html`: Botones a KDS y Dashboard (ya implementado)
  - [x] `dashboard.html`: Botón "Conectar WhatsApp" → `whatsapp-connect.html`
  - [x] `kds.html`: Botón "Conectar WhatsApp" → `whatsapp-connect.html`

- [x] **Firebase Hosting (firebase.json)**
  - [x] Rewrite `/onboarding` → `/whatsapp-connect.html`
  - [x] Verificar que no hay rewrites legacy

- [x] **Documentación**
  - [x] Análisis de seguridad (ANALISIS-SEGURIDAD-ONBOARDING-SUCCESS.md)
  - [x] Análisis de flujo de autenticación (ANALISIS-FLUJO-AUTENTICACION.md)
  - [x] Checklist de deploy (este archivo)

---

## 🚀 Deploy: Pasos

### 1️⃣ **Backend (Railway)**

#### Paso 1: Commit de cambios
```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp

# Ver cambios
git status

# Agregar cambios
git add server/index.js

# Commit
git commit -m "fix: actualizar referencia onboarding-2 → whatsapp-connect en callback OAuth"

# Push a Railway
git push origin main
```

#### Paso 2: Verificar deploy en Railway
```bash
# Opción 1: Railway CLI
railway logs

# Opción 2: Railway Dashboard
# Ir a: https://railway.app/dashboard
# Ver logs de deploy
```

#### Paso 3: Verificar endpoints
```bash
# Healthcheck
curl https://kds-production-82d6.up.railway.app/health

# Verificar que el server responde
curl -I https://kds-production-82d6.up.railway.app/api/whatsapp/status
```

---

### 2️⃣ **Frontend (Firebase Hosting)**

#### Paso 1: Build (si aplica)
```bash
# Si hay build process, ejecutar aquí
# (En este caso no hay, son HTML estáticos)
```

#### Paso 2: Deploy a Firebase
```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp

# Preview (opcional, para revisar antes de deploy)
firebase hosting:channel:deploy preview

# Deploy a producción
firebase deploy --only hosting

# Output esperado:
# ✔  Deploy complete!
# Project Console: https://console.firebase.google.com/project/kds-app-xxxxx/overview
# Hosting URL: https://kdsapp.site
```

#### Paso 3: Verificar archivos desplegados
```bash
# Verificar que whatsapp-connect.html está accesible
curl -I https://kdsapp.site/whatsapp-connect.html
# Esperado: 200 OK

# Verificar que onboarding.html ya no existe
curl -I https://kdsapp.site/onboarding.html
# Esperado: 301 Redirect a /whatsapp-connect.html (si hay rewrite)
# O: 404 Not Found

# Verificar otros archivos
curl -I https://kdsapp.site/auth.html
curl -I https://kdsapp.site/select.html
curl -I https://kdsapp.site/dashboard.html
curl -I https://kdsapp.site/kds.html
```

---

## 🧪 Post-Deploy: Testing Completo

### 1️⃣ **Flujo de Registro**

#### Test 1: Registro nuevo usuario
```
✅ PASOS:
1. Ir a https://kdsapp.site/auth.html
2. Click en tab "Registrarse"
3. Llenar:
   - Nombre: "Test User"
   - Nombre del Negocio: "Test Restaurant"
   - Email: "test+[timestamp]@test.com"
   - Password: "Test123456"
   - Confirmar Password: "Test123456"
   - PIN: 1234
4. Click "Registrarse"

✅ VERIFICAR:
- [ ] Mostrar spinner de loading
- [ ] Crear cuenta en Firebase Auth
- [ ] Crear registro en Firebase DB (users/{userId})
- [ ] Crear registro en Firebase DB (tenants/{tenantId})
- [ ] Guardar datos en localStorage
- [ ] Redirigir a /select.html
- [ ] Mostrar nombre de usuario en select.html

❌ ERRORES COMUNES:
- "Este correo ya está registrado" → Usar otro email
- "La contraseña es muy débil" → Usar al menos 6 caracteres
- "PIN inválido" → Usar 4 dígitos
```

#### Test 2: Verificar datos en Firebase
```bash
# Firebase Console
# Ir a: https://console.firebase.google.com/project/kds-app-xxxxx/database

# Verificar estructura:
users/
  {userId}/
    email: "test@test.com"
    name: "Test User"
    businessName: "Test Restaurant"
    pin: "[hash-sha256]"
    tenantId: "tenant[timestamp][random]"
    createdAt: "[ISO-8601]"
    onboardingCompleted: false
    whatsappConnected: false
    firebaseUid: "[firebase-auth-uid]"

tenants/
  {tenantId}/
    userId: "[userId]"
    email: "test@test.com"
    restaurant:
      name: "Test Restaurant"
      phone: ""
      whatsappConnected: false
    onboarding:
      steps:
        whatsapp_connected: false
        menu_configured: false
        messages_configured: false
        test_completed: false
      progress: 0
      currentStep: "whatsapp"
      startedAt: "[ISO-8601]"
      lastUpdated: "[ISO-8601]"
    menu:
      categories: []
      items: []
    messages:
      welcome: "¡Hola! 👋 Bienvenido a Test Restaurant. ¿En qué puedo ayudarte?"
      orderConfirm: "Perfecto, tu pedido ha sido confirmado. ✅"
      goodbye: "¡Gracias por tu pedido! Que tengas un excelente día. 😊"
    createdAt: "[ISO-8601]"
    updatedAt: "[ISO-8601]"
```

---

### 2️⃣ **Flujo de Login**

#### Test 3: Login con usuario existente
```
✅ PASOS:
1. Cerrar sesión (si está logueado)
2. Ir a https://kdsapp.site/auth.html
3. Tab "Iniciar Sesión" (debe estar activo por defecto)
4. Llenar:
   - Email: "test@test.com"
   - Password: "Test123456"
5. Click "Iniciar Sesión"

✅ VERIFICAR:
- [ ] Mostrar spinner de loading
- [ ] Login con Firebase Auth
- [ ] Buscar usuario en Firebase DB (con retry)
- [ ] Guardar datos en localStorage
- [ ] Redirigir a /select.html
- [ ] Mostrar nombre de usuario en select.html

❌ ERRORES COMUNES:
- "Usuario no encontrado" → Email incorrecto
- "Contraseña incorrecta" → Password incorrecto
- "Demasiados intentos fallidos" → Esperar 15 minutos
```

#### Test 4: Verificar localStorage
```javascript
// Abrir DevTools (F12) → Console
console.log({
    currentUserId: localStorage.getItem('currentUserId'),
    currentTenantId: localStorage.getItem('currentTenantId'),
    tenantId: localStorage.getItem('tenantId'),
    userEmail: localStorage.getItem('userEmail'),
    userName: localStorage.getItem('userName'),
    businessName: localStorage.getItem('businessName')
});

// Verificar que todos los valores están presentes
```

---

### 3️⃣ **Flujo de Selección**

#### Test 5: Selección de KDS o Dashboard
```
✅ PASOS:
1. Después del login, verificar que se carga select.html
2. Verificar que se muestran las 2 opciones:
   - 🍽️ KDS (Kitchen Display)
   - 📊 Dashboard (Gestión)
3. Click en "KDS"

✅ VERIFICAR:
- [ ] Mostrar modal de PIN
- [ ] Ingresar PIN correcto (1234)
- [ ] Redirigir a /kds.html
- [ ] Verificar que se carga KDS correctamente

❌ ERRORES COMUNES:
- "PIN incorrecto" → Verificar PIN en Firebase
- "No se encontró el usuario" → Verificar localStorage
```

#### Test 6: Selección de Dashboard
```
✅ PASOS:
1. Volver a select.html
2. Click en "Dashboard"
3. Ingresar PIN correcto (1234)

✅ VERIFICAR:
- [ ] Mostrar modal de PIN
- [ ] Redirigir a /dashboard.html
- [ ] Verificar que se carga Dashboard correctamente
- [ ] Verificar botón "Conectar WhatsApp"

❌ ERRORES COMUNES:
- "PIN incorrecto" → Verificar PIN en Firebase
```

---

### 4️⃣ **Flujo de Conexión WhatsApp**

#### Test 7: Conectar WhatsApp desde Dashboard
```
✅ PASOS:
1. En dashboard.html, click "Conectar WhatsApp"
2. Verificar redirección a /whatsapp-connect.html
3. Verificar que se muestra código QR

✅ VERIFICAR:
- [ ] URL: https://kdsapp.site/whatsapp-connect.html
- [ ] Mostrar código QR
- [ ] Mostrar instrucciones
- [ ] No mostrar formularios de registro/login
- [ ] No mostrar botones de Facebook/Meta

❌ ERRORES COMUNES:
- 404 Not Found → Verificar que firebase deploy se hizo correctamente
- Código QR no se genera → Verificar backend en Railway
- Error de CORS → Verificar config de CORS en server/index.js
```

#### Test 8: Escanear código QR
```
✅ PASOS:
1. Abrir WhatsApp en el celular
2. Ir a: Ajustes → Dispositivos vinculados → Vincular dispositivo
3. Escanear código QR en whatsapp-connect.html
4. Esperar confirmación de conexión

✅ VERIFICAR:
- [ ] QR se escanea correctamente
- [ ] Mostrar mensaje "Conectado exitosamente"
- [ ] Actualizar Firebase DB (whatsappConnected: true)
- [ ] Redirigir a dashboard.html automáticamente
- [ ] Actualizar estado en dashboard (mostrar "Conectado")

❌ ERRORES COMUNES:
- "QR expiró" → Generar nuevo código
- "Error de conexión" → Verificar logs en Railway
- "WhatsApp no responde" → Reintentar en 1 minuto
```

---

### 5️⃣ **Flujo de KDS**

#### Test 9: Ver pedidos en KDS
```
✅ PASOS:
1. Ir a https://kdsapp.site/kds.html
2. Ingresar PIN (1234)
3. Verificar que se carga la pantalla de pedidos

✅ VERIFICAR:
- [ ] Mostrar lista de pedidos (vacía si no hay pedidos)
- [ ] Botón "Conectar WhatsApp" si no está conectado
- [ ] Actualización en tiempo real de pedidos

❌ ERRORES COMUNES:
- "No se encontró el tenant" → Verificar localStorage
- "PIN incorrecto" → Verificar PIN en Firebase
```

---

## 🔍 Post-Deploy: Verificación de Backend

### Test 10: Endpoints de API
```bash
# 1. Healthcheck
curl https://kds-production-82d6.up.railway.app/health
# Esperado: { "status": "ok", ... }

# 2. Status de WhatsApp
curl "https://kds-production-82d6.up.railway.app/api/whatsapp/status?tenantId=tenant123"
# Esperado: { "connected": false/true, ... }

# 3. Generar QR (requiere tenantId válido)
curl "https://kds-production-82d6.up.railway.app/api/whatsapp/qr?tenantId=tenant123"
# Esperado: { "qr": "data:image/png;base64,..." } o { "connected": true }

# 4. Verificar que endpoint OAuth legacy sigue funcionando (si se necesita)
curl -I https://kds-production-82d6.up.railway.app/api/whatsapp/callback-legacy
# Esperado: 302 Redirect (si no hay code) o 200 OK
```

---

## 📊 Métricas de Éxito

### ✅ DEPLOY EXITOSO SI:
- [ ] Todos los archivos HTML se cargan (200 OK)
- [ ] Flujo de registro crea usuario y tenant correctamente
- [ ] Flujo de login autentica y redirige correctamente
- [ ] Flujo de selección muestra opciones y valida PIN
- [ ] Flujo de WhatsApp muestra QR y conecta correctamente
- [ ] Backend responde a todos los endpoints
- [ ] No hay errores en Console de navegador
- [ ] No hay errores en logs de Railway

### ⚠️ DEPLOY CON WARNINGS SI:
- [ ] Algún endpoint legacy devuelve 404 (pero no se usa)
- [ ] Hay warnings en logs de Firebase (pero no errores)
- [ ] Hay deprecation notices en dependencias (pero funciona)

### ❌ DEPLOY FALLIDO SI:
- [ ] Archivos HTML devuelven 404 o 500
- [ ] Registro/Login no funciona
- [ ] WhatsApp QR no se genera
- [ ] Backend no responde
- [ ] Errores críticos en Console o logs

---

## 🔧 Rollback Plan (Si algo sale mal)

### Opción 1: Rollback de Backend (Railway)
```bash
# Ver deploys anteriores
railway logs --previous

# Rollback a deploy anterior
railway rollback

# O desde el dashboard:
# https://railway.app/dashboard → Deployments → Click en deploy anterior → Rollback
```

### Opción 2: Rollback de Frontend (Firebase)
```bash
# Ver versiones anteriores
firebase hosting:releases:list

# Rollback a versión anterior
firebase hosting:releases:rollback [version-id]

# O desde Firebase Console:
# Hosting → Release History → Click en versión anterior → Rollback
```

---

## 📞 Troubleshooting

### Error: "No se encontró el usuario" después del login
```bash
# CAUSA: Usuario no se guardó en Firebase DB
# SOLUCIÓN:
1. Verificar logs de auth.html en Console (F12)
2. Verificar que firebase.database().ref('users/...').set() se ejecutó
3. Verificar Firebase Console → Database → users/
4. Si no existe, registrar usuario de nuevo
```

### Error: "No se encontró el tenant" en Dashboard/KDS
```bash
# CAUSA: Tenant no se creó en registro
# SOLUCIÓN:
1. Verificar logs de auth.html en Console (F12)
2. Verificar que firebase.database().ref('tenants/...').set() se ejecutó
3. Verificar Firebase Console → Database → tenants/
4. Si no existe, registrar usuario de nuevo o crear tenant manualmente
```

### Error: 404 en whatsapp-connect.html
```bash
# CAUSA: Firebase deploy no se hizo o falló
# SOLUCIÓN:
firebase deploy --only hosting
```

### Error: QR no se genera en whatsapp-connect.html
```bash
# CAUSA: Backend no responde o tenantId incorrecto
# SOLUCIÓN:
1. Verificar logs de Railway: railway logs
2. Verificar que tenantId en localStorage es correcto
3. Verificar que endpoint /api/whatsapp/qr responde
4. Verificar CORS en server/index.js
```

---

## ✅ Checklist Final

### Antes de marcar como COMPLETADO:
- [ ] Backend desplegado en Railway sin errores
- [ ] Frontend desplegado en Firebase sin errores
- [ ] Test de registro completo y exitoso
- [ ] Test de login completo y exitoso
- [ ] Test de selección de KDS/Dashboard
- [ ] Test de conexión WhatsApp con QR
- [ ] Test de visualización de pedidos en KDS
- [ ] Test de configuración en Dashboard
- [ ] Verificación de endpoints de API
- [ ] Verificación de logs sin errores críticos
- [ ] Documentación actualizada

### Cuando TODO esté ✅:
```bash
# Crear tag de release
git tag -a v1.1.0 -m "Refactor: Separación completa de auth y WhatsApp connect"
git push origin v1.1.0

# Actualizar documentación
echo "✅ Deploy completado: $(date)" >> DEPLOY-LOG.md

# Notificar al equipo (si aplica)
echo "🚀 Deploy v1.1.0 completado exitosamente" | slack-notify
```

---

**Generado:** 2025-01-15  
**Autor:** GitHub Copilot + @osmeldfarak  
**Versión:** 1.0  
**Última actualización:** 2025-01-15
