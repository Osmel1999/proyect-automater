# Registro de Cambios - Bot de Pedidos WhatsApp

## [v1.2.0] - Mejoras del Parser de Lenguaje Natural

### 🎯 Mejoras Implementadas

#### ✅ Reconocimiento de "botella de agua"
- **Antes:** "botella de agua" no era reconocido
- **Ahora:** Reconoce automáticamente "Agua Mineral"
- **Variaciones soportadas:**
  - "botella de agua"
  - "botellita de agua"
  - "botella agua"
  - "agua"
  - "aguita"

**Ejemplo:**
```
Usuario: botella de agua
Bot: ✅ Entendí tu pedido:
     1x Agua Mineral - $150
```

#### ✅ Interpretación de "una", "un", "uno" como cantidad = 1
- **Antes:** "una hamburguesa" podía no reconocer la cantidad correctamente
- **Ahora:** Reconoce "una", "un", "uno" al inicio del texto como cantidad = 1
- **Mejora:** Búsqueda prioritaria al inicio del texto para mayor precisión

**Ejemplo:**
```
Usuario: una hamburguesa
Bot: ✅ Entendí tu pedido:
     1x Hamburguesa Completa - $850
```

#### ✅ Casos de prueba expandidos
- Agregados 3 nuevos casos de prueba específicos:
  1. "una hamburguesa" (cantidad implícita)
  2. "botella de agua" (sinónimo natural)
  3. "2 botellas de agua y una hamburguesa" (combinado)

**Resultado:** 13/13 pruebas pasando (100% de éxito)

### 🔧 Cambios Técnicos

#### `pedido-parser.js`
1. **Función `obtenerVariaciones()`:**
   - Actualizada la tabla de sinónimos
   - "agua mineral" ahora incluye: `['agua', 'aguita', 'botella de agua', 'botellita de agua', 'botella agua']`

2. **Función `extraerCantidad()`:**
   - Mejorada búsqueda de números en palabras
   - Prioridad a palabras al inicio del texto (`.startsWith()`)
   - Búsqueda secundaria en cualquier parte del texto (`.includes()`)
   - Números en palabras con espacio explícito: `'una '`, `'dos '`, etc.

3. **Función `parsearPedido()`:**
   - Nueva limpieza de palabras de cantidad antes de buscar productos
   - Lista de palabras de cantidad: `['un ', 'una ', 'uno ', 'dos ', ..., 'diez ', 'media ', 'medio ']`
   - Eliminación de cantidad solo al inicio para evitar conflictos (e.g., "atún")

#### `test-parser.js`
- Agregados 3 nuevos casos de prueba
- Total de pruebas: 10 → 13

#### `GUIA-LENGUAJE-NATURAL.md`
- Agregados nuevos ejemplos de uso
- Formato 8: Cantidad implícita con "una", "un"
- Formato 9: Frases naturales para agua
- Actualizada tabla de sinónimos
- Agregados nuevos casos de prueba en documentación

### 📊 Impacto
- **Comprensión mejorada:** Más frases naturales reconocidas
- **Experiencia de usuario:** Más intuitivo y natural
- **Cobertura de tests:** 100% de casos pasando
- **Robustez:** Mejor manejo de cantidades implícitas

---

## [v1.1.0] - Sistema de Lenguaje Natural Inicial

### ✅ Implementado
- Parser de lenguaje natural (`pedido-parser.js`)
- Integración con bot-logic.js
- Sistema de confirmación en dos pasos
- Sinónimos básicos
- Suite de pruebas automatizadas
- Documentación completa

### 📝 Características
- Múltiples items en un mensaje
- Cantidades en números o palabras
- Sinónimos comunes
- Reducción de 60% en costos de mensajería

---

## [v1.0.0] - Sistema Base

### ✅ Características Iniciales
- Bot básico con menú
- Integración con Twilio WhatsApp
- Firebase para pedidos
- KDS (Kitchen Display System)
- Pedidos por número de item
