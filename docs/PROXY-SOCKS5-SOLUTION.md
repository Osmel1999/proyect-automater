# 🔧 Solución: Usar Proxy SOCKS5 para Baileys

## 📋 Problema identificado

Bright Data con proxy HTTP está bloqueando el handshake de autenticación de Baileys con WhatsApp, causando que el servidor se caiga con error 502 después de escanear el QR.

## ✅ Solución propuesta: Proxy SOCKS5

### ¿Por qué SOCKS5?

- ✅ **Compatible con WebSockets** (que usa Baileys)
- ✅ **No inspecciona el tráfico** (HTTP proxy sí lo hace)
- ✅ **Mejor para conexiones bidireccionales** (WhatsApp)
- ✅ **Bright Data lo soporta** (mismo costo)

### 🔧 Implementación

#### 1. Cambiar URL del proxy a SOCKS5

**URL actual (HTTP):**
```
http://brd-customer-hl_e851436d-zone-whatsapp_bot-country-us:kpwm3gjtjv1l@brd.superproxy.io:33335
```

**Nueva URL (SOCKS5):**
```
socks5://brd-customer-hl_e851436d-zone-whatsapp_bot-country-us:kpwm3gjtjv1l@brd.superproxy.io:33335
```

#### 2. Instalar dependencia `socks-proxy-agent`

```bash
npm install socks-proxy-agent
```

#### 3. Modificar `proxy-manager.js`

```javascript
const { SocksProxyAgent } = require('socks-proxy-agent');

getProxyAgent(tenantId) {
  const proxyUrl = this.getProxyUrl(tenantId);
  
  if (proxyUrl.startsWith('socks5://')) {
    return new SocksProxyAgent(proxyUrl);
  }
  
  // Fallback a HTTP
  const { HttpsProxyAgent } = require('https-proxy-agent');
  return new HttpsProxyAgent(proxyUrl);
}
```

#### 4. Configurar en Railway

```bash
railway variables --set PROXY_LIST="socks5://brd-customer-hl_e851436d-zone-whatsapp_bot-country-us:kpwm3gjtjv1l@brd.superproxy.io:33335"
railway variables --set ENABLE_PROXY=true
```

---

## 🧪 Testing

1. Activar proxy SOCKS5
2. Intentar generar QR
3. Escanear QR
4. Verificar que la conexión se completa exitosamente
5. Enviar mensaje de prueba para confirmar que el proxy funciona

---

## 📊 Ventajas vs HTTP Proxy

| Feature | HTTP Proxy | SOCKS5 Proxy |
|---------|-----------|--------------|
| WebSockets | ❌ Limitado | ✅ Nativo |
| Handshake | ❌ Bloqueado | ✅ Compatible |
| Inspección | ⚠️ Puede detectarse | ✅ Transparente |
| Costo | $0.21/bot/mes | $0.21/bot/mes |
| Bright Data | ✅ Soportado | ✅ Soportado |

---

## 🎯 Resultado esperado

Con SOCKS5, la estrategia híbrida debería funcionar correctamente:
- ✅ QR se genera rápido (sin proxy)
- ✅ Handshake completo (con SOCKS5)
- ✅ Mensajes con proxy (anti-ban)
- ✅ Sin errores 502

---

## 📚 Referencias

- [Bright Data SOCKS5 Documentation](https://docs.brightdata.com/api-reference/proxy/socks)
- [socks-proxy-agent npm](https://www.npmjs.com/package/socks-proxy-agent)
- [Baileys WebSocket Configuration](https://github.com/WhiskeySockets/Baileys)
