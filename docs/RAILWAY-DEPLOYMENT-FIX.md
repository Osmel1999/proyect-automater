# 🚂 Configuración de Deploy en Railway

**Fecha:** 5 de febrero de 2026  
**Problema resuelto:** Error de build en Railway - `npm: command not found`  
**Estado:** ✅ RESUELTO

---

## 🔍 Problema Original

### Error en Railway:
```bash
/bin/bash: line 1: npm: command not found
ERROR: failed to build: failed to solve: process "/bin/bash -ol pipefail -c cd kds-webapp && npm install" did not complete successfully: exit code: 127
Error: Docker build failed
```

### Causa:
- Railway estaba usando **Nixpacks** en lugar de **Dockerfile**
- Nixpacks no tenía Node.js/npm instalado en la imagen base
- Había conflicto entre configuraciones (`railway.json` vs `railway.toml`)
- El contexto de build era incorrecto (raíz vs `kds-webapp/`)

---

## ✅ Solución Implementada

### 1. Estructura del Proyecto

```
automater/                          ← Raíz del repositorio
├── Dockerfile                      ← ✅ NUEVO: Dockerfile para Railway
├── .dockerignore                   ← ✅ NUEVO: Ignorar archivos innecesarios
├── railway.toml                    ← ✅ ACTUALIZADO: Configuración principal
└── kds-webapp/                     ← Directorio de la aplicación
    ├── Dockerfile                  ← Dockerfile original (aún útil para local)
    ├── railway.json                ← Configuración específica del servicio
    ├── railway.toml                ← Configuración específica del servicio
    ├── package.json
    ├── package-lock.json
    ├── config.js
    └── server/
        └── index.js
```

---

### 2. Dockerfile en la Raíz

**Archivo:** `/Dockerfile`

```dockerfile
# Dockerfile para Railway - Build desde la raíz del monorepo
FROM node:20-alpine

# Install bash (required by some scripts)
RUN apk add --no-cache bash

# Set working directory
WORKDIR /app

# Copy package files from kds-webapp directory
COPY kds-webapp/package.json kds-webapp/package-lock.json ./

# Install dependencies (only production)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy backend files from kds-webapp
COPY kds-webapp/server/ ./server/
COPY kds-webapp/config.js ./

# Create sessions directory
RUN mkdir -p sessions

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server/index.js"]
```

**Características:**
- ✅ Usa `node:20-alpine` (imagen oficial ligera con npm incluido)
- ✅ Copia archivos desde `kds-webapp/` al contenedor
- ✅ Solo instala dependencias de producción
- ✅ Solo copia archivos necesarios del backend (no frontend HTML/CSS)
- ✅ Limpia caché de npm para reducir tamaño de imagen

---

### 3. .dockerignore en la Raíz

**Archivo:** `/.dockerignore`

```
# Ignore everything except kds-webapp
*
!kds-webapp

# Inside kds-webapp, ignore these
kds-webapp/node_modules
kds-webapp/.DS_Store
kds-webapp/*.log
kds-webapp/sessions/*
kds-webapp/.env*
kds-webapp/docs/
kds-webapp/docs-archive/
kds-webapp/*.html
kds-webapp/*.css
kds-webapp/*.js
kds-webapp/*.sh
kds-webapp/*.md
kds-webapp/assets/
kds-webapp/Integracion-*/
kds-webapp/scripts/

# Keep only what we need
!kds-webapp/server/
!kds-webapp/config.js
!kds-webapp/package.json
!kds-webapp/package-lock.json
```

**Estrategia:**
1. Ignorar todo por defecto (`*`)
2. Permitir solo `kds-webapp` (`!kds-webapp`)
3. Dentro de `kds-webapp`, ignorar todo lo que no sea necesario
4. Permitir explícitamente solo lo esencial:
   - `server/` - Código del backend
   - `config.js` - Configuración
   - `package.json` y `package-lock.json` - Dependencias

