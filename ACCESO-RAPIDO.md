# 🚀 Acceso Rápido - KDS (Kitchen Display System)

## 🌐 URLs de Acceso

### **Aplicación Principal (Requiere Login)**
```
https://kds-app-7f1d3.web.app
```
**Descripción**: Sistema completo con autenticación. Acceso solo para usuarios autorizados.

---

### **Página de Login**
```
https://kds-app-7f1d3.web.app/login.html
```
**Descripción**: Formulario de inicio de sesión.

---

### **Demo Sin Autenticación**
```
https://kds-app-7f1d3.web.app/demo.html
```
**Descripción**: Versión de demostración sin restricciones (para pruebas o presentaciones).

---

## 🔐 Credenciales de Acceso

Para acceder al sistema, necesitas crear un usuario en **Firebase Authentication**:

### **Método 1: Crear Usuario desde Firebase Console**

1. Accede a: https://console.firebase.google.com/project/kds-app-7f1d3/authentication/users
2. Clic en **"Add user"**
3. Completa:
   - **Email**: `admin@kds.com` (o el email que desees)
   - **Password**: Tu contraseña segura (mínimo 6 caracteres)
4. Clic en **"Add user"**
5. ✅ Listo! Usa estas credenciales para acceder

### **Método 2: Desde la Aplicación (Si está habilitado)**
> ⚠️ **Nota**: Por seguridad, el registro está **deshabilitado** desde la webapp. Solo puedes crear usuarios desde Firebase Console.

---

## 📋 Flujo de Uso

### **1. Primer Acceso**
1. Abre: https://kds-app-7f1d3.web.app
2. Serás redirigido automáticamente al **login**
3. Ingresa tus credenciales
4. Clic en **"Iniciar Sesión"**

### **2. Tablero Kanban**
Una vez autenticado, verás el tablero con 3 columnas:
- **📋 En Cola**: Pedidos nuevos que esperan preparación
- **👨‍🍳 Preparando**: Pedidos en proceso de cocina
- **✅ Listos**: Pedidos terminados y listos para entrega

### **3. Gestión de Pedidos**
- **Mover pedidos**: Usa los botones en cada tarjeta
  - "Iniciar" → Mueve de "En Cola" a "Preparando"
  - "Listo" → Mueve de "Preparando" a "Listos"
  - "Completar" → Elimina el pedido (entregado)
- **Alertas de tiempo**: Los pedidos cambian de color según el tiempo transcurrido
  - ⚠️ Amarillo: +20 minutos
  - 🔥 Rojo: +30 minutos
  - 🚨 "Urgente": +25 minutos

### **4. Cerrar Sesión**
- Clic en el botón **"🚪 Cerrar Sesión"** en el header
- Confirmar en el popup
- Serás redirigido al login

---

## 📱 Acceso desde Dispositivos

### **Tablets/TVs en la Cocina**
1. Abre un navegador (Chrome, Safari, Edge)
2. Ve a: https://kds-app-7f1d3.web.app
3. Inicia sesión
4. **Opcional**: Agregar a pantalla de inicio para acceso rápido

### **Agregar a Pantalla de Inicio (iOS/Android)**
1. Abre en Safari/Chrome
2. Toca el botón **Compartir** (iOS) o **Menú** (Android)
3. Selecciona **"Agregar a pantalla de inicio"**
4. Listo! Tendrás un icono de acceso directo

---

## 🔧 Agregar Pedidos al Sistema

### **Método 1: Desde n8n (Automático)**
> ⚠️ Próximamente: Integración con WhatsApp Business API

### **Método 2: Manualmente via API REST**

```bash
curl -X POST \
  'https://kds-app-7f1d3-default-rtdb.firebaseio.com/pedidos.json' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "1001",
    "cliente": "Juan Pérez",
    "telefono": "573001234567",
    "items": [
      {"nombre": "Hamburguesa Clásica", "cantidad": 2, "precio": 15000},
      {"nombre": "Papas Fritas", "cantidad": 1, "precio": 5000}
    ],
    "total": 35000,
    "estado": "pendiente",
    "timestamp": '$(date +%s000)',
    "notas": "Sin cebolla, extra queso"
  }'
```

