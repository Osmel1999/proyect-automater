# 🎨 FASE 4 - Dashboard UI para Configuración de Pagos

**Inicio:** 16/01/2025  
**Estado:** 🚧 EN PROGRESO

---

## 🎯 Objetivo

Crear una interfaz intuitiva en el dashboard donde cada restaurante pueda:

1. ✅ Activar/desactivar pagos online en su bot
2. ✅ Seleccionar el gateway de pago (Wompi, Bold, PayU)
3. ✅ Ingresar sus credenciales de forma segura
4. ✅ Validar que las credenciales funcionen
5. ✅ Ver el estado actual de su configuración

---

## 📋 Componentes a Implementar

### 1. UI en Dashboard (dashboard.html)

#### A. Nueva tarjeta de acción rápida
```html
<div class="action-card" onclick="openPaymentsConfig()">
  <div class="action-icon">💳</div>
  <h3>Configurar Pagos</h3>
  <p>Activa pagos online y configura tu gateway</p>
</div>
```

#### B. Nueva sección de configuración
```html
<div class="dashboard-section">
  <h2 class="section-title-main">💳 Pagos Online</h2>
  <div class="payment-config-card">
    <!-- Toggle de activación -->
    <!-- Selector de gateway -->
    <!-- Formulario de credenciales -->
    <!-- Estado de validación -->
  </div>
</div>
```

#### C. Modal de configuración de pagos
```html
<div class="modal-overlay" id="payments-modal">
  <div class="modal">
    <!-- Header -->
    <!-- Toggle switch -->
    <!-- Selector de gateway (Wompi, Bold, PayU) -->
    <!-- Campos de credenciales (condicionales según gateway) -->
    <!-- Botón "Validar Credenciales" -->
    <!-- Indicador de estado -->
    <!-- Botón "Guardar Configuración" -->
  </div>
</div>
```

---

### 2. Estilos CSS

```css
/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 60px;
  height: 30px;
  background: #e2e8f0;
  border-radius: 15px;
  cursor: pointer;
  transition: 0.3s;
}

.toggle-switch.active {
  background: #48bb78;
}

/* Gateway Selector */
.gateway-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.gateway-option {
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: 0.2s;
}

.gateway-option.selected {
  border-color: #667eea;
  background: #f7faff;
}

/* Credential Fields */
.credential-field {
  margin-bottom: 16px;
}

.credential-field label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2d3748;
}

.credential-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
}

/* Status Indicator */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  margin: 16px 0;
}

.status-indicator.success {
  background: #f0fff4;
  color: #22543d;
  border: 1px solid #9ae6b4;
}

.status-indicator.error {
  background: #fff5f5;
  color: #742a2a;
  border: 1px solid #fc8181;
}

.status-indicator.info {
  background: #ebf8ff;
  color: #2c5282;
  border: 1px solid #90cdf4;
}
```

---

### 3. JavaScript Funciones

#### A. Abrir modal de configuración
```javascript
async function openPaymentsConfig() {
  // Cargar configuración actual desde Firebase
  // Mostrar modal
  // Prellenar campos si ya hay configuración
}
```

#### B. Toggle de activación
```javascript
function togglePayments(enabled) {
  // Actualizar UI del toggle
  // Habilitar/deshabilitar campos del formulario
  // Guardar en Firebase: tenants/{tenantId}/payments/gateway/enabled
}
```

#### C. Seleccionar gateway
```javascript
function selectGateway(gateway) {
  // Actualizar UI del selector
  // Mostrar campos específicos del gateway
  // Guardar selección: tenants/{tenantId}/payments/gateway/provider
}
```

#### D. Validar credenciales
```javascript
async function validateCredentials() {
  // Obtener credenciales del formulario
  // Llamar a endpoint: POST /api/payments/validate-credentials
  // Mostrar resultado (éxito o error)
  // Si éxito, habilitar botón "Guardar"
}
```

#### E. Guardar configuración
```javascript
async function savePaymentConfig() {
  // Validar que todo esté completo
  // Guardar en Firebase:
  //   tenants/{tenantId}/payments/gateway/enabled
  //   tenants/{tenantId}/payments/gateway/provider
  //   tenants/{tenantId}/payments/gateway/credentials
  // Mostrar mensaje de éxito
  // Cerrar modal
}
```

