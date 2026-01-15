# 🧪 GUÍA: API TESTING DE WHATSAPP BUSINESS

**Fecha**: 27 de diciembre de 2024  
**App ID**: 849706941272247

---

## 📋 INFORMACIÓN DE LA CUENTA DE PRUEBA

Según la captura de pantalla:

```
WhatsApp Business Account ID: 1230720492271251
Phone Number ID: 985474321308699
Test Number (FROM): +1 555 156 1260  ← Este número ENVÍA mensajes
```

**Importante**: 
- El **Test Number** es el número de **ORIGEN** (FROM) que envía mensajes
- Los mensajes se envían **A** (TO) cualquier número de WhatsApp válido
- Ejemplo: El Test Number `+1 555 156 1260` enviará mensajes a `573042734424`

**Nota**: Esta es una cuenta de prueba generada por Meta que te permite enviar mensajes gratis durante 90 días.

---

## 🎯 PASO 1: GENERAR ACCESS TOKEN TEMPORAL

### En Meta Dashboard:

1. Ve a: https://developers.facebook.com/apps/849706941272247/whatsapp-business/wa-dev-console/
2. En la sección **"1. Generate a temporary access token"**
3. Click en **"Generate access token"**
4. Se generará un token que dura **60 minutos**
5. Click en el botón **"Copy"** para copiarlo

**Guarda este token**, lo necesitarás para los siguientes pasos.

---

## 🎯 PASO 2: ACTIVAR WEBHOOK LISTENING

En la sección **"4. Turn on webhook listening"**:

1. Asegúrate que el toggle esté en **ON** (azul)
2. Esto permitirá que tu webhook reciba eventos en tiempo real

**Webhook configurado**: `https://api.kdsapp.site/webhook/whatsapp`

---

## 🎯 PASO 3: ENVIAR MENSAJE DE PRUEBA

### 📱 ENTENDIENDO FROM y TO

**Flujo del mensaje**:
```
Test Number (+1 555 156 1260)  ────→  Tu número (573042734424)
      ↑ FROM (origen)                        ↑ TO (destinatario)
```

- **FROM**: El número de prueba de Meta (`+1 555 156 1260`) configurado en el Dashboard
- **TO**: El número que recibirá el mensaje (`573042734424` o cualquier número válido)

---

### Opción A: Usar el comando cURL de Meta

Meta te proporciona un comando cURL en la sección **"6. Send messages with the API"**.

El comando será algo como:

```bash
curl -i -X POST \
  https://graph.facebook.com/v22.0/985474321308699/messages \
  -H 'Authorization: Bearer [TU_ACCESS_TOKEN]' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "573042734424",
    "type": "template",
    "template": {
      "name": "jaspers_market_plain_text_v1",
      "language": {
        "code": "en_US"
      }
    }
  }'
```

**Importante**: 
- Reemplaza `[TU_ACCESS_TOKEN]` con el token que generaste en el Paso 1
- `"to": "573042734424"` → El número que recibirá el mensaje (formato internacional sin + ni espacios)
- El mensaje vendrá **desde** el Test Number configurado en Meta

---

### Opción B: Enviar mensaje de texto simple

Para enviar un mensaje de texto (no template), usa este comando:

```bash
curl -i -X POST \
  https://graph.facebook.com/v22.0/985474321308699/messages \
  -H 'Authorization: Bearer [TU_ACCESS_TOKEN]' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "573042734424",
    "type": "text",
    "text": {
      "body": "Hola, este es un mensaje de prueba desde la API de WhatsApp"
    }
  }'
```

**Reemplaza**:
- `[TU_ACCESS_TOKEN]` → Tu token generado en el Paso 1
- `"to": "573042734424"` → El número **destinatario** (TO) que recibirá el mensaje
- El mensaje será enviado **desde** (FROM) el Test Number de Meta (`+1 555 156 1260`)

**Nota sobre números**:
- No necesitas especificar el "FROM" en la API, Meta usa automáticamente el Test Number configurado
- Puedes enviar a cualquier número válido de WhatsApp (TO)
- Formato del número destinatario: sin + ni espacios (ej: `573042734424`)

---

### Opción C: Probar desde la terminal

Guarda el token en una variable y ejecuta:

```bash
# Guardar el token
export WHATSAPP_TOKEN="tu_token_aqui"

# Enviar mensaje de prueba
curl -i -X POST \
  https://graph.facebook.com/v22.0/985474321308699/messages \
  -H "Authorization: Bearer $WHATSAPP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "573042734424",
    "type": "text",
    "text": {
      "body": "Hola desde API Testing 🚀"
    }
  }'
```

---

## 🎯 PASO 4: VERIFICAR QUE EL MENSAJE SE ENVIÓ

### Respuesta exitosa:

```json
{
  "messaging_product": "whatsapp",
  "contacts": [{
    "input": "573042734424",
    "wa_id": "573042734424"
  }],
  "messages": [{
    "id": "wamid.HBgNNTczMDQyNzM0NDI0FQIAERgSMkQ5RTg3QjkyNzBCQjE0QUQA"
  }]
}
```

✅ Si recibes esto, el mensaje se envió correctamente.

---

## 🎯 PASO 5: VERIFICAR EL WEBHOOK

Una vez que envíes el mensaje, el webhook debería recibir eventos. Vamos a verificarlo:

### Ver logs del webhook:

```bash
railway logs --tail 50
```

Deberías ver algo como:

```
📩 Webhook recibido de WhatsApp Business API
✅ Mensaje procesado correctamente
```

---

## 🧪 PRUEBAS ADICIONALES

### 🔄 PROBANDO LA COMUNICACIÓN BIDIRECCIONAL

**Opción 1: Enviar mensaje desde la API al número de Meta**

Envía un mensaje al número de prueba de Meta: **+1 555 156 1260**

```bash
curl -i -X POST \
  https://graph.facebook.com/v22.0/985474321308699/messages \
  -H "Authorization: Bearer $WHATSAPP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "15551561260",
    "type": "text",
    "text": {
      "body": "Hola, prueba desde API Testing"
    }
  }'
```

**Flujo**:
```
Test Number (+1 555 156 1260) ────→ Test Number (+1 555 156 1260)
     ↑ FROM                              ↑ TO (mismo número)
```

---

**Opción 2: Enviar mensaje desde la API a tu número**

```bash
curl -i -X POST \
  https://graph.facebook.com/v22.0/985474321308699/messages \
  -H "Authorization: Bearer $WHATSAPP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "573042734424",
    "type": "text",
    "text": {
      "body": "Hola desde el Test Number de Meta 👋"
    }
  }'
```

**Flujo**:
```
Test Number (+1 555 156 1260) ────→ Tu número (573042734424)
     ↑ FROM                              ↑ TO
```

---

**Opción 3: Recibir un mensaje (enviando desde tu WhatsApp)**

1. Abre WhatsApp en tu teléfono
2. Envía un mensaje **AL** número de prueba: **+1 555 156 1260**
3. Verifica los logs del webhook

```bash
railway logs --tail 20
```

**Flujo**:
```
Tu número (573042734424) ────→ Test Number (+1 555 156 1260)
     ↑ FROM                         ↑ TO
```

Deberías ver:
```
📩 Webhook recibido de WhatsApp Business API
📱 Mensaje de: 573042734424
💬 Texto: [tu mensaje]
```

---

### 1. Enviar mensaje con el número de prueba de Meta

Meta te proporciona un número de prueba: **+1 555 156 1260**

```bash
curl -i -X POST \
  https://graph.facebook.com/v22.0/985474321308699/messages \
  -H "Authorization: Bearer $WHATSAPP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "15551561260",
    "type": "text",
    "text": {
      "body": "Hola, prueba desde API Testing"
    }
  }'
```

### 2. Enviar un mensaje con botones

```bash
curl -i -X POST \
  https://graph.facebook.com/v22.0/985474321308699/messages \
  -H "Authorization: Bearer $WHATSAPP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "573042734424",
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": {
        "text": "¿Quieres hacer un pedido?"
      },
      "action": {
        "buttons": [
          {
            "type": "reply",
            "reply": {
              "id": "btn_si",
              "title": "Sí, quiero"
            }
          },
          {
            "type": "reply",
            "reply": {
              "id": "btn_no",
              "title": "Ahora no"
            }
          }
        ]
      }
    }
  }'
```

### 3. Recibir un mensaje (enviando desde tu WhatsApp)

