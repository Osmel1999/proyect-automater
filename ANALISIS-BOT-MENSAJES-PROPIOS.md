# 🔍 ANÁLISIS: Bot enviando mensajes a sí mismo

## ✅ **ESTADO: PROBLEMA RESUELTO**
**Fecha de resolución:** 29 de enero de 2026  
**Commit:** bcb8a21

---

## 📋 Problema Reportado

El bot de WhatsApp estaba enviando mensajes a su propio número, específicamente el mensaje de "No entendí tu mensaje" con las instrucciones de ayuda.

## 🔎 Análisis del Código

### 1. **Falta de Filtro para Mensajes Propios** ⚠️ → ✅ **CORREGIDO**

**Ubicación:** `server/whatsapp-handler.js` líneas 167-192

**CÓDIGO ANTERIOR (❌ PROBLEMA):**
```javascript
async handleMessageChange(value) {
  try {
    const phoneNumberId = value.metadata.phone_number_id;
    const messages = value.messages || [];
    
    // Obtener tenant por phoneNumberId
    const tenant = await tenantService.getTenantByPhoneNumberId(phoneNumberId);
    
    for (const message of messages) {
      console.log(`📩 Nuevo mensaje recibido en tenant: ${tenant.tenantId}`);
      console.log(`   De: ${message.from}`);
      console.log(`   Tipo: ${message.type}`);
      
      // ❌ NO HAY VERIFICACIÓN AQUÍ
      if (message.type === 'text') {
        await this.handleTextMessage(tenant, message);
      }
      // ...
    }
  }
}
```

**CÓDIGO NUEVO (✅ CORREGIDO):**
```javascript
async handleMessageChange(value) {
  try {
    const phoneNumberId = value.metadata.phone_number_id;
    const botPhoneNumber = value.metadata.display_phone_number; // Número del bot
    const messages = value.messages || [];
    
    // Obtener tenant por phoneNumberId
    const tenant = await tenantService.getTenantByPhoneNumberId(phoneNumberId);
    
    for (const message of messages) {
      // 🛡️ FILTRO ANTI-LOOP: Ignorar mensajes enviados por el bot mismo
      if (message.from === botPhoneNumber) {
        console.log(`🔄 Mensaje ignorado (enviado por el bot): ${message.id}`);
        console.log(`   Bot: ${botPhoneNumber}`);
        continue; // Saltar este mensaje
      }
      
      console.log(`📩 Nuevo mensaje recibido en tenant: ${tenant.tenantId}`);
      console.log(`   De: ${message.from}`);
      console.log(`   Tipo: ${message.type}`);
      
      // ✅ AHORA SOLO PROCESA MENSAJES DE CLIENTES
      if (message.type === 'text') {
        await this.handleTextMessage(tenant, message);
      }
      // ...
    }
  }
}
```

**PROBLEMA IDENTIFICADO:** 
- ❌ **No había ningún filtro** que verificara si el mensaje venía del propio bot
- ❌ Todos los mensajes entrantes se procesaban, incluyendo los que el bot enviaba
- ✅ **SOLUCIÓN:** Agregar validación `if (message.from === botPhoneNumber) continue;`

### 2. **Webhook de WhatsApp incluye mensajes salientes** 📤

Según la documentación de WhatsApp Business API, el webhook recibe TODOS los mensajes de una conversación, incluyendo:
- ✅ Mensajes entrantes (de clientes)
- ✅ **Mensajes salientes (del propio bot)** ⚠️
- ✅ Cambios de estado (entregado, leído)

### 3. **Campos disponibles en el webhook para filtrar**

WhatsApp incluye en cada mensaje información para identificar el origen:

```json
{
  "messages": [{
    "from": "573001234567",  // Número del remitente
    "id": "wamid.xxx",
    "timestamp": "1234567890",
    "type": "text",
    "text": { "body": "mensaje" }
  }],
  "metadata": {
    "display_phone_number": "573009876543",  // Número del bot (display)
    "phone_number_id": "123456789"           // ID del número del bot
  }
}
```

## 🎯 Por qué está sucediendo

### Flujo del problema:

1. **Cliente envía mensaje** → "Quiero pizza"
2. **Bot procesa y responde** → "✅ Pizza agregada..."
3. **WhatsApp envía webhook** con el mensaje del bot (mensaje saliente)
4. **Bot NO filtra** y procesa su propio mensaje
5. **Bot no entiende su propio mensaje** → Responde "❓ No entendí tu mensaje"
6. **Loop potencial:** El paso 3 se repite con el nuevo mensaje del bot

### ¿Por qué el mensaje "No entendí"?

El mensaje del bot (como "✅ Pizza agregada al carrito") no coincide con ningún patrón esperado por el bot (no es "menu", "confirmar", ni un pedido válido), por lo que el bot responde con el mensaje de ayuda.

## 🚨 Impacto (RESUELTO)

1. ❌ ~~**Confusión del cliente:** Ve mensajes inesperados del bot~~ → ✅ **Corregido**
2. ❌ ~~**Spam en el chat:** El bot habla consigo mismo~~ → ✅ **Corregido**
3. ❌ ~~**Posible loop infinito:** Si el bot sigue procesando sus propias respuestas~~ → ✅ **Prevenido**
4. ❌ ~~**Costos innecesarios:** Cada mensaje a WhatsApp API tiene un costo~~ → ✅ **Optimizado**
5. **Logs contaminados:** Dificulta el debugging

## ✅ Solución Requerida

Se necesita agregar un filtro en `handleMessageChange()` que verifique:

```javascript
// Opción 1: Comparar números
if (message.from === value.metadata.display_phone_number) {
  console.log('⏭️ Ignorando mensaje propio');
  continue; // Saltar este mensaje
}

// Opción 2: Verificar si el webhook incluye campo "from_me" o similar
// (esto depende de la estructura exacta del webhook de WhatsApp)
```

## 📊 Datos Necesarios para Implementar Fix

1. ✅ Confirmar estructura exacta del webhook cuando llega un mensaje del bot
2. ✅ Verificar si `message.from` coincide con `metadata.display_phone_number`
3. ✅ Revisar si WhatsApp incluye algún flag como `from_me`, `is_echo`, etc.

## 🔧 Archivos que requieren cambios

- `server/whatsapp-handler.js` - Método `handleMessageChange()`
- Potencialmente necesitar obtener el número del bot desde la metadata o tenant

## 📝 Notas Adicionales

- Este es un problema **común** en bots de WhatsApp Business API
- La solución es **simple** una vez identificado
- No afecta la funcionalidad core, pero degrada la experiencia de usuario
- Debe implementarse junto con logging para confirmar que funciona

---

**Fecha de análisis:** 29 de enero de 2026  
**Prioridad:** 🔴 Alta (afecta experiencia de usuario)  
**Complejidad:** 🟢 Baja (solo requiere un filtro)
