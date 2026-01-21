# 📝 Renombre: onboarding.html → whatsapp-connect.html

**Fecha:** 21 de enero de 2026  
**Razón:** Mayor claridad y coherencia con la funcionalidad real

---

## 🤔 ¿Por qué el renombre?

### Situación Anterior
El archivo se llamaba `onboarding.html`, pero **ya no es un onboarding completo**:
- ❌ El "onboarding" completo fue simplificado
- ❌ La creación del tenant se movió a `auth.html` (durante el registro)
- ❌ La configuración de menú/mensajes se hace en el `dashboard.html`
- ✅ Este archivo **solo conecta WhatsApp** mediante QR

### Problema
- El nombre `onboarding.html` sugiere un proceso completo de incorporación
- En realidad, solo maneja la **conexión de WhatsApp con Baileys**
- Esto causaba confusión sobre su propósito real

---

## ✅ Nuevo Nombre: `whatsapp-connect.html`

**Razones:**
1. ✅ **Claro y descriptivo:** Indica exactamente qué hace (conectar WhatsApp)
2. ✅ **Coherente:** El archivo solo genera QR y conecta WhatsApp
3. ✅ **Mantenible:** Más fácil para otros desarrolladores entender su función
4. ✅ **SEO-friendly:** Si se expone públicamente, el nombre es autoexplicativo

---

## 📋 Cambios Realizados

### 1. Renombre del Archivo Principal
```bash
git mv onboarding.html whatsapp-connect.html
```

### 2. Actualizaciones en `dashboard.html`

**Función `connectWhatsApp()`:**
```javascript
// ANTES
function connectWhatsApp() {
  window.location.href = `/onboarding?tenant=${tenantId}`;
}

// DESPUÉS
function connectWhatsApp() {
  window.location.href = `/whatsapp-connect?tenant=${tenantId}`;
}
```

**Función `disconnectWhatsApp()`:**
```javascript
// ANTES
alert('Ahora serás redirigido al onboarding para reconectar.');
window.location.href = `/onboarding?tenant=${tenantId}`;

// DESPUÉS
alert('Ahora serás redirigido a la página de conexión para reconectar.');
window.location.href = `/whatsapp-connect?tenant=${tenantId}`;
```

**Comentarios actualizados:**
```javascript
// ANTES
/**
 * Redirige al onboarding para conectar WhatsApp
 */

// DESPUÉS
/**
 * Redirige a la página de conexión de WhatsApp
 */
```

### 3. Actualizaciones en `server/index.js`

**Middleware de rutas limpias:**
```javascript
// ANTES
// Permite acceder a /onboarding en lugar de /onboarding.html

// DESPUÉS
// Permite acceder a /whatsapp-connect en lugar de /whatsapp-connect.html
```

**Redirección de error OAuth:**
```javascript
// ANTES
res.redirect(`${frontendUrl}/onboarding.html?error=oauth_failed`);

// DESPUÉS
res.redirect(`${frontendUrl}/whatsapp-connect.html?error=oauth_failed`);
```

**Mensaje de inicio del servidor:**
```javascript
// ANTES
console.log(`   🎯 Onboarding: http://localhost:${PORT}/onboarding.html`);

// DESPUÉS
console.log(`   🎯 Conectar WhatsApp: http://localhost:${PORT}/whatsapp-connect.html`);
```

### 4. Actualizaciones en `firebase.json`

**Regla de rewrite:**
```json
// ANTES
{
  "source": "/onboarding",
  "destination": "/onboarding.html"
}

// DESPUÉS
{
  "source": "/whatsapp-connect",
  "destination": "/whatsapp-connect.html"
}
```

---

## 🔗 URLs Actualizadas

### Frontend (Firebase Hosting)

| Antes | Después |
|-------|---------|
| `/onboarding` | `/whatsapp-connect` |
| `/onboarding.html` | `/whatsapp-connect.html` |
| `https://kdsapp.site/onboarding` | `https://kdsapp.site/whatsapp-connect` |
| `https://kdsapp.site/onboarding.html` | `https://kdsapp.site/whatsapp-connect.html` |

### Parámetros
Ambas formas funcionan:
- `https://kdsapp.site/whatsapp-connect?tenant=tenant123`
- `https://kdsapp.site/whatsapp-connect.html?tenant=tenant123`

---

## 📊 Estructura de la Aplicación Actualizada

