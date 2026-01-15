# 🔧 PROBLEMA IDENTIFICADO - App Secret Incorrecto

**Fecha**: 14 de enero de 2026  
**Estado**: 🚨 CRÍTICO - Variable incorrecta encontrada

---

## 🐛 El Problema

Las variables de entorno en Railway tienen el **App Secret incorrecto** para el app legacy:

```bash
# ❌ INCORRECTO (Actual en Railway)
FACEBOOK_APP_SECRET_LEGACY=b9d991e965f52acdbf472e3191851ede
WHATSAPP_APP_SECRET_LEGACY=b9d991e965f52acdbf472e3191851ede

# Estos son los secrets del APP PRINCIPAL, no del legacy!
```

```bash
# ✅ CORRECTO (Del Meta Dashboard)
FACEBOOK_APP_SECRET_LEGACY=0be9ae1fd6c26f086f5602eac3c7055c
WHATSAPP_APP_SECRET_LEGACY=0be9ae1fd6c26f086f5602eac3c7055c
```

---

## 🎯 Por Qué Esto Causa el Error

Cuando Meta intenta validar el App ID + App Secret durante el callback:

1. Frontend envía: App ID `1860852208127086` (✅ Correcto)
2. Backend intenta obtener access token con:
   - App ID: `1860852208127086` (✅ Correcto)
   - App Secret: `b9d991e965f52acdbf472e3191851ede` (❌ Del app principal!)
3. Meta rechaza la petición: **Invalid App ID/Secret combination**
4. El usuario ve: "Failed to verify your information - network error"

---

## ✅ Solución Inmediata

### Actualizar Variables en Railway Dashboard:

1. **Ve a Railway Dashboard:**
   ```
   https://railway.com/project/e0dd8cc4-c263-4912-ac23-b18142f8910e
   ```

2. **Click en tu servicio** (kds-webapp)

3. **Ve a la pestaña "Variables"**

4. **Busca y actualiza estas variables:**

   ```
   FACEBOOK_APP_SECRET_LEGACY
   Valor actual: b9d991e965f52acdbf472e3191851ede
   Nuevo valor: 0be9ae1fd6c26f086f5602eac3c7055c
   ```

   ```
   WHATSAPP_APP_SECRET_LEGACY
   Valor actual: b9d991e965f52acdbf472e3191851ede
   Nuevo valor: 0be9ae1fd6c26f086f5602eac3c7055c
   ```

5. **Guarda los cambios**

6. **Espera que Railway redeploy automáticamente** (1-2 minutos)

---

## 🔍 Verificación

Después de actualizar las variables, verifica:

```bash
# Ver que las variables estén correctas
railway variables | grep "LEGACY"

# Esperar que el deploy termine
railway status

# Ver logs del nuevo deploy
railway logs --tail 50
```

---

## 🧪 Probar Nuevamente

Una vez que Railway haya redeployado:

1. **Limpia la caché del navegador** (Cmd/Ctrl + Shift + R)
2. **Abre el onboarding legacy:**
   ```
   https://kdsapp.site/onboarding-2.html
   ```
3. **Intenta conectar WhatsApp nuevamente**
4. **Monitorea los logs:**
   ```bash
   railway logs --tail 50
   ```

Ahora deberías ver:
```
🔄 CALLBACK LEGACY recibido
✅ Access token obtenido exitosamente (LEGACY)
🎉 Onboarding LEGACY completado exitosamente!
```

---

## 📋 Resumen de Valores Correctos

| Variable | App Principal | App Legacy |
|----------|--------------|------------|
| `FACEBOOK_APP_ID` | 849706941272247 | 1860852208127086 |
| `FACEBOOK_APP_SECRET` | b9d991e965f52acdbf472e3191851ede | **0be9ae1fd6c26f086f5602eac3c7055c** |
| `WHATSAPP_APP_ID` | 849706941272247 | 1860852208127086 |
| `WHATSAPP_APP_SECRET` | b9d991e965f52acdbf472e3191851ede | **0be9ae1fd6c26f086f5602eac3c7055c** |

---

## ⚠️ IMPORTANTE

**NO compartas los App Secrets públicamente.** Este documento es solo para tu referencia local.

---

## 🔗 Enlaces Útiles

- Railway Dashboard: https://railway.com/project/e0dd8cc4-c263-4912-ac23-b18142f8910e
- Meta App Legacy: https://developers.facebook.com/apps/1860852208127086/
- Onboarding Legacy: https://kdsapp.site/onboarding-2.html

---

**Una vez actualizadas las variables, el sistema debería funcionar correctamente.** ✅
