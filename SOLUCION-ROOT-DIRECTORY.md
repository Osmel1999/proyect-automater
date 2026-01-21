# SOLUCIÓN DEFINITIVA: Root Directory Incorrecto en Railway

## ❌ PROBLEMA CONFIRMADO

Railway está intentando hacer build desde el directorio **PADRE** (`automater`), no desde `kds-webapp`:

```
The app contents that Railpack analyzed contains:
./
├── kds-webapp/
└── .DS_Store
```

Por eso:
- ❌ No encuentra `start.sh`
- ❌ No encuentra `package.json`
- ❌ No encuentra `server/server.js`
- ❌ Sirve archivos viejos/cacheados

## ✅ SOLUCIÓN INMEDIATA

### Opción 1: Configurar Root Directory (RECOMENDADO)

1. **Ve a Railway Dashboard**:
   ```
   https://railway.app/dashboard
   ```

2. **Selecciona tu proyecto y servicio**

3. **Ve a Settings → Service Settings**

4. **Busca "Root Directory" o "Source Directory"**

5. **Configura el valor a**:
   ```
   kds-webapp
   ```

6. **Guarda y haz un nuevo deploy**:
   ```bash
   railway up
   ```

### Opción 2: Crear railway.toml en la raíz del repositorio

Si no encuentras la opción de Root Directory, crea este archivo:

**Ubicación**: `/Users/osmeldfarak/Documents/Proyectos/automater/railway.toml`

```toml
[build]
builder = "nixpacks"
buildCommand = "cd kds-webapp && npm install"

[deploy]
startCommand = "cd kds-webapp && bash start.sh"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[[services]]
[services.settings]
watchPaths = ["kds-webapp/**"]
rootDirectory = "kds-webapp"
```

### Opción 3: Mover archivos al directorio raíz (NO RECOMENDADO)

Solo si las opciones anteriores no funcionan:

```bash
# Desde automater/
mv kds-webapp/* .
mv kds-webapp/.* . 2>/dev/null
rmdir kds-webapp
```

## 🔍 VERIFICACIÓN

Después de configurar el Root Directory, el output de Railway debería mostrar:

```
The app contents that Railpack analyzed contains:

./
├── package.json
├── server/
├── start.sh
├── auth.html
├── select.html
└── ...
```

**NO debería mostrar**:
```
./
├── kds-webapp/    ← ESTO ES MALO
```

## 📋 CHECKLIST POST-CONFIGURACIÓN

- [ ] Configurar Root Directory a `kds-webapp`
- [ ] Deploy exitoso sin errores de "script not found"
- [ ] Verificar que `login.html` retorna 404:
  ```bash
  curl -I https://tu-dominio.railway.app/login.html
  # Debe retornar: 404 Not Found
  ```
- [ ] Verificar que `auth.html` sirve la versión nueva:
  ```bash
  curl https://tu-dominio.railway.app/auth.html | grep "select.html"
  # Debe encontrar la redirección a select.html
  ```
- [ ] Probar el flujo completo de login en producción

## 🚨 SI PERSISTE EL PROBLEMA

1. **Eliminar caché de servicio**:
   - Railway Dashboard → Service → Settings
   - "Delete Service Cache" (botón rojo)
   - Hacer nuevo deploy

2. **Recrear el servicio**:
   - Eliminar el servicio actual
   - Crear nuevo servicio
   - **IMPORTANTE**: Al conectar con GitHub, asegurarse de que apunte a `kds-webapp`

3. **Verificar variables de entorno**:
   ```bash
   railway variables
   ```
   - Verificar que no haya variables apuntando a paths incorrectos

## 📝 NOTAS

- Este es un problema común cuando se despliega un monorepo
- Railway necesita saber explícitamente qué directorio contiene la aplicación
- Una vez configurado correctamente, los deploys futuros serán automáticos

---
**Fecha**: 21 de enero de 2026
**Status**: Problema identificado - Esperando configuración de Root Directory
