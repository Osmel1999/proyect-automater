# 🚀 GUÍA RÁPIDA - Prueba el Pago AHORA

**Objetivo**: Obtener tu primera transacción APROBADA con Wompi

---

## ⚡ Pasos Rápidos (5 minutos)

### 1. Espera el Deploy (2 min)
El código corregido ya se desplegó. Railway tarda ~2 minutos en aplicar cambios.

**Verificar que el deploy terminó**:
```bash
railway status
```

---

### 2. Crea un Pedido de Prueba

1. Abre tu app: https://automater-88ec2.web.app
2. Login con tu cuenta
3. Crea un pedido de prueba (cualquier item del menú)

---

### 3. Al Pagar, USA ESTOS DATOS

#### Opción A: Nequi (MÁS FÁCIL) ⭐ RECOMENDADO

**Número de teléfono**:
```
3991111111
```

> ⚠️ **IMPORTANTE**: Usa exactamente `3991111111`, NO tu número real

#### Opción B: Tarjeta de Crédito

**Número de tarjeta**:
```
4242 4242 4242 4242
```

**CVV**:
```
123
```

**Fecha de expiración**:
```
12/28
```
(O cualquier fecha futura)

---

### 4. Completa el Pago

1. Haz clic en el link de pago que recibiste
2. Selecciona **Nequi** o **Tarjeta**
3. Ingresa los datos de arriba
4. Confirma el pago

---

### 5. Verifica los Logs en Tiempo Real

**Abre una terminal y ejecuta**:
```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
railway logs --tail
```

---

## ✅ Qué Debes Ver en los Logs

### Logs Esperados (en orden):

```
📥 WEBHOOK RECIBIDO
   Gateway: wompi
   Restaurante: tenant1769095946220o10i5g9zw

📦 Payload: {
  "event": "transaction.updated",
  ...
}

🔐 [WompiAdapter] Validando firma del webhook...
   transaction.id = 12022885-...
   transaction.status = APPROVED    ← ✅ ESTO ES LO CLAVE
   transaction.amount_in_cents = 4000000

✅ Firma válida - Webhook auténtico
✅ Webhook de wompi validado correctamente

📊 Evento parseado: APPROVED - 12022885-...

💾 Actualizando transacción en Firebase...
✅ Transacción actualizada a APPROVED

📝 Creando orden en KDS...
✅ Orden creada en Firebase: ORDER-...

📱 Enviando notificación por WhatsApp...
✅ Mensaje enviado al cliente
```

---

## 🎯 Resultado Esperado

### En WhatsApp:
Deberías recibir un mensaje del bot diciendo:
```
¡Tu pago ha sido aprobado! ✅

Resumen del pedido:
🍔 [Items del pedido]

Total pagado: $40,000

Tu pedido está siendo preparado...
```

### En el KDS:
Deberías ver tu orden aparecer en el panel de órdenes pendientes.

---

## ❌ Si Algo Sale Mal

### Problema: Status = ERROR

**Logs que verás**:
```
transaction.status = ERROR
status_message = "Número no válido en Sandbox"
```

**Solución**:
- Verifica que usaste `3991111111` (no tu número real)
- Verifica que estás en modo Sandbox en Wompi

---

### Problema: No ves logs de webhook

**Causa probable**: El deploy no terminó

**Solución**:
```bash
# Verificar estado del deploy
railway status

# Ver últimos logs
railway logs --lines 50
```

---

### Problema: "parseWebhookEvent is not a function"

**Causa**: Deploy antiguo aún activo

**Solución**: Espera 1-2 minutos más, el deploy se está aplicando

---

## 🧪 Comandos Útiles Durante la Prueba

### Ver solo webhooks:
```bash
railway logs --tail | grep "WEBHOOK"
```

### Ver solo status de transacciones:
```bash
railway logs --tail | grep "status"
```

### Ver solo errores:
```bash
railway logs --tail | grep "❌"
```

### Ver solo éxitos:
```bash
railway logs --tail | grep "✅"
```

---

## 📊 Checklist de la Prueba

Antes de hacer el pago:
- [ ] Deploy terminó (verificar con `railway status`)
- [ ] Logs en tiempo real abiertos (`railway logs --tail`)
- [ ] Tienes los datos de prueba a mano

Durante el pago:
- [ ] Usaste `3991111111` para Nequi (o `4242...` para tarjeta)
- [ ] Completaste todo el flujo de pago en Wompi

Después del pago:
- [ ] Viste logs de `📥 WEBHOOK RECIBIDO`
- [ ] Status = `APPROVED` (no ERROR)
- [ ] Orden creada en KDS
- [ ] Mensaje recibido por WhatsApp

---

## 🎓 Notas Importantes

### Sobre Sandbox vs Producción:

**Sandbox (Ahora)**:
- Usa datos de prueba (`3991111111`)
- No cobra dinero real
- Para testing

**Producción (Después)**:
- Usa números reales de clientes
- Cobra dinero real
- Para uso en vivo

### Sobre los Números de Prueba:

Los números de Wompi Sandbox son **mágicos**:
- `3991111111` → Siempre aprueba
- `3992222222` → Siempre rechaza
- Cualquier otro → Error

---

## 🚀 Siguiente Paso Después de Esta Prueba

Una vez que obtengas tu primera transacción `APPROVED`:

1. ✅ Confirma que el flujo completo funciona
2. 📸 Haz screenshot de los logs exitosos
3. 📝 Documenta cualquier problema encontrado
4. 🎯 Planea el paso a Producción

---

## 💡 Tip Pro

Abre **3 ventanas** para la prueba:

**Ventana 1**: Tu app web (para crear el pedido)  
**Ventana 2**: Terminal con `railway logs --tail`  
**Ventana 3**: WhatsApp Web (para ver el mensaje del bot)

Así puedes ver todo el flujo en tiempo real.

---

## 🆘 Necesitas Ayuda?

Si encuentras problemas:

1. Comparte los logs completos del webhook
2. Comparte el número que usaste (¿fue `3991111111`?)
3. Comparte el status que apareció (ERROR, APPROVED, PENDING?)

---

**¡Buena suerte con tu primera transacción aprobada!** 🎉

---

**Datos de Prueba** (para copiar rápido):

**Nequi**: `3991111111`  
**Tarjeta**: `4242 4242 4242 4242` / CVV: `123` / Fecha: `12/28`

---

**Última actualización**: 27 de enero de 2026  
**Tiempo estimado**: 5 minutos
