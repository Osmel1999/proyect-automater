# 🧪 GUÍA DE PRUEBAS - Validación de Portfolio Post-Selección

**Fecha**: 15 de enero de 2026  
**Sistema**: Onboarding Legacy con Validación de Portfolio  
**Archivos involucrados**:
- Frontend: `onboarding-legacy-validation.html`
- Backend: `server/index.js` (endpoint `/api/auth/legacy/callback`)
- Configuración: `dual-config.js`, `facebook-config-legacy.js`

---

## 📋 Pre-requisitos

### Variables de Entorno (Railway)
```bash
# Verificar que estén configuradas
FACEBOOK_LEGACY_APP_ID=1627773661131047
FACEBOOK_LEGACY_APP_SECRET=...
FACEBOOK_LEGACY_PORTFOLIO_ID=1473689432774278
WHATSAPP_APP_SECRET_LEGACY=...
```

### Meta Dashboard
- ✅ Callback URL configurada: `https://kds-backend-production.up.railway.app/api/auth/legacy/callback`
- ✅ Embedded Signup Config activo
- ✅ Portfolio "Kingdom design" verificado

---

## 🧪 Casos de Prueba

### Caso 1: Usuario Selecciona Portfolio Correcto ✅

**Pasos:**
1. Abrir `https://kdsapp.site/onboarding-legacy-validation.html`
2. Click en "Conectar WhatsApp Business"
3. En ventana de Facebook, **elegir portfolio "Kingdom design"**
4. Completar flujo de Embedded Signup

**Resultado Esperado:**
```
✅ Código de autorización recibido
✅ Access token obtenido
✅ Portfolio correcto seleccionado!
   Seleccionado: 1473689432774278
   Esperado: 1473689432774278 (Kingdom design)
✅ Número registrado exitosamente!
🎉 Onboarding LEGACY completado exitosamente!
```

**Frontend:**
- Mensaje: "✅ Onboarding completado exitosamente!"
- Redirección a: `/onboarding-success.html?tenantId=XXX&config=legacy`

---

### Caso 2: Usuario Selecciona Portfolio Incorrecto ⚠️

**Pasos:**
1. Abrir `https://kdsapp.site/onboarding-legacy-validation.html`
2. Click en "Conectar WhatsApp Business"
3. En ventana de Facebook, **elegir portfolio diferente** (e.g., "Tienda Medellín")
4. Completar flujo de Embedded Signup

**Resultado Esperado - Backend:**
```
✅ Access token obtenido
❌ Portfolio incorrecto seleccionado
   Seleccionado: 1710024182925654
   Esperado: 1473689432774278 (Kingdom design)

Response: {
  "success": false,
  "wrongPortfolio": true,
  "selectedPortfolio": "1710024182925654",
  "expectedPortfolio": "1473689432774278",
  "expectedPortfolioName": "Kingdom design",
  "message": "Por favor, selecciona el portfolio..."
}
```

**Frontend:**
- Modal visible con advertencia
- Información de ambos portfolios
- Botón "Reintentar" habilitado
- NO se crea tenant en Firebase
- NO se redirige

---

### Caso 3: Error de Facebook SDK ❌

**Pasos:**
1. Abrir `https://kdsapp.site/onboarding-legacy-validation.html`
2. Deshabilitar JavaScript de Facebook en DevTools
3. Click en "Conectar WhatsApp Business"

**Resultado Esperado:**
```
❌ Error: Facebook SDK no está cargado
```

---

### Caso 4: Usuario Cancela el Login 🚫

**Pasos:**
1. Abrir `https://kdsapp.site/onboarding-legacy-validation.html`
2. Click en "Conectar WhatsApp Business"
3. En ventana de Facebook, click en "Cancelar"

**Resultado Esperado:**
```javascript
{
  "authResponse": null,
  "status": "unknown"
}
```

**Frontend:**
- Mensaje: "❌ Error: No se recibió autorización de Facebook"
- Botón vuelve a estado normal

---

## 🔍 Cómo Verificar Cada Paso

### 1. Verificar Request POST al Backend

**DevTools → Network → Filtrar por `/api/auth/legacy/callback`**

**Request:**
```json
POST /api/auth/legacy/callback
Content-Type: application/json

{
  "code": "AQABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz..."
}
```

**Response (Portfolio Correcto):**
```json
{
  "success": true,
  "tenantId": "tenant_abc123",
  "businessId": "1473689432774278",
  "phoneNumber": "+57 310 123 4567",
  "message": "Onboarding completado exitosamente"
}
```