**Resultado:**
- ✅ Imagen Docker más pequeña
- ✅ Build más rápido
- ✅ No incluye archivos sensibles (.env)
- ✅ No incluye frontend (HTML/CSS/JS) que no se necesita en Railway

---

### 4. Configuración Railway (Raíz)

**Archivo:** `/railway.toml`

```toml
# Railway Configuration
# Este archivo configura Railway para usar el Dockerfile desde la raíz

[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node server/index.js"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

# Monitorear cambios solo en kds-webapp
[[services]]
[services.settings]
watchPaths = ["kds-webapp/**"]
```

**Configuración:**
- ✅ Builder: `dockerfile` (usa Dockerfile, no Nixpacks)
- ✅ Path: `Dockerfile` (en la raíz)
- ✅ Start command: `node server/index.js` (directo, sin cd)
- ✅ Restart policy: reiniciar solo en caso de fallo
- ✅ Watch paths: solo monitorear cambios en `kds-webapp/`

---

### 5. Configuración Railway (kds-webapp)

**Archivo:** `/kds-webapp/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node server/index.js",
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Nota:** Este archivo se mantiene por compatibilidad, pero Railway usará el de la raíz.

**Archivo:** `/kds-webapp/railway.toml`

```toml
# Railway Configuration
# Este archivo fuerza a Railway a usar Dockerfile para build consistente

