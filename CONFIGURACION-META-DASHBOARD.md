# 🔧 CONFIGURACIÓN META DASHBOARD - CHECKLIST COMPLETO

## 🚨 ERROR ACTUAL
```
"JSSDK Option is Not Toggled"
```

**Causa**: Facebook Login JavaScript SDK no está habilitado en la app.

---

## ✅ SOLUCIÓN: CONFIGURACIÓN PASO A PASO

### **1. Acceder a Meta Dashboard**
```
URL: https://developers.facebook.com/apps
App: [Tu App ID]
```

---

### **2. PRODUCTOS → Facebook Login → Settings**

#### 📍 Ubicación:
```
Panel izquierdo → Products → Facebook Login → Settings
```

#### ⚙️ Configuraciones requeridas:

##### **A. Client OAuth Login**
```
Status: ✅ YES / SÍ
Descripción: Permite autenticación OAuth desde cliente
```

##### **B. Web OAuth Login**
```
Status: ✅ YES / SÍ
Descripción: Permite login OAuth desde navegador web
```

##### **C. Login with the JavaScript SDK** ⚠️ CRÍTICO
```
Status: ✅ YES / SÍ
Descripción: Permite usar el SDK de JavaScript para login
ERROR SI NO ESTÁ: "JSSDK Option is Not Toggled"
```

##### **D. Valid OAuth Redirect URIs**
```
Agregar estas URLs (una por línea):

https://kdsapp.site/onboarding-success
https://kdsapp.site/
http://localhost:5000
```

##### **E. Allowed Domains for the JavaScript SDK**
```
Agregar estos dominios (sin https://):

kdsapp.site
localhost
```

##### **F. Use Strict Mode for Redirect URIs**
```
Status: ✅ YES / SÍ (recomendado para producción)
```

---

### **3. CONFIGURACIÓN BÁSICA → Basic Settings**

#### 📍 Ubicación:
```
Panel izquierdo → Settings → Basic
```

#### ⚙️ Configuraciones requeridas:

##### **A. App Domains**
```
Agregar:
kdsapp.site
localhost
```

##### **B. Privacy Policy URL**
```
https://kdsapp.site/privacy-policy
```

##### **C. Terms of Service URL**
```
https://kdsapp.site/terms
```

##### **D. Site URL** (si está disponible)
```
https://kdsapp.site
```

---

### **4. WHATSAPP → Configuration**

#### 📍 Ubicación:
```
Panel izquierdo → Products → WhatsApp → Configuration
```

#### ⚙️ Configuraciones requeridas:

##### **A. Webhook**
```
Callback URL:
https://api.kdsapp.site/webhook/whatsapp

Verify Token:
[Tu token secreto - debe coincidir con WHATSAPP_VERIFY_TOKEN en .env]

Webhook Fields (suscribirse a):
✅ messages
✅ message_status (opcional)
```

##### **B. Configuration ID** (para Embedded Signup)
```
Ubicación: WhatsApp → Embedded Signup
Copiar el Config ID
Usar en: facebook-config.js → configId
```

---

### **5. APP REVIEW → Permissions and Features**

#### 📍 Ubicación:
```
Panel izquierdo → App Review → Permissions and Features
```

#### ⚙️ Permisos a solicitar:

##### **Para producción:**
```
✅ whatsapp_business_management
   Descripción: Gestionar cuentas de WhatsApp Business
   
✅ whatsapp_business_messaging
   Descripción: Enviar y recibir mensajes de WhatsApp
```

##### **Estado actual:**
```
⏳ En revisión / 🔒 Pendiente de aprobación
```

---

## 📋 CHECKLIST COMPLETO

### **Facebook Login**
- [ ] Client OAuth Login: YES
- [ ] Web OAuth Login: YES
- [ ] **Login with the JavaScript SDK: YES** ⚠️ (Esto soluciona tu error)
- [ ] Valid OAuth Redirect URIs configuradas
- [ ] Allowed Domains configurados
- [ ] Use Strict Mode: YES

