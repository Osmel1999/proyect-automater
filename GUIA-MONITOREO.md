# 📊 GUÍA DE MONITOREO - Sistema de Restauración de Sesiones

**Fecha de deploy:** 20 enero 2026  
**Estado:** 🟢 OPERACIONAL  
**URL:** https://api.kdsapp.site

---

## 🔍 CÓMO MONITOREAR EL SISTEMA

### 1. Verificar Logs en Railway

```bash
# Ver logs en tiempo real
railway logs

# Ver logs de las últimas 2 horas
railway logs --tail 200
```

### 2. Logs Importantes a Buscar

#### ✅ Inicio exitoso del servidor:
```
✅ [Startup] Servidor completamente inicializado
```

#### ✅ Restauración de sesiones al inicio:
```
[2026-01-20T15:34:20.294Z] 💧 RESTAURANDO SESIONES WHATSAPP
📊 Total de tenants encontrados: X
🔌 Tenants con WhatsApp conectado: Y
📊 RESUMEN DE RESTAURACIÓN:
   ✅ Exitosas: X/Y
   ❌ Fallidas:  Z/Y
   📈 Tasa éxito: XX%
```

**Esperado:**
- Tasa de éxito > 95%
- Fallidas = 0 (después de los primeros tenants reales)

#### ✅ Heartbeat funcionando:
```
[INFO] [Heartbeat] 💓 Revisando salud de sesiones...
[INFO] [Heartbeat] 📊 Sesiones activas: X
[INFO] [Heartbeat] ✅ Saludables: X/X | ⚠️ No saludables: 0/X
```

**Esperado:**
- Se ejecuta cada 2 minutos
- "No saludables" debe ser 0 o muy bajo

#### ✅ Reconexión automática:
```
[WARN] [Heartbeat] ⚠️ Sesión no saludable: tenant_xxx (estado: close)
[INFO] [Heartbeat] 🔄 Intentando reconectar sesión: tenant_xxx
[INFO] [Heartbeat] ✅ Reconexión exitosa para: tenant_xxx
```

**Esperado:**
- Reconexiones exitosas en < 30 segundos
- Máximo 1-2 reconexiones por hora en red estable

---

## ⚠️ ERRORES A INVESTIGAR

### ❌ Error crítico en restauración:
```
❌ ERROR FATAL EN RESTAURACIÓN
```
**Acción:** Revisar conectividad con Firestore, credenciales Firebase, o permisos.

### ❌ Error al hidratar sesión:
```
❌ Error hidratando sesión para tenant_xxx
```
**Acción:** 
- Verificar que exista `creds` en Firestore: `creds/tenant_xxx`
- Revisar estructura del documento
- Confirmar que `whatsappConnected: true` en Realtime DB

### ❌ Fallo en reconexión por heartbeat:
```
[ERROR] [Heartbeat] ❌ Error en reconexión para tenant_xxx
```
**Acción:**
- Revisar logs de Baileys para más detalles
- Puede indicar número WhatsApp baneado o credenciales corruptas
- Pedir al usuario que vuelva a conectar (escanear QR)

### ❌ Sesiones consistentemente no saludables:
```
[INFO] [Heartbeat] ⚠️ No saludables: 5/10
```
**Acción:**
- Si > 20% están no saludables, puede indicar problema de red
- Revisar conectividad de Railway con WhatsApp servers
- Considerar aumentar timeout de reconexión

---

## 📈 MÉTRICAS CLAVE

### Al inicio del servidor:
| Métrica | Valor esperado | Acción si falla |
|---------|----------------|-----------------|
| **Tasa de restauración** | > 95% | Revisar Firestore y credenciales |
| **Tiempo de startup** | < 30s (con < 50 tenants) | Optimizar batch size |
| **Errores fatales** | 0 | Revisar logs completos |

### Durante operación:
| Métrica | Valor esperado | Acción si falla |
|---------|----------------|-----------------|
| **Sesiones saludables** | > 95% | Revisar conectividad de red |
| **Reconexiones por hora** | < 2 por sesión | Revisar estabilidad de red |
| **Errores de reconexión** | 0 | Revidar credenciales o bans |

---

## 🧪 PRUEBAS MANUALES

### Prueba 1: Railway Sleep y Restauración

**Objetivo:** Verificar que las sesiones se restauran después de un sleep.

**Pasos:**
1. Conectar WhatsApp de un tenant (escanear QR en onboarding)
2. Verificar que aparece conectado en el dashboard
3. Dejar el servidor inactivo por 30-60 minutos (para forzar sleep)
4. Hacer una petición HTTP para despertar Railway:
   ```bash
   curl https://api.kdsapp.site/health
   ```
5. Revisar logs de Railway:
   ```bash
   railway logs --tail 50
   ```
