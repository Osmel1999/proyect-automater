# 🚀 Guía: Desplegar n8n en Railway.app

## 📋 Índice
1. [¿Por qué Railway.app?](#por-qué-railwayapp)
2. [Pre-requisitos](#pre-requisitos)
3. [Paso a Paso: Despliegue](#paso-a-paso-despliegue)
4. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
5. [Importar Workflows](#importar-workflows)
6. [Conectar con Firebase](#conectar-con-firebase)
7. [Configurar WhatsApp Business API](#configurar-whatsapp-business-api)
8. [Pruebas y Verificación](#pruebas-y-verificación)
9. [Mantenimiento y Monitoreo](#mantenimiento-y-monitoreo)
10. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 ¿Por qué Railway.app?

Railway.app es la opción **IDEAL** para desplegar n8n en producción porque:

✅ **Gratis para empezar**: $5 USD de crédito mensual (suficiente para n8n + PostgreSQL)  
✅ **Sin tarjeta de crédito**: Puedes empezar sin pagar  
✅ **PostgreSQL integrado**: Base de datos incluida (n8n necesita persistencia)  
✅ **HTTPS automático**: Dominio `.railway.app` con SSL incluido  
✅ **Despliegue en 1 clic**: Template oficial de n8n  
✅ **Escalable**: Puedes crecer sin cambiar de plataforma  

**Alternativas evaluadas**:
- Render.com (requiere tarjeta, más lento)
- Heroku (no es gratis)
- VPS (complejo para principiantes)

---

## ✅ Pre-requisitos

Antes de empezar, necesitas:

1. **Cuenta en Railway.app**  
   👉 [https://railway.app](https://railway.app)  
   → Regístrate con GitHub (recomendado)

2. **Cuenta de GitHub**  
   → Para autenticación en Railway

3. **Dominio verificado** (opcional, pero recomendado)  
   → `kdsapp.site` (ya lo tienes)  
   → Para webhook de WhatsApp

4. **Firebase configurado**  
   → API Key y Database URL  
   → Ya lo tienes en `config.js`

5. **WhatsApp Business API** (próximo paso)  
   → Requiere dominio verificado

---

## 🚀 Paso a Paso: Despliegue

### Paso 1: Crear Cuenta en Railway

1. Ve a [https://railway.app](https://railway.app)
2. Click en **"Start a New Project"**
3. Selecciona **"Login with GitHub"**
4. Autoriza Railway a acceder a tu cuenta

---

### Paso 2: Desplegar n8n desde Template

1. **Busca el template oficial de n8n**:
   👉 [https://railway.app/template/n8n](https://railway.app/template/n8n)

2. **Click en "Deploy Now"**

3. **Configura el proyecto**:
   - **Project Name**: `kds-n8n` (o el que prefieras)
   - **Environment**: `production`

4. **Railway automáticamente**:
   - ✅ Despliega n8n
   - ✅ Crea una base de datos PostgreSQL
   - ✅ Conecta n8n con PostgreSQL
   - ✅ Genera un dominio público: `kds-n8n.railway.app`

5. **Espera 2-3 minutos** mientras se despliega.

---

### Paso 3: Obtener URL de tu n8n

1. En el dashboard de Railway, click en tu proyecto `kds-n8n`
2. Click en el servicio **"n8n"**
3. Ve a la pestaña **"Settings"**
4. Copia la URL pública:
   ```
   https://kds-n8n.railway.app
   ```

5. **¡Accede a tu n8n!**  
   → Abre la URL en tu navegador

---

## ⚙️ Configuración de Variables de Entorno

### Paso 4: Configurar Variables Críticas

1. En el dashboard de Railway, click en tu servicio **"n8n"**
2. Ve a **"Variables"**
3. **EDITA o AGREGA** estas variables:

#### Variables Obligatorias

```bash
# === CREDENCIALES DE ACCESO ===
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=TuPasswordSeguro123!

# === CONFIGURACIÓN DE WEBHOOK ===
WEBHOOK_URL=https://kds-n8n.railway.app/
N8N_HOST=kds-n8n.railway.app
N8N_PROTOCOL=https
N8N_PORT=443

# === TIMEZONE (importante para pedidos) ===
GENERIC_TIMEZONE=America/Mexico_City
TZ=America/Mexico_City

# === PERSISTENCIA ===
N8N_ENCRYPTION_KEY=tu_clave_secreta_aqui_min32caracteres
```

#### ⚠️ IMPORTANTE: Genera una clave de encriptación segura

Ejecuta este comando en tu terminal Mac:

```bash
openssl rand -base64 32
```

Ejemplo de salida:
```
Xk9Ld2E4cHZtNGJ3OGZnb2k0ZjhjZzRmZ2g4cmc4ZTM=
```

**Copia esa clave** y úsala en `N8N_ENCRYPTION_KEY`

---

### Paso 5: Configurar Dominio Personalizado (Opcional)

Si quieres usar `n8n.kdsapp.site` en lugar de `kds-n8n.railway.app`:

1. En Railway, ve a **Settings** → **Domains**
2. Click en **"Add Domain"**
3. Ingresa: `n8n.kdsapp.site`
4. Railway te dará un registro CNAME
5. Ve a **Hostinger** → DNS:
   ```
   Type:  CNAME
   Name:  n8n
   Value: kds-n8n.railway.app
   TTL:   Auto
   ```
6. Espera 5-10 minutos para propagación DNS
7. Verifica en: [https://n8n.kdsapp.site](https://n8n.kdsapp.site)

---

## 📥 Importar Workflows

### Paso 6: Importar el Workflow de Pedido Manual

1. **Accede a tu n8n en producción**:
   ```
   https://kds-n8n.railway.app
   ```

2. **Login con las credenciales** que configuraste:
   - Usuario: `admin`
   - Password: `TuPasswordSeguro123!`

3. **Importar workflow**:
   - Click en **"Workflows"** (menú izquierdo)
   - Click en **"+"** (nuevo workflow)
   - Click en **"⋮"** (menú) → **"Import from File"**
   - Selecciona: `workflow-1-pedido-manual.json`

4. **Activar el workflow**:
   - Click en el toggle **"Inactive"** → **"Active"**

5. **¡Listo!** Tu workflow ya está en producción.

---

## 🔗 Conectar con Firebase

### Paso 7: Configurar Credenciales de Firebase

1. En n8n, ve a **"Credentials"** (menú izquierdo)
2. Click en **"+ Add Credential"**
3. Busca **"Firebase"**
4. Completa los datos desde tu `config.js`:

```javascript
// De config.js:
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "kds-webapp-...",
  databaseURL: "https://kds-webapp-...firebaseio.com",
  projectId: "kds-webapp-...",
  storageBucket: "kds-webapp-...",
  messagingSenderId: "...",
  appId: "1:..."
};
```

5. **Guarda las credenciales** con el nombre: `Firebase KDS`

6. **Actualiza el workflow**:
   - Edita el nodo **"Firebase Realtime Database"**
   - Selecciona las credenciales que creaste

---

## 💬 Configurar WhatsApp Business API

### Paso 8: Conectar WhatsApp con n8n

**PRE-REQUISITO**: Dominio verificado en Facebook Business.

#### Opción 1: Meta Cloud API (Recomendado)

1. **Crea una app en Meta for Developers**:
   👉 [https://developers.facebook.com/apps](https://developers.facebook.com/apps)

2. **Agrega WhatsApp Business API**:
   - Click en **"Add Product"**
   - Selecciona **"WhatsApp"** → **"Set Up"**

3. **Obtén el Token de Acceso**:
   - Ve a **"WhatsApp"** → **"API Setup"**
   - Copia el **"Temporary access token"** (válido 24h)
   - Para permanente: genera un **System User Token**

4. **Configura el Webhook en n8n**:
   - En tu workflow n8n, agrega un nodo **"Webhook"**
   - Método: `POST`
   - Path: `/webhook/whatsapp`
   - URL completa: `https://kds-n8n.railway.app/webhook/whatsapp`

5. **Configura el Webhook en Meta**:
   - Ve a **"WhatsApp"** → **"Configuration"**
   - **Callback URL**: `https://kds-n8n.railway.app/webhook/whatsapp`
   - **Verify Token**: `mi_token_secreto_123` (el que elijas)
   - **Webhook Fields**: marca `messages`

6. **Verifica el Webhook**:
   - Meta enviará una petición de verificación
   - n8n debe responder con el challenge

#### Opción 2: Twilio (Alternativa)

1. Crea cuenta en [Twilio](https://www.twilio.com/whatsapp)
2. Configura WhatsApp Sandbox
3. Obtén el **Account SID** y **Auth Token**
4. En n8n, agrega credenciales de Twilio
5. Webhook URL: `https://kds-n8n.railway.app/webhook/twilio`

---

## ✅ Pruebas y Verificación

### Paso 9: Probar el Flujo Completo

#### Prueba 1: Webhook Manual (sin WhatsApp)

1. En n8n, abre tu workflow
2. Click en **"Execute Workflow"** (botón play)
3. Simula un pedido:
   ```json
   {
     "cliente": "Juan Pérez",
     "telefono": "+525512345678",
     "pedido": "2 Tacos Pastor + Refresco",
     "total": 85.00,
     "direccion": "Calle Reforma 123",
     "notas": "Sin cebolla"
   }
   ```
4. Verifica que aparezca en Firebase → `orders/`
5. Abre el KDS → debe aparecer en **"En Cola"**

#### Prueba 2: Envío desde WhatsApp (con API)

1. Envía un mensaje al número de WhatsApp Business:
   ```
   Pedido:
   2 Tacos Pastor
   1 Refresco
   Total: $85
   Dirección: Calle Reforma 123
   ```

2. **Verifica el flujo**:
   - ✅ WhatsApp recibe el mensaje
   - ✅ Meta/Twilio envía el webhook a n8n
   - ✅ n8n procesa el mensaje
   - ✅ n8n crea el pedido en Firebase
   - ✅ KDS muestra el pedido en tiempo real

---

## 📊 Mantenimiento y Monitoreo

### Paso 10: Monitorear n8n

1. **Ver logs en Railway**:
   - Dashboard → Tu proyecto → **"Deployments"**
   - Click en el último deployment → **"View Logs"**

2. **Ver ejecuciones en n8n**:
   - En n8n → **"Executions"** (menú izquierdo)
   - Verás todas las ejecuciones (exitosas y fallidas)

3. **Configurar alertas** (opcional):
   - En n8n, crea un workflow de monitoreo
   - Si falla un workflow → envía alerta por email/Telegram

### Costos y Límites

**Railway.app - Plan Hobby (Gratis)**:
- ✅ $5 USD de crédito mensual
- ✅ ~500 horas de ejecución
- ✅ PostgreSQL incluido
- ✅ Suficiente para 100-200 pedidos/día

**Si superas el límite**:
- Upgrade a plan **Developer**: $5 USD/mes
- Incluye $5 USD adicionales de crédito

---

## 🛠️ Solución de Problemas

### Problema 1: n8n no inicia

**Síntomas**: Error 502 o "Application failed to respond"

**Soluciones**:
1. Verifica que `DATABASE_URL` esté configurada (Railway lo hace automáticamente)
2. Revisa los logs: `Railway Dashboard → Deployments → View Logs`
3. Reinicia el servicio: `Railway Dashboard → Service → Restart`

---

### Problema 2: Webhook no funciona

**Síntomas**: WhatsApp no envía mensajes a n8n

**Soluciones**:
1. Verifica que el webhook esté activo:
   ```bash
   curl https://kds-n8n.railway.app/webhook/whatsapp
   ```
   Debe responder con `200 OK` o el método `GET` configurado

2. Verifica que `WEBHOOK_URL` en Railway variables:
   ```
   WEBHOOK_URL=https://kds-n8n.railway.app/
   ```

3. En Meta/Twilio, verifica que la URL sea exacta

---

### Problema 3: No puedo acceder a n8n

**Síntomas**: Error de autenticación

**Soluciones**:
1. Verifica las variables en Railway:
   ```
   N8N_BASIC_AUTH_ACTIVE=true
   N8N_BASIC_AUTH_USER=admin
   N8N_BASIC_AUTH_PASSWORD=TuPassword
   ```

2. Reinicia el servicio después de cambiar variables

3. Usa modo incógnito en el navegador (evita cache)

---

### Problema 4: Pedidos no llegan a Firebase

**Síntomas**: Workflow se ejecuta pero no aparece en KDS

**Soluciones**:
1. Verifica las credenciales de Firebase en n8n
2. Verifica que `databaseURL` sea correcta:
   ```
   https://kds-webapp-xxxxx-default-rtdb.firebaseio.com
   ```
3. Verifica permisos en Firebase Rules:
   ```json
   {
     "rules": {
       "orders": {
         ".read": "auth != null",
         ".write": true
       }
     }
   }
   ```

---

## 📚 Recursos Adicionales

- **Documentación oficial de n8n**: [https://docs.n8n.io](https://docs.n8n.io)
- **Railway.app docs**: [https://docs.railway.app](https://docs.railway.app)
- **Meta WhatsApp API**: [https://developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Firebase docs**: [https://firebase.google.com/docs](https://firebase.google.com/docs)

---

## 🎉 ¡Felicidades!

Si llegaste hasta aquí, ya tienes:

✅ n8n desplegado en Railway.app (gratis)  
✅ PostgreSQL configurado para persistencia  
✅ Workflows importados y funcionando  
✅ Conectado con Firebase  
✅ Listo para conectar WhatsApp Business API  

**Próximos pasos**:
1. Esperar verificación de dominio en Firebase
2. Configurar WhatsApp Business API
3. Probar el flujo completo
4. Lanzar con clientes reales 🚀

---

**Última actualización**: Enero 2025  
**Autor**: Equipo KDS Automater  
**Versión**: 1.0
