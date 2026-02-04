# 🛡️ Sistema Anti-Ban Multi-Capa

## 📋 Resumen

Este documento describe todas las capas de protección implementadas en el sistema para evitar baneos de WhatsApp.

---

## 🔐 Capa 1: Túnel por Navegador (Browser Tunnel)

### ✅ Implementado

Cada restaurante se conecta a WhatsApp usando la IP real del navegador del restaurante mediante un sistema de túnel WebSocket.

**Cómo funciona:**
1. El dashboard del restaurante abre una conexión WebSocket con el servidor
2. Las solicitudes HTTP a WhatsApp se enrutan a través del navegador del restaurante
3. WhatsApp ve la IP real del restaurante, no la IP de Railway

**Archivos:**
- `server/tunnel-manager.js` - Gestión de túneles WebSocket
- `server/baileys/session-manager.js` - Integración con Baileys
- `js/tunnel-worker-register.js` - Registro del túnel en el frontend
- `sw-tunnel.js` - Service Worker para el túnel

**Verificación:**
El indicador "🔧 Túnel Activo" aparece en el dashboard cuando está funcionando.

---

## ⏱️ Capa 2: Rate Limiting y Humanización

### ✅ Implementado

**Implementado:**
- Delays aleatorios entre mensajes (2-5 segundos)
- Sistema de "typing" para simular escritura humana
- Variación natural en tiempos de respuesta

**Ubicación:**
- `server/baileys/anti-ban.js` - Servicio de humanización
- `server/baileys/message-adapter.js` - Delays en envío
- `server/baileys/humanization.js` - Lógica de humanización

---

## 🕐 Capa 3: Horarios de Actividad

### ✅ Parcialmente Implementado

El bot puede configurarse para respetar horarios de operación del restaurante.

---

## 🔄 Capa 4: Reconexión Gradual

### ✅ Implementado

El sistema de reconexión automática usa delays graduales para evitar patrones sospechosos.

**Ubicación:** `server/baileys/connection-manager.js`

---

## 🚦 Capa 5: Warm-up para Números Nuevos

### ✅ Implementado

**Ubicación:** `server/baileys/anti-ban.js`

- Detección de número nuevo vs existente
- Rate limits más estrictos para números nuevos
- Incremento gradual de actividad

---

## 📊 Capa 6: Monitoring

### ✅ Implementado

El sistema incluye logs detallados y diagnósticos del estado del túnel.

**Herramientas:**
- `/diagnose-tunnel.sh` - Script de diagnóstico
- `/check-tunnel-status.html` - Página de verificación

---

## 🔧 Arquitectura del Sistema Anti-Ban

```
┌─────────────────────────────────────────────────────────────┐
│                    RESTAURANTE (Browser)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Dashboard abierto → Túnel WebSocket activo          │   │
│  │  IP Real del Restaurante → Visible para WhatsApp     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     RAILWAY SERVER                           │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │ Tunnel Manager  │ ←→ │ Session Manager (Baileys)     │   │
│  │ WebSocket Hub   │    │ Rutas requests por túnel      │   │
│  └─────────────────┘    └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      WHATSAPP SERVERS                        │
│        Ve IP del restaurante, no IP de Railway               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Notas Importantes

1. **El túnel requiere dashboard abierto**: El bot funciona mejor cuando el dashboard está abierto en el navegador del restaurante.

2. **Fallback automático**: Si el túnel no está disponible, las solicitudes van directamente desde Railway (menos seguro pero funcional).

3. **Sin costos adicionales**: A diferencia de soluciones de proxy externas, el túnel no tiene costos adicionales.

---

## 📚 Documentación Relacionada

- `docs/TUNEL-P2P-EXPLICACION-SIMPLE.md` - Explicación simple del sistema
- `docs/COMO-FUNCIONA-TUNEL-P2P.md` - Detalles técnicos
- `docs/RESUMEN-EJECUTIVO-ANTI-BAN.md` - Resumen ejecutivo
