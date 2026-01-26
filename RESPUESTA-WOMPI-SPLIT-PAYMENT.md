# 🎯 Respuesta: ¿Wompi Puede Enviar Dinero Directo al Restaurante?

**Fecha:** 22 de enero de 2026  
**Pregunta:** ¿Es posible que el dinero que pague el cliente vaya directo a la cuenta del restaurante, y que tu comisión se retenga automáticamente?

---

## ✅ SÍ, ES TOTALMENTE POSIBLE

### 🚀 La Solución: **Wompi Marketplace** (Split Payment)

Wompi ofrece una funcionalidad llamada **Split Payment** que permite dividir un pago automáticamente entre múltiples cuentas.

---

## 📊 Cómo Funciona en la Práctica

```
Cliente paga $50.000 por su pedido
         ↓
Bot genera link de pago de Wompi
         ↓
Cliente hace clic y paga con PSE/tarjeta/Nequi
         ↓
🎯 WOMPI DIVIDE EL PAGO AUTOMÁTICAMENTE:
  ├─ $47.500 (95%) → Cuenta bancaria del restaurante ✅
  └─ $2.500 (5%)   → Tu cuenta (comisión) ✅
         ↓
Webhook notifica a tu backend
         ↓
Bot confirma pedido automáticamente
```

---

## 💡 Ventajas Clave

### 1. **Dinero Directo al Restaurante**
- El restaurante recibe su dinero en su cuenta bancaria en 24-48 horas
- NO pasa por tu cuenta primero
- Legal y fiscalmente limpio

### 2. **Tu Comisión es Automática**
- No tienes que cobrar manualmente
- No dependes de que el restaurante te pague
- Wompi divide el pago en el momento

### 3. **Validación 100% Automática**
- Webhook de Wompi confirma el pago
- No necesitas revisar capturas
- No necesitas OCR
- Cero intervención manual

### 4. **Sin Credenciales del Restaurante**
- No manejas información sensible
- No necesitas sus claves de Nequi/banco
- Más seguro para todos

### 5. **Escalable Infinitamente**
- Funciona igual con 1 o 1,000 restaurantes
- Sin límite de transacciones
- Sin necesidad de contratar personal

---

## 💻 Implementación Técnica

### Paso 1: Onboarding del Restaurante

El restaurante solo necesita:
1. Email de Wompi (crear cuenta gratuita)
2. Número de cuenta bancaria
3. Documentos legales (RUT, cédula)

**Tiempo:** 5 minutos + 2-3 días de aprobación de Wompi

### Paso 2: Crear Pago con Split

```javascript
// Tu backend genera el link de pago con split automático

const response = await axios.post('https://production.wompi.co/v1/payment_links', {
  amount_in_cents: 5000000, // $50.000 COP
  currency: 'COP',
  
  // 🎯 SPLIT PAYMENT
  split_payment: {
    enabled: true,
    splits: [
      {
        merchant_id: restaurante.wompi_merchant_id,
        amount_in_cents: 4750000, // 95% para restaurante
        description: 'Venta de comida'
      },
      {
        merchant_id: tu_merchant_id,
        amount_in_cents: 250000, // 5% tu comisión
        description: 'Comisión plataforma'
      }
    ]
  }
});

// El bot envía el link al cliente por WhatsApp
const linkPago = response.data.data.permalink;
```

### Paso 3: Cliente Paga

- Recibe link por WhatsApp
- Hace clic y se abre el checkout de Wompi
- Elige método: PSE, tarjeta, Nequi, Bancolombia
- Paga en 1-2 minutos

### Paso 4: División Automática

- Wompi procesa el pago
- Divide automáticamente:
  - 95% → Cuenta del restaurante
  - 5% → Tu cuenta
- Envía webhook a tu backend
- Bot confirma el pedido al cliente

---

## 💰 Costos Reales

### Ejemplo con pedido de $50.000:

```
Comisión Wompi: 2.99% + $900 = $2.395

Cliente paga: $50.000 + $2.395 = $52.395

Split automático:
├─ Restaurante recibe: $47.500 (95%)
├─ Tú recibes: $2.500 (5%)
└─ Wompi retiene: $2.395

Resumen:
- Cliente paga: $52.395 (4.8% más)
- Restaurante gana: $47.500
- Tú ganas: $2.500
- Wompi gana: $2.395
```

### ¿Es caro para el cliente?

