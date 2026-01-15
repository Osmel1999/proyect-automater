# 🎯 PLAN DE ACCIÓN - Resolver authResponse: null con Pre-selección

**Fecha**: 15 de enero de 2026  
**Criticidad**: 🔴 ALTA - Bloquea modelo de negocio  
**Objetivo**: Lograr pre-selección de portfolio sin `authResponse: null`

---

## 📊 Situación Actual

### ❌ Problema:
```javascript
// Configuración actual con pre-selección
extras: {
  setup: {
    business: {
      id: "1473689432774278"
    }
  },
  sessionInfoVersion: 3
}

// Resultado: authResponse: null ❌
```

### ⚠️ Workaround actual (NO soluciona el problema raíz):
```javascript
// Sin pre-selección - funciona pero números quedan Pending
extras: {
  setup: {},
  sessionInfoVersion: 2
}

// Resultado: authResponse funciona ✅ pero números Pending ⚠️
```

---

## 🔬 Herramientas Creadas

### 1. Página de Test Sistemática
**Archivo**: `test-preselection-variants.html`

**Qué hace**:
- Prueba 10 variantes diferentes de configuración
- Registra resultados en tabla
- Exporta logs en JSON
- Identifica qué combinación funciona

**Cómo usar**:
```bash
# 1. Desplegar a Firebase
firebase deploy --only hosting

# 2. Abrir en navegador
https://kdsapp.site/test-preselection-variants.html

# 3. Hacer click en cada test
# 4. Documentar cuál funciona
# 5. Exportar resultados
```

### 2. Documento de Investigación
**Archivo**: `INVESTIGACION-AUTHRESPONSE-NULL.md`

**Contiene**:
- 10 hipótesis de por qué falla
- Soluciones potenciales para cada una
- Checklist de verificaciones en Meta Dashboard
- Plan B si nada funciona

---

## ✅ PASO A PASO - Qué Hacer AHORA

### Fase 1: Verificaciones en Meta Dashboard (5 minutos)

#### 1.1 Verificar Permisos en Portfolio
```
1. Ir a: business.facebook.com
2. Seleccionar portfolio "Kingdom design" (1473689432774278)
3. Configuración → Usuarios
4. Verificar tu rol: DEBE ser "Admin" o "Employee" con full access
```

**Si NO eres Admin** → Esa es la causa. Solicita permisos de Admin.

#### 1.2 Verificar App en Portfolio
```
1. Portfolio "Kingdom design" → Configuración → Apps
2. Buscar app: 1627773661131047
3. Verificar:
   ✓ App está agregada al portfolio
   ✓ Estado: Activa
   ✓ Permisos: business_management incluido
```

**Si app NO está agregada** → Agrégala manualmente.

#### 1.3 Verificar Embedded Signup Config
```
1. developers.facebook.com → Tu App → Embedded Signup
2. Buscar Config ID: 544740534652991
3. Verificar:
   ✓ Estado: Active
   ✓ Callback URL: https://kds-backend-production.up.railway.app/api/whatsapp/callback-legacy
   ✓ Dominio: kdsapp.site autorizado
```

#### 1.4 Verificar Modo de App
```
1. App Settings → Basic
2. App Mode: DEBE estar en "Live" (no Development)
```

**Si está en Development** → Cambiar a Live o completar App Review.

---

### Fase 2: Ejecutar Tests Sistemáticos (15 minutos)

#### 2.1 Desplegar página de test
```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
firebase deploy --only hosting
```

#### 2.2 Abrir página de test
```
https://kdsapp.site/test-preselection-variants.html
```

#### 2.3 Ejecutar cada test en orden
```
Test 1: sessionInfoVersion 2
  → Click en "Test 1"
  → Observar resultado
  → Documentar si funciona

Test 2: Sin sessionInfoVersion
  → Click en "Test 2"
  → ...

... hasta Test 10
```

#### 2.4 Exportar resultados
```
Click en "Exportar Resultados"
→ Se descarga preselection-test-results-XXXX.json
→ Revisar cuál test dio authResponse válido
```

---

### Fase 3: Implementar Solución (10 minutos)

Una vez que identifiques **qué test funcionó**:

