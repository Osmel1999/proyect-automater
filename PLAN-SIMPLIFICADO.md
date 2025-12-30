# 📋 Plan Simplificado - Sistema de Pedidos para Cocina Oculta

## 🎯 Objetivo

Crear un sistema automatizado de gestión de pedidos para una cocina oculta (dark kitchen) que permita recibir pedidos por WhatsApp, procesarlos automáticamente y visualizarlos en tiempo real en un tablero KDS (Kitchen Display System).

---

## 🛠️ Stack Tecnológico (3 Herramientas)

### 1. **WhatsApp Business API** 📱
- **Función**: Canal de entrada de pedidos
- **Uso**: Los clientes envían sus pedidos por WhatsApp
- **Ventajas**: 
  - Familiar para los clientes
  - Alta tasa de adopción
  - No requiere app adicional

### 2. **n8n** ⚙️
- **Función**: Orquestador y automatizador del flujo de pedidos
- **Uso**: 
  - Recibe mensajes de WhatsApp
  - Procesa y parsea los pedidos
  - Envía confirmaciones automáticas
  - Sincroniza con Firebase
- **Ventajas**:
  - Visual y fácil de configurar
  - Gran cantidad de integraciones
  - Self-hosted (control total)

### 3. **KDS Web App + Firebase** 🖥️
- **Función**: Sistema de visualización y gestión de pedidos en cocina
- **Uso**:
  - Muestra pedidos en tiempo real
  - Tablero Kanban (En Cola → Preparando → Listos)
  - Gestión de estados de pedidos
- **Ventajas**:
  - Reemplaza Google Sheets
  - Interfaz optimizada para cocina
  - Tiempo real con Firebase
  - Responsive (tablets/TVs)

---

## 🔄 Flujo del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE PEDIDOS                             │
└─────────────────────────────────────────────────────────────────┘

1. Cliente envía pedido por WhatsApp
   📱 "Hola, quiero 2 hamburguesas especiales y 1 papas grandes"
              ↓
2. WhatsApp Business API captura el mensaje
              ↓
3. n8n recibe el webhook de WhatsApp
              ↓
4. n8n procesa el pedido:
   - Extrae información del cliente
   - Parsea items del pedido
   - Calcula total (opcional)
   - Genera ID único del pedido
              ↓
5. n8n envía confirmación al cliente vía WhatsApp
   💬 "✅ Pedido #42 recibido. Total: $45.500"
              ↓
6. n8n guarda el pedido en Firebase Realtime Database
              ↓
7. KDS se actualiza automáticamente en tiempo real
   🖥️ Aparece nueva tarjeta en columna "En Cola"
              ↓
8. Cocineros gestionan el pedido en el KDS:
   - "En Cola" → "Preparando" → "Listo"
              ↓
9. (Opcional) n8n detecta cambio a "Listo"
   💬 Envía notificación al cliente
```

---

## 📊 Arquitectura del Sistema

```
┌──────────────────┐
│   WhatsApp API   │ ← Cliente envía pedido
└────────┬─────────┘
         │ webhook
         ↓
┌──────────────────┐
│       n8n        │ ← Procesa y valida
│   (Orchestrator) │
└────────┬─────────┘
         │ REST API
         ↓
┌──────────────────┐
│  Firebase RTDB   │ ← Base de datos en tiempo real
└────────┬─────────┘
         │ WebSocket
         ↓
┌──────────────────┐
│   KDS Web App    │ ← Cocina visualiza pedidos
│  (index.html)    │
└──────────────────┘
```

---

## 🗂️ Estructura de Datos en Firebase

### Pedidos Activos (`/pedidos/{pedidoId}`)

```json
{
  "pedidos": {
    "42": {
      "id": "42",
      "cliente": "Juan Pérez",
      "telefono": "3001234567",
      "items": [
        {
          "cantidad": 2,
          "nombre": "Hamburguesa Especial",
          "notas": "Sin cebolla, extra queso"
        },
        {
          "cantidad": 1,
          "nombre": "Papas Grandes"
        }
      ],
      "total": 45500,
      "estado": "pendiente",
      "timestamp": 1735567800000,
      "origen": "whatsapp"
    }
  }
}
```

### Historial de Pedidos (`/historial/{pedidoId}`)

```json
{
  "historial": {
    "41": {
      "id": "41",
      "cliente": "María García",
      "telefono": "3019876543",
      "items": [...],
      "total": 38900,
      "estado": "entregado",
      "timestamp": 1735565600000,
      "inicioCocinado": 1735566200000,
      "horaListo": 1735567500000,
      "horaEntrega": 1735567800000
    }
  }
}
```

---

## ⚙️ Configuración de n8n

### Workflow Principal: "Gestión de Pedidos WhatsApp"

#### **Nodo 1: Webhook Trigger**
- **Tipo**: Webhook
- **Método**: POST
- **Path**: `/webhook/whatsapp`
- **Recibe**: Mensajes de WhatsApp Business API

#### **Nodo 2: Extraer Datos**
- **Tipo**: Code (JavaScript)
- **Función**: 
  - Extraer nombre del cliente
  - Extraer número de teléfono
  - Extraer texto del mensaje

#### **Nodo 3: Parsear Pedido (IA o Regex)**
- **Tipo**: Code / OpenAI (opcional)
- **Función**:
  - Identificar items del pedido
  - Extraer cantidades
  - Detectar notas especiales
  - Calcular total

#### **Nodo 4: Generar ID de Pedido**
- **Tipo**: Code
- **Función**: Crear ID único secuencial o timestamp-based

#### **Nodo 5: Guardar en Firebase**
- **Tipo**: HTTP Request
- **Método**: PUT/PATCH
- **URL**: `https://[proyecto].firebaseio.com/pedidos/{pedidoId}.json`
- **Body**: Datos del pedido formateados