---

### 4. Backend - Endpoint de Validación

#### Nuevo archivo: `server/routes/payments.js` (agregar endpoint)

```javascript
// POST /api/payments/validate-credentials
router.post('/validate-credentials', async (req, res) => {
  try {
    const { provider, credentials } = req.body;
    
    // Validar según el provider
    let isValid = false;
    let error = null;
    
    if (provider === 'wompi') {
      isValid = await wompiAdapter.validateCredentials(credentials);
    } else if (provider === 'bold') {
      isValid = await boldAdapter.validateCredentials(credentials);
    } else if (provider === 'payu') {
      isValid = await payuAdapter.validateCredentials(credentials);
    }
    
    if (isValid) {
      res.json({ success: true, message: 'Credenciales válidas' });
    } else {
      res.json({ success: false, error: 'Credenciales inválidas' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### Agregar método de validación en adapters

**wompi-adapter.js:**
```javascript
async validateCredentials(credentials) {
  try {
    const { publicKey, privateKey } = credentials;
    
    // Hacer una petición de prueba a Wompi
    const response = await axios.get(
      'https://production.wompi.co/v1/merchants',
      {
        headers: {
          'Authorization': `Bearer ${privateKey}`
        }
      }
    );
    
    return response.status === 200;
  } catch (error) {
    return false;
  }
}
```

---

### 5. Estructura de Datos en Firebase

```javascript
tenants/
  └─ {tenantId}/
      └─ payments/
          └─ gateway/
              ├─ enabled: true/false          // Toggle principal
              ├─ provider: "wompi"            // Gateway seleccionado
              ├─ credentials/                 // Credenciales encriptadas
              │   ├─ publicKey: "pub_test_..." 
              │   └─ privateKey: "prv_test_..."
              ├─ validated: true              // Si fue validado exitosamente
              ├─ validatedAt: 1737048000000   // Timestamp de validación
              └─ lastUpdate: 1737048000000    // Última actualización
```

---

## 🎨 Diseño Visual

### Vista Principal - Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  🚀 Acciones Rápidas                                    │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │   🍽️    │  │   💬     │  │   🖥️    │  │   💳     ││
│  │ Gestionar│  │Personal. │  │ Pantalla │  │ Configurar│
│  │   Menú   │  │ Mensajes │  │  Cocina  │  │   Pagos  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  💳 Pagos Online                                        │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │  Pagos Online    [●─────]  Activado               │  │
│  │  ────────────────────────────────────────────────  │  │
│  │  Gateway: Wompi ✅                                │  │
│  │  Estado: Configurado y validado                   │  │
│  │  Última validación: Hace 2 días                   │  │
│  │                                                    │  │
│  │  [⚙️ Configurar]  [🔄 Re-validar]                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Modal de Configuración

```
┌─────────────────────────────────────────────────────────┐
│  💳 Configuración de Pagos Online              [X]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Pagos Online    [●─────]  Activado                    │
│                                                         │
│  ────────────────────────────────────────────────────   │
│                                                         │
│  Selecciona tu Gateway de Pagos:                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Wompi   │  │   Bold   │  │   PayU   │            │
│  │    ✅    │  │          │  │          │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                         │
│  ────────────────────────────────────────────────────   │
│                                                         │
│  Credenciales de Wompi:                                │
│                                                         │
│  Public Key (Llave Pública)                            │
│  [pub_test_xxxxxxxxxxxxxxxx___________________]        │
│                                                         │
│  Private Key (Llave Privada)                           │
│  [prv_test_xxxxxxxxxxxxxxxx___________________]        │
│                                                         │
│  Events Secret (Webhook Secret)                        │
│  [test_events_xxxxxxxxxx_______________________]       │
│                                                         │
│  [🔍 Validar Credenciales]                             │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │ ✅ Credenciales válidas y funcionando         │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  ────────────────────────────────────────────────────   │
│                                                         │
│  ℹ️  ¿Cómo obtener estas credenciales?                 │
│  [📖 Ver Guía Paso a Paso]                             │
│                                                         │
│  [Cancelar]                    [✅ Guardar Configuración]│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Flujo de Usuario

### Caso 1: Primera vez configurando pagos

