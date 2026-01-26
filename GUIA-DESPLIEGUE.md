# 🚀 GUÍA DE DESPLIEGUE - PRODUCCIÓN

**Fecha:** 23 de Enero de 2026  
**Versión:** 1.0  
**Status:** En progreso...

---

## 📋 CHECKLIST PRE-DESPLIEGUE

### ✅ Verificaciones Completadas
- [x] Firebase CLI instalado
- [x] Railway CLI instalado
- [x] firebase.json configurado
- [x] railway.json configurado
- [x] Dockerfile presente
- [x] .env con variables correctas
- [ ] Variables de producción en Railway
- [ ] Dominio configurado (opcional)

---

## 🎯 ARQUITECTURA DE DESPLIEGUE

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIOS FINALES                     │
│           (Restaurantes + Clientes WhatsApp)           │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
┌──────────────────┐  ┌──────────────────────┐
│ FIREBASE HOSTING │  │   RAILWAY BACKEND    │
│   (Frontend)     │  │   (Node.js + Bot)    │
│                  │  │                      │
│ • dashboard.html │  │ • server/index.js    │
│ • kds.html       │  │ • bot-logic.js       │
│ • *.html/css/js  │  │ • payment-service.js │
└────────┬─────────┘  └──────────┬───────────┘
         │                       │
         │                       │
         ▼                       ▼
┌──────────────────────────────────────────┐
│        FIREBASE REALTIME DATABASE        │
│   • tenants/                             │
│   • pedidos/                             │
│   • paymentConfigs/                      │
└──────────────────────────────────────────┘
```

---

## 🔧 PASO 1: PREPARAR VARIABLES DE ENTORNO

### Backend (Railway)

Variables necesarias en Railway:

```bash
# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Puerto
PORT=3000

# Wompi (Sandbox/Producción)
WOMPI_PUBLIC_KEY=pub_stagtest_xxx  # Cambiar a prod_xxx en producción
WOMPI_PRIVATE_KEY=prv_stagtest_xxx  # Cambiar a prv_prod_xxx en producción
WOMPI_EVENTS_SECRET=stagtest_events_xxx  # Cambiar a prod_events_xxx en producción

# Encriptación de pagos
PAYMENT_ENCRYPTION_KEY=your-32-char-encryption-key-here

# WhatsApp/Meta (si aplica)
# Solo si usas API oficial de Meta
```

**⚠️ IMPORTANTE:** 
- NO subir .env al repositorio
- Usar variables de entorno de Railway
- Regenerar PAYMENT_ENCRYPTION_KEY para producción

---

## 🚀 PASO 2: DESPLEGAR BACKEND A RAILWAY

### Opción A: Desde GitHub (Recomendado)

1. **Push código a GitHub:**
```bash
git add .
git commit -m "feat: Sistema de pagos multi-gateway listo para producción"
git push origin main
```

2. **Conectar Railway con GitHub:**
   - Ve a https://railway.app
   - Click "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Selecciona tu repositorio
   - Railway detectará automáticamente el Dockerfile

3. **Configurar variables de entorno:**
   - En Railway → Project → Variables
   - Agregar todas las variables mencionadas arriba

4. **Desplegar:**
   - Railway desplegará automáticamente
   - Obtendrás una URL: `https://your-app.up.railway.app`

### Opción B: Desde CLI (Manual)

```bash
# 1. Login a Railway
railway login

# 2. Inicializar proyecto
railway init

# 3. Link a proyecto existente (si ya existe)
railway link

# 4. Configurar variables de entorno
railway variables set FIREBASE_PROJECT_ID="your-project-id"
railway variables set PORT="3000"
# ... agregar todas las variables

# 5. Desplegar
railway up
```

---

## 🌐 PASO 3: DESPLEGAR FRONTEND A FIREBASE HOSTING

### 1. Login a Firebase
```bash
firebase login
```

### 2. Inicializar proyecto (si no está inicializado)
```bash
firebase init hosting
# Seleccionar:
# - Use existing project
# - Public directory: . (punto, directorio actual)
# - Single-page app: No
# - Don't overwrite existing files
```

### 3. Actualizar config.js con URL de Railway

Editar `/config.js`:
```javascript
// Cambiar localhost por URL de Railway
const API_BASE_URL = 'https://your-app.up.railway.app';
```

### 4. Desplegar a Firebase Hosting
```bash
firebase deploy --only hosting
```

### 5. Obtener URL
```
✓ Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project/overview
Hosting URL: https://your-project.web.app
```

---

## 🔗 PASO 4: CONFIGURAR WEBHOOKS DE PAGOS

### Wompi Webhook

1. **Ir a Wompi Dashboard:**
   - Sandbox: https://dashboard-sandbox.wompi.co
   - Producción: https://dashboard.wompi.co

