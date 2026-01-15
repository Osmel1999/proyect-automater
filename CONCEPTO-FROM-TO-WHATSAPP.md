# 📱 ENTENDIENDO FROM y TO EN WHATSAPP API

**Fecha**: 27 de diciembre de 2024  
**Propósito**: Aclarar la diferencia entre número de origen (FROM) y destino (TO)

---

## 🎯 CONCEPTOS BÁSICOS

### FROM (Origen)
- Es el número que **ENVÍA** el mensaje
- En API Testing, es el **Test Number** configurado en Meta: `+1 555 156 1260`
- **NO** necesitas especificarlo en la llamada a la API
- Meta lo usa automáticamente

### TO (Destino)
- Es el número que **RECIBE** el mensaje
- Puede ser cualquier número válido de WhatsApp
- En tu caso: `573042734424`
- **SÍ** necesitas especificarlo en la llamada a la API

---

## 📊 FLUJOS DE MENSAJERÍA

### Flujo 1: Enviar desde API al usuario

```
┌─────────────────────┐         API          ┌─────────────────────┐
│  Test Number        │  ─────────────────→  │  Tu número          │
│  +1 555 156 1260    │                      │  573042734424       │
│  (FROM - automático)│                      │  (TO - especificas) │
└─────────────────────┘                      └─────────────────────┘
```

**Llamada API**:
```bash
curl -X POST \
  https://graph.facebook.com/v22.0/985474321308699/messages \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "to": "573042734424",  ← Solo especificas el destinatario
    "type": "text",
    "text": {"body": "Hola"}
  }'
```

**Resultado**: El usuario recibe un mensaje **desde** `+1 555 156 1260`

---

### Flujo 2: Usuario envía mensaje al Test Number

```
┌─────────────────────┐    WhatsApp App     ┌─────────────────────┐
│  Tu número          │  ─────────────────→ │  Test Number        │
│  573042734424       │                     │  +1 555 156 1260    │
│  (FROM - tú)        │                     │  (TO - número Meta) │
└─────────────────────┘                     └─────────────────────┘
                                                      │
                                                      │ Webhook
                                                      ▼
                                            ┌─────────────────────┐
                                            │  Tu servidor        │
                                            │  api.kdsapp.site    │
                                            └─────────────────────┘
```

**Proceso**:
1. Abres WhatsApp en tu teléfono
2. Escribes al número: `+1 555 156 1260`
3. Envías: "Hola, quiero hacer un pedido"
4. Meta recibe el mensaje
5. Meta envía un webhook a tu servidor
6. Tu servidor procesa el mensaje

---

## 🧪 EJEMPLOS PRÁCTICOS

### Ejemplo 1: Enviar mensaje de bienvenida

```bash
# Meta enviará desde: +1 555 156 1260
# Recibirá en: 573042734424

curl -X POST \
  https://graph.facebook.com/v22.0/985474321308699/messages \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "573042734424",
    "type": "text",
    "text": {
      "body": "¡Bienvenido a nuestro servicio! 🎉"
    }
  }'
```

**El usuario verá**:
```
+1 555 156 1260
¡Bienvenido a nuestro servicio! 🎉
```

---

### Ejemplo 2: Enviar al número de prueba (mismo número)

```bash
# Meta enviará desde: +1 555 156 1260
# Recibirá en: +1 555 156 1260 (mismo)

curl -X POST \
  https://graph.facebook.com/v22.0/985474321308699/messages \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "15551561260",
    "type": "text",
    "text": {
      "body": "Mensaje de prueba"
    }
  }'
```

---

### Ejemplo 3: Recibir mensaje del usuario

**Usuario hace**:
1. Abre WhatsApp
2. Busca: `+1 555 156 1260`
3. Envía: "Hola, quiero un pedido"

**Tu webhook recibe**:
```json
{
  "from": "573042734424",  ← Quién envió (el usuario)
  "to": "15551561260",     ← A quién lo envió (tu Test Number)
  "text": "Hola, quiero un pedido"
}
```

---

## 🔍 TABLA COMPARATIVA

| Escenario | FROM | TO | Método |
|-----------|------|-----|--------|
| API → Usuario | Test Number (automático) | 573042734424 | API POST |
| Usuario → Test Number | 573042734424 | Test Number | WhatsApp App |
| API → Test Number | Test Number (automático) | Test Number | API POST |

---

## ⚠️ ERRORES COMUNES

### ❌ Error: "Quiero enviar desde mi número"

**Problema**: Intentas especificar un "from" diferente al Test Number

**Realidad**: En API Testing, el FROM siempre es el Test Number de Meta

**Solución**: 
- Para usar tu propio número, necesitas:
  1. Completar el onboarding con Embedded Signup
  2. Conectar tu número real de WhatsApp Business
  3. Usar ese número en producción

---

### ❌ Error: "No sé qué poner en el TO"

**Problema**: Confusión sobre el destinatario

**Solución**:
- `"to"` es el número que **RECIBIRÁ** el mensaje
- Puede ser cualquier número válido de WhatsApp
- Formato: sin + ni espacios (ej: `573042734424`)
- Puedes enviar a tu propio número para probar

---

### ❌ Error: "El mensaje no aparece como enviado desde mi negocio"

**Problema**: En API Testing, el remitente es el Test Number de Meta

**Realidad**: El nombre de tu negocio aparecerá cuando:
1. Completes el onboarding
2. Conectes tu número real
3. Configures el perfil de tu Business Account

---

## 🎯 RESUMEN RÁPIDO

**En API Testing**:
- ✅ **FROM**: Siempre es el Test Number (`+1 555 156 1260`) - automático
- ✅ **TO**: Lo especificas tú en la API - cualquier número válido
- ✅ Puedes enviar a tu propio número (`573042734424`)
- ✅ Puedes recibir mensajes enviando desde tu WhatsApp al Test Number

**En Producción (después del onboarding)**:
- ✅ **FROM**: Tu número real de WhatsApp Business
- ✅ **TO**: Los números de tus clientes
- ✅ Aparece el nombre de tu negocio
- ✅ Los clientes pueden responderte

---

## 📚 PRÓXIMOS PASOS

1. **Probar API Testing**: Envía mensajes al `573042734424`
2. **Verificar Webhook**: Envía desde tu WhatsApp al `+1 555 156 1260`
3. **Completar Onboarding**: Conecta tu número real
4. **Producción**: Usa tu número para enviar a clientes

---

**URLs importantes**:
- **API Testing**: https://developers.facebook.com/apps/849706941272247/whatsapp-business/wa-dev-console/
- **Guía completa**: `GUIA-API-TESTING-WHATSAPP.md`

---

**Última actualización**: 27 de diciembre de 2024  
**Status**: ✅ Documentación completa
