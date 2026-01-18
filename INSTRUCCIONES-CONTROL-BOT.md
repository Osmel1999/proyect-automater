# 🎮 Control del Bot de WhatsApp desde el Dashboard

## 🆕 Nueva Funcionalidad: Toggle de Encendido/Apagado

El sistema ahora incluye un **control visual** en el dashboard para activar y desactivar el bot de WhatsApp de manera fácil y segura.

---

## ✨ Características Principales

### 1. **Toggle Visual**
- 🟢 **Verde (ON):** Bot activo, respondiendo mensajes automáticamente
- 🔴 **Rojo (OFF):** Bot desactivado, solo marca como leídos pero no responde
- Ubicado en la parte superior del dashboard
- Indicadores visuales claros con íconos y colores

### 2. **Validación de Onboarding**
El bot **solo se puede activar** si has completado al menos el **75% del onboarding**:

| Paso | Requerido | % |
|------|-----------|---|
| ✅ WhatsApp Conectado | Siempre | 25% |
| 🍽️ Menú Configurado | **Para activar bot** | 25% |
| 💬 Mensajes Personalizados | **Para activar bot** | 25% |
| 🧪 Bot Probado | Opcional | 25% |

**Mínimo para activar:** 75% (WhatsApp + Menú + Mensajes)

### 3. **Comportamiento del Bot**

#### 🟢 Bot ACTIVO (ON)
- ✅ Responde automáticamente a todos los mensajes
- ✅ Procesa pedidos en lenguaje natural
- ✅ Gestiona carritos de compra
- ✅ Confirma pedidos y los envía a la cocina
- ✅ Muestra el menú cuando se solicita

#### 🔴 Bot DESACTIVADO (OFF)
- ⚪ Marca los mensajes como leídos (no deja en "visto")
- ❌ **NO responde** a los clientes
- ❌ **NO envía mensajes** de ningún tipo
- ℹ️ Los mensajes se almacenan pero no se procesan
- ℹ️ El usuario NO recibe ninguna advertencia o notificación

### 4. **Advertencias y Validaciones**

#### Si intentas activar con < 75% de onboarding:
```
⚠️ Para activar el bot, debes completar al menos el 75% del onboarding.

Actualmente has completado: XX%

Completa la configuración del menú y los mensajes personalizados para continuar.
```

#### Mensaje de confirmación al activar:
```
✅ Bot activado

El bot ahora responderá automáticamente a los mensajes de tus clientes.
```

#### Mensaje de confirmación al desactivar:
```
🔴 Bot desactivado

El bot no responderá a los mensajes hasta que lo vuelvas a activar.
```

---

## 🎯 Casos de Uso

### Caso 1: Nuevo Usuario (0% Onboarding)
1. Usuario conecta WhatsApp → 25%
2. Ve el toggle del bot en **OFF** y **deshabilitado**
3. Ve advertencia: "Completa tu configuración primero"
4. Completa menú → 50%
5. Completa mensajes → 75%
6. ✅ **Ahora puede activar el bot**

### Caso 2: Restaurante Quiere Pausar Temporalmente
1. Bot está activo (ON)
2. Cierra por mantenimiento/inventario
3. Click en el toggle → **OFF**
4. Los clientes no reciben respuestas
5. Cuando esté listo, click en toggle → **ON**
6. ✅ Bot vuelve a funcionar normalmente

### Caso 3: Actualización del Menú
1. Bot está activo (ON)
2. Necesita actualizar precios/productos
3. Click en toggle → **OFF**
4. Actualiza el menú en el dashboard
5. Prueba el bot manualmente (opcional)
6. Click en toggle → **ON**
7. ✅ Bot funciona con el nuevo menú

---

## 🔧 Implementación Técnica

### Base de Datos (Firebase)
```json
{
  "tenants": {
    "{tenantId}": {
      "bot": {
        "config": {
          "active": true,  // false = bot apagado
          "lastUpdated": "2026-01-18T..."
        }
      }
    }
  }
}
```

### Flujo del Mensaje

```
Cliente envía mensaje
    ↓
Baileys recibe mensaje
    ↓
event-handlers.js → handleIncomingMessage()
    ↓
bot-logic.js → processMessage()
    ↓
Verifica: ¿Bot activo?
    ↓
SI → Procesa y responde
NO → return null (sin respuesta)
    ↓
event-handlers.js recibe null
    ↓
Solo marca como leído
```

### Archivos Modificados

1. **`server/bot-logic.js`**
   - Agregada validación de estado del bot al inicio de `processMessage()`
   - Retorna `null` si el bot está desactivado
   - Eliminado mensaje de advertencia cuando el bot está apagado

2. **`server/baileys/event-handlers.js`**
   - Modificado para manejar respuesta `null` del callback
   - Si es `null`, solo marca como leído sin enviar respuesta

