# 🔍 Análisis: Limitación de Nequi API y Soluciones Reales

**Fecha:** 22 de enero de 2026  
**Problema Identificado:** Nequi API solo permite consultar TU cuenta, no las de tus usuarios  
**Impacto:** Cambia completamente la estrategia de validación

---

## 🚨 El Problema Real

### **Arquitectura de Nequi API**

```
TU CUENTA NEQUI → Nequi API → ✅ Puedes consultar TUS transacciones
CUENTA DEL RESTAURANTE → Nequi API → ❌ NO puedes consultar (sin sus credenciales)
```

### **Flujo que NO funciona:**

```
Cliente transfiere $50k 
  ↓
A cuenta Nequi del RESTAURANTE (3001234567)
  ↓
Tu backend intenta consultar Nequi API
  ↓
❌ ERROR: No tienes acceso a esa cuenta
```

---

## 💡 Opciones Reales Disponibles

---

## **OPCIÓN 1: Restaurante comparte credenciales Nequi API** 🔑

### Descripción:
Cada restaurante crea su cuenta de desarrollador en Nequi Conecta, obtiene sus credenciales (Client ID + Secret), y las ingresa en tu dashboard. Tu backend usa esas credenciales para consultar en nombre del restaurante.

### Cómo funciona:

```
1. Restaurante:
   - Crea cuenta en Nequi Conecta
   - Registra su app
   - Obtiene: Client ID + Client Secret
   - Ingresa credenciales en tu dashboard

2. Tu backend:
   - Guarda credenciales (encriptadas) en Firebase
   - Cuando llega un comprobante de ese restaurante
   - Usa SUS credenciales para consultar Nequi API
   - Nequi valida: "Sí, este restaurante puede ver sus transacciones"
   - Retorna: transacciones del restaurante
```

### Implementación:

```javascript
// Estructura en Firebase
{
  "restaurantes": {
    "rest_123": {
      "nombre": "Pizza Don Juan",
      "nequi_numero": "3001234567",
      "nequi_credentials": {
        "client_id": "abc123...", // DEL RESTAURANTE
        "client_secret": "xyz789...", // DEL RESTAURANTE (encriptado)
        "configurado": true,
        "fecha_config": "2026-01-22"
      }
    }
  }
}

// Backend usa credenciales del restaurante
async function validarPagoRestaurante(pedido) {
  const restaurante = await obtenerRestaurante(pedido.restaurante_id);
  
  // Usar las credenciales DEL RESTAURANTE
  const nequiAPI = new NequiAPI(
    restaurante.nequi_credentials.client_id,
    restaurante.nequi_credentials.client_secret
  );
  
  // Consultar transacciones de SU cuenta
  const validacion = await nequiAPI.validarTransaccion(
    restaurante.nequi_numero,
    datosOCR.monto,
    datosOCR.fecha
  );
  
  return validacion;
}
```

### ✅ Pros:

1. **Funciona técnicamente** ✅
   - Cada restaurante controla su propia cuenta
   - Nequi autoriza acceso a SUS transacciones
   - No violenta políticas de Nequi

2. **Legal y seguro** ✅
   - Restaurante autoriza explícitamente
   - No intermedias pagos
   - Solo consultas (read-only)

3. **Validación real** ✅
   - 99% de precisión
   - Fuente de verdad (Nequi)

4. **Escalable** ✅
   - Cada restaurante gestiona sus credenciales
   - No dependes de una cuenta central

### ❌ Contras:

1. **Fricción en onboarding** ⚠️
   - Restaurante debe:
     - Crear cuenta Nequi Conecta
     - Verificar su negocio
     - Obtener credenciales
     - Ingresar en tu dashboard
   - Proceso puede tomar 1-3 días

2. **Confianza del restaurante** ⚠️
   - Pregunta: "¿Por qué necesitas mis credenciales?"
   - Preocupación de seguridad
   - Necesitas explicación clara

3. **Complejidad de soporte** ⚠️
   - Restaurantes pueden tener problemas técnicos
   - Necesitas documentación muy clara
   - Soporte personalizado

4. **Responsabilidad de seguridad** 🚨
   - Guardas credenciales sensibles
   - DEBES encriptar correctamente
   - Cumplimiento de seguridad
   - Si hay leak → problema GRAVE

5. **Nequi puede rechazar el negocio del restaurante** ⚠️
   - No todos los negocios califican
   - Proceso de aprobación de Nequi

