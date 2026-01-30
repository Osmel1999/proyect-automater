# ✅ Checklist de Validación - Migración Frontend

## Pre-Deploy Checklist

### 1. Validación de Archivos CSS

- [ ] `css/payment-success.css` existe y tiene contenido válido
- [ ] `css/index.css` existe y tiene contenido válido
- [ ] `css/legal.css` existe y tiene contenido válido
- [ ] Todos los archivos CSS tienen sintaxis correcta
- [ ] No hay selectores duplicados innecesarios

### 2. Validación de Archivos JS

- [ ] `js/payment-success.js` existe y tiene sintaxis válida
- [ ] `js/onboarding-success.js` existe y tiene sintaxis válida
- [ ] Todos los archivos JS usan DOMContentLoaded
- [ ] Todas las clases están correctamente definidas
- [ ] No hay variables globales no intencionales

### 3. Validación de HTML

#### payment-success.html
- [ ] Referencia correcta a `css/payment-success.css`
- [ ] Referencia correcta a `js/payment-success.js`
- [ ] No queda CSS inline
- [ ] No queda JS inline
- [ ] Estructura HTML intacta

#### index.html
- [ ] Referencia correcta a `css/index.css`
- [ ] No queda CSS inline
- [ ] Estructura HTML intacta
- [ ] Enlaces funcionan correctamente

#### landing.html
- [ ] Referencia correcta a `css/index.css`
- [ ] No queda CSS inline
- [ ] Funciona igual que index.html

#### privacy-policy.html
- [ ] Referencia correcta a `css/legal.css`
- [ ] No queda CSS inline
- [ ] Contenido preservado

#### terms.html
- [ ] Referencia correcta a `css/legal.css`
- [ ] No queda CSS inline
- [ ] Contenido preservado

#### onboarding-success.html
- [ ] Referencia correcta a `css/onboarding-success.css`
- [ ] Referencia correcta a `js/onboarding-success.js`
- [ ] No queda CSS inline
- [ ] No queda JS inline

### 4. Testing Funcional

#### payment-success.html
```
URL de prueba: payment-success.html?order=TEST-001&amount=50000&phone=573001234567
```
- [ ] Muestra número de pedido correctamente
- [ ] Muestra monto formateado en COP
- [ ] Enlace de WhatsApp funciona
- [ ] Countdown de redirect funciona
- [ ] Notificación al backend se envía

#### index.html
```
URL de prueba: index.html
```
- [ ] Hero section se muestra correctamente
- [ ] Features cards tienen hover effect
- [ ] Pricing section visible
- [ ] Contact section funcional
- [ ] Enlaces a auth.html funcionan
- [ ] Animaciones fadeInUp funcionan

#### landing.html
```
URL de prueba: landing.html
```
- [ ] Idéntico a index.html
- [ ] Comparte estilos correctamente

#### privacy-policy.html
```
URL de prueba: privacy-policy.html
```
- [ ] Estilos legales aplicados
- [ ] Secciones colapsibles funcionan
- [ ] Enlaces externos funcionan
- [ ] Link de regreso a index funciona

#### terms.html
```
URL de prueba: terms.html
```
- [ ] Estilos legales aplicados
- [ ] Mismo estilo que privacy-policy
- [ ] Contenido legible
- [ ] Link de regreso funciona

#### onboarding-success.html
```
URL de prueba: onboarding-success.html?tenantId=test-123&mode=new
```
- [ ] Mensaje personalizado por modo (new/migrate)
- [ ] Carga info del tenant desde backend
- [ ] Muestra tenant ID correctamente
- [ ] Botón de dashboard funciona
- [ ] Firebase actualiza usuario correctamente
- [ ] Maneja error si no hay tenantId

### 5. Responsive Testing

Probar en:
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

Verificar:
- [ ] payment-success.html responsive
- [ ] index.html responsive
- [ ] landing.html responsive
- [ ] privacy-policy.html responsive
- [ ] terms.html responsive
- [ ] onboarding-success.html responsive

