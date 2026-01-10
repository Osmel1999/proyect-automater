# 🚀 PLAN DE MIGRACIÓN DIRECTA A SAAS MULTI-TENANT
**WhatsApp Business API + Embedded Signup**

---

## 📌 ESTADO ACTUAL DEL PROYECTO

### ✅ Lo que ya tienes:
- ✅ Bot funcional con lógica de pedidos (`bot-logic.js`)
- ✅ Parser de pedidos en lenguaje natural (`pedido-parser.js`)
- ✅ Integración con Firebase (Realtime Database)
- ✅ Frontend KDS funcional
- ✅ Sistema de sesiones y carritos
- ✅ Menú configurado (`menu.js`)
- ✅ Servidor Express con Twilio WhatsApp

### 🔄 Lo que vamos a cambiar:
- ❌ **Eliminar**: Twilio WhatsApp API
- ✅ **Agregar**: WhatsApp Business API de Meta
- ✅ **Agregar**: Sistema multi-tenant
- ✅ **Agregar**: Embedded Signup para onboarding automático
- ✅ **Agregar**: Cifrado de credenciales
- ✅ **Modificar**: Estructura de Firebase para multi-tenant

---

## 🎯 ARQUITECTURA OBJETIVO

```
┌─────────────────────────────────────────────────────────────┐
│                    META BUSINESS PLATFORM                    │
│  (Tu App aprobada con Embedded Signup habilitado)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ OAuth 2.0 Flow
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              TU PLATAFORMA SAAS - KDS WEBAPP                │
│                                                             │
│  Frontend (onboarding.html)                                │
│     ↓                                                       │
│  Backend (Express)                                         │
│     ├─ /webhook/whatsapp (recibe mensajes)                │
│     ├─ /api/whatsapp/connect (maneja Embedded Signup)     │
│     └─ /api/whatsapp/send (envía mensajes)                │
│     ↓                                                       │
│  Multi-Tenant Logic                                        │
│     ├─ tenant-service.js (gestión de clientes)            │
│     ├─ whatsapp-handler.js (envío/recepción)              │
│     └─ bot-logic.js (lógica actualizada)                  │
│     ↓                                                       │
│  Firebase (Base de datos multi-tenant)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WhatsApp Messages
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              CLIENTES FINALES (Restaurantes)                │
│                                                             │
│  Cliente A → Número WhatsApp +57 XXX XXX XX01             │
│  Cliente B → Número WhatsApp +57 XXX XXX XX02             │
│  Cliente C → Número WhatsApp +57 XXX XXX XX03             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 PLAN LINEAL DE MIGRACIÓN

### **FASE 1: PREPARACIÓN Y CONFIGURACIÓN META** ⏱️ 2-3 días

#### ✅ 1.1 Configurar Meta Business Manager
1. Ir a https://business.facebook.com
2. Crear cuenta de negocio: **"Kingdom Design SAS"**
3. Verificar negocio (documento legal + dominio web)
4. Completar información de contacto

#### ✅ 1.2 Crear App de Meta
1. Ir a https://developers.facebook.com/apps
2. Crear nueva app → Tipo: **"Empresa"**
3. Nombre: **"KDS WhatsApp Platform"**
4. Email: `info@kingdomdesignpro.com`
5. Asociar con Business Manager

#### ✅ 1.3 Configurar Productos de la App
1. Agregar producto: **WhatsApp**
2. Agregar producto: **Facebook Login** (para Embedded Signup)
3. Crear WhatsApp Business Account (WABA)

#### ✅ 1.4 Configurar Política de Privacidad y Términos
1. Verificar que existan:
   - `https://tu-dominio.com/privacy-policy.html` ✅
   - `https://tu-dominio.com/terms.html` ✅
2. Agregar URLs en la configuración de la app:
   - Configuración → Básica → URL de política de privacidad
   - Configuración → Básica → URL de términos de servicio

#### ✅ 1.5 Preparar Solicitud de Revisión
1. Ir a **Revisión de la app**
2. Solicitar permisos:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
3. Preparar documentación:
   - Descripción clara del propósito de la app
   - Casos de uso detallados
   - Video demo (opcional pero recomendado)
   - Screenshots del flujo de onboarding

#### ✅ 1.6 Obtener Credenciales (para desarrollo)
Mientras esperas aprobación, puedes obtener credenciales temporales:

1. **App ID** y **App Secret**:
   - Configuración → Básica
   - Copiar: `App ID`, `App Secret`

2. **WhatsApp Test Phone**:
   - WhatsApp → Introducción
   - Meta te proporciona un número de prueba
   - Copiar: `Phone Number ID`

3. **Token de Acceso Temporal** (para testing inicial):
   - WhatsApp → Introducción → Tokens de acceso
   - Generar token de 24 horas

