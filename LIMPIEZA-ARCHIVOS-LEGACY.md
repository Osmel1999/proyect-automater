# 🗑️ Archivos Legacy Removidos

**Fecha:** 20 de enero de 2026  
**Archivos movidos a:** `archive_legacy/`

---

## ❌ Archivos que NO se están usando

### 1. `login.html`
- **Razón:** Página de login obsoleta
- **Reemplazo:** `auth.html` (página unificada de registro/login)
- **Referencias:** Ninguna (no se usa en ningún lado)
- **Estado:** Movido a `archive_legacy/`

### 2. `onboarding-baileys.js`
- **Razón:** Script de onboarding legacy (versión anterior)
- **Reemplazo:** El código está integrado en `onboarding.html`
- **Referencias:** Ninguna (no se incluye en ningún HTML)
- **Estado:** Movido a `archive_legacy/`

---

## ✅ Páginas activas que SÍ se usan

### Autenticación:
- **`auth.html`** ✅ - Página unificada de registro/login
  - Usada en: `landing.html`, redirecciones desde `kds.html`, `select.html`

### Flujo de usuario:
1. `landing.html` → `auth.html` (registro/login)
2. `auth.html` → `dashboard.html` (si onboarding incompleto)
3. `auth.html` → `select.html` (si onboarding completo)
4. `dashboard.html` → Completar pasos de onboarding
5. `select.html` → `kds.html` o `dashboard.html`

### Páginas principales:
- ✅ `landing.html` - Landing page pública
- ✅ `auth.html` - Registro/Login
- ✅ `dashboard.html` - Dashboard del tenant
- ✅ `onboarding.html` - Conectar WhatsApp (Baileys)
- ✅ `onboarding-success.html` - Éxito al conectar
- ✅ `select.html` - Seleccionar vista (KDS/Dashboard)
- ✅ `kds.html` - Kitchen Display System
- ✅ `home.html` - (si se usa)

---

## 🎯 Por qué se eliminaron

### Problema detectado:
- `login.html` no se estaba usando, pero aún existía en el proyecto
- `onboarding-baileys.js` tenía referencias obsoletas a `login.html`
- Causaba confusión sobre cuál era la página real de login

### Verificación realizada:
```bash
# Buscar referencias a login.html
grep -r "login.html" **/*.html  # → No results

# Buscar referencias a onboarding-baileys.js
grep -r "onboarding-baileys.js" **/*.html  # → No results
```

### Decisión:
- Mover a `archive_legacy/` en lugar de eliminar completamente
- Se pueden recuperar si es necesario en el futuro

---

## 📝 Cambios realizados

```bash
# Mover archivos legacy
mkdir -p archive_legacy
mv login.html archive_legacy/
mv onboarding-baileys.js archive_legacy/
```

**Commit:** Limpieza de archivos legacy no utilizados

---

**Estado:** ✅ PROYECTO MÁS LIMPIO  
**Última actualización:** 20 enero 2026, 12:30 PM

---

**FIN DEL DOCUMENTO**