- **NO**, si lo comparas con:
  - Domicilios tradicionales: +15-30%
  - Rappi/Uber Eats: +30-40%
  - KDS: +4.8% (solo la comisión de Wompi)

- Tu comisión del 5% NO incrementa el precio al cliente
- Solo paga la comisión de Wompi (2.99% + $900)

---

## 🎯 Estrategia Recomendada

### Modelo de 3 Planes:

| Plan | Método Pago | Automatización | Setup |
|------|-------------|----------------|--------|
| **Básico** | Transfer + OCR | Manual (5 min) | Inmediato |
| **Premium** | Wompi Split | 100% automático | 2-3 días |
| **Enterprise** | Nequi API + Wompi | 100% automático | 3-5 días |

### Flujo de Onboarding:

1. **Restaurante se registra** → Comienza con Plan Básico (OCR + manual)
2. **Primera semana** → Validas manualmente capturas
3. **Cliente solicita automatización** → Ofreces Plan Premium (Wompi)
4. **Onboarding Wompi** → 2-3 días de aprobación
5. **Activas Wompi** → 100% automático desde ese momento

---

## ⚙️ Comparativa de Soluciones

| Aspecto | OCR + Manual | Nequi API (creds) | **Wompi Marketplace** |
|---------|--------------|-------------------|-----------------------|
| **Dinero directo** | ✅ Transferencia | ✅ Sí | ✅ **Automático** |
| **Tu comisión** | ❌ Manual | ❌ Manual | ✅ **Automática** |
| **Validación** | ❌ Manual | ✅ API | ✅ **Webhook** |
| **Credenciales** | ❌ No | ⚠️ Sí (riesgoso) | ✅ **No** |
| **Tiempo setup** | 5 min | 1-3 días | 2-3 días |
| **Sale WhatsApp** | ❌ No | ❌ No | ⚠️ Sí |
| **Costo cliente** | $0 | $0 | +4.8% |
| **Fraude** | Medio | Bajo | **Muy bajo** |
| **Escalabilidad** | Baja | Media | **Infinita** |
| **Legal/fiscal** | ✅ Limpio | ✅ Limpio | ✅ **Limpio** |

---

## ✅ Recomendación Final

### **Wompi Marketplace es la MEJOR solución si:**

1. ✅ Quieres **automatización completa**
2. ✅ No quieres manejar dinero de terceros
3. ✅ Quieres cobrar tu comisión sin esfuerzo
4. ✅ Buscas escalabilidad real
5. ✅ No quieres credenciales sensibles
6. ✅ Prefieres legalidad fiscal clara

### **Úsala en conjunto con OCR para flexibilidad:**

- **Plan Básico (Gratis):** OCR + validación manual
- **Plan Premium ($50k/mes):** Wompi Marketplace con split automático
- Cliente elige qué plan le conviene

---

## 🚀 Próximos Pasos

1. **Registrarte como Marketplace en Wompi**
   - Crear cuenta empresarial
   - Solicitar habilitación de Split Payment
   - Obtener API keys

2. **Implementar backend**
   - Endpoint para registrar restaurantes
   - Endpoint para crear pagos con split
   - Webhook para confirmar pagos

3. **Actualizar dashboard**
   - Sección "Configurar Wompi"
   - Input de datos bancarios del restaurante
   - Visualización de comisiones retenidas

4. **Probar con 1 restaurante piloto**
   - Onboarding completo
   - Generar primer link de pago
   - Validar webhook y splits

5. **Escalar**
   - Ofrecer a más restaurantes
   - Documentar proceso
   - Automatizar aprobaciones

---

## 📚 Referencias

- [Documentación Wompi Marketplace](https://docs.wompi.co/docs/en/marketplace)
- [API de Split Payment](https://docs.wompi.co/docs/en/pagos-multiples)
- [Webhooks Wompi](https://docs.wompi.co/docs/en/webhooks)
- Código completo en: `SOLUCION-WOMPI-MARKETPLACE.md`

---

## 🎯 Conclusión

**SÍ, Wompi puede enviar el dinero directo al restaurante y retener tu comisión automáticamente.**

Es la solución más profesional, escalable y legal para un SaaS de pagos en Colombia.

La única desventaja es que el cliente debe salir de WhatsApp brevemente para pagar, pero a cambio obtienes:
- **Cero fraude**
- **Cero trabajo manual**
- **Comisión automática**
- **Escalabilidad infinita**

**Vale totalmente la pena.**