#### **Nodo 6: Enviar Confirmación**
- **Tipo**: HTTP Request (WhatsApp API)
- **Función**: Enviar mensaje de confirmación al cliente
- **Template**: 
  ```
  ✅ ¡Pedido recibido!
  
  📋 Pedido #{{pedidoId}}
  👤 {{nombreCliente}}
  📱 {{telefono}}
  
  🍔 Tu pedido:
  {{items}}
  
  💰 Total: ${{total}}
  
  ⏱️ Tiempo estimado: 25-30 min
  ```

---

## 🎨 Características del KDS

### Visualización en Tiempo Real
- ✅ Tablero Kanban con 3 columnas
- ✅ Actualizaciones automáticas (Firebase Realtime)
- ✅ Tarjetas compactas optimizadas
- ✅ 100% de altura de pantalla (sin scroll general)
- ✅ Scroll individual por columna

### Información en Tarjetas
```
┌─────────────────────────────────────┐
│ #42              Pedido             │
│ $45.500          8:30 PM - ⏱️ 15 min│
├─────────────────────────────────────┤
│ 👤 Juan Pérez    📱 300 123 4567   │
├─────────────────────────────────────┤
│ 2 ⃝ Hamburguesa Especial           │
│     📝 Sin cebolla, extra queso     │
│ 1 ⃝ Papas Grandes                   │
├─────────────────────────────────────┤
│ [👨‍🍳 Empezar a Cocinar]             │
└─────────────────────────────────────┘
```

### Gestión de Estados
1. **En Cola** → Cliente realiza pedido
2. **Preparando** → Cocinero presiona "Empezar a Cocinar"
3. **Listo** → Cocinero presiona "Marcar como Listo"
4. **Entregado** → Pedido se mueve a historial

### Alertas y Notificaciones
- ⚠️ **Warning**: Pedidos > 20 minutos (color naranja)
- 🔥 **Urgente**: Pedidos > 25 minutos (banner rojo + parpadeo)
- 🔴 **Crítico**: Pedidos > 30 minutos (color rojo + animación)
- 🔊 Sonido de notificación para nuevos pedidos
- 📳 Vibración en dispositivos móviles

---

## 📦 Componentes del Sistema

### Archivos Principales

```
kds-webapp/
├── index.html           # App principal del KDS
├── app.js              # Lógica de negocio y Firebase
├── styles.css          # Estilos optimizados
├── config.js           # Configuración de Firebase
├── demo.html           # Demo sin conexión a Firebase
└── README.md           # Documentación
```

### Servicios Externos

1. **Firebase Realtime Database**
   - Plan: Spark (Free)
   - Límite: 1GB almacenamiento, 10GB/mes de transferencia
   - Suficiente para ~10,000 pedidos/mes

2. **WhatsApp Business API**
   - Proveedor: Twilio / Meta / 360Dialog
   - Costo aproximado: $0.005 - $0.05 por mensaje
   - Estimado: $50-100/mes para 2000 mensajes

3. **n8n**
   - Self-hosted (servidor propio)
   - Opciones:
     - Railway.app (free tier)
     - DigitalOcean ($6/mes)
     - Render.com (free tier)

---

## 💰 Costos Estimados Mensuales

| Servicio | Plan | Costo |
|----------|------|-------|
| Firebase | Free (Spark) | $0 |
| WhatsApp API | ~2000 mensajes | $50-100 |
| n8n Hosting | Railway/Render | $0-6 |
| **TOTAL** | | **$50-106/mes** |

### Escalabilidad
- **Hasta 500 pedidos/mes**: $50/mes
- **500-1000 pedidos/mes**: $75/mes
- **1000-2000 pedidos/mes**: $100/mes

---

## 🚀 Pasos de Implementación

