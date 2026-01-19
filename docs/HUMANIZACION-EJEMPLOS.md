# 💡 Ejemplos de Uso - Sistema de Humanización

Este documento contiene ejemplos prácticos de cómo usar el sistema de humanización en diferentes escenarios.

---

## 📨 Ejemplo 1: Uso Automático (Recomendado)

La humanización está **activada por defecto** en todas las respuestas del bot.

```javascript
// En server/index.js - Callback del bot
eventHandlers.onMessage('*', async (message) => {
  const response = await botLogic.processMessage(tenantId, from, text);
  
  if (response) {
    // La humanización se aplica automáticamente
    const result = await baileys.sendMessage(tenantId, from, { text: response });
    
    // result.humanized === true
    // result.stats contiene los tiempos
  }
});
```

**Comportamiento:**
```
Cliente envía: "hola"
  ⏳ 2.3s → Bot marca como leído
  ⏳ 1.5s → Bot muestra "escribiendo..."
  ⏳ 4.5s → Bot envía respuesta
Total: ~8 segundos
```

---

## 🎯 Ejemplo 2: Control Manual de Humanización

Puedes controlar la humanización al enviar cada mensaje:

```javascript
// Con humanización (default)
await baileys.sendMessage(tenantId, phoneNumber, 
  { text: 'Respuesta normal' },
  { 
    messageKey: receivedMessageKey,  // Para marcar como leído
    humanize: true                   // Activar humanización
  }
);

// Sin humanización (urgente)
await baileys.sendMessage(tenantId, phoneNumber, 
  { text: '🚨 Alerta urgente!' },
  { 
    humanize: false  // Desactivar humanización
  }
);
```

---

## 📊 Ejemplo 3: Obtener Estadísticas de Humanización

```javascript
const result = await baileys.sendMessage(tenantId, phoneNumber, 
  { text: 'Hola, ¿cómo estás?' }
);

if (result.humanized) {
  console.log('📊 Estadísticas de humanización:');
  console.log(`   Delay de lectura: ${result.stats.readDelay}ms`);
  console.log(`   Delay de pensamiento: ${result.stats.thinkingDelay}ms`);
  console.log(`   Duración de escritura: ${result.stats.typingDuration}ms`);
  console.log(`   Tiempo total: ${result.stats.totalTime}ms`);
}

// Ejemplo de output:
// 📊 Estadísticas de humanización:
//    Delay de lectura: 2341ms
//    Delay de pensamiento: 1567ms
//    Duración de escritura: 4523ms
//    Tiempo total: 8431ms
```

---

## 🔧 Ejemplo 4: Ajustar Configuración Dinámicamente

```javascript
const humanization = require('./server/baileys/humanization');

// Ver configuración actual
console.log(humanization.getConfig());

// Hacer el bot más rápido temporalmente
humanization.updateConfig({
  readDelay: {
    min: 500,
    max: 1500
  },
  typingSpeed: {
    min: 80,
    max: 120
  }
});

// Enviar mensajes con nueva configuración
await baileys.sendMessage(tenantId, phoneNumber, { text: 'Respuesta rápida' });

// Restaurar configuración normal
humanization.updateConfig({
  readDelay: {
    min: 800,
    max: 5000
  },
  typingSpeed: {
    min: 40,
    max: 80
  }
});
```

---

## 🌙 Ejemplo 5: Horarios (Simulación de Fatiga)

Puedes ajustar la velocidad según la hora del día:

```javascript
const humanization = require('./server/baileys/humanization');

function adjustSpeedByTime() {
  const hour = new Date().getHours();
  
  if (hour >= 23 || hour <= 6) {
    // Horario nocturno - más lento (persona cansada)
    humanization.updateConfig({
      readDelay: { min: 3000, max: 8000 },
      thinkingDelay: { min: 2000, max: 5000 },
      typingSpeed: { min: 25, max: 45 }
    });
    console.log('🌙 Modo nocturno: respuestas más lentas');
  } else if (hour >= 9 && hour <= 17) {
    // Horario laboral - velocidad normal
    humanization.updateConfig({
      readDelay: { min: 800, max: 5000 },
      thinkingDelay: { min: 500, max: 2500 },
      typingSpeed: { min: 40, max: 80 }
    });
    console.log('☀️ Modo diurno: velocidad normal');
  } else {
    // Mañana temprano/noche - velocidad media
    humanization.updateConfig({
      readDelay: { min: 1500, max: 6000 },
      thinkingDelay: { min: 1000, max: 3000 },
      typingSpeed: { min: 30, max: 60 }
    });
    console.log('🌅 Modo crepúsculo: velocidad media');
  }
}

// Ejecutar cada hora
setInterval(adjustSpeedByTime, 3600000);
adjustSpeedByTime(); // Ejecutar inmediatamente
```

