# Plan de Migración a Baileys - Paso a Paso

> **Objetivo**: Migrar de Meta WhatsApp API a Baileys para resolver problemas de onboarding  
> **Duración Estimada**: 7-8 semanas  
> **Última Actualización**: 15 de enero de 2026

---

## 📋 Índice de Fases

1. [Fase 1: Instalación y Setup Básico](#fase-1-instalación-y-setup-básico) (Semana 1)
2. [Fase 2: Core de Mensajería](#fase-2-core-de-mensajería) (Semana 2)
3. [Fase 3: Interfaz de Usuario](#fase-3-interfaz-de-usuario) (Semana 3)
4. [Fase 4: Integración Completa](#fase-4-integración-completa) (Semana 4)
5. [Fase 5: Testing Exhaustivo](#fase-5-testing-exhaustivo) (Semana 5)
6. [Fase 6: Piloto con Clientes](#fase-6-piloto-con-clientes) (Semana 6-7)
7. [Fase 7: Migración Gradual](#fase-7-migración-gradual) (Semana 8+)

---

## Fase 1: Instalación y Setup Básico
**Duración**: 5 días  
**Objetivo**: Configurar Baileys y crear sistema de sesiones

### Día 1: Instalación de Dependencias
```bash
npm install @whiskeysockets/baileys
npm install qrcode
npm install pino
npm install qrcode-terminal
```

### Día 2-3: Crear Módulos Base
**Archivos a crear**:
- `server/baileys/session-manager.js` - Manejo de sesiones Baileys
- `server/baileys/auth-handler.js` - Autenticación y QR
- `server/baileys/storage.js` - Persistencia de sesiones en Firebase

**Funcionalidad**:
- Inicializar socket de Baileys
- Generar código QR
- Guardar/recuperar credenciales
- Manejar reconexiones

### Día 4-5: Pruebas Básicas
- Conectar un número de prueba con QR
- Verificar que la sesión persista después de reiniciar
- Probar desconexión/reconexión
- Validar almacenamiento en Firebase

**Criterio de Éxito**: ✅ Conectar y mantener conexión después de reinicio

---

## Fase 2: Core de Mensajería
**Duración**: 5 días  
**Objetivo**: Implementar envío/recepción de mensajes

### Día 1-2: Adaptador de Mensajes
**Archivo**: `server/baileys/message-adapter.js`

**Funciones**:
```javascript
// Convertir mensaje entrante de Baileys a formato interno
baileysToInternal(baileysMessage)

// Convertir mensaje interno a formato Baileys
internalToBaileys(internalMessage)

// Enviar mensaje
sendMessage(tenantId, to, message)

// Enviar imagen
sendImage(tenantId, to, imageUrl, caption)
```

### Día 3: Handlers de Eventos
**Archivo**: `server/baileys/event-handlers.js`

**Eventos a manejar**:
- `connection.update` - Estado de conexión
- `messages.upsert` - Mensajes recibidos
- `creds.update` - Actualización de credenciales
- `messages.update` - Estado de envío (entregado, leído)

### Día 4-5: Sistema Anti-Ban
**Archivo**: `server/baileys/anti-ban.js`

**Implementar**:
- Delay aleatorio entre mensajes (2-5 segundos)
- Límite diario por tenant (1000 mensajes)
- Queue de mensajes con rate limiting
- Detección de patrones sospechosos

**Criterio de Éxito**: ✅ Enviar/recibir mensajes con delays automáticos

---

## Fase 3: Interfaz de Usuario
**Duración**: 5 días  
**Objetivo**: UI para escanear QR y gestionar conexión

### Día 1-2: Página de Onboarding
**Archivo**: `onboarding-baileys.html`

**Componentes**:
```html
1. Botón "Conectar WhatsApp con QR"
2. Contenedor para mostrar QR Code
3. Instrucciones paso a paso
4. Indicador de estado (esperando/conectando/conectado)
5. Timer de expiración (60 segundos)
```

### Día 3: Actualizar Dashboard
**Archivo**: `dashboard.html`

**Agregar**:
- Badge de estado de conexión (🟢 Conectado / 🔴 Desconectado)
- Botón "Reconectar" si está desconectado
- Última vez conectado
- Contador de mensajes del día

### Día 4-5: Endpoints de API
**Archivo**: `server/index.js`

**Rutas nuevas**:
```javascript
GET  /api/baileys/qr/:tenantId          // Generar QR
GET  /api/baileys/status/:tenantId      // Estado de conexión
POST /api/baileys/disconnect/:tenantId  // Desconectar
POST /api/baileys/reconnect/:tenantId   // Reconectar
```

**Criterio de Éxito**: ✅ Escanear QR y ver conexión activa en dashboard

---

## Fase 4: Integración Completa
**Duración**: 5 días  
**Objetivo**: Integrar Baileys con sistema actual

### Día 1-2: Actualizar Estructura de Datos
**Firestore**: `tenants/{tenantId}/whatsapp`
```javascript
{
  provider: "baileys" | "meta",  // Tipo de provider
  baileys: {
    connected: boolean,
    phoneNumber: string,
    lastSeen: timestamp,
    messageCount: number,
    dailyLimit: number,
    sessionData: object  // Credenciales encriptadas
  },
  meta: {
    // Mantener datos existentes
  }
}
```

### Día 3: Modificar WhatsApp Handler
**Archivo**: `server/whatsapp-handler.js`

**Lógica de enrutamiento**:
```javascript
async function sendWhatsAppMessage(tenantId, to, message) {
  const tenant = await getTenant(tenantId);
  
  if (tenant.whatsapp.provider === 'baileys') {
    return baileysAdapter.sendMessage(tenantId, to, message);
  } else {
    return metaAdapter.sendMessage(tenantId, to, message);
  }
}
```

### Día 4: Actualizar Bot Logic
**Archivo**: `server/bot-logic.js`

- Usar adaptador unificado para todos los mensajes
- Mantener compatibilidad con formato actual
- Agregar logging específico por provider

### Día 5: Script de Migración
**Archivo**: `scripts/migrate-tenant-to-baileys.js`

```bash
# Migrar un tenant específico
node scripts/migrate-tenant-to-baileys.js --tenantId=abc123
```

**Criterio de Éxito**: ✅ Enviar mensajes a través de bot sin cambiar lógica existente

---

## Fase 5: Testing Exhaustivo
**Duración**: 5 días  
**Objetivo**: Validar que todo funcione correctamente

### Día 1: Setup Ambiente de Pruebas
- Crear proyecto Firebase de pruebas
- Configurar variables de entorno de testing
- Preparar número de WhatsApp de prueba
- Activar logs detallados

### Día 2-3: Tests Funcionales
**Checklist**:
```
✓ Generar QR y conectar número
✓ Enviar mensaje de texto simple
✓ Recibir mensaje y procesar con bot
✓ Enviar imagen con caption
✓ Enviar botones interactivos
✓ Manejar múltiples conversaciones simultáneas
✓ Desconectar y reconectar manualmente
✓ Simular reinicio de servidor (sesión persiste)
✓ Probar límites de rate limiting
✓ Probar con 3 tenants simultáneos
```

### Día 4: Tests de Carga
- Enviar 100 mensajes en 1 hora
- Medir latencia y tasa de entrega
- Monitorear uso de memoria y CPU
- Verificar que no haya memory leaks

### Día 5: Tests de Estabilidad
- Dejar corriendo 24 horas
- Simular desconexiones de red
- Validar reconexión automática
- Revisar logs para errores

**Criterio de Éxito**: ✅ 99% de mensajes entregados, 0 crashes en 24h

---

## Fase 6: Piloto con Clientes
**Duración**: 10 días  
**Objetivo**: Probar con clientes reales en entorno controlado

### Día 1: Selección de Clientes Piloto
**Criterios**:
- 2-3 clientes pequeños
- Volumen bajo (<100 mensajes/día)
- Buena relación y comunicación
- Dispuestos a probar nueva funcionalidad

### Día 2-3: Preparación
- Documentar proceso de onboarding
- Preparar guía visual con screenshots
- Configurar monitoreo específico para pilotos
- Crear canal de comunicación directo

### Día 4-5: Onboarding de Pilotos
- Ayudar a cada cliente a escanear QR
- Verificar conexión exitosa
- Hacer envío de prueba
- Capacitar sobre dashboard nuevo

### Día 6-10: Monitoreo Intensivo
**Métricas diarias**:
- % Uptime de conexión
- Mensajes enviados/entregados/fallidos
- Latencia promedio
- Errores o warnings en logs
- Feedback de clientes

**Reunión diaria**: Revisar métricas y ajustar

**Criterio de Éxito**: ✅ 95% satisfacción de pilotos, <5% tasa de error

---

## Fase 7: Migración Gradual
**Duración**: 4+ semanas  
**Objetivo**: Migrar todos los clientes gradualmente

### Semana 1: Primeros 5-10 Clientes
- Comunicar cambio por email
- Programar horarios de migración
- Asistencia en vivo durante onboarding
- Monitoreo 24/7

### Semana 2: 10-20 Clientes
- Aplicar aprendizajes de semana 1
- Automatizar más el proceso
- Crear FAQs basados en preguntas comunes
- Reducir asistencia directa

### Semana 3-4: 20-30 Clientes/Semana
- Proceso mayormente automatizado
- Soporte por tickets
- Dashboard de métricas generales
- Identificar y resolver cuellos de botella

### Plan de Comunicación
**Email de Migración**:
```
Asunto: 🎉 Nueva forma más simple de conectar WhatsApp

Hola [Cliente],

Hemos mejorado la conexión de WhatsApp para hacerla más simple 
y confiable. Ahora solo necesitas escanear un código QR 
(igual que WhatsApp Web).

📅 Tu migración: [Fecha]
⏰ Duración: 5 minutos
📱 Lo que necesitas: Tu celular con WhatsApp

[Botón: Ver Tutorial]
[Botón: Programar Horario]

Cualquier duda, estamos aquí para ayudarte.
```

**Criterio de Éxito**: ✅ 100% de clientes migrados en 6-8 semanas

---

## 🚨 Plan de Contingencia

### Si un cliente reporta problemas:
1. **Revisar logs** del tenant específico
2. **Verificar estado de sesión** en Firebase
3. **Intentar reconexión** desde backend
4. **Si falla**: Rollback temporal a Meta (si disponible)
5. **Analizar causa raíz** y aplicar fix
6. **Reintentar migración** en 24-48h

### Si hay baneos masivos (>10%):
1. **PAUSAR** todas las migraciones nuevas
2. **Revisar patrones** de uso de números baneados
3. **Ajustar parámetros** anti-ban (aumentar delays)
4. **Reducir límites** diarios (1000 → 500)
5. **Probar con 1 cliente** antes de continuar
6. **Considerar rotación** de números

### Si hay caída del servidor:
1. **Todas las sesiones se recuperan** automáticamente
2. **Verificar que Firebase Realtime DB** esté activo
3. **Reiniciar servicio** con `pm2 restart`
4. **Notificar a clientes** si downtime > 5 min

---

## 📊 Métricas de Éxito

### Fase de Piloto (Semana 6-7)
- ✅ **Onboarding exitoso**: >95%
- ✅ **Satisfacción del cliente**: >4/5
- ✅ **Uptime**: >99%
- ✅ **Tasa de baneos**: <2%

### Post-Migración (Mes 2-3)
- ✅ **Mensajes entregados**: >99%
- ✅ **Latencia promedio**: <2 segundos
- ✅ **Reconexiones automáticas**: >90%
- ✅ **Tickets de soporte**: <5% de clientes

### Éxito del Proyecto (Mes 6)
- ✅ **Clientes activos en Baileys**: 100%
- ✅ **Reducción de costos**: 40-60%
- ✅ **NPS**: >8/10
- ✅ **Incidentes críticos**: 0

---

## 📁 Estructura de Archivos Final

```
server/
├── baileys/
│   ├── session-manager.js      # Gestión de sesiones
│   ├── auth-handler.js         # QR y autenticación
│   ├── message-adapter.js      # Convertir formatos
│   ├── event-handlers.js       # Eventos de Baileys
│   ├── anti-ban.js             # Rate limiting y delays
│   └── storage.js              # Persistencia Firebase
├── whatsapp-handler.js         # Enrutador (Baileys/Meta)
├── bot-logic.js                # Lógica de bot (sin cambios)
└── index.js                    # Rutas API nuevas

frontend/
├── onboarding-baileys.html     # Nueva UI de onboarding
├── dashboard.html              # Dashboard actualizado
└── assets/
    └── baileys-qr.js           # Lógica de QR

scripts/
└── migrate-tenant-to-baileys.js  # Script de migración

sessions/                       # Sesiones locales (gitignored)
├── tenant_abc123/
└── tenant_def456/
```

---

## ✅ Checklist de Entregables

### Código
- [ ] Módulos de Baileys implementados
- [ ] Endpoints de API funcionando
- [ ] UI de onboarding completa
- [ ] Sistema anti-ban activo
- [ ] Tests automatizados (unit + integration)

### Documentación
- [ ] README técnico de Baileys
- [ ] Guía de onboarding para clientes
- [ ] Manual de troubleshooting
- [ ] Runbook de operaciones
- [ ] Documentación de API

### Infraestructura
- [ ] Servidor con recursos suficientes
- [ ] Backup automático de sesiones
- [ ] Monitoreo y alertas configurados
- [ ] Logs centralizados
- [ ] Plan de disaster recovery

### Operaciones
- [ ] Equipo capacitado en Baileys
- [ ] Proceso de soporte definido
- [ ] Dashboard de métricas operacionales
- [ ] Plan de escalamiento documentado

---

## 🚀 Inicio de Proyecto

**Próximos pasos inmediatos**:
1. ✅ **Aprobar presupuesto** ($5-8k inicial)
2. ✅ **Asignar equipo** (2 devs + 1 QA)
3. ✅ **Crear branch** `feature/baileys-migration`
4. ✅ **Setup ambiente de dev** (Firebase test project)
5. ✅ **Kickoff meeting** (planificar sprints)

**Fecha de inicio propuesta**: [A definir]  
**Fecha de finalización estimada**: [Inicio + 8 semanas]

---

## 📞 Contactos del Proyecto

- **Project Lead**: [Nombre]
- **Tech Lead**: [Nombre]
- **QA Lead**: [Nombre]
- **Product Owner**: [Nombre]

---

**Última revisión**: 15 de enero de 2026  
**Versión**: 1.0