**⚠️ NOTA**: El token permanente y Embedded Signup solo estarán disponibles después de la aprobación.

---

### **FASE 2: ACTUALIZAR ESTRUCTURA DE BASE DE DATOS** ⏱️ 1 día

#### ✅ 2.1 Diseñar Estructura Firebase Multi-Tenant

**Nueva estructura en Firebase Realtime Database**:

```
kds-app-7f1d3/
├── tenants/                          # Clientes (Restaurantes)
│   ├── {tenantId}/
│   │   ├── info/
│   │   │   ├── nombre: "Restaurante La Costa"
│   │   │   ├── email: "contacto@lacosta.com"
│   │   │   ├── telefono: "+57 300 123 4567"
│   │   │   ├── direccion: "Calle 123, Bogotá"
│   │   │   ├── fechaRegistro: "2025-01-07T12:00:00Z"
│   │   │   ├── activo: true
│   │   │   └── plan: "basic" | "premium"
│   │   ├── whatsapp/
│   │   │   ├── phoneNumberId: "123456789012345"
│   │   │   ├── wabaId: "987654321098765"
│   │   │   ├── accessTokenEncrypted: "encrypted_token..."
│   │   │   └── configurado: true
│   │   ├── menu/                      # Menú del restaurante
│   │   │   ├── categorias/
│   │   │   │   └── {categoriaId}/
│   │   │   │       ├── nombre: "Entradas"
│   │   │   │       └── orden: 1
│   │   │   └── items/
│   │   │       └── {itemId}/
│   │   │           ├── nombre: "Hamburguesa"
│   │   │           ├── precio: 25000
│   │   │           ├── descripcion: "..."
│   │   │           ├── categoria: "Platos Principales"
│   │   │           └── disponible: true
│   │   ├── pedidos/                   # Pedidos del restaurante
│   │   │   └── {pedidoId}/
│   │   │       ├── clienteNombre: "Juan Pérez"
│   │   │       ├── clienteTelefono: "+57 300 999 8888"
│   │   │       ├── items: [...]
│   │   │       ├── total: 50000
│   │   │       ├── estado: "pendiente" | "preparando" | "listo"
│   │   │       ├── timestamp: 1704628800000
│   │   │       └── timestampLegible: "2025-01-07 10:30:00"
│   │   └── configuracion/             # Configuración específica
│   │       ├── horarios/
│   │       │   ├── lunes: {apertura: "09:00", cierre: "22:00"}
│   │       │   └── ...
│   │       └── mensajes/
│   │           ├── bienvenida: "¡Hola! Bienvenido a..."
│   │           └── despedida: "Gracias por tu pedido..."
│   └── ...
│
├── whatsappNumbers/                   # Índice: Número → TenantId
│   └── {phoneNumberId}/
│       └── tenantId: "tenant_abc123"
│
└── appConfig/                         # Configuración global
    ├── version: "2.0.0"
    └── maintenance: false
```

#### ✅ 2.2 Migrar Datos Actuales

Si ya tienes pedidos en Firebase, crear un script de migración:

**Crear `scripts/migrate-to-multitenant.js`**:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../server/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://kds-app-7f1d3-default-rtdb.firebaseio.com"
});

const db = admin.database();

async function migrar() {
  console.log('🔄 Iniciando migración a multi-tenant...');
  
  // 1. Crear tenant por defecto (tu cliente actual)
  const tenantId = 'tenant_default_001';
  
  // 2. Obtener pedidos actuales
  const pedidosSnapshot = await db.ref('pedidos').once('value');
  const pedidosAntiguos = pedidosSnapshot.val() || {};
  
  // 3. Mover pedidos al nuevo tenant
  for (const [pedidoId, pedido] of Object.entries(pedidosAntiguos)) {
    await db.ref(`tenants/${tenantId}/pedidos/${pedidoId}`).set(pedido);
    console.log(`✅ Pedido migrado: ${pedidoId}`);
  }
  
  // 4. Crear información del tenant
  await db.ref(`tenants/${tenantId}/info`).set({
    nombre: "Cliente Default",
    email: "default@example.com",
    telefono: "+57 300 803 0859", // Tu número actual
    fechaRegistro: new Date().toISOString(),
    activo: true,
    plan: "premium"
  });
  
  // 5. Configurar WhatsApp (lo harás manualmente después)
  await db.ref(`tenants/${tenantId}/whatsapp`).set({
    phoneNumberId: "PENDING",
    wabaId: "PENDING",
    configurado: false
  });
  
  console.log('✅ Migración completada');
  console.log(`📝 Tenant ID: ${tenantId}`);
  
  process.exit(0);
}

