# 🔧 TROUBLESHOOTING: Problema con Generación de QR

**Fecha:** 3 de febrero de 2026  
**Problema:** QR no se muestra en whatsapp-connect.html  
**Tenant:** tenant1770048862553p1dcfnuzr

---

## ✅ Diagnóstico Actual

### 1. Proxy: ✅ FUNCIONANDO PERFECTAMENTE
```
✅ Nueva sesión de proxy creada automáticamente
🔐 Usando proxy para conexión (Anti-Ban activado)
🎯 Este restaurante ahora tiene su propia IP única
🔗 Agente proxy creado para session-tenant1770048862553p1dcfnuzr
```

El proxy de Bright Data está configurado y funcionando correctamente.

### 2. Inicialización de Sesión: ⚠️ PROBLEMA IDENTIFICADO
```
[INFO] [tenant1770048862553p1dcfnuzr] Sesión inicializada exitosamente
[INFO] [tenant1770048862553p1dcfnuzr] Conexión cerrada. Reconectar: false
[INFO] [tenant1770048862553p1dcfnuzr] Sesión cerrada permanentemente (logout)
```

**Problema:** La sesión se inicializa correctamente pero se cierra inmediatamente después.

---

## 🔍 Posibles Causas

### 1. Timeout del Proxy
- El proxy puede estar tardando más de lo esperado en conectarse a los servidores de WhatsApp
- Solución: Aumentar timeout en la configuración del proxy agent

### 2. Error en Baileys con Proxy
- Baileys puede tener problemas con el formato del proxy
- Solución: Verificar que HttpsProxyAgent esté configurado correctamente

### 3. Problema de Firestore/Firebase
```
[INFO] [tenant1770048862553p1dcfnuzr] Error verificando Firestore
[INFO] [tenant1770048862553p1dcfnuzr] Error guardando estado de conexión en Firebase
```
- Los errores de Firebase pueden estar causando que la sesión se cierre
- Solución: Verificar las reglas de Firebase y la configuración

---

## 🛠️ Soluciones Propuestas

### Solución 1: Aumentar Timeout del Proxy Agent

**Archivo:** `server/baileys/proxy-manager.js`

**Cambio actual:**
```javascript
const agent = new HttpsProxyAgent(proxyConfig.url, {
  keepAlive: true,
  keepAliveMsecs: 1000,
  timeout: 30000, // 30 segundos
  rejectUnauthorized: false
});
```

**Cambio propuesto:**
```javascript
const agent = new HttpsProxyAgent(proxyConfig.url, {
  keepAlive: true,
  keepAliveMsecs: 5000,
  timeout: 60000, // Aumentar a 60 segundos
  rejectUnauthorized: false
});
```

### Solución 2: Deshabilitar Temporalmente el Proxy para Debugging

Para verificar si el problema es el proxy:

**Comentar temporalmente:**
```javascript
// const agent = this.getProxyAgent(tenantId);
const agent = null; // Deshabilitar proxy temporalmente
```

Si funciona sin proxy, el problema es específico del proxy.
Si NO funciona sin proxy, el problema es otro.

### Solución 3: Verificar Reglas de Firebase

Asegurarse de que las reglas de Firebase Realtime Database permitan escritura:

```json
{
  "rules": {
    "tenants": {
      "$tenantId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## 📊 Pasos para Debug

### Paso 1: Verificar Frontend
1. Abrir: https://kdsapp.site/whatsapp-connect.html?tenantId=tenant1770048862553p1dcfnuzr
2. Abrir consola del navegador (F12)
3. Buscar errores de JavaScript o peticiones fallidas

### Paso 2: Probar sin Proxy (Temporalmente)
1. Comentar el uso del proxy en el código
2. Redesplegar
3. Ver si el QR se genera

### Paso 3: Aumentar Timeout
1. Aumentar timeout del proxy agent a 60 segundos
2. Redesplegar
3. Intentar nuevamente

### Paso 4: Logs Detallados
```bash
railway logs --tail 100 | grep -A 5 -B 5 "Inicializando sesión"
```

---

## 🎯 Acción Inmediata Recomendada

**OPCIÓN A: Debugging (Recomendado)**
1. Revisar errores en consola del navegador
2. Si no hay errores de frontend, el problema está en backend

**OPCIÓN B: Solución Rápida**
1. Aumentar timeout del proxy agent
2. Agregar más logs para debug
3. Redesplegar

**OPCIÓN C: Bypass Temporal**
1. Deshabilitar proxy temporalmente
2. Conectar WhatsApp
3. Reactivar proxy

---

## ⏰ Timeline de Debug

**00:00** - Proxy configurado y funcionando  
**00:01** - Sesión inicializada exitosamente  
**00:02** - Sesión se cierra inmediatamente  
**00:03** - Error: "Sesión cerrada permanentemente"

**Tiempo entre inicialización y cierre:** ~1-2 segundos

Esto sugiere un timeout o error de conexión muy rápido, posiblemente en la primera petición a los servidores de WhatsApp a través del proxy.

---

## 📝 Notas Adicionales

- El proxy está creándose correctamente
- La IP del proxy es válida (Colombia)
- El problema parece estar en la capa de transporte Baileys → WhatsApp Servers
- Posible que Bright Data esté bloqueando conexiones a servidores de WhatsApp

---

## 🔗 Enlaces Útiles

- [Bright Data Troubleshooting](https://docs.brightdata.com/general/account/troubleshooting)
- [Baileys GitHub Issues](https://github.com/WhiskeySockets/Baileys/issues)
- [HttpsProxyAgent Docs](https://www.npmjs.com/package/https-proxy-agent)
