# 🔄 SISTEMA DUAL DE CONFIGURACIÓN

**Fecha**: 14 de enero de 2026  
**Versión**: 1.0  

---

## 🎯 ¿QUÉ ES EL SISTEMA DUAL?

El sistema dual permite usar **dos portfolios de Meta simultáneamente**:

| Configuración | Portfolio ID | Estado | Uso |
|--------------|--------------|--------|-----|
| **Principal** | `880566844730976` | ✅ Activa | Producción (clientes nuevos) |
| **Legacy** | `1473689432774278` | 🔄 Backup | Pruebas y backup |

---

## 🚪 DOS PUERTAS DE ENTRADA

### 1️⃣ Puerta Principal (Recomendada)
```
URL: https://kdsapp.site/onboarding.html
Portfolio: 880566844730976 (KDS Platform)
Estado: Verificado ✅
Activación: Instantánea ⚡
```

**Características:**
- ✅ Portfolio verificado por Meta
- ✅ Activación instantánea de números
- ✅ Sin período de espera
- ✅ Producción estable

### 2️⃣ Puerta Legacy (Backup)
```
URL: https://kdsapp.site/onboarding-2.html
Portfolio: 1473689432774278 (KDS Legacy)
Estado: Backup 🔄
Activación: Puede requerir verificación
```

**Características:**
- 🔄 Portfolio anterior (backup)
- ⚠️ Puede requerir verificación de Meta
- 🧪 Ideal para pruebas
- 💾 Sistema de respaldo

---

## 📂 ESTRUCTURA DEL SISTEMA

### Archivos Frontend

```
kds-webapp/
├── onboarding.html              # Puerta principal
├── onboarding-2.html            # Puerta legacy
├── facebook-config.js           # Config principal
├── facebook-config-legacy.js    # Config legacy
└── dual-config.js               # Sistema dual (compartido)
```

### Archivos Backend

```
server/
├── index.js                     # Endpoints para ambas configs
└── dual-config.js               # Configuración dual (Node.js)
```

---

## 🔧 CONFIGURACIÓN

### Variables de Entorno

Copia `.env.dual.example` a `.env`:

```bash
# Principal
WHATSAPP_APP_ID=849706941272247
WHATSAPP_APP_SECRET=tu_secret_principal

# Legacy
WHATSAPP_APP_ID_LEGACY=1860852208127086
WHATSAPP_APP_SECRET_LEGACY=tu_secret_legacy
```

### Endpoints Disponibles

#### Configuración Principal
```
GET  /api/whatsapp/callback          # OAuth callback
POST /webhook/whatsapp               # Mensajes entrantes
GET  /webhook/whatsapp               # Verificación
```

#### Configuración Legacy
```
GET  /api/whatsapp/callback-legacy   # OAuth callback
POST /webhook/whatsapp-legacy        # Mensajes entrantes
GET  /webhook/whatsapp-legacy        # Verificación
```

---

## 🎨 INTERFAZ DE USUARIO

### Onboarding Principal
- Badge: Ninguno (es la principal)
- Color: Azul/morado (gradiente normal)
- Mensaje: "Conecta tu WhatsApp Business"

### Onboarding Legacy
- Badge: 🔄 "Configuración LEGACY (Backup)"
- Color: Naranja (destaca que es backup)
- Mensaje: "Portfolio ID: 1473689432774278"

---

## 🔀 CONFIGURACIÓN EN META DASHBOARD

### App Principal (849706941272247)

**Embedded Signup:**
1. Configuration ID: `849873494548110`
2. Redirect URLs:
   ```
   https://kds-webapp-production.up.railway.app/api/whatsapp/callback
   https://kdsapp.site/onboarding-success.html
   ```
3. Pre-fill Portfolio: `880566844730976`

**Webhook:**
- URL: `https://kds-webapp-production.up.railway.app/webhook/whatsapp`
- Verify Token: `kds_webhook_token_2026`

### App Legacy (1860852208127086)

**Embedded Signup:**
1. Configuration ID: `1609237700430950`
2. Redirect URLs:
   ```
   https://kds-webapp-production.up.railway.app/api/whatsapp/callback-legacy
   https://kdsapp.site/onboarding-success.html?legacy=true
   ```
3. Pre-fill Portfolio: `1473689432774278`

**Webhook:**
- URL: `https://kds-webapp-production.up.railway.app/webhook/whatsapp-legacy`
- Verify Token: `kds_webhook_token_2026`

---

## 💾 BASE DE DATOS