#### 3.1 Actualizar onboarding-2.html
```javascript
// Reemplazar FB.login con la configuración que funcionó
FB.login(function(response) {
  // ...
}, {
  // Configuración del test que funcionó
});
```

#### 3.2 Desplegar cambios
```bash
git add -A
git commit -m "fix: use working pre-selection config from Test X"
git push origin main
firebase deploy --only hosting
```

#### 3.3 Probar en producción
```
https://kdsapp.site/onboarding-2.html
→ Verificar que portfolio esté pre-seleccionado
→ Verificar que authResponse funcione
```

---

## 🎯 Tests Priorizados

### Test 1 (MÁS PROBABLE): sessionInfoVersion 2
```javascript
extras: {
  setup: {
    business: {
      id: "1473689432774278"
    }
  },
  sessionInfoVersion: 2  // ← Cambio clave
}
```

**Hipótesis**: sessionInfoVersion 3 es incompatible con pre-selección.

### Test 6 (SEGUNDA PRIORIDAD): business_management scope
```javascript
scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
extras: {
  setup: {
    business: {
      id: "1473689432774278"
    }
  },
  sessionInfoVersion: 2
}
```

**Hipótesis**: Falta scope necesario para pre-seleccionar.

### Test 10 (TERCERA PRIORIDAD): Combinación óptima
```javascript
scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
auth_type: 'rerequest',
extras: {
  setup: {
    business: {
      id: "1473689432774278",
      name: "Kingdom design"
    }
  },
  featureType: 'business',
  sessionInfoVersion: 2
}
```

**Hipótesis**: Necesita múltiples parámetros correctos.

---

## 🆘 Plan B - Si NINGÚN Test Funciona

### Opción B1: Pre-llenar en Embedded Signup Config

Si Facebook no permite pre-selección via código, configurar en Meta Dashboard:

```
1. Meta Dashboard → Embedded Signup Config
2. Advanced Settings (si existe)
3. Default Business ID: 1473689432774278
```

### Opción B2: Usar Direct WhatsApp Signup URL

En lugar de FB.login, redirigir a URL directa:

```javascript
const signupUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
  `client_id=1627773661131047` +
  `&redirect_uri=${encodeURIComponent('https://kds-backend-production.up.railway.app/api/whatsapp/callback-legacy')}` +
  `&response_type=code` +
  `&config_id=544740534652991` +
  `&business_id=1473689432774278`;  // Pre-llenar por URL

window.location.href = signupUrl;
```

### Opción B3: System User Token + API Directa

Evitar Embedded Signup completamente y usar API directa:

```
1. Crear System User en Portfolio
2. Generar System User Token
3. Usar API para crear Phone Numbers directamente
4. Requiere que usuarios ya tengan WhatsApp Business Account
```

### Opción B4: Contactar Meta Support

Si nada funciona, escalar a Meta:

```
1. business.facebook.com/help
2. Seleccionar "WhatsApp Business Platform"
3. Explicar:
   - Embedded Signup funciona sin pre-selección
   - Falla con business.id en setup
   - authResponse: null siempre
   - Adjuntar logs de test-preselection-variants.html
```

---

## 📞 Siguiente Paso INMEDIATO

**AHORA MISMO**:

1. ✅ Verificar rol de Admin en portfolio "Kingdom design"
2. ✅ Desplegar test-preselection-variants.html
3. ✅ Ejecutar Test 1, Test 6, y Test 10
4. ✅ Documentar resultados
5. ✅ Implementar solución que funcione

**Tiempo estimado**: 30 minutos total

---

## 📋 Checklist

- [ ] Verificado rol Admin en portfolio
- [ ] Verificado app agregada a portfolio
- [ ] Verificado Embedded Signup Config activo
- [ ] Verificado app en modo Live
- [ ] Desplegado test-preselection-variants.html
- [ ] Ejecutado Test 1
- [ ] Ejecutado Test 6
- [ ] Ejecutado Test 10
- [ ] Exportado resultados
- [ ] Identificada configuración que funciona
- [ ] Actualizado onboarding-2.html
- [ ] Desplegado a producción
- [ ] Probado end-to-end

---

¿Listo para empezar con la Fase 1 (verificaciones en Meta)?
