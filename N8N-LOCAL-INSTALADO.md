# 🚀 n8n Instalado y Funcionando

## ✅ LO QUE ACABAMOS DE HACER

### 1. Instalación Completada
```bash
npm install -g n8n
```
✅ n8n versión más reciente instalada globalmente

### 2. n8n Iniciado
```bash
n8n start
```
✅ n8n corriendo en: **http://localhost:5678**

---

## 🎯 PRIMER USO

### Accede a n8n:
👉 **http://localhost:5678**

Se debería haber abierto automáticamente en tu navegador.

### Primera vez:
1. n8n te pedirá crear una cuenta (local, solo en tu Mac)
2. Ingresa:
   - Email: tu email (puede ser cualquiera, es local)
   - Password: una contraseña segura
3. Click en "Get started"

---

## 📚 QUÉ HACER AHORA

### Paso 1: Familiarízate con la interfaz (5 min)
- Explora el menú lateral
- Mira los workflows de ejemplo
- Revisa los nodos disponibles

### Paso 2: Crear primer workflow (10 min)
Vamos a crear un workflow simple que:
1. Reciba datos (webhook o manual)
2. Los envíe a Firebase
3. Aparezcan en el KDS

### Paso 3: Conectar con Firebase (10 min)
- Configurar credenciales de Firebase
- Probar conexión
- Insertar pedido de prueba

---

## 🔥 WORKFLOW OBJETIVO

```
┌─────────────┐
│   Trigger   │ ← Webhook o Manual
│   (Start)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Procesar  │ ← Extraer datos del pedido
│   Mensaje   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Firebase  │ ← Insertar en Realtime Database
│   (Insert)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Respuesta │ ← Confirmar al cliente
│   (Output)  │
└─────────────┘
```

---

## 🛠️ COMANDOS ÚTILES

### Iniciar n8n:
```bash
n8n start
```

### Detener n8n:
```bash
# Presiona Ctrl+C en la terminal donde corre
# O busca el proceso:
lsof -ti:5678 | xargs kill -9
```

### Ver logs:
```bash
# Los logs aparecen en la terminal donde iniciaste n8n
```

### Reiniciar n8n:
```bash
# Detener (Ctrl+C) y luego:
n8n start
```

---

## 📂 UBICACIÓN DE DATOS

### Workflows guardados:
```
~/.n8n/
```

### Base de datos local:
```
~/.n8n/database.sqlite
```

### Credenciales:
```
~/.n8n/credentials.json
```

⚠️ **Importante:** Todo se guarda localmente en tu Mac.

---

## 🎓 PRÓXIMOS PASOS

### Ahora que n8n está corriendo:

1. **Crea tu cuenta en n8n** (primera vez)
   - Abre http://localhost:5678
   - Registra tu cuenta local

2. **Explora la interfaz** (5 min)
   - Mira los nodos disponibles
   - Revisa workflows de ejemplo

3. **Crea primer workflow** (10 min)
   - Click en "Add workflow"
   - Arrastra nodos
   - Conéctalos

4. **Conecta con Firebase** (siguiente paso)
   - Voy a guiarte para:
     * Configurar credenciales de Firebase
     * Crear workflow de ejemplo
     * Probar inserción en KDS

---

## ✅ CHECKLIST

Marca lo que ya hiciste:

- [x] n8n instalado
- [x] n8n iniciado en localhost:5678
- [ ] Cuenta creada en n8n
- [ ] Primer workflow creado
- [ ] Firebase conectado
- [ ] Pedido de prueba insertado
- [ ] Pedido visible en KDS

---

## 🚀 SIGUIENTE ACCIÓN

**¿Ya se abrió n8n en tu navegador?**

Si sí:
- Crea tu cuenta (email + password)
- Avísame cuando estés en el dashboard

Si no:
- Abre manualmente: http://localhost:5678
- O dime si ves algún error

---

## 💡 RECORDATORIO

### Ventajas de trabajar local:
✅ Gratis total
✅ Sin límites de ejecuciones
✅ Cambios instantáneos
✅ Perfecto para aprender

### Cuando termines de desarrollar:
📤 Exportas workflows
🚀 Despliegas a Railway
🔗 Conectas WhatsApp API
🎉 ¡A producción!

---

**Última actualización:** 1 de enero de 2026
**Estado:** n8n corriendo en http://localhost:5678
