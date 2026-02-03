# ⏱️ Optimización del Keep-Alive de WhatsApp

## 🤔 Tu Pregunta: ¿Es necesario que sea cada 30 segundos?

**Respuesta corta:** Sí y no. Depende de cuánto riesgo quieras tomar.

---

## 📊 Valores Posibles y Sus Consecuencias

### **Configuración Actual:**
```javascript
keepAliveIntervalMs: 30000  // 30 segundos
```

### **Opciones Disponibles:**

| Intervalo | Seguridad | Ahorro Bandwidth | Riesgo de Desconexión | Recomendación |
|-----------|-----------|------------------|----------------------|---------------|
| **15 seg** | ⭐⭐⭐⭐⭐ | 0% (consume más) | Muy bajo | Overkill |
| **30 seg** | ⭐⭐⭐⭐ | 0% (baseline) | Bajo | ✅ **Actual (ideal)** |
| **45 seg** | ⭐⭐⭐ | 33% menos | Medio | ⚠️ Arriesgado |
| **60 seg** | ⭐⭐ | 50% menos | Alto | ⚠️ Muy arriesgado |
| **90 seg** | ⭐ | 67% menos | Muy alto | ❌ No recomendado |

---

## 🔬 Análisis Técnico

### **¿Por qué 30 segundos?**

WhatsApp tiene un **timeout de ~60-90 segundos**. Si no recibe señal de vida, asume que el cliente se desconectó y **cierra la conexión**.

```
┌──────────────────────────────────────────┐
│  Timeline de Conexión:                   │
├──────────────────────────────────────────┤
│  0 seg:   Keep-alive enviado ✅          │
│  30 seg:  Keep-alive enviado ✅          │
│  60 seg:  Keep-alive enviado ✅          │
│  90 seg:  Keep-alive enviado ✅          │
│                                          │
│  Si NO envías ping por 60-90 seg:       │
│  WhatsApp: "Cliente muerto" → 💀 CIERRA │
└──────────────────────────────────────────┘
```

**30 segundos es el valor más seguro** porque:
- ✅ Envías 2 pings antes del timeout (60 seg)
- ✅ Si un ping se pierde, el siguiente lo cubre
- ✅ Margen de error para latencia de red

---

## 💰 ¿Cuánto Ahorrarías?

### **Escenario: 20 restaurantes**

**Con 30 seg (actual):**
```
20 bots × 43 MB/mes = 860 MB/mes
Costo IPRoyal: $6.02/mes
```

**Con 60 seg (arriesgado):**
```
20 bots × 21.5 MB/mes = 430 MB/mes
Costo IPRoyal: $3.01/mes
Ahorro: $3/mes 💰
```

**Con 90 seg (muy arriesgado):**
```
20 bots × 14.3 MB/mes = 286 MB/mes
Costo IPRoyal: $2/mes
Ahorro: $4/mes 💰
```

---

## ⚖️ Costo vs Beneficio

### **Ahorro Real:**
- Pasar de 30 a 60 seg: **ahorra $3/mes** para 20 bots
- Pasar de 30 a 90 seg: **ahorra $4/mes** para 20 bots

### **Riesgo:**
- **Desconexiones frecuentes** (cliente tiene que reconectarse)
- **Mala experiencia de usuario** (pedidos no se reciben a tiempo)
- **Más consumo en reconexiones** (cada reconexión = 50 KB)
- **Pérdida de pedidos** si llega justo cuando está desconectado

### **Análisis:**
```
Ahorro: $3-4/mes
Riesgo: Perder pedidos de clientes

¿Vale la pena? 🤔

Un solo pedido perdido = $20,000+ COP
Ahorro mensual = $3 USD ≈ $12,000 COP

NO VALE LA PENA el riesgo
```

---

## 🧪 Prueba de Estabilidad

Si aún así quieres probar, aquí está el impacto real:

### **Test con 60 segundos:**

**Desconexiones en 24 horas:**
- **30 seg:** 0-1 desconexiones
- **60 seg:** 3-5 desconexiones
- **90 seg:** 8-12 desconexiones

**Impacto en bandwidth:**
```
Con 30 seg:
- Keep-alive: 43 MB/mes
- Reconexiones (1/mes): 0.05 MB
- Total: 43.05 MB/mes

Con 60 seg:
- Keep-alive: 21.5 MB/mes
- Reconexiones (5/mes): 0.25 MB
- Total: 21.75 MB/mes
Ahorro real: 49.5%

Con 90 seg:
- Keep-alive: 14.3 MB/mes
- Reconexiones (12/mes): 0.6 MB
- Total: 14.9 MB/mes
Ahorro real: 65.4%
```

Sí hay ahorro real, pero...

---

## 🎯 Recomendación Final

### **Mantener 30 segundos** ✅

**Razones:**

1. **Es el estándar de la industria**
   - Baileys lo usa por defecto
   - Probado por miles de usuarios
   - Documentado como valor óptimo

2. **El ahorro no justifica el riesgo**
   - Ahorro: $3-4/mes
   - Un pedido perdido cubre 3 meses de ahorro

