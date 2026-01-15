# Plan de Limpieza del Proyecto

> **Fecha**: 15 de enero de 2026  
> **Objetivo**: Limpiar archivos obsoletos de la raíz del proyecto

---

## 📁 MANTENER (Archivos Importantes)

### Documentación Activa
- ✅ `PROPUESTA-MIGRACION-BAILEYS.md` - Propuesta principal
- ✅ `COMPARACION-META-VS-BAILEYS.md` - Análisis comparativo
- ✅ `DECISION-SIGUIENTE-PASO.md` - Decisiones del proyecto
- ✅ `propuesta/PLAN-MIGRACION-PASO-A-PASO.md` - Plan detallado **NUEVO**

### Configuración Esencial
- ✅ `.env` (no versionar)
- ✅ `.env.example`
- ✅ `.firebaserc`
- ✅ `.gitignore`
- ✅ `config.js`
- ✅ `facebook-config.js`
- ✅ `firebase.json`
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `railway.json`
- ✅ `database.rules.json`

### HTML Productivo
- ✅ `index.html`
- ✅ `landing.html`
- ✅ `auth.html`
- ✅ `login.html`
- ✅ `onboarding.html`
- ✅ `onboarding-success.html`
- ✅ `dashboard.html`
- ✅ `home.html`
- ✅ `kds.html`
- ✅ `select.html`
- ✅ `privacy-policy.html`
- ✅ `terms.html`
- ✅ `styles.css`

### JavaScript Core
- ✅ `app.js`

### Carpetas Importantes
- ✅ `server/` - Backend
- ✅ `scripts/` - Scripts útiles
- ✅ `assets/` - Imágenes y recursos
- ✅ `docs/` - Documentación técnica
- ✅ `propuesta/` - **NUEVA** carpeta con plan de migración

---

## 🗑️ ELIMINAR (Archivos Obsoletos)

### Documentos de Debug (Ya resueltos o irrelevantes)
```bash
ANALISIS-SOLUCIONES-NO-OFICIALES.md          # Obsoleto - Ya decidimos
ARQUITECTURA-DUAL.md                         # Sistema dual descartado
CHECKLIST-PRUEBA-ONBOARDING.md               # Debug antiguo
CONCEPTO-FROM-TO-WHATSAPP.md                 # Concepto viejo
CONFIGURACION-META-CHECKLIST-FINAL.md        # Meta config obsoleta
DEBUG-ONBOARDING-LEGACY.md                   # Debug antiguo
ESTRATEGIA-ANTI-BAN-SAAS.md                  # Duplicado
ESTRATEGIA-POST-SELECCION.md                 # Obsoleto
FLUJO-CLIENTE-COMPLETO.md                    # Documentación vieja
FLUJO-ONBOARDING-CORREGIDO.md                # Viejo flujo
GUIA-API-TESTING-WHATSAPP.md                 # Testing antiguo
GUIA-FACEBOOK-LOGIN-QUICKSTART.md            # Ya implementado
GUIA-SISTEMA-DUAL.md                         # Sistema dual descartado
IMPLEMENTACION-DUAL-COMPLETADA.md            # Sistema dual descartado
INDEX-DOCUMENTACION-DUAL.md                  # Sistema dual descartado
INVESTIGACION-AUTHRESPONSE-NULL.md           # Debug resuelto
PLAN-ACCION-AUTHRESPONSE.md                  # Plan viejo
PLAN-DASHBOARD-CONVERSACIONES.md             # Feature no implementado
PLAN-MIGRACION-SAAS-DIRECTO.md               # Obsoleto
PROBLEMA-APP-SECRET.md                       # Problema resuelto
PROBLEMA-RESUELTO-CALLBACK.md                # Ya resuelto
PRUEBA-SISTEMA-DUAL.md                       # Sistema dual descartado
QUICK-REF-API-TESTING.md                     # Testing antiguo
RESUMEN-EJECUTIVO-ESTADO.md                  # Estado antiguo
RESUMEN-SOLUCION-PRESELECCION.md             # Obsoleto
SIGUIENTE-PRUEBA-LOGGING.md                  # Debug temporal
SISTEMA-DUAL-README.md                       # Sistema dual descartado
SOLUCION-CUENTA-DESHABILITADA.md             # Problema puntual
SOLUCION-ERROR-ONBOARDING.md                 # Error ya analizado
SOLUCION-PORTFOLIO-PRESELECTION.md           # Obsoleto
SOLUCION-SIGNEDRQUEST-FIX.md                 # Fix temporal
TESTING-VALIDACION-PORTFOLIO.md              # Testing antiguo
URLS-CORRECTAS-META.md                       # Config ya implementada
VERIFICACION-PRE-FILL-PORTFOLIO.md           # Testing antiguo
```

