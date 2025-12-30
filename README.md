# 🍔 KDS - Kitchen Display System

Sistema de pantalla de cocina en tiempo real para tu cocina oculta.

## 🚀 Características

✅ **Actualización en tiempo real** - Los pedidos aparecen instantáneamente
✅ **Sistema Kanban** - 3 columnas: Pendientes → Cocinando → Listos
✅ **Alertas visuales** - Pedidos urgentes se destacan automáticamente
✅ **Sonido y vibración** - Notifica cuando llega un pedido nuevo
✅ **Responsive** - Funciona en tablet, celular o Smart TV
✅ **Sin backend** - Todo funciona con Firebase (gratis)

## 📋 Requisitos

- Cuenta de Firebase (gratis)
- Navegador moderno (Chrome, Firefox, Safari)

## 🛠️ Instalación

### Paso 1: Crear proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto
3. Habilita **Realtime Database**
4. En Reglas de seguridad, usa esto temporalmente (después lo mejoramos):

```json
{
  "rules": {
    "pedidos": {
      ".read": true,
      ".write": true
    },
    "historial": {
      ".read": true,
      ".write": true
    }
  }
}
```

### Paso 2: Configurar la app

1. En Firebase Console, ve a **Configuración del proyecto** → **Tus apps**
2. Crea una app web
3. Copia la configuración que te dan
4. Pega los valores en `config.js`:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "tu-proyecto.firebaseapp.com",
    databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

### Paso 3: Desplegar

**Opción A: Firebase Hosting (GRATIS)**

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar en este directorio
firebase init hosting

# Desplegar
firebase deploy
```

**Opción B: Netlify/Vercel (GRATIS)**

1. Arrastra la carpeta completa a Netlify.com
2. Listo, ya tienes URL pública

**Opción C: Abrir localmente**

Simplemente abre `index.html` en tu navegador (Chrome recomendado)

## 🔗 Integración con n8n

En n8n, cuando crees un pedido, envíalo a Firebase así:

### Nodo HTTP Request en n8n:

```javascript
// URL: https://tu-proyecto-default-rtdb.firebaseio.com/pedidos.json
// Método: POST
// Body:
{
  "id": "{{ $json.orderNumber }}",
  "cliente": "{{ $json.customerName }}",
  "telefono": "{{ $json.customerPhone }}",
  "items": {{ $json.items }},
  "total": {{ $json.total }},
  "estado": "pendiente",
  "timestamp": {{ Date.now() }}
}
```

### Ejemplo de estructura de pedido:

```json
{
  "pedidos": {
    "42": {
      "id": "42",
      "cliente": "Juan Pérez",
      "telefono": "3001234567",
      "items": [
        {
          "nombre": "Hamburguesa Especial",
          "cantidad": 2,
          "notas": "Sin cebolla"
        },
        {
          "nombre": "Papas Grandes",
          "cantidad": 1
        }
      ],
      "total": 30000,
      "estado": "pendiente",
      "timestamp": 1735516800000
    }
  }
}
```

## 📱 Uso en la Cocina

1. Abre la URL en una tablet o Smart TV
2. Déjala abierta todo el día
3. Cuando llega un pedido:
   - 🔊 Suena una notificación
   - 📱 Vibra (en móviles)
   - 🎴 Aparece en la columna "En Cola"

4. Flujo de trabajo:
   - Ver pedido en "En Cola"
   - Presionar **"Empezar a Cocinar"** → Se mueve a "Preparando"
   - Presionar **"Marcar como Listo"** → Se mueve a "Listos"
   - Presionar **"Entregado"** → Se archiva en historial

## 🎨 Personalización

### Cambiar colores

Edita las variables CSS en `styles.css`:

```css
:root {
    --pending: #f59e0b;   /* Color columna "En Cola" */
    --cooking: #8b5cf6;   /* Color columna "Cocinando" */
    --ready: #10b981;     /* Color columna "Listos" */
}
```

### Cambiar tiempos de alerta

En `app.js` línea 135:

```javascript
// Alertas por tiempo transcurrido
const elapsedClass = minutes > 30 ? 'danger' : minutes > 20 ? 'warning' : '';
const isUrgent = minutes > 25; // Mostrar indicador "URGENTE"
```

### Agregar sonido personalizado

1. Agrega un archivo `notification.mp3` en la carpeta
2. O usa una URL: `<audio id="notificationSound" src="https://tu-sonido.mp3">`

## 🔒 Seguridad (Producción)

Cuando vayas a producción, mejora las reglas de Firebase:

```json
{
  "rules": {
    "pedidos": {
      ".read": true,
      ".write": "auth != null"  // Solo usuarios autenticados
    },
    "historial": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## 📊 Ver Historial

Puedes crear una vista de historial agregando:

```javascript
// En app.js, agregar:
const historyRef = window.db.ref('historial');
historyRef.on('value', (snapshot) => {
    const history = snapshot.val();
    // Renderizar historial
});
```

## 🐛 Solución de Problemas

**No aparecen los pedidos:**
- Verifica que la URL de Firebase en `config.js` sea correcta
- Abre la consola del navegador (F12) y busca errores

**No suena la notificación:**
- Los navegadores bloquean sonidos automáticos hasta que el usuario interactúe
- Haz clic en cualquier parte de la página primero

**Los pedidos no se actualizan en tiempo real:**
- Verifica que las reglas de Firebase permitan lectura
- Revisa que la conexión a internet esté activa

## 💰 Costos

**Firebase Free Tier incluye:**
- ✅ 1GB de almacenamiento
- ✅ 10GB de transferencia/mes
- ✅ 100,000 descargas simultáneas

**Para tu caso:** Puedes tener miles de pedidos al mes sin pagar nada.

## 📱 Modo Fullscreen (Recomendado)

Para usar en tablet/TV:

1. Abre la app
2. Presiona F11 (PC) o ícono de pantalla completa
3. Opcional: Instala como PWA (Chrome → Menú → Instalar app)

## 🎯 Próximas Mejoras (Opcionales)

- [ ] Agregar autenticación
- [ ] Dashboard de estadísticas (ventas del día)
- [ ] Impresión automática de tickets
- [ ] Modo oscuro
- [ ] Multi-idioma

---

## 🆘 Soporte

¿Necesitas ayuda? Revisa:
1. Configuración de Firebase en `config.js`
2. Consola del navegador (F12)
3. Reglas de Firebase Database

---

**¡Listo para cocinar! 🍔👨‍🍳**