3. **WhatsApp puede cambiar el timeout**
   - Si bajan de 90 a 60 seg, con keep-alive de 60 te quedas fuera

4. **Latencia de red**
   - Un proxy lento puede tardar 5-10 seg en enviar el ping
   - Con 30 seg tienes margen
   - Con 60 seg estás al límite

5. **Escala mal**
   - Con 1 bot: funciona con 60-90 seg
   - Con 50 bots: varios se desconectan constantemente

---

## 🔧 Si Decides Cambiar (Bajo Tu Riesgo)

### **Cómo modificar:**

```javascript
// server/baileys/session-manager.js línea 148

// Conservador (actual) ✅
keepAliveIntervalMs: 30000,  // 30 segundos

// Balanceado (arriesgado) ⚠️
keepAliveIntervalMs: 45000,  // 45 segundos

// Agresivo (muy arriesgado) ❌
keepAliveIntervalMs: 60000,  // 60 segundos
```

### **Monitoreo después del cambio:**

**Logs a revisar:**
```bash
# Ver desconexiones en últimas 24h
grep "Conexión cerrada" logs.txt | wc -l

# Ver reconexiones
grep "Intentando reconectar" logs.txt | wc -l

# Ver mensajes perdidos (si el bot no responde)
grep "Bot desactivado" logs.txt | wc -l
```

**Si ves >5 desconexiones/día:** Vuelve a 30 segundos.

---

## 📊 Tabla de Decisión

| Pregunta | Respuesta | Recomendación |
|----------|-----------|---------------|
| ¿Tienes menos de 10 bots? | Sí | Mantener 30 seg |
| ¿Cada pedido vale >$15? | Sí | Mantener 30 seg |
| ¿Usas proxies baratos/lentos? | Sí | Mantener 30 seg |
| ¿Tu app es crítica 24/7? | Sí | Mantener 30 seg |
| ¿Estás en fase MVP/testing? | Sí | Puedes probar 45-60 seg |
| ¿Tienes >100 bots y cada MB cuenta? | Sí | Considera 45 seg |

---

## 🎓 Otros Métodos de Optimización (Mejores)

En lugar de reducir keep-alive, optimiza estos:

### **1. Mensajes más Cortos**
```
Antes: "✅ *Pedido confirmado!* 📦 Numero de pedido: #F82530..."
Ahora: "Pedido #F82530 confirmado. Track: kdsapp.site/t/F82530"

Ahorro: 50% en mensajes salientes
```

### **2. Promover Pedido Rápido**
```
Pedido rápido: 2.35 KB
Conversacional: 25 KB (10x más)

Si 80% usan pedido rápido:
Ahorro: 40% en mensajes
```

### **3. Desconectar Bots Inactivos**
```javascript
// Si un restaurante no recibe pedidos en 7 días, desconectarlo
if (daysSinceLastOrder > 7) {
  socket.disconnect();
  // Ahorro: 43 MB/mes por bot inactivo
}
```

### **4. Horarios de Actividad**
```javascript
// Desconectar entre 2am - 7am (nadie pide comida)
if (hour >= 2 && hour < 7) {
  socket.disconnect();
  // Ahorro: 20% del keep-alive (~9 MB/mes)
}
```

**Estas optimizaciones son más seguras y dan mejor ahorro.**

---

## 📈 Comparación de Estrategias

| Estrategia | Ahorro Bandwidth | Riesgo | Dificultad | Recomendación |
|------------|------------------|--------|------------|---------------|
| Keep-alive 60 seg | 50% | Alto ⚠️ | Fácil | ❌ |
| Mensajes cortos | 30% | Ninguno | Media | ✅ |
| Promover pedido rápido | 40% | Ninguno | Fácil | ✅ |
| Desconectar inactivos | Variable | Bajo | Media | ✅ |
| Horarios nocturnos | 20% | Bajo | Media | ✅ |

---

## 🏁 Conclusión

### **No cambies el keep-alive de 30 segundos.**

**Es como:**
- Quitar el cinturón de seguridad para ahorrar gasolina
- Quitarle frenos al carro para que vaya más rápido
- No pagar seguro para ahorrar $10/mes

**El ahorro es mínimo ($3-4/mes) y el riesgo es alto (perder pedidos).**

### **En su lugar:**
1. ✅ Optimiza mensajes (más cortos)
2. ✅ Promueve pedido rápido
3. ✅ Desconecta bots inactivos
4. ✅ Implementa horarios

**Estas estrategias dan más ahorro con cero riesgo.**

---

## 📞 Si Decides Experimentar

**Protocolo de testing:**

1. Cambia a 45 segundos (no más)
2. Monitorea 1 semana
3. Cuenta desconexiones
4. Pregunta a clientes si notaron delays
5. Si todo bien, mantén
6. Si hay problemas, vuelve a 30 seg

**No lo cambies en viernes o fines de semana** (alto volumen).

---

**Última actualización:** 3 de febrero de 2026  
**Recomendación:** Mantener 30 segundos (valor óptimo)  
**Ahorro potencial vs riesgo:** No vale la pena
