# 🤝 Propuesta: Sistema de Comisiones para Socios Comerciales

**Fecha:** 5 de febrero de 2026  
**Estado:** Propuesta pendiente de aprobación  
**Autor:** GitHub Copilot  

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Reglas de Negocio](#reglas-de-negocio)
3. [Arquitectura de Dashboards](#arquitectura-de-dashboards)
4. [Modelo de Datos](#modelo-de-datos)
5. [Flujos de Usuario](#flujos-de-usuario)
6. [Plan de Implementación](#plan-de-implementación)
7. [Archivos a Crear/Modificar](#archivos-a-crearmodificar)
8. [Estimación de Tiempo](#estimación-de-tiempo)

---

## 📌 Resumen Ejecutivo

Sistema para vincular **socios comerciales** (vendedores/representantes) a los tenants/usuarios que captan, permitiendo el seguimiento automático de comisiones del **30%** sobre las membresías vendidas.

### Características Principales

| Característica | Descripción |
|----------------|-------------|
| **Comisión** | 30% de cada pago de membresía |
| **Recurrencia** | De por vida - El socio gana en cada renovación |
| **Período de gracia** | 30 días desde registro para vincular tenant |
| **Dashboard Admin** | Gestión completa de socios y comisiones |
| **Dashboard Partner** | Panel individual para cada socio |

---

## 📜 Reglas de Negocio

### Comisiones

1. **Porcentaje fijo:** 30% del valor de cada membresía pagada
2. **Recurrencia vitalicia:** El socio gana comisión en CADA renovación del tenant
3. **Generación automática:** Al detectar pago via webhook de Wompi

### Vinculación Tenant-Socio

1. **Código de referido:** Cada socio tiene un código único (ej: `JUAN2024`)
2. **Período de gracia:** 30 días desde registro para vincular usando código
3. **Vinculación permanente:** Una vez vinculado, el tenant pertenece al socio de por vida

### Estados de Comisión

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Comisión generada, pendiente de pago al socio |
| `pagada` | Comisión pagada al socio |

---

## 🖥️ Arquitectura de Dashboards

### Flujo de Autenticación

```
Usuario inicia sesión
        │
        ▼
┌───────────────────────┐
│ ¿Es odfarakm@gmail.com? │
└───────────────────────┘
        │
   ┌────┴────┐
   │         │
  SÍ        NO
   │         │
   ▼         ▼
 Admin    ┌─────────────────┐
Dashboard │ ¿Está en        │
  +       │ partners?       │
Gestión   └─────────────────┘
Socios           │
            ┌────┴────┐
            │         │
           SÍ        NO
            │         │
            ▼         ▼
        Partner    Dashboard
        Dashboard   Tenant
        (nuevo)    (normal)
```

### 👑 Admin Dashboard (`odfarakm@gmail.com`)

**Ubicación:** Página admin existente + nueva sección

**Funcionalidades:**
- ✅ Crear/editar/desactivar socios comerciales
- ✅ Generar códigos de referido
- ✅ Ver TODOS los socios y sus estadísticas
- ✅ Ver comisiones pendientes de pago
- ✅ Marcar comisiones como pagadas
- ✅ Ver detalle de cada socio y sus referidos

### 🤝 Partner Dashboard (Nuevo)

**Ubicación:** `/partner-dashboard.html`

**Funcionalidades:**
- ✅ Ver su código de referido y enlace para compartir
- ✅ Lista de tenants referidos
- ✅ Estado de cada tenant (activo, trial, inactivo)
- ✅ Historial de comisiones generadas
- ✅ Total ganado vs pendiente de pago

**Restricciones:**
- ❌ No puede ver otros socios
- ❌ No puede modificar datos de tenants
- ❌ No puede marcar comisiones como pagadas

### Mockup Partner Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  🤝 Panel de Socio Comercial                                │
│  Bienvenido, Juan Pérez                                     │
│  Tu código de referido: JUAN2024                            │
│  [📋 Copiar enlace de referido]                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Resumen                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 15           │ │ $1,500,000   │ │ $300,000     │        │
│  │ Referidos    │ │ Total Ganado │ │ Pendiente    │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  📋 Mis Referidos                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Restaurante    │ Fecha      │ Membresía │ Estado    │   │
│  │ El Sabor       │ 15/01/2026 │ Mensual   │ ✅ Activo │   │
│  │ La Esquina     │ 20/01/2026 │ Anual     │ ✅ Activo │   │
│  │ Café Central   │ 01/02/2026 │ Mensual   │ ⏳ Trial  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💰 Historial de Comisiones                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Fecha      │ Tenant      │ Valor    │ Estado       │   │
│  │ 01/02/2026 │ El Sabor    │ $30,000  │ 💵 Pagada   │   │
│  │ 15/01/2026 │ La Esquina  │ $90,000  │ 💵 Pagada   │   │
│  │ 05/02/2026 │ El Sabor    │ $30,000  │ ⏳ Pendiente│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Modelo de Datos

### Nueva Colección: `partners`

**Ruta Firebase:** `partners/{partnerId}`

```javascript
{
  // Identificación
  nombre: "Juan Pérez",
  email: "juan@ejemplo.com",           // Para login
  telefono: "+57300123456",
  
  // Referido
  codigoReferido: "JUAN2024",          // Único, autogenerado
  enlaceReferido: "https://tuapp.com/onboarding?ref=JUAN2024",
  
  // Estado
  estado: "activo" | "inactivo",
  fechaRegistro: timestamp,
  creadoPor: "odfarakm@gmail.com",
  
  // Datos de pago
  datosPago: {
    banco: "Bancolombia",
    tipoCuenta: "Ahorros",
    numeroCuenta: "123456789",
    cedula: "1234567890",
    titular: "Juan Pérez"
  },
  
  // Estadísticas (calculadas/cacheadas)
  estadisticas: {
    totalReferidos: 15,
    referidosActivos: 12,
    totalComisionesGeneradas: 1500000,
    totalComisionesPagadas: 1200000,
    comisionesPendientes: 300000
  }
}
```

### Modificación: `tenants/{tenantId}`

**Campos nuevos a agregar:**

```javascript
{
  // ...campos existentes...
  
  // Nuevos campos para tracking de referidos
  partnerId: "partner_abc123" | null,  // ID del socio que lo refirió
  codigoReferido: "JUAN2024" | null,   // Código usado al registrarse
  fechaRegistro: timestamp,             // Para calcular período de gracia
  fueReferido: true | false            // Flag rápido para filtrar
}
```

### Nueva Colección: `comisiones`

**Ruta Firebase:** `comisiones/{comisionId}`

```javascript
{
  // Relaciones
  partnerId: "partner_abc123",
  partnerNombre: "Juan Pérez",         // Denormalizado para consultas
  tenantId: "tenant_xyz789",
  tenantNombre: "Restaurante El Sabor", // Denormalizado para consultas
  
  // Detalles de la comisión
  tipoMembresia: "mensual" | "anual",
  valorMembresia: 100000,              // Valor pagado por el tenant
  porcentajeComision: 30,
  valorComision: 30000,                // 30% del valor
  
  // Estado
  estado: "pendiente" | "pagada",
  
  // Fechas
  fechaGenerada: timestamp,            // Cuando se detectó el pago
  fechaPago: timestamp | null,         // Cuando admin pagó al socio
  
  // Referencias
  transaccionWompiId: "TRX-123456",    // ID de transacción Wompi
  referenciaPagoSocio: "Nequi-05022026", // Referencia del pago al socio
  
  // Metadata
  periodoMembresia: "Febrero 2026",    // Para identificar el ciclo
  esRenovacion: true | false           // Primera compra o renovación
}
```

### Reglas de Firebase (Agregar)

```json
{
  "rules": {
    "partners": {
      ".read": "auth != null && (auth.token.email === 'odfarakm@gmail.com' || root.child('partners').child(auth.uid).exists())",
      ".write": "auth != null && auth.token.email === 'odfarakm@gmail.com'",
      "$partnerId": {
        ".read": "auth != null && (auth.token.email === 'odfarakm@gmail.com' || auth.uid === $partnerId)"
      }
    },
    "comisiones": {
      ".read": "auth != null && auth.token.email === 'odfarakm@gmail.com'",
      ".write": "auth != null && auth.token.email === 'odfarakm@gmail.com'",
      ".indexOn": ["partnerId", "tenantId", "estado"]
    }
  }
}
```

---

## 🔄 Flujos de Usuario

### Flujo 1: Admin Crea un Socio

```
1. Admin accede a su página especial
2. Click en "Gestión de Socios" → "Nuevo Socio"
3. Completa formulario:
   - Nombre
   - Email
   - Teléfono
   - Datos bancarios para pagos
4. Sistema genera automáticamente:
   - partnerId único
   - codigoReferido único (ej: JUAN2024)
   - enlaceReferido
5. Admin comparte código/enlace con el socio
```

### Flujo 2: Socio Refiere un Cliente

```
1. Socio comparte su enlace: tuapp.com/onboarding?ref=JUAN2024
2. Cliente accede y completa onboarding
3. Sistema detecta parámetro ?ref=JUAN2024
4. Al crear el tenant:
   - Guarda partnerId
   - Guarda codigoReferido
   - Guarda fechaRegistro
5. Tenant queda vinculado al socio
```

### Flujo 3: Generación de Comisión (Automático)

```
1. Tenant paga membresía via Wompi
2. Webhook de Wompi recibe confirmación de pago
3. Sistema verifica si tenant tiene partnerId
4. Si tiene partnerId:
   a. Calcula comisión (30% del valor)
   b. Crea registro en colección "comisiones"
   c. Actualiza estadísticas del partner
5. Comisión queda como "pendiente"
```

### Flujo 4: Admin Paga Comisión

```
1. Admin accede a "Gestión de Socios" → "Comisiones Pendientes"
2. Ve lista de comisiones pendientes
3. Realiza pago al socio (transferencia, Nequi, etc.)
4. En el sistema:
   a. Click "Marcar como pagada"
   b. Ingresa referencia del pago
5. Sistema actualiza:
   - Estado de comisión → "pagada"
   - fechaPago
   - referenciaPagoSocio
   - Estadísticas del partner
```

### Flujo 5: Socio Consulta su Dashboard

```
1. Socio accede con su email
2. Sistema detecta que está en colección "partners"
3. Redirige a /partner-dashboard.html
4. Ve sus estadísticas:
   - Total referidos
   - Comisiones ganadas
   - Comisiones pendientes
5. Puede copiar su enlace de referido
```

---

## 📝 Plan de Implementación

### Fase 1: Base de Datos y Reglas (Día 1)

**Tareas:**
- [ ] Actualizar `database.rules.json` con nuevas reglas
- [ ] Crear estructura inicial de `partners` en Firebase
- [ ] Modificar modelo de `tenants` para incluir campos de referido
- [ ] Crear estructura de `comisiones`
- [ ] Desplegar nuevas reglas a Firebase

**Entregables:**
- Reglas de Firebase actualizadas
- Estructura de datos lista

---

### Fase 2: Modificar Onboarding (Día 2)

**Tareas:**
- [ ] Modificar `onboarding.html` para detectar parámetro `?ref=`
- [ ] Guardar código de referido en localStorage temporalmente
- [ ] Al crear tenant, incluir `partnerId` y `codigoReferido`
- [ ] Validar que código de referido existe y está activo

**Archivos a modificar:**
- `onboarding.html`
- `js/onboarding.js` (si existe)

---

### Fase 3: Panel Admin - Gestión de Socios (Días 3-4)

**Tareas:**
- [ ] Crear sección "Gestión de Socios" en página admin
- [ ] Formulario para crear/editar socios
- [ ] Generador automático de códigos de referido
- [ ] Lista de socios con estadísticas
- [ ] Detalle de socio con sus referidos

**Archivos a crear/modificar:**
- Página admin existente
- `js/admin-partners.js` (nuevo)
- `css/admin-partners.css` (nuevo)

---

### Fase 4: Panel Admin - Gestión de Comisiones (Día 5)

**Tareas:**
- [ ] Lista de comisiones pendientes
- [ ] Filtros por socio, fecha, estado
- [ ] Acción "Marcar como pagada" con referencia
- [ ] Historial de comisiones pagadas

**Archivos a modificar:**
- Página admin
- `js/admin-partners.js`

---

### Fase 5: Partner Dashboard (Días 6-7)

**Tareas:**
- [ ] Crear `partner-dashboard.html`
- [ ] Crear `js/partner-dashboard.js`
- [ ] Mostrar código de referido y botón copiar enlace
- [ ] Mostrar estadísticas del socio
- [ ] Lista de referidos con estado
- [ ] Historial de comisiones

**Archivos a crear:**
- `partner-dashboard.html`
- `js/partner-dashboard.js`
- `css/partner-dashboard.css`

---

### Fase 6: Integración con Webhook de Pagos (Día 8)

**Tareas:**
- [ ] Modificar webhook de Wompi para detectar pagos de membresía
- [ ] Verificar si tenant tiene partnerId
- [ ] Crear comisión automáticamente
- [ ] Actualizar estadísticas del partner

**Archivos a modificar:**
- `server/wompi-webhook.js` (o equivalente)
- `server/comisiones.js` (nuevo)

---

### Fase 7: Flujo de Autenticación (Día 9)

**Tareas:**
- [ ] Modificar lógica de login para detectar tipo de usuario
- [ ] Redirigir a dashboard correcto según rol
- [ ] Proteger rutas según permisos

**Archivos a modificar:**
- `auth.html` / `js/auth.js`
- Scripts de autenticación

---

### Fase 8: Testing y Ajustes (Día 10)

**Tareas:**
- [ ] Probar flujo completo de registro con referido
- [ ] Probar generación de comisiones
- [ ] Probar pago de comisiones
- [ ] Probar dashboard de partner
- [ ] Ajustes y correcciones

---

## 📁 Archivos a Crear/Modificar

### Archivos Nuevos

| Archivo | Descripción |
|---------|-------------|
| `partner-dashboard.html` | Página del dashboard de socios |
| `js/partner-dashboard.js` | Lógica del dashboard de socios |
| `js/admin-partners.js` | Gestión de socios para admin |
| `server/comisiones.js` | Lógica de comisiones en backend |
| `css/partner-dashboard.css` | Estilos del dashboard de socios |

### Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `database.rules.json` | Agregar reglas para partners y comisiones |
| `onboarding.html` | Detectar y guardar código de referido |
| Página admin | Agregar sección de gestión de socios |
| `server/wompi-webhook.js` | Generar comisiones al detectar pago |
| `auth.html` / `js/auth.js` | Detectar tipo de usuario y redirigir |

---

## ⏱️ Estimación de Tiempo

| Fase | Duración | Descripción |
|------|----------|-------------|
| Fase 1 | 1 día | Base de datos y reglas |
| Fase 2 | 1 día | Modificar onboarding |
| Fase 3 | 2 días | Panel admin - socios |
| Fase 4 | 1 día | Panel admin - comisiones |
| Fase 5 | 2 días | Partner dashboard |
| Fase 6 | 1 día | Integración webhook |
| Fase 7 | 1 día | Flujo autenticación |
| Fase 8 | 1 día | Testing y ajustes |
| **Total** | **10 días** | |

---

## ✅ Checklist de Implementación

### Pre-requisitos
- [ ] Aprobar esta propuesta
- [ ] Definir URL base del enlace de referido
- [ ] Definir formato de código de referido (ej: NOMBRE+AÑO)

### Implementación
- [ ] Fase 1: Base de datos
- [ ] Fase 2: Onboarding
- [ ] Fase 3: Admin - Socios
- [ ] Fase 4: Admin - Comisiones
- [ ] Fase 5: Partner Dashboard
- [ ] Fase 6: Webhook
- [ ] Fase 7: Autenticación
- [ ] Fase 8: Testing

### Post-implementación
- [ ] Documentar API/endpoints
- [ ] Crear primer socio de prueba
- [ ] Probar flujo completo
- [ ] Desplegar a producción

---

## 🔮 Futuras Mejoras (Fuera de Alcance)

Estas funcionalidades NO están incluidas en esta propuesta pero pueden considerarse para versiones futuras:

1. **Escalabilidad de comisiones:** Diferentes porcentajes según volumen
2. **Disputas:** Sistema para resolver conflictos de atribución
3. **Notificaciones automáticas:** Email cuando se genera/paga comisión
4. **Exportación de reportes:** Excel/PDF de comisiones
5. **Auto-registro de socios:** Que socios puedan registrarse solos

---

## 📞 Contacto

Para preguntas sobre esta propuesta, contactar al administrador del sistema.

---

*Documento generado el 5 de febrero de 2026*