6. **Resultado esperado:**
   - Ver logs de "💧 RESTAURANDO SESIONES WHATSAPP"
   - Ver "✅ Exitosas: 1/1" (o el número de tenants conectados)
   - El dashboard debe mostrar WhatsApp conectado SIN necesidad de escanear QR

**Criterio de éxito:** ✅ Usuario NO necesita escanear QR nuevamente.

---

### Prueba 2: Reconexión por Heartbeat

**Objetivo:** Verificar que el heartbeat reconecta sesiones caídas.

**Pasos:**
1. Simular pérdida de conexión:
   - Opción A: Desconectar WhatsApp manualmente desde el celular (cerrar WhatsApp Web)
   - Opción B: Forzar desconexión desde Railway (restart del container)
2. Esperar 2-3 minutos (intervalo del heartbeat)
3. Revisar logs:
   ```bash
   railway logs --tail 100 | grep Heartbeat
   ```
4. **Resultado esperado:**
   - Ver "⚠️ Sesión no saludable: tenant_xxx"
   - Ver "🔄 Intentando reconectar sesión: tenant_xxx"
   - Ver "✅ Reconexión exitosa para: tenant_xxx"

**Criterio de éxito:** ✅ Reconexión automática en < 2 minutos.

---

### Prueba 3: Múltiples Tenants

**Objetivo:** Verificar que el sistema escala con múltiples tenants.

**Pasos:**
1. Onboardear 5-10 tenants reales
2. Conectar WhatsApp de cada uno (escanear QR)
3. Forzar restart del servidor:
   ```bash
   railway restart
   ```
4. Revisar logs de restauración:
   ```bash
   railway logs --tail 100
   ```
5. **Resultado esperado:**
   - Ver procesamiento en lotes de 5
   - Delay de 2s entre lotes
   - "✅ Exitosas: X/X" con tasa > 95%
   - Tiempo total de restauración < 30s

**Criterio de éxito:** ✅ Todas las sesiones restauradas en < 30s.

---

## 🚨 COMANDOS ÚTILES

### Ver logs de las últimas 2 horas:
```bash
railway logs --tail 200
```

### Ver solo logs de restauración:
```bash
railway logs | grep "RESTAURANDO\|RESUMEN DE RESTAURACIÓN"
```

### Ver solo logs de heartbeat:
```bash
railway logs | grep Heartbeat
```

### Ver errores críticos:
```bash
railway logs | grep "ERROR\|FATAL"
```

### Forzar restart del servidor:
```bash
railway restart
```

### Ver estado del servicio:
```bash
railway status
```

---

## 📊 DASHBOARD DE MÉTRICAS (Futuro)

### Métricas recomendadas para agregar:

1. **Prometheus/Grafana:**
   - Counter: `sessions_restored_total` (total de sesiones restauradas)
   - Counter: `session_restoration_failures_total` (total de fallos)
   - Gauge: `active_sessions` (número de sesiones activas)
   - Histogram: `session_restoration_duration_seconds` (tiempo de restauración)
   - Counter: `heartbeat_reconnections_total` (total de reconexiones)

2. **Alertas:**
   - Si tasa de restauración < 90%
   - Si > 5 reconexiones en 1 hora
   - Si errores fatales > 0
   - Si tiempo de startup > 60s

3. **Integración con Slack/Email:**
   - Notificación cuando hay error fatal
   - Reporte diario de métricas
   - Alerta cuando sesión no puede reconectarse después de 3 intentos

---

## 🎯 CHECKLIST DIARIO (Primeras 2 semanas)

### Lunes a Viernes:
- [ ] Revisar logs de errores de las últimas 24h
- [ ] Verificar tasa de restauración en cada startup
- [ ] Confirmar que heartbeat está activo
- [ ] Revisar número de reconexiones (debe ser bajo)

### Cada Viernes:
- [ ] Generar reporte semanal de métricas
- [ ] Documentar incidentes y resoluciones
- [ ] Optimizar configuración si es necesario
- [ ] Actualizar documentación con aprendizajes

---

## 📞 SOPORTE

### Si algo falla:

1. **Recopilar información:**
   ```bash
   railway logs --tail 500 > debug.log
   ```

2. **Revisar archivos de documentación:**
   - `IMPLEMENTACION-COMPLETADA.md` - Detalles técnicos
   - `RESUMEN-DEPLOY-FINAL.md` - Estado del deploy
   - `PROBLEMAS-Y-PROPUESTA-SESIONES.md` - Contexto del problema
   - `ANALISIS-RECONEXION-BAILEYS.md` - Análisis técnico

3. **Ejecutar diagnóstico:**
   - Verificar conectividad con Firebase
   - Revisar permisos de Firestore
   - Confirmar que Railway tiene suficientes recursos
   - Verificar que el código esté actualizado en Railway

---

**Estado:** 🟢 SISTEMA OPERACIONAL  
**Última actualización:** 20 enero 2026, 10:45 AM

---

**FIN DEL DOCUMENTO**
