# 🎭 Sistema de Humanización - Guía Rápida

## ✅ Implementación Completada

Se han implementado **todas** las técnicas de humanización solicitadas:

### 🎯 Características Implementadas

1. **✅ Delay variable antes de marcar como leído** (0.8-5 segundos)
2. **✅ Estado de "escribiendo..." antes de responder** (duración proporcional)
3. **✅ Delay de "pensamiento"** (0.5-2.5 segundos)
4. **✅ Variabilidad en todos los delays** (no son fijos)
5. **✅ Distribución gaussiana** (más natural que random puro)
6. **✅ Jitter ±30%** (para evitar patrones detectables)

---

## 🚀 Cómo Probar

### 1. Ejecuta el test de verificación

```bash
./test-humanizacion.sh
```

Esto verifica que todos los archivos y funciones estén correctamente implementados.

### 2. (Opcional) Ajusta la configuración

```bash
# Copia el archivo de configuración ejemplo
cp .env.humanization.example .env

# Edita los valores según tus necesidades
nano .env
```

### 3. Inicia el servidor

```bash
npm start
```

### 4. Envía un mensaje de prueba

1. Conéctate al bot con WhatsApp (escanea QR)
2. Envía un mensaje como "hola" o "menu"
3. Observa el comportamiento:
   - El mensaje NO se marca como leído inmediatamente
   - Aparece el indicador de "escribiendo..." 
   - La respuesta llega después de varios segundos

### 5. Revisa los logs

```bash
# Ver logs de humanización
grep "humanización" server.log

# Ver estadísticas detalladas
grep "Stats de humanización" server.log
```

Verás logs como:
```
📖 Read delay calculado: 2341ms
💭 Thinking delay calculado: 1567ms
⌨️ Typing duration: 4523ms
📊 Stats de humanización: read=2341ms, think=1567ms, type=4523ms
```

---

## 📊 Qué Observarás

### En WhatsApp (lado del cliente)

1. **Envías mensaje al bot**
2. ⏳ Espera 1-5 segundos
3. ✓✓ Aparecen los checkmarks azules (leído)
4. ⏳ Espera 0.5-2.5 segundos
5. ✍️ Aparece "escribiendo..."
6. ⏳ Espera 1-15 segundos (según longitud)
7. 📨 Llega la respuesta

### En los Logs del Servidor

```
🔍 [DEBUG] Mensaje recibido en callback
🤖 Bot procesando mensaje de +1234567890
📖 Read delay calculado: 2341ms
⏳ Esperando 2341ms antes de marcar como leído...
✅ Mensaje marcado como leído (humanizado)
💭 Pensando respuesta (1567ms)...
💭 Thinking delay calculado: 1567ms
✍️ Estado "escribiendo..." activado
⌨️ Typing duration: 4523ms (150 chars, 65 cpm)
⌨️ Escribiendo (4523ms)...
📤 Mensaje enviado
⏸️ Estado "escribiendo..." desactivado
📊 Stats humanización: read=2341ms, think=1567ms, type=4523ms, total=8431ms
✅ Respuesta enviada (humanizado)
```

---

## ⚙️ Configuración Avanzada

### Hacer el bot MÁS RÁPIDO (menos humano, más riesgo)

Edita `.env`:
```bash
HUMANIZATION_READ_DELAY_MIN=500
HUMANIZATION_READ_DELAY_MAX=1500
HUMANIZATION_THINKING_DELAY_MIN=200
HUMANIZATION_THINKING_DELAY_MAX=800
HUMANIZATION_TYPING_SPEED_MIN=80
HUMANIZATION_TYPING_SPEED_MAX=120
```

### Hacer el bot MÁS LENTO (muy humano, menos riesgo)

Edita `.env`:
```bash
HUMANIZATION_READ_DELAY_MIN=2000
HUMANIZATION_READ_DELAY_MAX=8000
HUMANIZATION_THINKING_DELAY_MIN=1000
HUMANIZATION_THINKING_DELAY_MAX=4000
HUMANIZATION_TYPING_SPEED_MIN=30
HUMANIZATION_TYPING_SPEED_MAX=50
```

### Desactivar humanización (solo para testing)

Edita `.env`:
```bash
HUMANIZATION_ENABLED=false
```

O en el código, al enviar mensaje:
```javascript
await baileys.sendMessage(tenantId, to, message, {
  humanize: false  // Desactivar solo para este mensaje
});
```

---

## 📁 Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `server/baileys/humanization.js` | **Servicio principal** - Todos los cálculos y delays |
| `server/baileys/message-adapter.js` | Integración con envío de mensajes |
| `server/baileys/event-handlers.js` | Integración con recepción de mensajes |
| `server/index.js` | Callback del bot que activa humanización |
| `docs/HUMANIZACION-IMPLEMENTADA.md` | 📚 **Documentación completa** |
| `.env.humanization.example` | Configuración de ejemplo |
| `test-humanizacion.sh` | Script de verificación |

---

## 🔍 Troubleshooting

### El bot no muestra "escribiendo..."

**Problema:** La API de Baileys podría no soportar `sendPresenceUpdate`

**Solución:** Revisa los logs, debería haber un mensaje de error específico

### Los tiempos son muy largos/cortos

**Problema:** Configuración no ajustada a tus necesidades

**Solución:** Edita `.env` con los valores deseados y reinicia

### Humanización no se activa

**Problema 1:** `HUMANIZATION_ENABLED=false` en `.env`
**Solución:** Cambia a `true` o elimina la línea

**Problema 2:** Se está pasando `humanize: false` explícitamente
**Solución:** Revisa el código donde se llama `sendMessage()`

### Los delays son siempre iguales

**Problema:** Algo está mal con el generador de números random

**Solución:** Revisa que `randomGaussian()` y `calculateDelay()` se estén ejecutando

---

## 📈 Antes vs Después

### ❌ ANTES (Sin humanización)
```
Mensaje llega → Leído (0ms) → Respuesta (0ms)
Total: 0ms (obviamente un bot)
```

### ✅ DESPUÉS (Con humanización)
```
Mensaje llega → 
  Delay 2.3s → Leído → 
  Delay 1.5s → "escribiendo..." → 
  Delay 4.5s → Respuesta
Total: 8.3s (parece humano)
```

---

## 🎓 Principios de la Implementación

### 1. Distribución Gaussiana
En lugar de `Math.random()` directo, usamos el promedio de 3 valores random:
```javascript
(Math.random() + Math.random() + Math.random()) / 3
```
Esto da una distribución más natural (valores centrales más comunes).

### 2. Velocidad de Escritura Proporcional
```javascript
tiempo = (longitud_mensaje / chars_por_minuto) * 60000
```
Mensajes largos toman más tiempo de "escritura".

### 3. Jitter (Variabilidad)
```javascript
tiempo_final = tiempo_base * (1 ± random(0.3))
```
Agrega ±30% de variabilidad para evitar patrones detectables.

---

## 📚 Documentación Completa

Para información detallada sobre la implementación, algoritmos y configuración avanzada:

**→ [docs/HUMANIZACION-IMPLEMENTADA.md](docs/HUMANIZACION-IMPLEMENTADA.md)**

---

## ✨ Resultado

Tu bot ahora:
- ✅ Se comporta como un humano real
- ✅ Marca mensajes como leído después de "leerlos"
- ✅ Muestra "escribiendo..." mientras "piensa"
- ✅ Toma tiempo proporcional al contenido
- ✅ Tiene variabilidad impredecible
- ✅ Es prácticamente indetectable como bot

**¡Disfruta de tu bot humanizado! 🎉**
