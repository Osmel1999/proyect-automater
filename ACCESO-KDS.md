# 🔐 Guía de Acceso al Sistema KDS

## 📋 URLs del Sistema

Tu aplicación tiene diferentes URLs para diferentes propósitos:

### 🏠 **Sitio Web Público** (Landing Page)
```
https://kds-app-7f1d3.web.app/
```
- Esta es la página principal que ven tus clientes
- Contiene información sobre tu servicio
- Botón de "Pedir por WhatsApp" que abre chat con el 3042734424
- Enlaces a Política de Privacidad y Términos

---

### 🍳 **Sistema KDS** (Kitchen Display System)
```
https://kds-app-7f1d3.web.app/kds
```
o también puedes usar:
```
https://kds-app-7f1d3.web.app/kds.html
```

**Este es el sistema para la cocina** donde se muestran los pedidos en tiempo real.

---

### 🔑 **Página de Login**
```
https://kds-app-7f1d3.web.app/login
```
o también:
```
https://kds-app-7f1d3.web.app/login.html
```

---

## 🎯 ¿Cómo Acceder al KDS?

### Opción 1: Acceso Directo
1. Abre tu navegador
2. Ve a: `https://kds-app-7f1d3.web.app/kds`
3. Si no has iniciado sesión, te redirigirá automáticamente al login
4. Ingresa tus credenciales
5. Serás redirigido al KDS

### Opción 2: Desde el Login
1. Abre: `https://kds-app-7f1d3.web.app/login`
2. Ingresa tus credenciales:
   - **Email:** cocina@cocinaoulta.com
   - **Password:** (la contraseña que configuramos)
3. Haz clic en "Iniciar Sesión"
4. Serás redirigido al KDS automáticamente

---

## 🔐 Credenciales de Acceso

Las credenciales actuales del sistema están en el archivo `CREDENCIALES.md`:

```
Email: cocina@cocinaoulta.com
Password: [tu contraseña segura]
```

> ⚠️ **IMPORTANTE:** 
> - Solo el personal de cocina debe tener acceso a estas credenciales
> - No compartas las credenciales públicamente
> - Cambia la contraseña periódicamente por seguridad

---

## 📱 Acceso desde Dispositivos Móviles

El KDS es **responsive** y funciona perfectamente en:
- 📱 Smartphones
- 📱 Tablets
- 💻 Laptops
- 🖥️ Monitores de escritorio

### Recomendaciones para el uso en cocina:
1. **Usa una tablet o monitor grande** para mejor visibilidad
2. **Mantén el navegador en pantalla completa** (F11 en escritorio)
3. **Habilita las notificaciones** del navegador para alertas de pedidos
4. **Mantén el volumen activado** para escuchar alertas sonoras

---

## 🚀 Flujo Completo de Acceso

```
Cliente                          Cocina
   |                               |
   | 1. Visita landing page        |
   | https://kds-app-7f1d3.web.app |
   |                               |
   | 2. Click "Pedir por WhatsApp" |
   | (Abre chat con 3042734424)    |
   |                               |
   |                               | 3. Abre KDS
   |                               | https://kds-app-7f1d3.web.app/kds
   |                               |
   |                               | 4. Login (si no está logueado)
   |                               |
   | 5. Hace pedido por WhatsApp   |
   |                               |
   |                               | 6. Ve pedido en KDS
   |                               | (Cuando n8n esté integrado)
```

---

## 🔧 Solución de Problemas

### "No puedo acceder al KDS"
✅ **Solución:**
- Verifica que estés usando la URL correcta: `/kds` (no `/`)
- Borra el caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)
- Intenta en modo incógnito

### "Me redirige al home en lugar del KDS"
✅ **Solución:**
- La raíz (`/`) ahora muestra el sitio público
- Para el KDS, usa: `/kds` o `/login`

### "No recuerdo la contraseña"
✅ **Solución:**
- Revisa el archivo `CREDENCIALES.md`
- Si necesitas resetearla, contacta al administrador del sistema

---

## 📝 Datos de Contacto Actualizados

Todos los datos de contacto en el sitio web ahora muestran:

- 📱 **WhatsApp:** +57 304 273 4424
- 📧 **Email:** info.teserakt@gmail.com
- 📍 **Ubicación:** Barranquilla, Colombia

---

## 🎉 Próximos Pasos

1. ✅ Accede al KDS con tus credenciales
2. ⏳ Integra WhatsApp Business API
3. ⏳ Configura n8n para automatizar el flujo de pedidos
4. ⏳ Prueba el flujo completo: WhatsApp → n8n → Firebase → KDS
5. 🚀 ¡Comienza a recibir pedidos reales!

---

**Última actualización:** 31 de diciembre de 2025
