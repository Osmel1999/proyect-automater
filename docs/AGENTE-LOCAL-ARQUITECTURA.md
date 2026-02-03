# 🏗️ Arquitectura: Agente Local por Restaurante

## 🎯 **Concepto**

En lugar de conectar desde Railway (IP compartida), cada restaurante ejecuta un **agente local** que:
- Se conecta a WhatsApp desde la **IP del restaurante**
- Se comunica con el servidor central (Railway) via API
- Usa la IP real del negocio = **anti-ban natural**

---

## 📊 **Comparación: Actual vs Propuesta**

### **Arquitectura actual (con problemas):**
```
Restaurante 1  ─┐
Restaurante 2  ─┼──> Railway (IP única) ──> WhatsApp ❌ BAN
Restaurante 3  ─┘        (IP compartida)
```

### **Arquitectura propuesta (anti-ban):**
```
Restaurante 1 ──> Agente Local (IP1) ──> WhatsApp ✅
Restaurante 2 ──> Agente Local (IP2) ──> WhatsApp ✅
Restaurante 3 ──> Agente Local (IP3) ──> WhatsApp ✅
         │              │
         └──────────────┴──> Railway (Solo datos)
```

---

## ✅ **Ventajas**

| Aspecto | Actual (Proxy) | Agente Local |
|---------|---------------|--------------|
| **Costo** | $0.21-0.42/bot/mes | $0 (solo hardware) |
| **Anti-ban** | ⚠️ Riesgo medio | ✅ Riesgo mínimo |
| **Velocidad** | 🟡 Media (latencia proxy) | 🟢 Rápida (directa) |
| **Confiabilidad** | ⚠️ Depende de Bright Data | ✅ Totalmente controlada |
| **Escalabilidad** | 🟡 Limitada por GB | ✅ Ilimitada |
| **Complejidad** | 🟢 Simple (solo config) | 🟡 Media (deploy local) |

---

## 🔧 **Opciones de implementación**

### **1. Desktop App (Electron)**

**Mejor para:** Restaurantes con PC/tablet siempre encendida

**Stack:**
- Electron (cross-platform)
- Node.js + Baileys
- UI para ver estado

**Instalación:**
```bash
# Descargar
https://kdsapp.site/download/KDS-Agent-Setup.exe

# Instalar y ejecutar
1. Doble click en instalador
2. Ingresar Tenant ID
3. Escanear QR
4. ¡Listo!
```

**Requisitos del restaurante:**
- Windows 10+ / Mac / Linux
- 2GB RAM
- Conexión a internet
- PC encendida 24/7

---

### **2. Mobile App (React Native)**

**Mejor para:** Dueños que prefieren usar su celular

**Stack:**
- React Native
- Servicio background
- Notificaciones push

**Instalación:**
```bash
# Desde Play Store / App Store
1. Descargar "KDS WhatsApp Agent"
2. Login con cuenta
3. Activar servicio
4. Listo (funciona en background)
```

**Requisitos del restaurante:**
- Android 8+ o iOS 14+
- Conexión WiFi o datos móviles
- Celular encendido (normal)

---

### **3. Raspberry Pi / Mini PC (RECOMENDADO)** ⭐

**Mejor para:** Máxima confiabilidad y cero mantenimiento

**Hardware:**
- Raspberry Pi 4 (4GB RAM) ~$70
- Tarjeta SD 32GB ~$10
- Fuente de poder ~$10
- **Total: ~$90 por restaurante**

**Software:**
- Raspbian OS Lite
- Docker + KDS Agent Container
- Auto-start en boot

**Instalación:**
```bash
# Pre-configurado, plug & play
1. Conectar a router (Ethernet o WiFi)
2. Conectar a corriente
3. Acceder a http://kds-agent.local
4. Escanear QR
5. ¡Listo!
```