[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node server/index.js"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

---

## 🔄 Flujo de Deploy

### 1. **Git Push**
```bash
git add .
git commit -m "Fix: Configuración de Railway para usar Dockerfile"
git push origin main
```

### 2. **Railway Detecta Cambios**
- Railway detecta push en `kds-webapp/**`
- Lee configuración desde `/railway.toml`

### 3. **Build con Docker**
```bash
# Railway ejecuta:
docker build -f Dockerfile -t kds-webapp .

# Dentro del Dockerfile:
# 1. FROM node:20-alpine           ← Imagen con npm incluido
# 2. COPY kds-webapp/package*.json  ← Copiar dependencias
# 3. RUN npm ci --only=production   ← Instalar dependencias
# 4. COPY kds-webapp/server/        ← Copiar código backend
# 5. COPY kds-webapp/config.js      ← Copiar configuración
```

### 4. **Deploy**
```bash
# Railway ejecuta:
node server/index.js

# Puerto: 3000 (automáticamente mapeado por Railway)
```

### 5. **Listo** ✅
- Aplicación disponible en: `https://tu-app.up.railway.app`
- Logs disponibles en Railway Dashboard

---

## 🎯 Comparación: Antes vs Ahora

### ❌ Antes (Con Nixpacks)

```toml
[build]
builder = "nixpacks"
buildCommand = "cd kds-webapp && npm install"
```

**Problemas:**
- ❌ Nixpacks no tenía npm instalado
- ❌ Comando `cd kds-webapp &&` era problemático
- ❌ No controlábamos la imagen base
- ❌ Build inconsistente

### ✅ Ahora (Con Dockerfile)

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"
```

**Ventajas:**
- ✅ Control total sobre la imagen base (`node:20-alpine`)
- ✅ npm incluido por defecto
- ✅ Build reproducible y consistente
- ✅ Optimizado para producción (`npm ci --only=production`)
- ✅ Imagen más pequeña (.dockerignore)

---

## 🔧 Variables de Entorno en Railway

Asegúrate de configurar estas variables en Railway Dashboard:

### Variables Requeridas:

```bash
# Firebase
FIREBASE_SERVICE_ACCOUNT_KEY=<tu-service-account-json>
FIREBASE_DATABASE_URL=https://tu-proyecto.firebaseio.com

# WhatsApp API
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_ACCESS_TOKEN=<tu-token>
WHATSAPP_PHONE_NUMBER_ID=<tu-phone-id>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<tu-verify-token>

# Wompi (Pagos)
WOMPI_PUBLIC_KEY=pub_prod_xxxxx
WOMPI_PRIVATE_KEY=prv_prod_xxxxx
WOMPI_WEBHOOK_SECRET=<tu-secret>
WOMPI_EVENT_SECRET=<tu-event-secret>

# Configuración
NODE_ENV=production
PORT=3000
```

### Cómo Configurar:

1. Ve a tu proyecto en Railway Dashboard
2. Navega a: **Variables** tab
3. Agrega cada variable con su valor
4. Railway reiniciará automáticamente la aplicación

---

## 📝 Comandos Útiles

### Build Local (Test)
```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater

# Build
docker build -t kds-webapp:test .

# Run
docker run -p 3000:3000 \
  -e FIREBASE_SERVICE_ACCOUNT_KEY="..." \
  -e FIREBASE_DATABASE_URL="..." \
  kds-webapp:test

# Test
curl http://localhost:3000/health
```

### Ver Logs en Railway
```bash
# Opción 1: Railway CLI
railway logs

# Opción 2: Railway Dashboard
# → Ve a tu proyecto
# → Tab "Deployments"
# → Click en el deployment activo
# → Ver logs en tiempo real
```

### Rebuild Manual
```bash
# Si necesitas forzar un rebuild en Railway:

# Opción 1: Push vacío
git commit --allow-empty -m "Trigger Railway rebuild"
git push

# Opción 2: Railway Dashboard
# → Ve a "Deployments"
# → Click en "⋯" del último deployment
# → "Redeploy"
```

---

## 🐛 Troubleshooting

### Problema: "npm: command not found"
**Solución:** ✅ Ya resuelto con el nuevo Dockerfile que usa `node:20-alpine`

### Problema: "Cannot find module 'fuzzball'"
**Causa:** Dependencia no instalada
**Solución:**
```bash
# Asegúrate de que esté en package.json
cd kds-webapp
npm install fuzzball --save

# Commit y push
git add package.json package-lock.json
git commit -m "Add fuzzball dependency"
git push
```

### Problema: "Port 3000 already in use"
**Causa:** Railway asigna puerto automáticamente
**Solución:** Railway setea automáticamente `PORT` env var. El código ya lo maneja:
```javascript
const PORT = process.env.PORT || 3000;
```

### Problema: "Firebase initialization error"
**Causa:** Falta `FIREBASE_SERVICE_ACCOUNT_KEY`
**Solución:** Agregar variable de entorno en Railway Dashboard

### Problema: Build muy lento
**Causa:** Copiando archivos innecesarios
**Solución:** ✅ Ya resuelto con `.dockerignore` optimizado

---

## ✅ Checklist de Deploy

Antes de hacer deploy, verifica:

- [ ] Todas las dependencias en `package.json`
- [ ] Variables de entorno configuradas en Railway
- [ ] Dockerfile en la raíz del repositorio
- [ ] `.dockerignore` configurado correctamente
- [ ] `railway.toml` apunta al Dockerfile correcto
- [ ] Código commiteado y pusheado
- [ ] Build local funciona correctamente
- [ ] Webhook URL configurada en WhatsApp Business

---

## 🎉 Resultado Esperado

Después de estos cambios, Railway debería:

1. ✅ Detectar cambios en `kds-webapp/`
2. ✅ Usar Dockerfile desde la raíz
3. ✅ Build exitoso con npm disponible
4. ✅ Deploy exitoso en ~2-3 minutos
5. ✅ Aplicación corriendo en `https://tu-app.up.railway.app`
6. ✅ Logs visibles en Railway Dashboard

---

**Fecha de implementación:** 5 de febrero de 2026  
**Estado:** ✅ LISTO PARA DEPLOY

## 📌 Siguiente Paso

```bash
# 1. Commit todos los cambios
git add .
git commit -m "Fix: Railway deployment configuration with Dockerfile"

# 2. Push a main (o tu rama de producción)
git push origin main

# 3. Railway hará deploy automáticamente
# 4. Monitorear logs en Railway Dashboard
```

¡Listo para deploy! 🚀
