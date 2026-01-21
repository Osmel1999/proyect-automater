# 🚨 PROBLEMA CRÍTICO: Railway NO está actualizando archivos

## Fecha: 21 de enero de 2026

---

## 🔍 Problema Confirmado

**Síntomas:**
- ✅ Código local correcto (login.html eliminado, auth.html redirige a select.html)
- ❌ Railway NO actualiza (login.html todavía accesible)
- ❌ Railway sigue sirviendo archivos viejos después de `railway up`

**Conclusión:** Railway tiene un problema de sincronización o caché.

---

## 🔧 SOLUCIONES (Probar en orden)

### ⚡ SOLUCIÓN 1: Railway Up con --force (Recomendada)

```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp

# Forzar rebuild completo
railway up --force

# Esperar 2-3 minutos
# Verificar logs
railway logs --tail
```

---

### 🔄 SOLUCIÓN 2: Verificar .railwayignore

Railway puede estar ignorando archivos. Verifica si existe `.railwayignore`:

```bash
# Ver si existe
cat .railwayignore 2>/dev/null

# Si existe y tiene *.html, elimínalo o corrígelo
rm .railwayignore

# Intentar de nuevo
railway up
```

---

### 🗑️ SOLUCIÓN 3: Eliminar Build Cache de Railway

Desde el Dashboard de Railway:

1. Ve a tu proyecto en **railway.app**
2. Click en tu servicio
3. Ve a **Settings** → **Service**
4. Scroll down hasta **Danger Zone**
5. Click en **Delete Service Cache**
6. Confirma
7. Espera que Railway haga un rebuild completo

---

### 🔌 SOLUCIÓN 4: Configurar Start Command Explícito

Railway puede estar sirviendo archivos desde caché. Configura el start command:

```bash
# En Railway Dashboard → Settings → Deploy
# Start Command: node server/index.js

# O desde CLI:
railway run node server/index.js
```

---

### 📦 SOLUCIÓN 5: Verificar nixpacks.toml o Dockerfile

Si tienes configuración de build personalizada, puede estar cacheando archivos:

```bash
# Verificar si existe
cat nixpacks.toml 2>/dev/null
cat Dockerfile 2>/dev/null

# Si existe y tiene problemas, agregar cache busting
```

---

### 🆕 SOLUCIÓN 6: Re-crear el Servicio (Último Recurso)

Si nada funciona, re-crear el servicio:

1. **Guardar variables de entorno:**
   ```bash
   railway variables > railway-vars-backup.txt
   ```

2. **Eliminar servicio actual:**
   - Railway Dashboard → Settings → Delete Service

3. **Crear nuevo servicio:**
   ```bash
   railway init
   railway up
   ```

4. **Restaurar variables:**
   - Pegar las variables manualmente desde railway-vars-backup.txt

---

### 🔍 SOLUCIÓN 7: Verificar Watch Exclude en Railway

Railway puede tener watch exclude configurado:

```bash
# Ver configuración actual
railway status

# Ver variables de entorno relacionadas con deploy
railway variables | grep -i watch
railway variables | grep -i ignore
```

---

## 🧪 Script de Diagnóstico

Ejecuta este script para verificar qué está pasando:

```bash
#!/bin/bash

echo "🔍 DIAGNÓSTICO: Railway File Sync"
echo "=================================="
echo ""

# 1. Ver qué archivos locales existen
echo "📁 Archivos en local:"
echo "   login.html: $([ -f login.html ] && echo '❌ EXISTS' || echo '✅ NOT FOUND')"
echo "   auth.html: $([ -f auth.html ] && echo '✅ EXISTS' || echo '❌ NOT FOUND')"
echo ""

# 2. Ver .railwayignore
echo "📋 .railwayignore:"
if [ -f .railwayignore ]; then
    echo "   ⚠️  EXISTS - contenido:"
    cat .railwayignore | sed 's/^/     /'
else
    echo "   ✅ NO EXISTS"
fi
echo ""

# 3. Ver .gitignore
echo "📋 .gitignore:"
if [ -f .gitignore ]; then
    echo "   EXISTS - archivos HTML ignorados:"
    grep -i '\.html' .gitignore 2>/dev/null || echo "     Ninguno"
else
    echo "   NO EXISTS"
fi
echo ""

# 4. Ver railway.json
echo "📋 railway.json:"
if [ -f railway.json ]; then
    echo "   EXISTS - contenido:"
    cat railway.json | sed 's/^/     /'
else
    echo "   NO EXISTS"
fi
echo ""

# 5. Ver tamaño del directorio
echo "📊 Tamaño del proyecto:"
du -sh . 2>/dev/null
echo ""

# 6. Contar archivos HTML
echo "📊 Archivos HTML en raíz:"
ls -1 *.html 2>/dev/null | wc -l | sed 's/^/     /'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 RECOMENDACIÓN:"
echo "   1. Ejecutar: railway up --force"
echo "   2. Esperar 3 minutos"
echo "   3. Probar: curl -I https://tu-app.railway.app/login.html"
echo "   4. Si todavía existe → Eliminar cache en Railway Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

---

## 🎯 PLAN DE ACCIÓN INMEDIATO

### 1. Ejecutar railway up --force

```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
railway up --force
```

### 2. Verificar que termina sin errores

```bash
railway logs --tail
```

### 3. Esperar 3 minutos completos

### 4. Verificar archivos en Railway

```bash
# Reemplaza con tu URL
curl -I https://tu-app.railway.app/login.html

# Debe dar: 404 Not Found o Cannot GET /login.html
```

### 5. Si TODAVÍA existe login.html:

**Opción A: Eliminar cache desde Dashboard**
- Ir a Railway Dashboard
- Settings → Delete Service Cache
- Esperar rebuild

**Opción B: Agregar archivo de verificación**

```bash
# Crear archivo único para verificar deploy
echo "/* Deploy: $(date) */" > deploy-version.js

git add deploy-version.js
git commit -m "test: verificar deploy con archivo único"
railway up --force

# Verificar que el nuevo archivo existe en Railway
curl https://tu-app.railway.app/deploy-version.js
```

---

## 📞 Si Nada Funciona

Contactar soporte de Railway:
- Email: team@railway.app
- Discord: https://discord.gg/railway

Mensaje sugerido:
```
Hola, tengo un problema donde railway up no está actualizando mis archivos.
Archivos eliminados localmente siguen accesibles en Railway.
Project: [tu-project-id]
Service: [tu-service-name]
¿Puede haber un problema de caché en el servidor?
```

---

## 🔍 Información de Depuración

```bash
# Ver información del proyecto
railway status

# Ver variables
railway variables

# Ver último deploy
railway logs --tail

# Ver configuración
cat railway.json 2>/dev/null
cat .railwayignore 2>/dev/null
```

---

**Última actualización:** 21 de enero de 2026 - 09:00 hrs
