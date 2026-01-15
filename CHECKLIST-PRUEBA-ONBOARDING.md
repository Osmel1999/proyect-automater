# 🚀 CHECKLIST FINAL: PRUEBA DE ONBOARDING

**Fecha**: 12 de enero de 2026  
**Objetivo**: Probar el flujo completo de onboarding con número real

---

## ✅ PRE-REQUISITOS VERIFICADOS

### Infraestructura Meta
- [x] App ID: 849706941272247
- [x] Config ID: 849873494548110
- [x] Portfolio ID: 880566844730976
- [x] System User Token configurado
- [x] Webhook configurado y verificado

### Código Frontend
- [x] `facebook-config.js` con credenciales correctas
- [x] `onboarding.html` con pre-fill del portfolio
- [x] `auth.html` con login/registro + PIN
- [x] `select.html` con modal de PIN para dashboard
- [x] Todos los archivos desplegados en Firebase

### Código Backend
- [x] Backend desplegado en Railway
- [x] Variables de entorno configuradas
- [x] Webhook funcionando (GET y POST)
- [x] Endpoints de salud activos

---

## ⚠️ PENDIENTE DE VERIFICAR EN META DASHBOARD

### 1. Facebook Login Configuration
**URL**: https://developers.facebook.com/apps/849706941272247/fb-login/settings/

**Agregar estas 7 URLs**:
```
http://kdsapp.site/
https://kdsapp.site/
http://kdsapp.site/auth.html
https://kdsapp.site/auth.html
http://kds-app-7f1d3.web.app/
https://kds-app-7f1d3.web.app/
https://api.kdsapp.site/api/whatsapp/callback
```

---

### 2. Pre-fill Configuration (CRÍTICO)
**URL**: https://developers.facebook.com/apps/849706941272247/whatsapp-business/embedded-signup/

**Pasos**:
1. Configurations → ES Config → Edit
2. Pre-fill → Business Portfolio
3. Selecciona: **"KDS" (880566844730976)**
4. Save Changes

**Verificación**: Debe aparecer "Pre-fill Business Portfolio: KDS ✓"

---

## 🧪 FLUJO DE PRUEBA

### PASO 1: Registro de Usuario

```
1. Ve a: https://kdsapp.site/auth.html
2. Click en "Registrar"
3. Completa el formulario:
   - Nombre: [Tu nombre]
   - Nombre del Negocio: [Tu negocio]
   - Email: [tu@email.com]
   - Contraseña: [mínimo 6 caracteres]
   - Confirmar contraseña
   - PIN de 4 dígitos: [1234] (ejemplo)
4. Click "Registrar"
```

**Resultado esperado**: ✅ Redirige a `/onboarding.html`

---

### PASO 2: Onboarding - Conectar WhatsApp

```
5. En onboarding.html, verifica que veas:
   - Logo de KDS
   - "Conecta tu WhatsApp Business en 1 clic"
   - Dos opciones: "Tengo un número" y "Número nuevo"
   
6. Selecciona una opción (recomendado: "Tengo un número")

7. Lee el banner amarillo sobre el Portfolio de KDS

8. Click en "Conectar WhatsApp"
```

**Resultado esperado**: 
- ✅ Se abre modal de Facebook
- ✅ **NO** pide crear/seleccionar portfolio
- ✅ Muestra "Conectar a: KDS" pre-cargado
- ✅ Solo pide ingresar número de WhatsApp

---

### PASO 3: Ingresar Número de WhatsApp

```
9. En el modal de Facebook:
   - Ingresa tu número: +57XXXXXXXXXX
   - Selecciona método de verificación: SMS o llamada
   - Ingresa el código de verificación recibido

10. Acepta los permisos de WhatsApp Business API

11. Click "Continuar" o "Finalizar"
```

**Resultado esperado**: 
- ✅ Modal se cierra
- ✅ Redirige a `/onboarding-success.html` o `/select.html`
- ✅ Aparece mensaje de éxito

---

### PASO 4: Verificación en Backend

```
12. Abre terminal y verifica logs:
    railway logs --tail 50

13. Busca estas líneas:
    ✅ "Webhook recibido de WhatsApp Business API"
    ✅ "Número registrado: +57XXXXXXXXXX"
    ✅ "Tenant creado: tenant_XXXXX"
```

**Resultado esperado**: El número debe estar activo **inmediatamente** (< 1 min)

---

### PASO 5: Verificación en Firebase

