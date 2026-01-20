# 🧪 INSTRUCCIONES PARA PROBAR EL FIX

**Fecha:** 20 de enero de 2026, 12:15 PM  
**Estado:** ✅ DESPLEGADO CON HEADERS ANTI-CACHÉ  
**Commit:** da2ad59

---

## 🎯 QUÉ SE ARREGLÓ

1. **`onboarding.html`** - Ya no sobrescribe el progreso al verificar WhatsApp
2. **`server/index.js`** - Headers anti-caché para TODOS los archivos `.html`

---

## ⚠️ IMPORTANTE: LIMPIAR CACHÉ COMPLETAMENTE

### Paso 1: Cerrar TODAS las pestañas de kdsapp.site

1. Cierra todas las pestañas de `kdsapp.site` en tu navegador
2. Cierra todas las pestañas de `api.kdsapp.site`

### Paso 2: Limpiar caché del navegador

#### En Chrome/Edge:
1. Presiona `Cmd + Shift + Delete` (Mac) o `Ctrl + Shift + Delete` (Windows)
2. Selecciona:
   - **Rango de tiempo:** "Desde siempre"
   - **Imágenes y archivos en caché** ✅
   - **Cookies y otros datos de sitios** ✅
3. Click en "Borrar datos"

#### En Safari:
1. Ve a **Safari > Preferencias > Privacidad**
2. Click en "Administrar datos de sitios web"
3. Busca `kdsapp.site`
4. Click en "Eliminar" y luego "Eliminar ahora"
5. Ve a **Desarrollar > Vaciar cachés**

#### En Firefox:
1. Presiona `Cmd + Shift + Delete` (Mac) o `Ctrl + Shift + Delete` (Windows)
2. Selecciona:
   - **Rango de tiempo:** "Todo"
   - **Caché** ✅
   - **Cookies** ✅
3. Click en "Limpiar ahora"

### Paso 3: Reiniciar el navegador

1. **Cierra completamente el navegador** (no solo la ventana)
2. Espera 5 segundos
3. Abre el navegador de nuevo

---

## 🧪 PRUEBA PASO A PASO

### Test 1: Verificar que el fix está en producción

1. **Abre una pestaña de incógnito/privada:**
   - Chrome/Edge: `Cmd + Shift + N` (Mac) o `Ctrl + Shift + N` (Windows)
   - Safari: `Cmd + Shift + N`
   - Firefox: `Cmd + Shift + P` (Mac) o `Ctrl + Shift + P` (Windows)

2. **Ve a onboarding:**
   ```
   https://api.kdsapp.site/onboarding.html
   ```

3. **Abre la consola del navegador:**
   - Presiona `F12` o `Cmd + Option + I` (Mac)
   - Ve a la pestaña "Console"

4. **Busca este log:**
   ```
   🔧 [FIX v2.0] Guardando tenant SIN sobrescribir progreso...
   ```

   **Si NO ves ese log**, el caché todavía está activo. Repite el Paso 2.

---

### Test 2: Probar el flujo completo

1. **Inicia sesión:**
   ```
   https://api.kdsapp.site/login.html
   ```
   - Usuario: tu email
   - Contraseña: tu password

2. **Ve al dashboard:**
   ```
   https://api.kdsapp.site/dashboard.html
   ```

3. **Completa los pasos del onboarding:**
   - Paso 2: Configurar menú → Agrega un producto → Guarda
   - Paso 3: Personalizar mensajes → Edita un mensaje → Guarda

4. **Verifica en la consola del navegador (F12):**
   ```javascript
   📋 Estado de onboarding leído desde Firebase: {
     whatsapp_connected: true,
     menu_configured: true,
     messages_customized: true,
     bot_tested: false
   }
   ```

5. **Cierra sesión:**
   - Click en "Cerrar sesión" en el dashboard

6. **Vuelve a iniciar sesión:**
   ```
   https://api.kdsapp.site/login.html
   ```

7. **Ve al dashboard de nuevo:**
   ```
   https://api.kdsapp.site/dashboard.html
   ```

