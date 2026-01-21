# 📋 Flujo de Deploy - Frontend/Backend Separados

**Última actualización:** 21 de enero de 2026

---

## 🏗️ ARQUITECTURA ACTUAL

```
┌──────────────────────────────────────────────────────┐
│                     USUARIO                          │
└──────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┴────────────────┐
        ↓                                ↓
┌─────────────────┐           ┌─────────────────┐
│  kdsapp.site    │           │ api.kdsapp.site │
│                 │           │                 │
│ Firebase Hosting│───API────→│    Railway      │
│                 │           │                 │
│ ✅ Frontend     │           │ ✅ Backend      │
│ - HTML          │           │ - Express API   │
│ - CSS           │           │ - Baileys       │
│ - JavaScript    │           │ - Socket.IO     │
│ - Imágenes      │           │ - NO HTML       │
└─────────────────┘           └─────────────────┘
```

---

## 🚀 FLUJO DE TRABAJO

### 📱 **Cambios en FRONTEND (HTML/CSS/JS/Imágenes)**

```bash
# 1. Hacer cambios en archivos frontend
# 2. Deploy a Firebase
firebase deploy --only hosting

# 3. Verificar
curl -I https://kdsapp.site/tu-archivo.html
```

**Archivos frontend:**
- `*.html` (auth.html, select.html, onboarding.html, etc.)
- `*.css` (styles.css)
- `assets/*` (imágenes, fuentes)
- JavaScript del lado del cliente

**NO necesitas tocar Railway para cambios frontend** ✅

---

### ⚙️ **Cambios en BACKEND (Node.js/Express/Baileys)**

```bash
# 1. Hacer cambios en archivos backend
# 2. Commit y push
git add .
git commit -m "Tu mensaje"
git push origin main

# Railway auto-deploya automáticamente ✅

# 3. Verificar
railway logs
curl https://api.kdsapp.site/health
```

**Archivos backend:**
- `server/**/*.js` (toda la lógica del servidor)
- `package.json` (dependencias)
- `Dockerfile`
- Configuraciones de servidor

**NO necesitas tocar Firebase para cambios backend** ✅

---

### 🔄 **Cambios en AMBOS (Frontend + Backend)**

```bash
# 1. Hacer cambios en ambos
# 2. Deploy backend primero
git add .
git commit -m "Tu mensaje"
git push origin main

# 3. Deploy frontend después
firebase deploy --only hosting

# 4. Verificar ambos
curl https://api.kdsapp.site/health
curl -I https://kdsapp.site/
```

---

## ✅ VERIFICACIÓN POST-DEPLOY

### Frontend (Firebase):
```bash
# Debe retornar 200
curl -I https://kdsapp.site/auth.html
curl -I https://kdsapp.site/select.html

# Debe retornar 404 (archivos legacy eliminados)
curl -I https://kdsapp.site/login.html
```

### Backend (Railway):
```bash
# Health check
curl https://api.kdsapp.site/health

# Debe retornar 404 (NO sirve HTML)
curl -I https://api.kdsapp.site/auth.html

# Ver logs
railway logs
```

---

## 🚨 ERRORES COMUNES

### ❌ "Hice cambios pero no los veo"

**Causa:** Desplegaste al servicio incorrecto

**Solución:**
- Cambios en HTML/CSS → `firebase deploy --only hosting`
- Cambios en server/ → `git push origin main`

### ❌ "Railway sirve archivos HTML viejos"

**Causa:** Antes Railway servía frontend (ya NO lo hace)

**Solución:**
- ✅ Ya está arreglado (express.static comentado)
- ✅ Dockerfile remueve HTML en build
- Railway ahora es **SOLO backend**

### ❌ "Firebase tiene versión vieja"

**Causa:** No desplegaste después de cambiar archivos

**Solución:**
```bash
firebase deploy --only hosting
```

---

## 📊 VENTAJAS DE ESTA ARQUITECTURA

### ✅ Separación de responsabilidades
- Frontend y backend son independientes
- Cambios en uno no afectan al otro

### ✅ Una sola fuente de verdad
- Frontend → Solo Firebase
- Backend → Solo Railway

### ✅ Deploys más rápidos
- Frontend: Firebase CDN global
- Backend: Railway optimizado sin assets

### ✅ Escalabilidad
- Puedes escalar frontend y backend independientemente

### ✅ Menos confusión
- Sabes exactamente dónde deployar cada cambio

---

## 🎯 REGLA DE ORO

```
🟦 Archivo .html, .css, assets/ → Firebase
🟩 Archivo en server/ → Railway
```

**¡Simple!** 🎉