```
14. Ve a Firebase Console:
    https://console.firebase.google.com/project/kds-app-7f1d3/database

15. Navega a: /tenants/{tenantId}

16. Verifica que exista:
    - whatsappPhoneNumber: "+57XXXXXXXXXX"
    - whatsappPhoneNumberId: "XXXXXXXXXXXXX"
    - whatsappBusinessAccountId: "XXXXXXXXXXXXX"
    - createdAt: [timestamp]
```

**Resultado esperado**: ✅ Datos guardados correctamente en Firebase

---

### PASO 6: Verificación en Meta Dashboard

```
17. Ve a: https://developers.facebook.com/apps/849706941272247/whatsapp-business/wa-settings/

18. En "Phone numbers", busca tu número

19. Verifica:
    - Estado: ✅ Connected
    - Business: KDS (880566844730976)
    - Display name: [nombre de tu negocio]
```

**Resultado esperado**: ✅ Número conectado y activo

---

### PASO 7: Prueba de Mensajería

```
20. Usa API Testing para enviar mensaje a tu número:

curl -X POST \
  https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "57XXXXXXXXXX",
    "type": "text",
    "text": {"body": "¡Bienvenido a KDS! 🎉"}
  }'

21. Verifica que recibas el mensaje en WhatsApp
```

**Resultado esperado**: ✅ Mensaje recibido en WhatsApp

---

### PASO 8: Prueba del Dashboard

```
22. En el navegador, ve a: https://kdsapp.site/select.html

23. Deberías ver dos opciones:
    - KDS (sin candado)
    - Dashboard (con candado 🔒)

24. Click en "Dashboard"

25. Ingresa tu PIN de 4 dígitos

26. Verifica acceso al dashboard
```

**Resultado esperado**: ✅ Acceso al dashboard con PIN

---

## 🔍 VERIFICACIÓN DE ACTIVACIÓN INSTANTÁNEA

### ⚡ Con Pre-fill (ESPERADO)
```
1. Usuario conecta número
2. ⚡ Número activo inmediatamente (< 1 min)
3. ✅ Puede enviar/recibir mensajes
4. ✅ Webhook recibe eventos
```

### ⏳ Sin Pre-fill (NO DESEADO)
```
1. Usuario conecta número
2. ⏳ "Pendiente de revisión"
3. ⏳ Espera 24-48 horas
4. ❌ No puede enviar mensajes
```

---

## 🚨 PROBLEMAS COMUNES

### Error 1: "Account not registered"
**Causa**: El número no ha completado onboarding  
**Solución**: Completar el flujo de onboarding primero

### Error 2: Modal pide crear portfolio
**Causa**: Pre-fill NO configurado en Meta  
**Solución**: Configurar pre-fill (ver sección "PENDIENTE DE VERIFICAR")

### Error 3: PIN incorrecto
**Causa**: PIN no coincide con el guardado  
**Solución**: Verificar hash del PIN en Firebase

### Error 4: Webhook no recibe eventos
**Causa**: Webhook listening OFF  
**Solución**: Activar en Meta Dashboard

---

## 📊 MÉTRICAS DE ÉXITO

| Métrica | Objetivo |
|---------|----------|
| Tiempo de activación | < 1 minuto |
| Tasa de éxito onboarding | > 95% |
| Errores de portfolio | 0% |
| Tiempo webhook response | < 2 segundos |

---

## 🎯 PRÓXIMAS ACCIONES

1. **HOY**: Configurar Pre-fill en Meta Dashboard
2. **HOY**: Configurar Facebook Login URLs
3. **HOY**: Probar onboarding con número real
4. **DESPUÉS**: Validar bot de pedidos end-to-end
5. **DESPUÉS**: Pruebas con clientes beta

---

## 📚 DOCUMENTACIÓN DE REFERENCIA

- `VERIFICACION-PRE-FILL-PORTFOLIO.md` - Detalles del pre-fill
- `GUIA-FACEBOOK-LOGIN-QUICKSTART.md` - Configuración de Facebook Login
- `GUIA-API-TESTING-WHATSAPP.md` - Pruebas de mensajería
- `NUEVA-CONFIGURACION-META.md` - Credenciales y configuración

---

**Última actualización**: 12 de enero de 2026  
**Status**: ⏳ Listo para probar - Pendiente configurar Pre-fill en Meta

**ACCIÓN INMEDIATA**: 
1. ✅ Configurar Pre-fill en Meta Dashboard
2. ✅ Probar onboarding con número real
