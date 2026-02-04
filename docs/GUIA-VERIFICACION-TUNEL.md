# 🔍 GUÍA DE VERIFICACIÓN - SISTEMA ANTI-BAN

**Fecha**: 4 de febrero de 2026  
**Estado del Deployment**: ✅ Frontend y Backend Desplegados

---

## 📋 Checklist de Verificación

### **1. ✅ Verificar que WhatsApp está conectado**

Según los logs que vimos:
```
[tenant1770048862553p1dcfnuzr] ✅ Ya está conectado
[tenant1770048862553p1dcfnuzr] 🎉 Conexión establecida exitosamente
```

**Tu tenant ID es**: `tenant1770048862553p1dcfnuzr`

✅ **WhatsApp está CONECTADO**

---

### **2. 🔧 Verificar el Túnel Frontend**

**IMPORTANTE**: Para que el túnel funcione, debes tener una de estas páginas abiertas:

1. **Dashboard** (`dashboard.html`) - Prioridad 1
2. **KDS** (`kds.html`) - Prioridad 2  
3. **WhatsApp Connect** (`whatsapp-connect.html`) - Prioridad 3

#### **Qué hacer ahora:**

1. **Abre el Dashboard en tu navegador**:
   ```
   https://tu-app.railway.app/dashboard.html
   ```

2. **Abre la Consola del Navegador** (F12 o Cmd+Option+I)

3. **Busca estos mensajes**:
   ```javascript
   ✅ [TunnelWorker] Tunnel registered successfully
   🔧 [TunnelWorker] Tunnel active for tenant: tenant1770048862553p1dcfnuzr
   💓 [TunnelWorker] Heartbeat sent
   ```

4. **Verifica el indicador visual**:
   - Debería aparecer un indicador 🟢 verde que dice: **"Protegido - Usando su conexión"**

---

### **3. 📡 Verificar Logs del Backend**

Ejecuta este comando para ver si el túnel se registró en el backend:

```bash
railway logs | grep -i "tunnel" | tail -20
```

**Deberías ver**:
```
✅ [TunnelManager] Túnel registrado: tenant1770048862553p1dcfnuzr
📊 [TunnelManager] Túneles activos: 1
🔧 [tenant1770048862553p1dcfnuzr] Request via túnel: https://...
```

---

### **4. 🧪 Usar la Página de Test**

Abre en tu navegador:
```
https://tu-app.railway.app/test-tunnel.html
```

**Esta página te mostrará**:
- ✅ Estado del túnel frontend
- ✅ Estado de WhatsApp (Baileys)
- 📊 Estadísticas del túnel
- 📝 Logs en tiempo real

**Acciones disponibles**:
- 🔄 Verificar Estado
- 🔧 Registrar Túnel
- 📡 Test Request
- 🗑️ Limpiar Logs

---

### **5. 🎯 Test Completo del Sistema**

#### **Paso 1: Verificar sin túnel**

1. **Cierra todas las ventanas del dashboard/KDS**
2. **Envía un mensaje de WhatsApp** a tu bot
3. **Verifica los logs**:
   ```bash
   railway logs | grep "Request directo Railway" | tail -5
   ```
4. **Deberías ver**: `📡 Request directo Railway: https://web.whatsapp.com/...`

#### **Paso 2: Activar túnel**

1. **Abre el Dashboard** en tu navegador
2. **Espera 5 segundos** (para que se registre el túnel)
3. **Verifica en la consola del navegador**:
   ```javascript
   ✅ [TunnelWorker] Tunnel registered successfully
   ```
4. **Verifica en logs del servidor**:
   ```bash
   railway logs | grep "Túnel registrado" | tail -5
   ```

#### **Paso 3: Verificar requests por túnel**

1. **Con el dashboard abierto**, envía otro mensaje de WhatsApp
2. **Verifica los logs**:
   ```bash
   railway logs | grep "Request via túnel" | tail -5
   ```
3. **Deberías ver**: `🔧 Request via túnel: https://web.whatsapp.com/...`

