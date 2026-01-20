# 🧪 PRUEBA: Sistema de Restauración de Sesiones

**Objetivo:** Verificar que NO necesitas escanear QR tras Railway sleep o restart

---

## ✅ PRUEBA 1: Railway Sleep/Wake (EL CASO PRINCIPAL)

### Pasos:
1. **Conecta WhatsApp:**
   - Ve a: https://api.kdsapp.site/onboarding.html
   - Escanea el QR con tu WhatsApp
   - Verifica que aparece "✅ WhatsApp conectado" en el dashboard

2. **Deja el servidor inactivo:**
   - Espera 30-60 minutos SIN hacer ninguna petición
   - Railway dormirá el container automáticamente

3. **Despierta el servidor:**
   - Abre: https://api.kdsapp.site/health
   - O simplemente recarga el dashboard

4. **Verifica en Railway logs:**
   ```bash
   railway logs --tail 50
   ```
   
   Deberías ver:
   ```
   🔄 [Startup] Fase 1: Restaurando sesiones WhatsApp...
   📊 Total de tenants encontrados: X
   🔌 Tenants con WhatsApp conectado: 1
   ✅ Exitosas: 1/1
   ```

5. **Resultado esperado:**
   - ✅ El dashboard muestra WhatsApp conectado
   - ✅ NO te pide escanear QR de nuevo
   - ✅ Puedes enviar/recibir mensajes inmediatamente

---

## ✅ PRUEBA 2: Restart del Servidor

### Pasos:
1. **Con WhatsApp ya conectado**, fuerza un restart:
   ```bash
   railway restart
   ```

2. **Espera 10-15 segundos** para que el servidor inicie

3. **Verifica logs:**
   ```bash
   railway logs --tail 50
   ```

4. **Recarga el dashboard:**
   - https://api.kdsapp.site/kds.html

5. **Resultado esperado:**
   - ✅ WhatsApp sigue conectado
   - ✅ NO necesitas escanear QR
   - ✅ La sesión se restauró automáticamente

---

## ✅ PRUEBA 3: Logout del Dashboard (NO cierra WhatsApp)

### Pasos:
1. **Con WhatsApp conectado**, haz logout del dashboard:
   - Clic en "Cerrar sesión" en tu app web

2. **Vuelve a iniciar sesión:**
   - Inicia sesión con Firebase Auth

3. **Ve al dashboard:**
   - Debería mostrar que WhatsApp está conectado

4. **Resultado esperado:**
   - ✅ WhatsApp sigue conectado
   - ✅ NO necesitas escanear QR
   - ✅ Solo te deslogueaste de la app web, no de WhatsApp

---

## ❌ PRUEBA 4: Desconectar WhatsApp Explícitamente (SÍ requiere QR)

### Pasos:
1. **Desconecta WhatsApp intencionalmente:**
   - Opción A: Botón "Desconectar WhatsApp" en tu dashboard (si existe)
   - Opción B: Desde el celular: WhatsApp > Dispositivos vinculados > Cerrar sesión

2. **Intenta usar WhatsApp:**
   - La app debería mostrar "WhatsApp no conectado"

3. **Para reconectar:**
   - Debes ir a onboarding y escanear QR de nuevo

4. **Resultado esperado:**
   - ✅ SÍ necesitas escanear QR
   - ✅ Esto es correcto (cerraste la sesión intencionalmente)

---

## 🔍 Cómo Verificar que el Sistema Funciona

### En Railway logs, busca:

#### ✅ Restauración exitosa:
```
[2026-01-20T15:34:20.294Z] 💧 RESTAURANDO SESIONES WHATSAPP
📊 Total de tenants encontrados: 4
🔌 Tenants con WhatsApp conectado: 1
📊 RESUMEN DE RESTAURACIÓN:
   ✅ Exitosas: 1/1
```

#### ✅ Heartbeat activo:
```
[INFO] [Heartbeat] 💓 Monitor de salud de sesiones iniciado
[INFO] [Heartbeat] 📊 Sesiones activas: 1
[INFO] [Heartbeat] ✅ Saludables: 1/1
```

#### ❌ Si algo falla:
```
❌ Error hidratando sesión para tenant_xxx
[ERROR] No se encontraron credenciales en Firestore
```

---

## 📊 Tabla Resumen

| Situación | ¿Necesita escanear QR? | ¿Por qué? |
|-----------|------------------------|-----------|
| **Railway sleep/wake** | ❌ NO | Sistema restaura desde Firestore |
| **Restart del servidor** | ❌ NO | Sistema restaura desde Firestore |
| **Deploy nuevo** | ❌ NO | Sistema restaura desde Firestore |
| **Red se cae temporalmente** | ❌ NO | Heartbeat reconecta automáticamente |
| **Logout del dashboard** | ❌ NO | Solo cierra sesión web, no WhatsApp |
| **Desconectar WhatsApp manualmente** | ✅ SÍ | Cerraste la sesión intencionalmente |
| **WhatsApp banea el número** | ✅ SÍ | Credenciales inválidas |
| **Borrar creds de Firestore** | ✅ SÍ | No hay credenciales para restaurar |

---

## 🎯 Conclusión

**El sistema FUNCIONA CORRECTAMENTE si:**
- ✅ Después de Railway sleep, NO pide QR
- ✅ Después de restart, NO pide QR
- ✅ Después de logout del dashboard, NO pide QR
- ✅ Solo pide QR si desconectas WhatsApp explícitamente

**Si te está pidiendo QR después de sleep/restart:**
1. Revisa logs de Railway: `railway logs --tail 100`
2. Busca errores en la restauración
3. Verifica que las credenciales estén en Firestore: `creds/{tenantId}`
4. Confirma que `whatsappConnected: true` en Realtime DB

---

**Última actualización:** 20 enero 2026, 11:00 AM
