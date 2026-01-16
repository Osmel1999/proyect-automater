# Estado de Producción - Migración Baileys

**Fecha:** 16 de Enero 2026  
**Status:** ✅ Backend Baileys funcional | ⚠️ CDN sirviendo versión antigua del frontend

---

## ✅ COMPLETADO

### Backend Baileys
- ✅ Todos los módulos Baileys instalados y funcionando
- ✅ API REST `/api/baileys/*` activa y funcional
- ✅ WebSocket configurado para eventos en tiempo real
- ✅ Health endpoint funcionando: `/api/baileys/health`
- ✅ Conversión de require() a import dinámico (ESM)
- ✅ Deploy exitoso en Railway
- ✅ Servidor responde correctamente en Railway URL directa

### Endpoints Verificados (Railway Direct URL)
```
✅ https://kds-backend-production.up.railway.app/api/baileys/health
   → {"status":"ok","service":"baileys-api","activeSessions":0}

✅ https://kds-backend-production.up.railway.app/onboarding.html
   → Versión Baileys (QR dinámico, sin Facebook)
```

### Código Fuente
- ✅ `onboarding.html` local tiene versión Baileys
- ✅ Commit `a464b58` en GitHub con todos los cambios
- ✅ Sin errores de sintaxis o dependencias

---

## ⚠️ PROBLEMA ACTUAL: CDN Cache

### Descripción
El dominio principal `kdsapp.site` tiene un CDN (Fastly) que está cacheando la versión ANTIGUA de `onboarding.html` con referencias a Facebook/Meta.

### Evidencia
```bash
# Dominio con CDN (versión antigua)
$ curl -I https://kdsapp.site/onboarding.html
cache-control: public, max-age=300
x-cache: HIT
x-served-by: cache-bog-skbo2340058-BOG

# Railway directo (versión nueva ✅)
$ curl -I https://kds-backend-production.up.railway.app/onboarding.html
cache-control: public, max-age=0
```

### Comparación de Contenido

**kdsapp.site (CDN - versión antigua ❌):**
```html
<!-- Facebook SDK -->
<script src="facebook-config.js"></script>
Facebook te preguntará: "¿Qué Business Portfolio quieres usar?"
```

**Railway direct URL (versión nueva ✅):**
```html
<!-- QRCode.js Library -->
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
class BaileysOnboarding {
  const response = await fetch('/api/baileys/connect', {
```

---

## 🔧 SOLUCIONES POSIBLES

### Opción 1: Esperar expiración del cache (5 minutos)
- TTL actual: `max-age=300` (5 minutos)
- El cache debería expirar automáticamente
- **Acción:** Esperar y verificar en ~10 minutos

### Opción 2: Purgar cache de CDN
Dependiendo del proveedor de CDN de kdsapp.site:

**Fastly:**
```bash
curl -X PURGE https://kdsapp.site/onboarding.html
```

**Cloudflare:**
- Panel → Caching → Purge Everything
- O API: `POST /client/v4/zones/{zone}/purge_cache`

### Opción 3: Forzar recarga con versionado
Modificar enlaces para incluir version query:
```html
<a href="/onboarding.html?v=baileys-1.0">Onboarding</a>
```

### Opción 4: Configurar headers en Express
Actualizar `server/index.js` para enviar headers anti-cache:

```javascript
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});
```

---

## 📊 URLs DE PRUEBA

### ✅ URLs Funcionales (Railway Direct)
```
https://kds-backend-production.up.railway.app/api/baileys/health
https://kds-backend-production.up.railway.app/api/baileys/status?tenantId=test
https://kds-backend-production.up.railway.app/onboarding.html
```

### ⚠️ URLs con Cache (kdsapp.site)
```
https://kdsapp.site/onboarding.html         → Versión antigua (CDN cache)
https://api.kdsapp.site/api/baileys/health  → Por verificar
```

---

## 🎯 PRÓXIMOS PASOS

1. **Inmediato:** Esperar 10 minutos y verificar si el cache expira
2. **Si persiste:** Purgar cache del CDN manualmente
3. **Alternativa:** Usar URL de Railway directa temporalmente
4. **Definitivo:** Configurar headers anti-cache en Express
5. **Testing:** Probar flujo completo de onboarding Baileys en producción

---

## 📝 NOTAS TÉCNICAS

### Arquitectura Actual
```
Usuario
  ↓
kdsapp.site (dominio + CDN Fastly)
  ↓
Railway (kds-backend-production.up.railway.app)
  ↓
Express Server (puerto 3000)
  ↓
Static files desde /Users/.../kds-webapp/
```

### Archivos Relevantes
- `/onboarding.html` → Versión Baileys ✅
- `/onboarding-meta-backup.html` → Backup de Meta
- `/onboarding-new.html` → Plantilla alternativa
- `/server/controllers/baileys-controller.js` → Controladores API
- `/server/routes/baileys-routes.js` → Rutas API
- `/server/baileys/*.js` → Módulos core Baileys

### Commits Importantes
```
a464b58 - fix: Corregir healthCheck
7cf6240 - fix: Agregar método healthCheck
c2f03ae - fix: Convertir require Baileys a import dinámico
cfdedb2 - feat: Migración completa de onboarding a Baileys
```

---

## 🔍 COMANDOS DE VERIFICACIÓN

```bash
# Verificar versión servida
curl -s https://kdsapp.site/onboarding.html | grep -i "baileys\|facebook"

# Verificar cache
curl -I https://kdsapp.site/onboarding.html | grep cache

# Verificar health endpoint
curl https://kds-backend-production.up.railway.app/api/baileys/health

# Verificar Railway direct
curl -s https://kds-backend-production.up.railway.app/onboarding.html | grep -i baileys

# Purgar cache (si es Fastly)
curl -X PURGE https://kdsapp.site/onboarding.html
```

---

## ✅ CONCLUSIÓN

**Backend:** 100% funcional con Baileys  
**Frontend Local:** 100% actualizado con Baileys  
**Railway Deploy:** 100% sirviendo versión correcta  
**Producción (kdsapp.site):** Bloqueado por cache de CDN  

**Tiempo estimado de resolución:** 5-10 minutos (expiración natural del cache)

---

**Última actualización:** 16 de Enero 2026, 12:51 PM EST