---

## 🎨 Ejemplo 6: Personalidades Diferentes por Tenant

```javascript
// En server/index.js o donde inicialices tenants
async function configureTenantPersonality(tenantId, personality) {
  const humanization = require('./server/baileys/humanization');
  
  const personalities = {
    fast: {
      readDelay: { min: 500, max: 1500 },
      thinkingDelay: { min: 200, max: 800 },
      typingSpeed: { min: 80, max: 120 }
    },
    normal: {
      readDelay: { min: 800, max: 5000 },
      thinkingDelay: { min: 500, max: 2500 },
      typingSpeed: { min: 40, max: 80 }
    },
    slow: {
      readDelay: { min: 2000, max: 8000 },
      thinkingDelay: { min: 1000, max: 4000 },
      typingSpeed: { min: 25, max: 50 }
    },
    professional: {
      readDelay: { min: 1000, max: 3000 },
      thinkingDelay: { min: 800, max: 2000 },
      typingSpeed: { min: 60, max: 90 }
    },
    casual: {
      readDelay: { min: 500, max: 6000 },
      thinkingDelay: { min: 300, max: 3000 },
      typingSpeed: { min: 30, max: 100 }
    }
  };
  
  if (personalities[personality]) {
    humanization.updateConfig(personalities[personality]);
    console.log(`🎭 Personalidad "${personality}" configurada para ${tenantId}`);
  }
}

// Uso:
await configureTenantPersonality('restaurant-abc', 'professional');
await configureTenantPersonality('restaurant-xyz', 'casual');
```

---

## 🚨 Ejemplo 7: Desactivar Humanización para Mensajes Específicos

```javascript
// Mensajes que NO deben humanizarse
const urgentMessages = [
  'Confirmación de pago',
  'Código de verificación',
  'Alerta de seguridad'
];

async function sendMessage(tenantId, to, text) {
  const isUrgent = urgentMessages.some(msg => text.includes(msg));
  
  await baileys.sendMessage(tenantId, to, { text }, {
    humanize: !isUrgent  // Humanizar solo si NO es urgente
  });
}

// Ejemplo:
await sendMessage(tenant, phone, 'Tu pedido está listo'); // Humanizado
await sendMessage(tenant, phone, 'Código de verificación: 1234'); // Sin humanizar
```

---

## 📈 Ejemplo 8: Análisis de Contexto (Avanzado)

```javascript
const humanization = require('./server/baileys/humanization');

async function sendContextualResponse(tenantId, to, text, context) {
  // Ajustar velocidad según complejidad de la respuesta
  const complexity = calculateComplexity(text);
  
  if (complexity === 'simple') {
    // Respuesta simple = más rápido
    humanization.updateConfig({
      thinkingDelay: { min: 300, max: 1000 },
      typingSpeed: { min: 70, max: 100 }
    });
  } else if (complexity === 'complex') {
    // Respuesta compleja = más lento (pensando)
    humanization.updateConfig({
      thinkingDelay: { min: 2000, max: 4000 },
      typingSpeed: { min: 30, max: 50 }
    });
  }
  
  const result = await baileys.sendMessage(tenantId, to, { text });
  
  // Restaurar configuración normal
  humanization.updateConfig({
    thinkingDelay: { min: 500, max: 2500 },
    typingSpeed: { min: 40, max: 80 }
  });
  
  return result;
}

function calculateComplexity(text) {
  if (text.length < 50 && !text.includes('\n')) return 'simple';
  if (text.length > 200 || text.includes('*') || text.includes('\n\n')) return 'complex';
  return 'normal';
}

// Uso:
await sendContextualResponse(tenant, phone, 'Hola!', {}); // Rápido
await sendContextualResponse(tenant, phone, menuLargo, {}); // Lento
```

---

## 🧪 Ejemplo 9: Testing y Debug

```javascript
// Modo debug para desarrollo
const humanization = require('./server/baileys/humanization');

// Desactivar humanización durante tests
if (process.env.NODE_ENV === 'test') {
  humanization.updateConfig({
    readDelay: { min: 0, max: 0 },
    thinkingDelay: { min: 0, max: 0 },
    typingSpeed: { min: 1000, max: 1000 }, // Muy rápido
    enabled: false
  });
}

// O usar variable de entorno
// HUMANIZATION_ENABLED=false npm test
```

---

## 🔍 Ejemplo 10: Logging Detallado