### **Configuración Básica**
- [ ] App Domains agregados
- [ ] Privacy Policy URL configurada
- [ ] Terms of Service URL configurada
- [ ] Site URL configurada (opcional)

### **WhatsApp**
- [ ] Webhook URL configurado
- [ ] Verify Token configurado
- [ ] Webhook verificado (verde ✅)
- [ ] Subscribed to messages
- [ ] Configuration ID obtenido

### **Permisos**
- [ ] whatsapp_business_management solicitado
- [ ] whatsapp_business_messaging solicitado

---

## 🔍 VERIFICAR CONFIGURACIÓN

### **Test 1: Verificar JavaScript SDK**
```javascript
// Abrir consola del navegador en https://kdsapp.site/onboarding
// Ejecutar:
FB.getLoginStatus(function(response) {
  console.log('FB SDK funcionando:', response);
});

// Si funciona ✅: SDK está OK
// Si error ❌: Revisar configuración
```

### **Test 2: Verificar OAuth Redirect**
```
1. Click en "Conectar WhatsApp"
2. Si se abre popup → ✅ OK
3. Si error de redirect → ❌ Verificar Valid OAuth Redirect URIs
```

### **Test 3: Verificar Webhook**
```bash
# Verificar que el webhook responde:
curl "https://api.kdsapp.site/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=test123"

# Respuesta esperada: test123
```

---

## 🎯 PASOS SIGUIENTES

### **Después de habilitar JavaScript SDK:**

1. **Guardar cambios** en Meta Dashboard
2. **Esperar 1-2 minutos** (propagación de cambios)
3. **Refrescar** https://kdsapp.site/onboarding
4. **Intentar nuevamente** click en "Conectar WhatsApp"
5. **Debería abrir popup** de Facebook sin errores ✅

---

## 🚨 TROUBLESHOOTING

### Error: "JSSDK Option is Not Toggled"
```
Causa: Login with the JavaScript SDK no está en YES
Solución: Ir a Facebook Login → Settings → Toggle a YES
```

### Error: "Invalid OAuth Redirect URI"
```
Causa: La URL no está en Valid OAuth Redirect URIs
Solución: Agregar https://kdsapp.site/onboarding-success
```

### Error: "Given URL is not allowed by the Application configuration"
```
Causa: El dominio no está en Allowed Domains
Solución: Agregar kdsapp.site en Allowed Domains
```

### Error: "App Not Set Up: This app is still in development mode"
```
Causa: App no está en modo público
Solución: 
1. Agregar test users en Roles → Test Users
2. O cambiar app a modo público (requiere revisión aprobada)
```

---

## 📸 SCREENSHOTS ESPERADOS

### En Facebook Login → Settings deberías ver:

```
┌─────────────────────────────────────────────────┐
│ Client OAuth Login               [YES ✅]       │
│ Web OAuth Login                  [YES ✅]       │
│ Login with the JavaScript SDK    [YES ✅] ⚠️    │
│ Use Strict Mode                  [YES ✅]       │
│                                                 │
│ Valid OAuth Redirect URIs:                     │
│ ┌─────────────────────────────────────────┐   │
│ │ https://kdsapp.site/onboarding-success  │   │
│ │ https://kdsapp.site/                    │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ Allowed Domains:                               │
│ ┌─────────────────────────────────────────┐   │
│ │ kdsapp.site                             │   │
│ └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## ✅ RESUMEN

**Para solucionar el error "JSSDK Option is Not Toggled":**

1. Ve a: https://developers.facebook.com/apps
2. Selecciona tu app
3. Facebook Login → Settings
4. **"Login with the JavaScript SDK" → Toggle a YES** ✅
5. Save Changes
6. Espera 1-2 minutos
7. Intenta nuevamente

**Esto debería solucionar el error inmediatamente.**

---

📞 **¿Necesitas ayuda?**
Si después de esto sigues teniendo problemas, comparte:
1. Screenshot de Facebook Login → Settings
2. El mensaje de error exacto
3. La URL donde estás haciendo las pruebas
