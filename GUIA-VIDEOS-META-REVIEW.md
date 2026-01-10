# 📹 Guía para Grabar Videos de Revisión de Meta

## 🎯 Videos Requeridos

Meta requiere 2 videos separados para aprobar tu aplicación:

### 1️⃣ Video de Envío de Mensajes (whatsapp_business_messaging)
### 2️⃣ Video de Creación de Template (whatsapp_business_management)

---

## 📱 VIDEO 1: Envío de Mensajes (whatsapp_business_messaging)

### 🎬 Qué mostrar:
- Tu aplicación enviando un mensaje
- WhatsApp recibiendo el mismo mensaje

### 📝 Pasos para grabar:

#### Preparación:
1. **Abre dos ventanas:**
   - Ventana 1: https://kdsapp.site/test-messaging.html?tenant=TU_TENANT_ID
   - Ventana 2: WhatsApp Web (https://web.whatsapp.com) o tu teléfono con WhatsApp

2. **Asegúrate de tener:**
   - Tu tenant ID real (después de vincular WhatsApp)
   - Un número de WhatsApp de prueba (puede ser tu propio número)
   - La app de Meta en modo Development

#### Grabación:
1. ✅ **Inicia grabación de pantalla** (Windows: Win+G, Mac: Cmd+Shift+5)

2. ✅ **Muestra la página de test-messaging.html:**
   - Se debe ver tu tenant ID
   - Se debe ver tu número de WhatsApp Business

3. ✅ **Completa el formulario:**
   - Ingresa el número de WhatsApp de prueba (con +código de país)
   - Escribe un mensaje: "Hola, este es un mensaje de prueba desde mi app KDS"

4. ✅ **Click en "Enviar Mensaje de Prueba"**
   - Muestra cómo aparece "Mensaje enviado exitosamente"

5. ✅ **Cambia rápidamente a WhatsApp:**
   - Muestra cómo llega el mensaje
   - El mensaje debe ser exactamente el que escribiste
   - Se debe ver que viene de tu número de WhatsApp Business

6. ✅ **Detén la grabación**

#### ⚠️ Importante:
- El video debe mostrar **AMBAS pantallas**: tu app enviando Y WhatsApp recibiendo
- La duración debe ser corta (30-90 segundos)
- Audio opcional (no es necesario hablar)
- El mensaje debe llegar mientras grabas

---

## 📋 VIDEO 2: Creación de Template (whatsapp_business_management)

### 🎬 Qué mostrar:
- Proceso de creación de un template de mensaje en Meta Business Manager

### 📝 Pasos para grabar:

#### Preparación:
1. Ve a: https://business.facebook.com/wa/manage/message-templates/
2. Inicia sesión con tu cuenta de Meta Business
3. Selecciona tu cuenta de WhatsApp Business

#### Grabación:
1. ✅ **Inicia grabación de pantalla**

2. ✅ **Muestra la página de Templates:**
   - Se debe ver "Message Templates" en el título

3. ✅ **Click en "Create Template"**

4. ✅ **Llena el formulario del template:**
   - **Category**: Selecciona "Marketing" o "Utility"
   - **Name**: `pedido_confirmacion` (sin espacios, snake_case)
   - **Languages**: Selecciona "Spanish"
   
5. ✅ **Crea el contenido del template:**
   - **Header** (opcional): "Confirmación de Pedido"
   - **Body**: 
     ```
     Hola {{1}}, gracias por tu pedido en {{2}}.
     
     Tu pedido ha sido recibido y está siendo preparado.
     
     Total: ${{3}}
     Tiempo estimado: {{4}} minutos
     ```
   - **Footer** (opcional): "Gracias por preferirnos"
   - **Buttons** (opcional): 
     - Button 1: "Ver Estado del Pedido" → URL

6. ✅ **Muestra el preview:**
   - Debe verse el template con las variables {{1}}, {{2}}, etc.

7. ✅ **Click en "Submit"**
   - Muestra la pantalla de confirmación
   - Se debe ver "Template submitted for review"

8. ✅ **Detén la grabación**

#### ⚠️ Importante:
- El video debe mostrar TODO el proceso desde cero
- Debe verse claramente cada campo que completas
- La duración puede ser 1-3 minutos
- El template NO necesita estar aprobado para el video

---

## 🚀 Acceso Rápido - Enlaces

### Para grabar VIDEO 1:
```
https://kdsapp.site/test-messaging.html?tenant=TU_TENANT_ID
```
(Reemplaza TU_TENANT_ID con tu ID real después de vincular WhatsApp)

### Para grabar VIDEO 2:
```
https://business.facebook.com/wa/manage/message-templates/
```

---

## 📤 Subir Videos a Meta

1. Ve a: https://developers.facebook.com/apps/1860852208127086/app-review/permissions/
2. Encuentra los permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
3. Click en "Edit" para cada permiso
4. Sube el video correspondiente
5. Agrega una descripción breve:

**Para whatsapp_business_messaging:**
```
This video demonstrates our app sending a message via WhatsApp Business API.
The message is sent from our KDS platform and received on WhatsApp Web/Mobile.
Our app helps restaurants manage orders through WhatsApp.
```

**Para whatsapp_business_management:**
```
This video shows the creation of a message template for order confirmations.
Our app uses templates to send structured messages to customers about their orders.
Templates are created via Meta Business Manager.
```

---

## ✅ Checklist Final

Antes de enviar la revisión:

- [ ] Video 1 grabado: muestra envío y recepción de mensaje
- [ ] Video 2 grabado: muestra creación de template completo
- [ ] Videos en formato MP4 o MOV (máximo 50MB cada uno)
- [ ] Videos subidos a Meta App Review
- [ ] Descripciones agregadas
- [ ] Privacy Policy publicada en tu sitio
- [ ] Terms of Service publicados en tu sitio
- [ ] Webhook configurado y verificado
- [ ] App en modo Development (no Production todavía)

---

## 🆘 Solución de Problemas

### Si el mensaje no se envía:
1. Verifica que tu tenant tiene WhatsApp vinculado
2. Chequea que el access token no haya expirado
3. Verifica que el número de destino está en formato correcto (+código país)
4. Revisa los logs del backend en Railway: `railway logs`

### Si no puedes crear templates:
1. Asegúrate de estar en la cuenta de WhatsApp Business correcta
2. Verifica que tienes permisos de administrador en Meta Business Manager
3. Prueba con un template más simple (solo body, sin header/footer)

### Si el video es muy grande:
- Reduce la resolución de grabación (720p es suficiente)
- Usa un compresor de video: https://www.freeconvert.com/video-compressor
- Corta las partes innecesarias

---

## 📞 Números de Prueba

Para el VIDEO 1, puedes usar:
- ✅ Tu propio número de WhatsApp
- ✅ El número de WhatsApp Business que vinculaste
- ✅ Cualquier número que tengas acceso

⚠️ Nota: En modo Development, solo puedes enviar mensajes a números que agregues como "Test Numbers" en la configuración de tu app de Meta.

Para agregar números de prueba:
1. Ve a: https://developers.facebook.com/apps/1860852208127086/whatsapp-business/wa-settings/
2. En "Phone Numbers" → "Add Phone Number"
3. Ingresa el número y completa la verificación por SMS

---

## 🎬 ¡Buena suerte con la grabación!

Recuerda: Los videos no necesitan ser perfectos, solo deben mostrar claramente que tu app tiene las funcionalidades requeridas.

Meta típicamente responde en 1-5 días hábiles.
