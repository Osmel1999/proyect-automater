# 🚀 GUÍA: Importar Workflows en n8n

## 📋 WORKFLOWS GENERADOS

He creado 2 workflows listos para usar:

### 1. **workflow-1-pedido-manual.json** 
✅ Para probar el sistema manualmente

---

## 🎯 PASO 1: CONFIGURAR CREDENCIALES EN n8n

Antes de importar, necesitas configurar las credenciales de Firebase:

### 1.1 Crear Credencial de Firebase

1. En n8n, ve a: **Settings** (⚙️) → **Credentials**
2. Click en **"Add credential"**
3. Busca: **"HTTP Header Auth"**
4. Configura:
   - **Name:** `Firebase Auth`
   - **Header Name:** (deja vacío por ahora)
   - **Header Value:** (deja vacío por ahora)
5. Click **"Save"**

> **Nota:** Firebase Realtime Database no requiere autenticación para escrituras si las reglas lo permiten. Si necesitas auth, configúralo más tarde.

---

## 🎯 PASO 2: IMPORTAR WORKFLOW

### 2.1 Workflow 1: Pedido Manual

1. En n8n, en la esquina superior derecha, click en el menú **"⋮"** (3 puntos)
2. Selecciona **"Import from File"**
3. Selecciona el archivo: `n8n-workflows/workflow-1-pedido-manual.json`
4. Click **"Import"**
5. ¡El workflow se cargará automáticamente! 🎉

---

## 🎯 PASO 3: VERIFICAR WORKFLOW

### 3.1 Revisar Nodos

Verás 5 nodos conectados:

```
┌─────────────────┐
│ Trigger Manual  │ ← Click para ejecutar
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Datos de Pedido │ ← Datos de ejemplo
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Procesar Pedido │ ← Genera ID y estructura
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Insertar        │ ← Envía a Firebase
│ en Firebase     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generar         │ ← Mensaje de confirmación
│ Confirmación    │
└─────────────────┘
```

### 3.2 Verificar URL de Firebase

1. Click en el nodo **"Insertar en Firebase"**
2. Verifica que la URL sea:
   ```
   https://kds-app-7f1d3-default-rtdb.firebaseio.com/pedidos.json
   ```
3. Si no es correcta, corrígela

---

## 🎯 PASO 4: PROBAR WORKFLOW

### 4.1 Ejecutar Prueba

1. Click en el nodo **"Trigger Manual"**
2. Click en el botón **"Execute Node"** (o "Test workflow")
3. Espera unos segundos...
4. ✅ Deberías ver datos fluyendo por cada nodo

### 4.2 Verificar Resultado

**En n8n:**
- Verás el mensaje de confirmación generado
- Todos los nodos deberían tener ✅ verde

**En el KDS:**
1. Abre: https://kds-app-7f1d3.web.app/kds
2. ¡Deberías ver el nuevo pedido en "En Cola"! 🎉

---

## 🎯 PASO 5: MODIFICAR DATOS

### 5.1 Cambiar Datos del Pedido

1. Click en el nodo **"Datos de Pedido"**
2. Modifica los valores:
   - `cliente`: Cambia el nombre
   - `telefono`: Cambia el número
   - `items`: Cambia los productos
   - `total`: Cambia el monto
   - `direccion`: Cambia la dirección
3. Click **"Execute workflow"** de nuevo
4. Verifica en el KDS

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### ❌ Error: "Failed to execute node"

**Causa:** URL de Firebase incorrecta o reglas de seguridad

**Solución:**
1. Verifica la URL en el nodo "Insertar en Firebase"
2. Debe terminar en `.json`
3. Verifica reglas de Firebase (deben permitir escritura)

### ❌ No aparece en el KDS

**Causa:** Estructura de datos incorrecta

**Solución:**
1. Ve a Firebase Console
2. Database → Realtime Database
3. Verifica que los datos se insertaron en `/pedidos`
4. Revisa la estructura del JSON

### ❌ Error en el nodo "Procesar Pedido"

**Causa:** Código JavaScript con error

**Solución:**
1. Click en el nodo
2. Revisa el código
3. Click "Execute Node" para ver el error específico

---

## 📊 DATOS DE EJEMPLO

El workflow genera un pedido como este:

```json
{
  "id": "PED-1735689600000",
  "cliente": "Juan Pérez",
  "telefono": "3042734424",
  "items": [
    {
      "cantidad": 2,
      "nombre": "Hamburguesa Clásica"
    },
    {
      "cantidad": 1,
      "nombre": "Papas Grandes"
    },
    {
      "cantidad": 1,
      "nombre": "Coca-Cola"
    }
  ],
  "total": 15000,
  "direccion": "Calle 123 #45-67, Barranquilla",
  "estado": "en-cola",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "tiempoTranscurrido": 0
}
```

---

## 🎉 SIGUIENTE PASO

Una vez que este workflow funcione:

### Workflow 2: WhatsApp → Firebase
- Recibirá mensajes de WhatsApp
- Procesará pedidos automáticamente
- Responderá al cliente

**¿Listo para probarlo?** 🚀

---

**Última actualización:** 1 de enero de 2026  
**Estado:** Workflow 1 listo para importar