### Implementación de Seguridad:

```javascript
// server/crypto-utils.js
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

function encriptar(texto) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  let encrypted = cipher.update(texto);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function desencriptar(texto) {
  const parts = texto.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = Buffer.from(parts.join(':'), 'hex');
  
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
}

// Guardar credenciales
async function guardarCredencialesNequi(restauranteId, clientId, clientSecret) {
  await db.collection('restaurantes').doc(restauranteId).update({
    'nequi_credentials.client_id': clientId,
    'nequi_credentials.client_secret': encriptar(clientSecret),
    'nequi_credentials.configurado': true
  });
}

// Usar credenciales
async function obtenerCredencialesNequi(restauranteId) {
  const doc = await db.collection('restaurantes').doc(restauranteId).get();
  const data = doc.data();
  
  return {
    client_id: data.nequi_credentials.client_id,
    client_secret: desencriptar(data.nequi_credentials.client_secret)
  };
}
```

### Documentación para Restaurante:

```markdown
## Cómo configurar Nequi API

1. Visita: https://conecta.nequi.com.co
2. Crea una cuenta con tu correo del negocio
3. Sube documentos:
   - RUT del negocio
   - Cámara de comercio
   - Cédula del representante legal
4. Espera aprobación (1-3 días hábiles)
5. Crea una aplicación en el portal
6. Copia Client ID y Client Secret
7. Pégalos en tu dashboard de KDS
8. ¡Listo! Validación automática activada
```

### Mitigación de Riesgos:

1. **Educación clara:**
   ```
   "¿Por qué necesito dar mis credenciales?
   
   → Solo para consultar (no modificar)
   → Es como dar 'solo lectura' de tu cuenta
   → Nequi recomienda este método para integraciones
   → Tus credenciales están encriptadas
   → Nunca vemos tu contraseña de Nequi
   → Solo vemos que llegó X pago"
   ```

2. **Permisos limitados:**
   - Solo solicitar permisos de lectura (read-only)
   - Nequi permite esto en OAuth scopes

3. **Auditoría:**
   - Log de cada consulta API
   - Dashboard: "Última consulta a Nequi: hace 2 min"
   - Restaurante puede revocar acceso en cualquier momento

4. **Alternativa sin credenciales:**
   - Restaurante puede optar por validación manual
   - No es obligatorio configurar API

---

## **OPCIÓN 2: Flujo Centralizado (Todos pagan a TI)** 🏢

### Descripción:
Todos los pagos van a TU cuenta Nequi. Tú validas con TU API. Luego transfieres al restaurante (menos comisión).

### ❌ Por qué NO:

Ya lo analizamos en `ARQUITECTURA-PAGOS-SAAS.md`:

1. **Legal:** Intermediación financiera sin licencia
2. **Fiscal:** Declaras TODO el dinero
3. **Operativo:** Transferencias diarias complejas
4. **Costos:** -$5.45M COP/mes de pérdida
5. **Confianza:** Restaurantes desconfían

**Veredicto:** ❌ Descartado

---

## **OPCIÓN 3: OCR + Validación Manual (Sin Nequi API)** 📋

### Descripción:
OCR extrae datos. Dashboard muestra imagen + datos. Restaurante aprueba manualmente.

### Cómo funciona:

```
1. Cliente envía captura
2. OCR extrae: monto, fecha, banco
3. Dashboard del restaurante muestra:
   - Imagen grande (ampliable)
   - Monto detectado: $50.000 ✅
   - Fecha: 22 Ene 2026 ✅
   - Coincide con pedido: Sí ✅
   - Botones: [Aprobar] [Rechazar]
4. Restaurante hace clic: Aprobar
5. Sistema notifica cliente
```

### ✅ Pros:

1. **Simple** ✅
   - No requiere credenciales
   - No requiere cuenta Nequi de desarrollador
   - Setup en 5 minutos

2. **Sin riesgos de seguridad** ✅
   - No guardas credenciales sensibles
   - No hay leak posible

3. **Funciona para cualquier banco** ✅
   - Nequi, Daviplata, Bancolombia, etc.
   - No limitado a un solo método

4. **Control total del restaurante** ✅
   - Él decide aprobar/rechazar
   - Ve la imagen completa
   - Confianza máxima

### ❌ Contras:

