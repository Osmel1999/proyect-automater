# 🍔 KDS - Kitchen Display System

Sistema de pantalla de cocina en tiempo real para cocina oculta (dark kitchen/ghost kitchen).

## ✨ Características

- ✅ **Actualización en tiempo real** - Los pedidos aparecen instantáneamente sin recargar
- ✅ **Sistema Kanban** - 3 columnas: En Cola → Preparando → Listos
- ✅ **Temporizador automático** - Muestra minutos transcurridos que se actualizan cada 10 segundos
- ✅ **Alertas visuales** - Pedidos urgentes (+25 min) se destacan automáticamente
- ✅ **Sonido y vibración** - Notifica cuando llega un pedido nuevo
- ✅ **Autenticación segura** - Login con Firebase Authentication
- ✅ **Responsive** - Funciona en tablet, celular o Smart TV
- ✅ **PWA Ready** - Se puede instalar como app nativa

## 🏗️ Arquitectura

```
┌─────────────────┐
│  WhatsApp API   │
│  (Futuro)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│      n8n        │─────▶│  Firebase RTDB   │
│   (Workflows)   │      │   (Base Datos)   │
└─────────────────┘      └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   KDS WebApp     │
                         │  (Este proyecto) │
                         └──────────────────┘
```

## 🚀 Despliegue

### URL en Producción
- **KDS App**: https://kds-app-7f1d3.web.app
- **Landing Page**: https://kds-app-7f1d3.web.app/home.html

### Firebase Hosting

```bash
# Desplegar cambios
firebase deploy --only hosting

# Ver logs
firebase hosting:channel:list
```

## 📂 Estructura del Proyecto

```
kds-webapp/
├── index.html              # Página principal (redirige)
├── home.html               # Landing page
├── login.html              # Página de login
├── kds.html                # KDS (pantalla de cocina)
├── app.js                  # Lógica principal del KDS
├── config.js               # Configuración de Firebase
├── styles.css              # Estilos
├── privacy-policy.html     # Política de privacidad
├── terms.html              # Términos y condiciones
├── firebase.json           # Config de Firebase Hosting
├── package.json            # Dependencias del proyecto
├── n8n-workflows/          # Workflows de automatización
│   ├── workflow-1-pedido-manual.json
│   ├── workflow-1-pedido-manual-v2.json
│   ├── GUIA-IMPORTAR.md
│   └── GUIA-RAILWAY.md
├── CREDENCIALES.md         # Credenciales y accesos (NO SUBIR A GIT)
├── GUIA-WHATSAPP-API.md    # Guía para integración WhatsApp
└── README.md               # Este archivo
```

## 🔧 Configuración

### Firebase

El proyecto ya está configurado con:
- **Authentication**: Email/Password habilitado
- **Realtime Database**: Configurado con reglas de seguridad
- **Hosting**: Desplegado y funcionando

### Usuarios

Ver archivo `CREDENCIALES.md` para accesos (archivo privado, no incluido en git).

### Reglas de Seguridad de Firebase

```json
{
  "rules": {
    "pedidos": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "historial": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## 🔗 Integración con n8n

### Crear Pedido desde n8n

**Endpoint**: `https://[PROJECT_ID]-default-rtdb.firebaseio.com/pedidos.json`

**Método**: `POST`

**Headers**:
```
Content-Type: application/json
```

**Body (ejemplo)**:
```json
{
  "id": "PED-1234567890",
  "cliente": "Juan Pérez",
  "telefono": "+573001234567",
  "timestamp": 1704195600000,
  "estado": "pendiente",
  "items": [
    {
      "nombre": "Hamburguesa Clásica",
      "cantidad": 2,
      "notas": "Sin cebolla"
    }
  ],
  "total": 25000
}
```

### Campos Requeridos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | ID único del pedido (ej: "PED-1234567890") |
| `cliente` | string | Nombre del cliente |
| `telefono` | string | Teléfono del cliente (opcional) |
| `timestamp` | number | Timestamp en milisegundos (ej: `Date.now()`) |
| `estado` | string | Debe ser `"pendiente"` para que aparezca en la primera columna |
| `items` | array | Array de productos |
| `items[].nombre` | string | Nombre del producto |
| `items[].cantidad` | number | Cantidad |
| `items[].notas` | string | Notas adicionales (opcional) |
| `total` | number | Total en pesos (opcional) |

