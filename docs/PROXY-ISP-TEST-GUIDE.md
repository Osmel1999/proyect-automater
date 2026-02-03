# 🌐 Configuración de Proxy ISP - Bright Data

## 📋 Pasos para Probar Proxy ISP

### 1. Obtener Credenciales ISP en Bright Data

1. Ir a [Bright Data Dashboard](https://brightdata.com/cp/zones)
2. Crear o seleccionar una zona de tipo **ISP**
3. Copiar las credenciales:
   ```
   Host: brd.superproxy.io
   Port: 22235 (puerto ISP)
   Username: brd-customer-xxxxxxx-zone-isp
   Password: xxxxxxxxxx
   ```

### 2. Configurar Variables de Entorno

Crea un archivo `.env.isp` con las siguientes variables:

```bash
# Configuración del proxy ISP
PROXY_LIST=http://brd-customer-xxxxxxx-zone-isp:xxxxxxxxxx@brd.superproxy.io:22235
PROXY_TYPE=isp

# Nota: Reemplaza 'xxxxxxx' y 'xxxxxxxxxx' con tus credenciales reales
```

### 3. Probar Conectividad Básica

```bash
# Cargar variables de entorno
export $(cat .env.isp | xargs)

# Ejecutar test de conectividad
node scripts/test-isp-proxy.js
```

### 4. Interpretar Resultados

El script probará:
- ✅ **Obtención de IP**: Verifica que el proxy asigna una IP única
- ✅ **Latencia**: Mide el tiempo de respuesta (< 1s = excelente, < 3s = aceptable)
- ✅ **Conexión WhatsApp**: Verifica si WhatsApp bloquea el proxy (crítico)
- ✅ **Soporte WebSocket**: Verifica compatibilidad con Baileys

### 5. Decisión

#### Si todas las pruebas pasan (✅):
```bash
# Usar proxy ISP en producción
export PROXY_TYPE=isp
export PROXY_LIST=http://...

# Iniciar servidor
npm start
```

#### Si las pruebas fallan (❌):
- Si falla "Conexión WhatsApp": El proxy está bloqueado, probar otro puerto
- Si falla "WebSocket": Cambiar a SOCKS5 en lugar de HTTP
- Si todo falla: Implementar solución de túnel por navegador

## 🔧 Configuración Avanzada

### Usar SOCKS5 (Recomendado para Baileys)

```bash
# En lugar de HTTP, usa SOCKS5
PROXY_LIST=socks5://brd-customer-xxxxxxx-zone-isp:xxxxxxxxxx@brd.superproxy.io:22335
PROXY_TYPE=isp
```

### Configurar Sesión Estática

El proxy ISP mantiene la misma IP durante toda la sesión si usas el sufijo de sesión:

```bash
# Formato: username-session-TENANT_ID
PROXY_LIST=http://brd-customer-xxx-zone-isp-session-rest1:pass@brd.superproxy.io:22235
```

El sistema **automáticamente** agrega `-session-TENANT_ID` a cada restaurante.

## 📊 Comparación de Puertos

| Puerto | Tipo | Estabilidad | Velocidad | Costo | Recomendado |
|--------|------|-------------|-----------|-------|-------------|
| 22225 | Residential | ⭐⭐ Baja | ⭐⭐⭐ Media | 💰 Alto | ❌ No |
| 22235 | ISP | ⭐⭐⭐⭐⭐ Alta | ⭐⭐⭐⭐⭐ Alta | 💰💰 Medio | ✅ Sí |
| 33335 | SOCKS5 | ⭐⭐⭐⭐ Alta | ⭐⭐⭐⭐⭐ Alta | 💰💰 Medio | ✅ Sí |

## 🎯 Próximos Pasos

1. **Ahora**: Configurar credenciales ISP en `.env.isp`
2. **Luego**: Ejecutar `node scripts/test-isp-proxy.js`
3. **Después**: Si funciona, configurar en Railway/producción
4. **Finalmente**: Monitorear logs y validar estabilidad

## 💡 Tips

- **ISP es más caro que residential** (~$15-20/mes vs ~$5/mes) pero mucho más estable
- **SOCKS5 es mejor para WebSocket** que HTTP/HTTPS
- **Cada restaurante debe tener su propia sesión** para evitar conflictos
- **El sistema ya soporta auto-escalado** - solo configura el proxy base

## 📞 Soporte

Si el proxy ISP falla, contacta a soporte de Bright Data:
- Email: support@brightdata.com
- Chat: https://brightdata.com/cp/support

Menciona que necesitas usar el proxy para conexiones WebSocket con WhatsApp.

---

**Última actualización**: 3 de febrero de 2026  
**Autor**: Automater Team  
**Estado**: Listo para prueba
