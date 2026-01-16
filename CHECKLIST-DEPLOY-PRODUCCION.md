# 🚀 Checklist de Despliegue a Producción - Baileys

**Fecha:** 16 de enero de 2025  
**Versión:** 1.0.0  
**Objetivo:** Poner en producción el onboarding con Baileys

---

## ✅ PRE-DESPLIEGUE (Local)

### 1. Verificación de Migración
- [ ] Ejecutar `./scripts/verify-baileys-migration.sh`
- [ ] Resultado: ✅ Todas las verificaciones pasadas
- [ ] Backups creados correctamente

### 2. Test Local
```bash
# Iniciar servidor
npm start
```
- [ ] Servidor inicia sin errores
- [ ] Puerto 3000 disponible
- [ ] Logs muestran "Server running on port 3000"

### 3. Test de Onboarding (Local)
```bash
# Abrir en navegador
open http://localhost:3000/onboarding.html
```
- [ ] Página carga correctamente
- [ ] Botón "Conectar WhatsApp" visible
- [ ] Click en botón inicia conexión
- [ ] QR se genera (ver estado "Escanea este código QR...")
- [ ] QR es válido (probado en WhatsApp real)
- [ ] Escaneo conecta exitosamente
- [ ] Redirección a dashboard funciona
- [ ] Sesión persiste después de recargar

### 4. Test de API (Local)
```bash
# Health check
curl http://localhost:3000/api/baileys/health

# Debería retornar:
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```
- [ ] Health check responde OK
- [ ] Endpoints responden correctamente

---

## 📦 COMMIT Y PUSH

### 5. Git Status
```bash
git status
```
- [ ] Ver cambios pendientes
- [ ] Verificar archivos a commitear

### 6. Commit Automático
```bash
./scripts/commit-baileys-migration.sh
```
**O manual:**
```bash
git add .
git commit -m "feat: Migración completa de onboarding a Baileys"
git push origin main
```
- [ ] Commit exitoso
- [ ] Push exitoso
- [ ] Verificar en GitHub que los cambios están

---

## 🌐 DESPLIEGUE (Producción)

### 7. Railway/Render (Auto-Deploy)
Si usas Railway:
- [ ] Railway detecta push automáticamente
- [ ] Build inicia automáticamente
- [ ] Deploy completa sin errores
- [ ] Logs muestran "Server running on port..."

### 8. Variables de Entorno
Verificar en Railway/Render:
```bash
NODE_ENV=production
PORT=3000  # Railway asigna automáticamente
```
- [ ] Variables configuradas correctamente

### 9. Health Check (Producción)
```bash
curl https://kdsapp.site/api/baileys/health
```
**Resultado esperado:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-16T...",
  "version": "1.0.0"
}
```
- [ ] Health check responde OK
- [ ] Timestamp es actual
- [ ] No hay errores en respuesta

---

## 🧪 TESTING EN PRODUCCIÓN

### 10. Test de Onboarding (Producción)
```bash
open https://kdsapp.site/onboarding.html
```

#### Verificar:
- [ ] Página carga sin errores (200 OK)
- [ ] CSS se carga correctamente
- [ ] No hay errores en consola del navegador
- [ ] Diseño se ve profesional (igual que antes)

#### Test de Conexión:
- [ ] Click en "Conectar WhatsApp"
- [ ] Estado cambia a "Conectando..."
- [ ] QR aparece en pantalla
- [ ] QR es válido (no da error al escanear)

#### Test de Escaneo:
- [ ] Escanear QR con WhatsApp real
- [ ] WhatsApp muestra "Vincular un dispositivo"
- [ ] Nombre del dispositivo: "KDS"
- [ ] Conexión se establece exitosamente
- [ ] Estado cambia a "¡Conectado!" (✅ verde)

#### Test de Redirección:
- [ ] Después de conectar, espera 2 segundos
- [ ] Redirección automática a `/dashboard`
- [ ] Dashboard carga correctamente

### 11. Test de Persistencia
- [ ] Recargar `/onboarding.html`
- [ ] Debería mostrar estado "Conectado" (si aún está conectado)
- [ ] O mostrar botón "Conectar" si la sesión expiró

### 12. Test de Desconexión
```bash
# Endpoint de desconexión
curl -X POST https://kdsapp.site/api/baileys/disconnect \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user"}'
```
- [ ] Respuesta exitosa
- [ ] WhatsApp se desconecta
- [ ] Sesión se limpia correctamente

---

## 📊 MONITOREO (Primeras 24h)

### 13. Logs de Producción
```bash
# Railway
railway logs

