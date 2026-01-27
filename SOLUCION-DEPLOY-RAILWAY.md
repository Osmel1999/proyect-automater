# Solución: Deploy Fallido en Railway

**Error:** `npm: command not found` durante el build

---

## 🔴 Problema

Railway está intentando usar **Nixpacks** (su builder automático) en lugar del **Dockerfile**, por lo que ejecuta:

```bash
cd kds-webapp && npm install
```

Pero no hay un entorno Node.js disponible en ese momento, causando el error `npm: command not found`.

---

## ✅ Solución

### Opción 1: Configurar desde el Dashboard de Railway (RECOMENDADO)

1. Ve al dashboard de Railway: https://railway.app/
2. Selecciona tu proyecto `kds-webapp`
3. Ve a **Settings** → **Build**
4. En **Builder**, selecciona: **Dockerfile**
5. En **Dockerfile Path**, ingresa: `Dockerfile`
6. Haz clic en **Save Changes**
7. Haz un redeploy manual desde **Deployments** → **⋮** → **Redeploy**

### Opción 2: Verificar que railway.json esté en el repo

Si estás usando Git con Railway:

```bash
# Inicializar git si no existe
git init

# Agregar archivos
git add railway.json Dockerfile

# Commit
git commit -m "Configure Railway to use Dockerfile"

# Push al remote de Railway
git push railway main
```

### Opción 3: Forzar uso de Dockerfile con variable de entorno

En el dashboard de Railway:

1. Ve a **Variables**
2. Agrega: `RAILWAY_DOCKERFILE_PATH` = `Dockerfile`
3. Redeploy

---

## 🧪 Verificar la Configuración

Una vez configurado, el log de build debería mostrar:

```
Building with Dockerfile
[1/5] FROM docker.io/library/node:20-alpine
[2/5] RUN apk add --no-cache bash
[3/5] COPY package.json package-lock.json ./
[4/5] RUN npm ci --only=production
[5/5] COPY server/ ./server/
```

En lugar de:

```
Building with Nixpacks
RUN cd kds-webapp && npm install  ❌ ERROR
```

---

## 📝 Archivos Actualizados

- ✅ `railway.json` - Agregado `startCommand` y path explícito
- ✅ `Dockerfile` - Ya estaba correcto

---

## 🚀 Próximo Deploy

Una vez configurado Railway correctamente:

1. Los cambios en `wompi-adapter.js` se deployarán
2. El fix del webhook funcionará
3. Los pagos se procesarán correctamente

---

**Nota:** El problema NO es con el código del fix, sino con la configuración de Railway.
