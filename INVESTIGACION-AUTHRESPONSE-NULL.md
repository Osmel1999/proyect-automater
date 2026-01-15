# 🔬 INVESTIGACIÓN PROFUNDA - authResponse: null con Pre-selección

**Fecha**: 15 de enero de 2026  
**Objetivo**: Resolver `authResponse: null` cuando se pre-selecciona portfolio  
**Criticidad**: ALTA - Bloquea modelo de negocio (números quedan Pending sin pre-selección)

---

## 🎯 El Problema Real

### Requisito del Negocio:
- ✅ **DEBE** pre-seleccionar portfolio "Kingdom design" (`1473689432774278`)
- ✅ **DEBE** evitar que números queden en estado "Pending"
- ✅ **DEBE** funcionar sin intervención manual

### Estado Actual:
```javascript
// Con pre-selección → authResponse: null ❌
extras: {
  setup: {
    business: {
      id: "1473689432774278"
    }
  },
  sessionInfoVersion: 3
}

// Sin pre-selección → funciona pero Pending ⚠️
extras: {
  setup: {},
  sessionInfoVersion: 2
}
```

---

## 🔍 Causas Posibles del authResponse: null

### 1. **Permisos Insuficientes del Portfolio**

**Hipótesis**: El portfolio legacy no tiene los permisos necesarios para ser pre-seleccionado.

**Verificar**:
- [ ] ¿El portfolio está en Business Manager o es standalone?
- [ ] ¿Tienes rol de Admin en el portfolio?
- [ ] ¿El portfolio tiene la app agregada y aprobada?
- [ ] ¿Hay límites de API o restricciones activas?

**Solución potencial**:
```
1. Meta Business Suite → Portfolio "Kingdom design"
2. Configuración → Apps
3. Verificar que la app 1627773661131047 esté:
   - Agregada al portfolio
   - Con rol "Admin" o "Developer"
   - Con permisos business_management
```

---

### 2. **sessionInfoVersion Incompatible**

**Hipótesis**: `sessionInfoVersion: 3` es incompatible con pre-selección en algunos casos.

**Pruebas a realizar**:

#### Test A: sessionInfoVersion 2 + pre-selección
```javascript
extras: {
  setup: {
    business: {
      id: "1473689432774278"
    }
  },
  sessionInfoVersion: 2  // ← Cambiar a 2
}
```

#### Test B: Sin sessionInfoVersion + pre-selección
```javascript
extras: {
  setup: {
    business: {
      id: "1473689432774278"
    }
  }
  // ← Omitir sessionInfoVersion completamente
}
```

#### Test C: sessionInfoVersion 1 + pre-selección
```javascript
extras: {
  setup: {
    business: {
      id: "1473689432774278"
    }
  },
  sessionInfoVersion: 1
}
```

---

### 3. **Estructura Incorrecta del business.id**

**Hipótesis**: El campo `business.id` requiere formato específico o campo adicional.

**Alternativas a probar**:

#### Opción A: business_id (guión bajo)
```javascript
extras: {
  setup: {
    business_id: "1473689432774278"  // ← Con guión bajo
  }
}
```

#### Opción B: Objeto business más completo
```javascript
extras: {
  setup: {
    business: {
      id: "1473689432774278",
      name: "Kingdom design"  // ← Agregar nombre
    }
  }
}
```

#### Opción C: external_business_id
```javascript
extras: {
  setup: {
    external_business_id: "1473689432774278"
  }
}
```

---

### 4. **Embedded Signup Config No Permite Pre-selección**

**Hipótesis**: El Embedded Signup Config ID no tiene habilitada la pre-selección.

**Verificar en Meta Dashboard**:
```
1. Meta for Developers → App → Embedded Signup
2. Buscar Config ID: 544740534652991
3. Verificar configuración:
   - ¿Permite business pre-selection?
   - ¿Está en modo producción o desarrollo?
   - ¿Tiene restricciones de dominio?
```

**Solución**: Crear un NUEVO Embedded Signup Config con pre-selección habilitada.

---

### 5. **Dominio No Autorizado para Pre-selección**

**Hipótesis**: `kdsapp.site` no está autorizado para usar pre-selección.

**Verificar**:
```
Meta Dashboard → App Settings → App Domains
- [ ] kdsapp.site está listado
- [ ] kds-app-7f1d3.web.app está listado
- [ ] No hay restricciones por país/región
```

---

### 6. **API Version Incompatible**

**Hipótesis**: La versión `v21.0` no soporta pre-selección en tu caso específico.

**Pruebas**:

#### Test con v20.0:
```javascript
window.fbAsyncInit = function() {
  FB.init({
    appId: '1627773661131047',
    version: 'v20.0'  // ← Probar versión anterior
  });
};
```

#### Test con v19.0:
```javascript
version: 'v19.0'
```

---

### 7. **Scope Faltante**

**Hipótesis**: Falta un scope específico para pre-seleccionar portfolios.

**Pruebas**:

#### Test A: Agregar business_management
```javascript
FB.login(function(response) {
  // ...
}, {
  config_id: '544740534652991',
  response_type: 'code',
  scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',  // ← Agregar business_management
  extras: {
    setup: {
      business: {
        id: "1473689432774278"
      }
    }
  }
});
```

