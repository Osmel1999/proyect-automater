# 🎭 Técnicas de Humanización Implementadas

**Fecha de implementación:** 19 de enero de 2026  
**Versión:** 1.0

---

## 📋 Resumen Ejecutivo

Se han implementado técnicas avanzadas de humanización para evitar la detección del bot por parte de WhatsApp. El sistema ahora simula comportamiento humano real en las conversaciones.

---

## ✅ Técnicas Implementadas

### 1. **Delay Variable Antes de Marcar Como Leído** ✓

**¿Qué hace?**
- Simula el tiempo que tarda un humano en leer un mensaje antes de marcarlo como leído
- Usa delays variables con distribución gaussiana (más natural)

**Configuración:**
```javascript
readDelay: {
  min: 800,    // 0.8 segundos
  max: 5000    // 5 segundos
}
```

**Cómo funciona:**
- Cuando llega un mensaje, el bot espera entre 0.8 y 5 segundos
- Usa distribución gaussiana (promedio de 3 valores random) para mayor naturalidad
- Luego marca el mensaje como leído

**Archivo:** `server/baileys/humanization.js` → `calculateReadDelay()`

---

### 2. **Estado de "Escribiendo..." Antes de Responder** ✓

**¿Qué hace?**
- Muestra el indicador de "escribiendo..." en WhatsApp antes de enviar la respuesta
- La duración es proporcional a la longitud del mensaje

**Configuración:**
```javascript
typingSpeed: {
  min: 40,     // Caracteres por minuto (lento, pensando)
  max: 80      // Caracteres por minuto (rápido)
}
typingDuration: {
  min: 1000,   // 1 segundo mínimo
  max: 15000   // 15 segundos máximo
}
```

**Cómo funciona:**
1. Calcula velocidad de escritura aleatoria (40-80 cpm)
2. Calcula tiempo basado en longitud del mensaje: `(length / cpm) * 60000`
3. Agrega variabilidad (jitter) de ±30%
4. Envía estado `composing` a WhatsApp
5. Espera el tiempo calculado
6. Envía el mensaje
7. Envía estado `paused` para dejar de "escribir"

**Archivo:** `server/baileys/humanization.js` → `calculateTypingDuration()`

---

### 3. **Delay de "Pensamiento" Antes de Escribir** ✓

**¿Qué hace?**
- Simula el tiempo que tarda un humano en pensar la respuesta antes de empezar a escribir

**Configuración:**
```javascript
thinkingDelay: {
  min: 500,    // 0.5 segundos
  max: 2500    // 2.5 segundos
}
```

**Cómo funciona:**
- Después de marcar como leído
- Antes de mostrar "escribiendo..."
- Espera entre 0.5 y 2.5 segundos (aleatorio)

**Archivo:** `server/baileys/humanization.js` → `calculateThinkingDelay()`

---

### 4. **Variabilidad en Todos los Delays (No Fijos)** ✓

**¿Qué hace?**
- Ningún delay es fijo, todos tienen rangos variables
- Usa distribución gaussiana para mayor naturalidad
- Agrega "jitter" (±30%) para más variabilidad

**Configuración:**
```javascript
jitter: 0.30  // ±30% del valor calculado
```

**Cómo funciona:**
- Cada delay se calcula como: `baseValue + (baseValue * random(-0.3, +0.3))`
- La distribución gaussiana hace que los valores centrales sean más comunes
- Nunca dos respuestas tienen exactamente los mismos tiempos

**Archivo:** `server/baileys/humanization.js` → `randomGaussian()`

---

## 🔄 Flujo Completo de Humanización

```
📨 MENSAJE LLEGA
    ↓
⏳ Delay 0.8-5s (aleatorio con distribución gaussiana)
    ↓
✅ MARCAR COMO LEÍDO
    ↓
💭 Delay 0.5-2.5s (pensamiento)
    ↓
✍️ ACTIVAR ESTADO "escribiendo..."
    ↓
⏳ Delay proporcional a longitud del mensaje
    (calculado con velocidad aleatoria 40-80 cpm + jitter ±30%)
    ↓
📤 ENVIAR MENSAJE
    ↓
⏸️ DESACTIVAR ESTADO "escribiendo..."
```