```
Flujo de Usuario Nuevo (Registro)
────────────────────────────────────────
1. auth.html (registro)
   ↓ crea user + tenant
2. select.html (selector)
   ↓ elige Dashboard + PIN
3. dashboard.html
   ↓ click "Conectar WhatsApp"
4. whatsapp-connect.html ✅ (ANTES: onboarding.html)
   ↓ escanea QR, conecta WhatsApp
5. dashboard.html
   → Configurar menú/mensajes
```

```
Flujo de Usuario Existente (Login)
────────────────────────────────────────
1. auth.html (login)
   ↓ lee user + tenant
2. select.html (selector)
   ↓ elige Dashboard + PIN
3. dashboard.html
   → Todo ya configurado ✅
```

---

## 🧪 Pruebas Requeridas

### 1. Conectar WhatsApp (Primera Vez)
- [ ] Login → Dashboard
- [ ] Click en botón "Conectar WhatsApp"
- [ ] **Verifica que redirige a `/whatsapp-connect`**
- [ ] Verifica que muestra página con QR
- [ ] Escanea QR y conecta WhatsApp
- [ ] Verifica que regresa al dashboard

### 2. Reconectar WhatsApp
- [ ] Dashboard con WhatsApp conectado
- [ ] Click en "Desconectar WhatsApp"
- [ ] **Verifica que redirige a `/whatsapp-connect`**
- [ ] Reconecta WhatsApp
- [ ] Verifica que datos NO se sobrescribieron

### 3. URLs Limpias
- [ ] Acceder a `https://kdsapp.site/whatsapp-connect`
- [ ] Verificar que funciona (sin .html)
- [ ] Verificar que parámetros funcionan: `?tenant=xxx`

### 4. Acceso Directo
- [ ] Acceder a `https://kdsapp.site/whatsapp-connect.html`
- [ ] Verificar que funciona (con .html)

---

## 📦 Archivos Modificados

| Archivo | Tipo de cambio |
|---------|---------------|
| `onboarding.html` → `whatsapp-connect.html` | Renombre (git mv) |
| `dashboard.html` | 3 referencias actualizadas |
| `server/index.js` | 3 referencias actualizadas |
| `firebase.json` | 1 regla de rewrite actualizada |

---

## 🚀 Deploy

### Checklist de Deploy

- [ ] Commit del renombre y cambios
- [ ] Push a GitHub
- [ ] Deploy en Firebase Hosting
- [ ] Deploy en Railway (backend)
- [ ] Probar URLs en producción
- [ ] Verificar que funciona el flujo completo

### Comandos

```bash
# Commit
git add -A
git commit -m "refactor: renombrar onboarding.html a whatsapp-connect.html

- Mayor claridad sobre la funcionalidad real del archivo
- Solo se encarga de conectar WhatsApp, no es un onboarding completo
- Actualizar todas las referencias en dashboard.html, server/index.js y firebase.json
- Mejorar coherencia y mantenibilidad del código"

# Push
git push origin main

# Deploy Frontend
firebase deploy --only hosting

# Deploy Backend (si es necesario)
# Railway auto-deploys desde GitHub
```

---

## 📝 Notas Importantes

### Retrocompatibilidad

**¿Qué pasa con usuarios que tengan `/onboarding` guardado?**
- ⚠️ Los links antiguos `/onboarding` **dejarán de funcionar** después del deploy
- ✅ Los usuarios acceden desde el dashboard, así que NO hay problema
- ✅ No hay bookmarks externos al archivo

**Si necesitas mantener retrocompatibilidad:**
Puedes agregar un redirect en `firebase.json`:
```json
{
  "source": "/onboarding",
  "destination": "/whatsapp-connect",
  "type": 301
}
```

### Documentación Legacy

Los archivos de documentación (`.md`) **no se modificaron** en este commit:
- Siguen mencionando "onboarding.html"
- Esto es intencional para mantener el historial
- Pueden actualizarse en un commit futuro si es necesario

---

## ✅ Resultado Final

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Nombre del archivo** | onboarding.html | whatsapp-connect.html ✅ |
| **Claridad** | ❌ Confuso | ✅ Descriptivo |
| **Coherencia** | ❌ No refleja función | ✅ Refleja función exacta |
| **Mantenibilidad** | ❌ Ambiguo | ✅ Obvio para otros devs |
| **Funcionalidad** | ✅ Funciona | ✅ Funciona igual |

---

**Estado:** ✅ COMPLETADO  
**Pendiente:** Deploy a producción y pruebas
