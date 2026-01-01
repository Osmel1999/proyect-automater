# 🔧 Solución: "Requiere configuración" en Firebase

## ⚠️ Problema
Firebase muestra "Requiere configuración" para el dominio `kdsapp.site`

---

## 🔍 Causas Posibles

1. **DNS aún no propagado** (más común - solo esperar)
2. **Error en la configuración de Hostinger** (necesita corrección)
3. **Nameservers incorrectos** (revisar)
4. **Registros mal escritos** (revisar sintaxis)

---

## ✅ SOLUCIÓN 1: Verificar Configuración en Hostinger

### Paso 1: Revisar los Registros Actuales

Entra a Hostinger y verifica que tengas EXACTAMENTE esto:

#### 📋 Registros Requeridos:

| Tipo | Nombre/Host | Valor/Apunta a | TTL |
|------|-------------|----------------|-----|
| **A** | `@` | `199.36.158.100` | 14400 (o cualquiera) |
| **TXT** | `@` | `hosting-site=kds-app-7f1d3` | 14400 (o cualquiera) |

#### ⚠️ Errores Comunes a Evitar:

❌ **NO uses:**
- `kdsapp.site` como nombre (usa `@`)
- `www` para el registro A (eso es para CNAME)
- Comillas en el registro A
- Espacios extra en el TXT

✅ **SÍ usa:**
- `@` para representar el dominio raíz
- Exactamente `199.36.158.100` (sin espacios)
- Exactamente `hosting-site=kds-app-7f1d3` (sin comillas extras)

---

## ✅ SOLUCIÓN 2: Verificar Nameservers

Firebase necesita que tu dominio use los nameservers correctos.

### En Hostinger:

1. Ve a **Dominios** → `kdsapp.site`
2. Busca **Nameservers** o **Servidores DNS**
3. Deben ser los de Hostinger:
   ```
   ns1.dns-parking.com
   ns2.dns-parking.com
   ```
   O similar (pueden variar según Hostinger)

⚠️ **Si están en "Parking" o "Parked":**
- Activa el dominio
- Configura DNS Zone
- Puede tardar 24h en activarse

---

## ✅ SOLUCIÓN 3: Configuración Correcta Paso a Paso

### En Hostinger (Panel de Control):

#### 1️⃣ **Eliminar Registros Anteriores (si existen)**
- Elimina cualquier registro A o TXT que apunte a otro sitio
- Deja solo los de Firebase

#### 2️⃣ **Agregar Registro A**
```
Tipo: A
Nombre: @
Valor: 199.36.158.100
TTL: 14400 (o 3600, o 300)
```

#### 3️⃣ **Agregar Registro TXT**
```
Tipo: TXT
Nombre: @
Valor: hosting-site=kds-app-7f1d3
TTL: 14400 (o 3600, o 300)
```

#### 4️⃣ **Agregar Registro CNAME (Opcional pero recomendado)**
```
Tipo: CNAME
Nombre: www
Valor: kdsapp.site
TTL: 14400
```

#### 5️⃣ **Guardar y Esperar**
- Click en "Guardar" o "Save"
- Espera 10-30 minutos mínimo

---

## ✅ SOLUCIÓN 4: Verificar Propagación DNS

### Opción A: Online (Más fácil)

Ve a: **https://dnschecker.org/**

1. Ingresa: `kdsapp.site`
2. Selecciona: `A Record`
3. Click en "Search"
4. Debe mostrar: `199.36.158.100` en varios países

Luego:
1. Selecciona: `TXT Record`
2. Debe mostrar: `hosting-site=kds-app-7f1d3`

Si ves ✅ verdes en varios países → Está propagado
Si ves ❌ rojos → Aún no está propagado

### Opción B: Desde Terminal (Mac)

```bash
# Ver registro A
dig kdsapp.site A +short
# Debe mostrar: 199.36.158.100

# Ver registro TXT
dig kdsapp.site TXT +short
# Debe mostrar: "hosting-site=kds-app-7f1d3"

# Si no muestra nada, aún no está propagado
```

---

## ✅ SOLUCIÓN 5: Si Ya Pasaron 24 Horas

### Contactar Soporte de Hostinger

Si después de 24 horas sigue sin funcionar:

1. **Chat/Ticket a Hostinger:**
   ```
   Hola, configuré estos registros DNS para mi dominio kdsapp.site:
   
   - Registro A: @ → 199.36.158.100
   - Registro TXT: @ → hosting-site=kds-app-7f1d3
   
   Pero no se están propagando. ¿Pueden verificar?
   ```

2. **Pide que revisen:**
   - Si el dominio está activo (no en parking)
   - Si los nameservers son correctos
   - Si hay algún bloqueo o conflicto

---

## 🎯 Checklist de Diagnóstico

Marca lo que ya verificaste:

- [ ] Registro A existe: `@` → `199.36.158.100`
- [ ] Registro TXT existe: `@` → `hosting-site=kds-app-7f1d3`
- [ ] No hay espacios extra en los valores
- [ ] No hay comillas extra en el registro A
- [ ] El dominio está activo (no en parking)
- [ ] Los nameservers son de Hostinger
- [ ] Han pasado al menos 2 horas desde la configuración
- [ ] DNSChecker.org muestra los registros correctos

---

## 🚨 Error Específico en Firebase

### Si Firebase dice exactamente qué falta:

#### "No se encontró el registro A"
→ El registro A no está visible o está mal configurado
→ Verifica que sea `@` y `199.36.158.100`

#### "No se encontró el registro TXT"
→ El registro TXT no está visible o está mal escrito
→ Verifica que sea exactamente `hosting-site=kds-app-7f1d3`

#### "El dominio no está configurado"
→ Los nameservers no apuntan a Hostinger
→ Verifica los nameservers del dominio

---

## 🔄 Proceso de Re-verificación

Una vez corregido:

1. **Espera 10-30 minutos** mínimo
2. **Ve a Firebase Console**
3. **Hosting → Custom domains**
4. **Click en tu dominio**
5. **Click en "Verify" o "Verificar"**
6. Si sigue fallando, espera 1-2 horas más

---

## 💡 Tip: TTL Bajo para Pruebas

Si necesitas hacer cambios rápidos:

1. Cambia el TTL a `300` (5 minutos)
2. Haz los cambios
3. Los cambios se propagan más rápido
4. Una vez que funcione, puedes subirlo a `14400`

---

## 📞 ¿Necesitas Ayuda?

Si sigues teniendo problemas:

1. Toma capturas de:
   - Panel DNS de Hostinger (con los registros)
   - Mensaje de error en Firebase
   - Resultado de dnschecker.org

2. Comparte las capturas para diagnóstico más específico

---

## ⏰ Tiempos Realistas

- **Configuración:** 5 minutos
- **Propagación mínima:** 10-30 minutos
- **Propagación normal:** 2-4 horas
- **Propagación máxima:** 24-48 horas
- **Si pasa de 48h:** Hay un error de configuración

---

**Última actualización:** 1 de enero de 2026