Los tenants creados desde cada configuración se identifican con:

```javascript
{
  tenantId: "abc123",
  configType: "primary" | "legacy",  // Tipo de configuración
  portfolioId: "880566844730976",    // Portfolio usado
  whatsappBusinessAccountId: "...",
  whatsappPhoneNumberId: "...",
  // ...resto de datos
}
```

---

## 🧪 CASOS DE USO

### Usar Principal (Recomendado)
```
✅ Clientes nuevos en producción
✅ Necesitas activación instantánea
✅ Portfolio verificado
✅ Máxima estabilidad
```

**URL:** `https://kdsapp.site/onboarding.html`

### Usar Legacy (Backup)
```
🔄 Probar con el portfolio anterior
🔄 Mantener configuración antigua activa
🔄 Sistema de respaldo
🧪 Pruebas internas
```

**URL:** `https://kdsapp.site/onboarding-2.html`

---

## 🔍 DEBUGGING

### Ver Configuración Activa

```javascript
// En el navegador (cualquier página)
console.log(window.dualConfig);

// Ver configuración específica
console.log(window.getConfig('primary'));
console.log(window.getConfig('legacy'));

// Ver todas las activas
console.log(window.getActiveConfigs());
```

### Logs del Servidor

```bash
# Callback principal
📩 Callback recibido
   Portfolio: KDS
   Portfolio ID: 880566844730976

# Callback legacy
🔄 CALLBACK LEGACY recibido
   Portfolio: KDS Legacy
   Portfolio ID: 1473689432774278
```

---

## 📊 MONITOREO

### Verificar Estado

```javascript
// Verificar si una config está activa
if (dualConfig.isConfigActive('primary')) {
  console.log('✅ Config principal activa');
}

if (dualConfig.isConfigActive('legacy')) {
  console.log('🔄 Config legacy activa');
}
```

### Estadísticas por Configuración

Puedes filtrar en Firebase por `configType`:

```javascript
// Obtener tenants por tipo
const primaryTenants = await db.ref('tenants')
  .orderByChild('configType')
  .equalTo('primary')
  .once('value');

const legacyTenants = await db.ref('tenants')
  .orderByChild('configType')
  .equalTo('legacy')
  .once('value');
```

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### 1. Ambas Configuraciones Son Independientes
- Cada una usa su propio App ID
- Cada una tiene su propio Portfolio
- No se mezclan los datos

### 2. La Principal es la Recomendada
- Portfolio verificado
- Activación instantánea
- Mayor estabilidad

### 3. Legacy es Solo Backup
- Úsala solo si necesitas el portfolio antiguo
- Puede requerir verificación de Meta
- Ideal para pruebas

### 4. Comparten la Misma Base de Datos
- Ambas guardan en Firebase
- Se diferencian por `configType`
- Puedes migrar entre ellas si es necesario

---

## 🚀 DESPLIEGUE

### Railway

Las variables de entorno necesarias están en `.env.dual.example`.

Asegúrate de configurar TODAS las variables:

```bash
# Principal
WHATSAPP_APP_ID=...
WHATSAPP_APP_SECRET=...

# Legacy
WHATSAPP_APP_ID_LEGACY=...
WHATSAPP_APP_SECRET_LEGACY=...
```

### Firebase Hosting

Ambos archivos HTML deben estar desplegados:
- `onboarding.html` → Principal
- `onboarding-2.html` → Legacy

```bash
firebase deploy --only hosting
```

---

## 📝 CHANGELOG

### v1.0 - 14 de enero de 2026
- ✨ Implementación inicial del sistema dual
- ✅ Soporte para dos portfolios simultáneos
- ✅ Endpoints separados para cada configuración
- ✅ Identificación visual en el frontend
- ✅ Sistema de backup completamente funcional

---

## 🤝 PRÓXIMOS PASOS

1. **Prueba la configuración principal:**
   ```
   https://kdsapp.site/onboarding.html
   ```

2. **Prueba la configuración legacy:**
   ```
   https://kdsapp.site/onboarding-2.html
   ```

3. **Verifica los logs en Railway:**
   ```bash
   railway logs
   ```

4. **Confirma que ambos portfolios funcionan correctamente**

---

## 📞 SOPORTE

Si tienes problemas con alguna configuración:

1. Verifica los logs del servidor
2. Comprueba las variables de entorno
3. Revisa la configuración en Meta Dashboard
4. Verifica que las URLs de callback estén whitelisteadas

---

**¡Sistema dual listo para usar! 🎉**
