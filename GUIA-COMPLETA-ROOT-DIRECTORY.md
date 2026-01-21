# 🎯 GUÍA DEFINITIVA: Solucionar Root Directory en Railway

## 🔴 PROBLEMA IDENTIFICADO

Railway está haciendo build desde el **directorio padre** (`automater`) en lugar de `kds-webapp`:

```
❌ Railway analiza:
./
├── kds-webapp/      ← Ve esto como subdirectorio
└── .DS_Store

✅ Debería analizar:
./
├── package.json     ← Debería ver estos archivos directamente
├── server/
├── start.sh
└── auth.html
```

**Consecuencias**:
- ❌ No encuentra `start.sh` → Error de deploy
- ❌ No encuentra `package.json` → No instala dependencias
- ❌ Sirve archivos viejos/cacheados
- ❌ `login.html` (eliminado) sigue accesible

---

## ✅ SOLUCIONES (en orden de prioridad)

### 🥇 SOLUCIÓN 1: railway.toml (AUTOMÁTICA - RECOMENDADA)

**Estado**: ✅ Archivo creado en `/Users/osmeldfarak/Documents/Proyectos/automater/railway.toml`

**Pasos**:
1. El archivo `railway.toml` ya está creado en el directorio raíz
2. Ejecuta el script:
   ```bash
   cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
   ./aplicar-solucion-root-directory.sh
   ```
3. Sigue las instrucciones del script (commit, push, deploy)

**Ventajas**:
- ✅ Solución automática y permanente
- ✅ Se versiona con Git
- ✅ No requiere cambios en Railway Dashboard

---

### 🥈 SOLUCIÓN 2: Configurar Root Directory en Dashboard

Si `railway.toml` no funciona:

**Pasos**:
1. Ve a **Railway Dashboard**: https://railway.app/dashboard
2. Selecciona tu **proyecto** → **servicio**
3. Ve a **Settings** → **Service Settings**
4. Busca **"Root Directory"** o **"Source Directory"**
5. Configura el valor: `kds-webapp`
6. **Guarda** y haz un nuevo deploy:
   ```bash
   railway up
   ```

**Ventajas**:
- ✅ Interfaz visual simple
- ✅ Cambio inmediato
- ⚠️ Puede perderse si se recrea el servicio

---

### 🥉 SOLUCIÓN 3: Configurar Build Command

Si las anteriores no funcionan:

**Pasos**:
1. Ve a **Railway Dashboard** → **Settings**
2. **Build Command**:
   ```bash
   cd kds-webapp && npm install
   ```
3. **Start Command**:
   ```bash
   cd kds-webapp && bash start.sh
   ```
4. **Guarda** y redeploy

---

### ⚠️ SOLUCIÓN 4: Recrear Servicio (SI TODO LO DEMÁS FALLA)

**Pasos**:
1. **Backup** de variables de entorno:
   ```bash
   railway variables > railway-env-backup.txt
   ```
2. **Eliminar** el servicio actual en Railway Dashboard
3. **Crear nuevo servicio**:
   - New Project → Deploy from GitHub
   - **IMPORTANTE**: Seleccionar repositorio y **apuntar a `kds-webapp`**
4. **Restaurar** variables de entorno
5. Deploy

---

## 🧪 VERIFICACIÓN POST-DEPLOY

### 1. Verificar que Railway use el directorio correcto

**En Railway Dashboard** → **Deployments** → último deploy → **Logs**:

```
✅ CORRECTO:
./
├── package.json
├── server/
├── start.sh

❌ INCORRECTO:
./
├── kds-webapp/
```

### 2. Verificar archivos en producción

```bash
# Login.html DEBE retornar 404
curl -I https://tu-dominio.railway.app/login.html
# Esperado: HTTP/1.1 404 Not Found

# Auth.html DEBE tener la versión nueva
curl https://tu-dominio.railway.app/auth.html | grep -i "select.html"
# Esperado: Debe encontrar redirección a select.html

# Select.html DEBE ser accesible
curl -I https://tu-dominio.railway.app/select.html
# Esperado: HTTP/1.1 200 OK
```

### 3. Probar flujo completo

1. Abrir: `https://tu-dominio.railway.app/`
2. Hacer login con Facebook
3. **Verificar redirección**: `auth.html` → `select.html`
4. **NO debe mostrar**: `login.html`

---

## 🔧 TROUBLESHOOTING

### Problema: Deploy falla con "start.sh not found"
**Solución**: Root directory no está configurado correctamente
- Verifica `railway.toml` en el directorio **padre**
- O configura Root Directory en Dashboard

### Problema: Archivos eliminados siguen accesibles
**Solución**: Railway usa caché viejo
1. Railway Dashboard → Settings → **Delete Service Cache**
2. Hacer nuevo deploy
3. Hard refresh en el navegador (Cmd+Shift+R)

### Problema: railway.toml no se detecta
**Solución**: 
1. Verificar que esté en el **directorio raíz del repositorio**
2. Hacer commit y push
3. Triggear nuevo deploy desde Railway

### Problema: Variables de entorno perdidas
**Solución**:
```bash
# Listar variables actuales
railway variables

# Agregar variable
railway variables set KEY=VALUE
```

---

## 📋 CHECKLIST FINAL

- [ ] `railway.toml` creado en directorio raíz (`automater/`)
- [ ] Commit y push del `railway.toml`
- [ ] Deploy exitoso sin errores
- [ ] `login.html` retorna 404
- [ ] `auth.html` sirve versión nueva con redirección a `select.html`
- [ ] `select.html` es accesible
- [ ] Flujo de login funciona end-to-end
- [ ] Caché del navegador limpiado
- [ ] Variables de entorno configuradas

---

## 🚀 EJECUCIÓN RÁPIDA

```bash
# 1. Ir al directorio del proyecto
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp

# 2. Ejecutar script de solución
./aplicar-solucion-root-directory.sh

# 3. Seguir instrucciones del script

# 4. Verificar deploy
railway logs

# 5. Verificar en producción
curl -I https://tu-dominio.railway.app/login.html    # Debe dar 404
curl https://tu-dominio.railway.app/auth.html | grep select.html  # Debe encontrar
```

---

## 📞 SOPORTE ADICIONAL

Si después de intentar todas estas soluciones el problema persiste:

1. Verifica el repositorio de GitHub:
   - ¿Los archivos están en la ubicación correcta?
   - ¿El commit más reciente incluye los cambios?

2. Verifica la conexión Railway ↔ GitHub:
   - ¿Railway está viendo el branch correcto?
   - ¿Los webhooks están funcionando?

3. Considera deployment manual:
   ```bash
   railway up --force
   ```

---

**Última actualización**: 21 de enero de 2026  
**Status**: Soluciones listas - Pendiente aplicación

🎯 **PRÓXIMO PASO**: Ejecutar `./aplicar-solucion-root-directory.sh`