1. **No es automático** ❌
   - Requiere intervención humana
   - Restaurante debe estar disponible
   - 30-60 segundos de validación

2. **No detecta fraude 100%** ⚠️
   - Capturas editadas pasan si se ven bien
   - Capturas recicladas difíciles de detectar
   - Humano puede equivocarse

3. **No escala perfecto** ⚠️
   - 100 pedidos/día = 100 aprobaciones manuales
   - Aunque con OCR es muy rápido (10 seg vs 3 min)

### Mejoras posibles:

```javascript
// Agregar detección de capturas recicladas
const imageHash = calcularHashPerceptual(imageBuffer);

const yaUsada = await db.collection('comprobantes')
  .where('hash', '==', imageHash)
  .where('restaurante_id', '==', restauranteId)
  .get();

if (!yaUsada.empty) {
  // ⚠️ Alerta en dashboard
  datosOCR.alerta = 'Captura similar ya fue usada antes';
  datosOCR.score_confianza = 30; // Bajo
}
```

---

## **OPCIÓN 4: Nequi Botones de Pago (Híbrido)** 💳

### Descripción:
Restaurante genera link de pago de Nequi. Cliente paga por ese link. Nequi notifica al restaurante directamente (no a ti).

### Cómo funciona:

```
1. Bot genera link de pago usando credenciales del restaurante
2. Cliente hace clic y paga en app Nequi
3. Nequi notifica DIRECTO al restaurante (a su webhook)
4. Tu backend escucha webhook y actualiza estado
```

### ⚠️ Problema:

Requiere webhook público del restaurante o:
- Tú recibes webhook en tu backend
- Pero necesitas credenciales del restaurante para generarle el link
- Volvemos al problema de credenciales

### ✅ Ventaja:

- Cliente no sale de WhatsApp (link se abre en app)
- Confirmación instantánea
- Sin capturas

### ❌ Desventaja:

- Cliente debe tener app Nequi
- Cambio de comportamiento (ya no transferencia manual)
- Setup complejo

---

## **OPCIÓN 5: Belvo (Agregador Multi-Banco)** 🔗

### Descripción:
Usar Belvo para conectar múltiples bancos (no solo Nequi). Restaurante conecta su banco a través de Belvo.

### Cómo funciona:

```
1. Restaurante ingresa usuario/contraseña de su banco en Belvo
2. Belvo tokeniza y guarda acceso
3. Tu backend consulta Belvo API
4. Belvo consulta banco del restaurante
5. Retorna transacciones
```

### ✅ Pros:

- Soporta Nequi, Bancolombia, Davivienda, etc.
- Una sola integración
- Seguro (Belvo maneja credenciales)

### ❌ Contras:

- **Costo:** ~$0.10 USD por consulta ($400 COP)
- Para 1000 pedidos/mes = $400k COP/mes
- Restaurante debe dar acceso bancario completo (más sensible que API)
- Belvo puede ser bloqueado por bancos

---

## 📊 Comparativa de Opciones Reales

| Opción | Automatización | Seguridad | Costo | Complejidad | Adopción | Recomendación |
|--------|---------------|-----------|-------|-------------|----------|---------------|
| **1. Credenciales Nequi (restaurante)** | 99% | ⚠️ Media | $30k/mes | Alta | Media | ⚠️ **Premium** |
| **2. Flujo centralizado** | 100% | ❌ Baja | -$5M/mes | Alta | Baja | ❌ Descartado |
| **3. OCR + Manual** | 0% | ✅ Alta | $30k/mes | Baja | Alta | ✅ **Básico** |
| **4. Nequi Botones** | 100% | ✅ Alta | $30k/mes | Alta | Baja | ⚠️ Alternativa |
| **5. Belvo** | 99% | ✅ Alta | $400k/mes | Media | Media | ❌ Caro |

---

## 🎯 Recomendación Final ACTUALIZADA

### **Estrategia Híbrida en 2 Niveles:**

