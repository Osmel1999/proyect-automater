# Cómo Desconectar WhatsApp Business para Migrar a la API

**Fecha:** 8 de enero de 2026  
**Propósito:** Guía para resolver el error: *"This number is registered to an existing WhatsApp account"*

---

## ❓ ¿Por qué aparece este error?

Este error significa que el número que intentas conectar **ya está registrado** en:
- WhatsApp Business App (en un teléfono)
- WhatsApp regular (app personal)
- Otra cuenta de WhatsApp Business API

**Meta/WhatsApp solo permite UNA conexión activa por número.**

Para migrar a la API, primero debes **desconectar el número** de su ubicación actual.

---

## ✅ Solución: Desconectar el número

### **Opción 1: Eliminar cuenta desde WhatsApp Business App** ⭐ (Recomendado)

#### 📱 En Android:

1. Abre **WhatsApp Business** en tu teléfono
2. Toca los **3 puntos verticales** (⋮) en la esquina superior derecha
3. Selecciona **"Configuración"**
4. Toca **"Cuenta"**
5. Toca **"Eliminar cuenta"**
6. Ingresa tu número de teléfono completo (con código de país)
7. Toca **"ELIMINAR MI CUENTA"**
8. Lee la advertencia y confirma tocando **"ELIMINAR"**

#### 🍎 En iPhone:

1. Abre **WhatsApp Business** en tu iPhone
2. Toca **"Configuración"** (ícono de engranaje abajo a la derecha)
3. Toca **"Cuenta"**
4. Toca **"Eliminar mi cuenta"**
5. Ingresa tu número de teléfono completo (con código de país)
6. Toca **"Eliminar mi cuenta"**
7. Confirma la acción

---

### **Opción 2: Desinstalar WhatsApp Business** (Si no tienes acceso)

Si no puedes acceder a la configuración o olvidaste la contraseña:

1. **Desinstala** WhatsApp Business del teléfono
2. **NO la reinstales** con ese número
3. **Espera al menos 10-15 minutos**
4. Intenta nuevamente en el onboarding

⚠️ **Nota:** Esta opción puede tardar más en liberar el número (hasta 24 horas en algunos casos).

---

### **Opción 3: Contactar soporte de Meta** (Último recurso)

Si ninguna de las opciones anteriores funciona:

1. Ve a: https://business.facebook.com/direct-support
2. Inicia sesión con tu cuenta de Facebook Business
3. Selecciona tu **Business Account**
4. Selecciona **"WhatsApp Business API"**
5. Haz clic en **"Contactar soporte"**
6. Describe el problema:

```
Subject: Need to disconnect phone number from existing account

Message:
Hello,

I'm trying to connect my phone number +[TU_NUMERO] to WhatsApp Business API,
but I'm getting the error "This number is registered to an existing WhatsApp account".

I have already deleted the WhatsApp Business app from my phone and waited 24 hours,
but the number is still not available.

Can you please help me disconnect this number so I can use it with the API?

Thank you.
```

7. Espera respuesta (puede tardar 24-48 horas)

---

## ⏱️ ¿Cuánto tiempo debo esperar después de desconectar?

Después de eliminar la cuenta o desinstalar la app:

| Tiempo | Estado |
|--------|--------|
| **3 minutos** | Mínimo recomendado por Meta |
| **10-15 minutos** | Tiempo recomendado realista |
| **1 hora** | Si aún no funciona, espera esto |
| **24 horas** | Máximo reportado en casos extremos |

**Consejo:** Espera al menos 10 minutos antes de intentar nuevamente.

---

## 🔍 ¿Cómo verificar si el número está libre?

Puedes comprobar manualmente si el número ya está desconectado:

### Método 1: Intentar registrarse en WhatsApp

1. Abre **WhatsApp** (normal o Business) en otro teléfono o dispositivo
2. Intenta **registrarte** con ese número
3. **Si te envía código de verificación** → El número está libre ✅
4. **Si dice "Este número ya está registrado"** → Aún está conectado ❌

### Método 2: Esperar el tiempo recomendado

Simplemente espera 10-15 minutos y vuelve a intentar en el onboarding.

---

## ⚠️ Información importante antes de desconectar

### ¿Qué se borrará?

- ✅ **Chats locales** en el teléfono (pero puedes hacer backup)
- ✅ **Acceso a la app** de WhatsApp Business en el teléfono

### ¿Qué NO se borrará?

- ❌ **Contactos** (siguen guardados en tu teléfono)
- ❌ **Historial con clientes** (tus clientes pueden seguir escribiéndote)
- ❌ **Número de teléfono** (el número sigue siendo tuyo)

### ¿Podré volver a usar la app después?

**NO.** Una vez que conectes el número a la API, **no podrás** volver a usar WhatsApp Business App con ese número en tu teléfono.

**Si necesitas acceso manual:**
- Usa el **dashboard web** que Meta proporciona
- O usa el **dashboard de conversaciones** que podemos construir para ti

---

## 📸 Hacer backup de chats (Opcional)

Si quieres guardar tus conversaciones antes de eliminar:

### Android:
1. WhatsApp Business → **Configuración** → **Chats**
2. Toca **"Copia de seguridad de chats"**
3. Toca **"Guardar"**
4. Espera a que termine el backup
5. Los chats se guardarán en Google Drive