```javascript
const humanization = require('./server/baileys/humanization');
const pino = require('pino');
const logger = pino({ level: 'debug' });

async function sendMessageWithLogging(tenantId, to, text) {
  logger.info('📤 Preparando envío de mensaje');
  logger.debug(`   Tenant: ${tenantId}`);
  logger.debug(`   Destino: ${to}`);
  logger.debug(`   Longitud: ${text.length} caracteres`);
  
  const startTime = Date.now();
  
  const result = await baileys.sendMessage(tenantId, to, { text });
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  if (result.humanized) {
    logger.info('✅ Mensaje enviado con humanización');
    logger.debug(`   Read delay: ${result.stats.readDelay}ms`);
    logger.debug(`   Think delay: ${result.stats.thinkingDelay}ms`);
    logger.debug(`   Type duration: ${result.stats.typingDuration}ms`);
    logger.debug(`   Total humanización: ${result.stats.totalTime}ms`);
    logger.debug(`   Total real: ${totalTime}ms`);
  } else {
    logger.info('⚡ Mensaje enviado sin humanización');
    logger.debug(`   Total: ${totalTime}ms`);
  }
  
  return result;
}
```

---

## 🎮 Ejemplo 11: Simulación de Multitasking

```javascript
// Simular que el "humano" está atendiendo múltiples conversaciones
const activeConversations = new Map();

async function sendWithMultitasking(tenantId, to, text) {
  const conversationCount = activeConversations.size;
  const humanization = require('./server/baileys/humanization');
  
  // Si hay muchas conversaciones activas, responder más lento
  if (conversationCount > 5) {
    humanization.updateConfig({
      readDelay: { min: 3000, max: 10000 },
      thinkingDelay: { min: 2000, max: 5000 }
    });
    console.log(`😰 Multitasking: ${conversationCount} conversaciones activas - respuesta lenta`);
  } else {
    // Restaurar velocidad normal
    humanization.updateConfig({
      readDelay: { min: 800, max: 5000 },
      thinkingDelay: { min: 500, max: 2500 }
    });
  }
  
  // Registrar conversación activa
  activeConversations.set(to, Date.now());
  
  const result = await baileys.sendMessage(tenantId, to, { text });
  
  // Limpiar conversaciones inactivas (>5 min)
  setTimeout(() => {
    activeConversations.delete(to);
  }, 300000);
  
  return result;
}
```

---

## 🌐 Ejemplo 12: Variables de Entorno (Configuración Externa)

```bash
# En tu .env
HUMANIZATION_ENABLED=true
HUMANIZATION_READ_DELAY_MIN=800
HUMANIZATION_READ_DELAY_MAX=5000
HUMANIZATION_THINKING_DELAY_MIN=500
HUMANIZATION_THINKING_DELAY_MAX=2500
HUMANIZATION_TYPING_SPEED_MIN=40
HUMANIZATION_TYPING_SPEED_MAX=80
HUMANIZATION_JITTER=0.3
```

```javascript
// El servicio las lee automáticamente al inicializar
// No necesitas código adicional, solo configurar el .env

// Para verificar configuración actual:
const humanization = require('./server/baileys/humanization');
console.log(humanization.getConfig());

// Output:
// {
//   readDelay: { min: 800, max: 5000 },
//   thinkingDelay: { min: 500, max: 2500 },
//   typingSpeed: { min: 40, max: 80 },
//   jitter: 0.3,
//   typingDuration: { min: 1000, max: 15000 },
//   enabled: true
// }
```

---

## 🎯 Mejores Prácticas

### ✅ DO (Hacer)

- ✅ Usar humanización para conversaciones con clientes
- ✅ Ajustar tiempos según contexto (día/noche, complejidad)
- ✅ Monitorear stats para optimizar configuración
- ✅ Desactivar para notificaciones urgentes/automáticas
- ✅ Probar diferentes personalidades por tenant

### ❌ DON'T (No hacer)

- ❌ Desactivar humanización para conversaciones normales
- ❌ Usar tiempos fijos (sin variabilidad)
- ❌ Hacer delays demasiado largos (>20s)
- ❌ Ignorar el contexto (urgente vs casual)
- ❌ Olvidar restaurar configuración después de cambios temporales

---

## 📚 Recursos Adicionales

- **Documentación Completa:** `docs/HUMANIZACION-IMPLEMENTADA.md`
- **Guía Rápida:** `docs/HUMANIZACION-GUIA-RAPIDA.md`
- **Script de Test:** `./test-humanizacion.sh`
- **Configuración:** `.env.humanization.example`

---

**¡Ahora tienes todas las herramientas para usar la humanización de forma efectiva! 🎉**