```
1. Usuario hace clic en "Configurar Pagos"
   ↓
2. Se abre modal con toggle desactivado
   ↓
3. Usuario activa el toggle
   ↓
4. Se habilitan los campos del formulario
   ↓
5. Usuario selecciona gateway (Wompi)
   ↓
6. Se muestran campos específicos de Wompi
   ↓
7. Usuario ingresa sus credenciales
   ↓
8. Usuario hace clic en "Validar Credenciales"
   ↓
9. Sistema valida contra API de Wompi
   ↓
10. Si válidas → Muestra mensaje de éxito
    Si inválidas → Muestra error específico
   ↓
11. Usuario hace clic en "Guardar Configuración"
   ↓
12. Sistema guarda en Firebase
   ↓
13. Modal se cierra y muestra confirmación
```

### Caso 2: Editar configuración existente

```
1. Usuario hace clic en "Configurar Pagos"
   ↓
2. Se abre modal con datos pre-cargados
   ↓
3. Usuario modifica credenciales
   ↓
4. Usuario hace clic en "Validar Credenciales"
   ↓
5. Sistema valida nuevas credenciales
   ↓
6. Usuario guarda cambios
```

### Caso 3: Desactivar pagos

```
1. Usuario hace clic en "Configurar Pagos"
   ↓
2. Usuario desactiva el toggle
   ↓
3. Sistema muestra confirmación:
   "¿Deseas desactivar los pagos online?
    Los clientes solo podrán pagar en efectivo."
   ↓
4. Usuario confirma
   ↓
5. Sistema actualiza Firebase
   ↓
6. Bot deja de preguntar método de pago
```

---

## 🔒 Seguridad

### Consideraciones importantes:

1. **No guardar credenciales en texto plano**
   - Usar encriptación AES-256
   - Clave de encriptación en variable de entorno

2. **Validación en backend**
   - Nunca confiar en validación del frontend
   - Verificar permisos del tenant

3. **Rate limiting**
   - Limitar intentos de validación
   - Prevenir ataques de fuerza bruta

4. **Logs de auditoría**
   - Registrar cambios en configuración
   - Quién, cuándo, qué cambió

---

## ✅ Checklist de Implementación

### Frontend
- [ ] Crear tarjeta de acción rápida "Configurar Pagos"
- [ ] Crear modal de configuración
- [ ] Implementar toggle switch
- [ ] Crear selector de gateways
- [ ] Crear formulario de credenciales
- [ ] Implementar validación en tiempo real
- [ ] Agregar indicadores de estado
- [ ] Crear botones de acción
- [ ] Agregar estilos CSS
- [ ] Implementar responsive design

### JavaScript
- [ ] Función `openPaymentsConfig()`
- [ ] Función `togglePayments()`
- [ ] Función `selectGateway()`
- [ ] Función `validateCredentials()`
- [ ] Función `savePaymentConfig()`
- [ ] Función `loadCurrentConfig()`
- [ ] Manejo de errores
- [ ] Mensajes de confirmación

### Backend
- [ ] Endpoint `/api/payments/validate-credentials`
- [ ] Método `validateCredentials()` en wompi-adapter
- [ ] Método `validateCredentials()` en bold-adapter (futuro)
- [ ] Método `validateCredentials()` en payu-adapter (futuro)
- [ ] Encriptación de credenciales
- [ ] Rate limiting en endpoint de validación
- [ ] Logs de auditoría

### Testing
- [ ] Probar activación/desactivación
- [ ] Probar selección de gateways
- [ ] Probar validación de credenciales válidas
- [ ] Probar validación de credenciales inválidas
- [ ] Probar guardado de configuración
- [ ] Probar carga de configuración existente
- [ ] Probar responsive design
- [ ] Probar manejo de errores

---

## 📊 Métricas de Éxito

- ✅ Tiempo de configuración < 3 minutos
- ✅ Tasa de éxito de validación > 95%
- ✅ 0 errores de configuración reportados
- ✅ 100% de restaurantes pueden activar/desactivar

---

## 🚀 Próximos Pasos

1. ✅ Implementar UI del modal
2. ✅ Implementar lógica de frontend
3. ✅ Crear endpoint de validación
4. ✅ Agregar encriptación de credenciales
5. ✅ Probar flujo completo
6. ✅ Documentar para restaurantes

---

**Última actualización:** 16/01/2025 - 15:30 COT