### **Método 3: Desde Firebase Console**

1. Ve a: https://console.firebase.google.com/project/kds-app-7f1d3/database/kds-app-7f1d3-default-rtdb/data
2. Clic en **"pedidos"** → **"+"**
3. Agrega los datos en formato JSON
4. Clic en **"Add"**

---

## 👥 Gestión de Usuarios

### **Agregar Más Usuarios**
1. Firebase Console → Authentication → Users
2. Clic en **"Add user"**
3. Ingresa email y contraseña
4. Guardar

### **Eliminar Usuarios**
1. Firebase Console → Authentication → Users
2. Selecciona el usuario
3. Clic en **"Delete user"**

### **Cambiar Contraseña**
1. Firebase Console → Authentication → Users
2. Selecciona el usuario
3. Clic en **"Reset password"**

---

## 🆘 Soporte y Problemas

### **No puedo acceder**
- Verifica que hayas creado el usuario en Firebase Authentication
- Revisa que el email y contraseña sean correctos
- Limpia la caché del navegador (Ctrl+Shift+Del)

### **Los pedidos no aparecen**
- Verifica que estés conectado a internet
- Revisa la consola del navegador (F12) para ver errores
- Verifica que los pedidos estén en Firebase Database

### **Error de autenticación**
- Limpia las cookies del navegador
- Cierra sesión y vuelve a iniciar
- Verifica que Firebase Authentication esté habilitado

---

## 🔗 Enlaces Importantes

### **Firebase Console**
- **Proyecto**: https://console.firebase.google.com/project/kds-app-7f1d3
- **Database**: https://console.firebase.google.com/project/kds-app-7f1d3/database
- **Authentication**: https://console.firebase.google.com/project/kds-app-7f1d3/authentication
- **Hosting**: https://console.firebase.google.com/project/kds-app-7f1d3/hosting

### **GitHub Repository**
```
https://github.com/Osmel1999/proyect-automater
```

---

## 📊 Características Implementadas

✅ **Autenticación Segura**
- Login con email/password
- Protección de rutas
- Sesiones persistentes
- Cierre de sesión

✅ **Tablero Kanban en Tiempo Real**
- 3 columnas (En Cola, Preparando, Listos)
- Actualización automática
- Sincronización con Firebase

✅ **Gestión de Pedidos**
- Mover entre estados
- Completar/eliminar pedidos
- Información detallada (cliente, teléfono, items, total)

✅ **Alertas de Tiempo**
- Indicadores visuales por tiempo transcurrido
- Alertas "Urgente" para pedidos retrasados
- Contador de tiempo en cada tarjeta

✅ **Responsive Design**
- Optimizado para tablets
- Funciona en TVs (pantallas grandes)
- Compatible con móviles

✅ **Notificaciones**
- Sonido al recibir nuevos pedidos
- Vibración en dispositivos móviles
- Actualización del título del navegador

---

## 🎯 Próximos Pasos (Opcionales)

### **Fase 2: Automatización**
- [ ] Integrar WhatsApp Business API
- [ ] Configurar n8n para recibir pedidos
- [ ] Webhook para agregar pedidos automáticamente

### **Fase 3: Mejoras**
- [ ] Dominio personalizado (ej: kds.tuempresa.com)
- [ ] Panel de estadísticas
- [ ] Roles de usuario (admin, cocinero, mesero)
- [ ] Historial de pedidos
- [ ] Reportes de rendimiento

### **Fase 4: Seguridad**
- [ ] Reglas de seguridad más estrictas en Firebase
- [ ] Solo usuarios autenticados pueden leer/escribir
- [ ] Logs de auditoría

---

## ✅ Estado del Sistema

🟢 **Aplicación**: Activa y desplegada
🟢 **Hosting**: Firebase Hosting
🟢 **Base de Datos**: Firebase Realtime Database
🟢 **Autenticación**: Firebase Authentication
🟢 **Repositorio**: GitHub (actualizado)

---

**¡Sistema listo para usar! 🎉**

**Última actualización**: 31 de diciembre de 2024
**Versión**: 1.0
