# 📝 GUÍA: CONFIGURAR FACEBOOK LOGIN QUICKSTART

**App ID**: 849706941272247  
**Fecha**: 27 de diciembre de 2024

---

## 🎯 ¿POR QUÉ ES NECESARIO?

El **Facebook Login Quickstart** es necesario para:
1. ✅ Configurar las URLs permitidas para OAuth
2. ✅ Permitir que tu app use el JavaScript SDK
3. ✅ Habilitar el flujo de Embedded Signup correctamente
4. ✅ Evitar errores de dominio no autorizado

---

## 📋 PASOS PARA COMPLETAR EL QUICKSTART

### 1️⃣ Ir a Facebook Login Settings

**URL**: https://developers.facebook.com/apps/849706941272247/fb-login/settings/

---

### 2️⃣ Configurar "Valid OAuth Redirect URIs"

En la sección **"Valid OAuth Redirect URIs"**, agrega las siguientes URLs (una por línea):

```
https://kds-app-7f1d3.web.app/
https://kds-app-7f1d3.web.app/onboarding.html
https://kdsapp.site/
https://kdsapp.site/onboarding.html
http://kdsapp.site/
http://kdsapp.site/onboarding.html
https://api.kdsapp.site/api/whatsapp/callback
```

**¿Por qué estas URLs?**
- `kds-app-7f1d3.web.app` → Frontend en Firebase Hosting (siempre HTTPS)
- `kdsapp.site` → Dominio personalizado del frontend
- `http://kdsapp.site` → Soporte para HTTP (aunque redirige a HTTPS)
- `api.kdsapp.site/api/whatsapp/callback` → Backend OAuth callback

**Nota**: Se incluyen tanto HTTP como HTTPS para `kdsapp.site` por compatibilidad, aunque HTTP redirige automáticamente a HTTPS.

---

### 3️⃣ Configurar "Allowed Domains for the JavaScript SDK"

En la sección **"Allowed Domains for the JavaScript SDK"**, agrega los siguientes dominios (uno por línea):

```
kds-app-7f1d3.web.app
kdsapp.site
api.kdsapp.site
```

**Nota**: NO incluyas `https://` ni rutas, solo el dominio

---

### 4️⃣ Verificar Configuración Básica

Ve a: **Settings → Basic**  
https://developers.facebook.com/apps/849706941272247/settings/basic/

#### App Domains
Asegúrate de tener estos dominios en **"App Domains"**:

```
kds-app-7f1d3.web.app
kdsapp.site
api.kdsapp.site
```

#### Website
En la sección **"Add Platform" → Website**, agrega:

**Site URL**: `https://kds-app-7f1d3.web.app`

---

### 5️⃣ Guardar Cambios

Click en **"Save Changes"** en la parte inferior de cada sección.

---

## ✅ VERIFICACIÓN DE LA CONFIGURACIÓN

### Después de guardar, verifica que tengas:

#### 📱 En Facebook Login Settings:

**Valid OAuth Redirect URIs**:
- ✅ https://kds-app-7f1d3.web.app/
- ✅ https://kds-app-7f1d3.web.app/onboarding.html
- ✅ https://kdsapp.site/
- ✅ https://kdsapp.site/onboarding.html
- ✅ http://kdsapp.site/
- ✅ http://kdsapp.site/onboarding.html
- ✅ https://api.kdsapp.site/api/whatsapp/callback

**Allowed Domains for the JavaScript SDK**:
- ✅ kds-app-7f1d3.web.app
- ✅ kdsapp.site
- ✅ api.kdsapp.site

#### ⚙️ En Settings → Basic:

**App Domains**:
- ✅ kds-app-7f1d3.web.app
- ✅ kdsapp.site
- ✅ api.kdsapp.site

**Website**:
- ✅ Site URL: https://kds-app-7f1d3.web.app

---

## 🧪 PROBAR LA CONFIGURACIÓN

### 1. Probar el JavaScript SDK

Abre la consola del navegador en: https://kds-app-7f1d3.web.app/onboarding.html

Deberías ver:
```
✅ Facebook SDK cargado correctamente
```

**NO deberías ver**:
```
❌ Given URL is not allowed by the Application configuration
```

### 2. Probar el flujo de Embedded Signup

1. Ir a: https://kds-app-7f1d3.web.app/onboarding.html
2. Click en "Conectar WhatsApp"
3. Debería abrir el popup de Facebook sin errores de dominio

