# Limpieza de Archivos - 30 de Enero 2026

## Resumen

Se realizó una limpieza de archivos redundantes y se consolidó la experiencia de conexión WhatsApp.

---

## Archivos Eliminados

### 1. `landing.html`
- **Motivo**: Duplicado de `index.html` que ya fue modernizado
- **Estado**: Eliminado ✅
- **Backup**: `backups-eliminados/landing.html`

### 2. `diagnose.html`
- **Motivo**: Herramienta de diagnóstico que no debe estar en producción
- **Estado**: Eliminado ✅
- **Backup**: `backups-eliminados/diagnose.html`

### 3. `kds-diagnose.html`
- **Motivo**: Herramienta de diagnóstico que no debe estar en producción
- **Estado**: Eliminado ✅
- **Backup**: `backups-eliminados/kds-diagnose.html`

### 4. `whatsapp-connect.html` (antiguo)
- **Motivo**: Reemplazado por versión modernizada de onboarding
- **Estado**: Eliminado ✅
- **Backup**: `backups-eliminados/whatsapp-connect-old.html`

---

## Archivos Renombrados

### `onboarding.html` → `whatsapp-connect.html`

**Archivos afectados:**
| Archivo Original | Archivo Nuevo |
|-----------------|---------------|
| `onboarding.html` | `whatsapp-connect.html` |
| `css/onboarding-modern.css` | `css/whatsapp-connect.css` |
| `js/onboarding.js` | `js/whatsapp-connect.js` |

**Backups creados:**
- `backups-eliminados/onboarding.html`
- `backups-eliminados/onboarding-modern.css`
- `backups-eliminados/onboarding.js`

---

## Referencias Actualizadas

### `firebase.json`
```json
{
  "source": "/onboarding",
  "destination": "/whatsapp-connect.html"  // ← Actualizado
}
```

### `server/index.js`
- Actualizado comentario de middleware
- Actualizado logs de URLs importantes
- `/landing.html` → `/index.html`
- Agregado `/whatsapp-connect.html`

### `README.md`
- Estructura del proyecto actualizada
- Referencias a `whatsapp-connect.html` en lugar de `onboarding.html`

---

## Archivos CSS Eliminados

| Archivo | Motivo |
|---------|--------|
| `css/onboarding.css` | Reemplazado por `css/whatsapp-connect.css` |
| `css/onboarding-old.css` | Backup antiguo no necesario |

**Nota**: `css/onboarding-success.css` se mantiene ya que es para `onboarding-success.html`

---

## Estructura Final

```
kds-webapp/
├── index.html              ← Página principal (modernizada)
├── auth.html               ← Autenticación (modernizada)
├── select.html             ← Selección de restaurante (modernizada)
├── dashboard.html          ← Panel del restaurante (modernizado)
├── kds.html                ← Display de cocina (modernizado)
├── whatsapp-connect.html   ← Conexión WhatsApp (modernizado, renombrado)
├── onboarding-success.html ← Éxito de conexión
├── payment-success.html    ← Éxito de pago
├── privacy-policy.html     ← Políticas de privacidad
├── terms.html              ← Términos de servicio
│
├── css/
│   ├── whatsapp-connect.css    ← Estilos WhatsApp Connect
│   ├── onboarding-success.css  ← Estilos éxito conexión
│   └── ... (otros CSS modernos)
│
├── js/
│   ├── whatsapp-connect.js     ← Lógica WhatsApp Connect
│   └── ... (otros JS)
│
└── backups-eliminados/     ← Backups de archivos eliminados
```

---

## Verificación

### Rutas que funcionan:
- `/` → `index.html` ✅
- `/whatsapp-connect` → `whatsapp-connect.html` ✅
- `/onboarding` → `whatsapp-connect.html` ✅ (redirect mantenido para compatibilidad)
- `/dashboard` → `dashboard.html` ✅
- `/kds` → `kds.html` ✅
- `/auth` → `auth.html` ✅
- `/select` → `select.html` ✅

### Archivos CSS/JS correctamente vinculados:
- `whatsapp-connect.html` → `css/whatsapp-connect.css` ✅
- `whatsapp-connect.html` → `js/whatsapp-connect.js` ✅

---

## Notas

1. La ruta `/onboarding` sigue funcionando y redirige a `whatsapp-connect.html` para compatibilidad con URLs antiguas

2. Los archivos de diagnóstico están en backup si se necesitan para desarrollo local

3. El nombre "whatsapp-connect" es más descriptivo que "onboarding" para el flujo de conexión de WhatsApp
