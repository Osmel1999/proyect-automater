# 🗺️ NAVEGACIÓN RÁPIDA - KDS Webapp

## 🎯 ¿QUÉ ESTÁS BUSCANDO?

---

### 💳 **Sistema de Pagos (Wompi)**

**👉 Empezar aquí:** `Integracion-Wompi/README.md`

**Preguntas frecuentes:**
- ¿Cómo funciona? → `Integracion-Wompi/RESPUESTA-WOMPI-SPLIT-PAYMENT.md`
- ¿Cómo implementar? → `Integracion-Wompi/SOLUCION-WOMPI-MARKETPLACE.md`
- ¿Por qué Wompi? → `Integracion-Wompi/ANALISIS-OPCIONES-PAGO.md`
- ¿Costos? → `Integracion-Wompi/RESPUESTA-WOMPI-SPLIT-PAYMENT.md` (sección Costos)

---

### 📱 **Bot WhatsApp (Baileys)**

**👉 Empezar aquí:** `MIGRACION-BAILEYS-COMPLETADA.md`

**Archivos clave:**
- Backend: `server/`
- Onboarding: `onboarding.html`
- Tests: `test-fase*.js`

---

### 📊 **Estado del Proyecto**

**👉 Ver:** `ESTADO-PROYECTO.md`

**Resumen:**
- ✅ Bot WhatsApp funcional
- ✅ Análisis de pagos completo
- 🔄 Implementación Wompi pendiente

---

### 🏗️ **Arquitectura y Diseño**

**Pagos:**
- `Integracion-Wompi/ARQUITECTURA-PAGOS-SAAS.md`

**Bot:**
- `docs/ARQUITECTURA.md`

---

### 💻 **Implementación y Código**

**Backend Wompi:**
- `Integracion-Wompi/SOLUCION-WOMPI-MARKETPLACE.md` (línea 100+)

**Backend Baileys:**
- `server/baileys-service.js`
- `server/api-routes.js`

**Frontend:**
- Dashboard: `dashboard.html`
- KDS: `kds.html`
- Onboarding: `onboarding.html`

---

### 📚 **Documentación Completa**

**Índice maestro:**
- `README.md` (índice principal)
- `Integracion-Wompi/README.md` (índice de pagos)
- `ESTADO-PROYECTO.md` (estado actual)

---

### 🚀 **Deploy y Producción**

**Checklist:**
- `CHECKLIST-DEPLOY-PRODUCCION.md`

**Scripts:**
- `scripts/commit-baileys-migration.sh`
- `scripts/verify-baileys-migration.sh`

---

### 🔍 **Buscar por Tema**

| Tema | Archivo |
|------|---------|
| **Split Payment** | `Integracion-Wompi/SOLUCION-WOMPI-MARKETPLACE.md` |
| **Webhook Wompi** | `Integracion-Wompi/SOLUCION-WOMPI-MARKETPLACE.md` (línea 400+) |
| **Onboarding restaurante** | `Integracion-Wompi/SOLUCION-WOMPI-MARKETPLACE.md` (línea 100+) |
| **QR WhatsApp** | `onboarding.html` |
| **API endpoints** | `server/api-routes.js` |
| **Baileys events** | `server/baileys-service.js` |
| **Costos Wompi** | `Integracion-Wompi/RESPUESTA-WOMPI-SPLIT-PAYMENT.md` |
| **Comparativa pagos** | `Integracion-Wompi/ANALISIS-OPCIONES-PAGO.md` |
| **Nequi limitaciones** | `Integracion-Wompi/ANALISIS-LIMITACION-NEQUI-API.md` |
| **Anti-fraude** | `Integracion-Wompi/VALIDACION-AUTENTICIDAD-CAPTURAS.md` |

---

### 🎯 **Flujo de Lectura Recomendado**

#### Para entender TODO el proyecto:
1. `README.md` (5 min)
2. `ESTADO-PROYECTO.md` (5 min)
3. `MIGRACION-BAILEYS-COMPLETADA.md` (10 min)
4. `Integracion-Wompi/README.md` (10 min)

**Total: 30 minutos**

---

#### Para implementar Wompi:
1. `Integracion-Wompi/RESPUESTA-WOMPI-SPLIT-PAYMENT.md` (5 min)
2. `Integracion-Wompi/SOLUCION-WOMPI-MARKETPLACE.md` (20 min)
3. Registrarte en Wompi Marketplace
4. Implementar código del paso 2

**Total: 1-2 días**

---

#### Para entender el Bot WhatsApp:
1. `MIGRACION-BAILEYS-COMPLETADA.md` (10 min)
2. `server/baileys-service.js` (15 min)
3. `onboarding.html` (10 min)
4. Probar localmente

**Total: 1-2 horas**

---

### 📞 **Ayuda y Soporte**

**Dudas sobre pagos:**
- Lee: `Integracion-Wompi/README.md`
- Busca en: `Integracion-Wompi/ANALISIS-OPCIONES-PAGO.md`

**Dudas sobre WhatsApp:**
- Lee: `MIGRACION-BAILEYS-COMPLETADA.md`
- Revisa: `server/baileys-service.js`

**Dudas sobre arquitectura:**
- Lee: `ESTADO-PROYECTO.md`
- Revisa: `docs/ARQUITECTURA.md`

---

### 🏆 **Archivos Más Importantes**

1. ⭐⭐⭐ `README.md` - Índice principal
2. ⭐⭐⭐ `Integracion-Wompi/README.md` - Índice de pagos
3. ⭐⭐⭐ `ESTADO-PROYECTO.md` - Estado actual
4. ⭐⭐ `Integracion-Wompi/SOLUCION-WOMPI-MARKETPLACE.md` - Implementación
5. ⭐⭐ `MIGRACION-BAILEYS-COMPLETADA.md` - Bot WhatsApp
6. ⭐ `Integracion-Wompi/ANALISIS-OPCIONES-PAGO.md` - Comparativa

---

### 📁 **Estructura de Carpetas**

```
kds-webapp/
├── Integracion-Wompi/        ← 💳 Todo sobre pagos
├── server/                   ← 💻 Backend
├── docs/                     ← 📚 Arquitectura
├── scripts/                  ← 🛠️ Scripts útiles
├── archive_20260115/         ← 📦 Archivos viejos
└── *.html                    ← 🎨 Frontend
```

---

### ⚡ **Acceso Ultra-Rápido**

**¿Qué hace el split payment?**
→ `Integracion-Wompi/RESPUESTA-WOMPI-SPLIT-PAYMENT.md` línea 20-50

**¿Código de Wompi?**
→ `Integracion-Wompi/SOLUCION-WOMPI-MARKETPLACE.md` línea 150-300

**¿Costos Wompi?**
→ `Integracion-Wompi/RESPUESTA-WOMPI-SPLIT-PAYMENT.md` línea 60-100

**¿Por qué no Nequi?**
→ `Integracion-Wompi/ANALISIS-LIMITACION-NEQUI-API.md`

**¿Setup WhatsApp?**
→ `onboarding.html`

**¿API endpoints?**
→ `server/api-routes.js`

---

**Última actualización:** 22 de enero de 2026  
**Tip:** Usa Ctrl+F para buscar en este archivo 🔍