---

## 🔍 Diagnóstico Rápido

### **Problema: No veo logs de túnel**

**Solución**:
1. Verifica que el archivo `sw-tunnel.js` esté en la raíz del proyecto
2. Verifica que `js/tunnel-worker-register.js` exista
3. Abre DevTools → Application → Service Workers
4. Verifica que haya un Service Worker registrado
5. Si no hay, haz "Force Update" o recarga la página con Cmd+Shift+R

### **Problema: Túnel se desconecta**

**Solución**:
1. Verifica tu conexión a internet
2. Revisa logs de WebSocket errors:
   ```bash
   railway logs | grep -i "websocket" | tail -10
   ```
3. El sistema debería reconectar automáticamente con backoff exponencial

### **Problema: Requests no usan túnel**

**Verificar**:
1. ¿Está el túnel registrado?
   ```bash
   railway logs | grep "Túnel registrado" | tail -5
   ```
2. ¿Está el túnel saludable?
   ```bash
   railway logs | grep "isTunnelHealthy" | tail -5
   ```
3. ¿Hay errores en el proxy?
   ```bash
   railway logs | grep "proxyRequest" | tail -10
   ```

---

## 📊 Comandos Útiles

### **Ver logs en tiempo real**
```bash
railway logs --tail
```

### **Ver solo logs de túnel**
```bash
railway logs | grep -E "Túnel|tunnel|TunnelManager"
```

### **Ver requests HTTP**
```bash
railway logs | grep -E "Request via túnel|Request directo"
```

### **Ver estadísticas**
```bash
railway logs | grep "stats"
```

### **Ver errores**
```bash
railway logs | grep -i "error" | tail -20
```

---

## ✅ Resultado Esperado

### **Con Dashboard Abierto (Túnel Activo)** 🟢
```
[tenant...] 🔧 Request via túnel: https://web.whatsapp.com/api/...
[tenant...] ✅ Response OK (200)
[TunnelManager] 📊 Túneles activos: 1
[TunnelManager] 📊 Requests por túnel: 15
```

**WhatsApp ve**: IP del restaurante (ej: 187.150.23.45) 🏠

### **Con Dashboard Cerrado (Sin Túnel)** 🔴
```
[tenant...] 📡 Request directo Railway: https://web.whatsapp.com/api/...
[tenant...] ✅ Response OK (200)
[TunnelManager] 📊 Túneles activos: 0
```

**WhatsApp ve**: IP de Railway (ej: 157.230.45.123) 🚂

### **Transición (Túnel → Railway)** 🔄
```
[tenant...] ⚠️ Túnel desconectado: client_closed
[tenant...] 🔄 Fallback a Railway - Sesión persiste
[tenant...] 📡 Request directo Railway: https://web.whatsapp.com/...
[tenant...] ✅ Sesión WhatsApp mantiene: CONECTADO
```

---

## 🎯 Próximos Pasos

### **Si TODO funciona** ✅
1. Dejar el dashboard abierto 24/7 en una tablet/PC
2. Monitorear logs por 24 horas
3. Verificar que no hay desconexiones de WhatsApp
4. Documentar el comportamiento

### **Si algo NO funciona** ❌
1. Ejecutar: `./diagnose-tunnel.sh`
2. Abrir: `test-tunnel.html` y usar botones de diagnóstico
3. Revisar consola del navegador (F12)
4. Compartir logs específicos del error

---

## 📞 Información de Soporte

**Tu Configuración Actual**:
- ✅ Backend desplegado en Railway
- ✅ Frontend desplegado
- ✅ WhatsApp conectado
- ✅ Tenant ID: `tenant1770048862553p1dcfnuzr`
- ⏳ Túnel: Por verificar

**Archivos de Test**:
- `/test-tunnel.html` - Página web de diagnóstico
- `/diagnose-tunnel.sh` - Script CLI de diagnóstico

---

**¡Sistema listo para testing!** 🚀

*Última actualización: 4 de febrero de 2026*
