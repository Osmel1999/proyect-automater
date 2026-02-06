# 🍔 KDS WhatsApp Bot

**Sistema SaaS de pedidos por WhatsApp para restaurantes**

[![Version](https://img.shields.io/badge/version-2.0-blue)](https://github.com)
[![Status](https://img.shields.io/badge/status-production-green)](https://github.com)
[![Node](https://img.shields.io/badge/node-18.x-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-proprietary-red)](LICENSE)

---

## 📋 Descripción

**KDS (Kitchen Display System)** es una plataforma SaaS completa para la gestión automatizada de pedidos de restaurantes a través de WhatsApp. El sistema incluye bot inteligente, panel de administración multi-tenant, display de cocina en tiempo real y sistema de pagos integrado.

### ✨ Características Principales

- 🤖 **Bot WhatsApp Automatizado** con Baileys (WhatsApp Web API)
- 📊 **Panel de Administración** multi-tenant con estadísticas en tiempo real
- 🍳 **Display de Cocina (KDS)** con actualización instantánea vía WebSocket
- 💳 **Sistema de Pagos** integrado con Wompi (Colombia)
- 👥 **Multi-tenant** - soporte para múltiples restaurantes
- 🔐 **Autenticación Firebase** con roles de usuario
- 🔄 **Persistencia de Sesiones WhatsApp** en Firebase Realtime Database
- 🩺 **Auto-reconexión** y health monitoring
- 📱 **Responsive Design** - funciona en desktop, tablet y móvil
- 🎯 **Humanización de Mensajes** - delays naturales y estados de escritura

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

**Frontend:**
- HTML5, CSS3 (diseño moderno con animaciones)
- JavaScript ES6+ (vanilla, sin frameworks)
- Firebase SDK (Authentication + Realtime Database)
- Socket.IO Client (actualizaciones en tiempo real)

**Backend:**
- Node.js 18+ con Express.js
- Baileys (WhatsApp Web API no oficial)
- Firebase Admin SDK
- Socket.IO Server
- Pino (structured logging)

**Infraestructura:**
- Railway (hosting y deployment automático)
- Firebase Realtime Database (sesiones + datos)
- Wompi (pasarela de pagos Colombia)

### Arquitectura de Datos

```
Firebase Realtime Database:
├── tenants/
│   └── {tenantId}/
│       ├── config/              # Configuración del restaurante
│       ├── menu/                # Productos del menú
│       ├── orders/              # Pedidos
│       ├── baileys_session/     # Sesión WhatsApp (creds + keys)
│       ├── whatsapp_number/     # Número conectado
│       └── payment_settings/    # Configuración de pagos
├── users/
│   └── {userId}/
│       ├── profile/
│       ├── selectedTenant/
│       └── permissions/
└── payments/
    └── {transactionId}/
```

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- Node.js 18.x o superior
- npm o yarn
- Cuenta de Firebase
- Cuenta de Wompi (para pagos)
- Cuenta de Railway (para hosting)

### Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/kds-webapp.git
cd kds-webapp

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar servidor de desarrollo
npm start
```

### Variables de Entorno Requeridas

```env
# Puerto
PORT=3000

# Firebase
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com

# Wompi (Pasarela de Pagos)
WOMPI_PUBLIC_KEY=pub_prod_xxxxx
WOMPI_PRIVATE_KEY=prv_prod_xxxxx
WOMPI_INTEGRITY_SECRET=prod_integrity_xxxxx

# Seguridad
ENCRYPTION_KEY=tu-clave-secreta-aes256-minimo-32-caracteres
```

---

## 📦 Despliegue en Railway

El proyecto está configurado para deployment automático en Railway:

```bash
# Push a main dispara deployment automático
git push origin main
```

**Archivos de configuración:**
- `Procfile` - comando de inicio
- `railway.toml` - configuración de Railway
- `railway.json` - metadata del proyecto
- `Dockerfile` - containerización (opcional)

---

## 🔐 Arquitectura de Sesiones WhatsApp

Las sesiones de Baileys se persisten en **Firebase Realtime Database** para sobrevivir deploys:

```
/tenants/{tenantId}/baileys_session/
├── creds.json                    # Credenciales Signal/E2E
├── app-state-sync-key-*.json     # Keys de sincronización
└── app-state-sync-version-*.json # Versiones de estado
```

### Características Clave

✅ **Auto-reconexión tras deploys** - no requiere escanear QR nuevamente  
✅ **Serialización correcta** - uso de `BufferJSON.replacer/reviver`  
✅ **Backoff exponencial** - reintentos inteligentes con delays crecientes  
✅ **Health monitoring** - heartbeat cada 2 minutos para detectar caídas  
✅ **Seguridad** - logs de libsignal silenciados para evitar fuga de claves  

---

## 📂 Estructura del Proyecto

```
kds-webapp/
├── server/                      # Backend Node.js
│   ├── baileys/                # Integración WhatsApp
│   │   ├── index.js           # BaileysService principal
│   │   ├── session-manager.js # Gestión de sesiones
│   │   ├── session-hydrator.js# Hidratación desde Firebase
│   │   ├── storage.js         # Persistencia en Firebase
│   │   ├── connection-manager.js # Auto-reconexión
│   │   └── event-handlers.js  # Handlers de eventos
│   ├── routes/                 # API Endpoints
│   ├── controllers/            # Lógica de negocio
│   ├── websocket/              # Socket.IO handlers
│   ├── tenant-service.js       # Gestión de tenants
│   ├── notification-service.js # Notificaciones
│   └── index.js               # Entry point del servidor
├── js/                         # JavaScript frontend
│   ├── auth.js                # Autenticación
│   ├── dashboard.js           # Panel de control
│   ├── kds.js                 # Display de cocina
│   └── whatsapp-connect.js    # Conexión WhatsApp
├── css/                        # Estilos modernos
│   ├── index-modern.css       # Landing
│   ├── dashboard.css          # Dashboard
│   ├── kds-modern.css         # KDS
│   └── animations.css         # Animaciones
├── scripts/                    # Scripts de utilidad
│   ├── init-firebase-structure.js
│   ├── init-user-structure.js
│   └── verificar-tenant-config.js
├── assets/                     # Imágenes y recursos
├── *.html                      # Páginas de la aplicación
├── package.json
├── Dockerfile
└── railway.toml
```

---

## 🛠️ Scripts Útiles

```bash
# Inicializar estructura completa de Firebase
node scripts/init-firebase-structure.js

# Inicializar estructura de un tenant específico
node scripts/init-user-structure.js

# Verificar configuración de tenant
node scripts/verificar-tenant-config.js
```

---

## 🔧 Configuración de Firebase

### 1. Crear Proyecto Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear nuevo proyecto
3. Habilitar **Authentication** (Email/Password)
4. Habilitar **Realtime Database**

### 2. Configurar Reglas de Seguridad

Las reglas están en `database.rules.json`. Desplegarlas con:

```bash
firebase deploy --only database
```

### 3. Obtener Credenciales

1. Project Settings → Service Accounts
2. Generate New Private Key
3. Copiar valores a `.env`

---

## 📱 Funcionalidades del Bot

### Comandos del Cliente

- **Hacer pedido** - cliente envía texto libre con productos
- **Confirmar dirección** - bot solicita y valida dirección
- **Consultar estado** - seguimiento de pedido en tiempo real
- **Cancelar pedido** - antes de confirmación

### Comandos del Administrador

- `/menu` - Mostrar menú completo
- `/estado` - Estado de pedidos activos
- `/ayuda` - Lista de comandos

### Características del Bot

- ✅ Procesamiento de lenguaje natural
- ✅ Humanización con delays y estados de escritura
- ✅ Confirmación de pedidos
- ✅ Integración con sistema de pagos
- ✅ Notificaciones automáticas
- ✅ Manejo de errores robusto

---

## 💳 Integración de Pagos

### Wompi (Colombia)

El sistema soporta pagos con tarjeta, PSE, Nequi y Bancolombia:

1. Cliente confirma pedido por WhatsApp
2. Bot genera link de pago Wompi
3. Cliente completa pago
4. Webhook confirma transacción
5. Pedido se marca como pagado
6. Notificación automática al restaurante

**Configuración:**
- Variables `WOMPI_*` en `.env`
- Webhook URL configurado en dashboard Wompi
- Endpoint: `POST /api/payments/webhook`

---

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén disponibles)
npm test

# Verificar sesión de WhatsApp
curl http://localhost:3000/api/baileys/status

# Verificar health del servidor
curl http://localhost:3000/health
```

---

## 🐛 Troubleshooting

### Problema: WhatsApp no conecta después de deploy

**Solución:**
1. Verificar que las credenciales estén en Firebase
2. Revisar logs de Railway: `railway logs`
3. Verificar que `FIREBASE_*` env vars estén correctas
4. Si persiste, re-escanear QR desde `/whatsapp-connect.html`

### Problema: Pagos no se confirman

**Solución:**
1. Verificar webhook en dashboard Wompi
2. Revisar logs del endpoint `/api/payments/webhook`
3. Validar `WOMPI_INTEGRITY_SECRET`
4. Verificar que la transacción esté en Firebase

### Problema: Sesiones se caen cada 2 horas

**Solución:**
- Verificar heartbeat en logs (cada 2 min)
- Revisar `connection-manager.js` logs
- Validar que Firebase Realtime DB esté accesible
- Verificar límites de Railway (no sleeping)

---

## 📊 Monitoreo y Logs

### Logs Estructurados (Pino)

```javascript
// Los logs incluyen:
[timestamp] [level] [hostname] [pid] message
```

### Ver logs en Railway

```bash
railway logs --tail
```

### Métricas Importantes

- ✅ Estado de sesiones WhatsApp (heartbeat cada 2 min)
- ✅ Tasa de procesamiento de mensajes
- ✅ Transacciones de pago exitosas/fallidas
- ✅ Errores de conexión y reconexión

---

## 🔒 Seguridad

- 🔐 Credenciales encriptadas con AES-256
- 🔐 Claves criptográficas de Signal/E2E silenciadas en logs
- 🔐 Firebase Security Rules aplicadas
- 🔐 Validación de webhooks con HMAC
- 🔐 Rate limiting en endpoints sensibles
- 🔐 CORS configurado correctamente

---

## 📄 Licencia

**Propietario** - Uso interno únicamente.

Todos los derechos reservados. No se permite el uso, copia, modificación o distribución sin autorización expresa.

---

## 👥 Soporte y Contacto

Para consultas, reportar bugs o solicitar nuevas funcionalidades, contactar al equipo de desarrollo.

---

## 🗺️ Roadmap

- [ ] Tests automatizados (Jest + Supertest)
- [ ] Panel de analytics avanzado
- [ ] Soporte para más pasarelas de pago
- [ ] App móvil nativa (React Native)
- [ ] API REST pública con documentación OpenAPI
- [ ] Sistema de plantillas de mensajes personalizables
- [ ] Integración con sistemas POS externos

---

**Desarrollado con ❤️ para restaurantes modernos**