1. Abre WhatsApp en tu teléfono
2. Envía un mensaje al número de prueba: **+1 555 156 1260**
3. Verifica los logs del webhook:

```bash
railway logs --tail 20
```

Deberías ver:
```
📩 Webhook recibido de WhatsApp Business API
📱 Mensaje de: 573042734424
💬 Texto: [tu mensaje]
```

---

## 📊 VERIFICAR ESTADÍSTICAS

Puedes ver las estadísticas de mensajes enviados:

```bash
curl -s https://api.kdsapp.site/api/stats | python3 -m json.tool
```

---

## ⚠️ IMPORTANTE: LIMITACIONES DE LA CUENTA DE PRUEBA

La cuenta de prueba de Meta tiene estas limitaciones:

- ✅ **Duración**: 90 días
- ✅ **Mensajes**: Gratis durante el período de prueba
- ✅ **Números**: Puedes enviar a cualquier número (hasta 5 para probar)
- ❌ **Templates**: Solo puedes usar templates pre-aprobados
- ❌ **Producción**: NO uses esto para clientes reales

**Para producción**, necesitarás:
1. Verificar tu Business Portfolio
2. Obtener aprobación de Meta
3. Usar tu propio número de WhatsApp Business

---

## 🎯 COMANDOS ÚTILES PARA PRUEBAS

### Script de prueba completo:

Crea un archivo `test-whatsapp-api.sh`:

```bash
#!/bin/bash

# Configuración
PHONE_NUMBER_ID="985474321308699"
ACCESS_TOKEN="tu_token_aqui"
TO_NUMBER="573042734424"

# Enviar mensaje
echo "📱 Enviando mensaje de prueba..."
curl -i -X POST \
  "https://graph.facebook.com/v22.0/$PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"messaging_product\": \"whatsapp\",
    \"to\": \"$TO_NUMBER\",
    \"type\": \"text\",
    \"text\": {
      \"body\": \"Hola desde API Testing - $(date)\"
    }
  }"

echo ""
echo "✅ Mensaje enviado. Verifica tu WhatsApp."
```

Dale permisos y ejecútalo:

```bash
chmod +x test-whatsapp-api.sh
./test-whatsapp-api.sh
```

---

## ✅ CHECKLIST DE API TESTING

- [ ] Access Token temporal generado (válido 60 min)
- [ ] Webhook listening activado (toggle ON)
- [ ] Mensaje enviado exitosamente con cURL
- [ ] Respuesta JSON recibida con message ID
- [ ] Mensaje recibido en WhatsApp
- [ ] Webhook recibió el evento (verificar logs)
- [ ] Enviado mensaje al número de prueba de Meta (+1 555 156 1260)
- [ ] Enviado mensaje desde WhatsApp al número de prueba
- [ ] Webhook procesó el mensaje entrante

---

## 🔍 TROUBLESHOOTING

### ❌ Error: "Invalid OAuth access token"

**Causa**: El token expiró (dura 60 minutos) o es incorrecto

**Solución**: Genera un nuevo token en Meta Dashboard

### ❌ Error: "(#100) Invalid parameter"

**Causa**: El formato del número de teléfono es incorrecto

**Solución**: Usa formato internacional sin + ni espacios: `573042734424`

### ❌ Error: "Message failed to send"

**Causa**: El número no está verificado o bloqueado

**Solución**: Usa el número de prueba de Meta: `15551561260`

### ❌ No recibo el mensaje en WhatsApp

**Posibles causas**:
1. El número no tiene WhatsApp instalado
2. El número bloqueó mensajes empresariales
3. El mensaje aún está en cola (espera 1-2 minutos)

---

## 🎉 DESPUÉS DE PROBAR API TESTING

Una vez que confirmes que la API funciona:

1. ✅ Probar el flujo de onboarding completo
2. ✅ Conectar un número real con Embedded Signup
3. ✅ Enviar mensajes desde el sistema KDS
4. ✅ Probar el bot de pedidos

---

**URLs importantes**:
- **API Testing**: https://developers.facebook.com/apps/849706941272247/whatsapp-business/wa-dev-console/
- **Webhook Logs**: `railway logs --tail 50`
- **Postman**: Puedes usar Postman para las pruebas (click "Run in Postman")

---

**Última actualización**: 27 de diciembre de 2024  
**Status**: ⏳ Listo para probar
