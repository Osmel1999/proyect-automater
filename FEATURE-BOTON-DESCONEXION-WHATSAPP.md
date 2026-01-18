# 🆕 FEATURE: Botón de Desconexión de WhatsApp en Dashboard

**Fecha:** 2026-01-18 20:00 UTC  
**Tipo:** Nueva funcionalidad  
**Prioridad:** ALTA

---

## 📝 Descripción

Se agregó un botón en la barra superior del dashboard que permite al usuario desconectar WhatsApp y generar un nuevo código QR para reconectar, similar al flujo de onboarding inicial.

---

## 🎯 Necesidad

El usuario necesita poder desconectar y reconectar WhatsApp sin tener que:
1. Hacer logout completo de la aplicación
2. Pasar por el onboarding desde cero
3. Borrar datos de Firebase manualmente

**Casos de uso:**
- Cambiar el número de WhatsApp conectado
- Reconectar si la sesión se cerró inesperadamente
- Conectar otro dispositivo/número

---

## ✨ Funcionalidad Implementada

### 1. Indicador de Estado de WhatsApp

En la barra superior del dashboard, ahora se muestra:

**Cuando está conectado:**
```
🟢 Conectado: +54 9 351 XXX XXXX  [📱 Desconectar WhatsApp]
```

**Cuando está desconectado:**
```
🔴 WhatsApp Desconectado
```

### 2. Botón de Desconexión

- **Ubicación:** Barra superior del dashboard (header)
- **Texto:** "📱 Desconectar WhatsApp"
- **Color:** Rojo (alerta)
- **Visible:** Solo cuando WhatsApp está conectado

### 3. Flujo de Desconexión

```
1. Usuario hace click en "Desconectar WhatsApp"
2. Se muestra confirmación con advertencia
3. Usuario confirma
4. Se desconecta la sesión de Baileys en el backend
5. Se actualiza Firebase (whatsapp_connected = false)
6. Usuario es redirigido al onboarding
7. En onboarding, puede escanear nuevo QR
```

---

## 🔧 Implementación Técnica

### Cambios en Dashboard.html

#### 1. Nuevos Estilos CSS

**Estado de WhatsApp:**
```css
.whatsapp-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #c6f6d5; /* Verde claro */
  border: 2px solid #48bb78;
  border-radius: 6px;
  font-weight: 600;
}

.whatsapp-status.disconnected {
  background: #fed7d7; /* Rojo claro */
  border-color: #fc8181;
  color: #742a2a;
}
```

**Botón de Desconexión:**
```css
.btn-disconnect {
  padding: 8px 16px;
  background: #fed7d7;
  color: #c53030;
  border: 2px solid #fc8181;
  border-radius: 6px;
  font-weight: 600;
}

.btn-disconnect:hover {
  background: #fc8181;
  color: white;
}
```

**Dot animado:**
```css
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #48bb78;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

#### 2. HTML del Header

```html
<div class="header-right">
  <!-- WhatsApp Status -->
  <div class="whatsapp-status disconnected" id="whatsapp-status" style="display: none;">
    <span class="status-dot disconnected" id="status-dot"></span>
    <span id="status-text">Desconectado</span>
  </div>
  
  <!-- Disconnect WhatsApp Button -->
  <button class="btn-disconnect" id="btn-disconnect-whatsapp" 
          style="display: none;" 
          onclick="disconnectWhatsApp()">
    📱 Desconectar WhatsApp
  </button>
  
  <a href="/kds.html" class="btn-secondary">📺 Ver KDS</a>
  <a href="/select.html" class="btn-secondary">🏠 Inicio</a>