### 6. Browser Compatibility

Probar en:
- [ ] Chrome (última versión)
- [ ] Firefox (última versión)
- [ ] Safari (última versión)
- [ ] Edge (última versión)

### 7. Consola del Navegador

Para cada página, verificar:
- [ ] No hay errores de sintaxis JS
- [ ] No hay errores 404 (archivos no encontrados)
- [ ] No hay errores de CORS
- [ ] No hay warnings críticos
- [ ] Console.log útiles para debugging

### 8. Network Tab

Verificar:
- [ ] CSS files cargan correctamente (200 OK)
- [ ] JS files cargan correctamente (200 OK)
- [ ] Archivos se cachean apropiadamente
- [ ] No hay requests duplicados innecesarios

### 9. Performance

- [ ] Tiempo de carga < 2 segundos
- [ ] CSS no bloquea render innecesariamente
- [ ] JS no causa layout shifts
- [ ] Animaciones son suaves (60fps)

### 10. Backups

Verificar que existen:
- [ ] `payment-success-backup.html`
- [ ] `index-backup.html`
- [ ] `landing-backup.html`
- [ ] `privacy-policy-backup.html`
- [ ] `terms-backup.html`
- [ ] `onboarding-success-backup.html`

### 11. Documentación

- [ ] `RESUMEN-MIGRACION-30-ENE-PARTE-2.md` actualizado
- [ ] `MIGRACION-FRONTEND-COMPLETADA.md` completo
- [ ] `GIT-COMMIT-SUMMARY.md` listo
- [ ] Este checklist completado

### 12. Git Status

```bash
git status
```
- [ ] Todos los archivos nuevos listados
- [ ] Archivos modificados identificados
- [ ] No hay archivos .DS_Store o node_modules
- [ ] Backups incluidos

### 13. Code Quality

- [ ] CSS sigue naming conventions
- [ ] JS sigue estilo consistente
- [ ] Indentación consistente (2 espacios)
- [ ] Comentarios útiles donde necesario
- [ ] No hay código comentado innecesario
- [ ] No hay console.log innecesarios en producción

### 14. Security

- [ ] No hay credenciales hardcodeadas
- [ ] URLs de API correctas
- [ ] No hay datos sensibles en JS
- [ ] Firebase config es público (OK)

### 15. Final Review

- [ ] Todas las páginas migradas funcionan
- [ ] No hay regresiones en funcionalidad
- [ ] Diseño visual idéntico al original
- [ ] Performance igual o mejor
- [ ] Código más limpio y mantenible

---

## Comandos de Validación Rápida

```bash
# Verificar sintaxis CSS
npx stylelint "css/*.css"

# Verificar sintaxis JS
npx eslint "js/*.js"

# Verificar HTML
npx html-validate "*.html"

# Buscar console.log en producción
grep -r "console.log" js/

# Buscar CSS inline restante
grep -r "<style>" *.html

# Buscar JS inline restante
grep -r "<script>" *.html | grep -v "src="

# Verificar referencias rotas
# (requiere servidor local activo)
npm install -g broken-link-checker
blc http://localhost:8080 -ro
```

---

## Resultado Final

**Total de checks**: 100+  
**Completados**: ___/100+  
**Estado**: [ ] Aprobado / [ ] Necesita correcciones

**Notas adicionales**:
_____________________________________
_____________________________________
_____________________________________

**Aprobado por**: ________________  
**Fecha**: ________________

---

## En Caso de Encontrar Problemas

1. ✅ Verificar consola del navegador
2. ✅ Revisar Network tab
3. ✅ Comparar con archivo backup
4. ✅ Verificar rutas de archivos (relativas vs absolutas)
5. ✅ Limpiar cache del navegador
6. ✅ Probar en modo incógnito
7. ✅ Verificar permisos de archivos en servidor

---

*Última actualización: 30 de enero de 2026*