# O en dashboard web
open https://railway.app/project/...
```

#### Verificar:
- [ ] No hay errores críticos
- [ ] Conexiones se establecen correctamente
- [ ] QR se genera sin problemas
- [ ] Sessions se persisten
- [ ] No hay memory leaks

### 14. Métricas
Monitorear en Railway/Render:
- [ ] CPU usage < 50%
- [ ] Memory usage < 500MB
- [ ] Response time < 500ms
- [ ] No hay crashes

### 15. Usuarios Reales
- [ ] Pedir a 1-2 restaurantes que prueben
- [ ] Verificar que pueden conectar WhatsApp
- [ ] Confirmar que reciben pedidos
- [ ] Recopilar feedback

---

## 🐛 TROUBLESHOOTING

### Problema: QR no se genera
**Solución:**
```bash
# 1. Verificar logs
railway logs --tail

# 2. Verificar endpoint
curl https://kdsapp.site/api/baileys/connect -X POST

# 3. Verificar que baileys-controller está cargado
grep -r "baileys-routes" server/index.js
```

### Problema: QR no escanea
**Solución:**
- Verificar que el número no esté conectado en otro dispositivo
- Probar con otro número de WhatsApp
- Verificar logs de WhatsApp: "Vinculación fallida"

### Problema: Desconexión inesperada
**Solución:**
- Ver logs de sesión
- Puede ser timeout de WhatsApp (normal después de inactividad)
- Reconectar con nuevo QR

### Problema: "Session not found"
**Solución:**
- Verificar storage en servidor
- Puede necesitar reconexión
- Limpiar sesión antigua: DELETE `/api/baileys/sessions/:userId`

---

## ✅ POST-DESPLIEGUE

### 16. Documentación
- [ ] Actualizar README.md con nuevas instrucciones
- [ ] Documentar URLs de producción
- [ ] Documentar endpoints Baileys
- [ ] Crear guía para nuevos devs

### 17. Cleanup (Opcional)
```bash
# Eliminar archivos legacy si ya no se usan
rm -f facebook-config.js
rm -f onboarding-2.html
rm -f onboarding-debug.html
```
- [ ] Decidir si eliminar archivos Meta
- [ ] Hacer commit si se eliminan

### 18. Comunicación
- [ ] Notificar a stakeholders que la migración está completa
- [ ] Enviar instrucciones de uso a restaurantes
- [ ] Programar sesión de Q&A si es necesario

---

## 🎊 MIGRACIÓN COMPLETADA

### Resultado Esperado:
- ✅ **onboarding.html** usa Baileys (no Meta)
- ✅ **QR funcional** en producción
- ✅ **Conexión exitosa** con WhatsApp real
- ✅ **Dashboard redirect** funciona
- ✅ **Sesiones persisten** correctamente
- ✅ **0% downtime** durante migración
- ✅ **0% costos** de Meta API
- ✅ **100% funcional** con Baileys

---

## 📞 Contacto en Caso de Emergencia

**Si algo falla en producción:**

1. **Rollback inmediato:**
   ```bash
   cp onboarding-meta-backup.html onboarding.html
   git commit -m "rollback: Revertir a Meta API temporalmente"
   git push origin main
   ```

2. **Verificar logs:**
   ```bash
   railway logs --tail
   ```

3. **Contactar soporte:**
   - Revisar `/propuesta/TROUBLESHOOTING.md`
   - Abrir issue en GitHub
   - Revisar documentación Baileys

---

## 📝 Notas Finales

**Tiempo estimado total:** 30-45 minutos

**Prioridad:**
1. ✅ Verificación local (crítico)
2. ✅ Commit y push (crítico)
3. ✅ Deploy a producción (crítico)
4. ✅ Test en producción (crítico)
5. 📊 Monitoreo 24h (importante)
6. 📄 Documentación (importante)
7. 🧹 Cleanup (opcional)

---

**Estado actual:** ⏳ LISTO PARA DESPLIEGUE

**Próximo paso:** Ejecutar `./scripts/commit-baileys-migration.sh`

---

*Checklist generado automáticamente - 16/01/2025*