2. **Configurar webhook:**
   - Sección "Webhooks"
   - URL: `https://your-app.up.railway.app/api/payments/webhook`
   - Eventos a escuchar:
     - ✅ `transaction.updated`
     - ✅ `transaction.approved`
     - ✅ `transaction.declined`

3. **Guardar Events Secret:**
   - Copiar el Events Secret
   - Agregarlo a Railway: `WOMPI_EVENTS_SECRET`

---

## 🧪 PASO 5: VERIFICAR DESPLIEGUE

### Backend Health Check
```bash
curl https://your-app.up.railway.app/health
# Respuesta esperada: {"status":"ok","timestamp":"..."}
```

### Frontend
```bash
# Abrir en navegador
open https://your-project.web.app
```

### Test completo de pagos

1. **Configurar gateway en dashboard:**
   - Ir a: https://your-project.web.app/dashboard
   - Click "Configurar Pagos"
   - Ingresar credenciales de Wompi
   - Validar y guardar

2. **Test con WhatsApp:**
   - Enviar mensaje al bot
   - Hacer un pedido
   - Elegir "tarjeta"
   - Verificar que se genera enlace de pago

3. **Test de webhook:**
   - Usar tarjeta de prueba en Wompi
   - Verificar que el estado del pedido cambia en Firebase

---

## 📊 PASO 6: MONITOREO POST-DESPLIEGUE

### Railway Logs
```bash
railway logs
# O en web: https://railway.app/project/your-project/logs
```

### Firebase Hosting Logs
```bash
firebase hosting:channel:list
```

### Verificar Firebase Database
- Console: https://console.firebase.google.com
- Realtime Database → Data
- Verificar estructura de `paymentConfigs/`

---

## 🔐 SEGURIDAD POST-DESPLIEGUE

### Checklist de seguridad:

- [ ] HTTPS habilitado (Railway y Firebase lo hacen por defecto)
- [ ] Variables de entorno NO en código
- [ ] Firebase Rules actualizadas
- [ ] CORS configurado correctamente
- [ ] Rate limiting activo
- [ ] Webhook signatures validadas
- [ ] Credenciales de pago encriptadas en Firebase
- [ ] Logs sin información sensible

---

## 🎯 URLs FINALES

### Frontend (Firebase Hosting)
```
🌐 App: https://your-project.web.app
📊 Dashboard: https://your-project.web.app/dashboard
🍔 KDS: https://your-project.web.app/kds
```

### Backend (Railway)
```
🚀 API: https://your-app.up.railway.app
📝 Health: https://your-app.up.railway.app/health
💳 Webhook: https://your-app.up.railway.app/api/payments/webhook
```

---

## 📝 SIGUIENTES PASOS

1. [ ] Cambiar Wompi de sandbox a producción
2. [ ] Configurar dominio personalizado
3. [ ] Agregar monitoring (Sentry, LogRocket)
4. [ ] Configurar backups automáticos de Firebase
5. [ ] Probar con restaurantes piloto
6. [ ] Documentar para usuarios finales

---

## 🆘 TROUBLESHOOTING

### Error: "Cannot connect to backend"
- Verificar que Railway esté en running
- Verificar CORS en server/index.js
- Verificar URL en config.js

### Error: "Payment webhook signature invalid"
- Verificar WOMPI_EVENTS_SECRET en Railway
- Verificar que coincida con Wompi Dashboard

### Error: "Firebase permission denied"
- Actualizar database.rules.json
- Verificar que el service account tenga permisos

---

## ✅ RESULTADO DEL DESPLIEGUE

### 🎉 DESPLIEGUE COMPLETADO EXITOSAMENTE

**Backend (Railway):**
- ✅ Build Time: 39.80 segundos
- ✅ Deploy: Exitoso
- ✅ URL: https://api.kdsapp.site
- ✅ Health Check: Passing
- ✅ Variables de entorno: 10+ configuradas

**Frontend (Firebase Hosting):**
- ✅ Deploy Time: ~2 minutos
- ✅ Archivos subidos: 96 nuevos / 2912 total
- ✅ URL: https://kds-app-7f1d3.web.app
- ✅ Status: Activo

**Verificación:**
```bash
# Backend health check
curl https://api.kdsapp.site/health
# ✅ {"status":"ok","timestamp":"2026-01-23T19:24:15.240Z"}

# Frontend
open https://kds-app-7f1d3.web.app
# ✅ Cargando correctamente
```

**Próximos Pasos:**
1. ✅ Configurar webhooks en Wompi sandbox
2. ✅ Testing end-to-end
3. 🔄 Cambiar a producción (credenciales reales)
4. 🚀 Lanzamiento con piloto

---

**Status:** ✅ **COMPLETADO - EN PRODUCCIÓN (SANDBOX MODE)**  
**Última actualización:** 23 de Enero de 2026  
**Documento de resumen:** Ver `DESPLIEGUE-COMPLETADO.md`
