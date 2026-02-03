# KDS WhatsApp Bot

**Sistema de pedidos por WhatsApp para restaurantes**

![Version](https://img.shields.io/badge/version-2.0-blue)
![Status](https://img.shields.io/badge/status-production-green)

---

## Descripción

KDS (Kitchen Display System) es una webapp completa para gestión de pedidos de restaurantes a través de WhatsApp. Incluye bot automatizado, panel de administración, display de cocina y sistema de pagos integrado.

---

## Estructura del Proyecto

```
kds-webapp/
├── Frontend
│   ├── index.html          # Landing page
│   ├── auth.html           # Autenticación
│   ├── select.html         # Selección de restaurante
│   ├── dashboard.html      # Panel de administración
│   ├── kds.html            # Display de cocina
│   ├── whatsapp-connect.html # Conexión WhatsApp
│   ├── payment-success.html  # Confirmación de pago
│   ├── privacy-policy.html   # Política de privacidad
│   └── terms.html            # Términos de servicio
│
├── CSS (Sistema de diseño moderno)
│   ├── index-modern.css    # Landing
│   ├── auth-modern.css     # Autenticación
│   ├── select-modern.css   # Selección
│   ├── dashboard.css       # Dashboard
│   ├── kds-modern.css      # KDS
│   ├── whatsapp-connect.css # Conexión WhatsApp
│   ├── success-modern.css  # Páginas de éxito
│   ├── legal-modern.css    # Páginas legales
│   └── animations.css      # Animaciones reutilizables
│
├── JavaScript
│   ├── auth.js             # Autenticación Firebase
│   ├── select.js           # Lógica de selección
│   ├── dashboard.js        # Panel de control
│   ├── kds.js              # Display de cocina
│   ├── whatsapp-connect.js # Conexión WhatsApp
│   └── payment-success.js  # Confirmación de pago
│
├── Backend (server/)
│   ├── index.js            # Servidor principal
│   ├── routes/             # API endpoints
│   └── services/           # Lógica de negocio
│
├── Documentación (docs/)
│   ├── QUICK-START.md              # Guía rápida
│   ├── AUTO-RECONNECTION-SYSTEM.md # Sistema de reconexión
│   ├── HUMANIZACION-*.md           # Mensajes humanizados
│   └── ESTADO-REDISENO-COMPLETO.md # Registro de cambios
│
├── Scripts (scripts/)
│   └── Utilidades de administración
│
└── Integraciones
    ├── Integracion-Multi-Gateway/  # Pagos multi-gateway
    └── Integracion-Wompi/          # Wompi específico
```

---

## Características

### Frontend
- Sistema de diseño moderno y minimalista
- Paleta de colores profesional (#F97316 naranja, #1E3A5F azul marino)
- Tipografía Inter
- Diseño 100% responsive (móvil, tablet, desktop)
- Animaciones sutiles y elegantes
- Iconos SVG inline

### Bot WhatsApp (Baileys)
- Conexión vía código QR
- Reconexión automática
- Mensajes humanizados
- Soporte para texto, imágenes, ubicación
- Persistencia de sesiones
- **🌐 Sistema de Túnel: IP real del restaurante (anti-ban, $0 costo)**

### Sistema Anti-Ban Inteligente
- **Túnel de Navegador** (Prioridad 1): Usa IP real del restaurante cuando el navegador está abierto
- **Proxy Opcional** (Prioridad 2): Fallback a proxy si está configurado
- **Conexión Directa** (Prioridad 3): Fallback final si no hay túnel ni proxy
- **$0 costo operativo** con sistema de túnel
- **Fallback automático** entre estrategias

### Pagos
- Multi-gateway: Wompi, Bold, PayU, MercadoPago
- Dinero directo a cuenta del restaurante
- Validación automática vía webhook
- Modelo SaaS (mensualidad fija)

---

## Inicio Rápido

### Requisitos
- Node.js 18+
- Firebase (Realtime Database)
- Cuenta WhatsApp Business

### Instalación

```bash
# Clonar e instalar
cd kds-webapp
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar desarrollo
npm run dev
```

### Variables de Entorno

```env
# Firebase
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_DATABASE_URL=...

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions

# Sistema Anti-Ban (opcional - túnel funciona sin estas variables)
ENABLE_PROXY=false              # false = usar solo túnel y conexión directa
PROXY_TYPE=isp                  # isp, residential, datacenter (si ENABLE_PROXY=true)
PROXY_LIST=socks5://...         # URL del proxy (si ENABLE_PROXY=true)

# Pagos (opcional)
WOMPI_PUBLIC_KEY=...
WOMPI_PRIVATE_KEY=...
```

**Nota:** El sistema de túnel funciona automáticamente sin configuración adicional. Los proxies son opcionales como fallback.

---

## Deploy

### Railway (recomendado)

```bash
railway login
railway up
```

Configurar variables de entorno en el dashboard de Railway.

### Docker

```bash
docker build -t kds-webapp .
docker run -p 3000:3000 kds-webapp
```

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| `docs/QUICK-START.md` | Guía de inicio rápido |
| `docs/TUNNEL-IMPLEMENTATION.md` | Sistema de túnel (IP real del restaurante) |
| `docs/MIGRACION-BRIGHT-DATA-A-TUNNEL.md` | Migración desde Bright Data |
| `docs/AUTO-RECONNECTION-SYSTEM.md` | Sistema de reconexión WhatsApp |
| `docs/HUMANIZACION-*.md` | Configuración de mensajes |
| `Integracion-Multi-Gateway/README.md` | Sistema de pagos |

---

## Sistema de Túnel 🌐

El sistema utiliza un **túnel de navegador** innovador que permite:

- ✅ **IP real del restaurante** (no compartida)
- ✅ **$0 costo operativo** (elimina necesidad de proxies pagados)
- ✅ **Máximo anti-ban** (WhatsApp ve IP del negocio)
- ✅ **Sin instalación** (solo mantener navegador abierto)
- ✅ **Fallback automático** (sigue funcionando si se cierra navegador)

### ¿Cómo funciona?

1. Restaurante abre dashboard/KDS en su tablet
2. Service Worker establece túnel WebSocket con servidor
3. WhatsApp se conecta a través del túnel
4. **WhatsApp ve la IP real del restaurante** 🎉

Ver documentación completa en `docs/TUNNEL-IMPLEMENTATION.md`

---

## Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript vanilla
- **Backend:** Node.js, Express
- **Base de datos:** Firebase Realtime Database
- **WhatsApp:** Baileys (biblioteca WebSocket)
- **Pagos:** Wompi, Bold, PayU
- **Deploy:** Railway, Docker

---

## Licencia

Proyecto privado. Todos los derechos reservados.

---

## Contacto

Para soporte o consultas, contactar al equipo de desarrollo.
