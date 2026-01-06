# 🧪 Guía de Pruebas en WhatsApp - Mejoras v1.2.0

## 🎯 Objetivo
Validar que las mejoras del parser funcionan correctamente en el entorno real de WhatsApp.

---

## ⚙️ Preparación

### 1. Verificar que el servidor está corriendo
```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
node server/index.js
```

**Deberías ver:**
```
✅ Firebase: Usando Service Account desde archivo local
✅ Firebase Admin conectado
🚀 SERVIDOR BACKEND KDS + WHATSAPP
📡 Servidor corriendo en puerto: 3000
```

### 2. Exponer con ngrok
```bash
ngrok http 3000
```

**Copiar URL del webhook:**
```
Forwarding: https://xxxxx.ngrok-free.app -> http://localhost:3000
```

### 3. Configurar webhook en Twilio
- URL: `https://xxxxx.ngrok-free.app/webhook/whatsapp`
- Método: POST

---

## 🧪 Casos de Prueba

### ✅ PRUEBA 1: "botella de agua"
**Mensaje a enviar:**
```
botella de agua
```

**Resultado esperado:**
```
✅ Entendí tu pedido:

1. 1x Agua Mineral
   $150 c/u = $150

━━━━━━━━━━━━━━━━━━━━━━━━
💰 Total: $150

¿Está correcto tu pedido?
```

---

### ✅ PRUEBA 2: "una hamburguesa"
**Mensaje a enviar:**
```
una hamburguesa
```

**Resultado esperado:**
```
✅ Entendí tu pedido:

1. 1x Hamburguesa Completa
   $850 c/u = $850

━━━━━━━━━━━━━━━━━━━━━━━━
💰 Total: $850

¿Está correcto tu pedido?
```

---

### ✅ PRUEBA 3: Caso completo - El que reportaste
**Mensaje a enviar:**
```
Quiero 1 taco al pastor con 1 botella de agua y 1 brownie
```

**Resultado esperado:**
```
✅ Entendí tu pedido:

1. 1x Tacos al Pastor
   $750 c/u = $750

2. 1x Agua Mineral
   $150 c/u = $150

3. 1x Brownie con Helado
   $450 c/u = $450

━━━━━━━━━━━━━━━━━━━━━━━━
💰 Total: $1350

¿Está correcto tu pedido?
```

**⚠️ ANTES decía:** "No encontré: botella de agua"  
**✅ AHORA reconoce:** Todos los items correctamente

---

### ✅ PRUEBA 4: Variaciones de "agua"
**Mensajes a probar:**
```
1. aguita
2. botellita de agua
3. 2 botellas de agua
4. botella agua
```

**Resultado esperado:** Todos deben reconocer "Agua Mineral"

---

### ✅ PRUEBA 5: "una" con diferentes productos
**Mensajes a probar:**
```
1. una pizza
2. un flan
3. una cerveza
4. una milanesa
```

**Resultado esperado:** Todos deben interpretar cantidad = 1

---

### ✅ PRUEBA 6: Combinaciones complejas
**Mensaje a enviar:**
```
Dame una hamburguesa con dos cervezas y una botella de agua
```

**Resultado esperado:**
```
✅ Entendí tu pedido:

1. 1x Hamburguesa Completa
   $850 c/u = $850

2. 2x Cerveza
   $400 c/u = $800

3. 1x Agua Mineral
   $150 c/u = $150

━━━━━━━━━━━━━━━━━━━━━━━━
💰 Total: $1800
```

---

### ✅ PRUEBA 7: Números en texto con "agua"
**Mensaje a enviar:**
```
dos botellas de agua y una hamburguesa
```

**Resultado esperado:**
```
✅ Entendí tu pedido:

1. 2x Agua Mineral
   $150 c/u = $300

2. 1x Hamburguesa Completa
   $850 c/u = $850

━━━━━━━━━━━━━━━━━━━━━━━━
💰 Total: $1150
```

---

## 📋 Checklist de Validación

Marca cada prueba al completarla:

- [ ] PRUEBA 1: "botella de agua" ✅ reconocida
- [ ] PRUEBA 2: "una hamburguesa" ✅ cantidad = 1
- [ ] PRUEBA 3: Caso completo (taco + agua + brownie) ✅ sin errores
- [ ] PRUEBA 4: Variaciones de agua (aguita, botellita, etc.) ✅ reconocidas
- [ ] PRUEBA 5: "una" con diferentes productos ✅ cantidad = 1
- [ ] PRUEBA 6: Combinación compleja ✅ todo reconocido
- [ ] PRUEBA 7: Números en texto + agua ✅ correcto

---

## 🔍 Verificación en KDS

Después de confirmar un pedido, verificar en:
```
http://localhost:3000/kds.html
```

**Debe aparecer:**
- ✅ Pedido con ID único (formato hex corto)
- ✅ Items correctos con cantidades
- ✅ Total correcto
- ✅ Timestamp sin "NaN min"
- ✅ Estado "Pendiente"

---

## 🐛 Si algo falla

### 1. Verificar logs del servidor
En la terminal donde corre `node server/index.js`, buscar:
```
❌ Error al parsear
⚠️ Advertencia
```

### 2. Verificar respuesta del bot
Si el bot responde con "No encontré...", anotar:
- Qué mensaje enviaste
- Qué item no encontró
- Respuesta completa del bot

### 3. Ejecutar tests locales
```bash
node test-parser.js
```
Todos deben pasar (13/13)

---

## 📊 Métricas de Éxito

### Antes de las mejoras:
- ❌ "botella de agua" → No reconocida
- ❌ "una hamburguesa" → Cantidad incorrecta
- ⚠️ Tasa de error en frases naturales: ~30%

### Después de las mejoras:
- ✅ "botella de agua" → Reconocida como "Agua Mineral"
- ✅ "una hamburguesa" → Cantidad = 1 correcta
- ✅ Tasa de error esperada: <5%
- ✅ Tests: 100% (13/13)

---

## 📝 Registro de Pruebas

**Fecha:** _______________  
**Hora:** _______________  
**Probado por:** _______________

| # | Prueba | Resultado | Notas |
|---|--------|-----------|-------|
| 1 | botella de agua | ⬜ ✅ ❌ | |
| 2 | una hamburguesa | ⬜ ✅ ❌ | |
| 3 | Caso completo | ⬜ ✅ ❌ | |
| 4 | Variaciones agua | ⬜ ✅ ❌ | |
| 5 | "una" + productos | ⬜ ✅ ❌ | |
| 6 | Combinación compleja | ⬜ ✅ ❌ | |
| 7 | Números en texto | ⬜ ✅ ❌ | |

**Resultado final:** ⬜ Todas pasaron ⬜ Algunas fallaron

**Comentarios:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## ✅ Aprobación Final

Si **todas las pruebas pasan**, el sistema está listo para:
- ✅ Producción
- ✅ Uso real con clientes
- ✅ Despliegue en servidor permanente

---

## 🚀 Siguientes Pasos

1. ✅ Pruebas completadas y aprobadas
2. 📤 Deploy a servidor de producción (Railway, etc.)
3. 🔧 Configurar webhook permanente
4. 📱 Activar WhatsApp Business API (si aplica)
5. 📊 Monitorear métricas reales de uso

---

**¡Buena suerte con las pruebas!** 🎉
