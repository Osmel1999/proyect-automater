# 🍔 Bot de Pedidos WhatsApp con IA - Sistema KDS

Sistema completo de pedidos por WhatsApp con reconocimiento de lenguaje natural, fuzzy matching y panel KDS (Kitchen Display System) para restaurantes.

[![Node.js](https://img.shields.io/badge/Node.js-24.2.0-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-blue.svg)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20DB-orange.svg)](https://firebase.google.com/)
[![Twilio](https://img.shields.io/badge/Twilio-WhatsApp%20API-red.svg)](https://www.twilio.com/)

---

## 🎯 Características Principales

### 🤖 Bot Inteligente con Fuzzy Matching
- ✅ **Lenguaje Natural:** "Quiero 2 hamburguesas y 3 coca colas"
- ✅ **Tolerante a errores:** Reconoce "jamburguesa", "serveza", "pitza mosarela"
- ✅ **Números pegados:** "2hamburguesas 3cervezas" funciona correctamente
- ✅ **Normalización fonética:** Maneja intercambios s/z, c/k, v/b, h/j
- ✅ **97.8% de precisión** en reconocimiento de pedidos

### 💰 Ahorro de Costos
- **67% menos mensajes** comparado con método tradicional
- **4 mensajes por pedido** vs 10+ mensajes anteriormente
- **Una sola confirmación** (eliminada confirmación duplicada)

### 🎨 Kitchen Display System (KDS)
- Panel en tiempo real para cocina
- Estados: Pendiente → En Preparación → Listo
- Tiempos de espera automáticos
- Notificaciones sonoras
- Responsive design

---

## 🚀 Instalación

### Requisitos Previos
- Node.js v20+ 
- Cuenta de Firebase (Realtime Database)
- Cuenta de Twilio (WhatsApp Business API)
- ngrok (para desarrollo local)

### 1. Clonar el repositorio
```bash
git clone <tu-repo>
cd kds-webapp
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crear archivo `.env`:
```env
# Twilio
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Firebase
FIREBASE_DATABASE_URL=https://tu-proyecto.firebaseio.com
```

### 4. Configurar Firebase Service Account
Coloca tu archivo `firebase-service-account.json` en `server/`

### 5. Iniciar el servidor
```bash
node server/index.js
```

### 6. Exponer con ngrok (desarrollo)
```bash
ngrok http 3000
```

Configura el webhook en Twilio con:
```
https://tu-url.ngrok.app/webhook/whatsapp
```

---

## 📱 Uso del Bot

### Comandos Básicos
| Comando | Descripción |
|---------|-------------|
| `hola` / `menu` | Muestra el menú completo |
| `ayuda` / `help` | Muestra ayuda completa |
| `ver` / `carrito` | Ver pedido actual |
| `confirmar` / `si` | Confirmar pedido |
| `cancelar` / `no` | Cancelar pedido |

### Ejemplos de Pedidos

#### ✅ Pedido Simple
```
Usuario: una hamburguesa
Bot: ✅ Entendí tu pedido: 1x Hamburguesa Completa ($850)
```

#### ✅ Pedido Múltiple
```
Usuario: 2 pizzas con 3 cervezas
Bot: ✅ Entendí tu pedido:
- 2x Pizza Muzzarella ($1200)
- 3x Cerveza ($400)
Total: $3600
```

#### ✅ Con Errores Ortográficos
```
Usuario: jamburguesa kon serveza
Bot: ✅ Entendí tu pedido:
- 1x Hamburguesa Completa ($850)
- 1x Cerveza ($400)
Total: $1250
```

#### ✅ Números Pegados
```
Usuario: 2hamburguesas 3cervezas
Bot: ✅ Entendí tu pedido:
- 2x Hamburguesa Completa ($850)
- 3x Cerveza ($400)
Total: $2900
```

---

## 🧪 Testing

### Ejecutar Tests Básicos
```bash
node test-parser.js
```
**20 casos de prueba - 100% de éxito**

### Ejecutar Tests Extremos
```bash
node test-parser-extremo.js
```
**25 casos extremos - 96% de éxito**

---

## 🏗️ Arquitectura

```
kds-webapp/
├── server/
│   ├── index.js              # Servidor Express
│   ├── bot-logic.js          # Lógica del bot WhatsApp
│   ├── pedido-parser.js      # Parser con fuzzy matching
│   ├── menu.js               # Menú del restaurante
│   ├── firebase-service.js   # Conexión Firebase
│   └── twilio-handler.js     # Handler de Twilio
├── test-parser.js            # Tests básicos
├── test-parser-extremo.js    # Tests extremos
├── index.html                # Panel KDS
└── package.json
```

---

## 🔧 Tecnologías

### Backend
- **Node.js** - Runtime
- **Express.js** - Framework web
- **Firebase Realtime Database** - Base de datos en tiempo real
- **Twilio WhatsApp API** - Mensajería

### Fuzzy Matching
- **fuzzball** - Distancia de Levenshtein
- **Normalización fonética personalizada** - Para español

### Frontend (KDS)
- HTML5 + CSS3 + JavaScript vanilla
- Firebase SDK para actualizaciones en tiempo real

---

## 📊 Métricas

| Métrica | Valor |
|---------|-------|
| Tasa de reconocimiento | **97.8%** |
| Tests pasando | **44/45 (97.8%)** |
| Ahorro de mensajes | **67%** |
| Mensajes por pedido | **4** (antes: 10+) |
| Errores ortográficos soportados | **50+ variaciones** |

---

## 📖 Documentación

- **[SISTEMA-COMPLETO-v1.3.md](SISTEMA-COMPLETO-v1.3.md)** - Documentación técnica completa
- **[GUIA-LENGUAJE-NATURAL.md](GUIA-LENGUAJE-NATURAL.md)** - Guía de uso para usuarios
- **[GUIA-PRUEBAS-WHATSAPP.md](GUIA-PRUEBAS-WHATSAPP.md)** - Guía de testing
- **[CHANGELOG.md](CHANGELOG.md)** - Historial de versiones

---

## 🎓 Casos de Uso Soportados

### ✅ Errores Ortográficos Comunes
- Intercambio s/z: "mossarela" → muzzarella
- Sin h: "jamburguesa" → hamburguesa  
- Intercambio c/k: "koka" → coca cola
- Intercambio v/b: "serveza" → cerveza
- Múltiples errores: "pitza mosarela" → pizza muzzarella

### ✅ Formatos de Pedido
- Con cantidades: "2 hamburguesas y 3 cervezas"
- Sin cantidades: "hamburguesa y cerveza" (asume 1 de cada uno)
- Números en texto: "dos pizzas y tres cocas"
- Números pegados: "2hamburguesas 3cervezas"
- Cantidad implícita: "una hamburguesa" (reconoce 1)

### ✅ Sinónimos
- hamburguesa → burger, hambur, burguesa
- coca cola → coca, cocacola, coke
- cerveza → birra, chela
- papas fritas → papas, fritas, patatas
- agua → aguita, botella de agua

---

## 🔐 Seguridad

- ✅ Variables de entorno para credenciales
- ✅ `.env` excluido en `.gitignore`
- ✅ Service Account protegido
- ✅ Validación de webhooks de Twilio
- ✅ Sanitización de inputs

---

## 🚀 Despliegue

### Desarrollo
```bash
node server/index.js
ngrok http 3000
```

### Producción
- **Railway**, **Heroku**, **DigitalOcean**, etc.
- Configurar variables de entorno en el servicio
- Webhook permanente (sin ngrok)

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo licencia privada.

---

## 👨‍💻 Autor

**osmeldfarak**

---

## 🎉 Versión Actual

**v1.3.0** - Sistema completo con fuzzy matching y normalización fonética

Ver [CHANGELOG.md](CHANGELOG.md) para historial completo de versiones.

---

## 🆘 Soporte

Para reportar bugs o solicitar features, abre un issue en GitHub.

---

**Hecho con ❤️ para restaurantes**