### Autenticación con Firebase desde n8n

Para autenticar las peticiones desde n8n, usa el **Database Secret**:

**URL con auth**:
```
https://[PROJECT_ID]-default-rtdb.firebaseio.com/pedidos.json?auth=[DATABASE_SECRET]
```

El Database Secret está en: Firebase Console → Project Settings → Service Accounts → Database Secrets

## 📱 Uso del KDS

### Flujo de Trabajo

1. **Pedido nuevo** → Aparece en columna "En Cola" 🟦
2. **Cocinero presiona "Empezar a Cocinar"** → Pasa a "Preparando" 🟧
3. **Cocinero presiona "Marcar como Listo"** → Pasa a "Listos" 🟩
4. **Cocinero presiona "Entregado"** → Se mueve a historial (desaparece del KDS)

### Indicadores de Tiempo

- ⏱️ **Normal** (< 20 min): Color blanco
- ⏱️ **Warning** (20-30 min): Color amarillo
- ⏱️ **Danger** (> 30 min): Color rojo
- 🔥 **Urgente** (> 25 min): Etiqueta "🔥 Urgente"

Los tiempos se actualizan automáticamente cada 10 segundos.

## 🔐 Seguridad

- ✅ Autenticación requerida para acceder al KDS
- ✅ Reglas de Firebase Database protegen los datos
- ✅ Solo usuarios autenticados pueden leer/escribir
- ✅ HTTPS en todas las conexiones
- ✅ Tokens de sesión con expiración automática

## 🛠️ Desarrollo Local

```bash
# Clonar el repositorio
git clone [URL_DEL_REPO]
cd kds-webapp

# No requiere instalación de dependencias
# Solo abrir en navegador o usar Firebase Emulator

# Opción 1: Abrir directamente
open kds.html

# Opción 2: Servidor local simple
python3 -m http.server 8000
# Luego abrir http://localhost:8000

# Opción 3: Firebase Emulator
firebase emulators:start
```

## 📊 Estructura de Datos en Firebase

```
/pedidos
  /-Ohyzb6ZoMJPUCei-x7D
    id: "PED-1767362162869"
    cliente: "Juan Pérez"
    telefono: "+573001234567"
    timestamp: 1767362162869
    estado: "pendiente"
    items: [...]
    total: 25000
    inicioCocinado: 1767362200000  (se agrega al cambiar a "cocinando")
    horaListo: 1767362300000       (se agrega al cambiar a "listo")

/historial
  /-Ohyzb6ZoMJPUCei-x7D
    (mismo formato que /pedidos)
    horaEntrega: 1767362400000     (se agrega al marcar como "entregado")
```

## 🚧 Próximos Pasos

- [ ] Integración con WhatsApp Business API
- [ ] Despliegue de n8n en Railway
- [ ] Webhook desde WhatsApp → n8n → Firebase → KDS
- [ ] Dashboard de estadísticas e historial
- [ ] Notificaciones push
- [ ] Impresión automática de tickets
- [ ] Integración con más canales (Instagram, Delivery Apps)

## 📝 Notas Técnicas

### Actualización de Tiempos

El sistema usa `setInterval` para actualizar los minutos transcurridos cada 10 segundos:

```javascript
// En app.js
setInterval(updateElapsedTimes, 10000);
```

La función busca todas las tarjetas en el DOM y actualiza sus tiempos sin necesidad de rerenderizar todo el componente.

### Identificadores

- **Firebase Key**: ID único generado por Firebase (ej: `-Ohyzb6ZoMJPUCei-x7D`)
- **Display ID**: ID interno del pedido para mostrar al usuario (ej: `PED-1767362162869`)

Las tarjetas usan `data-order-id` con la Firebase Key para operaciones, y `data-display-id` para mostrar al usuario.

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

## 👤 Autor

Desarrollado para cocina oculta - 2025

---

**Última actualización**: 2 de enero de 2026
**Versión**: 1.0.0
**Estado**: ✅ En producción