### Fase 1: Configuración Base (1-2 días)
1. ✅ Crear proyecto en Firebase
2. ✅ Configurar Realtime Database
3. ✅ Desplegar KDS a Firebase Hosting
4. ✅ Configurar reglas de seguridad

### Fase 2: Integración WhatsApp (2-3 días)
1. ⬜ Crear cuenta en proveedor de WhatsApp API
2. ⬜ Configurar número de negocio
3. ⬜ Obtener credenciales y tokens
4. ⬜ Configurar webhooks

### Fase 3: Automatización con n8n (2-3 días)
1. ⬜ Desplegar n8n (Railway/Render/DigitalOcean)
2. ⬜ Crear workflow de recepción de pedidos
3. ⬜ Implementar parser de mensajes
4. ⬜ Configurar integración con Firebase
5. ⬜ Configurar mensajes de confirmación

### Fase 4: Pruebas (1-2 días)
1. ⬜ Probar flujo completo end-to-end
2. ⬜ Validar tiempo real en KDS
3. ⬜ Probar en diferentes dispositivos
4. ⬜ Ajustar tiempos y umbrales

### Fase 5: Producción (1 día)
1. ⬜ Configurar dominio personalizado (opcional)
2. ⬜ Capacitar al equipo de cocina
3. ⬜ Lanzamiento suave con clientes beta
4. ⬜ Monitoreo y ajustes

**Tiempo total estimado: 7-11 días**

---

## 🎯 Ventajas del Plan Simplificado

### ✅ Ventajas Técnicas
- **Simple**: Solo 3 herramientas principales
- **Escalable**: Soporta crecimiento sin cambios mayores
- **Económico**: $50-100/mes vs $300+ de soluciones comerciales
- **Mantenible**: Stack moderno y documentado
- **Tiempo real**: Sin delays ni polling

### ✅ Ventajas Operativas
- **Interfaz familiar**: WhatsApp (clientes) + Web (cocina)
- **Sin instalaciones**: Todo funciona en el navegador
- **Multi-dispositivo**: Tablets, TVs, móviles
- **Sin capacitación compleja**: Interfaz intuitiva
- **Flexibilidad**: Fácil de personalizar y extender

### ✅ Ventajas vs Google Sheets
| Aspecto | Google Sheets | KDS Web App |
|---------|---------------|-------------|
| Interfaz | Tabla genérica | Optimizada para cocina |
| Tiempo Real | Polling (~5 seg) | WebSocket (instantáneo) |
| Visualización | Filas y columnas | Kanban visual |
| Mobile | Limitado | Completamente responsive |
| Acciones | Manual | Botones y automatización |
| Performance | Lento con +100 filas | Rápido con miles |
| UX Cocina | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🔮 Extensiones Futuras (Opcionales)

### Fase 2 - Mejoras
- 📊 Panel de estadísticas y métricas
- 📈 Reportes de ventas diarias/mensuales
- 👥 Sistema de usuarios y roles
- 🔔 Notificaciones push al cliente cuando está listo
- 💳 Integración con pasarelas de pago

### Fase 3 - Avanzado
- 🤖 Chatbot con IA para pedidos más complejos
- 📱 App móvil nativa (opcional)
- 🗺️ Integración con delivery (Rappi, Uber Eats)
- 📦 Sistema de inventario
- 🧾 Generación automática de facturas

---

## 📞 Soporte y Mantenimiento

### Documentación Incluida
- ✅ README.md con setup completo
- ✅ Comentarios en código
- ✅ Ejemplos de estructura de datos
- ✅ Guía de troubleshooting

### Mantenimiento Estimado
- **Mensual**: 2-4 horas
- **Tareas**: Revisar logs, actualizar dependencias, ajustes menores
- **Costo**: $0 (self-managed) o $100-200 (soporte externo)

---

## ✅ Conclusión

Este plan simplificado ofrece una solución **completa, económica y escalable** para gestionar pedidos en una cocina oculta, reemplazando Google Sheets con un sistema profesional diseñado específicamente para las necesidades de una cocina en operación.

### Diferenciadores Clave
1. ✨ **Interfaz profesional**: KDS diseñado para cocina, no una tabla genérica
2. ⚡ **Tiempo real verdadero**: Firebase WebSocket vs polling de Sheets
3. 💰 **Bajo costo**: $50-100/mes vs $300+ de alternativas
4. 🎯 **Fácil implementación**: 7-11 días vs meses de desarrollo
5. 🚀 **Listo para escalar**: Soporta crecimiento sin rediseño

---

## 📝 Próximos Pasos

1. **Revisar y aprobar este plan**
2. **Configurar Firebase y desplegar KDS** (ya está listo)
3. **Contratar proveedor de WhatsApp API**
4. **Configurar n8n y workflows**
5. **Pruebas y lanzamiento**

---

**Fecha de creación**: 30 de diciembre de 2025  
**Versión**: 1.0  
**Estado**: ✅ KDS completado y listo para integración