migrar().catch(console.error);
```

**Ejecutar migración**:
```bash
node scripts/migrate-to-multitenant.js
```

---

### **FASE 3: ACTUALIZAR CÓDIGO DEL BACKEND** ⏱️ 3-4 días

#### ✅ 3.1 Actualizar Variables de Entorno

**Crear/actualizar `.env`**:

```env
# ====================================
# SERVIDOR
# ====================================
PORT=3000
NODE_ENV=production
BASE_URL=https://tu-proyecto.web.app

# ====================================
# FIREBASE
# ====================================
FIREBASE_PROJECT_ID=kds-app-7f1d3

# ====================================
# WHATSAPP API (META)
# ====================================
WHATSAPP_APP_ID=tu_app_id
WHATSAPP_APP_SECRET=tu_app_secret
WHATSAPP_VERIFY_TOKEN=mi_token_secreto_random_123xyz

# Para cifrar tokens de acceso
ENCRYPTION_KEY=tu_clave_de_cifrado_32_caracteres_minimo

# ====================================
# EMBEDDED SIGNUP
# ====================================
FACEBOOK_APP_ID=tu_app_id
FACEBOOK_APP_SECRET=tu_app_secret
REDIRECT_URI=https://tu-proyecto.web.app/api/whatsapp/callback

# ====================================
# TWILIO (DEPRECADO - Se eliminará)
# ====================================
# TWILIO_ACCOUNT_SID=...
# TWILIO_AUTH_TOKEN=...
# TWILIO_WHATSAPP_FROM=...
```

**Generar `ENCRYPTION_KEY`**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Generar `WHATSAPP_VERIFY_TOKEN`**:
```bash
node -e "console.log(require('crypto').randomBytes(20).toString('hex'))"
```

#### ✅ 3.2 Actualizar Dependencias

**Editar `package.json`**:

```json
{
  "dependencies": {
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "firebase-admin": "^12.0.0",
    "fuzzball": "^2.2.3",
    "string-similarity": "^4.0.4",
    "axios": "^1.6.2",
    "crypto": "^1.0.1"
  },
  "devDependencies": {
    "firebase-tools": "^13.0.0",
    "nodemon": "^3.0.2"
  }
}
```

**Instalar dependencias**:
```bash
npm install axios
npm uninstall twilio
```

#### ✅ 3.3 Crear Servicio de Cifrado

**Crear `server/encryption-service.js`**:

```javascript
const crypto = require('crypto');

// Obtener clave de cifrado desde variables de entorno
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('❌ ENCRYPTION_KEY debe tener al menos 32 caracteres');
}

const algorithm = 'aes-256-cbc';
const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

/**
 * Cifra un texto
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Retornar IV + datos cifrados
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Descifra un texto
 */
function decrypt(encryptedData) {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt
};
```

#### ✅ 3.4 Crear Servicio Multi-Tenant

**Crear `server/tenant-service.js`**:

```javascript
const firebaseService = require('./firebase-service');
const { encrypt, decrypt } = require('./encryption-service');

/**
 * Obtiene información de un tenant por su phoneNumberId
 */
