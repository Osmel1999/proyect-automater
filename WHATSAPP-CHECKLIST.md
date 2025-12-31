# ✅ CHECKLIST - Configuración WhatsApp Business API

## 📋 PROGRESO GENERAL

```
[ ] Paso 1: Crear cuenta en Meta for Developers
[ ] Paso 2: Crear App
[ ] Paso 3: Agregar WhatsApp a la App
[ ] Paso 4: Configurar número de teléfono
[ ] Paso 5: Obtener credenciales (Token)
[ ] Paso 6: Probar envío de mensaje
[ ] Paso 7: Configurar Webhook
[ ] Paso 8: Probar recepción de mensajes
[ ] Paso 9: Generar token permanente
[ ] Paso 10: Guardar credenciales de forma segura
```

---

## 🔗 ENLACES IMPORTANTES

| Recurso | URL |
|---------|-----|
| **Meta for Developers** | https://developers.facebook.com/ |
| **WhatsApp Manager** | https://business.facebook.com/wa/manage/home/ |
| **Business Settings** | https://business.facebook.com/settings/ |
| **Webhook Tester** | https://webhook.site |
| **Documentación** | https://developers.facebook.com/docs/whatsapp/cloud-api |

---

## 📝 PASO 1: Crear Cuenta en Meta for Developers

### Acciones:
- [ ] Ir a https://developers.facebook.com/
- [ ] Iniciar sesión con Facebook
- [ ] Aceptar términos (si es primera vez)

### Resultado esperado:
✅ Acceso al dashboard de Meta for Developers

---

## 📝 PASO 2: Crear App

### Acciones:
- [ ] Clic en **"My Apps"** (esquina superior derecha)
- [ ] Clic en **"Create App"**
- [ ] Seleccionar: **"Other"** o **"Business"**
- [ ] Completar información:
  - **App name**: `KDS Cocina` (o tu nombre)
  - **App contact email**: tu_email@ejemplo.com
- [ ] Clic en **"Create App"**

### Datos a guardar:
```
App ID: ___________________________
App Secret: ________________________
```

### Resultado esperado:
✅ App creada y dashboard visible

---

## 📝 PASO 3: Agregar WhatsApp a la App

### Acciones:
- [ ] En el dashboard de tu app, buscar **"Add Products"**
- [ ] Encontrar **"WhatsApp"**
- [ ] Clic en **"Set Up"**

### Resultado esperado:
✅ WhatsApp agregado a tu app, página de Quickstart visible

---

## 📝 PASO 4: Configurar Número de Teléfono

### Opción A: Número de Prueba (RECOMENDADO para empezar)

- [ ] En la página de WhatsApp, buscar **"Phone numbers"** o **"API Setup"**
- [ ] Usar el número de prueba que Meta proporciona
- [ ] Agregar números de teléfono para probar (máximo 5)
  - [ ] Tu número personal
  - [ ] Número del equipo (opcional)

### Opción B: Número Real

- [ ] Clic en **"Add phone number"**
- [ ] Seleccionar país
- [ ] Ingresar número (que NO esté registrado en WhatsApp)
- [ ] Seleccionar método de verificación: SMS o Llamada
- [ ] Ingresar código de verificación
- [ ] Completar información del negocio

### Datos a guardar:
```
Phone Number ID: ___________________________
Número registrado: +________________________
```

### Resultado esperado:
✅ Número verificado y activo

---

## 📝 PASO 5: Obtener Credenciales (Token Temporal)

### Acciones:
- [ ] En la página de **"API Setup"** o **"Getting Started"**
- [ ] Buscar sección **"Temporary access token"**
- [ ] Clic en **"Generate"** o **"Copy"**
- [ ] Copiar el token

### Datos a guardar:
```
Access Token (temporal): ___________________________
Phone Number ID: ___________________________
WABA ID: ___________________________
```

⚠️ **IMPORTANTE:** Este token expira en 24 horas

### Resultado esperado:
✅ Token copiado y guardado

---

## 📝 PASO 6: Probar Envío de Mensaje

### Opción A: Desde la interfaz de Meta

- [ ] En **"API Setup"**, buscar **"Send and receive messages"**
- [ ] Ingresar número de destino (formato: +57300XXXXXXX)
- [ ] Clic en **"Send message"**
- [ ] Verificar recepción en WhatsApp

### Opción B: Usando el script de prueba

1. [ ] Abrir el archivo `test-whatsapp.sh`
2. [ ] Completar los datos:
   ```bash
   PHONE_NUMBER_ID="tu_phone_number_id"
   ACCESS_TOKEN="tu_access_token"
   DESTINATION_NUMBER="573001234567"
   ```
3. [ ] Ejecutar:
   ```bash
   ./test-whatsapp.sh
   ```
4. [ ] Verificar recepción en WhatsApp