3. **`dashboard.html`**
   - Agregado CSS para el control del bot
   - Agregado HTML del toggle y advertencias
   - Agregadas funciones JavaScript:
     - `updateBotControlUI()`: Actualiza la UI del control
     - `toggleBot()`: Cambia el estado del bot
     - Validación de onboarding al cargar

---

## 🧪 Pruebas Realizadas

### ✅ Escenarios Probados

1. **Bot Activo (ON)**
   - [x] Cliente envía "hola" → Bot responde con menú
   - [x] Cliente hace pedido → Bot procesa y confirma
   - [x] Cliente consulta carrito → Bot muestra resumen

2. **Bot Desactivado (OFF)**
   - [x] Cliente envía mensaje → No recibe respuesta
   - [x] Mensaje marcado como leído ✓
   - [x] Cliente NO recibe mensaje de advertencia
   - [x] Dashboard muestra estado "Bot desactivado"

3. **Validación de Onboarding**
   - [x] < 75% onboarding → Toggle deshabilitado
   - [x] Intento de activar < 75% → Muestra alerta
   - [x] ≥ 75% onboarding → Toggle habilitado
   - [x] Activación exitosa → Mensaje de confirmación

4. **Persistencia**
   - [x] Estado se guarda en Firebase
   - [x] Estado se mantiene después de recargar página
   - [x] Estado se mantiene después de redeploy del backend

---

## 📋 Checklist de Usuario

### Para Activar el Bot por Primera Vez:

- [ ] 1. Conectar WhatsApp (escanear QR)
- [ ] 2. Configurar menú (al menos 1 producto)
- [ ] 3. Personalizar mensajes (bienvenida, confirmación, despedida)
- [ ] 4. Verificar que el progreso sea ≥ 75%
- [ ] 5. Click en el toggle para activar
- [ ] 6. Verificar que cambie a verde (ON)
- [ ] 7. Probar enviando un mensaje de prueba
- [ ] 8. Confirmar que el bot responde

### Para Desactivar Temporalmente:

- [ ] 1. Ir al dashboard
- [ ] 2. Click en el toggle (ON → OFF)
- [ ] 3. Confirmar el cambio
- [ ] 4. Verificar que cambie a rojo (OFF)
- [ ] 5. Probar enviando un mensaje
- [ ] 6. Confirmar que NO responde

---

## 🚨 Troubleshooting

### El toggle no responde
- Verificar que el usuario tenga permisos en Firebase
- Verificar que `tenantId` esté correctamente cargado
- Revisar la consola del navegador para errores

### El bot sigue respondiendo aunque esté OFF
- Verificar en Firebase que `bot/config/active` sea `false`
- Hacer un hard refresh del backend (redeploy en Railway)
- Revisar logs del backend para confirmar que lee el estado

### No puedo activar el bot (toggle deshabilitado)
- Verificar el porcentaje de onboarding (debe ser ≥ 75%)
- Completar la configuración del menú
- Completar la personalización de mensajes
- Recargar la página para actualizar el estado

### El porcentaje no se actualiza
- Completar todos los pasos del onboarding
- Guardar cada configuración (click en botones de guardar)
- Recargar la página del dashboard
- Verificar en Firebase que los datos se guardaron

---

## 📚 Recursos Adicionales

- **Dashboard:** https://kds-app-7f1d3.web.app/dashboard.html
- **Onboarding:** https://kds-app-7f1d3.web.app/onboarding.html
- **Backend API:** https://api.kdsapp.site
- **Firebase Console:** https://console.firebase.google.com/

---

## 💡 Mejores Prácticas

1. **Siempre completa el onboarding antes de activar el bot**
   - Asegura una buena experiencia para tus clientes
   - Evita que el bot responda con información incompleta

2. **Prueba el bot antes de dejarlo activo permanentemente**
   - Envía mensajes de prueba
   - Verifica que el menú se muestre correctamente
   - Confirma que los pedidos se procesen bien

3. **Desactiva el bot cuando no estés operando**
   - Durante cierres por mantenimiento
   - Fuera de horario de atención
   - Cuando estés actualizando el menú

4. **Monitorea el estado regularmente**
   - Revisa el dashboard periódicamente
   - Verifica que el bot esté en el estado correcto
   - Lee los logs si hay problemas

---

## 🎉 Conclusión

El nuevo control del bot ofrece:
- ✅ **Simplicidad:** Toggle visual fácil de usar
- ✅ **Seguridad:** Validación de onboarding mínimo
- ✅ **Control:** Activa/desactiva cuando quieras
- ✅ **Profesionalismo:** Sin mensajes molestos para los clientes
- ✅ **Transparencia:** Estado claro en el dashboard

**¡Ahora tienes control total sobre cuándo tu bot responde a los clientes!** 🚀
