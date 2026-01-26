# 🔑 Guía: Cómo Obtener Credenciales de los Gateways

**Fecha:** 30 de enero de 2026  
**Objetivo:** Obtener credenciales de prueba (sandbox) para Wompi y Bold

---

## 🎯 PASO 1: Wompi (PRIORITARIO)

Wompi es el gateway más completo en Colombia. Tiene el mejor soporte para Nequi, PSE y tarjetas.

### 1.1 Crear Cuenta en Wompi Sandbox

1. **Ve a:** https://comercios.wompi.co/

2. **Crea una cuenta:**
   - Haz clic en "Registrarse"
   - Completa el formulario:
     - Nombre del negocio: "Tu Restaurante SaaS (Pruebas)"
     - Email: tu-email@ejemplo.com
     - Contraseña segura

3. **Verifica tu email**
   - Revisa tu bandeja de entrada
   - Haz clic en el enlace de verificación

### 1.2 Activar Modo Sandbox

1. **Inicia sesión** en https://comercios.wompi.co/

2. **Ve a:** Dashboard → Configuración → API Keys

3. **Activa el modo Sandbox:**
   - Busca el toggle "Modo de pruebas" o "Sandbox mode"
   - Actívalo (debe aparecer en color naranja/amarillo)

### 1.3 Obtener Credenciales

En la sección **API Keys**, encontrarás:

```
Public Key (Sandbox):
pub_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Private Key (Sandbox):
prv_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Event Secret:
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ IMPORTANTE:**
- Copia TODAS las credenciales
- NO compartas la Private Key públicamente
- El Event Secret se usa para validar webhooks

### 1.4 Configurar en .env

Abre el archivo `.env` y pega las credenciales:

```bash
WOMPI_PUBLIC_KEY=pub_test_tu_clave_aqui
WOMPI_PRIVATE_KEY=prv_test_tu_clave_aqui
WOMPI_EVENT_SECRET=tu_secret_aqui
WOMPI_MODE=sandbox
```

---

## 💳 PASO 2: Bold (OPCIONAL - Puedes hacerlo después)

Bold tiene comisiones más bajas (1.79% + $500) que Wompi.

### 2.1 Crear Cuenta en Bold

1. **Ve a:** https://bold.co/

2. **Haz clic en:** "Registrarse" o "Empezar ahora"

3. **Completa el formulario:**
   - Tipo de negocio: E-commerce / Servicios
   - Nombre: "Tu Restaurante SaaS"
   - Email y teléfono

4. **Solicita cuenta de pruebas:**
   - En el chat de soporte, escribe:
     "Hola, soy desarrollador y necesito credenciales de sandbox para testing"
   - Espera respuesta (normalmente 1-2 horas)

### 2.2 Obtener API Key

Una vez aprobado:

1. **Inicia sesión** en el dashboard de Bold

2. **Ve a:** Configuración → API

3. **Copia:**
   - API Key (Sandbox)
   - Webhook Token

### 2.3 Configurar en .env

```bash
BOLD_API_KEY=tu_api_key_aqui
BOLD_WEBHOOK_TOKEN=tu_token_aqui
BOLD_MODE=sandbox
```

---

## 🧪 PASO 3: Probar Credenciales

### 3.1 Verificar que las Credenciales Funcionan

Crea un script de prueba:

```bash
cd /Users/osmeldfarak/Documents/Proyectos/automater/kds-webapp
node scripts/test-credentials.js
```

Si el script no existe, créalo:

```javascript
// scripts/test-credentials.js
require('dotenv').config();
const axios = require('axios');

async function testWompi() {
  console.log('🧪 Probando credenciales de Wompi...\n');
  
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const privateKey = process.env.WOMPI_PRIVATE_KEY;
  
  if (!publicKey || !privateKey) {
    console.error('❌ Credenciales de Wompi no configuradas en .env');
    return;
  }
  
  try {
    // Probar endpoint de merchants
    const response = await axios.get('https://sandbox.wompi.co/v1/merchants/' + publicKey);
    
    if (response.data) {
      console.log('✅ Credenciales de Wompi válidas');
      console.log('   Merchant ID:', response.data.data.id);
      console.log('   Nombre:', response.data.data.name);
    }
  } catch (error) {
    console.error('❌ Error al validar credenciales de Wompi');
    console.error('   Mensaje:', error.response?.data?.error?.reason || error.message);
  }
}

async function testBold() {
  console.log('\n🧪 Probando credenciales de Bold...\n');
  
  const apiKey = process.env.BOLD_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  Credenciales de Bold no configuradas (opcional)');
    return;
  }
  
  try {
    // Probar endpoint de Bold (ajustar según documentación)
    const response = await axios.get('https://api.bold.co/v1/test', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    console.log('✅ Credenciales de Bold válidas');
  } catch (error) {
    console.error('❌ Error al validar credenciales de Bold');
    console.error('   Mensaje:', error.response?.data?.message || error.message);
  }
}

async function main() {
  console.log('═'.repeat(50));
  console.log('  VERIFICACIÓN DE CREDENCIALES - GATEWAYS DE PAGO');
  console.log('═'.repeat(50));
  console.log('\n');
  
  await testWompi();
  await testBold();
  
  console.log('\n');
  console.log('═'.repeat(50));
  console.log('  FIN DE LA VERIFICACIÓN');
  console.log('═'.repeat(50));
}

main();
```

---

## 📚 Documentación Oficial

### Wompi
- **Docs:** https://docs.wompi.co/
- **Dashboard:** https://comercios.wompi.co/
- **Soporte:** soporte@wompi.co

### Bold
- **Docs:** https://bold.co/docs/
- **Dashboard:** https://dashboard.bold.co/
- **Soporte:** Chat en vivo en el sitio

---

## 🎯 Checklist

- [ ] Cuenta de Wompi creada
- [ ] Modo sandbox activado en Wompi
- [ ] Public Key de Wompi copiada
- [ ] Private Key de Wompi copiada
- [ ] Event Secret de Wompi copiado
- [ ] Credenciales agregadas al .env
- [ ] Script de prueba ejecutado ✅
- [ ] (Opcional) Cuenta de Bold creada
- [ ] (Opcional) API Key de Bold obtenida

---

## ⚠️ Problemas Comunes

### "No encuentro las credenciales en Wompi"
**Solución:** Ve a Dashboard → Configuración → Claves de API (o API Keys). Asegúrate de estar en modo Sandbox.

### "Mi Private Key no funciona"
**Solución:** Verifica que no hayas copiado espacios al inicio o final. La clave debe empezar con `prv_test_` en sandbox.

### "Bold no me da credenciales de sandbox"
**Solución:** Bold a veces requiere aprobación manual. Contacta a soporte vía chat o email. Mientras tanto, puedes continuar solo con Wompi.

---

## 🚀 Siguiente Paso

Una vez que tengas las credenciales configuradas:

```bash
# Probar credenciales
node scripts/test-credentials.js

# Si todo está bien, continuar con FASE 2
# Implementar el código del Gateway Manager
```

---

**¿Necesitas ayuda?** Revisa el documento `03-GUIA-INTEGRACION-PASO-A-PASO.md` para más detalles técnicos.
