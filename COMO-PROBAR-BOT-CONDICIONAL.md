# 🧪 Cómo Probar el Bot Condicional

## Estado Actual
El bot **YA** verifica que el onboarding esté al menos al 75% completo antes de responder.

---

## Escenario 1: Onboarding Incompleto (< 75%)

### Qué Pasa:
- Cliente envía mensaje a tu número WhatsApp
- Bot **NO procesa** el mensaje
- Bot **envía mensaje** indicando que el sistema está en configuración

### Cómo Probar:
1. Conecta WhatsApp con el QR
2. **NO completes** el menú ni los otros pasos
3. Envía un mensaje a tu número desde otro teléfono
4. Deberías recibir el mensaje de "sistema en configuración"

### Logs Esperados:
```
�� Bot procesando mensaje de 521234567890@s.whatsapp.net en tenant miTenant
📊 Onboarding: 1/4 pasos (25%)
⚠️  Onboarding incompleto (25%), enviando mensaje de configuración
✅ Mensaje de configuración enviado a 521234567890@s.whatsapp.net
```

---

## Escenario 2: Onboarding Completo (≥ 75%)

### Qué Pasa:
- Cliente envía mensaje
- Bot **procesa** el mensaje
- Bot **responde** con el menú o maneja el pedido

### Cómo Probar:
1. Conecta WhatsApp
2. **Completa el menú** (paso 2)
3. **Personaliza mensajes** (paso 3)
4. **Prueba el bot** (paso 4)
5. Envía mensaje desde otro teléfono
6. Deberías recibir el menú

### Logs Esperados:
```
🤖 Bot procesando mensaje de 521234567890@s.whatsapp.net en tenant miTenant
📊 Onboarding: 4/4 pasos (100%)
✅ Onboarding completo, procesando mensaje
✅ Respuesta enviada a 521234567890@s.whatsapp.net
```

---

## 🔍 Ver Logs en Tiempo Real

### Local:
```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp/server
node index.js
```

### Railway (producción):
```bash
railway logs -f
```

---

## 📊 Verificar Estado en Firebase

1. Ve a Firebase Console → Realtime Database
2. Navega a: `tenants/{tuTenantId}/onboarding/steps`
3. Deberías ver:
```json
{
  "whatsapp_connected": true,
  "menu_configured": false,  // ← Debe ser true
  "messages_customized": false,
  "bot_tested": false
}
```

4. Para que el bot funcione, necesitas **al menos 3 de 4 en true** (75%)

---

## 🎯 Resultado Esperado

### Si onboarding < 75%:
- ❌ Bot NO responde con menú
- ✅ Bot envía mensaje de "sistema en configuración"

### Si onboarding ≥ 75%:
- ✅ Bot responde normalmente
- ✅ Muestra menú si el cliente lo solicita
- ✅ Procesa pedidos

---

## 🐛 Troubleshooting

### "El bot no responde nada"
- Verifica que la sesión de Baileys esté conectada
- Revisa los logs: `railway logs`
- Confirma que el mensaje llegó al servidor

### "El bot siempre dice 'en configuración'"
- Verifica el estado en Firebase: `tenants/{id}/onboarding/steps`
- Asegúrate de haber completado al menos 3 de 4 pasos
- Marca `menu_configured: true` manualmente si es necesario

### "El bot responde pero no muestra el menú"
- Verifica que exista: `tenants/{id}/settings/menu/categories`
- Asegúrate de haber guardado el menú en el paso 2 del onboarding

---

## 📝 Notas

- El porcentaje se calcula automáticamente: `(pasos_completados / total_pasos) * 100`
- El umbral mínimo es **75%** (3 de 4 pasos)
- El paso `whatsapp_connected` se marca automáticamente al escanear QR
- Los otros pasos se marcan al completar cada sección del onboarding
