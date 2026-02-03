# 🌐 Configuración de Proxies Rotativos - Anti-Ban System

## 📋 ¿Qué es esto?

Este sistema permite que cada restaurante (tenant) tenga su **propia IP única** al conectarse a WhatsApp, evitando que Meta/WhatsApp detecte múltiples bots desde una sola dirección IP y los banee.

## 🎯 Beneficios

✅ **Anti-Ban**: Cada bot aparece como un usuario diferente desde IPs distintas  
✅ **Escalabilidad**: Puedes tener cientos de restaurantes sin riesgo  
✅ **Resiliencia**: Si una IP es baneada, solo afecta a 1 cliente  
✅ **Transparente**: Funciona automáticamente sin cambios en el dashboard  

---

## 🚀 Opciones de Configuración

### **Opción 1: Variables de Entorno (Railway)** ⭐ RECOMENDADO

En Railway, agrega esta variable de entorno:

```bash
PROXY_LIST=http://user:pass@proxy1.com:port,http://user:pass@proxy2.com:port,http://user:pass@proxy3.com:port
```

**Ejemplo real con Bright Data:**
```bash
PROXY_LIST=http://lum-customer-YOUR_ID:YOUR_PASSWORD@brd.superproxy.io:22225,http://lum-customer-YOUR_ID:YOUR_PASSWORD@brd.superproxy.io:22225
```

---

### **Opción 2: Firebase Realtime Database**

Estructura en Firebase:

```json
{
  "system": {
    "proxies": {
      "enabled": true,
      "list": [
        {
          "id": "proxy-1",
          "url": "http://user:pass@proxy1.com:port",
          "enabled": true,
          "type": "residential"
        },
        {
          "id": "proxy-2",
          "url": "http://user:pass@proxy2.com:port",
          "enabled": true,
          "type": "residential"
        }
      ]
    }
  }
}
```

---

## 🛒 Proveedores de Proxies Recomendados

### **1. Bright Data (antes Luminati)** ⭐⭐⭐⭐⭐
- **Precio**: ~$500/mes por 10GB (o $40/GB)
- **IPs**: 72M+ IPs residenciales reales
- **Países**: 195 países
- **Rotación**: Automática por petición
- **Calidad**: La mejor del mercado
- **Link**: https://brightdata.com/

**Configuración:**
```
http://lum-customer-YOUR_CUSTOMER_ID:YOUR_PASSWORD@brd.superproxy.io:22225
```

---

### **2. Smartproxy** ⭐⭐⭐⭐
- **Precio**: ~$75/mes por 5GB ($15/GB)
- **IPs**: 40M+ IPs residenciales
- **Países**: 195 países
- **Rotación**: Por petición o sticky sessions
- **Link**: https://smartproxy.com/

**Configuración:**
```
http://USERNAME:PASSWORD@gate.smartproxy.com:7000
```

---

### **3. IPRoyal** ⭐⭐⭐⭐
- **Precio**: ~$7/GB (más económico)
- **IPs**: 2M+ IPs residenciales
- **Países**: 195 países
- **Rotación**: Por petición
- **Link**: https://iproyal.com/

**Configuración:**
```
http://USERNAME:PASSWORD@geo.iproyal.com:12321
```

---

### **4. Webshare** ⭐⭐⭐ (Budget-Friendly)
- **Precio**: ~$2.99/mes por 10 proxies datacenter
- **IPs**: Datacenter (no residenciales)
- **Nota**: ⚠️ Menos confiable para WhatsApp (datacenter IPs)
- **Link**: https://www.webshare.io/

---

## 💰 Cálculo de Costos

### Ejemplo: 20 restaurantes activos

**Opción A: Bright Data**
- 20 bots × 50MB/día = 1GB/día = 30GB/mes
- Costo: ~$1,200/mes

**Opción B: Smartproxy**
- 20 bots × 50MB/día = 30GB/mes
- Costo: ~$450/mes

**Opción C: IPRoyal**
- 20 bots × 50MB/día = 30GB/mes  
- Costo: ~$210/mes ⭐ **MEJOR RELACIÓN CALIDAD-PRECIO**

**Opción D: Mixto (Recomendado)**
- 10 GB Bright Data (clientes premium) = $400
- 20 GB IPRoyal (clientes standard) = $140
- **Total: ~$540/mes para 20 restaurantes**

---

## 🔧 Cómo Configurar (Paso a Paso)

### **Paso 1: Elegir proveedor**

Recomendado: **IPRoyal** para empezar (mejor precio)

