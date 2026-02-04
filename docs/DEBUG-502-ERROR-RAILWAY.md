# 🔍 Diagnóstico y Solución: Error 502 en Railway

**Fecha**: 3 de febrero de 2026  
**Problema**: Servidor crasheando con error 502 Bad Gateway  
**Estado**: 🔴 EN INVESTIGACIÓN

---

## 📊 Síntomas

1. **Error 502 Bad Gateway** intermitente desde el frontend
2. **CORS error**: "No 'Access-Control-Allow-Origin' header"
3. Servidor se reinicia constantemente
4. Logs muestran que el proxy ISP se inicializa correctamente
5. Frontend puede obtener QR pero luego pierde conexión

---

## 🔍 Análisis de Logs

### ✅ Funcionando Correctamente

```
✅ Proxy Manager inicializado - Sistema AUTO-ESCALABLE
✨ ISP PROXY: IP estable y confiable por sesión
📡 Proxy base cargado desde ENV (SOCKS5 - ISP)
🌐 Sistema AUTO-ESCALABLE activado
```

### ⚠️ Comportamiento Sospechoso

1. El servidor se reinicia después de conectarse exitosamente
2. Los logs muestran múltiples reinicios
3. El error 502 aparece después de algunos segundos

---

## 🎯 Posibles Causas

### 1. **Timeout del Proxy ISP** (Más Probable)

El proxy ISP puede estar causando timeouts largos que hacen que Railway piense que el servidor está muerto.

**Síntomas**:
- Conexión inicial funciona
- Después de aplicar proxy post-conexión, el servidor se vuelve lento
- Railway mata el proceso por timeout

**Solución**: 
- Aumentar timeouts en Baileys
- Desactivar proxy para QR (ya está hecho)
- Verificar latencia del proxy en producción

### 2. **Crash por Uso de Memoria**

Railway tiene límites de memoria. Baileys + Proxy pueden consumir mucha RAM.

**Solución**:
- Monitorear uso de memoria
- Optimizar session manager
- Considerar upgrade de plan Railway

### 3. **Error en la Configuración del Proxy**

El formato HTTP en lugar de SOCKS5 puede causar problemas.

**Problema**: 
```javascript
// Estamos usando HTTP:
PROXY_LIST=http://username:password@host:port

// Pero los logs dicen "SOCKS5 - ISP"
```

**Solución**: Verificar si realmente necesitamos SOCKS5 o HTTP está bien.

### 4. **Railway Healthcheck Fallando**

Railway puede estar haciendo healthchecks que fallan por el proxy.

**Solución**: Configurar healthcheck explícito

---

## 🛠️ Acciones Inmediatas

### Acción 1: Verificar si el Proxy Causa el Crash

Temporalmente deshabilitar el proxy para confirmar:

```bash
railway variables --set "PROXY_TYPE=none"
```

Si el servidor funciona sin proxy → el problema es el proxy  
Si sigue crasheando → el problema es otra cosa

### Acción 2: Revisar Límites de Railway

```bash
railway status
```

Verificar:
- Uso de CPU
- Uso de memoria
- Límites del plan actual

### Acción 3: Aumentar Timeouts

Modificar `session-manager.js` para aumentar timeouts:

```javascript
connectTimeoutMs: 180000, // 3 minutos en lugar de 60s
```

### Acción 4: Agregar Healthcheck Explícito

Asegurar que `/health` responde rápido sin pasar por proxy.

---

## 🔧 Soluciones a Implementar

### Solución 1: Desactivar Proxy Temporalmente ✅ PROBAR PRIMERO

```bash
railway variables --set "PROXY_TYPE=none"
```

Esto confirma si el proxy es la causa.

### Solución 2: Usar Proxy Solo Para Mensajes (No para Conexión Inicial)

Ya implementado en modo híbrido, pero verificar que funciona:

```javascript
// En session-manager.js
if (this.hybridProxyMode) {
  // QR sin proxy
  // Mensajes con proxy (aplicado después)
}
```

### Solución 3: Aumentar Timeouts y Retry Logic

```javascript
const socketConfig = {
  connectTimeoutMs: 180000, // 3 min
  defaultQueryTimeoutMs: 90000, // 1.5 min
  keepAliveIntervalMs: 30000,
  retryRequestDelayMs: 5000
};
```

### Solución 4: Monitoreo y Logs Mejorados

Agregar logs específicos cuando se aplica el proxy:

```javascript
console.log(`[${this.tenantId}] 🔍 Proxy aplicado, esperando respuesta...`);
console.log(`[${this.tenantId}] ⏱️ Latencia del proxy: ${latency}ms`);
```

---

## 📈 Plan de Acción

### Paso 1: Confirmar Causa (5 min)
- [ ] Deshabilitar proxy con `PROXY_TYPE=none`
- [ ] Verificar si el servidor funciona estable
- [ ] Conectar WhatsApp sin proxy

### Paso 2: Si es el Proxy (15 min)
- [ ] Revisar formato de URL (HTTP vs SOCKS5)
- [ ] Aumentar timeouts en Baileys
- [ ] Agregar retry logic
- [ ] Verificar latencia del proxy ISP

### Paso 3: Si NO es el Proxy (15 min)
- [ ] Revisar uso de memoria
- [ ] Verificar healthcheck de Railway
- [ ] Buscar errores en otros servicios
- [ ] Revisar logs de Firebase

### Paso 4: Optimización (30 min)
- [ ] Implementar conexión lazy del proxy
- [ ] Agregar fallback automático a Railway IP
- [ ] Mejorar manejo de errores
- [ ] Agregar métricas de performance

---

## 🎓 Aprendizajes

### ✅ Lo que Sabemos

1. El proxy ISP **funciona** en local (test exitoso)
2. El servidor **se inicia correctamente** en Railway
3. El proxy **se configura correctamente** (logs confirman)
4. El problema aparece **después de la conexión inicial**

### ❓ Lo que NO Sabemos

1. ¿Por qué Railway mata el proceso?
2. ¿Es por timeout, memoria o error?
3. ¿El proxy ISP tiene rate limits que afectan?
4. ¿Railway healthcheck falla con el proxy?

---

## 🚀 Próximos Pasos

1. **INMEDIATO**: Probar sin proxy (`PROXY_TYPE=none`)
2. **SI FUNCIONA**: El proxy ISP causa el crash
   - Revisar configuración del proxy
   - Aumentar timeouts
   - Implementar fallback automático
3. **SI NO FUNCIONA**: Buscar otra causa
   - Memoria
   - Healthcheck
   - Otro servicio

---

## 📝 Comando para Probar

```bash
# Deshabilitar proxy temporalmente
railway variables --set "PROXY_TYPE=none"

# Verificar que se aplicó
railway variables | grep PROXY_TYPE

# Ver logs en tiempo real
railway logs --tail 100
```

---

**Documentado por**: GitHub Copilot  
**Estado**: 🔴 Investigando  
**Siguiente paso**: Probar sin proxy
