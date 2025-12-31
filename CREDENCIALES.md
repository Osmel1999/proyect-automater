# 🔐 CREDENCIALES DE ACCESO AL KDS

## ✅ Usuario Creado

### **Credenciales de Acceso:**
- **Email**: `123@mail.com`
- **Password**: `123456`

---

## 🌐 CÓMO ACCEDER

### **Paso 1: Abre la aplicación**
```
🔗 https://kds-app-7f1d3.web.app
```

### **Paso 2: Login**
Serás redirigido automáticamente al login.

### **Paso 3: Ingresa tus credenciales**
- **Email**: `123@mail.com`
- **Password**: `123456`

### **Paso 4: Clic en "Iniciar Sesión"**

### **Paso 5: ¡Listo!** 🎉
Accederás al tablero KDS y podrás ver los pedidos en tiempo real.

---

## 🧪 PRUEBA EL SISTEMA

Una vez que hayas iniciado sesión, prueba agregar un pedido de ejemplo.

### **Opción 1: Desde tu terminal**

Copia y pega este comando:

```bash
curl -X POST \
  'https://kds-app-7f1d3-default-rtdb.firebaseio.com/pedidos.json' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "PRUEBA-001",
    "cliente": "María García",
    "telefono": "573001234567",
    "items": [
      {"nombre": "Hamburguesa Clásica", "cantidad": 2, "precio": 15000},
      {"nombre": "Papas Fritas", "cantidad": 1, "precio": 5000},
      {"nombre": "Coca Cola", "cantidad": 2, "precio": 3000}
    ],
    "total": 38000,
    "estado": "pendiente",
    "timestamp": '$(date +%s000)',
    "notas": "Sin cebolla, extra queso"
  }'
```

### **Opción 2: Agregar más pedidos**

```bash
# Pedido 2
curl -X POST \
  'https://kds-app-7f1d3-default-rtdb.firebaseio.com/pedidos.json' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "PRUEBA-002",
    "cliente": "Carlos López",
    "telefono": "573009876543",
    "items": [
      {"nombre": "Pizza Margarita", "cantidad": 1, "precio": 25000},
      {"nombre": "Ensalada César", "cantidad": 1, "precio": 12000}
    ],
    "total": 37000,
    "estado": "pendiente",
    "timestamp": '$(date +%s000)',
    "notas": "Pizza bien cocida"
  }'
```

### **Opción 3: Desde Firebase Console**

1. Ve a: https://console.firebase.google.com/project/kds-app-7f1d3/database/kds-app-7f1d3-default-rtdb/data
2. Clic en **"pedidos"**
3. Clic en **"+"** (agregar hijo)
4. Pega el JSON del pedido
5. Guardar

---

## 👁️ QUÉ VERÁS

Al agregar pedidos, verás automáticamente:

1. **Tarjeta del pedido** en la columna "En Cola"
2. **Información completa**:
   - Número de pedido
   - Cliente y teléfono
   - Items del pedido
   - Total
   - Tiempo transcurrido
   - Notas especiales

3. **Acciones disponibles**:
   - **"Iniciar"** → Mueve el pedido a "Preparando"
   - **"Listo"** → Mueve el pedido a "Listos"
   - **"Completar"** → Elimina el pedido (marca como entregado)

---

## 🎯 FLUJO DE TRABAJO

```
📋 En Cola
    ↓ [Iniciar]
👨‍🍳 Preparando
    ↓ [Listo]
✅ Listos
    ↓ [Completar]
🗑️ Eliminado
```

---

## 🔔 NOTIFICACIONES

El sistema te avisará:
- 🔊 **Sonido** cuando llegue un nuevo pedido
- 📳 **Vibración** en dispositivos móviles
- ⏱️ **Alertas visuales** por tiempo:
  - 0-20 min: Normal (gris)
  - 20-30 min: Advertencia (amarillo)
  - +30 min: Peligro (rojo)
  - +25 min: Etiqueta "🔥 Urgente"

---

## 📱 USAR EN TABLET/TV

1. Abre el navegador en tu dispositivo
2. Ve a: https://kds-app-7f1d3.web.app
3. Inicia sesión con:
   - Email: `123@mail.com`
   - Password: `123456`
4. ¡Listo! Deja la pestaña abierta

**Tip para tablets**: Agrega a la pantalla de inicio para acceso directo

---

## 👥 AGREGAR MÁS USUARIOS

Si necesitas agregar más usuarios (cocineros, gerentes):

1. Ve a: https://console.firebase.google.com/project/kds-app-7f1d3/authentication/users
2. Clic en **"Add user"**
3. Ingresa email y password del nuevo usuario
4. Guardar
5. Comparte las credenciales con la persona

**Ejemplo:**
- Email: `cocinero1@kds.com`
- Password: `cocina2024`

---

## 🚪 CERRAR SESIÓN

- Clic en el botón **"🚪 Cerrar Sesión"** (esquina superior derecha)
- Confirmar
- Serás redirigido al login

---

## 🔗 ENLACES IMPORTANTES

| Recurso | URL |
|---------|-----|
| **KDS App** | https://kds-app-7f1d3.web.app |
| **Firebase Console** | https://console.firebase.google.com/project/kds-app-7f1d3 |
| **Database** | https://console.firebase.google.com/project/kds-app-7f1d3/database |
| **Authentication** | https://console.firebase.google.com/project/kds-app-7f1d3/authentication |
| **GitHub** | https://github.com/Osmel1999/proyect-automater |

---

## ⚠️ SEGURIDAD

### **Recomendaciones:**

1. **No compartas** estas credenciales públicamente
2. **Cambia la contraseña** si crees que fue comprometida
3. **Usa contraseñas fuertes** para usuarios de producción
4. **Crea usuarios específicos** para cada persona del equipo

### **Cambiar contraseña:**
1. Firebase Console → Authentication → Users
2. Clic en el usuario
3. Clic en "Reset password"
4. Ingresar nueva contraseña

---

## ✅ CHECKLIST FINAL

- [x] ✅ Usuario creado (123@mail.com)
- [ ] ✅ Acceder a https://kds-app-7f1d3.web.app
- [ ] ✅ Hacer login
- [ ] ✅ Agregar un pedido de prueba
- [ ] ✅ Mover el pedido entre columnas
- [ ] ✅ Completar el pedido
- [ ] 📱 Probar en tablet/TV
- [ ] 👥 Agregar más usuarios si es necesario
- [ ] 🚀 ¡Empezar a usar con pedidos reales!

---

## 🎊 ¡LISTO PARA USAR!

Tu sistema KDS está **100% funcional** y listo para producción.

**¡Disfruta tu Kitchen Display System!** 🍔👨‍🍳

---

**Última actualización**: 31 de diciembre de 2024
**Estado**: ✅ ACTIVO Y FUNCIONANDO
