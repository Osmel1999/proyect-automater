# 📱 GUÍA COMPLETA: Configurar WhatsApp Business API

## 🎯 Objetivo
Configurar Meta Cloud API (WhatsApp Business API) para recibir pedidos automáticamente.

---

## 📋 PRERREQUISITOS

Antes de empezar, necesitas:
- [ ] Una cuenta de Facebook personal
- [ ] Un número de teléfono para el negocio (que NO esté registrado en WhatsApp)
- [ ] Acceso como administrador del negocio
- [ ] ~30-60 minutos de tiempo

---

## 🚀 PASO 1: Crear Facebook Business Account

### **1.1 Accede a Facebook Business**
👉 https://business.facebook.com/

### **1.2 Crear cuenta de negocio**
1. Clic en **"Crear cuenta"**
2. Completa la información:
   - Nombre del negocio: "Tu Cocina Oculta" (o el nombre de tu negocio)
   - Tu nombre
   - Email de negocio

3. Clic en **"Enviar"**

### **1.3 Verificar email**
- Revisa tu email y verifica la cuenta

---

## 📱 PASO 2: Configurar WhatsApp Business API

### **2.1 Accede a WhatsApp en Meta Business**
👉 https://business.facebook.com/wa/manage/home/

O desde tu Facebook Business:
1. Menú lateral → **"WhatsApp Accounts"**
2. Clic en **"Add WhatsApp Account"**

### **2.2 Crear cuenta de WhatsApp Business**
1. Selecciona tu **Business Account** (el que creaste en Paso 1)
2. Clic en **"Next"** (Siguiente)

### **2.3 Agregar número de teléfono**

⚠️ **IMPORTANTE**: El número debe cumplir:
- ❌ NO estar registrado en WhatsApp personal
- ❌ NO estar registrado en WhatsApp Business app
- ✅ Ser un número que puedas verificar (recibirás SMS o llamada)
- ✅ Tener acceso constante (será el número de tu negocio)

**Pasos:**
1. Selecciona país (ej: Colombia +57)
2. Ingresa el número: `300 123 4567` (tu número de negocio)
3. Clic en **"Next"**

### **2.4 Verificar el número**

Meta te enviará un código de verificación:

**Opción 1: SMS**
- Recibirás un SMS con código de 6 dígitos
- Ingresa el código

**Opción 2: Llamada telefónica**
- Si no llega SMS, clic en "Call me instead"
- Recibirás llamada con código
- Ingresa el código

**Ingresa el código de verificación** y clic en **"Next"**

### **2.5 Configurar perfil del negocio**

Completa la información visible para clientes:
- **Nombre del negocio**: "Tu Cocina Oculta"
- **Categoría**: "Restaurante" o "Comida rápida"
- **Descripción**: "Cocina oculta - Pedidos por WhatsApp"
- **Dirección**: (Opcional, pero recomendado)
- **Sitio web**: (Opcional)
- **Logo**: Sube el logo de tu negocio

Clic en **"Next"**

---

## 🔑 PASO 3: Obtener Credenciales de API

### **3.1 Accede al panel de configuración**
👉 https://business.facebook.com/wa/manage/phone-numbers/

O:
1. Menú → **"WhatsApp Manager"**
2. Selecciona tu número de teléfono
3. Clic en **"API Setup"**

### **3.2 Obtener Token de Acceso (Access Token)**

1. En el panel de API Setup, busca **"Temporary access token"**
2. Clic en **"Copy"** para copiar el token
3. **GUARDA ESTE TOKEN** en un lugar seguro (lo necesitarás)

