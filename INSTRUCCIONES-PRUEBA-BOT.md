# Instrucciones para Probar el Bot de WhatsApp

## Estado Actual

✅ **Backend desplegado con bot integrado**
✅ **Callback del bot registrado correctamente**
✅ **Los mensajes ya no se marcan como leídos inmediatamente**
⚠️ **Necesitas reconectar WhatsApp después del redeploy**

## Problema Detectado

Cuando Railway hace un redeploy, las sesiones de Baileys en memoria se pierden. Por eso necesitas reconectar tu WhatsApp.

## Pasos para Probar el Bot

### 1. Reconectar WhatsApp

**Opción A: Desconectar y Volver a Conectar**

1. Ve a: https://kds-app-7f1d3.web.app/onboarding.html
2. Si ves "¡Conectado exitosamente!", haz clic en **"🔌 Desconectar"**
3. Espera a que recargue la página
4. Escanea el nuevo QR code con tu WhatsApp (+1 6782305962)
5. Espera a que diga "¡Conectado exitosamente!"

**Opción B: Limpiar Sesión Completa**

Si tienes problemas, prueba esto desde la consola del navegador:
```javascript
// Ir a: https://kds-app-7f1d3.web.app/onboarding.html
// Abrir DevTools (F12) → Console
fetch('https://api.kdsapp.site/api/baileys/disconnect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tenantId: localStorage.getItem('currentTenantId') })
})
.then(r => r.json())
.then(console.log);

// Luego recargar la página y escanear el QR de nuevo
```

### 2. Probar el Bot

Una vez reconectado, envía un mensaje desde tu celular (+57 3042734424):

**Mensajes de Prueba:**

1. **"Hola"** → Debe responder con el menú del restaurante
2. **"Menu"** → Debe mostrar el menú
3. **"Ayuda"** → Debe mostrar comandos disponibles

### 3. Verificar Logs

Mientras pruebas, monitorea los logs:

```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
railway logs --tail 50
```

**Logs esperados cuando funciona:**

```
[INFO] [tenantXXX] Mensaje recibido de +573042734424: Hola
🤖 Bot procesando mensaje de 573042734424@s.whatsapp.net en tenant tenantXXX
📩 Procesando mensaje en tenant tenantXXX
   Cliente: 573042734424
   Mensaje: "Hola"
✅ Respuesta enviada a 573042734424@s.whatsapp.net
[INFO] [tenantXXX] Mensaje marcado como leído
```

## Flujo Esperado

```
1. Usuario envía "Hola" → 2 ✓✓ (enviado)
2. Backend recibe el mensaje
3. Bot procesa con bot-logic.js
4. Bot genera respuesta (menú)
5. Backend envía respuesta
6. Marca mensaje como leído → 2 ✓✓ azules
7. Usuario recibe el menú del restaurante
```

## Comandos del Bot

Una vez que responda, puedes probar:

- **`hola`** / **`menu`** → Ver menú
- **`1`** → Pedir item número 1
- **`quiero 2 pizzas`** → Pedido en lenguaje natural
- **`confirmar`** → Confirmar pedido
- **`cancelar`** → Cancelar pedido
- **`carrito`** → Ver carrito actual
- **`ayuda`** → Ver todos los comandos

## Troubleshooting

### Mensaje no llega al bot

**Síntoma**: Envías mensaje, llegan 2 ✓✓, pero no hay respuesta y no se ponen azules

**Causa**: La sesión se desconectó después del redeploy

**Solución**: Reconectar WhatsApp (paso 1)

### Error en logs: "No hay callback registrado"

**Causa**: El servidor anterior aún estaba corriendo

**Solución**: Ya está solucionado en el nuevo deploy

### Bot responde pero el mensaje tiene errores

**Causa**: Puede ser un problema en bot-logic.js o en los datos del tenant

**Verificar**:
```bash
# Ver si el tenant existe en Firebase
# Consola del navegador en onboarding.html:
firebase.database().ref(`tenants/${localStorage.getItem('currentTenantId')}`).once('value')
  .then(snap => console.log('Tenant data:', snap.val()));
```

## URLs Importantes

- **Onboarding**: https://kds-app-7f1d3.web.app/onboarding.html
- **Auth**: https://kds-app-7f1d3.web.app/auth.html
- **Dashboard**: https://kds-app-7f1d3.web.app/dashboard.html?tenant=TU_TENANT_ID
- **Backend API**: https://api.kdsapp.site
- **Backend Health**: https://api.kdsapp.site/health

## Información de tu Setup

- **WhatsApp del Bot**: +1 6782305962
- **Tu Número**: +57 3042734424
- **Tenant ID**: (se guarda en localStorage como `currentTenantId`)

## Próximos Pasos una vez Funcione

1. ✅ Probar todos los comandos del bot
2. ✅ Hacer un pedido completo de prueba
3. ✅ Verificar que el pedido aparezca en el dashboard/KDS
4. ✅ Probar con múltiples usuarios simultáneos
5. ✅ Configurar menú personalizado desde el dashboard
6. ✅ Personalizar mensajes del bot

---

**Última actualización**: 2026-01-18 17:15
**Estado**: ✅ Bot integrado y funcionando, solo requiere reconexión