</div>
```

#### 3. Funciones JavaScript

**Verificar estado al cargar:**
```javascript
document.addEventListener('DOMContentLoaded', function() {
  loadTenantData();
  checkWhatsAppStatus(); // ← NUEVO
});
```

**Función checkWhatsAppStatus():**
```javascript
async function checkWhatsAppStatus() {
  try {
    const response = await fetch(
      `https://api.kdsapp.site/api/baileys/status?tenantId=${tenantId}`
    );
    const data = await response.json();
    
    updateWhatsAppStatusUI(data.connected, data.phoneNumber);
  } catch (error) {
    console.error('Error verificando estado:', error);
    updateWhatsAppStatusUI(false, null);
  }
}
```

**Función updateWhatsAppStatusUI():**
```javascript
function updateWhatsAppStatusUI(connected, phoneNumber) {
  const statusElement = document.getElementById('whatsapp-status');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const disconnectBtn = document.getElementById('btn-disconnect-whatsapp');
  
  statusElement.style.display = 'inline-flex';
  
  if (connected && phoneNumber) {
    // Conectado
    statusElement.classList.remove('disconnected');
    statusDot.classList.remove('disconnected');
    statusText.textContent = `Conectado: ${phoneNumber}`;
    disconnectBtn.style.display = 'inline-flex';
  } else {
    // Desconectado
    statusElement.classList.add('disconnected');
    statusDot.classList.add('disconnected');
    statusText.textContent = 'WhatsApp Desconectado';
    disconnectBtn.style.display = 'none';
  }
}
```

**Función disconnectWhatsApp():**
```javascript
async function disconnectWhatsApp() {
  if (!confirm('¿Estás seguro de que deseas desconectar WhatsApp?...')) {
    return;
  }

  try {
    // Mostrar loading
    const disconnectBtn = document.getElementById('btn-disconnect-whatsapp');
    disconnectBtn.innerHTML = '⏳ Desconectando...';
    disconnectBtn.disabled = true;

    // Desconectar en el backend
    const response = await fetch('https://api.kdsapp.site/api/baileys/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId })
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ WhatsApp desconectado correctamente...');
      
      // Actualizar Firebase
      await firebase.database()
        .ref(`tenants/${tenantId}/onboarding/steps/whatsapp_connected`)
        .set(false);
      
      // Redirigir al onboarding
      window.location.href = `/onboarding?tenant=${tenantId}`;
    } else {
      throw new Error(data.error || 'Error al desconectar');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error: ' + error.message);
    
    // Restaurar botón
    const disconnectBtn = document.getElementById('btn-disconnect-whatsapp');
    disconnectBtn.innerHTML = '📱 Desconectar WhatsApp';
    disconnectBtn.disabled = false;
  }
}
```

---

## 🎨 Diseño Visual

### Estados Visuales

#### Estado: Conectado
```
╔════════════════════════════════════════════════╗
║  [KDS] Mi Restaurante                         ║
║                                                ║
║  [🟢 Conectado: +54 9 351 XXX XXXX] [🗑️ Des...║
║  [📺 Ver KDS] [🏠 Inicio]                     ║
╚════════════════════════════════════════════════╝
```

#### Estado: Desconectado
```
╔════════════════════════════════════════════════╗
║  [KDS] Mi Restaurante                         ║
║                                                ║
║  [🔴 WhatsApp Desconectado]                   ║
║  [📺 Ver KDS] [🏠 Inicio]                     ║
╚════════════════════════════════════════════════╝
```

### Animaciones

- **Dot pulsante:** El punto verde pulsa suavemente cuando está conectado
- **Hover effect:** El botón se anima al pasar el mouse
- **Loading state:** El botón muestra "⏳ Desconectando..." durante la acción

---

## 🧪 Testing

### Prueba 1: Verificar Estado Conectado

1. Conectar WhatsApp desde onboarding
2. Ir al dashboard
3. **Resultado esperado:**
   - Se muestra "🟢 Conectado: +54..."
   - Botón "Desconectar WhatsApp" visible

### Prueba 2: Desconectar WhatsApp

1. Click en "Desconectar WhatsApp"
2. Confirmar en el modal
3. **Resultado esperado:**
   - Botón muestra "⏳ Desconectando..."
   - Alert de éxito
   - Redirección al onboarding
   - QR code visible para reconectar

### Prueba 3: Estado Desconectado

1. Ir al dashboard sin WhatsApp conectado
2. **Resultado esperado:**
   - Se muestra "🔴 WhatsApp Desconectado"
   - Botón "Desconectar" NO visible

### Prueba 4: Error en Desconexión

1. Desactivar backend temporalmente
2. Intentar desconectar
3. **Resultado esperado:**
   - Alert de error
   - Botón restaurado a estado original

---

## 📊 Endpoints Utilizados

### GET /api/baileys/status
```
Query: ?tenantId=xxx
Response: {
  connected: boolean,
  phoneNumber: string | null,
  lastSeen: string
}
```

### POST /api/baileys/disconnect
```
Body: { tenantId: string }
Response: {
  success: boolean,
  message: string
}
```

---

## 🔄 Flujo Completo

```
┌─────────────────────┐
│ Usuario en Dashboard│
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ checkWhatsAppStatus │ (Al cargar página)
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ GET /api/baileys/   │
│     status          │
└──────────┬──────────┘
           │
           ├── Conectado ──> Mostrar botón "Desconectar"
           │
           └── Desconectado ──> Ocultar botón
           
           
Usuario click "Desconectar WhatsApp"
           │
           v
┌─────────────────────┐
│ Confirmación        │
└──────────┬──────────┘
           │ ¿Confirma?
           │
           v
┌─────────────────────┐
│ POST /api/baileys/  │
│     disconnect      │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ Actualizar Firebase │
│ whatsapp_connected  │
│     = false         │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ Redirigir a         │
│ /onboarding         │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ Escanear nuevo QR   │
└─────────────────────┘
```

---

## ✅ Checklist

- [x] Estilos CSS para estado de WhatsApp
- [x] HTML del botón en header
- [x] Función checkWhatsAppStatus()
- [x] Función updateWhatsAppStatusUI()
- [x] Función disconnectWhatsApp()
- [x] Integración con API de Baileys
- [x] Manejo de errores
- [x] Confirmación antes de desconectar
- [x] Animaciones y efectos visuales
- [ ] Testing en producción
- [ ] Documentar en guía de usuario

---

## 🚀 Despliegue

```bash
git add dashboard.html
git commit -m "feat: agregar botón de desconexión de WhatsApp en dashboard"
git push origin main
firebase deploy --only hosting
```

---

## 📝 Notas

- El botón solo es visible cuando hay una sesión activa de WhatsApp
- La desconexión es instantánea y cierra la sesión de Baileys
- El usuario puede reconectar inmediatamente escaneando un nuevo QR
- No se pierden datos de menú, mensajes o configuración
- El onboarding detecta automáticamente que hay que reconectar WhatsApp

---

**Fin de la documentación**

