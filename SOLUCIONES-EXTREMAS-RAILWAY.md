# 🚨 SOLUCIONES EXTREMAS: Railway NO actualiza

## Problema Confirmado
Railway está sirviendo `login.html` que fue eliminado hace días.
La URL `kdsapp.site/login.html` funciona = Railway tiene versión MUY antigua.

---

## 🔥 SOLUCIONES EXTREMAS (En orden de agresividad)

### 1. 🗑️ Eliminar TODA la Cache de Railway (Dashboard)

**Pasos:**
1. Ve a https://railway.app
2. Selecciona tu proyecto
3. Click en tu servicio
4. **Settings** → **Service**
5. Scroll hasta **"Danger Zone"**
6. **Click en "Delete Service Cache"** ✅
7. **Click en "Restart"** (forzar restart después de limpiar cache)
8. Espera 5 minutos completos

---

### 2. 🔄 Redeploy Completo con Variables Nuevas

Railway puede estar usando cache persistente. Agregar una variable nueva fuerza rebuild:

```bash
# Agregar variable dummy que fuerza rebuild
railway variables set FORCE_REBUILD="$(date +%s)"

# Esperar 5 minutos
sleep 300

# Verificar
curl -I https://kdsapp.site/login.html
```

---

### 3. 🔧 Cambiar Builder de NIXPACKS a DOCKERFILE

Railway puede tener problemas con Nixpacks. Crear Dockerfile fuerza rebuild limpio:

```bash
# Crear Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copiar TODO el código
COPY . .

# Exponer puerto
EXPOSE 3000

# Start command
CMD ["node", "server/index.js"]
EOF

# Modificar railway.json
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF

# Commit y deploy
git add Dockerfile railway.json
git commit -m "fix: cambiar a Dockerfile para forzar rebuild limpio"
railway up
```

---

### 4. 🆕 Eliminar y Re-crear el Servicio Completamente

**Esta es la solución MÁS EFECTIVA pero más drástica:**

```bash
# PASO 1: Backup de variables de entorno
railway variables > railway-backup-vars-$(date +%Y%m%d).txt

echo "✅ Variables guardadas en: railway-backup-vars-$(date +%Y%m%d).txt"
echo ""
echo "⚠️  IMPORTANTE: Guarda este archivo en un lugar seguro"
echo ""

# PASO 2: Desvincula el servicio actual
railway unlink

# PASO 3: En Railway Dashboard:
# - Ve a tu proyecto
# - Settings → Delete Service
# - Confirma

# PASO 4: Re-crear servicio
railway link  # Selecciona el proyecto
railway up    # Deploy código fresco

# PASO 5: Restaurar variables manualmente desde el archivo backup
# Ve a Railway Dashboard → Variables → Pegar variables del backup
```

---

### 5. 📦 Cambiar Dominio/URL Temporalmente

Railway puede tener cache en el edge/CDN:

1. **Railway Dashboard** → **Settings** → **Domains**
2. **Elimina el dominio actual** `kdsapp.site`
3. **Espera 5 minutos**
4. **Agrega el dominio de nuevo**
5. **Espera a que propague DNS** (10-15 minutos)

---

### 6. 🔄 Deploy Desde Rama Nueva

Git puede tener issues con Railway. Crear rama nueva:

```bash
# Crear rama nueva desde main
git checkout -b force-deploy-$(date +%Y%m%d)

# Hacer un cambio mínimo
echo "// Force deploy $(date)" >> server/index.js

# Commit
git add .
git commit -m "force: deploy desde rama nueva"

# Deploy desde esta rama
railway up

# Verificar
curl -I https://kdsapp.site/login.html
```

---

### 7. 💣 Eliminar .git y Re-inicializar

**EXTREMO - Solo si todo lo demás falla:**

```bash
# Backup de .git
mv .git .git-backup-$(date +%Y%m%d)

# Re-inicializar git
git init
git add .
git commit -m "Initial commit - force rebuild"

# Re-vincular con Railway
railway link
railway up

# Si funciona, puedes eliminar .git-backup
# Si no funciona, restaura: rm -rf .git && mv .git-backup-* .git
```

---

### 8. 🆘 Contactar Soporte de Railway

Si NADA funciona, hay un bug en Railway:

```
Email: team@railway.app
Discord: https://discord.gg/railway

Asunto: Service not updating files after railway up

Mensaje:
Hi Railway team,

I'm experiencing a critical issue where my service is not updating files after running "railway up".

- Project ID: [tu-project-id]
- Service: [tu-service-name]
- Issue: Deleted files (login.html) still accessible
- URL: https://kdsapp.site/login.html (should be 404)

Steps taken:
1. railway up (multiple times)
2. railway up --force
3. Delete Service Cache
4. Restart service

The service still serves old files. Can you help investigate if there's a cache issue on your end?

Thanks!
```

---

## ⚡ PLAN DE ACCIÓN RECOMENDADO

### Opción A: Rápida (10 minutos)
```bash
# 1. Delete Service Cache desde Dashboard
# 2. Agregar variable para forzar rebuild
railway variables set FORCE_REBUILD="$(date +%s)"
# 3. Esperar 5 minutos
# 4. Verificar
```

### Opción B: Efectiva (20 minutos)
```bash
# 1. Crear Dockerfile (solución #3)
# 2. Cambiar builder a DOCKERFILE
# 3. railway up
# 4. Esperar 5 minutos
# 5. Verificar
```

### Opción C: Definitiva (30 minutos)
```bash
# 1. Backup de variables
railway variables > backup.txt
# 2. Delete Service en Dashboard
# 3. Re-crear servicio nuevo
railway init
railway up
# 4. Restaurar variables
```

---

## 🧪 Verificación Post-Solución

```bash
# Test 1: login.html NO debe existir
curl -I https://kdsapp.site/login.html
# Esperado: 404 Not Found

# Test 2: auth.html debe existir
curl -I https://kdsapp.site/auth.html
# Esperado: 200 OK

# Test 3: Verificar contenido de auth.html
curl -s https://kdsapp.site/auth.html | grep "window.location.href" | head -3
# Esperado: window.location.href = '/select.html'
```

---

**Última actualización:** 21 de enero de 2026 - 09:30 hrs
