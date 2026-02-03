# 🔧 Configuración de SOCKS5 para Bright Data

## 📋 URLs de Bright Data

### HTTP Proxy (actual - bloqueado)
```
http://brd-customer-hl_e851436d-zone-whatsapp_bot-country-us:kpwm3gjtjv1l@brd.superproxy.io:33335
```

### SOCKS5 Proxy (nuevo - recomendado)

Bright Data usa el **mismo puerto** para HTTP y SOCKS5, solo cambia el protocolo:

```
socks5://brd-customer-hl_e851436d-zone-whatsapp_bot-country-us:kpwm3gjtjv1l@brd.superproxy.io:33335
```

## 🚀 Comando para configurar en Railway

```bash
railway variables --set PROXY_LIST="socks5://brd-customer-hl_e851436d-zone-whatsapp_bot-country-us:kpwm3gjtjv1l@brd.superproxy.io:33335"
```

## ✅ Verificación

Después de configurar:
1. Railway hará redeploy automático (~2 min)
2. Los logs deberían mostrar: `📡 Proxy base cargado desde ENV (SOCKS5)`
3. Al conectar: `🔗 Agente SOCKS5 creado para session-{tenantId}`

## 🎯 Resultado esperado

- ✅ QR se genera correctamente
- ✅ Handshake de WhatsApp funciona (SOCKS5 no inspecciona WebSocket)
- ✅ Conexión exitosa sin errores 502
- ✅ Proxy aplicado post-conexión para mensajes (anti-ban)

## 🔍 Dominios permitidos en Bright Data

Asegúrate de tener estos dominios whitelisteados:
- `web.whatsapp.com`
- `*.whatsapp.net`
- `*.whatsapp.com`
- `g.whatsapp.net`
- `media.fna.whatsapp.net`
- `mmg.whatsapp.net`
- `pps.whatsapp.net`
- `v.whatsapp.net`