async function getTenantByPhoneId(phoneNumberId) {
  try {
    // 1. Buscar en índice whatsappNumbers
    const indexSnapshot = await firebaseService.get(`whatsappNumbers/${phoneNumberId}`);
    
    if (!indexSnapshot) {
      console.log(`❌ No se encontró tenant para phoneNumberId: ${phoneNumberId}`);
      return null;
    }
    
    const tenantId = indexSnapshot.tenantId;
    
    // 2. Obtener datos del tenant
    const tenantData = await firebaseService.get(`tenants/${tenantId}`);
    
    if (!tenantData || !tenantData.info || !tenantData.info.activo) {
      console.log(`❌ Tenant inactivo o no encontrado: ${tenantId}`);
      return null;
    }
    
    // 3. Descifrar token de acceso
    if (tenantData.whatsapp && tenantData.whatsapp.accessTokenEncrypted) {
      tenantData.whatsapp.accessToken = decrypt(tenantData.whatsapp.accessTokenEncrypted);
    }
    
    return {
      tenantId,
      ...tenantData
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo tenant:', error);
    return null;
  }
}

/**
 * Crea o actualiza un tenant con datos de Embedded Signup
 */
async function createOrUpdateTenant(tenantData) {
  try {
    const {
      tenantId,
      nombre,
      email,
      phoneNumberId,
      wabaId,
      accessToken
    } = tenantData;
    
    // Cifrar token de acceso
    const accessTokenEncrypted = encrypt(accessToken);
    
    // Guardar información del tenant
    await firebaseService.set(`tenants/${tenantId}/info`, {
      nombre,
      email,
      fechaRegistro: new Date().toISOString(),
      activo: true,
      plan: 'basic'
    });
    
    await firebaseService.set(`tenants/${tenantId}/whatsapp`, {
      phoneNumberId,
      wabaId,
      accessTokenEncrypted,
      configurado: true
    });
    
    // Crear índice phoneNumberId → tenantId
    await firebaseService.set(`whatsappNumbers/${phoneNumberId}`, {
      tenantId
    });
    
    console.log(`✅ Tenant creado/actualizado: ${tenantId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error creando/actualizando tenant:', error);
    return false;
  }
}

/**
 * Obtiene el menú de un tenant
 */
async function getTenantMenu(tenantId) {
  try {
    const menu = await firebaseService.get(`tenants/${tenantId}/menu`);
    return menu || null;
  } catch (error) {
    console.error('❌ Error obteniendo menú:', error);
    return null;
  }
}

/**
 * Guarda un pedido para un tenant
 */
async function savePedido(tenantId, pedido) {
  try {
    const pedidoId = `pedido_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await firebaseService.set(`tenants/${tenantId}/pedidos/${pedidoId}`, pedido);
    return pedidoId;
  } catch (error) {
    console.error('❌ Error guardando pedido:', error);
    return null;
  }
}

module.exports = {
  getTenantByPhoneId,
  createOrUpdateTenant,
  getTenantMenu,
  savePedido
};
```

#### ✅ 3.5 Crear Handler de WhatsApp API

**Crear `server/whatsapp-handler.js`**:

```javascript
const axios = require('axios');
const tenantService = require('./tenant-service');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

/**
 * Maneja mensajes entrantes desde WhatsApp
 */
async function handleIncoming(req, res) {
  try {
    // 1. Verificación de webhook (GET)
    if (req.method === 'GET') {
      return verifyWebhook(req, res);
    }
    
    // 2. Procesar mensaje entrante (POST)
    const body = req.body;
    
    // Validar que sea un mensaje de WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }
    
    // Extraer datos del mensaje
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (!value?.messages) {
      return res.sendStatus(200); // No hay mensajes, solo confirmar recepción
    }
    
    const message = value.messages[0];
    const from = message.from; // Número del cliente
    const messageType = message.type;
    const phoneNumberId = value.metadata.phone_number_id; // ID del número que recibió el mensaje
    
    console.log(`📩 Mensaje recibido de ${from} en phoneNumberId: ${phoneNumberId}`);
    
    // 3. Obtener tenant asociado a este número
    const tenant = await tenantService.getTenantByPhoneId(phoneNumberId);
    
    if (!tenant) {
      console.log(`❌ No se encontró tenant para phoneNumberId: ${phoneNumberId}`);
      return res.sendStatus(200);
    }
    
    console.log(`✅ Tenant identificado: ${tenant.tenantId} - ${tenant.info.nombre}`);
    
    // 4. Extraer texto del mensaje
    let messageText = '';
    
    if (messageType === 'text') {
      messageText = message.text.body;
    } else if (messageType === 'interactive') {
      // Manejo de botones/listas interactivas (futuro)
      messageText = message.interactive.button_reply?.title || 
                   message.interactive.list_reply?.title || '';
    } else {
      // Otros tipos de mensaje (imagen, audio, etc.)
      await sendMessage(tenant, from, 
        '❌ Solo puedo procesar mensajes de texto por ahora.');
      return res.sendStatus(200);
    }
    
    // 5. Procesar con bot-logic (lo implementaremos después)
    const botLogic = require('./bot-logic');
    const respuesta = await botLogic.procesarMensaje(from, messageText, tenant);
    
    // 6. Enviar respuesta
    if (respuesta) {
      await sendMessage(tenant, from, respuesta);
    }
    
    res.sendStatus(200);
    
  } catch (error) {
    console.error('❌ Error procesando mensaje:', error);
    res.sendStatus(500);
  }
}

/**
 * Verifica el webhook (challenge de Meta)
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook verificado');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook no verificado');
    res.sendStatus(403);
  }
}

/**
 * Envía un mensaje de WhatsApp
 */
async function sendMessage(tenant, to, text) {
  try {
    const phoneNumberId = tenant.whatsapp.phoneNumberId;
    const accessToken = tenant.whatsapp.accessToken;
    
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: {
        body: text
      }
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Mensaje enviado a ${to}`);
    return response.data;
    
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  handleIncoming,
  sendMessage
};
```

#### ✅ 3.6 Actualizar Bot Logic para Multi-Tenant

**Modificar `server/bot-logic.js`**:

```javascript
// Al inicio del archivo, agregar:
const tenantService = require('./tenant-service');

// Modificar la función procesarMensaje para aceptar tenant:
async function procesarMensaje(from, texto, tenant) {
  const telefono = from; // Ya no tiene prefijo whatsapp:
  const tenantId = tenant.tenantId;
  
  // Usar sesión con identificador único: tenantId + teléfono
  const sesionKey = `${tenantId}_${telefono}`;
  const sesion = obtenerSesion(sesionKey);
  
  // ... resto de la lógica igual, pero:
  // - Usar tenant.menu en lugar de menu global
  // - Guardar pedidos con: tenantService.savePedido(tenantId, pedido)
  
  // Ejemplo:
  if (texto === 'confirmar') {
    // ... validaciones ...
    
    // Guardar pedido en Firebase bajo el tenant correcto
    const pedidoId = await tenantService.savePedido(tenantId, pedidoFinal);
    
    if (pedidoId) {
      return `✅ *¡Pedido confirmado!*\n\nNúmero: #${pedidoId.slice(-8).toUpperCase()}`;
    }
  }
  
  // ... resto del código
}

// Actualizar mostrarMenu para usar tenant.menu
function mostrarMenu(tenant) {
  // Obtener menú del tenant
  const menu = tenant.menu || {};
  
  // ... generar texto del menú
}
```

#### ✅ 3.7 Crear Endpoints de Embedded Signup

**Agregar en `server/index.js`**:

```javascript
// Al inicio
const axios = require('axios');
const tenantService = require('./tenant-service');

// ... middleware y rutas existentes ...

// ====================================
// EMBEDDED SIGNUP - ONBOARDING
// ====================================

/**
 * Callback de Embedded Signup (Meta redirige aquí después de autorización)
 */
app.get('/api/whatsapp/callback', async (req, res) => {
  try {
    const code = req.query.code; // Código de autorización de Facebook
    
    if (!code) {
      return res.status(400).send('❌ Código de autorización no recibido');
    }
    
    console.log('📝 Código de autorización recibido:', code);
    
    // 1. Intercambiar código por token de acceso
    const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        code: code
      }
    });
    
    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Token de acceso obtenido');
    
    // 2. Obtener información del WABA y Phone Number
    const debugResponse = await axios.get('https://graph.facebook.com/v21.0/debug_token', {
      params: {
        input_token: accessToken,
        access_token: `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
      }
    });
    
    const granularScopes = debugResponse.data.data.granular_scopes;
    
    // Extraer WABA ID y Phone Number ID de los scopes
    let wabaId, phoneNumberId;
    
    for (const scope of granularScopes) {
      if (scope.scope === 'whatsapp_business_messaging') {
        wabaId = scope.target_ids?.[0];
      }
      if (scope.scope === 'whatsapp_business_management') {
        phoneNumberId = scope.target_ids?.[0];
      }
    }
    
    if (!wabaId || !phoneNumberId) {
      console.error('❌ No se pudo extraer WABA ID o Phone Number ID');
      return res.status(400).send('❌ Datos incompletos de WhatsApp');
    }
    
    console.log('✅ WABA ID:', wabaId);
    console.log('✅ Phone Number ID:', phoneNumberId);
    
    // 3. Obtener información del negocio (nombre, email)
    const businessResponse = await axios.get(`https://graph.facebook.com/v21.0/${wabaId}`, {
      params: {
        fields: 'name,id',
        access_token: accessToken
      }
    });
    
    const businessName = businessResponse.data.name;
    
    // 4. Generar ID único para el tenant
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 5. Crear tenant en Firebase
    const tenantCreated = await tenantService.createOrUpdateTenant({
      tenantId,
      nombre: businessName,
      email: 'pending@example.com', // El usuario lo actualizará después
      phoneNumberId,
      wabaId,
      accessToken
    });
    
    if (!tenantCreated) {
      return res.status(500).send('❌ Error creando cliente');
    }
    
    // 6. Redirigir a página de éxito
    res.redirect(`/onboarding-success.html?tenant=${tenantId}`);
    
  } catch (error) {
    console.error('❌ Error en callback de Embedded Signup:', error.response?.data || error.message);
    res.status(500).send('❌ Error procesando autorización');
  }
});

