# 🔄 Sistema Dual - Acceso Rápido

## 🚪 URLs de Acceso

### Configuración Principal (Recomendada)
```
🌐 https://kdsapp.site/onboarding.html
📱 Portfolio: 880566844730976
✅ Estado: Verificado
⚡ Activación: Instantánea
```

### Configuración Legacy (Backup)
```
🌐 https://kdsapp.site/onboarding-2.html
📱 Portfolio: 1473689432774278
🔄 Estado: Backup
🧪 Uso: Pruebas y respaldo
```

---

## 📋 Checklist de Implementación

### ✅ Completado
- [x] Archivo `dual-config.js` creado
- [x] Configuración legacy `facebook-config-legacy.js`
- [x] Página de onboarding legacy `onboarding-2.html`
- [x] Endpoints backend para ambas configuraciones
- [x] Webhooks separados para cada portfolio
- [x] Script de verificación `verify-dual-config.sh`
- [x] Documentación completa `GUIA-SISTEMA-DUAL.md`
- [x] Identificación visual en frontend (badge naranja)

### 📝 Pendiente de Configurar

- [ ] Variables de entorno legacy en Railway:
  ```bash
  WHATSAPP_APP_ID_LEGACY=1860852208127086
  WHATSAPP_APP_SECRET_LEGACY=tu_secret_legacy
  ```

- [ ] Configurar en Meta Dashboard (App Legacy):
  - [ ] Callback URL: `https://kds-webapp-production.up.railway.app/api/whatsapp/callback-legacy`
  - [ ] Webhook URL: `https://kds-webapp-production.up.railway.app/webhook/whatsapp-legacy`
  - [ ] Whitelist de redirect URLs

- [ ] Desplegar archivos:
  - [ ] Backend: `railway up`
  - [ ] Frontend: `firebase deploy`

---

## 🧪 Cómo Probar

### 1. Configuración Principal
```bash
# Abrir en el navegador
open https://kdsapp.site/onboarding.html

# Verificar en consola del navegador
console.log('Portfolio:', facebookConfig.portfolioId);
# Debe mostrar: 880566844730976
```

### 2. Configuración Legacy
```bash
# Abrir en el navegador
open https://kdsapp.site/onboarding-2.html

# Verificar en consola del navegador
console.log('Portfolio:', facebookConfig.portfolioId);
# Debe mostrar: 1473689432774278
```

### 3. Verificar Sistema Local
```bash
./verify-dual-config.sh
```

---

## 🔍 Debugging

### Ver Logs del Backend

```bash
# En Railway
railway logs

# Buscar por configuración
# Principal: "Callback recibido"
# Legacy: "CALLBACK LEGACY recibido"
```

### Verificar Base de Datos

Los tenants tienen un campo `configType`:
```javascript
{
  tenantId: "...",
  configType: "primary" | "legacy",
  portfolioId: "880566844730976" | "1473689432774278",
  // ...
}
```

---

## 📞 Endpoints Disponibles

| Tipo | Endpoint | Uso |
|------|----------|-----|
| Principal | `/api/whatsapp/callback` | OAuth callback |
| Principal | `/webhook/whatsapp` | Mensajes entrantes |
| Legacy | `/api/whatsapp/callback-legacy` | OAuth callback |
| Legacy | `/webhook/whatsapp-legacy` | Mensajes entrantes |

---

## 💡 Casos de Uso

### Usar Principal cuando:
- ✅ Nuevos clientes en producción
- ✅ Necesitas activación instantánea
- ✅ Máxima estabilidad
- ✅ Portfolio verificado

### Usar Legacy cuando:
- 🔄 Quieres probar con el portfolio anterior
- 🔄 Necesitas mantener compatibilidad
- 🧪 Pruebas internas
- 💾 Sistema de respaldo

---

## 🚀 Despliegue

### 1. Backend (Railway)
```bash
# Configurar variables de entorno legacy (opcional)
railway variables set WHATSAPP_APP_ID_LEGACY=1860852208127086
railway variables set WHATSAPP_APP_SECRET_LEGACY=tu_secret

# Desplegar
railway up
```

### 2. Frontend (Firebase)
```bash
# Desplegar ambos archivos de onboarding
firebase deploy --only hosting
```

---

## 📚 Documentación Completa

Lee `GUIA-SISTEMA-DUAL.md` para información detallada sobre:
- Arquitectura del sistema
- Configuración en Meta Dashboard
- Manejo de base de datos
- Monitoreo y estadísticas
- Troubleshooting

---

## ✨ Características

- ✅ Dos portfolios simultáneos
- ✅ Endpoints separados
- ✅ Identificación visual
- ✅ Base de datos compartida con identificadores
- ✅ Sistema de backup automático
- ✅ Logs diferenciados
- ✅ Configuración independiente
- ✅ Sin interferencia entre configuraciones

---

**Última actualización**: 14 de enero de 2026  
**Versión del sistema**: 1.0
