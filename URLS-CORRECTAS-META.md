# 🔗 URLs CORRECTAS PARA META DASHBOARD

**Última actualización**: 14 de enero de 2026  
**Dominio actual**: api.kdsapp.site

---

## 🎯 App PRINCIPAL (ID: 849706941272247)

### Facebook Login Settings:
```
Valid OAuth Redirect URIs:
https://api.kdsapp.site/api/whatsapp/callback
```

### WhatsApp Configuration:
```
Embedded Signup Callback URL:
https://api.kdsapp.site/api/whatsapp/callback

Webhook URL:
https://api.kdsapp.site/webhook/whatsapp

Verify Token:
kds_webhook_token_2026
```

---

## 🔄 App LEGACY (ID: 1860852208127086)

### Facebook Login Settings:
```
Valid OAuth Redirect URIs:
https://api.kdsapp.site/api/whatsapp/callback-legacy
```

### WhatsApp Configuration:
```
Embedded Signup Callback URL:
https://api.kdsapp.site/api/whatsapp/callback-legacy

Webhook URL:
https://api.kdsapp.site/webhook/whatsapp-legacy

Verify Token:
kds_webhook_token_2026
```

---

## ⚠️ URLs ANTIGUAS (NO USAR)

Estas URLs ya NO funcionan:
```
❌ https://kds-webapp-production.up.railway.app/api/whatsapp/callback
❌ https://kds-webapp-production.up.railway.app/api/whatsapp/callback-legacy
❌ https://kds-webapp-production.up.railway.app/webhook/whatsapp
❌ https://kds-webapp-production.up.railway.app/webhook/whatsapp-legacy
```

---

## 🌐 App Domains (Ambos Apps)

En **Settings > Basic > App Domains**:
```
kdsapp.site
api.kdsapp.site
```

---

## 📱 Frontend URLs

- **Onboarding Principal**: https://kdsapp.site/onboarding.html
- **Onboarding Legacy**: https://kdsapp.site/onboarding-2.html
- **Landing Page**: https://kdsapp.site/landing.html
- **KDS Dashboard**: https://kdsapp.site/kds.html

---

## ✅ Checklist de Verificación

### App Principal (849706941272247):
- [ ] OAuth Redirect: `https://api.kdsapp.site/api/whatsapp/callback`
- [ ] Embedded Signup: `https://api.kdsapp.site/api/whatsapp/callback`
- [ ] Webhook URL: `https://api.kdsapp.site/webhook/whatsapp`
- [ ] Webhook Token: `kds_webhook_token_2026`
- [ ] App Domains: `kdsapp.site`, `api.kdsapp.site`

### App Legacy (1860852208127086):
- [ ] OAuth Redirect: `https://api.kdsapp.site/api/whatsapp/callback-legacy`
- [ ] Embedded Signup: `https://api.kdsapp.site/api/whatsapp/callback-legacy`
- [ ] Webhook URL: `https://api.kdsapp.site/webhook/whatsapp-legacy`
- [ ] Webhook Token: `kds_webhook_token_2026`
- [ ] App Domains: `kdsapp.site`, `api.kdsapp.site`

---

## 🧪 Verificación

Después de actualizar las URLs, prueba:

```bash
# Webhook principal
curl "https://api.kdsapp.site/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=kds_webhook_token_2026&hub.challenge=TEST"

# Webhook legacy
curl "https://api.kdsapp.site/webhook/whatsapp-legacy?hub.mode=subscribe&hub.verify_token=kds_webhook_token_2026&hub.challenge=TEST"

# Health check
curl "https://api.kdsapp.site/health"
```

---

## 🎯 Próximos Pasos

1. Actualiza las URLs en Meta Dashboard (App Legacy)
2. Guarda los cambios
3. Espera 1-2 minutos
4. Dale "Retry" al onboarding
5. Monitorea logs: `railway logs --tail 50`

---

**¡Listo! Con las URLs correctas debería funcionar perfectamente.** ✅