8. **RESULTADO ESPERADO:**
   - ✅ Los pasos 2 y 3 deben seguir marcados como "Completado"
   - ✅ La barra de progreso debe mostrar 75% (o 100% si completaste todo)

---

### Test 3: Verificar que onboarding.html NO sobrescribe

1. **Con la sesión activa y el progreso completado, ve a:**
   ```
   https://api.kdsapp.site/onboarding.html
   ```

2. **Abre la consola (F12) y busca:**
   ```javascript
   🔧 [FIX v2.0] Guardando tenant SIN sobrescribir progreso...
   📖 Datos existentes del tenant: {...}
   🔍 Progreso actual antes de actualizar: {
     whatsapp_connected: true,
     menu_configured: true,
     messages_customized: true,
     bot_tested: false
   }
   ```

3. **Ve al dashboard de nuevo:**
   ```
   https://api.kdsapp.site/dashboard.html
   ```

4. **RESULTADO ESPERADO:**
   - ✅ Los pasos 2 y 3 TODAVÍA deben estar como "Completado"
   - ✅ El progreso NO debe haberse borrado

---

## 🔍 VERIFICAR EN FIREBASE

Si quieres confirmar que los datos están en Firebase:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto `kds-app-7f1d3`
3. Ve a **Realtime Database**
4. Navega a: `/tenants/{tu-tenant-id}/onboarding/steps`

Debe mostrar:
```json
{
  "whatsapp_connected": true,
  "menu_configured": true,
  "messages_customized": true,
  "bot_tested": false
}
```

---

## 🐛 SI EL PROBLEMA PERSISTE

### Opción 1: Verificar que el servidor tiene el fix

Abre la consola del navegador en cualquier página `.html` de kdsapp.site y busca:

```
Network tab → Busca el archivo .html → Headers → Response Headers
```

Debes ver:
```
cache-control: no-store, no-cache, must-revalidate, proxy-revalidate
pragma: no-cache
expires: 0
```

Si NO ves esos headers, el servidor NO se actualizó correctamente.

### Opción 2: Verificar los logs del navegador

En la consola, DEBES ver:
```
🔧 [FIX v2.0] Guardando tenant SIN sobrescribir progreso...
```

Si ves:
```
📝 Guardando tenant en Firebase...
```

Entonces el archivo viejo todavía está en caché.

### Opción 3: Probar en otro navegador

Si usas Chrome, prueba en:
- Safari (modo incógnito)
- Firefox (modo privado)
- Edge (ventana InPrivate)

Un navegador diferente NO tendrá el caché.

---

## 📊 CHECKLIST DE VERIFICACIÓN

- [ ] Cerré todas las pestañas de kdsapp.site
- [ ] Limpié el caché del navegador (desde siempre)
- [ ] Reinicié el navegador completamente
- [ ] Abrí una ventana de incógnito/privada
- [ ] Veo el log `🔧 [FIX v2.0]` en la consola
- [ ] Completé los pasos 2 y 3 del onboarding
- [ ] Cerré sesión y volví a iniciar sesión
- [ ] Los pasos siguen como "Completado" ✅

---

## 🎯 SOBRE EL ERROR DE app.js:111

Este es un error DIFERENTE del problema de progreso de onboarding. Es de `kds.html`.

```
app.js:111 Uncaught TypeError: Cannot set properties of null (setting 'textContent')
    at updateClock (app.js:111:56)
    at HTMLDocument.init (app.js:43:5)
```

**Causa:** El archivo `app.js` está intentando actualizar un elemento HTML que no existe en la página.

**Línea 111 de app.js:**
```javascript
document.getElementById('clock').textContent = time;
// ⬆️ Este elemento 'clock' no existe en el HTML
```

**Solución:** Agregar el elemento `<div id="clock"></div>` en `kds.html` o hacer un null check en `app.js`.

Este error NO afecta el problema de progreso de onboarding, pero lo podemos arreglar después si quieres.

---

**Última actualización:** 20 enero 2026, 12:20 PM  
**Estado:** ✅ FIX DESPLEGADO CON ANTI-CACHÉ  
**Deploy:** Railway (Build 44.67s)

---

**FIN DEL DOCUMENTO**
