# 🗺️ NAVEGACIÓN EN META - Dónde Encontrar Cada Cosa

## 🎯 PROBLEMA COMÚN
La interfaz de Meta ha cambiado y las opciones no están donde antes. Esta guía te muestra exactamente dónde encontrar cada configuración.

---

## 📱 OPCIÓN 1: DESDE META FOR DEVELOPERS (Recomendado)

### **URL**: https://developers.facebook.com/

### **Paso a Paso:**

#### **1. Ir a tu App**
```
1. Clic en "My Apps" (esquina superior derecha)
2. Seleccionar tu app: "KDS Cocina"
```

#### **2. Menú Lateral → WhatsApp**
En el menú lateral izquierdo verás:
```
📱 WhatsApp
   ├─ Getting Started      ← AQUÍ configuras todo al inicio
   ├─ API Setup            ← AQUÍ obtienes tokens y Phone Number ID
   ├─ Configuration        ← AQUÍ configuras webhooks
   └─ Phone Numbers        ← AQUÍ gestionas números
```

### **Lo que encuentras en cada sección:**

#### **📄 Getting Started**
- Tutorial paso a paso
- Número de prueba (Test number)
- Enviar primer mensaje
- Guía rápida

#### **⚙️ API Setup**
```
┌─────────────────────────────────────┐
│ API Setup                           │
├─────────────────────────────────────┤
│ Temporary access token              │
│ [tu_token_aqui]  [Copy]            │
│                                     │
│ Phone Number ID                     │
│ 123456789012345                     │
│                                     │
│ WhatsApp Business Account ID        │
│ 987654321098765                     │
│                                     │
│ Send and receive messages           │
│ To: [+57300...]  [Send message]    │
└─────────────────────────────────────┘
```

Aquí encuentras:
- ✅ **Temporary access token** (para copiar)
- ✅ **Phone Number ID** (necesario para API)
- ✅ **WABA ID** (WhatsApp Business Account ID)
- ✅ Botón para **enviar mensaje de prueba**

#### **🔧 Configuration**
```
┌─────────────────────────────────────┐
│ Configuration                       │
├─────────────────────────────────────┤
│ Webhooks                            │
│ Callback URL: [tu_url]  [Edit]     │
│ Verify Token: ********              │
│                                     │
│ Webhook fields                      │
│ ☑ messages                          │
│ ☑ message_status                    │
│                                     │
│ [Subscribe] [Test]                  │
└─────────────────────────────────────┘
```

Aquí configuras:
- ✅ **Webhook URL** (para recibir mensajes)
- ✅ **Verify Token** (para verificar webhook)
- ✅ **Suscripciones** (events como messages, message_status)

#### **📱 Phone Numbers**
```
┌─────────────────────────────────────┐
│ Phone Numbers                       │
├─────────────────────────────────────┤
│ +57 300 123 4567  [Manage]         │
│ Status: Active ✅                   │
│                                     │
│ [+ Add phone number]                │
└─────────────────────────────────────┘
```

Aquí gestionas:
- ✅ **Ver números registrados**
- ✅ **Agregar nuevos números**
- ✅ **Verificar números**
- ✅ **Ver estado** (Active, Pending, etc.)

---

## 📱 OPCIÓN 2: DESDE WHATSAPP MANAGER

### **URL**: https://business.facebook.com/wa/manage/home/

Esta es otra forma de acceder a la misma configuración, pero con una interfaz diferente.

### **Estructura del menú:**

```
WhatsApp Manager
├─ Home                    ← Vista general
├─ Phone Numbers          ← Gestionar números
│  ├─ +57 300 123 4567
│  └─ + Add phone number
│
├─ Message Templates      ← Templates pre-aprobados
├─ Insights              ← Estadísticas
└─ Account Tools         ← Configuración avanzada
```

### **Para configurar Webhooks desde aquí:**
1. Clic en tu número de teléfono
2. Buscar **"Webhooks"** o ir a Configuration
3. O vuelve a Meta for Developers (más fácil)

---

## 🔍 SI NO ENCUENTRAS ALGO

### **Opción A: Usar búsqueda**
En Meta for Developers:
1. Barra superior → icono de búsqueda 🔍
2. Buscar: "webhooks", "phone number", "api setup", etc.

### **Opción B: Acceso directo por URL**

| Lo que buscas | URL Directa |
|---------------|-------------|
| **API Setup** | `https://developers.facebook.com/apps/TU_APP_ID/whatsapp-business/wa-dev-console/` |
| **Webhooks** | `https://developers.facebook.com/apps/TU_APP_ID/webhooks/` |
| **WhatsApp Manager** | `https://business.facebook.com/wa/manage/home/` |
| **Business Settings** | `https://business.facebook.com/settings/` |

Reemplaza `TU_APP_ID` con el ID de tu app.

---

## 📸 CAPTURAS DE REFERENCIA

### **Dashboard de la App:**
```
┌────────────────────────────────────────────────────┐
│ [Meta for Developers]        [My Apps ▼] [Admin]  │
├────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────────────────────┐ │
│ │              │  │ KDS Cocina                   │ │
│ │   Menú       │  │                              │ │
│ │   Lateral    │  │ App ID: 123456789            │ │
│ │              │  │                              │ │
│ │ • Dashboard  │  │ [Quick Actions]              │ │
│ │ • WhatsApp   │  │                              │ │
│ │   • Getting  │  │ • Send test message          │ │
│ │     Started  │  │ • Configure webhooks         │ │
│ │   • API      │  │ • View documentation         │ │
│ │     Setup ←  │  │                              │ │
│ │   • Config   │  │                              │ │
│ │ • Settings   │  │                              │ │
│ └──────────────┘  └──────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE NAVEGACIÓN

Para verificar que encuentras todo:

- [ ] ✅ Encuentro mi app en "My Apps"
- [ ] ✅ Veo el menú "WhatsApp" en el lateral
- [ ] ✅ Veo "API Setup" dentro de WhatsApp
- [ ] ✅ Veo el "Temporary access token" en API Setup
- [ ] ✅ Veo "Phone Number ID" en API Setup
- [ ] ✅ Encuentro "Configuration" para webhooks
- [ ] ✅ Puedo enviar mensaje de prueba desde la interfaz

---

## 🆘 ALTERNATIVA SI NADA FUNCIONA

Si realmente no encuentras las opciones:

### **Usar la API Documentation:**
```
https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
```

Esta guía oficial de Meta te mostrará capturas de pantalla actualizadas y te guiará paso a paso.

---

## 💡 CONSEJO PRO

**La forma más rápida de configurar todo:**

1. Ve a: https://developers.facebook.com/apps/TU_APP_ID/whatsapp-business/wa-dev-console/
2. Esto te lleva directo a **API Setup**
3. Desde ahí tienes todo lo necesario:
   - Token
   - Phone Number ID
   - Envío de prueba
   - Link a Configuration (webhooks)

---

## 🎯 RESUMEN VISUAL

```
Meta for Developers Dashboard
    │
    ├─ My Apps
    │   └─ Tu App (KDS Cocina)
    │       │
    │       ├─ Dashboard
    │       │
    │       └─ WhatsApp ◄─── EMPIEZAS AQUÍ
    │           │
    │           ├─ Getting Started    (Tutorial)
    │           ├─ API Setup          (Tokens, IDs) ◄─── PRINCIPAL
    │           ├─ Configuration      (Webhooks)
    │           └─ Phone Numbers      (Gestionar números)
    │
    └─ Documentation (si te pierdes)
```

---

**Última actualización:** 31 de diciembre de 2024

**Versión de la interfaz:** Meta for Developers v18.0