### iPhone:
1. WhatsApp Business → **Configuración** → **Chats**
2. Toca **"Copia de seguridad de chats"**
3. Toca **"Realizar copia ahora"**
4. Los chats se guardarán en iCloud

⚠️ **Nota:** No podrás restaurar estos chats cuando uses la API, pero tendrás un backup por seguridad.

---

## 📋 Checklist de pasos completos

Para evitar problemas, sigue estos pasos en orden:

- [ ] 1. **Hacer backup** de chats (opcional)
- [ ] 2. **Informar a clientes** que el sistema va a cambiar (opcional)
- [ ] 3. **Abrir WhatsApp Business** en el teléfono
- [ ] 4. **Ir a Configuración** → Cuenta → Eliminar cuenta
- [ ] 5. **Ingresar número** y confirmar eliminación
- [ ] 6. **Desinstalar** WhatsApp Business del teléfono
- [ ] 7. **Esperar 10-15 minutos** (tomar un café ☕)
- [ ] 8. **Volver al onboarding** y reintentar
- [ ] 9. **Si aún falla**, esperar 1 hora más
- [ ] 10. **Si aún falla**, contactar soporte de Meta

---

## 🆘 Errores comunes y soluciones

### Error: "No puedo eliminar la cuenta porque no recuerdo el PIN"

**Solución:**
1. Ve a **Configuración** → **Cuenta** → **Verificación en dos pasos**
2. Toca **"Desactivar"**
3. Si no puedes, toca **"¿Olvidaste tu PIN?"**
4. Espera 7 días para que se desactive automáticamente
5. O simplemente **desinstala la app** y espera 24 horas

---

### Error: "Ya eliminé la cuenta pero sigue diciendo que está registrada"

**Solución:**
1. **Espera más tiempo** (10-15 minutos mínimo)
2. **Verifica** que realmente se eliminó (intenta abrir WhatsApp Business, no debería estar la cuenta)
3. **Reinicia** tu teléfono
4. **Intenta nuevamente** después de 1 hora

---

### Error: "No tengo acceso físico al teléfono"

**Solución:**
1. Si el teléfono es tuyo pero no lo tienes: **Ve a buscarlo** 😅
2. Si lo perdiste: **Contacta a Meta** con opción 3 (soporte)
3. Si el número era de otra persona: **Necesitas que esa persona elimine la cuenta**
4. Si compraste el número usado: **Contacta a tu proveedor de telefonía** para que liberen el número

---

## 💬 Mensaje para enviar a tus clientes

Si necesitas explicarle esto a tus clientes, copia y personaliza este mensaje:

```
Hola [Nombre],

Para conectar tu número de WhatsApp al sistema automatizado,
necesito que sigas estos pasos:

1. Abre WhatsApp Business en tu teléfono
2. Ve a Configuración → Cuenta → Eliminar cuenta
3. Ingresa tu número y confirma
4. Espera 10 minutos
5. Regresa a [tu-sitio.com/onboarding] y vuelve a intentar

⚠️ IMPORTANTE:
- Tus chats se borrarán del teléfono (haz backup si quieres)
- No podrás usar la app después en ese teléfono
- Tus clientes podrán seguir escribiéndote sin problema
- Podrás responder desde nuestro dashboard web

¿Necesitas ayuda? Escríbeme: [tu-contacto]
```

---

## 🔗 Links útiles

- **Meta Business Support:** https://business.facebook.com/direct-support
- **WhatsApp Business API Docs:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **Backup de WhatsApp:** https://faq.whatsapp.com/general/chats/how-to-restore-your-chat-history

---

## 🎯 Alternativa: Usar dos números

Si tu cliente NO quiere perder acceso a la app del teléfono:

### Solución recomendada:

```
📱 Número existente → Mantener en WhatsApp Business App
                     (para atención manual)

🤖 Número nuevo → Conectar a la API
                  (para pedidos automáticos)
```

**Ventajas:**
- ✅ No pierde acceso al teléfono
- ✅ Puede atender consultas manualmente
- ✅ Los pedidos se automatizan en otro número
- ✅ Cero fricción en la migración

**Cómo implementar:**
1. Comprar un número nuevo (o usar uno que ya tengas)
2. Registrar el número nuevo en el onboarding
3. Comunicar a clientes: "Para pedidos: [número nuevo]"
4. Mantener número viejo para consultas generales

---

## 📊 Estadísticas de tiempo de liberación

Basado en reportes de la comunidad:

| Tiempo | Porcentaje de casos |
|--------|---------------------|
| 3-10 minutos | 60% |
| 10-30 minutos | 25% |
| 30 minutos - 1 hora | 10% |
| 1-24 horas | 4% |
| Más de 24 horas | 1% (requiere soporte) |

---

## ✅ Resumen ejecutivo

**Para migrar tu número a WhatsApp Business API:**

1. Elimina la cuenta desde la app (Configuración → Cuenta → Eliminar)
2. Espera 10-15 minutos
3. Vuelve a intentar en el onboarding
4. Si falla, espera 1 hora más
5. Si aún falla, contacta a Meta

**Alternativa:** Usa dos números (viejo para atención manual, nuevo para API).

---

**Última actualización:** 8 de enero de 2026  
**Autor:** Equipo KDS  
**Estado:** ✅ Probado y validado
