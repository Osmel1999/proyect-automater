# 🔍 DEBUGGING - Sistema Dual Legacy

**Fecha**: 14 de enero de 2026  
**Estado**: Investigando error "network error"

---

## ✅ Variables Verificadas

Las variables en Railway están **CORRECTAS**:

```bash
FACEBOOK_APP_ID_LEGACY=1860852208127086 ✅
FACEBOOK_APP_SECRET_LEGACY=0be9ae1fd6c26f086f5602eac3c7055c ✅
WHATSAPP_APP_ID_LEGACY=1860852208127086 ✅
WHATSAPP_APP_SECRET_LEGACY=0be9ae1fd6c26f086f5602eac3c7055c ✅
```

---

## 🧪 Página de Debug Desplegada

He creado una página especial para debugging que muestra **todos los detalles** del proceso:

### URL:
```
https://kdsapp.site/onboarding-debug.html
```

### Instrucciones:

1. **Abre la página de debug:**
   ```
   https://kdsapp.site/onboarding-debug.html
   ```

2. **Verás 4 botones:**
   - **1. Test Configuración** - Muestra toda la config (App ID, Config ID, etc.)
   - **2. Test Facebook SDK** - Verifica que FB SDK esté cargado
   - **3. Iniciar Onboarding** - Inicia el flujo completo
   - **Limpiar Logs** - Limpia la pantalla

3. **Sigue este orden:**
   - Click en "1. Test Configuración"
   - Click en "2. Test Facebook SDK"
   - Click en "3. Iniciar Onboarding"

4. **Toma screenshots de:**
   - Los logs que aparezcan ANTES de hacer click en "Iniciar Onboarding"
   - Los logs que aparezcan DESPUÉS del popup de Facebook
   - Cualquier error que salga en consola (F12)

---

## 🔍 Qué Buscar

La página de debug te mostrará:

- ✅ Si la configuración está cargando correctamente
- ✅ Si Facebook SDK se está inicializando
- ✅ El Config ID exacto que se está usando
- ✅ La respuesta completa de FB.login
- ✅ Si se recibe el código de autorización
- ✅ La URL de callback completa

---

## 📊 Monitoreo de Backend

Mientras pruebas la página de debug, en otra terminal ejecuta:

```bash
chmod +x monitor-legacy.sh
./monitor-legacy.sh
```

Esto mostrará en tiempo real cualquier request que llegue al backend con "callback", "legacy", o "error".

---

## 🎯 Posibles Causas del Error

Si la página de debug funciona pero el onboarding sigue fallando, el problema puede ser:

### 1. **Config ID Incorrecto**
El `embeddedSignupConfigId` puede ser incorrecto o estar desactivado en Meta.

**Cómo verificar:**
- Ve a: https://developers.facebook.com/apps/1860852208127086/whatsapp-business/wa-settings/
- Busca la sección "Embedded Signup"
- Verifica que el Config ID sea: `1609237700430950`

### 2. **Business Portfolio Restringido**
El portfolio `1473689432774278` puede tener restricciones.

**Cómo verificar:**
- Ve a: https://business.facebook.com/settings/portfolios/1473689432774278
- Verifica que el portfolio esté "Active"
- Verifica que no tenga restricciones

### 3. **App No Está en Modo "Live"**
Si el app está en modo "Development", puede tener limitaciones.

**Cómo verificar:**
- Ve a: https://developers.facebook.com/apps/1860852208127086/settings/basic/
- Busca el toggle de "App Mode"
- Si está en "Development", cámbialo a "Live"

### 4. **Permisos Faltantes**
El app puede no tener los permisos necesarios.

**Cómo verificar:**
- Ve a: https://developers.facebook.com/apps/1860852208127086/app-review/permissions/
- Verifica que tenga:
  - `whatsapp_business_management`
  - `whatsapp_business_messaging`

---

## 📝 Próximos Pasos

1. **Abre la página de debug** y sigue las instrucciones
2. **Toma screenshots** de los logs
3. **Compártelos** para que pueda ver exactamente qué está pasando
4. **Mientras tanto**, el monitor de backend estará escuchando

---

## 🔗 Enlaces Útiles

| Recurso | URL |
|---------|-----|
| Debug Page | https://kdsapp.site/onboarding-debug.html |
| Meta App Settings | https://developers.facebook.com/apps/1860852208127086/settings/basic/ |
| WhatsApp Settings | https://developers.facebook.com/apps/1860852208127086/whatsapp-business/wa-settings/ |
| Business Portfolio | https://business.facebook.com/settings/portfolios/1473689432774278 |
| Railway Logs | `railway logs --tail 100` |

---

**Con la página de debug podremos ver EXACTAMENTE dónde está fallando el proceso.** 🔍