### Scripts de Debug/Testing Obsoletos
```bash
cleanup.sh                          # Script viejo
diagnosticar-phone-number.sh        # Debug temporal
diagnostico-dual.sh                 # Sistema dual descartado
monitor-legacy.sh                   # Monitoreo antiguo
preview-cleanup.sh                  # Preview no usado
test-dual.sh                        # Sistema dual descartado
test-validation-endpoint.sh         # Testing temporal
test-whatsapp-api.sh                # Testing antiguo
verify-dual-config.sh               # Sistema dual descartado
```

### Configuraciones Duplicadas/Obsoletas
```bash
.env.dual.example                   # Sistema dual descartado
.env.n8n                            # N8N no usado
.env.railway                        # Duplicado de .env
.env.whatsapp.template              # Template antiguo
dual-config.js                      # Sistema dual descartado
facebook-config-legacy.js           # Config legacy antigua
```

### HTML de Debug/Testing
```bash
onboarding-2.html                   # Versión de prueba
onboarding-debug.html               # Debug temporal
onboarding-legacy-validation.html   # Validación antigua
test-messaging.html                 # Testing manual
test-preselection-variants.html     # Testing variantes
```

### Archivos Temporales
```bash
.cleanup-plan.txt                   # Plan temporal
```

---

## 📦 MOVER A ARCHIVO (Por seguridad)

### Backup Existente
```bash
backup_20260112_194608/             # Ya existe - revisar y eliminar
```

---

## 🚀 Comandos para Ejecutar

### 1. Crear Backup Final (por seguridad)
```bash
mkdir -p archive_20260115
```

### 2. Mover documentación obsoleta a archivo
```bash
mv ANALISIS-SOLUCIONES-NO-OFICIALES.md archive_20260115/
mv ARQUITECTURA-DUAL.md archive_20260115/
mv CHECKLIST-PRUEBA-ONBOARDING.md archive_20260115/
mv CONCEPTO-FROM-TO-WHATSAPP.md archive_20260115/
mv CONFIGURACION-META-CHECKLIST-FINAL.md archive_20260115/
mv DEBUG-ONBOARDING-LEGACY.md archive_20260115/
mv ESTRATEGIA-ANTI-BAN-SAAS.md archive_20260115/
mv ESTRATEGIA-POST-SELECCION.md archive_20260115/
mv FLUJO-CLIENTE-COMPLETO.md archive_20260115/
mv FLUJO-ONBOARDING-CORREGIDO.md archive_20260115/
mv GUIA-API-TESTING-WHATSAPP.md archive_20260115/
mv GUIA-FACEBOOK-LOGIN-QUICKSTART.md archive_20260115/
mv GUIA-SISTEMA-DUAL.md archive_20260115/
mv IMPLEMENTACION-DUAL-COMPLETADA.md archive_20260115/
mv INDEX-DOCUMENTACION-DUAL.md archive_20260115/
mv INVESTIGACION-AUTHRESPONSE-NULL.md archive_20260115/
mv PLAN-ACCION-AUTHRESPONSE.md archive_20260115/
mv PLAN-DASHBOARD-CONVERSACIONES.md archive_20260115/
mv PLAN-MIGRACION-SAAS-DIRECTO.md archive_20260115/
mv PROBLEMA-APP-SECRET.md archive_20260115/
mv PROBLEMA-RESUELTO-CALLBACK.md archive_20260115/
mv PRUEBA-SISTEMA-DUAL.md archive_20260115/
mv QUICK-REF-API-TESTING.md archive_20260115/
mv RESUMEN-EJECUTIVO-ESTADO.md archive_20260115/
mv RESUMEN-SOLUCION-PRESELECCION.md archive_20260115/
mv SIGUIENTE-PRUEBA-LOGGING.md archive_20260115/
mv SISTEMA-DUAL-README.md archive_20260115/
mv SOLUCION-CUENTA-DESHABILITADA.md archive_20260115/
mv SOLUCION-ERROR-ONBOARDING.md archive_20260115/
mv SOLUCION-PORTFOLIO-PRESELECTION.md archive_20260115/
mv SOLUCION-SIGNEDRQUEST-FIX.md archive_20260115/
mv TESTING-VALIDACION-PORTFOLIO.md archive_20260115/
mv URLS-CORRECTAS-META.md archive_20260115/
mv VERIFICACION-PRE-FILL-PORTFOLIO.md archive_20260115/
```