El token se ve así:
```
EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **IMPORTANTE**: 
- Este token es **temporal** (24-72 horas)
- Más adelante configuraremos un token permanente
- Por ahora úsalo para pruebas

### **3.3 Obtener Phone Number ID**

En la misma pantalla, busca:
- **"Phone number ID"**: Un número largo como `123456789012345`
- Cópialo y guárdalo

### **3.4 Obtener WhatsApp Business Account ID**

1. En el menú superior, clic en **"Settings"** (Configuración)
2. Busca **"WhatsApp Business Account ID"**
3. Cópialo (se ve como: `108xxxxxxxxx`)
4. Guárdalo

---

## 📝 PASO 4: Guardar Credenciales

Crea un archivo con tus credenciales (NO lo subas a GitHub):

```bash
# Crear archivo de credenciales
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
touch .env.whatsapp
```

Contenido del archivo `.env.whatsapp`:
```env
# WhatsApp Business API - Credenciales
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=108xxxxxxxxx
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER=+573001234567
WEBHOOK_VERIFY_TOKEN=mi_token_secreto_123
```

---

## 🔔 PASO 5: Configurar Webhook

Los webhooks permiten recibir mensajes entrantes en tiempo real.

### **5.1 Crear URL de Webhook (temporal)**

Por ahora, usaremos **webhook.site** para pruebas:

1. Ve a: https://webhook.site/
2. Copia tu **"Unique URL"** (se ve como: `https://webhook.site/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
3. Guárdala

### **5.2 Configurar Webhook en Meta**

1. En WhatsApp Manager, ve a **"Configuration"** → **"Webhooks"**
2. Clic en **"Edit"** o **"Configure webhooks"**

**Completa:**
- **Callback URL**: Pega tu URL de webhook.site
- **Verify Token**: Ingresa un token secreto (ej: `mi_token_secreto_123`)
  - Este token lo inventas tú, puede ser cualquier cosa
  - Guárdalo en tu archivo `.env.whatsapp`

3. Clic en **"Verify and Save"**

### **5.3 Suscribirse a eventos**

En la misma pantalla de Webhooks:
1. Busca **"Webhook fields"**
2. Activa estas opciones:
   - ✅ **messages** (mensajes entrantes)
   - ✅ **message_status** (estado de mensajes enviados)
3. Clic en **"Save"**

---

## 🧪 PASO 6: Probar Envío de Mensajes

### **6.1 Enviar mensaje de prueba desde API**

Vamos a probar que puedes enviar mensajes:

```bash
# Desde tu terminal
curl -X POST \
  "https://graph.facebook.com/v18.0/TU_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "TU_NUMERO_PERSONAL",
    "type": "text",
    "text": {
      "body": "🎉 ¡Hola! Este es un mensaje de prueba desde la API de WhatsApp Business."
    }
  }'
```

**Reemplaza:**
- `TU_PHONE_NUMBER_ID`: El Phone Number ID que copiaste
- `TU_ACCESS_TOKEN`: Tu token de acceso
- `TU_NUMERO_PERSONAL`: Tu número personal (con código de país, sin +, ej: `573001234567`)

**Ejemplo real:**
```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/123456789012345/messages" \
  -H "Authorization: Bearer EAAxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "573001234567",
    "type": "text",
    "text": {
      "body": "🎉 ¡Prueba exitosa! Tu API de WhatsApp funciona."
    }
  }'
```

### **6.2 Verificar recepción**

Deberías recibir el mensaje en tu WhatsApp personal en unos segundos.

✅ **Si recibiste el mensaje**: ¡Perfecto! La API funciona.
❌ **Si no llegó**: Revisa el token y el Phone Number ID.

---

## 📥 PASO 7: Probar Recepción de Mensajes

### **7.1 Enviar mensaje a tu número de negocio**

1. Desde tu WhatsApp personal, envía un mensaje al **número de negocio** que configuraste
2. Ejemplo: "Hola, quiero hacer un pedido"

### **7.2 Ver el webhook en acción**

