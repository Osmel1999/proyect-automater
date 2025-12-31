# ✅ CHECKLIST: Configurar WhatsApp Business API

## 📋 PROGRESO

Marca con `[x]` cada paso que completes.

---

## FASE 1: CREAR CUENTA DE FACEBOOK BUSINESS

- [ ] **1.1** Acceder a https://business.facebook.com/
- [ ] **1.2** Crear cuenta de negocio
  - Nombre del negocio: _________________
  - Email: _________________
- [ ] **1.3** Verificar email

**Tiempo estimado:** 10 minutos

---

## FASE 2: CONFIGURAR WHATSAPP BUSINESS API

- [ ] **2.1** Acceder a https://business.facebook.com/wa/manage/home/
- [ ] **2.2** Crear cuenta de WhatsApp Business
- [ ] **2.3** Agregar número de teléfono
  - Número de negocio: _________________
  - ⚠️ Verificar que NO esté en WhatsApp personal
- [ ] **2.4** Verificar número (SMS o llamada)
  - Código recibido: _________________
- [ ] **2.5** Configurar perfil del negocio
  - Nombre: _________________
  - Categoría: Restaurante / Comida rápida
  - Descripción: _________________
  - Logo subido: ☐ Sí

**Tiempo estimado:** 15 minutos

---

## FASE 3: OBTENER CREDENCIALES

- [ ] **3.1** Ir a API Setup
- [ ] **3.2** Copiar Access Token (temporal)
  - Token copiado: ☐ Sí
  - Guardado en lugar seguro: ☐ Sí
- [ ] **3.3** Copiar Phone Number ID
  - ID: _________________
- [ ] **3.4** Copiar WhatsApp Business Account ID  
  - WABA ID: _________________

**Tiempo estimado:** 5 minutos

---

## FASE 4: GUARDAR CREDENCIALES

- [ ] **4.1** Crear archivo `.env.whatsapp`
```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
touch .env.whatsapp
```

- [ ] **4.2** Completar el archivo con:
```env
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER=
WEBHOOK_VERIFY_TOKEN=mi_token_secreto_123
```

**Tiempo estimado:** 5 minutos

---

## FASE 5: CONFIGURAR WEBHOOK

- [ ] **5.1** Ir a https://webhook.site/
- [ ] **5.2** Copiar tu Unique URL
  - URL: _________________
- [ ] **5.3** En WhatsApp Manager → Configuration → Webhooks
- [ ] **5.4** Configurar:
  - Callback URL: (pegar URL de webhook.site)
  - Verify Token: `mi_token_secreto_123`
- [ ] **5.5** Verify and Save
- [ ] **5.6** Activar suscripciones:
  - ☐ messages
  - ☐ message_status

**Tiempo estimado:** 10 minutos

---

## FASE 6: PROBAR ENVÍO

- [ ] **6.1** Preparar comando curl (ver abajo)
- [ ] **6.2** Reemplazar valores:
  - TU_PHONE_NUMBER_ID
  - TU_ACCESS_TOKEN
  - TU_NUMERO_PERSONAL
- [ ] **6.3** Ejecutar comando
- [ ] **6.4** ✅ Mensaje recibido en WhatsApp personal

**Comando:**
```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/[TU_PHONE_NUMBER_ID]/messages" \
  -H "Authorization: Bearer [TU_ACCESS_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "[TU_NUMERO_PERSONAL]",
    "type": "text",
    "text": {
      "body": "🎉 ¡Prueba exitosa! Tu API de WhatsApp funciona."
    }
  }'
```

**Tiempo estimado:** 5 minutos

---

## FASE 7: PROBAR RECEPCIÓN

- [ ] **7.1** Enviar mensaje desde WhatsApp personal al número de negocio
  - Mensaje enviado: "Hola, quiero hacer un pedido"
- [ ] **7.2** Ir a https://webhook.site/ (tu URL)
- [ ] **7.3** ✅ Webhook recibido con el mensaje

**Tiempo estimado:** 5 minutos

---

## FASE 8: TOKEN PERMANENTE

- [ ] **8.1** Ir a https://business.facebook.com/settings/system-users
- [ ] **8.2** Add System User
  - Nombre: "WhatsApp API User"
  - Role: Admin
- [ ] **8.3** Asignar permisos a WhatsApp Business Account
- [ ] **8.4** Generate New Token
  - Permisos:
    - ☐ whatsapp_business_management
    - ☐ whatsapp_business_messaging
- [ ] **8.5** Copiar token permanente
- [ ] **8.6** Actualizar `.env.whatsapp` con el nuevo token

**Tiempo estimado:** 10 minutos

---

## ✅ VERIFICACIÓN FINAL

- [ ] ✅ Facebook Business Account creado
- [ ] ✅ WhatsApp Business API configurado
- [ ] ✅ Número verificado
- [ ] ✅ Credenciales guardadas en `.env.whatsapp`
- [ ] ✅ Webhook configurado (webhook.site)
- [ ] ✅ Prueba de envío exitosa
- [ ] ✅ Prueba de recepción exitosa
- [ ] ✅ Token permanente generado

---

## 📊 RESUMEN DE CREDENCIALES

Al terminar, deberías tener:

```env
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=108xxxxxxxxx
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxx (PERMANENTE)
WHATSAPP_PHONE_NUMBER=+573001234567
WEBHOOK_VERIFY_TOKEN=mi_token_secreto_123
```

---

## ⏱️ TIEMPO TOTAL ESTIMADO: 60 minutos

---

## 🎯 PRÓXIMO PASO

Una vez completado, estarás listo para:
👉 **Configurar n8n y crear el workflow de automatización**

---

## 🆘 ¿PROBLEMAS?

Consulta la guía completa en: `GUIA-WHATSAPP-API.md`

---

## 📝 NOTAS

Espacio para tus anotaciones:

```
_____________________________________

_____________________________________

_____________________________________

_____________________________________
```

---

**Fecha de inicio:** ___/___/___
**Fecha de finalización:** ___/___/___
**Estado:** ⬜ En proceso | ⬜ Completado