**Response (Portfolio Incorrecto):**
```json
{
  "success": false,
  "wrongPortfolio": true,
  "selectedPortfolio": "1710024182925654",
  "expectedPortfolio": "1473689432774278",
  "expectedPortfolioName": "Kingdom design",
  "message": "Por favor, selecciona el portfolio \"Kingdom design\" en la ventana de Facebook"
}
```

---

### 2. Verificar Logs del Backend

**Railway → Logs**

```bash
# Ver logs en tiempo real
railway logs --follow

# Buscar logs de validación
railway logs | grep "Portfolio detectado"
```

**Logs esperados (Portfolio Correcto):**
```
🕐 [2026-01-15T...] POST LEGACY CALLBACK - Portfolio Validation
🔄 Validando portfolio seleccionado...
✅ Access token obtenido
🎯 Portfolio detectado:
   Seleccionado: 1473689432774278
   Esperado: 1473689432774278 (Kingdom design)
✅ Portfolio correcto seleccionado!
```

**Logs esperados (Portfolio Incorrecto):**
```
🕐 [2026-01-15T...] POST LEGACY CALLBACK - Portfolio Validation
🔄 Validando portfolio seleccionado...
✅ Access token obtenido
🎯 Portfolio detectado:
   Seleccionado: 1710024182925654
   Esperado: 1473689432774278 (Kingdom design)
❌ Portfolio incorrecto seleccionado
```

---

### 3. Verificar Creación de Tenant

**Solo debe crearse si el portfolio es correcto**

**Firebase Console → Firestore → Collection `tenants`**

**Documento esperado:**
```json
{
  "tenantId": "tenant_abc123",
  "whatsappBusinessAccountId": "123456789",
  "whatsappPhoneNumberId": "987654321",
  "whatsappPhoneNumber": "+57 310 123 4567",
  "configType": "legacy",
  "portfolioId": "1473689432774278",
  "onboardingMode": "legacy",
  "createdAt": "2026-01-15T..."
}
```

---

## 📊 Matriz de Resultados

| Caso | Portfolio | authResponse | Backend | Tenant | Redirección |
|------|-----------|--------------|---------|--------|-------------|
| **1** | Kingdom design | ✅ code | ✅ success | ✅ creado | ✅ success |
| **2** | Otro | ✅ code | ⚠️ wrongPortfolio | ❌ no | ❌ modal |
| **3** | - | ❌ null | - | ❌ no | ❌ error |
| **4** | Cancelado | ❌ null | - | ❌ no | ❌ mensaje |

---

## 🔧 Comandos Útiles para Debugging

### Ver estado del backend
```bash
railway status
```

### Ver logs en tiempo real
```bash
railway logs --follow
```

### Probar endpoint directamente
```bash
# Obtener código de Facebook primero, luego:
curl -X POST https://kds-backend-production.up.railway.app/api/auth/legacy/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"CODIGO_DE_FACEBOOK"}'
```

### Verificar variables de entorno
```bash
railway variables
```

---

## 🐛 Troubleshooting

### Problema: Modal nunca aparece
**Solución**: Verificar en DevTools → Console si hay errores de CORS o fetch

### Problema: Backend devuelve 500
**Solución**: Revisar logs de Railway, probablemente faltan variables de entorno

### Problema: No se detecta portfolio
**Solución**: Verificar estructura de `debugData.granular_scopes` en logs del backend

### Problema: Facebook devuelve authResponse: null
**Solución**: Revisar que NO haya `business.id` en `extras.setup`

---

## ✅ Checklist de Deployment

Antes de hacer las pruebas:

- [ ] Backend deployed a Railway
- [ ] Frontend deployed a Firebase
- [ ] Variables de entorno configuradas
- [ ] Meta Dashboard con callback URL correcta
- [ ] Embedded Signup Config activo
- [ ] Portfolio "Kingdom design" verificado
- [ ] Browser sin caché (Ctrl+Shift+R)

---

## 📝 Notas Adicionales

1. **Facebook cachea mucho**: Si cambias configuración, espera 5 minutos o usa modo incógnito
2. **Logs son tu amigo**: Siempre revisa Railway logs en paralelo
3. **DevTools Network**: Mantén abierto para ver requests/responses
4. **Modal CSS**: Si no se ve, verifica z-index y display
5. **CORS**: Backend debe tener headers correctos para requests POST

---

## 🎯 Criterio de Éxito

La solución es exitosa si:

✅ Usuario puede completar onboarding eligiendo portfolio correcto  
✅ Sistema detecta y rechaza portfolio incorrecto con mensaje claro  
✅ Modal de advertencia se muestra correctamente  
✅ No se crean tenants para portfolios incorrectos  
✅ Logs del backend son claros y útiles para debugging

---

**Próximo paso**: Ejecutar todos los casos de prueba y documentar resultados
