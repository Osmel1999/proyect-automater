# 🎯 ESTRATEGIA DE POST-SELECCIÓN DE PORTFOLIO

**Fecha**: 15 de enero de 2026  
**Problema**: No podemos pre-seleccionar portfolio sin romper `authResponse`  
**Solución**: Permitir selección libre + validar en backend + redirigir si es incorrecto

---

## 🧠 Concepto

En lugar de forzar a Facebook a mostrar solo el portfolio legacy:

1. **Frontend**: Usuario hace login sin pre-selección (funciona)
2. **Backend**: Detecta qué portfolio eligió el usuario
3. **Backend**: Si es el legacy → continúa normalmente
4. **Backend**: Si es el principal → devuelve instrucciones para cambiar
5. **Frontend**: Muestra mensaje amigable pidiendo reintentar con portfolio correcto

---

## 📋 Ventajas

✅ **No rompe** `authResponse` (sin pre-selección)  
✅ **Usuario puede ver** ambos portfolios  
✅ **Validación clara** de cuál se eligió  
✅ **Mensaje educativo** si se equivoca  
✅ **No requiere cambios en Meta Dashboard**

---

## 🔧 Implementación

### 1. Frontend (onboarding-2.html)

```javascript
// Login sin pre-selección (FUNCIONA)
FB.login(function(response) {
  if (response.authResponse) {
    const code = response.authResponse.code;
    
    // Enviar código al backend
    fetch('/api/auth/legacy/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // ✅ Portfolio correcto
        window.location.href = '/onboarding-success.html';
      } else if (data.wrongPortfolio) {
        // ⚠️ Portfolio incorrecto
        showPortfolioWarning(data);
      } else {
        // ❌ Otro error
        showError(data.error);
      }
    });
  }
}, {
  config_id: 'CONFIG_ID',
  response_type: 'code',
  override_default_response_type: true,
  extras: {
    setup: {},  // Sin pre-selección
    sessionInfoVersion: 2
  }
});
```

### 2. Backend (server/index.js)

```javascript
app.post('/api/auth/legacy/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    // 1. Intercambiar código por token
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/v21.0/oauth/access_token`,
      {
        params: {
          client_id: process.env.FACEBOOK_LEGACY_APP_ID,
          client_secret: process.env.FACEBOOK_LEGACY_APP_SECRET,
          redirect_uri: process.env.FACEBOOK_LEGACY_CALLBACK_URL,
          code: code
        }
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    
    // 2. Obtener información del negocio
    const businessResponse = await axios.get(
      `https://graph.facebook.com/v21.0/debug_token`,
      {
        params: {
          input_token: accessToken,
          access_token: `${process.env.FACEBOOK_LEGACY_APP_ID}|${process.env.FACEBOOK_LEGACY_APP_SECRET}`
        }
      }
    );
    
    const businessId = businessResponse.data.data.granular_scopes?.[0]?.target_ids?.[0];
    
    // 3. VALIDAR PORTFOLIO
    const expectedPortfolioId = process.env.FACEBOOK_LEGACY_PORTFOLIO_ID;
    
    if (businessId !== expectedPortfolioId) {
      console.warn(`❌ Portfolio incorrecto: ${businessId} (esperado: ${expectedPortfolioId})`);
      
      return res.json({
        success: false,
        wrongPortfolio: true,
        selectedPortfolio: businessId,
        expectedPortfolio: expectedPortfolioId,
        message: 'Por favor, selecciona el portfolio "Kingdom design" en la ventana de Facebook'
      });
    }
    
    // 4. Portfolio correcto → continuar
    console.log(`✅ Portfolio correcto: ${businessId}`);
    
    // Guardar en Firebase
    await admin.firestore().collection('users').doc(userId).set({
      businessId,
      accessToken,
      portfolioType: 'legacy',
      onboardingDate: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      businessId,
      message: 'Onboarding completado exitosamente'
    });
    
  } catch (error) {
    console.error('Error en callback legacy:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 3. UI de Advertencia (onboarding-2.html)

```javascript
function showPortfolioWarning(data) {
  const warningDiv = document.createElement('div');
  warningDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 500px;
    text-align: center;
    z-index: 10000;
  `;
  
  warningDiv.innerHTML = `
    <h2>⚠️ Portfolio Incorrecto</h2>
    <p>Has seleccionado un portfolio diferente al requerido.</p>
    <p><strong>Seleccionado:</strong> ${data.selectedPortfolio}</p>
    <p><strong>Requerido:</strong> Kingdom design (${data.expectedPortfolio})</p>
    <p>Por favor, intenta nuevamente y elige el portfolio correcto.</p>
    <button onclick="window.location.reload()" style="
      background: #0084ff;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      margin-top: 15px;
    ">Reintentar</button>
  `;
  
  document.body.appendChild(warningDiv);
}
```

---

## 🎬 Flujo de Usuario

### Caso 1: Usuario elige portfolio correcto
```
Usuario → FB Login → Elige "Kingdom design" → ✅ Success → Dashboard
```

### Caso 2: Usuario elige portfolio incorrecto
```
Usuario → FB Login → Elige "Tienda Medellín" → ⚠️ Warning → Reintentar → Elige "Kingdom design" → ✅ Success
```

---

## 🔍 Cómo Identificar el Portfolio en el Token

El `debug_token` endpoint devuelve información sobre los permisos:

```json
{
  "data": {
    "app_id": "APP_ID",
    "type": "USER",
    "application": "App Name",
    "granular_scopes": [
      {
        "scope": "business_management",
        "target_ids": ["1473689432774278"]  // ← PORTFOLIO ID
      }
    ]
  }
}
```

---

## 📊 Beneficios de este Enfoque

| Aspecto | Pre-selección | Post-validación |
|---------|---------------|-----------------|
| **authResponse** | ❌ null | ✅ funciona |
| **Usuario ve portfolios** | ❌ no | ✅ sí |
| **Validación** | - | ✅ clara |
| **UX** | ❌ bloqueado | ✅ educativo |
| **Código** | complejo | simple |

---

## 🚀 Próximos Pasos

1. ✅ Implementar validación en backend
2. ✅ Agregar UI de advertencia en frontend
3. ✅ Probar flujo completo
4. ✅ Documentar para usuarios

---

## 📝 Notas

- Esta solución **no requiere cambios en Meta Dashboard**
- **No necesita permisos especiales** de Facebook
- **Funciona con ambos portfolios** verificados o no
- **Es educativa**: enseña al usuario qué portfolio elegir
