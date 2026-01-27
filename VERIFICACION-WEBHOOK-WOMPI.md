# ✅ Verificación de Webhook de Wompi

**Fecha**: 27 de enero de 2026  
**Problema**: Wompi no está enviando webhooks al backend

---

## 📋 Checklist de Verificación

### 1. ✅ Verificar URL del Webhook en Wompi

**URL correcta que debe estar en Wompi:**
```
https://automater-production.up.railway.app/api/payments/webhook/wompi/[TU_TENANT_ID]
```

**Ejemplo:**
```
https://automater-production.up.railway.app/api/payments/webhook/wompi/tenant1769095946220o10i5g9zw
```

**Dónde configurarla:**
1. Ir a: https://comercios.wompi.co
2. Login con tus credenciales
3. Ir a: **Configuración → Webhook**
4. Pegar la URL completa

---

### 2. ✅ Verificar Events Secret

El **Events Secret** es una clave que Wompi usa para firmar los webhooks.

**Dónde encontrarlo:**
1. En el mismo panel de Webhook de Wompi
2. Copiar el **Events Secret** que aparece

**Dónde configurarlo en tu sistema:**
1. Ir a tu dashboard: https://automater-88ec2.web.app/dashboard.html
2. Clic en **Configurar Pagos**
3. Pegar el Events Secret en el campo correspondiente

---

### 3. 🧪 Probar el Endpoint del Webhook

Puedes probar que el endpoint funciona usando este comando en tu terminal:

```bash
curl -X POST \
  https://automater-production.up.railway.app/api/payments/webhook/wompi/tenant1769095946220o10i5g9zw \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transaction.updated",
    "data": {
      "transaction": {
        "id": "test_12345",
        "reference": "tenant1769095946220o10i5g9zw_order_test",
        "status": "APPROVED",
        "amount_in_cents": 50000,
        "currency": "COP"
      }
    }
  }'
```

**Resultado esperado:**
- El backend debe mostrar logs de:
  - `📥 WEBHOOK RECIBIDO`
  - `Gateway: wompi`
  - `✅ Webhook procesado exitosamente`

---

### 4. 🔍 Verificar que Wompi puede alcanzar el backend

**Posibles problemas:**

1. **URL incorrecta**: Verifica que la URL en Wompi sea exactamente la correcta
2. **Firewall**: Asegúrate de que Railway no bloquee las peticiones de Wompi
3. **HTTPS**: Wompi solo envía webhooks a URLs HTTPS (tu Railway usa HTTPS ✅)

**Cómo verificar:**
1. Hacer una transacción de prueba en sandbox de Wompi
2. Inmediatamente revisar los logs del backend en Railway:
   ```bash
   railway logs --tail
   ```
3. Buscar logs que digan `📥 WEBHOOK RECIBIDO`

---

### 5. 📊 Verificar Logs en Wompi

Wompi tiene un panel de logs donde puedes ver:
- Si están enviando el webhook
- Si recibieron respuesta 200 OK
- Errores en caso de que no puedan enviar

**Dónde verlo:**
1. Panel de Wompi: https://comercios.wompi.co
2. Ir a: **Transacciones → Logs de Webhook**
3. Ver si hay intentos de envío y sus respuestas

---

## 🎯 Pasos a Seguir

### Paso 1: Verificar configuración en Wompi
```bash
✅ URL del webhook configurada correctamente
✅ Events Secret copiado
✅ Webhook habilitado
```

### Paso 2: Probar con curl
```bash
# Ejecutar el comando curl de arriba
# Verificar que el backend responda
```

### Paso 3: Hacer transacción de prueba
```bash
# Crear un pedido en tu sistema
# Hacer clic en el link de pago
# Completar el pago en sandbox de Wompi
# Revisar logs en Railway
```

### Paso 4: Verificar logs
```bash
# Si NO ves logs de webhook:
# → Problema en configuración de Wompi
# → URL incorrecta o Events Secret incorrecto

# Si SÍ ves logs de webhook:
# → ¡Funciona! 🎉
# → El bot debería enviar confirmación
```

---

## 🐛 Debugging

### Si no ves logs de webhook:

**Opción A: Usar endpoint de prueba**
```bash
curl -X POST \
  https://automater-production.up.railway.app/api/payments/webhook/test/wompi/[TU_TENANT_ID] \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "test_12345",
    "status": "APPROVED",
    "amount": 50000
  }'
```

**Opción B: Revisar logs de Railway**
```bash
railway logs --tail
```

**Opción C: Verificar que el servicio está corriendo**
```bash
curl https://automater-production.up.railway.app/health
```

---

## 📝 Notas

- El backend **YA ESTÁ LISTO** para recibir webhooks
- El endpoint tiene logs muy detallados para debugging
- Si no ves logs, es porque Wompi no está enviando el webhook
- Verifica la configuración en el panel de Wompi

---

## 🆘 Ayuda

Si después de seguir todos estos pasos aún no funciona:

1. Comparte los logs de Railway después de hacer una transacción
2. Comparte un screenshot del panel de Webhook de Wompi
3. Comparte el tenant ID que estás usando

---

**Última actualización**: 27 de enero de 2026