1. Ve a https://iproyal.com/residential-proxies/
2. Crea cuenta
3. Compra plan (mínimo 1GB = $7)
4. Ve a "Dashboard" → "Residential Proxies"

### **Paso 2: Obtener credenciales**

En el dashboard de IPRoyal, encontrarás:
- **Username**: `usuario_12345`
- **Password**: `password_abc`
- **Endpoint**: `geo.iproyal.com:12321`

### **Paso 3: Configurar en Railway**

1. Ve a tu proyecto en Railway
2. Settings → Variables
3. Agrega variable:

```
PROXY_LIST=http://usuario_12345:password_abc@geo.iproyal.com:12321
```

**Para múltiples proxies:**
```
PROXY_LIST=http://user1:pass1@proxy1.com:port,http://user2:pass2@proxy2.com:port
```

### **Paso 4: Redeploy**

Railway automáticamente redeployará con la nueva configuración.

### **Paso 5: Verificar**

Llama al endpoint de stats:
```bash
curl https://tu-app.railway.app/api/proxy/stats
```

Deberías ver:
```json
{
  "success": true,
  "stats": {
    "totalProxies": 1,
    "assignedProxies": 3,
    "proxyUsage": {
      "proxy-0": ["tenant1", "tenant2", "tenant3"]
    }
  }
}
```

---

## 🧪 Testing

### Verificar que tu proxy funciona:

```bash
# Linux/Mac
curl -x http://USERNAME:PASSWORD@proxy.com:port https://api.ipify.org?format=json

# Deberías ver una IP diferente a la tuya
```

### Ver estadísticas en tiempo real:

```bash
curl https://tu-app.railway.app/api/proxy/stats | jq
```

---

## 📊 Monitoreo

### Logs a buscar:

✅ **Conexión exitosa con proxy:**
```
[tenant123] 🔐 Usando proxy para conexión (Anti-Ban activado)
[tenant123] ✅ Proxy asignado: proxy-0 (residential)
```

⚠️ **Sin proxy:**
```
[tenant123] ⚠️ Sin proxy - usando IP directa del servidor
```

---

## 🔒 Seguridad

### ⚠️ IMPORTANTE: Nunca commitees credenciales al repositorio

❌ **MAL:**
```javascript
const proxy = 'http://user:pass@proxy.com:port'; // NUNCA HACER ESTO
```

✅ **BIEN:**
```javascript
const proxy = process.env.PROXY_LIST; // Desde variables de entorno
```

---

## 🚨 Troubleshooting

### Problema: "No hay proxies disponibles"

**Solución:**
1. Verifica que la variable `PROXY_LIST` está configurada en Railway
2. Verifica formato: `http://user:pass@host:port`
3. Chequea logs al arrancar: debe decir "Cargados X proxies desde ENV"

### Problema: "Connection timeout"

**Solución:**
1. Verifica credenciales del proxy (usuario/password)
2. Prueba el proxy manualmente con curl
3. Verifica que el puerto es correcto
4. Algunos proveedores requieren whitelistear tu IP

### Problema: WhatsApp sigue baneando

**Posibles causas:**
1. Estás usando proxies datacenter (usa residential)
2. Proxies compartidos con otros usuarios
3. Rate limiting muy agresivo (necesitas humanización)
4. Número de teléfono ya marcado como spam

---

## 🎓 Conceptos

### **Proxy Residencial vs Datacenter**

**Residencial** (Recomendado para WhatsApp):
- IPs de usuarios reales (casas, móviles)
- WhatsApp los ve como usuarios normales
- Más caro (~$7-15/GB)
- Menos probabilidad de ban

**Datacenter**:
- IPs de servidores/hosting
- WhatsApp los detecta fácilmente
- Más barato (~$1-3/GB)
- Alta probabilidad de ban

### **Rotación de IPs**

**Por Petición**: Cada request = nueva IP
- Mejor para evitar rate limiting
- Recomendado para WhatsApp

**Sticky Session**: Mantiene IP por X minutos
- Útil si necesitas continuidad
- El sistema actual usa sticky (1 proxy por tenant)

---

## 📞 Soporte

Si tienes problemas:

1. Revisa logs del servidor
2. Llama a `/api/proxy/stats` para ver estado
3. Verifica credenciales del proxy
4. Prueba el proxy manualmente con curl

---

## 🔮 Roadmap Futuro

- [ ] Auto-rotación de proxies si uno falla
- [ ] Health check automático de proxies
- [ ] Soporte para proxy pools por región geográfica
- [ ] Dashboard para gestionar proxies desde el admin
- [ ] Integración con proveedores via API (sin config manual)

---

**Última actualización:** 3 de febrero de 2026
