# 🔍 SIGUIENTE PRUEBA - Logging Detallado

**Fecha**: 14 de enero de 2026  
**Estado**: Esperando nuevo test con logging mejorado

---

## 🎯 Lo Que Hice

Agregué **logging super detallado** al endpoint `/api/whatsapp/callback-legacy` para ver:

1. ⏰ **Timestamp exacto** de cada llamada
2. 🔗 **URL completa** del request
3. 📋 **Todos los query parameters**
4. 🌐 **Headers** (user-agent, referer, etc.)
5. 🐛 **Detalles completos** del error (si ocurre)

---

## 🧪 Próxima Prueba

### **Paso 1: Espera 2 minutos** 
Railway está redeployando el backend con el nuevo código.

### **Paso 2: Abre la consola de logs**
```bash
railway logs --tail 100
```

Déjala abierta en una terminal.

### **Paso 3: Intenta el onboarding nuevamente**
```
https://kdsapp.site/onboarding-debug.html
```

O si prefieres:
```
https://kdsapp.site/onboarding-2.html
```

### **Paso 4: Observa los logs**

Ahora verás logs MUY DETALLADOS como:

```
🕐 [2026-01-14T17:30:00.000Z] CALLBACK LEGACY REQUEST
   Full URL: https://api.kdsapp.site/api/whatsapp/callback-legacy?code=...&mode=new
   Query params: { code: 'AQCkHU74...', mode: 'new' }
   Headers: {
     'user-agent': 'Meta-Graph-API/...',
     'referer': '...',
     'x-forwarded-for': '...'
   }
```

---

## 🔍 Lo Que Buscaremos

### **Escenario 1: Meta llama ANTES de cerrar el popup**
Si ves un log del callback **mientras el popup aún está abierto**, significa que:
- Meta está intentando validar inmediatamente
- Algo en su validación está fallando
- Por eso muestra "network error"

### **Escenario 2: Meta NO llama hasta que cierres el popup**
Si NO ves ningún log hasta que cierres el popup, significa que:
- Meta no está llamando al callback durante el flujo
- El error es interno de Meta (en su sistema)
- Tenemos que contactar soporte

### **Escenario 3: Meta llama DOS VECES**
Si ves dos llamadas:
1. Primera llamada → Falla
2. Segunda llamada → "código expirado"

Entonces hay un problema de timing o de configuración.

---

## 📊 Info Adicional que Necesito

Después de probar, comparte:

1. **Screenshot o copia** de TODOS los logs que aparezcan
2. **Timestamp** de cuando viste el error "network error" en el popup
3. **Cuánto tiempo pasó** entre abrir el popup y ver el error

---

## 💡 Teoría Actual

Creo que Meta está intentando **validar el callback URL** durante el flujo de Embedded Signup, y algo está fallando en esa validación. Posibles causas:

1. **Timeout**: Tu backend tarda demasiado en responder
2. **Headers incorrectos**: Meta espera ciertos headers en la respuesta
3. **SSL/TLS**: Algún problema de certificado
4. **Rate limiting**: Meta está bloqueando requests múltiples

Con los nuevos logs podremos identificar exactamente qué está pasando.

---

## ⏱️ Timing

**Espera 2-3 minutos** para que Railway termine de redesplegar, luego prueba.

---

**Listo para el siguiente test con super debugging activado!** 🔍