---

## 🎯 Integración en el Sistema

### **Archivos Modificados:**

1. **`server/baileys/humanization.js`** (NUEVO)
   - Servicio principal de humanización
   - Todos los cálculos de delays
   - Flujo completo de respuesta humanizada

2. **`server/baileys/message-adapter.js`**
   - Método `sendMessage()` actualizado para usar humanización
   - Método `markAsRead()` actualizado con delay humanizado
   - Parámetro `humanize` para controlar comportamiento

3. **`server/baileys/event-handlers.js`**
   - Actualizado para usar `markAsRead()` con humanización
   - Ya no marca como leído dos veces

4. **`server/baileys/index.js`**
   - Método `sendMessage()` acepta opciones (incluido `messageKey`)
   - Pasa opciones al message-adapter

5. **`server/index.js`**
   - Callback global actualizado para pasar `messageKey`
   - Activa humanización explícitamente
   - Logs de stats de humanización

---

## 🎮 Cómo Usar

### **Automático (Recomendado)**

La humanización está activada por defecto en todas las respuestas del bot:

```javascript
// Se activa automáticamente al enviar cualquier mensaje
const result = await baileys.sendMessage(tenantId, phoneNumber, { 
  text: 'Hola, ¿en qué puedo ayudarte?' 
});
```

### **Con Opciones Avanzadas**

```javascript
// Con control manual
const result = await baileys.sendMessage(tenantId, phoneNumber, { 
  text: 'Respuesta rápida' 
}, {
  messageKey: receivedMessageKey,  // Para marcar como leído
  humanize: true                   // Activar humanización (default: true)
});
```

### **Desactivar Humanización** (solo para casos especiales)

```javascript
// Sin humanización (urgente, notificaciones automáticas, etc.)
const result = await baileys.sendMessage(tenantId, phoneNumber, { 
  text: 'Notificación urgente' 
}, {
  humanize: false  // Desactivar humanización
});
```

---

## 📊 Estadísticas

Cada respuesta humanizada retorna estadísticas:

```javascript
{
  success: true,
  messageId: "3EB0xxx...",
  humanized: true,
  stats: {
    readDelay: 2341,        // ms esperados antes de marcar leído
    thinkingDelay: 1567,    // ms de "pensamiento"
    typingDuration: 4523,   // ms mostrando "escribiendo..."
    totalTime: 8431         // ms totales del flujo completo
  }
}
```

Estas stats aparecen en los logs del servidor:

```
📊 Stats humanización: read=2341ms, think=1567ms, type=4523ms
```

---

## ⚙️ Configuración Avanzada

Puedes ajustar los tiempos editando `server/baileys/humanization.js`:

```javascript
// Ejemplo: hacer el bot más lento (más "humano")
humanizationService.updateConfig({
  readDelay: {
    min: 2000,   // 2 segundos mínimo
    max: 8000    // 8 segundos máximo
  },
  typingSpeed: {
    min: 30,     // Más lento
    max: 60
  }
});
```

---

## 🚨 Comparación: ANTES vs DESPUÉS

### **ANTES (Sin Humanización)**
```
🔴 Comportamiento detectably no-humano:

📨 Mensaje llega → ✅ Leído (0ms) → 📤 Respuesta (0ms)

• Marca como leído instantáneamente
• Responde sin delay
• No muestra "escribiendo..."
• Siempre mismos tiempos
```

### **DESPUÉS (Con Humanización)**
```
🟢 Comportamiento humano natural:

📨 Mensaje llega → ⏳ 2.3s → ✅ Leído → ⏳ 1.5s → 
✍️ "escribiendo..." → ⏳ 4.5s → 📤 Respuesta

• Delays variables y naturales
• Muestra indicadores de presencia
• Tiempos proporcionales al contenido
• Nunca dos respuestas iguales
```

---

## 🛡️ Protección Anti-Ban

La humanización se combina con las protecciones anti-ban existentes:

✅ **Rate limiting** (límites por minuto/hora/día)  
✅ **Delays aleatorios entre mensajes** (2-5s base)  
✅ **Detección de patrones de spam**  
✅ **Cooldown automático**  
✅ **Estado de "escribiendo..." con duración variable** (NUEVO)  
✅ **Delay antes de marcar como leído** (NUEVO)  
✅ **Variabilidad gaussiana en todos los tiempos** (NUEVO)  

---

## 🧪 Testing

Para probar la humanización:

1. Envía un mensaje al bot
2. Observa en logs del servidor:
   - `📖 Read delay calculado: XXXXms`
   - `💭 Thinking delay calculado: XXXXms`
   - `⌨️ Typing duration: XXXXms`
   - `📊 Stats de humanización: ...`
3. En WhatsApp verás:
   - Delay antes del "✓✓" azul (leído)
   - Indicador "escribiendo..." por varios segundos
   - Mensaje aparece después

---

## 📝 Notas Importantes

### **Cuándo NO usar humanización:**
- Notificaciones críticas/urgentes
- Webhooks automáticos
- Respuestas del sistema (no conversacionales)
- Confirmaciones de pago inmediatas

### **Cuándo SÍ usar humanización:**
- ✅ Conversaciones con clientes
- ✅ Respuestas del bot de pedidos
- ✅ Mensajes de soporte
- ✅ Cualquier interacción que simule ser humana

### **Rendimiento:**
- Los delays son **asíncronos** (no bloquean el servidor)
- Múltiples conversaciones se manejan en paralelo
- No afecta la capacidad del servidor

---

## 🎓 Fundamento Técnico

### **Distribución Gaussiana**
En lugar de usar `Math.random()` directo, usamos el promedio de 3 valores random:

```javascript
const u1 = Math.random();
const u2 = Math.random();
const u3 = Math.random();
const avg = (u1 + u2 + u3) / 3;
```

Esto produce una distribución más natural donde:
- Valores centrales son más comunes
- Valores extremos son raros
- Simula mejor el comportamiento humano real

### **Velocidad de Escritura**
Humanos escriben entre 40-80 caracteres por minuto cuando piensan:
- 40 cpm = pensando mucho, escribiendo lento
- 80 cpm = escribiendo rápido, respuesta preparada

### **Jitter (Variabilidad)**
Agregar ±30% de variabilidad evita patrones detectables:
- Mismo mensaje nunca toma exactamente el mismo tiempo
- Variación suficiente para parecer natural
- No tan extrema como para ser sospechosa

---

## 🔧 Mantenimiento

### **Ver logs de humanización:**
```bash
# En desarrollo
npm start

# Buscar logs específicos
grep "humanización" server.log
grep "Stats de humanización" server.log
```

### **Ajustar tiempos:**
Editar `server/baileys/humanization.js` líneas 12-40

### **Desactivar globalmente (no recomendado):**
En `server/index.js` línea 652, cambiar:
```javascript
humanize: false  // Desactivar para todos los mensajes
```

---

## 📈 Métricas de Éxito

**Objetivos logrados:**
- ✅ Delay variable antes de marcar como leído
- ✅ Estado "escribiendo..." proporcional
- ✅ Variabilidad en todos los tiempos
- ✅ Distribución gaussiana natural
- ✅ Integración transparente en el flujo existente
- ✅ Activación automática por defecto
- ✅ Opción de desactivar cuando sea necesario

**Resultado esperado:**
- 🎯 Reducción drástica en probabilidad de detección
- 🎯 Conversaciones que parecen 100% humanas
- 🎯 Sin impacto en rendimiento del servidor

---

## 🚀 Próximos Pasos (Futuras Mejoras)

1. **Análisis de contexto** - Delays más largos para preguntas complejas
2. **Horarios humanos** - Respuestas más lentas fuera de horario laboral
3. **Fatiga simulada** - Más lento después de muchos mensajes
4. **Personalización por tenant** - Diferentes "personalidades" de velocidad
5. **Machine Learning** - Aprender patrones de respuesta humanos reales

---

**Documento creado por:** Sistema de IA  
**Última actualización:** 19 de enero de 2026  
**Versión:** 1.0
