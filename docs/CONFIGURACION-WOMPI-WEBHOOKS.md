# 🔧 Configuración de Wompi - Webhooks y Variables de Entorno

## 📋 Resumen del Problema Encontrado

### ❌ Problemas identificados:

1. **URL de webhook con tenant hardcodeado**: 
   - Tenías: `https://api.kdsapp.site/api/payments/webhook/wompi/tenant1769095946220o10i5g9zw`
   - **Esto causa que todos los pagos se asocien al mismo tenant**

2. **Verificación de firma incorrecta**:
   - El código usaba HMAC-SHA256 en lugar de SHA256
   - El formato de concatenación no seguía la documentación de Wompi

---

## ✅ Solución Implementada

### 1. URL de Webhook Correcta

**En el Dashboard de Wompi** (tanto en Sandbox como en Producción):

```
https://api.kdsapp.site/api/membership/webhook
```

**NO** incluir ningún tenant o parámetro adicional. El sistema extrae el `tenantId` automáticamente de la referencia del pago.

### 2. Variables de Entorno Requeridas

En **Railway** (o tu servidor de producción), configura estas variables:

#### Para Modo Test/Sandbox:
```bash
WOMPI_PUBLIC_KEY=pub_test_tu_clave_publica_aqui
WOMPI_PRIVATE_KEY=prv_test_tu_clave_privada_aqui
WOMPI_EVENTS_SECRET=test_events_tu_secreto_aqui
WOMPI_INTEGRITY_SECRET=test_integrity_tu_secreto_aqui
WOMPI_ENVIRONMENT=sandbox
```

#### Para Modo Producción:
```bash
WOMPI_PUBLIC_KEY=pub_prod_tu_clave_publica_aqui
WOMPI_PRIVATE_KEY=prv_prod_tu_clave_privada_aqui
WOMPI_EVENTS_SECRET=prod_events_tu_secreto_aqui
WOMPI_INTEGRITY_SECRET=prod_integrity_tu_secreto_aqui
WOMPI_ENVIRONMENT=production
```

### 3. Dónde Obtener Cada Clave

En el **Dashboard de Wompi** (comercios.wompi.co):

1. **Llaves Públicas y Privadas**:
   - Ve a: `Configuración` → `Llaves de API`
   - Copia `pub_test_...` y `prv_test_...` para sandbox
   - Copia `pub_prod_...` y `prv_prod_...` para producción

2. **Secreto de Eventos** (WOMPI_EVENTS_SECRET):
   - Ve a: `Mi Cuenta` → `Secretos para integración técnica`
   - Busca: "Secreto para eventos"
   - Formato: `test_events_...` o `prod_events_...`

3. **Secreto de Integridad** (WOMPI_INTEGRITY_SECRET):
   - Mismo lugar: `Mi Cuenta` → `Secretos para integración técnica`
   - Busca: "Secreto de integridad"
   - Formato: Similar al de eventos

---

## 🔒 Configuración del Webhook en Wompi

### Paso a Paso:

1. **Accede al Dashboard de Wompi**: https://comercios.wompi.co/

2. **Selecciona el ambiente**:
   - Para pruebas: Activa modo "Sandbox"
   - Para producción: Usa modo "Producción"

3. **Configura la URL de eventos**:
   - Ve a: `Configuración` → `URL de eventos` o `Webhooks`
   - Introduce: `https://api.kdsapp.site/api/membership/webhook`
   - **Importante**: NO agregues parámetros ni tenant IDs

4. **Guarda la configuración**

5. **Importante**: Configura URLs diferentes para cada ambiente:
   ```
   Sandbox:    https://api.kdsapp.site/api/membership/webhook
   Producción: https://api.kdsapp.site/api/membership/webhook
   ```
   (Aunque la URL es la misma, asegúrate de configurarla en ambos ambientes)

---

## 🧪 Cómo Probar

### 1. Verifica las Variables de Entorno en Railway

```bash
# Usando Railway CLI
railway variables

# O verifica en el dashboard de Railway
# Settings → Variables
```

### 2. Prueba con Tarjeta de Test

Usa la tarjeta de prueba APROBADA de Wompi:

```
Número: 4242 4242 4242 4242
CVV:    123 (cualquier 3 dígitos)
Fecha:  12/25 (cualquier fecha futura)
Nombre: Tu Nombre
```

### 3. Verifica los Logs

Después de hacer un pago de prueba, verifica:

```bash
# Ver logs en Railway
railway logs

# Busca estos mensajes:
# ✅ [Wompi] Enlace de pago creado para tenant XXX, plan YYY
# 📨 [Webhook] Recibido de Wompi
# ✅ [Webhook] Pago exitoso - Tenant: XXX, Plan: YYY
# ✅ [Webhook] Plan YYY activado para tenant XXX
```

---

## 🔍 Cómo Funciona el Sistema

### Flujo de Pago:

1. **Usuario selecciona un plan** en `/plans.html`

2. **Frontend llama** a `/api/membership/checkout`:
   ```javascript
   POST /api/membership/checkout
   Body: {
     tenantId: "tenant123",
     plan: "profesional",
     email: "user@example.com"
   }
   ```

3. **Backend crea payment link** con Wompi:
   - Genera referencia: `KDS-{tenantId}-{plan}-{timestamp}`
   - Ejemplo: `KDS-tenant123-profesional-1738498765000`
   - **El tenantId está codificado en la referencia**

4. **Usuario es redirigido** a Wompi para pagar

5. **Wompi procesa el pago** y envía webhook a:
   ```
   POST https://api.kdsapp.site/api/membership/webhook
   ```

6. **Backend extrae el tenantId** de la referencia:
   ```javascript
   parseReference("KDS-tenant123-profesional-1738498765000")
   // Retorna: { tenantId: "tenant123", plan: "profesional" }
   ```

7. **Backend activa el plan** para el tenant correcto

---

## 📊 Estructura de la Referencia

El sistema usa este formato para identificar pagos:

```
KDS-{tenantId}-{plan}-{timestamp}
```

**Ejemplos**:
```
KDS-tenant1769095946220o10i5g9zw-profesional-1738498765000
KDS-restaurante-abc-123-emprendedor-1738500000000
KDS-local-xyz-789-empresarial-1738510000000
```

**Ventajas**:
- ✅ Multi-tenant automático
- ✅ No requiere tenant en URL de webhook
- ✅ Trazabilidad completa
- ✅ Compatible con cualquier gateway de pago

---

## 🚨 Errores Comunes

### Error 1: "Transacción declinada" con tarjeta 4242

**Causa**: 
- Webhook mal configurado
- Falta `WOMPI_EVENTS_SECRET`
- Verificación de firma fallando

**Solución**:
- Verifica que todas las variables de entorno estén configuradas
- Confirma que el webhook URL NO tenga tenant hardcodeado
- Reinicia el servidor después de cambiar variables

### Error 2: "Plan no se activa después del pago"

**Causa**:
- Webhook no está llegando
- Referencia del pago no tiene el formato correcto
- Firma del webhook no se valida

**Solución**:
- Revisa los logs del servidor
- Verifica que la URL de webhook esté correcta en Wompi
- Confirma que `WOMPI_EVENTS_SECRET` sea correcto

### Error 3: "Todos los pagos van al mismo tenant"

**Causa**:
- URL de webhook tiene tenant hardcodeado

**Solución**:
- Cambia la URL en Wompi a: `https://api.kdsapp.site/api/membership/webhook`
- NO incluyas el tenant en la URL

---

## 📝 Checklist de Configuración

Antes de pasar a producción, verifica:

- [ ] Variables de entorno configuradas en Railway
- [ ] `WOMPI_PUBLIC_KEY` configurada
- [ ] `WOMPI_PRIVATE_KEY` configurada
- [ ] `WOMPI_EVENTS_SECRET` configurada
- [ ] `WOMPI_INTEGRITY_SECRET` configurada
- [ ] `WOMPI_ENVIRONMENT` = "sandbox" o "production"
- [ ] URL de webhook correcta en dashboard de Wompi
- [ ] URL NO tiene tenant hardcodeado
- [ ] Pago de prueba exitoso con tarjeta 4242
- [ ] Logs muestran webhook recibido y procesado
- [ ] Plan se activa correctamente en Firebase
- [ ] Notificación de pago se envía al usuario

---

## 🆘 Soporte

Si sigues teniendo problemas:

1. **Verifica los logs** en Railway
2. **Revisa el dashboard de Wompi** para ver transacciones
3. **Consulta la documentación oficial**: https://docs.wompi.co/docs/colombia/eventos/
4. **Contacta a soporte de Wompi**: https://soporte.wompi.co/

---

## 📚 Referencias

- [Documentación de Eventos de Wompi](https://docs.wompi.co/docs/colombia/eventos/)
- [Datos de Prueba en Sandbox](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/)
- [API Reference de Wompi](https://docs.wompi.co/docs/colombia/referencia/)
