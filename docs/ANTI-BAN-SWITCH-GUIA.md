# 🛡️ Guía de Switch Anti-Ban: Túnel vs Proxy

## Resumen Rápido

El sistema tiene **3 modos de protección anti-ban** que se controlan con una sola variable de entorno:

```bash
ANTI_BAN_MODE=tunnel  # Sistema de túnel (GRATIS) ← DEFAULT
ANTI_BAN_MODE=proxy   # Sistema Bright Data (PAGO)
ANTI_BAN_MODE=direct  # Sin protección (RIESGO)
```

---

## 🔄 Cómo Hacer Switch

### En Railway (Producción)

1. **Ve a tu proyecto en Railway**
2. **Variables → Add Variable**
3. **Agrega o modifica:**

```
ANTI_BAN_MODE=proxy    # Para usar Bright Data
ANTI_BAN_MODE=tunnel   # Para volver al túnel
```

4. **Railway redesplegará automáticamente**

### En Terminal (más rápido)

```bash
# Cambiar a PROXY (Bright Data)
railway variables set ANTI_BAN_MODE=proxy

# Volver a TÚNEL (gratis)
railway variables set ANTI_BAN_MODE=tunnel

# Modo directo (NO RECOMENDADO)
railway variables set ANTI_BAN_MODE=direct
```

---

## 📊 Comparación de Modos

| Característica | 🔧 Tunnel | 🌐 Proxy | ⚠️ Direct |
|---------------|----------|---------|----------|
| **Costo** | GRATIS | ~$0.21-0.42/restaurante | GRATIS |
| **Requiere Dashboard Abierto** | ✅ Sí | ❌ No | ❌ No |
| **IP Visible a WhatsApp** | IP del restaurante | IP de Bright Data | IP de Railway |
| **Riesgo de Ban** | Muy bajo | Muy bajo | ALTO |
| **Funciona 24/7** | Solo si dashboard abierto | ✅ Sí | ✅ Sí |
| **Fallback** | A Railway | A Railway | N/A |

---

## 🔧 Modo Túnel (DEFAULT)

**¿Cómo funciona?**
- El navegador del restaurante actúa como proxy
- WhatsApp ve la IP real del restaurante
- Cuando el dashboard está cerrado, usa fallback a Railway

**Requisitos:**
- Dashboard (`/kds.html`) debe estar abierto
- Service Worker registrado

**Verificar estado:**
```bash
# Ver logs del túnel
railway logs | grep -E "(Túnel|TUNNEL)"
```

---

## 🌐 Modo Proxy (Bright Data)

**¿Cómo funciona?**
- Cada restaurante tiene una IP única de Bright Data
- Funciona 24/7 sin necesidad de dashboard abierto
- Modo híbrido: QR sin proxy, mensajes con proxy

**Configuración requerida:**

1. **En Railway, agregar variables:**
```bash
railway variables set ANTI_BAN_MODE=proxy
railway variables set PROXY_TYPE=isp
railway variables set ISP_PROXY_HOST=brd.superproxy.io
railway variables set ISP_PROXY_PORT=33335
railway variables set ISP_PROXY_USERNAME=tu_username
railway variables set ISP_PROXY_PASSWORD=tu_password
```

2. **Archivo `.env.proxy` ya tiene los valores de ejemplo**

**Costos Bright Data:**
- ISP Proxy: ~$0.21/restaurante/mes (con 50% descuento primeros 3 meses)
- Residential: ~$0.42/restaurante/mes
- Ver `docs/ANALISIS-COSTOS-OPERATIVOS.md` para detalles

---

## ⚠️ Modo Directo (NO RECOMENDADO)

**Solo para pruebas locales.** WhatsApp puede banear la IP de Railway si detecta muchos bots.

```bash
railway variables set ANTI_BAN_MODE=direct
```

---

## 🔍 Verificar Modo Activo

### En Logs de Railway

```bash
# Buscar modo activo
railway logs | grep "Modo Anti-Ban"
```

**Salida esperada:**
```
[tenantXXX] 🛡️ Modo Anti-Ban: TUNNEL
[tenantXXX] 🔧 Sistema de TÚNEL activado - requests vía navegador del restaurante
```

o

```
[tenantXXX] 🛡️ Modo Anti-Ban: PROXY
[tenantXXX] 🌐 ISP Proxy: Modo híbrido (QR sin proxy, mensajes con proxy)
```

### API de Estado

```bash
# Estado del túnel (solo modo tunnel)
curl https://api.kdsapp.site/api/tunnel/status/tu-tenant-id

# Stats del proxy (solo modo proxy)
curl https://api.kdsapp.site/api/proxy/stats
```

---

## 🔄 Escenarios de Switch

### Escenario 1: Probar Bright Data
```bash
# Paso 1: Cambiar a proxy
railway variables set ANTI_BAN_MODE=proxy
railway variables set PROXY_TYPE=isp

# Paso 2: Si no funciona, volver a túnel
railway variables set ANTI_BAN_MODE=tunnel
```

### Escenario 2: Túnel tiene problemas
```bash
# Cambiar temporalmente a proxy
railway variables set ANTI_BAN_MODE=proxy

# Cuando túnel esté arreglado
railway variables set ANTI_BAN_MODE=tunnel
```

### Escenario 3: Pruebas locales sin proxy
```bash
# Solo para desarrollo
export ANTI_BAN_MODE=direct
npm run dev
```

---

## 📝 Archivos Relevantes

| Archivo | Descripción |
|---------|-------------|
| `server/baileys/session-manager.js` | Lógica de switch anti-ban |
| `server/baileys/proxy-manager.js` | Manager de Bright Data |
| `server/tunnel-manager.js` | Manager del túnel navegador |
| `.env.proxy` | Credenciales Bright Data |
| `docs/PROXY-ISP-IMPLEMENTACION-EXITOSA.md` | Guía completa de proxy |

---

## ❓ Troubleshooting

### "No recibo mensajes con proxy"
1. Verifica credenciales de Bright Data
2. Revisa logs: `railway logs | grep "Proxy"`
3. Prueba conexión: `node scripts/quick-test-isp.js`

### "Túnel se desconecta frecuentemente"
1. Verifica que dashboard esté abierto
2. Revisa logs del navegador (F12)
3. El sistema tiene auto-reconexión cada 3 segundos

### "Error de conexión con ambos sistemas"
1. Cambiar temporalmente a `direct` para diagnóstico
2. Verificar que WhatsApp Web funcione
3. Revisar logs de Baileys

---

**Fecha:** 4 de Febrero 2026
**Versión:** 1.0.0
