# ✅ Checklist de Verificación Post-Deploy

## Fecha
15 de enero de 2025 - Mediodía

## Deploys Realizados

### ✅ Railway (Backend)
- **Commit:** `959c71b - force: Trigger deploy - actualizar timestamp en auth.html`
- **Commits anteriores:**
  - `2f24210 - feat: Implementar menú dinámico del bot desde Firebase + docs`
  - `8d608fb - Fix: Corregir nombres de funciones en dashboard`
- **Status:** ✅ Push exitoso
- **Auto-deploy:** Railway detectará el push automáticamente

### ✅ Firebase (Frontend)
- **Deploy:** `firebase deploy --only hosting`
- **Status:** ✅ Deploy completado
- **URL:** https://kds-app-7f1d3.web.app
- **Archivos subidos:** 2780 files

---

## 📋 Pasos de Verificación

### 1. Verificar Caché del Navegador
```bash
# Opción A: Limpiar caché completo
Cmd + Shift + R (Mac) o Ctrl + Shift + R (Windows/Linux)

# Opción B: Modo incógnito
Cmd + Shift + N (Chrome) o Cmd + Shift + P (Firefox)
```

**Acción:** 
- [ ] Abrir la app en modo incógnito o después de limpiar caché
- [ ] Verificar que no hay Service Workers activos (DevTools > Application > Service Workers)

### 2. Limpiar Storage del Navegador
```javascript
// En DevTools Console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

**Acción:**
- [ ] Ejecutar comandos en console
- [ ] Hacer login de nuevo

### 3. Verificar Redirección de Login
**URL:** https://kds-app-7f1d3.web.app/auth.html

**Flujo esperado:**
1. Usuario ingresa email/password
2. Click en "Iniciar Sesión"
3. Mensaje en console: `🔄 Login exitoso, redirigiendo a select...`
4. Redirección automática a `/select.html`
5. Select.html muestra 2 opciones: KDS o Dashboard

**Acción:**
- [ ] Hacer login con una cuenta válida
- [ ] Verificar que redirige a select.html (NO a onboarding.html)
- [ ] Verificar console logs (F12 > Console)

### 4. Verificar Select.html
**URL:** https://kds-app-7f1d3.web.app/select.html

**Comportamiento esperado:**
- ✅ NO hay redirección automática a onboarding
- ✅ Muestra badge de progreso si onboarding < 100%
- ✅ Usuario puede elegir manualmente KDS o Dashboard
- ✅ Al elegir Dashboard, pide PIN antes de acceder

**Acción:**
- [ ] Verificar que select.html NO redirige automáticamente
- [ ] Verificar badge de onboarding (si aplica)
- [ ] Intentar acceder al Dashboard (debe pedir PIN)

### 5. Verificar Menú del Bot de WhatsApp
**Backend:** Railway debe estar corriendo con `menu-service.js`

**Flujo esperado:**
1. Cliente envía mensaje al bot de WhatsApp
2. Bot consulta menú del tenant desde Firebase (`/tenants/{tenantId}/menu`)
3. Bot responde con el menú personalizado del tenant
4. Si no hay menú, usa fallback genérico

**Acción:**
- [ ] Enviar mensaje "Hola" al bot de WhatsApp conectado
- [ ] Verificar que el bot responde con el menú correcto del tenant
- [ ] Verificar logs en Railway (si hay acceso)

### 6. Verificar Logs de Railway
```bash
# Si tienes Railway CLI instalado
railway logs