### 3. Mover scripts obsoletos
```bash
mv cleanup.sh archive_20260115/
mv diagnosticar-phone-number.sh archive_20260115/
mv diagnostico-dual.sh archive_20260115/
mv monitor-legacy.sh archive_20260115/
mv preview-cleanup.sh archive_20260115/
mv test-dual.sh archive_20260115/
mv test-validation-endpoint.sh archive_20260115/
mv test-whatsapp-api.sh archive_20260115/
mv verify-dual-config.sh archive_20260115/
```

### 4. Mover configuraciones obsoletas
```bash
mv .env.dual.example archive_20260115/
mv .env.n8n archive_20260115/
mv .env.railway archive_20260115/
mv .env.whatsapp.template archive_20260115/
mv dual-config.js archive_20260115/
mv facebook-config-legacy.js archive_20260115/
```

### 5. Mover HTML de testing
```bash
mv onboarding-2.html archive_20260115/
mv onboarding-debug.html archive_20260115/
mv onboarding-legacy-validation.html archive_20260115/
mv test-messaging.html archive_20260115/
mv test-preselection-variants.html archive_20260115/
```

### 6. Limpiar temporales
```bash
rm -f .cleanup-plan.txt
```

### 7. Eliminar backup antiguo (después de verificar)
```bash
# Revisar primero que no tenga nada importante
ls -la backup_20260112_194608/

# Si está todo bien, eliminar
rm -rf backup_20260112_194608/
```

### 8. Comprimir archivo (opcional)
```bash
tar -czf archive_20260115.tar.gz archive_20260115/
rm -rf archive_20260115/
```

---

## 📊 Resultado Esperado

### Antes
```
57 archivos MD
13 scripts SH
5 archivos ENV
5 archivos HTML de testing
```

### Después
```
3 archivos MD en raíz (propuesta principal)
1 carpeta propuesta/ con plan detallado
Archivos de configuración esenciales
HTML productivo únicamente
Scripts útiles en scripts/
```

---

## ✅ Verificación Post-Limpieza

Después de ejecutar los comandos, verificar:

```bash
# Ver archivos en raíz
ls -la *.md

# Debería mostrar solo:
# - PROPUESTA-MIGRACION-BAILEYS.md
# - COMPARACION-META-VS-BAILEYS.md
# - DECISION-SIGUIENTE-PASO.md

# Ver estructura general
tree -L 1

# Verificar que el proyecto sigue funcionando
npm start
```

---

## 🚨 Rollback (Si algo sale mal)

Si necesitas recuperar algo:

```bash
# Extraer archivo
tar -xzf archive_20260115.tar.gz

# Recuperar archivo específico
cp archive_20260115/NOMBRE_ARCHIVO.md ./
```

---

**Recomendación**: Ejecutar paso a paso y verificar que todo sigue funcionando antes de comprimir el archivo final.
