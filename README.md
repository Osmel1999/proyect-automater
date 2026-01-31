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

# Pagos (opcional)
WOMPI_PUBLIC_KEY=...
WOMPI_PRIVATE_KEY=...
```

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
| `docs/AUTO-RECONNECTION-SYSTEM.md` | Sistema de reconexión WhatsApp |
| `docs/HUMANIZACION-*.md` | Configuración de mensajes |
| `Integracion-Multi-Gateway/README.md` | Sistema de pagos |

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