#### Test B: Agregar manage_business_extension
```javascript
scope: 'manage_business_extension,whatsapp_business_management,whatsapp_business_messaging'
```

---

### 8. **Callback URL Mismatch**

**Hipótesis**: La callback URL en Meta no coincide con lo que espera Facebook.

**Verificar**:
```
Meta Dashboard → Embedded Signup Config
Callback URL debe ser EXACTAMENTE:
https://kds-backend-production.up.railway.app/api/whatsapp/callback-legacy

NO debe tener:
- Trailing slash
- Parámetros query
- Fragmentos (#)
```

---

### 9. **App en Modo Desarrollo**

**Hipótesis**: La app está en modo desarrollo y eso bloquea pre-selección.

**Verificar**:
```
Meta Dashboard → App Settings → Basic
- App Mode: ¿Development o Production?
```

**Si está en Development**:
- Cambiar a "Live" mode
- Completar App Review si es necesario
- Verificar que el dominio esté en producción

---

### 10. **Usuario No Tiene Acceso al Portfolio**

**Hipótesis**: Tu cuenta de Facebook no tiene permisos sobre el portfolio legacy.

**Verificar**:
```
1. business.facebook.com
2. Seleccionar "Kingdom design" portfolio
3. Configuración → Usuarios
4. Verificar tu rol: debe ser Admin o Employee con permisos completos
```

---

## 🧪 Plan de Pruebas Sistemático

### Fase 1: Verificaciones en Meta Dashboard (5 min)
1. [ ] Verificar rol en portfolio "Kingdom design"
2. [ ] Verificar app agregada al portfolio
3. [ ] Verificar Embedded Signup Config activo
4. [ ] Verificar callback URL exacta
5. [ ] Verificar app en modo Live

### Fase 2: Pruebas de Código (30 min)
Crear página de test con 10 variaciones:

```html
<!-- test-preselection-variants.html -->
<button onclick="testVariant1()">Test 1: sessionInfoVersion 2</button>
<button onclick="testVariant2()">Test 2: Sin sessionInfoVersion</button>
<button onclick="testVariant3()">Test 3: business_id</button>
<button onclick="testVariant4()">Test 4: Con business name</button>
<button onclick="testVariant5()">Test 5: external_business_id</button>
<button onclick="testVariant6()">Test 6: business_management scope</button>
<button onclick="testVariant7()">Test 7: API v20.0</button>
<button onclick="testVariant8()">Test 8: featureType business</button>
<button onclick="testVariant9()">Test 9: Combinación óptima</button>
<button onclick="testVariant10()">Test 10: Redirect URL params</button>
```

### Fase 3: Logs Detallados
Agregar logging extensivo para cada variante:
```javascript
console.log('===== VARIANT X =====');
console.log('Config:', JSON.stringify(loginOptions, null, 2));
console.log('Response:', JSON.stringify(response, null, 2));
console.log('authResponse:', response.authResponse);
console.log('status:', response.status);
```

---

## 📊 Matriz de Compatibilidad

| Variante | sessionInfo | business.id | Scope | Result |
|----------|-------------|-------------|-------|--------|
| Original | 2 | ❌ no | basic | ✅ funciona |
| Test 1   | 2 | ✅ sí | basic | ❓ probar |
| Test 2   | ❌ no | ✅ sí | basic | ❓ probar |
| Test 3   | 3 | ✅ sí | basic | ❌ falla |
| Test 4   | 2 | ✅ sí | business_mgmt | ❓ probar |

---

## 🎯 Soluciones Alternativas

### Si NO se puede pre-seleccionar en FB.login:

#### Opción A: Pre-llenar en Meta Dashboard
```
Embedded Signup Config → Advanced Settings
→ Default Business ID: 1473689432774278
```

#### Opción B: URL Parameter Pre-fill
```javascript
const signupUrl = `https://www.facebook.com/v21.0/dialog/oauth?
  client_id=1627773661131047
  &redirect_uri=https://kds-backend-production.up.railway.app/api/whatsapp/callback-legacy
  &response_type=code
  &config_id=544740534652991
  &business_id=1473689432774278  // ← Pre-llenar por URL
`;
window.location.href = signupUrl;
```

#### Opción C: System User Token + Direct API
En lugar de Embedded Signup, usar WhatsApp Embedded Signup Direct API:
```javascript
// Crear Phone Number directamente con System User Token
POST https://graph.facebook.com/v21.0/{business_id}/phone_numbers
Authorization: Bearer {system_user_token}
{
  "verified_name": "Mi Negocio",
  "display_name": "Mi Negocio",
  "category": "BUSINESS"
}
```

---

## 📝 Próximos Pasos Inmediatos

1. **AHORA**: Crear página de test con variantes
2. **AHORA**: Probar cada variante sistemáticamente
3. **AHORA**: Documentar qué funciona y qué no
4. **Si nada funciona**: Contactar Meta Support con logs detallados
5. **Plan B**: Implementar solución alternativa (System User Token)

---

## 🔧 Código de Test a Implementar

Voy a crear:
1. `test-preselection-variants.html` - Página con 10 variantes
2. `analyze-preselection-logs.sh` - Script para analizar logs
3. `RESULTADOS-TESTS-PRESELECTION.md` - Documentar resultados

¿Continuar con la implementación de tests?