**Ventajas:**
- ✅ Siempre encendido (5W consumo)
- ✅ No requiere PC del restaurante
- ✅ Conexión estable
- ✅ Mantenimiento remoto
- ✅ Costo único (~$90)

---

### **4. Docker Container**

**Mejor para:** Restaurantes con servidor/NAS local

**Stack:**
- Docker Compose
- Node.js + Baileys
- Reverse proxy

**Instalación:**
```bash
# En servidor local del restaurante
docker run -d \
  --name kds-agent \
  --restart always \
  -e TENANT_ID="tenant123" \
  -e API_URL="https://api.kdsapp.site" \
  -p 3001:3001 \
  kdsapp/agent:latest
```

**Requisitos:**
- Docker instalado
- Conocimientos técnicos básicos

---

## 📡 **Comunicación Agente ↔ Servidor Central**

### **Protocolo: WebSocket bidireccional**

```javascript
// Agente Local → Servidor Central
{
  "type": "whatsapp.connected",
  "tenantId": "tenant123",
  "phoneNumber": "+1234567890"
}

{
  "type": "message.received",
  "tenantId": "tenant123",
  "from": "+9876543210",
  "message": "Quiero pedir una pizza"
}

// Servidor Central → Agente Local
{
  "type": "message.send",
  "tenantId": "tenant123",
  "to": "+9876543210",
  "message": "¡Hola! ¿Qué pizza deseas?"
}
```

---

## 🔐 **Seguridad**

### **Autenticación:**
- JWT token por tenant
- Certificados SSL/TLS
- Encriptación end-to-end

### **Datos almacenados localmente:**
- Credenciales de WhatsApp (sesión)
- Cache de mensajes (últimos 24h)

### **Datos en servidor central:**
- Configuración del bot
- Historial de pedidos
- Analytics

---

## 💰 **Análisis de costos**

### **Opción 1: Desktop App**
- Desarrollo: $2,000-3,000 (único)
- Costo por restaurante: $0
- Mantenimiento: Mínimo

### **Opción 2: Mobile App**
- Desarrollo: $5,000-8,000 (único)
- Costo por restaurante: $0
- Mantenimiento: Updates app stores

### **Opción 3: Raspberry Pi** ⭐
- Hardware: $90 por restaurante
- Desarrollo: $1,500-2,000 (único)
- Costo mensual: $0
- **ROI:** 4 meses vs proxy ($0.42/mes/bot)

### **Opción 4: Docker**
- Desarrollo: $1,000-1,500 (único)
- Costo por restaurante: $0
- Requisito: Servidor local

---

## 🎯 **Recomendación**

### **Corto plazo (MVP):**
**Docker Container** para restaurantes técnicos que ya tienen servidor.

### **Mediano plazo (Escalabilidad):**
**Raspberry Pi** enviado pre-configurado a cada restaurante.

### **Largo plazo (Adopción masiva):**
**Desktop App (Electron)** para facilitar instalación sin hardware adicional.

---

## 🚀 **Roadmap de implementación**

### **Fase 1: Proof of Concept (1 semana)**
- Crear agente básico en Node.js
- Probar conexión local → Railway
- Validar que funciona con IP del restaurante

### **Fase 2: Docker Container (2 semanas)**
- Dockerizar agente
- Crear script de instalación
- Probar con 2-3 restaurantes beta

### **Fase 3: Raspberry Pi (1 mes)**
- Configurar imagen de Raspbian
- Auto-provisioning
- Dashboard web local
- Piloto con 10 restaurantes

### **Fase 4: Desktop App (2-3 meses)**
- Desarrollar UI con Electron
- Auto-actualización
- Lanzamiento público

---

## 📚 **Próximos pasos**

1. **Decidir** qué opción implementar primero
2. **Crear** agente básico (Node.js + Baileys)
3. **Probar** localmente en tu máquina
4. **Desplegar** con 1-2 restaurantes piloto
5. **Escalar** según resultados

---

**¿Quieres que empiece a implementar el agente local?** 🚀