### Resultado esperado:
✅ Mensaje recibido en WhatsApp

---

## 📝 PASO 7: Configurar Webhook (Para Recibir Mensajes)

### 7.1. Preparar URL de Webhook Temporal

- [ ] Ir a https://webhook.site
- [ ] Copiar la URL única que te asigna
- [ ] Guardar esta URL

```
Webhook URL: ___________________________
```

### 7.2. Configurar en Meta

- [ ] En el dashboard de WhatsApp, ir a **"Configuration"**
- [ ] Buscar sección **"Webhooks"**
- [ ] Clic en **"Edit"** o **"Configure"**
- [ ] Completar:
  - **Callback URL**: Tu URL de webhook.site
  - **Verify Token**: Inventar uno (ej: `mi_token_123`)
- [ ] Clic en **"Verify and Save"**

### 7.3. Suscribirse a Eventos

- [ ] Activar eventos:
  - [x] **messages**
  - [x] **message_status**
- [ ] Clic en **"Subscribe"**

### Datos a guardar:
```
Webhook URL: ___________________________
Verify Token: ___________________________
```

### Resultado esperado:
✅ Webhook verificado y suscrito

---

## 📝 PASO 8: Probar Recepción de Mensajes

### Acciones:
- [ ] Abrir webhook.site en tu navegador
- [ ] Enviar un mensaje de WhatsApp al número de tu negocio
- [ ] Ver el mensaje aparecer en webhook.site

### Ejemplo de mensaje para enviar:
```
Hola, quiero hacer un pedido
```

### Resultado esperado:
✅ Mensaje aparece en webhook.site con toda la información (sender, text, timestamp, etc.)

---

## 📝 PASO 9: Generar Token Permanente (Producción)

### 9.1. Crear System User

- [ ] Ir a **Business Settings**: https://business.facebook.com/settings/
- [ ] Menú lateral: **"Users"** → **"System Users"**
- [ ] Clic en **"Add"**
- [ ] Completar:
  - **Name**: `KDS System User`
  - **Role**: **Admin**
- [ ] Clic en **"Create System User"**

### 9.2. Generar Token

- [ ] Clic en el System User creado
- [ ] Clic en **"Generate New Token"**
- [ ] Seleccionar tu app: `KDS Cocina`
- [ ] Seleccionar permisos:
  - [x] **whatsapp_business_messaging**
  - [x] **whatsapp_business_management**
- [ ] Clic en **"Generate Token"**
- [ ] **COPIAR Y GUARDAR** inmediatamente (no se vuelve a mostrar)

### Datos a guardar:
```
Permanent Access Token: ___________________________
```

⚠️ **CRÍTICO:** Este token NO expira, guárdalo de forma muy segura

### Resultado esperado:
✅ Token permanente generado y guardado

---

## 📝 PASO 10: Guardar Credenciales de Forma Segura

### Acciones:
- [ ] Copiar el archivo `.env.whatsapp.template` a `.env.whatsapp`
  ```bash
  cp .env.whatsapp.template .env.whatsapp
  ```
- [ ] Completar `.env.whatsapp` con tus datos reales
- [ ] Verificar que `.env.whatsapp` esté en `.gitignore`

### Resultado esperado:
✅ Credenciales guardadas de forma segura

---

## ✅ VERIFICACIÓN FINAL

### Antes de continuar a n8n, verifica:

- [ ] ✅ Puedes enviar mensajes desde la API
- [ ] ✅ Puedes recibir mensajes en el webhook
- [ ] ✅ Tienes el token permanente
- [ ] ✅ Todas las credenciales están guardadas
- [ ] ✅ El webhook está configurado y funcionando

---

## 🎊 ¡FELICIDADES!

Si completaste todos los pasos, tienes:
- ✅ WhatsApp Business API configurada
- ✅ Capacidad de enviar mensajes
- ✅ Capacidad de recibir mensajes
- ✅ Token permanente para producción
- ✅ Webhook funcionando

**Siguiente paso:** Configurar n8n para procesar los mensajes automáticamente

---

## 🆘 PROBLEMAS COMUNES

### "No encuentro la opción WhatsApp Accounts"
- Busca **"API Setup"** o **"Getting Started"** en el menú de WhatsApp
- O ve directamente a: https://business.facebook.com/wa/manage/home/

### "Mi webhook no se verifica"
- Verifica que la URL sea accesible públicamente
- Verifica que el Verify Token sea exactamente el mismo
- Prueba primero con webhook.site

### "No recibo mensajes en el webhook"
- Verifica que estés suscrito a los eventos correctos
- Revisa que el webhook esté activo
- Envía un mensaje y espera 10-30 segundos

### "El token expiró"
- El token temporal dura 24 horas
- Genera el token permanente (Paso 9)

---

**Última actualización:** 31 de diciembre de 2024
