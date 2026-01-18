# 🔧 TROUBLESHOOTING: Bot No Responde

**Última actualización:** 2026-01-18 18:59 UTC

## ❓ Problema
El bot no responde a los mensajes entrantes de WhatsApp.

## ✅ Diagnóstico Realizado

### 1. Verificación del Callback
- **Estado:** ✅ **OK** - El callback está registrado correctamente
- **Log:** `[INFO] [*] Message callback registrado`

### 2. Verificación de Bot Logic
- **Estado:** ✅ **OK** - El bot procesa mensajes y genera respuestas
- **Prueba:** Endpoint `/api/baileys/test-message` funciona correctamente
- **Respuesta generada:** Menú completo con items del restaurante

### 3. Verificación de Envío de Mensajes
- **Estado:** ❌ **FALLO** - El mensaje no se envía
- **Error:** `[INFO] [prueba-tenant] Error enviando mensaje`
- **Causa raíz:** `No active session for tenant: ${tenantId}`

## 🎯 Causa Raíz Identificada

**El bot NO puede enviar mensajes si no hay una sesión activa de Baileys conectada.**

### ¿Qué es una "sesión activa"?

Una sesión activa es una conexión de WhatsApp Web/Multi-Device a través de Baileys. Para tener una sesión activa:

1. Un usuario debe entrar al **onboarding** (`/onboarding.html`)
2. Debe **escanear el código QR** con su WhatsApp
3. La sesión queda **conectada** y guardada en Firebase
4. A partir de ese momento, el bot puede **recibir y enviar** mensajes

### ¿Por qué la sesión no está activa?

Posibles causas:

1. **Nunca se escaneó el QR** - El onboarding no se completó
2. **La sesión se desconectó** - WhatsApp cerró la conexión (timeout, logout, etc.)
3. **El servidor se reinició** - Las sesiones en memoria se perdieron

## 🔧 Soluciones

### Solución 1: Reconectar WhatsApp (Recomendada)

**Pasos:**

1. Ir a https://app.kdsapp.site/onboarding
2. Si ya hay credenciales guardadas, hacer click en "Reconectar"
3. Si el QR no aparece, hacer logout y volver a conectar escaneando el QR
4. Esperar a que aparezca "✅ Conectado" con el número de teléfono
5. Enviar un mensaje de prueba al número de WhatsApp conectado

### Solución 2: Verificar Estado de la Sesión

**Endpoint de diagnóstico:**

```bash
curl https://api.kdsapp.site/api/baileys/status?tenantId=TU_TENANT_ID
```

**Respuesta esperada si está conectado:**

```json
{
  "connected": true,
  "phoneNumber": "+549XXXXXXXXX",
  "lastSeen": "2026-01-18T18:59:00.000Z"
}
```

**Respuesta si NO está conectado:**

```json
{
  "connected": false,
  "error": "No active session"
}
```

### Solución 3: Limpiar Sesión Corrupta

Si la sesión está "medio conectada" pero no funciona:

```bash
curl -X POST https://api.kdsapp.site/api/baileys/clean-session \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "TU_TENANT_ID"}'
```

Luego volver a conectar desde el onboarding.

## 📊 Logs de Debug

Para ver logs detallados en Railway:

```bash
railway logs --tail 100 | grep -A 5 "DEBUG\|mensaje\|response"
```

### Logs Normales (Funcionando)

```
🔍 [DEBUG] handleIncomingMessages llamado para tenant XXX
🔍 [DEBUG] Mensaje tipo notify de 549XXXXXXXXX@s.whatsapp.net
🔍 [DEBUG] Emitiendo evento 'message' para tenant XXX
🔍 [DEBUG] Callback global ejecutado
📩 Procesando mensaje en tenant XXX
🟢 Bot activo para tenant XXX
📋 Generando menú para tenant XXX
🔍 [DEBUG] Enviando respuesta a 549XXXXXXXXX
✅ Respuesta enviada a 549XXXXXXXXX
```

### Logs con Error (No Conectado)

```
🔍 [DEBUG] Enviando respuesta a 549XXXXXXXXX
[INFO] [tenant] Error enviando mensaje
❌ Error enviando respuesta: { success: false, error: 'No active session' }
```

## 🎯 Próximos Pasos

1. **Verificar si hay sesión conectada** con el endpoint `/api/baileys/status`
2. **Si no hay sesión:** Conectar desde `/onboarding`
3. **Si hay sesión pero no funciona:** Limpiar sesión y reconectar
4. **Si sigue sin funcionar:** Revisar logs de Railway para encontrar el error específico

## 🚨 Nota Importante

**El bot SOLO funciona con sesiones activas de Baileys.** No hay forma de que el bot reciba o envíe mensajes si no hay una sesión de WhatsApp conectada a través de Baileys.

Esto es diferente de la Meta API (anterior), donde los mensajes llegaban directamente desde el webhook de Meta. Con Baileys, necesitamos mantener una conexión activa de WhatsApp Web.

## 📝 Checklist Pre-Prueba

Antes de reportar "el bot no responde", verificar:

- [ ] ¿Hay una sesión conectada? (`/api/baileys/status`)
- [ ] ¿El número de WhatsApp es el correcto?
- [ ] ¿El toggle del bot está activado en el dashboard?
- [ ] ¿El onboarding está al menos al 75%?
- [ ] ¿Hay menú configurado en Firebase?
- [ ] ¿El mensaje fue enviado desde el número conectado?