/**
 * Endpoint para obtener información de un tenant (para el dashboard)
 */
app.get('/api/tenant/:tenantId', async (req, res) => {
  try {
    const tenantId = req.params.tenantId;
    const tenantData = await tenantService.get(`tenants/${tenantId}`);
    
    if (!tenantData) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }
    
    // No enviar el token de acceso al frontend
    if (tenantData.whatsapp) {
      delete tenantData.whatsapp.accessToken;
      delete tenantData.whatsapp.accessTokenEncrypted;
    }
    
    res.json(tenantData);
    
  } catch (error) {
    console.error('Error obteniendo tenant:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});
```

---

### **FASE 4: CREAR FRONTEND DE ONBOARDING** ⏱️ 2 días

#### ✅ 4.1 Crear Página de Onboarding

**Crear `onboarding.html`**:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conecta tu WhatsApp - KDS Platform</title>
  <link rel="stylesheet" href="styles.css">
  <style>
    .onboarding-container {
      max-width: 600px;
      margin: 50px auto;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .onboarding-logo {
      width: 150px;
      margin-bottom: 30px;
    }
    
    .onboarding-title {
      font-size: 28px;
      font-weight: 700;
      color: #333;
      margin-bottom: 20px;
    }
    
    .onboarding-description {
      font-size: 16px;
      color: #666;
      margin-bottom: 40px;
      line-height: 1.6;
    }
    
    .btn-connect-whatsapp {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: #25D366;
      color: white;
      padding: 16px 32px;
      border-radius: 30px;
      font-size: 18px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.3s ease;
      cursor: pointer;
      border: none;
    }
    
    .btn-connect-whatsapp:hover {
      background: #20BA5A;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
    }
    
    .features-list {
      text-align: left;
      margin-top: 40px;
      padding-top: 40px;
      border-top: 1px solid #eee;
    }
    
    .feature-item {
      display: flex;
      align-items: start;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .feature-icon {
      font-size: 24px;
    }
    
    .feature-text {
      flex: 1;
    }
    
    .feature-text strong {
      display: block;
      color: #333;
      margin-bottom: 4px;
    }
    
    .feature-text span {
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="onboarding-container">
    <img src="assets/images/kds-logo.webp" alt="KDS Logo" class="onboarding-logo">
    
    <h1 class="onboarding-title">🚀 Conecta tu WhatsApp Business</h1>
    
    <p class="onboarding-description">
      En solo 1 clic, conecta tu número de WhatsApp Business y comienza a 
      recibir pedidos automáticamente. Nuestro bot inteligente se encargará 
      del resto.
    </p>
    
    <button id="btn-connect" class="btn-connect-whatsapp">
      <span style="font-size: 24px;">📱</span>
      Conectar WhatsApp Ahora
    </button>
    
    <div class="features-list">
      <div class="feature-item">
        <div class="feature-icon">✅</div>
        <div class="feature-text">
          <strong>Configuración en 1 minuto</strong>
          <span>Sin complicaciones técnicas, solo autoriza y listo</span>
        </div>
      </div>
      
      <div class="feature-item">
        <div class="feature-icon">🤖</div>
        <div class="feature-text">
          <strong>Bot inteligente incluido</strong>
          <span>Toma pedidos automáticamente 24/7</span>
        </div>
      </div>
      
      <div class="feature-item">
        <div class="feature-icon">📊</div>
        <div class="feature-text">
          <strong>Dashboard de cocina en tiempo real</strong>
          <span>Visualiza y gestiona todos tus pedidos</span>
        </div>
      </div>
      
      <div class="feature-item">
        <div class="feature-icon">🔒</div>
        <div class="feature-text">
          <strong>Datos 100% seguros</strong>
          <span>Cifrado de extremo a extremo</span>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Facebook SDK -->
  <script>
    window.fbAsyncInit = function() {
      FB.init({
        appId: 'TU_FACEBOOK_APP_ID', // ⚠️ REEMPLAZAR
        cookie: true,
        xfbml: true,
        version: 'v21.0'
      });
    };
    
    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/es_LA/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  </script>
  
  <script>
    document.getElementById('btn-connect').addEventListener('click', function() {
      // Lanzar Embedded Signup de Meta
      FB.login(function(response) {
        if (response.authResponse) {
          const code = response.authResponse.code;
          
          // Redirigir al backend con el código
          window.location.href = `/api/whatsapp/callback?code=${code}`;
        } else {
          alert('❌ No se pudo conectar WhatsApp. Por favor, intenta de nuevo.');
        }
      }, {
        config_id: 'TU_CONFIG_ID_DE_EMBEDDED_SIGNUP', // ⚠️ REEMPLAZAR
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {
            // Aquí puedes pre-configurar datos si es necesario
          }
        }
      });
    });
  </script>
</body>
</html>
```

#### ✅ 4.2 Crear Página de Éxito

**Crear `onboarding-success.html`**:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Conexión Exitosa! - KDS Platform</title>
  <link rel="stylesheet" href="styles.css">
  <style>
    .success-container {
      max-width: 600px;
      margin: 50px auto;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .success-icon {
      font-size: 80px;
      margin-bottom: 20px;
      animation: bounceIn 0.8s ease;
    }
    
    @keyframes bounceIn {
      0% { transform: scale(0); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    
    .success-title {
      font-size: 32px;
      font-weight: 700;
      color: #25D366;
      margin-bottom: 20px;
    }
    
    .success-description {
      font-size: 16px;
      color: #666;
      margin-bottom: 40px;
      line-height: 1.6;
    }
    
    .tenant-info {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: left;
    }
    
    .tenant-info-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .tenant-info-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    
    .tenant-info-label {
      font-weight: 600;
      color: #555;
    }
    
    .tenant-info-value {
      color: #333;
    }
    
    .btn-dashboard {
      display: inline-block;
      background: #2196F3;
      color: white;
      padding: 16px 32px;
      border-radius: 30px;
      font-size: 18px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.3s ease;
    }
    
    .btn-dashboard:hover {
      background: #1976D2;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
    }
  </style>
</head>
<body>
  <div class="success-container">
    <div class="success-icon">🎉</div>
    
    <h1 class="success-title">¡WhatsApp Conectado!</h1>
    
    <p class="success-description">
      Tu número de WhatsApp Business ha sido conectado exitosamente. 
      Ahora puedes empezar a recibir pedidos automáticamente.
    </p>
    
    <div class="tenant-info" id="tenant-info">
      <div class="tenant-info-item">
        <span class="tenant-info-label">ID de Cliente:</span>
        <span class="tenant-info-value" id="tenant-id">Cargando...</span>
      </div>
      <div class="tenant-info-item">
        <span class="tenant-info-label">Nombre:</span>
        <span class="tenant-info-value" id="tenant-name">Cargando...</span>
      </div>
      <div class="tenant-info-item">
        <span class="tenant-info-label">Estado:</span>
        <span class="tenant-info-value">✅ Activo</span>
      </div>
    </div>
    
    <a href="/home.html" class="btn-dashboard">
      Ir al Dashboard
    </a>
    
    <div style="margin-top: 40px; color: #999; font-size: 14px;">
      <p><strong>Próximos pasos:</strong></p>
      <ol style="text-align: left; max-width: 400px; margin: 20px auto;">
        <li>Configura tu menú de productos</li>
        <li>Personaliza los mensajes del bot</li>
        <li>Prueba enviando un WhatsApp a tu número</li>
        <li>¡Empieza a recibir pedidos!</li>
      </ol>
    </div>
  </div>
  
  <script>
    // Obtener tenant ID de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const tenantId = urlParams.get('tenant');
    
    if (tenantId) {
      document.getElementById('tenant-id').textContent = tenantId;
      
      // Cargar información del tenant
      fetch(`/api/tenant/${tenantId}`)
        .then(res => res.json())
        .then(data => {
          document.getElementById('tenant-name').textContent = data.info.nombre;
        })
        .catch(err => {
          console.error('Error cargando tenant:', err);
        });
    }
  </script>
</body>
</html>
```

---

### **FASE 5: DESPLIEGUE Y CONFIGURACIÓN** ⏱️ 1 día

#### ✅ 5.1 Desplegar a Producción

**Opción A: Firebase Hosting + Cloud Functions**

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar (si no lo has hecho)
firebase init hosting

# Desplegar
firebase deploy
```

**Opción B: Railway / Render**

```bash
# Commitear cambios
git add .
git commit -m "feat: migración a WhatsApp API multi-tenant con Embedded Signup"
git push origin main

# En Railway/Render, conectar el repo y configurar variables de entorno
```

#### ✅ 5.2 Configurar Webhook en Meta

1. Ir a tu app en https://developers.facebook.com
2. WhatsApp → Configuración
3. Webhook:
   - **URL de devolución de llamada**: `https://tu-dominio.com/webhook/whatsapp`
   - **Token de verificación**: El valor de `WHATSAPP_VERIFY_TOKEN`
   - Clic en "Verificar y guardar"
4. Suscribirse a campos:
   - ✅ `messages`
   - ✅ `message_template_status_update` (opcional)

#### ✅ 5.3 Configurar Embedded Signup

1. Ir a tu app en Meta
2. **Facebook Login** → Configuración
3. **URI de redireccionamiento OAuth válidos**:
   ```
   https://tu-dominio.com/api/whatsapp/callback
   ```
4. **WhatsApp** → Embedded Signup
5. Crear "Configuration" y copiar el **Config ID**
6. Actualizar `onboarding.html` con:
   - `TU_FACEBOOK_APP_ID`
   - `TU_CONFIG_ID_DE_EMBEDDED_SIGNUP`

---

### **FASE 6: TESTING Y LANZAMIENTO** ⏱️ 2-3 días

#### ✅ 6.1 Testing con Test Users

1. En Meta, ir a **Roles** → **Usuarios de prueba**
2. Agregar tu número como test user
3. Abrir `https://tu-dominio.com/onboarding.html`
4. Clic en "Conectar WhatsApp"
5. Autorizar en el popup
6. Verificar que se creó el tenant en Firebase

#### ✅ 6.2 Testing de Conversación

1. Enviar WhatsApp al número conectado: "Hola"
2. El bot debe responder con el menú
3. Hacer un pedido completo
4. Verificar que aparezca en Firebase bajo el tenant correcto
5. Verificar que aparezca en el KDS

#### ✅ 6.3 Testing Multi-Tenant

1. Conectar 2-3 números diferentes mediante Embedded Signup
2. Enviar mensajes desde cada número
3. Verificar que cada conversación está aislada
4. Verificar que los pedidos se guardan bajo el tenant correcto

---

## 📊 CHECKLIST COMPLETO

### FASE 1: Preparación Meta
- [ ] Crear Meta Business Manager
- [ ] Crear app de Meta
- [ ] Configurar WhatsApp Business API
- [ ] Configurar Facebook Login
- [ ] Agregar URLs de política/términos
- [ ] Solicitar revisión de app
- [ ] Obtener credenciales temporales (para desarrollo)

### FASE 2: Base de Datos
- [ ] Diseñar estructura multi-tenant en Firebase
- [ ] Crear script de migración
- [ ] Ejecutar migración de datos existentes
- [ ] Verificar estructura en Firebase Console

### FASE 3: Backend
- [ ] Actualizar `.env` con nuevas variables
- [ ] Actualizar `package.json` (axios, remover twilio)
- [ ] Instalar dependencias: `npm install`
- [ ] Crear `encryption-service.js`
- [ ] Crear `tenant-service.js`
- [ ] Crear `whatsapp-handler.js`
- [ ] Actualizar `bot-logic.js` para multi-tenant
- [ ] Agregar endpoints de Embedded Signup en `index.js`
- [ ] Eliminar código Twilio obsoleto

### FASE 4: Frontend
- [ ] Crear `onboarding.html`
- [ ] Crear `onboarding-success.html`
- [ ] Actualizar `home.html` para mostrar tenant info
- [ ] Configurar Facebook SDK con App ID

### FASE 5: Despliegue
- [ ] Desplegar a producción (Firebase/Railway/Render)
- [ ] Configurar webhook en Meta
- [ ] Configurar redirect URI de OAuth
- [ ] Obtener Config ID de Embedded Signup
- [ ] Actualizar `onboarding.html` con credenciales reales

### FASE 6: Testing
- [ ] Agregar test users en Meta
- [ ] Probar flujo de onboarding completo
- [ ] Probar conversación con bot
- [ ] Probar pedido completo (de texto a Firebase)
- [ ] Probar con múltiples tenants
- [ ] Probar que KDS muestra pedidos correctamente
- [ ] Verificar cifrado de tokens en Firebase

---

## ⚠️ NOTAS IMPORTANTES

### Durante el Desarrollo (App en Revisión)
- ✅ Puedes usar el número de prueba de Meta
- ✅ Puedes usar tokens temporales (24 horas)
- ✅ Solo tú (admin) puedes probar Embedded Signup
- ❌ **NO** puedes generar tokens permanentes
- ❌ **NO** puedes hacer onboarding real de clientes

### Después de Aprobación
- ✅ Tokens permanentes disponibles
- ✅ Embedded Signup funcional para cualquier usuario
- ✅ Números de producción disponibles
- ✅ Webhooks funcionando con cualquier número

### Seguridad
- 🔒 **NUNCA** guardes tokens sin cifrar en Firebase
- 🔒 Usa `encryption-service.js` para cifrar/descifrar
- 🔒 No expongas `ENCRYPTION_KEY` ni `APP_SECRET` en el frontend
- 🔒 Valida siempre que el tenant está activo antes de procesar mensajes

### Costos
- **Meta WhatsApp API**: Gratis primeras 1,000 conversaciones/mes
- **Firebase**: Plan Blaze (pago por uso) - aprox $5-20/mes inicial
- **Hosting**: Firebase Hosting (gratis) o Railway/Render ($5-10/mes)

---

## 🎯 PRÓXIMOS PASOS DESPUÉS DE LANZAR

1. **Dashboard de Administración**
   - Panel para que clientes configuren su menú
   - Estadísticas de pedidos
   - Configuración de horarios

2. **Mensajes de Plantilla (Templates)**
   - Confirmaciones de pedido con botones
   - Notificaciones de estado

3. **Integraciones**
   - Sistema de pagos (Stripe, PayU)
   - Integraciones con POS
   - Sistema de delivery

4. **Análisis**
   - Google Analytics
   - Dashboard de métricas por tenant

---

## 📞 SOPORTE

Si encuentras problemas durante la migración:

1. **Revisar logs**: `firebase functions:log --only` o logs de Railway/Render
2. **Verificar Firebase**: Asegúrate de que los datos se guardan correctamente
3. **Verificar webhook**: En Meta, ve a WhatsApp → Configuración → Webhook Status
4. **Test de conectividad**: Usa Postman para probar endpoints manualmente

---

## ✅ RESUMEN

Este plan te lleva de tu sistema actual (Twilio, single-tenant) a una plataforma SaaS completa (WhatsApp API, multi-tenant, Embedded Signup) de forma **lineal y directa**, sin fases intermedias.

**Tiempo estimado total**: 2-3 semanas (dependiendo de aprobación de Meta)

¡Éxito con la migración! 🚀
