# 🚀 Guía de Despliegue Rápido

## 📋 Resumen

Esta webapp KDS reemplaza a Google Sheets con una interfaz profesional tipo Kanban. Es **100% gratis** y funciona en tiempo real.

---

## ⚡ OPCIÓN 1: Firebase Hosting (Recomendada)

### Ventajas:
✅ **Gratis para siempre**
✅ **HTTPS automático**
✅ **CDN global** (rápido en toda Colombia)
✅ **Una sola plataforma** (hosting + base de datos)

### Pasos:

#### 1. Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

#### 2. Login

```bash
firebase login
```

#### 3. Crear proyecto en Firebase

1. Ve a https://console.firebase.google.com
2. Clic en "Agregar proyecto"
3. Nombre: "kds-cocina-oculta" (o el que quieras)
4. Deshabilita Google Analytics (no lo necesitas)
5. Clic en "Crear proyecto"

#### 4. Habilitar Realtime Database

1. En el menú izquierdo → "Realtime Database"
2. Clic en "Crear base de datos"
3. Ubicación: "United States" (la más cercana)
4. Modo: "Empezar en modo de prueba"
5. Clic en "Habilitar"

#### 5. Configurar Reglas de Seguridad

En la pestaña "Reglas":

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

⚠️ **Nota:** Estas reglas son para desarrollo. En producción debes usar autenticación.

#### 6. Obtener Configuración

1. Clic en el ícono de engranaje → "Configuración del proyecto"
2. Scroll hasta "Tus apps"
3. Clic en el ícono `</>` (Web)
4. Registra la app: "KDS Web"
5. Copia la configuración que aparece

#### 7. Actualizar config.js

Abre `config.js` y pega tus valores:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "tu-proyecto.firebaseapp.com",
    databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};
```

#### 8. Inicializar Firebase en tu carpeta

```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
firebase init hosting
```

Responde:
- Use existing project → Selecciona tu proyecto
- Public directory → `.` (punto)
- Single-page app → `Yes`
- Set up automatic builds → `No`
- Overwrite index.html → `No`

#### 9. Desplegar

```bash
firebase deploy
```

#### 10. ¡Listo!

Te dará una URL como:
```
https://kds-cocina-oculta.web.app
```

Abre esa URL en la tablet de la cocina y ¡funciona! 🎉

---

## ⚡ OPCIÓN 2: Netlify (Más Simple)

### Ventajas:
✅ **Drag & drop** (arrastrar carpeta)
✅ **No requiere terminal**
✅ **Gratis para siempre**

### Pasos:

1. Ve a https://app.netlify.com
2. Regístrate con GitHub o Email
3. Clic en "Add new site" → "Deploy manually"
4. Arrastra toda la carpeta `kds-webapp`
5. Espera 30 segundos
6. Te da una URL como: `https://random-name-123.netlify.app`
7. ¡Listo!

**Opcional:** Cambiar el nombre
- Clic en "Site settings"
- "Change site name"
- Pon: `kds-cocina` → URL será: `https://kds-cocina.netlify.app`

---

## ⚡ OPCIÓN 3: Vercel

### Ventajas:
✅ **Super rápido** (CDN edge)
✅ **Despliegue con Git**

### Pasos:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Ir a tu carpeta
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp

# Desplegar
vercel

# Responder:
# Set up and deploy? Yes
# Which scope? Tu cuenta
# Link to existing project? No
# Project name? kds-webapp
# Directory? ./
# Override settings? No
```

Te dará una URL como:
```
https://kds-webapp-abc123.vercel.app
```

---

## 🧪 Probar Localmente Primero

Antes de desplegar, prueba en tu computadora:

### Método 1: Python (si tienes Python instalado)

```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
python3 -m http.server 8000
```

Abre: http://localhost:8000

### Método 2: Node.js

```bash
npx serve .
```

Abre: http://localhost:3000

### Método 3: VS Code (Live Server)

1. Instala extensión "Live Server"
2. Click derecho en `index.html`
3. "Open with Live Server"

---

## 📱 Configurar en la Tablet de Cocina

Una vez desplegado:

### Android:

1. Abre Chrome
2. Ve a tu URL (ej: https://kds-cocina.netlify.app)
3. Menú (3 puntos) → "Agregar a pantalla de inicio"
4. Ya tienes un ícono como si fuera una app

### iPad:

1. Abre Safari
2. Ve a tu URL
3. Botón "Compartir" → "Agregar a pantalla de inicio"

### Smart TV:

1. Abre navegador (Chrome, Samsung Internet, etc.)
2. Ve a tu URL
3. Presiona F11 o botón de pantalla completa
4. Listo

---

## 🔗 Conectar con n8n

En n8n, cuando crees un pedido validado:

### Nodo HTTP Request:

```
URL: https://TU-PROYECTO-default-rtdb.firebaseio.com/pedidos/{{ $json.orderId }}.json
Método: PUT
Headers:
  Content-Type: application/json
Body:
{
  "id": "{{ $json.orderId }}",
  "cliente": "{{ $json.customerName }}",
  "telefono": "{{ $json.customerPhone }}",
  "items": {{ $json.items }},
  "total": {{ $json.total }},
  "estado": "pendiente",
  "timestamp": {{ Date.now() }}
}
```

---

## ✅ Checklist Final

- [ ] Firebase proyecto creado
- [ ] Realtime Database habilitado
- [ ] Reglas de seguridad configuradas
- [ ] `config.js` actualizado con tus credenciales
- [ ] App desplegada (Firebase/Netlify/Vercel)
- [ ] URL funcionando en navegador
- [ ] Pedido de prueba insertado (desde Firebase Console)
- [ ] Pedido visible en el KDS
- [ ] n8n configurado para enviar a Firebase
- [ ] Tablet/TV configurada con la URL

---

## 🐛 Solución de Problemas

### "No aparecen los pedidos"

1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que `config.js` tenga la `databaseURL` correcta

### "Firebase config is missing"

- Asegúrate de que `config.js` esté en la misma carpeta que `index.html`
- Verifica que hayas puesto tus credenciales reales (no las de ejemplo)

### "Permission denied"

- Revisa las reglas en Firebase Console → Realtime Database → Reglas
- Deben estar en `true` para `.read` y `.write`

### "No suena la notificación"

- Los navegadores bloquean sonidos automáticos
- Haz clic en cualquier parte de la página primero
- En tablet: Sube el volumen del dispositivo

---

## 💰 Costos

### Firebase Free Tier:
- ✅ 1GB almacenamiento
- ✅ 10GB descarga/mes
- ✅ 100,000 conexiones simultáneas

**Para tu caso:** Puedes tener **miles de pedidos al mes** sin pagar nada.

### Netlify Free:
- ✅ 100GB bandwidth/mes
- ✅ Builds ilimitados

### Vercel Free:
- ✅ 100GB bandwidth/mes
- ✅ Despliegues ilimitados

---

## 🎯 Próximos Pasos

1. **Hoy:** Despliega la versión básica
2. **Mañana:** Conecta n8n
3. **Esta semana:** Prueba con pedidos reales
4. **Próximo mes:** Agrega autenticación para más seguridad

---

## 📞 Soporte

Si algo no funciona:
1. Revisa la consola del navegador (F12)
2. Verifica `config.js`
3. Prueba con pedido manual en Firebase Console
4. Lee el `README.md` para más detalles

---

**¡Listo para despegar! 🚀**
