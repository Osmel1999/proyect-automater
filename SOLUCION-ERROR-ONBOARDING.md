# 🔧 SOLUCIÓN ERROR ONBOARDING LEGACY

**Error**: "Failed to verify your information - Your updates weren't completed due to a network error"

**Fecha**: 14 de enero de 2026

---

## 🔍 Diagnóstico

- ✅ Backend funcionando (https://api.kdsapp.site)
- ✅ Webhook legacy verificado
- ❌ Callback no está llegando al servidor
- **Problema**: Meta no puede comunicarse con el endpoint de callback

---

## 🛠️ Pasos para Solucionar

### 1. Verificar OAuth Redirect URI en Meta Dashboard

Ve a la configuración del **App Legacy (ID: 1860852208127086)**:

1. **Abre el Dashboard de Meta:**
   ```
   https://developers.facebook.com/apps/1860852208127086/settings/basic/
   ```

2. **Verifica en "Facebook Login" > "Settings":**
   
   Debe estar esta URL EXACTA:
   ```
   https://api.kdsapp.site/api/whatsapp/callback-legacy
   ```

3. **IMPORTANTE**: También verifica en "WhatsApp" > "Configuration":
   
   Debe estar configurado:
   ```
   Embedded Signup Callback URL:
   https://api.kdsapp.site/api/whatsapp/callback-legacy
   ```

---

### 2. Verificar Dominios Permitidos

En **App Domains** debe estar:
```
kdsapp.site
api.kdsapp.site
```

---

### 3. Verificar Estado del App

- El app debe estar en modo **"Live"** (no Development)
- El app debe tener el permiso **"whatsapp_business_management"**

---

## ✅ Checklist de Verificación

- [ ] OAuth Redirect URI configurada correctamente
- [ ] Embedded Signup Callback URL configurada
- [ ] Dominios permitidos agregados
- [ ] App en modo "Live"
- [ ] Permisos de WhatsApp habilitados
- [ ] Webhook configurado y verificado

---

## 🧪 Probar Nuevamente

Una vez verificado todo:

1. **Refresca la página de onboarding:**
   ```
   https://kdsapp.site/onboarding-2.html
   ```

2. **Click en "Retry" o recarga la página**

3. **Intenta conectar WhatsApp nuevamente**

4. **Monitorea los logs:**
   ```bash
   railway logs --tail 50
   ```

---

## 🆘 Si el Error Persiste

### Verificar Variables de Entorno en Railway:

```bash
railway variables
```

Debe mostrar:
- `FACEBOOK_APP_ID_LEGACY=1860852208127086`
- `FACEBOOK_APP_SECRET_LEGACY=[tu secret]`
- `FACEBOOK_CONFIG_ID_LEGACY=[tu config id]`
- `WHATSAPP_BUSINESS_ACCOUNT_ID_LEGACY=417281831476993`
- `PORTFOLIO_ID_LEGACY=1473689432774278`

### Logs Detallados:

```bash
# Ver logs en tiempo real
railway logs --tail 100

# Buscar errores específicos
railway logs | grep -i error
railway logs | grep -i callback
```

---

## 📞 Contactar Soporte de Meta

Si nada funciona, es posible que necesites:

1. **Revisar el estado del Business Portfolio** en:
   ```
   https://business.facebook.com/settings/portfolios/1473689432774278
   ```

2. **Verificar que el WhatsApp Business Account** (417281831476993) esté activo

3. **Contactar soporte de Meta** si el portfolio tiene restricciones

---

## 🎯 Próximos Pasos

1. Verifica la configuración en Meta Dashboard
2. Dale "Retry" al onboarding
3. Si funciona, monitorea que el tenant se cree con `configType: "legacy"`
4. Prueba enviar un mensaje de prueba

---

**¿Funcionó?** 🎉

Si sigue sin funcionar, comparte:
- Screenshot del error completo
- Logs de Railway
- Screenshot de la configuración de OAuth en Meta
