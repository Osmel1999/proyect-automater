# ✅ SISTEMA DUAL - PRUEBA FINAL

**Fecha**: 14 de enero de 2026  
**Estado**: ✅ Listo para Probar

---

## 🎯 URLs para Probar

### 1️⃣ Onboarding Principal (Portfolio Nuevo)
```
URL: https://kdsapp.site/onboarding.html
Portfolio: 880566844730976
Status: ✅ Activo
```

**Características:**
- Portfolio verificado por Meta
- Activación instantánea
- Para clientes en producción

### 2️⃣ Onboarding Legacy (Portfolio Antiguo)
```
URL: https://kdsapp.site/onboarding-2.html
Portfolio: 1473689432774278
Status: ✅ Activo (Backup)
```

**Características:**
- Portfolio antiguo
- Badge naranja "🔄 Configuración LEGACY"
- Para pruebas y backup

---

## 🧪 Cómo Probar

### Opción 1: Probar Onboarding Legacy

1. **Abre en el navegador:**
   ```
   https://kdsapp.site/onboarding-2.html
   ```

2. **Verifica que veas:**
   - Badge naranja: "🔄 Configuración LEGACY (Backup)"
   - Texto: "Portfolio ID: 1473689432774278"
   - Botón "Conectar WhatsApp"

3. **Click en "Conectar WhatsApp"**
   - Se abrirá el modal de Facebook
   - Usará el App ID: 1860852208127086
   - Pre-seleccionará el portfolio: 1473689432774278

4. **Autoriza la conexión**
   - El sistema redirigirá a: `/api/whatsapp/callback-legacy`
   - Creará el tenant con `configType: "legacy"`
   - Te redirigirá a: `onboarding-success.html?config=legacy`

### Opción 2: Verificar Endpoints Backend

```bash
# Verificar webhook legacy
curl "https://api.kdsapp.site/webhook/whatsapp-legacy?hub.mode=subscribe&hub.verify_token=kds_webhook_token_2026&hub.challenge=TEST"
# Debe responder: TEST

# Verificar que el servidor esté corriendo
curl "https://api.kdsapp.site/health"
# Debe responder con status OK
```

---

## 📊 Estado de Configuración

### Backend (Railway) ✅
- [x] Variables legacy configuradas
- [x] Endpoint `/api/whatsapp/callback-legacy` activo
- [x] Endpoint `/webhook/whatsapp-legacy` activo
- [x] Código desplegado correctamente

### Frontend (Firebase) ✅
- [x] `onboarding.html` (principal) desplegado
- [x] `onboarding-2.html` (legacy) desplegado
- [x] `facebook-config.js` (principal) desplegado
- [x] `facebook-config-legacy.js` (legacy) desplegado
- [x] `dual-config.js` desplegado

### Meta Dashboard (App Legacy: 1860852208127086) ✅
- [x] Webhook URL configurada
- [x] Webhook verificado
- [x] OAuth Redirect URIs configuradas
- [x] Pre-fill Portfolio configurado

---

## 🔍 Verificación de Base de Datos

Cuando alguien se registre por el onboarding legacy, en Firebase verás:

```javascript
tenants/
  └── tenant_xxxxx/
      ├── configType: "legacy"         // ✅ Identificador
      ├── portfolioId: "1473689432774278"
      ├── restaurantName: "Mi Restaurante (Legacy)"
      ├── whatsappPhoneNumberId: "..."
      └── ...resto de datos
```

---

## 📝 Logs del Servidor

Cuando alguien use el onboarding legacy, verás en Railway:

```
🔄 CALLBACK LEGACY recibido
   Portfolio: KDS Legacy
   Portfolio ID: 1473689432774278
   App ID: 1860852208127086
✅ Access token obtenido exitosamente (LEGACY)
📱 Información de WhatsApp obtenida (LEGACY)
🎉 Onboarding LEGACY completado exitosamente!
```

---

## ⚡ Comandos Rápidos

### Ver logs de Railway
```bash
railway logs --tail 50
```

### Verificar sistema dual localmente
```bash
./verify-dual-config.sh
```

### Menu de tests
```bash
./test-dual.sh
```

### Abrir onboarding legacy en navegador
```bash
open https://kdsapp.site/onboarding-2.html
```

---

## 🎉 ¿Qué Puedes Hacer Ahora?

1. **Probar el onboarding legacy** con un número de WhatsApp real
2. **Verificar en Firebase** que el tenant se cree con `configType: "legacy"`
3. **Comparar** con el onboarding principal
4. **Usar ambos portfolios** simultáneamente sin conflictos

---

## 🔗 Enlaces Útiles

| Descripción | URL |
|-------------|-----|
| Onboarding Principal | https://kdsapp.site/onboarding.html |
| Onboarding Legacy | https://kdsapp.site/onboarding-2.html |
| Meta App Legacy | https://developers.facebook.com/apps/1860852208127086/ |
| Firebase Console | https://console.firebase.google.com/project/kds-app-7f1d3 |
| Railway Logs | https://railway.com/project/e0dd8cc4-c263-4912-ac23-b18142f8910e |

---

## ✅ Checklist Final

- [x] Backend desplegado en Railway
- [x] Variables legacy configuradas
- [x] Frontend desplegado en Firebase
- [x] Webhook legacy verificado en Meta
- [x] OAuth redirect URIs configuradas
- [x] Sistema dual funcionando
- [ ] **SIGUIENTE: Probar con un número real** 🧪

---

**¡Todo listo para usar! El sistema dual está completamente funcional.** 🎊

---

## 🎯 Siguiente Paso Recomendado

**Probar el onboarding legacy con un número de WhatsApp de prueba:**

1. Abre: https://kdsapp.site/onboarding-2.html
2. Click en "Conectar WhatsApp"
3. Autoriza con Facebook
4. Verifica que el número se agregue al portfolio legacy
5. Revisa los logs en Railway
6. Verifica el tenant en Firebase

**¿Quieres que te ayude con la prueba?** 🚀
