# 🔐 CAMBIAR CONTRASEÑA DEL USUARIO

## ⚠️ Chrome muestra advertencia de contraseña débil

Chrome detectó que `123456` es una contraseña débil y muestra un aviso de seguridad.

---

## ✅ SOLUCIONES

### **Opción 1: Ignorar el mensaje (Recomendado para Desarrollo)**

1. En el mensaje de Chrome, clic en **"El sitio es legítimo"**
2. Continúa usando la app normalmente
3. ✅ Perfecto para pruebas y desarrollo

---

### **Opción 2: Cambiar a una contraseña más fuerte**

Si prefieres una contraseña más segura (recomendado para producción):

#### **Paso 1: Accede a Firebase Console**
https://console.firebase.google.com/project/kds-app-7f1d3/authentication/users

#### **Paso 2: Encuentra tu usuario**
- Email: `123@mail.com`

#### **Paso 3: Clic en el usuario**

#### **Paso 4: Clic en "Reset password"** (Restablecer contraseña)

#### **Paso 5: Ingresa nueva contraseña**
Ejemplos de contraseñas fuertes:
- `KDS-2024!Cocina`
- `MiCocina#2024$`
- `CocinaSeg@2024!`
- `KitchenDisplay#2024`

Requisitos:
- Mínimo 6 caracteres (recomendado: 10+)
- Combina mayúsculas, minúsculas, números y símbolos
- No uses palabras comunes

#### **Paso 6: Guardar**

#### **Paso 7: Usa la nueva contraseña**
La próxima vez que inicies sesión, usa:
- Email: `123@mail.com`
- Password: `Tu nueva contraseña fuerte`

---

### **Opción 3: Crear un nuevo usuario con contraseña fuerte**

Si prefieres empezar de cero con credenciales más seguras:

#### **Paso 1: Accede a Firebase Console**
https://console.firebase.google.com/project/kds-app-7f1d3/authentication/users

#### **Paso 2: Clic en "Add user"**

#### **Paso 3: Crea usuario con credenciales fuertes**
Ejemplos:
- Email: `admin@kds-cocina.com`
- Password: `KDS-2024!Cocina#Seg`

O:
- Email: `cocina@kds.com`
- Password: `Cocina#Display2024!`

#### **Paso 4: Guardar**

#### **Paso 5: Usa las nuevas credenciales**

---

## 🛡️ RECOMENDACIONES DE SEGURIDAD

### **Para Desarrollo/Pruebas:**
- ✅ Contraseña simple está bien (`123456`)
- ✅ Ignora el mensaje de Chrome
- ✅ Prioriza las pruebas y funcionalidad

### **Para Producción:**
- ⚠️ Usa contraseñas fuertes
- ⚠️ Crea usuarios específicos para cada persona
- ⚠️ No compartas credenciales públicamente
- ⚠️ Cambia contraseñas periódicamente

### **Ejemplos de contraseñas fuertes:**
```
❌ Débiles:
- 123456
- password
- cocina123

✅ Fuertes:
- KDS-2024!Cocina#Seg
- MiCocina$Display#2024
- Kitchen@2024!Oculta
- Cocina#Seg2024$KDS
```

---

## 🔒 SOBRE EL CERTIFICADO SSL

El mensaje también muestra "El certificado es válido" ✅

Esto significa que tu sitio tiene HTTPS activo (Firebase lo provee automáticamente), lo cual es excelente para seguridad. La única advertencia es sobre la contraseña débil.

---

## ❓ PREGUNTAS FRECUENTES

### **¿Es seguro seguir usando 123456?**
Para desarrollo y pruebas: **Sí, es seguro.**
Para producción con clientes reales: **No, cámbiala.**

### **¿El mensaje afecta el funcionamiento?**
**No.** Es solo una recomendación. La app funciona perfectamente.

### **¿Debo cambiar la contraseña ahora?**
**Depende:**
- En desarrollo/pruebas: No es urgente
- En producción: Sí, cámbiala

### **¿Chrome bloqueará mi sitio?**
**No.** Chrome solo te advierte, no bloquea el sitio.

---

## ✅ DECISIÓN RECOMENDADA

### **Por ahora (Desarrollo):**
1. ✅ Clic en "El sitio es legítimo"
2. ✅ Continúa probando la app
3. ✅ Ignora el mensaje de contraseña

### **Antes de producción:**
1. ⚠️ Cambia a contraseña fuerte
2. ⚠️ Crea usuarios específicos para cada persona
3. ⚠️ Documenta las credenciales de forma segura

---

## 🎯 RESUMEN

- **Mensaje de Chrome**: Solo una recomendación, no un error
- **Tu app**: ✅ Funciona perfectamente
- **Certificado SSL**: ✅ Válido y seguro
- **Acción requerida**: Ninguna (solo clic en "El sitio es legítimo")

---

**¡Tu KDS está funcionando correctamente!** 🎊

El mensaje es solo Chrome siendo precavido con contraseñas débiles.