1. Ve a: https://webhook.site/ (tu URL única)
2. Deberías ver aparecer un **POST request** con el mensaje que enviaste
3. Revisa el JSON, se verá así:

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "300xxxxxxx",
          "phone_number_id": "123456789012345"
        },
        "contacts": [{
          "profile": {
            "name": "Juan Pérez"
          },
          "wa_id": "573001234567"
        }],
        "messages": [{
          "from": "573001234567",
          "id": "wamid.xxxx",
          "timestamp": "1735567890",
          "text": {
            "body": "Hola, quiero hacer un pedido"
          },
          "type": "text"
        }]
      },
      "field": "messages"
    }]
  }]
}
```

✅ **Si ves el webhook**: ¡Perfecto! La recepción funciona.
❌ **Si no aparece**: Revisa la configuración del webhook.

---

## 🎯 PASO 8: Crear Token Permanente

El token temporal expira en 24-72 horas. Necesitas uno permanente.

### **8.1 Crear System User**

1. Ve a: https://business.facebook.com/settings/system-users
2. Clic en **"Add"** → **"Add System User"**
3. **Nombre**: "WhatsApp API User"
4. **Role**: Admin
5. Clic en **"Create System User"**

### **8.2 Asignar permisos**

1. Clic en el System User que creaste
2. Clic en **"Add Assets"**
3. Selecciona **"Apps"**
4. Busca y selecciona tu **WhatsApp Business Account**
5. Activa **"Manage app"** permission
6. Clic en **"Save Changes"**

### **8.3 Generar token permanente**

1. En el System User, clic en **"Generate New Token"**
2. Selecciona tu **App**
3. Selecciona permisos:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
4. Clic en **"Generate Token"**
5. **COPIA EL TOKEN** (solo se muestra una vez)
6. Guárdalo en tu `.env.whatsapp`

---

## 📋 PASO 9: Verificar Todo

### **Checklist final:**

- [ ] ✅ Facebook Business Account creado
- [ ] ✅ WhatsApp Business API configurado
- [ ] ✅ Número de teléfono verificado
- [ ] ✅ Phone Number ID obtenido
- [ ] ✅ Access Token (permanente) obtenido
- [ ] ✅ Webhook configurado (webhook.site por ahora)
- [ ] ✅ Prueba de envío exitosa (API → WhatsApp)
- [ ] ✅ Prueba de recepción exitosa (WhatsApp → Webhook)
- [ ] ✅ Credenciales guardadas en `.env.whatsapp`

---

## 🎉 ¡FELICITACIONES!

Si completaste todos los pasos, ahora tienes:
- ✅ WhatsApp Business API funcionando
- ✅ Puedes enviar mensajes desde código
- ✅ Puedes recibir mensajes en webhook
- ✅ Token permanente configurado
- ✅ **TODO GRATIS** (hasta 1,000 conversaciones/mes)

---

## 📝 PRÓXIMO PASO

Ahora que tienes WhatsApp configurado, el siguiente paso es:
👉 **Configurar n8n para conectar WhatsApp con Firebase**

---

## 🆘 PROBLEMAS COMUNES

### **No recibo el código de verificación**
- Verifica que el número no esté registrado en WhatsApp
- Prueba con otro número
- Espera 5-10 minutos e intenta de nuevo

### **El webhook no recibe mensajes**
- Verifica que la URL del webhook esté activa
- Revisa que el verify token sea correcto
- Asegúrate de estar suscrito a "messages"

### **Error al enviar mensaje: "Invalid access token"**
- El token expiró, genera uno nuevo (permanente)
- Verifica que copiaste el token completo

### **Mensaje no llega a WhatsApp**
- Verifica el Phone Number ID
- Verifica que el número destino tenga código de país (sin +)
- Verifica que el número destino esté en formato correcto

---

## 📞 RECURSOS ADICIALES

**Documentación oficial:**
- https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages

**Mi número de negocio:** [Anota tu número aquí]
**Phone Number ID:** [Anota tu ID aquí]
**WABA ID:** [Anota tu ID aquí]

---

## ✅ CREDENCIALES FINALES

Una vez completado todo, tu archivo `.env.whatsapp` debería verse así:

```env
# WhatsApp Business API - Credenciales REALES
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=108xxxxxxxxx
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (PERMANENTE)
WHATSAPP_PHONE_NUMBER=+573001234567
WEBHOOK_VERIFY_TOKEN=mi_token_secreto_123
```

⚠️ **NUNCA subas este archivo a GitHub**

---

**Fecha**: 31 de diciembre de 2024
**Estado**: ✅ Lista para seguir

**¿Listo para continuar con n8n?** 🚀