```
┌─────────────────────────────────────────────────┐
│ NIVEL 1: BÁSICO (Todos los restaurantes)       │
│                                                 │
│ OCR + Validación Manual Asistida               │
│ ✅ Sin credenciales                             │
│ ✅ Funciona para cualquier banco                │
│ ✅ Setup en 5 minutos                           │
│ ✅ Detección de capturas recicladas             │
│ ✅ Restaurante aprueba en 10-15 segundos        │
│                                                 │
│ Costo: $30k COP/mes                             │
│ Efectividad: 70-80%                             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ NIVEL 2: PREMIUM (Restaurantes grandes)        │
│                                                 │
│ OCR + Nequi API (con credenciales restaurante) │
│ ✅ Validación automática 99%                    │
│ ✅ Restaurante comparte credenciales            │
│ ✅ Solo lectura (read-only)                     │
│ ✅ Encriptación máxima                          │
│                                                 │
│ Costo: $30k COP/mes                             │
│ Efectividad: 99%                                │
│ Requisito: Confianza del restaurante            │
└─────────────────────────────────────────────────┘
```

### **Planes de Suscripción Actualizados:**

```
┌─────────────────────────────────────────┐
│ PLAN BÁSICO: $50k COP/mes               │
├─────────────────────────────────────────┤
│ ✅ OCR automático de capturas           │
│ ✅ Detección de monto, fecha, banco     │
│ ✅ Detección de capturas recicladas     │
│ ✅ Dashboard de aprobación rápida       │
│ ✅ Notificaciones automáticas           │
│ ⏱️ Validación: 10-15 segundos (manual)  │
│ 📊 Efectividad: 80%                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ PLAN PRO: $100k COP/mes                 │
├─────────────────────────────────────────┤
│ ✅ Todo lo anterior +                   │
│ ✅ Validación automática con Nequi API  │
│ ✅ 99% de precisión                     │
│ ✅ Aprobación instantánea (<10 seg)     │
│ ✅ Soporte prioritario                  │
│ ⏱️ Validación: Automática               │
│ 📊 Efectividad: 99%                     │
│ ⚠️ Requiere: Credenciales Nequi         │
└─────────────────────────────────────────┘
```

---

## 🚀 Plan de Implementación ACTUALIZADO

### **FASE 1 (Semana 1-2): MVP - OCR + Manual**

**Implementar:**
```
✅ OCR con Google Cloud Vision
✅ Extracción de monto, fecha, banco
✅ Dashboard de aprobación manual
✅ Detección de capturas recicladas (hash)
✅ Notificaciones automáticas
```

**No implementar aún:**
```
❌ Nequi API (dejarlo para Premium)
```

**Objetivo:**
- Validar adopción del sistema
- Ver cuántos restaurantes realmente lo usan
- Medir si la validación manual asistida es suficiente

**Tiempo:** 1-2 semanas  
**Costo:** $0 desarrollo, $30k COP/mes operativo  

---

### **FASE 2 (Mes 2-3): Premium - Nequi API**

**Solo si:**
- ✅ Tienes >20 restaurantes activos
- ✅ Restaurantes piden automatización
- ✅ Están dispuestos a compartir credenciales

**Implementar:**
```
✅ Configuración de credenciales Nequi
✅ Encriptación de credenciales
✅ Integración Nequi API con credenciales del restaurante
✅ Flujo automático completo
✅ Documentación detallada para restaurantes
✅ Video tutorial de setup
```

**Tiempo:** 1-2 semanas adicionales  

---

## ✅ Conclusión

### **Tu pregunta era correcta:**

> "¿Es buena idea que mi usuario me dé sus credenciales?"

**Respuesta:**

**Para Plan Premium: SÍ, pero con cuidados extremos:**

1. ✅ **Es el modelo estándar** de integraciones (Shopify, Rappi, etc. hacen lo mismo)
2. ✅ **Es legal** si el restaurante autoriza explícitamente
3. ✅ **Es seguro** si lo haces bien (encriptación, solo lectura)
4. ⚠️ **Pero NO es obligatorio** - debe ser opcional
5. ⚠️ **Requiere mucha educación** al restaurante
6. ⚠️ **Responsabilidad alta** de seguridad

**Para MVP: NO, usa validación manual asistida primero**

1. ✅ Implementa OCR + Dashboard de aprobación
2. ✅ Valida que los restaurantes usan el sistema
3. ✅ Mide si 10-15 seg de validación manual es aceptable
4. ⚠️ Solo después, si hay demanda real, agrega Nequi API Premium

---

**¿Procedo con FASE 1 (OCR + Manual) como MVP?**

Tiempo: 1-2 semanas  
Riesgo: Bajo  
Costo: $30k COP/mes  
Efectividad: 80%  
Sin credenciales sensibles ✅