---

## 🔍 TROUBLESHOOTING

### ❌ Error: "Given URL is not allowed by the Application configuration"

**Causa**: El dominio no está en "Allowed Domains for the JavaScript SDK"

**Solución**:
1. Ir a: https://developers.facebook.com/apps/849706941272247/fb-login/settings/
2. Agregar el dominio en "Allowed Domains for the JavaScript SDK"
3. Guardar cambios
4. Esperar 1-2 minutos para que se propague
5. Refrescar la página

### ❌ Error: "Can't Load URL: The domain of this URL isn't included in the app's domains"

**Causa**: El dominio no está en "App Domains" en Settings → Basic

**Solución**:
1. Ir a: https://developers.facebook.com/apps/849706941272247/settings/basic/
2. Agregar el dominio en "App Domains"
3. Guardar cambios

### ❌ Error: "redirect_uri is not allowed"

**Causa**: La URL de callback no está en "Valid OAuth Redirect URIs"

**Solución**:
1. Ir a: https://developers.facebook.com/apps/849706941272247/fb-login/settings/
2. Agregar la URL completa en "Valid OAuth Redirect URIs"
3. Guardar cambios

---

## 📊 CONFIGURACIÓN ACTUAL DEL PROYECTO

### Tu código YA tiene el SDK configurado:

**onboarding.html**:
```javascript
window.fbAsyncInit = function() {
  FB.init({
    appId: '849706941272247',
    cookie: true,
    xfbml: true,
    version: 'v21.0'
  });
};
```

**facebook-config.js**:
```javascript
const facebookConfig = {
  appId: '849706941272247',
  apiVersion: 'v21.0',
  embeddedSignupConfigId: '849873494548110',
  locale: 'es_LA',
  cookie: true,
  xfbml: true
};
```

✅ **El código ya está listo, solo falta configurar las URLs en Meta Dashboard**

---

## 🎯 RESUMEN DE ACCIONES

### Lo que TÚ necesitas hacer:

1. ✅ Ir a: https://developers.facebook.com/apps/849706941272247/fb-login/settings/
2. ✅ Agregar las 7 URLs en "Valid OAuth Redirect URIs"
3. ✅ Agregar los 3 dominios en "Allowed Domains for the JavaScript SDK"
4. ✅ Guardar cambios
5. ✅ Verificar en Settings → Basic que los dominios estén en "App Domains"
6. ✅ Probar abriendo: https://kds-app-7f1d3.web.app/onboarding.html
7. ✅ Probar también: https://kdsapp.site/onboarding.html

---

## ✅ CHECKLIST DE FACEBOOK LOGIN

- [ ] Valid OAuth Redirect URIs configuradas (7 URLs)
- [ ] Allowed Domains for JavaScript SDK configurados (3 dominios)
- [ ] App Domains configurados en Settings → Basic
- [ ] Website Site URL configurada
- [ ] Cambios guardados
- [ ] Probado en https://kds-app-7f1d3.web.app/onboarding.html sin errores
- [ ] Probado en https://kdsapp.site/onboarding.html sin errores

---

## 📝 QUICKSTART EN META DASHBOARD

Si quieres seguir el wizard interactivo de Meta:

1. Ve a: https://developers.facebook.com/apps/849706941272247/fb-login/quickstart/
2. Selecciona **"Website"** como plataforma
3. En "Tell Us about Your Website":
   - **Site URL**: `https://kds-app-7f1d3.web.app`
   - Click "Save" y "Continue"
4. Los pasos 2, 3 y 4 ya están implementados en tu código ✅

---

## 🎉 DESPUÉS DE CONFIGURAR

Una vez completado el Quickstart, tu app tendrá:

✅ Facebook Login completamente configurado  
✅ Embedded Signup funcionando sin errores de dominio  
✅ OAuth callbacks permitidos  
✅ JavaScript SDK autorizado  
✅ Listo para producción  

---

**URLs importantes**:
- **Login Settings**: https://developers.facebook.com/apps/849706941272247/fb-login/settings/
- **Basic Settings**: https://developers.facebook.com/apps/849706941272247/settings/basic/
- **Quickstart Wizard**: https://developers.facebook.com/apps/849706941272247/fb-login/quickstart/

---

**Última actualización**: 27 de diciembre de 2024  
**App ID**: 849706941272247  
**Status**: ⏳ Pendiente de configurar URLs en Meta Dashboard
