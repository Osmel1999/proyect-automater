# 🚀 DEPLOY COMPLETO DESDE CLI - GUÍA RÁPIDA

## ✅ SOLUCIÓN: Todo desde la Terminal

No necesitas buscar "Delete Service Cache" en el dashboard. Este script hace **TODO** desde el CLI:

### 🎯 Script Único

```bash
./deploy-cli-completo.sh
```

## 📋 Lo que hace el script automáticamente:

1. ✅ **Verifica archivos** (`railway.toml`, `package.json`)
2. ✅ **Commit y push** de cambios a GitHub
3. ✅ **Instala Railway CLI** (si no está instalado)
4. ✅ **Autentica** en Railway (si no estás logueado)
5. ✅ **Vincula al proyecto** (si no está vinculado)
6. ✅ **Fuerza rebuild** (agrega variable `REBUILD_TRIGGER` para invalidar caché)
7. ✅ **Deploy** con `railway up --detach`
8. ✅ **Monitorea logs** del deployment
9. ✅ **Verifica** automáticamente que los archivos sean correctos en producción

## 🔧 Cómo funciona el "Delete Service Cache" desde CLI

En lugar de buscar el botón en el dashboard, el script usa una técnica mejor:

**Agrega una variable de entorno temporal** que fuerza a Railway a hacer un rebuild completo:

```bash
railway variables set REBUILD_TRIGGER=$(date +%s)
```

Esto es **equivalente o mejor** que "Delete Service Cache" porque:
- ✅ Fuerza rebuild completo desde cero
- ✅ Invalida cualquier caché
- ✅ Usa el `railway.toml` actualizado
- ✅ 100% desde la terminal

## 🚀 EJECUCIÓN

### Opción 1: Script Completo (RECOMENDADO)

```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
./deploy-cli-completo.sh
```

**El script es interactivo y te guía en cada paso.**

### Opción 2: Comandos Manuales

Si prefieres ejecutar paso a paso:

```bash
# 1. Commit y push
git add railway.toml *.md *.sh
git commit -m "fix: configurar Railway correctamente"
git push origin main

# 2. Login en Railway (si no estás autenticado)
railway login

# 3. Vincular proyecto (si no está vinculado)
railway link

# 4. Forzar rebuild con variable dummy
railway variables set REBUILD_TRIGGER=$(date +%s)

# 5. Deploy
railway up --detach

# 6. Ver logs
railway logs -f
```

## 🧪 Verificación Automática

El script verifica automáticamente:

```bash
# login.html debe dar 404 ✅
curl -I https://tu-url.railway.app/login.html

# auth.html debe dar 200 ✅
curl -I https://tu-url.railway.app/auth.html

# select.html debe dar 200 ✅
curl -I https://tu-url.railway.app/select.html

# auth.html debe contener "select.html" ✅
curl https://tu-url.railway.app/auth.html | grep select.html
```

## ⚡ Comandos Útiles Railway CLI

```bash
# Ver estado y URL del servicio
railway status

# Ver logs en tiempo real
railway logs -f

# Ver variables de entorno
railway variables

# Listar variables
railway variables list

# Abrir dashboard en navegador
railway open

# Ver deployments
railway list

# Redeploy manual
railway up

# Redeploy forzado
railway up --force
```

## 🔧 Troubleshooting

### Railway CLI no instalado

**macOS con Homebrew**:
```bash
brew install railway
```

**Con npm (cualquier OS)**:
```bash
npm i -g @railway/cli
```

### No estás autenticado

```bash
railway login
```

Esto abrirá el navegador para autenticarte.

### No estás vinculado al proyecto

```bash
railway link
```

Esto te mostrará una lista de proyectos y podrás seleccionar el correcto.

### Deploy falla

```bash
# Ver logs para diagnosticar
railway logs

# Redeploy forzado
railway up --force

# Verificar estado
railway status
```

### Archivos viejos siguen visibles

```bash
# Forzar rebuild con nueva variable
railway variables set FORCE_REBUILD=$(date +%s)

# Deploy
railway up --detach

# Esperar y verificar
sleep 10
curl -I https://tu-url.railway.app/login.html  # Debe dar 404
```

## 📊 Ventajas del Script CLI

| Método | Dashboard Manual | Script CLI |
|--------|------------------|------------|
| **Tiempo** | 5-10 min | 2-3 min |
| **Pasos** | 10+ clicks | 1 comando |
| **Errores** | Buscar botones | Automático |
| **Verificación** | Manual | Automática |
| **Logs** | Ver en web | En terminal |
| **Repetible** | No | Sí |

## 🎯 Resumen

**EN LUGAR DE**:
1. ❌ Buscar "Delete Service Cache" en dashboard
2. ❌ Hacer click en botones
3. ❌ Esperar y verificar manualmente

**EJECUTA**:
```bash
./deploy-cli-completo.sh
```

✅ **TODO automatizado desde la terminal**

---

## 🚀 EJECUTAR AHORA

```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
./deploy-cli-completo.sh
```

**Tiempo estimado**: 2-5 minutos  
**Interacción requerida**: Mínima (solo confirmar pasos)  
**Resultado**: Deploy limpio con verificación automática

---

**Creado**: 21 de enero de 2026  
**Script**: `deploy-cli-completo.sh`  
**Status**: ✅ Listo para ejecutar
