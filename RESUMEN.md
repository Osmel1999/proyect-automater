# 🎯 Sistema KDS - Resumen del Proyecto

## ✨ ¿Qué es esto?

Una **webapp profesional** para reemplazar Google Sheets en tu cocina. Muestra pedidos en tiempo real estilo Kanban (como Trello) y es **100% gratis**.

---

## 🎨 Características

### 📊 Vista Kanban de 3 Columnas
```
┌─────────────┬─────────────┬─────────────┐
│  📋 COLA    │ 👨‍🍳 HACIENDO│  ✅ LISTOS  │
├─────────────┼─────────────┼─────────────┤
│  Pedido #42 │  Pedido #41 │  Pedido #40 │
│  Pedido #43 │             │             │
└─────────────┴─────────────┴─────────────┘
```

### 🔔 Notificaciones Automáticas
- **Sonido** cuando llega un pedido nuevo
- **Vibración** en tablets/móviles
- **Alertas visuales** para pedidos urgentes (>25 min)

### ⏱️ Control de Tiempos
- Contador en tiempo real de cada pedido
- Códigos de color:
  - Verde: <20 min
  - Amarillo: 20-30 min
  - Rojo parpadeante: >30 min

### 📱 100% Responsive
- Funciona en **tablets** (recomendado)
- Funciona en **Smart TV**
- Funciona en **celulares**
- Funciona en **computadoras**

---

## 📂 Archivos del Proyecto

```
kds-webapp/
│
├── 📄 index.html          ← Interfaz principal
├── 🎨 styles.css          ← Estilos profesionales
├── ⚙️ config.js           ← Configuración Firebase (EDITAR AQUÍ)
├── 🧠 app.js              ← Lógica de la aplicación
│
├── 🎬 demo.html           ← Vista previa sin Firebase
│
├── 📋 README.md           ← Documentación principal
├── 🚀 DESPLIEGUE.md       ← Guía paso a paso para publicar
├── 🔗 INTEGRACION.md      ← Cómo conectar con n8n
├── 🧪 EJEMPLOS.md         ← Pedidos de prueba
│
├── 📦 package.json        ← Info del proyecto
└── 🔥 firebase.json       ← Config de Firebase Hosting
```

---

## 🚀 Inicio Rápido (5 Pasos)

### 1️⃣ Crear Proyecto Firebase
- Ve a https://console.firebase.google.com
- Crea proyecto: "kds-cocina"
- Habilita "Realtime Database"

### 2️⃣ Configurar la App
- Copia las credenciales de Firebase
- Pégalas en `config.js`

### 3️⃣ Desplegar
Elige una opción:
```bash
# Opción A: Firebase Hosting
firebase deploy

# Opción B: Netlify
# Arrastra la carpeta a netlify.com

# Opción C: Vercel
vercel deploy
```

### 4️⃣ Probar
- Abre la URL que te dieron
- Inserta un pedido de prueba en Firebase Console
- ¡Debe aparecer instantáneamente! 🎉

### 5️⃣ Conectar con n8n
```javascript
// En n8n, nodo HTTP Request:
URL: https://tu-proyecto.firebaseio.com/pedidos/{{id}}.json
Método: PUT
Body: { ...datos del pedido }
```

---

## 🎮 Cómo Funciona

### Flujo de un Pedido:

```
1. Cliente hace pedido por WhatsApp
         ↓
2. n8n valida el pago con Nequi/Bre-B
         ↓
3. n8n envía a Firebase
         ↓
4. 🔥 KDS recibe en TIEMPO REAL (sin recargar)
         ↓
5. Aparece en columna "En Cola"
         ↓
6. Cocinero presiona "Empezar a Cocinar"
         ↓
7. Se mueve a columna "Preparando"
         ↓
8. Cocinero presiona "Marcar como Listo"
         ↓
9. Se mueve a columna "Listos"
         ↓
10. Cliente viene a recoger
         ↓
11. Cocinero presiona "Entregado"
         ↓
12. Pedido se guarda en historial
```

---

## 💻 Stack Tecnológico

| Componente | Tecnología | Costo |
|------------|------------|-------|
| **Frontend** | HTML + CSS + JavaScript | $0 |
| **Backend** | Firebase Realtime Database | $0 |
| **Hosting** | Firebase/Netlify/Vercel | $0 |
| **CDN** | Automático (incluido) | $0 |
| **HTTPS** | Automático (incluido) | $0 |
| **TOTAL** | | **$0** |

---

## 🎯 Ventajas vs Google Sheets