# O desde Railway Dashboard:
# https://railway.app → Proyecto → Service → Logs
```

**Buscar en logs:**
- ✅ `✅ [Menu Service] Menú cargado exitosamente para tenant: {tenantId}`
- ✅ `🤖 [Bot] Menú personalizado enviado a {numero}`
- ⚠️ Si no hay errores de `menu-service.js`

**Acción:**
- [ ] Revisar logs de Railway
- [ ] Confirmar que no hay errores relacionados con menú
- [ ] Verificar que las funciones async del bot funcionan

---

## 🔍 Diagnóstico si el Problema Persiste

### Problema: Aún redirige a onboarding.html

**Posibles causas:**

#### 1. Caché del Navegador Persistente
```bash
# Hard refresh no funcionó
# Solución: Borrar datos del sitio
Chrome: DevTools > Application > Clear Storage > Clear site data
Firefox: DevTools > Storage > Clear All
Safari: Preferencias > Privacidad > Manage Website Data > Remove
```

#### 2. Service Worker Activo
```bash
# Verificar Service Workers
Chrome: chrome://serviceworker-internals/
Firefox: about:debugging#/runtime/this-firefox
Edge: edge://serviceworker-internals/

# Desregistrar todos los Service Workers del dominio
```

#### 3. Railway NO Desplegó la Última Versión
```bash
# Verificar el último commit desplegado en Railway
# Railway Dashboard → Service → Deployments

# Si NO coincide con 959c71b, hacer force redeploy:
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
git commit --allow-empty -m "force: redeploy"
git push origin main
```

#### 4. Firebase CDN Cacheo la Versión Anterior
```bash
# El CDN de Firebase puede tardar hasta 1 hora en propagar
# Solución temporal: Agregar query string a la URL
https://kds-app-7f1d3.web.app/auth.html?v=2

# O forzar nuevo deploy con cambio mínimo
echo "<!-- $(date) -->" >> auth.html
firebase deploy --only hosting
```

---

## 📊 Resumen de Cambios Implementados

### Backend (Railway)
1. ✅ Menú del bot ahora es dinámico y se lee de Firebase (`menu-service.js`)
2. ✅ Bot-logic.js refactorizado para usar menú dinámico por tenant
3. ✅ Funciones async para cargar menú antes de responder
4. ✅ Caché de menú por tenant para optimizar performance
5. ✅ Fallback a menú genérico si no hay menú en Firebase

### Frontend (Firebase)
1. ✅ auth.html redirige a `/select.html` (NO a onboarding.html)
2. ✅ dashboard.html corregido (openMenuModal → openMenuConfig)
3. ✅ Headers anti-caché configurados en server/index.js
4. ✅ Timestamp actualizado en auth.html para forzar cambio

### Infraestructura
1. ✅ Railway solo sirve API (backend)
2. ✅ Firebase solo sirve archivos estáticos (frontend)
3. ✅ Separación clara entre frontend/backend
4. ✅ Archivos legacy ignorados (.dockerignore, firebase.json)

---

## 🎯 Próximos Pasos

### Inmediatos (Hoy)
- [ ] Verificar que el login redirige correctamente a select.html
- [ ] Probar el bot de WhatsApp y confirmar menú dinámico
- [ ] Verificar logs de Railway para errores del menu-service

### Corto Plazo (Esta Semana)
- [ ] Agregar más logs en menu-service.js para debugging
- [ ] Crear endpoint `/api/menu/:tenantId` para validar menú desde el dashboard
- [ ] Agregar tests unitarios para menu-service.js
- [ ] Documentar cómo agregar/editar menú de un tenant en Firebase

### Largo Plazo
- [ ] Crear UI en dashboard para editar menú del bot
- [ ] Agregar validación de estructura de menú
- [ ] Implementar caché distribuido (Redis) para menús
- [ ] Agregar analytics para tracking de uso del menú

---

## 🚨 Comandos de Emergencia

### Si nada funciona:
```bash
# 1. Forzar rebuild completo en Railway
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
git commit --allow-empty -m "force: full rebuild"
git push origin main

# 2. Forzar redeploy en Firebase
firebase deploy --only hosting --force

# 3. Limpiar TODO el caché local
rm -rf .firebase/
rm -rf node_modules/
npm install
firebase deploy --only hosting

# 4. Verificar contenido real en producción
curl -s https://kds-app-7f1d3.web.app/auth.html | grep "window.location.href"
```

---

**Última actualización:** 15 de enero de 2025 - Mediodía
**Autor:** GitHub Copilot
**Status:** ✅ Deploys completados, listo para verificación