| Aspecto | Google Sheets | KDS Webapp |
|---------|---------------|------------|
| **UI** | ❌ Aburrido, feo | ✅ Profesional, Kanban |
| **Estados** | ❌ Manual (colores) | ✅ Automático (columnas) |
| **Notificaciones** | ❌ No hay | ✅ Sonido + vibración |
| **Tiempo Real** | ⚠️ Lento (5-10 seg) | ✅ Instantáneo (<1 seg) |
| **Móvil** | ❌ Difícil de usar | ✅ Optimizado |
| **Urgencias** | ❌ No detecta | ✅ Alerta automática |
| **Historial** | ⚠️ Mixto con activos | ✅ Separado |
| **Instalación** | ✅ Ya existe | ⚠️ 30 min setup |

---

## 📊 Capacidad

Con el **plan gratis de Firebase**:

- ✅ **1GB** de datos almacenados
- ✅ **10GB** de descarga/mes
- ✅ **100,000** conexiones simultáneas

**¿Cuántos pedidos?**
- Promedio: **~50,000 pedidos/mes**
- O **~1,600 pedidos/día**
- O **~100 pedidos/hora activos**

**Conclusión:** Suficiente para escalar bastante antes de pagar 💰

---

## 🔒 Seguridad

### Versión Actual (Desarrollo)
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
⚠️ **Cualquiera puede leer/escribir**

### Versión Producción (Recomendada)
```json
{
  "rules": {
    "pedidos": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```
✅ **Solo usuarios autenticados pueden escribir**

---

## 📱 Instalación en Tablet/TV

### Android:
1. Abre Chrome
2. Ve a tu URL del KDS
3. Menú (⋮) → "Agregar a pantalla de inicio"
4. ✅ Ya tienes ícono como app nativa

### iPad:
1. Abre Safari
2. Ve a tu URL
3. Botón "Compartir" → "Agregar a inicio"

### Smart TV:
1. Abre navegador
2. Ve a tu URL
3. F11 o botón fullscreen
4. Deja abierto 24/7

---

## 🛠️ Personalización

### Cambiar Colores
En `styles.css` línea 10:
```css
:root {
    --pending: #f59e0b;   /* Naranja para "En Cola" */
    --cooking: #8b5cf6;   /* Morado para "Cocinando" */
    --ready: #10b981;     /* Verde para "Listos" */
}
```

### Cambiar Tiempo de Alerta
En `app.js` línea 135:
```javascript
const isUrgent = minutes > 25; // Cambiar 25 por otro valor
```

### Agregar Logo
En `index.html` línea 12:
```html
<h1><img src="logo.png" height="40"> Kitchen Display System</h1>
```

---

## 🧪 Testing

### Probar sin Firebase (Demo)
```bash
# Abrir demo.html en navegador
open demo.html
```

### Insertar Pedido de Prueba
Ver `EJEMPLOS.md` para copiar/pegar pedidos en Firebase Console

### Simular Carga Alta
Ejecutar en consola del navegador:
```javascript
crearPedidosPrueba(50); // Crea 50 pedidos aleatorios
```

---

## 📈 Próximas Mejoras (Futuro)

- [ ] **Autenticación** (login para cocineros)
- [ ] **Dashboard estadísticas** (ventas del día, plato más vendido)
- [ ] **Impresión automática** (ticket de cocina)
- [ ] **Modo oscuro** (para no cansar la vista)
- [ ] **Multi-idioma** (español/inglés)
- [ ] **Categorías** (entradas, platos fuertes, bebidas)
- [ ] **Filtros** (ver solo pizzas, solo hamburguesas)
- [ ] **Drag & drop** (arrastrar pedidos entre columnas)

---

## 🆘 Soporte

### Problema: No aparecen pedidos
**Solución:**
1. F12 → Consola → Busca errores
2. Verifica `config.js` tenga tus credenciales
3. Revisa reglas de Firebase (deben estar en `true`)

### Problema: No suena notificación
**Solución:**
1. Los navegadores bloquean audio automático
2. Haz clic en cualquier parte de la página primero
3. Sube volumen del dispositivo

### Problema: No se actualiza en tiempo real
**Solución:**
1. Verifica conexión a internet
2. Revisa que `databaseURL` en `config.js` sea correcta
3. Recarga la página (Ctrl+R)

---

## 📞 Contacto

**¿Dudas? ¿Bugs? ¿Mejoras?**
- Abre un issue en GitHub
- O contáctame directamente

---

## 📄 Licencia

MIT - Úsalo libremente para tu negocio 🎉

---

## 🙏 Créditos

- **Firebase** por la infraestructura gratis
- **Font Inter** por la tipografía
- **Emojis** por hacer todo más bonito 😊

---

## 🎉 ¡Listo para Cocinar!

```
┌───────────────────────────────────────┐
│  🍔 Tu cocina oculta está lista       │
│  para recibir pedidos automáticos     │
│  sin pagar un solo peso!              │
│                                        │
│  ¡Buena suerte con tu emprendimiento! │
│           🚀🚀🚀                       │
└───────────────────────────────────────┘
```

---

**Versión:** 1.0.0  
**Última actualización:** 30 de diciembre de 2025  
**Hecho con ❤️ para emprendedores**
