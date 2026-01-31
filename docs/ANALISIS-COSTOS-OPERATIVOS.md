# Análisis de Costos Operativos - KDS WhatsApp Bot

**Fecha de análisis**: 31 de Enero 2026  
**Última actualización**: 31 de Enero 2026 (con datos exactos de planes)

> **Terminología:**
> - **Restaurante** = Usuario de tu plataforma (tenant) que paga mensualidad
> - **Cliente final** = Persona que hace pedidos por WhatsApp al restaurante
> - **Pedido** = Una transacción completa (varios mensajes de WhatsApp)

---

## 1. Planes y Límites de los Servicios

### Railway

| Plan | Costo | Recursos | Almacenamiento |
|------|-------|----------|----------------|
| **Free** | $0 + $5 créditos (30 días trial) | 1 vCPU / 0.5 GB RAM | 0.5 GB |
| **Hobby** | $5/mes mínimo | 48 vCPU / 48 GB RAM | 5 GB |
| **Pro** | $20/mes mínimo | 1000 vCPU / 1 TB RAM | 1 TB |

> Railway cobra por uso. Los $5 o $20 son el **mínimo**, si usas más recursos pagas más.

### Firebase (Realtime Database + Hosting)

| Concepto | Gratis (Spark) | De pago (Blaze) |
|----------|----------------|-----------------|
| **Conexiones simultáneas** | 100 | 200,000 |
| **Almacenamiento DB** | 1 GB | 1 GB gratis, luego $5/GB |
| **Descargas DB** | 10 GB/mes | 10 GB gratis, luego $1/GB |
| **Hosting almacenamiento** | 10 GB | 10 GB gratis, luego $0.026/GB |
| **Hosting transferencia** | 360 MB/día (~10.8 GB/mes) | 360 MB/día gratis, luego $0.15/GB |

---

## 2. Consumo por Cliente Final (1 Pedido)

### Flujo típico de un pedido (5-7 mensajes):

| Paso | Mensaje | Lecturas Firebase | Escrituras | Datos |
|------|---------|-------------------|------------|-------|
| 1 | "Hola" | 2 (bot config + menú*) | 0 | ~2 KB |
| 2 | Bot envía menú | 0 | 0 | 0 |
| 3 | "Quiero 2 pizzas" | 1 (tiempo entrega) | 0 | ~1 KB |
| 4 | "Calle 50 #20" | 0 (sesión en memoria) | 0 | 0 |
| 5 | "Confirmar" | 0 | 1 (guardar pedido) | ~2 KB |
| 6 | KDS recibe pedido | 0 | 0 | ~0.5 KB** |
| 7 | Cambios estado (×2) | 0 | 2 | ~1 KB** |
| **TOTAL** | - | **3 lecturas** | **3 escrituras** | **~6.5 KB** |

*Menú cacheado 5 min, promedio 0.2 lecturas reales  
**Con optimización de listeners granulares

### Costo por pedido en Firebase:

| Concepto | Consumo | Costo |
|----------|---------|-------|
| Lecturas (~3) | ~3 KB descarga | Incluido en 10 GB gratis |
| Escrituras (~3) | ~3.5 KB subida | Incluido en 1 GB gratis |
| **Total por pedido** | **~6.5 KB** | **$0 (dentro del gratis)** |

### Consumo Railway por pedido:

| Recurso | Consumo estimado |
|---------|------------------|
| CPU | ~0.001 vCPU-segundo |
| RAM | ~5 MB pico (sesión activa) |
| **Impacto en factura** | **Despreciable** |

---

## 3. Consumo por Restaurante (Proyección Mensual)

### Escenario: Restaurante con 50 clientes finales/día

| Métrica | Cálculo | Total/mes |
|---------|---------|-----------|
| Pedidos/mes | 50 × 30 días | **1,500 pedidos** |
| Lecturas Firebase | 1,500 × 3 | **4,500 lecturas** |
| Escrituras Firebase | 1,500 × 3 | **4,500 escrituras** |
| Datos descargados | 1,500 × 6.5 KB | **~10 MB** |
| Almacenamiento (pedidos activos) | ~50 pedidos × 2 KB | **~100 KB** |
| Almacenamiento (historial mes) | 1,500 × 2 KB | **~3 MB** |

### Consumo KDS (12 horas/día abierto):

| Métrica | Cálculo | Total/mes |
|---------|---------|-----------|
| Eventos (nuevo + 2 cambios) | 1,500 × 3 | 4,500 eventos |
| Datos por evento (optimizado) | 0.5 KB | ~2.25 MB |
| Conexión inicial/día | 30 días | 30 conexiones |

### Consumo Dashboard (2 horas/día):

| Métrica | Total/mes |
|---------|-----------|
| Cargas de página | ~60 |
| Configuraciones | ~20 escrituras |

### **TOTAL POR RESTAURANTE (50 pedidos/día):**

| Concepto | Consumo/mes |
|----------|-------------|
| **Datos descargados (DB)** | ~15 MB |
| **Almacenamiento (DB)** | ~5 MB acumulado |
| **Hosting transferencia** | ~50 MB |
| **Conexiones simultáneas pico** | 3-5 |

---

## 4. Capacidad de Planes Gratuitos

### Firebase Spark (Gratis)

| Límite | Capacidad | Restaurantes máx (50 pedidos/día c/u) |
|--------|-----------|---------------------------------------|
| **100 conexiones simultáneas** | 100 KDS/Dashboards abiertos | **~30-50 restaurantes*** |
| **1 GB almacenamiento** | 1,000 MB | **~200 restaurantes** (5 MB c/u) |
| **10 GB descargas/mes** | 10,000 MB | **~666 restaurantes** (15 MB c/u) |

*El cuello de botella son las conexiones simultáneas (100 máx)

### Railway Free (Trial 30 días)

| Límite | Capacidad | Restaurantes máx |
|--------|-----------|------------------|
| **$5 créditos** | ~500 horas de 0.5 GB RAM | **Ilimitados** (30 días) |
| **0.5 GB RAM** | Suficiente para bot básico | **~20-30 restaurantes** activos |
| **1 vCPU** | Procesamiento limitado | **~20-30 restaurantes** |

---

## 5. Capacidad por Plan de Pago

### Firebase Blaze (Pago por uso)

| Restaurantes | Descargas/mes | Costo Firebase | Notas |
|--------------|---------------|----------------|-------|
| 50 | 750 MB | **$0** | Dentro del gratis |
| 100 | 1.5 GB | **$0** | Dentro del gratis |
| 500 | 7.5 GB | **$0** | Dentro del gratis |
| 666 | 10 GB | **$0** | Límite gratis |
| 1,000 | 15 GB | **$5** | 5 GB extra × $1 |
| 2,000 | 30 GB | **$20** | 20 GB extra × $1 |

> **Importante:** Con Blaze tienes 200,000 conexiones simultáneas (vs 100 en Spark)

### Railway Hobby ($5/mes)

| Restaurantes | RAM necesaria | Costo Railway | Notas |
|--------------|---------------|---------------|-------|
| 10 | ~200 MB | **$5** | Muy holgado |
| 50 | ~500 MB | **$5** | Cómodo |
| 100 | ~1 GB | **$5-7** | Puede subir un poco |
| 200 | ~2 GB | **$8-10** | Aún manejable |
| 500 | ~4 GB | **$15-20** | Cerca del límite plan |

### Railway Pro ($20/mes)

| Restaurantes | RAM necesaria | Costo Railway |
|--------------|---------------|---------------|
| 500+ | ~4-8 GB | **$20** |
| 1,000+ | ~8-16 GB | **$20-30** |
| 5,000+ | ~32+ GB | **$50+** |

---

## 6. Tabla de Costos Finales

### Costo por Cliente Final (1 pedido)

| Concepto | Costo |
|----------|-------|
| Firebase | $0.000004 (~6.5 KB de 10 GB gratis) |
| Railway | $0.00001 (despreciable) |
| **TOTAL por pedido** | **~$0.00001** (prácticamente $0) |

### Costo por Restaurante/Mes (50 pedidos/día)

| # Restaurantes | Firebase | Railway | **Total/restaurante** |
|----------------|----------|---------|----------------------|
| 10 | $0 | $0.50 | **$0.50** |
| 25 | $0 | $0.20 | **$0.20** |
| 50 | $0 | $0.10 | **$0.10** |
| 100 | $0 | $0.05-0.07 | **$0.05-0.07** |
| 500 | $0 | $0.03-0.04 | **$0.03-0.04** |
| 1,000 | $5 | $0.02-0.03 | **$0.007-0.008** |

---

## 7. Proyecciones de Rentabilidad

### Si cobras $50,000 COP/mes (~$12 USD) por restaurante:

| Restaurantes | Ingreso/mes | Costos/mes | **Ganancia** | **Margen** |
|--------------|-------------|------------|--------------|------------|
| 10 | $120 | $5 (Railway) | **$115** | 96% |
| 25 | $300 | $5 | **$295** | 98% |
| 50 | $600 | $5-7 | **$593-595** | 99% |
| 100 | $1,200 | $7-10 | **$1,190-1,193** | 99% |
| 500 | $6,000 | $20-25 | **$5,975-5,980** | 99.6% |
| 1,000 | $12,000 | $25-30 | **$11,970-11,975** | 99.7% |

---

## 8. Límites y Cuándo Escalar

### Cuándo pasar de Firebase Spark → Blaze:

| Señal | Acción |
|-------|--------|
| >30-50 restaurantes activos simultáneos | Migrar a Blaze (100 conexiones límite) |
| >200 restaurantes totales | Migrar a Blaze (1 GB storage límite) |
| >666 restaurantes (50 ped/día c/u) | Migrar a Blaze (10 GB descargas límite) |

### Cuándo pasar de Railway Hobby → Pro:

| Señal | Acción |
|-------|--------|
| >200-300 restaurantes | Considerar Pro |
| RAM constante >4 GB | Migrar a Pro |
| Necesitas réplicas/alta disponibilidad | Migrar a Pro |

---

## 9. Resumen Ejecutivo

### Capacidad con planes GRATUITOS:

| Servicio | Límite principal | Restaurantes máx |
|----------|------------------|------------------|
| Firebase Spark | 100 conexiones | **~30-50** |
| Railway Free | 30 días trial | **~20-30** |
| **Combinado** | - | **~20-30 restaurantes** |

### Capacidad con planes MÍNIMOS ($5/mes total):

| Servicio | Plan | Restaurantes máx |
|----------|------|------------------|
| Firebase Blaze | Pago por uso | **~500-666** (dentro del gratis) |
| Railway Hobby | $5/mes | **~100-200** |
| **Combinado** | $5/mes | **~100-200 restaurantes** |

### Costos reales:

| Escala | Costo total/mes | Costo por restaurante |
|--------|-----------------|----------------------|
| 10 restaurantes | $5 | $0.50 |
| 50 restaurantes | $5-7 | $0.10-0.14 |
| 100 restaurantes | $7-10 | $0.07-0.10 |
| 500 restaurantes | $20-25 | $0.04-0.05 |

### Conclusión:

1. **Cada pedido cuesta ~$0.00001** - Prácticamente gratis
2. **Cada restaurante (50 ped/día) cuesta $0.05-0.50/mes** dependiendo de escala
3. **Con $5/mes puedes tener hasta 100-200 restaurantes**
4. **Tu margen es >96%** desde el primer restaurante
5. **El cuello de botella inicial es Railway** (RAM), no Firebase

---

## 12. Optimizaciones Implementadas

| Optimización | Archivo | Ahorro |
|--------------|---------|--------|
| Listeners granulares KDS | `app.js` | 90% menos datos |
| Caché de menú (5 min) | `server/bot-logic.js` | 33% menos lecturas |
| Sesiones en memoria | `server/bot-logic.js` | 0 lecturas por mensaje intermedio |

Estas optimizaciones permiten que cada pedido consuma solo **~6.5 KB** en lugar de ~20 KB sin optimizar.

---

*Documento generado para planificación de precios y escalabilidad de Automater KDS*

---

## 11. Precios Recomendados por Tipo de Restaurante

### Perfiles de Restaurante

| Perfil | Pedidos/día | Pedidos/mes | Descripción |
|--------|-------------|-------------|-------------|
| **Pequeño** | 25 | 750 | Cafetería, food truck, negocio barrial |
| **Mediano** | 50 | 1,500 | Restaurante típico, pizzería, comida rápida |
| **Alto volumen** | 100 | 3,000 | Dark kitchen, franquicia, restaurante popular |

---

### Cálculo de Costos Reales por Perfil

#### Consumo por Restaurante Pequeño (25 pedidos/día)

| Concepto | Cálculo | Total/mes |
|----------|---------|-----------|
| Pedidos/mes | 25 × 30 | **750** |
| Datos descargados (DB) | 750 × 6.5 KB | **~5 MB** |
| Almacenamiento | 750 × 2 KB + config | **~2 MB** |
| Hosting transferencia | ~25 MB | **~25 MB** |
| Conexiones pico | 2-3 | **2-3** |

#### Consumo por Restaurante Mediano (50 pedidos/día)

| Concepto | Cálculo | Total/mes |
|----------|---------|-----------|
| Pedidos/mes | 50 × 30 | **1,500** |
| Datos descargados (DB) | 1,500 × 6.5 KB | **~10 MB** |
| Almacenamiento | 1,500 × 2 KB + config | **~4 MB** |
| Hosting transferencia | ~50 MB | **~50 MB** |
| Conexiones pico | 3-5 | **3-5** |

#### Consumo por Restaurante Alto Volumen (100 pedidos/día)

| Concepto | Cálculo | Total/mes |
|----------|---------|-----------|
| Pedidos/mes | 100 × 30 | **3,000** |
| Datos descargados (DB) | 3,000 × 6.5 KB | **~20 MB** |
| Almacenamiento | 3,000 × 2 KB + config | **~8 MB** |
| Hosting transferencia | ~100 MB | **~100 MB** |
| Conexiones pico | 5-8 | **5-8** |

---

### Costo Operativo Real por Tipo de Restaurante

Asumiendo que usas **Railway Hobby ($5/mes) + Firebase Blaze (pago por uso)**:

| # Restaurantes totales | Costo total/mes | Costo prorrateado por restaurante |
|------------------------|-----------------|-----------------------------------|
| 10 | $5 | $0.50 |
| 25 | $5 | $0.20 |
| 50 | $5-6 | $0.10-0.12 |
| 100 | $6-8 | $0.06-0.08 |

**Nota:** Firebase permanece en $0 hasta ~666 restaurantes medianos (10 GB descargas gratis).

#### Costo por perfil de restaurante (con 50 restaurantes totales en plataforma):

| Perfil | Consume | % del total* | Costo real/mes |
|--------|---------|--------------|----------------|
| **Pequeño** (25 ped/día) | 5 MB | 50% menos | **~$0.05** |
| **Mediano** (50 ped/día) | 10 MB | Promedio | **~$0.10** |
| **Alto volumen** (100 ped/día) | 20 MB | 100% más | **~$0.20** |

*Comparado con el restaurante promedio de 50 ped/día

---

### 💰 Precios de Suscripción Recomendados

| Perfil | Costo real/mes | Precio sugerido | Margen |
|--------|----------------|-----------------|--------|
| **Pequeño** (25 ped/día) | ~$0.05 (~$200 COP) | **$90,000 COP** (~$22 USD) | **99.8%** |
| **Mediano** (50 ped/día) | ~$0.10 (~$400 COP) | **$120,000 COP** (~$29 USD) | **99.7%** |
| **Alto volumen** (100 ped/día) | ~$0.20 (~$800 COP) | **$150,000 COP** (~$36 USD) | **99.5%** |

---

### Justificación de Precios

#### Plan Pequeño - $90,000 COP/mes
- ✅ Ideal para negocios que empiezan
- ✅ Precio accesible (< $100,000)
- ✅ 750 pedidos incluidos
- ✅ Margen: ~$89,800 COP de ganancia pura

#### Plan Mediano - $120,000 COP/mes
- ✅ El plan más popular (punto medio)
- ✅ 1,500 pedidos incluidos
- ✅ Funcionalidades completas
- ✅ Margen: ~$119,600 COP de ganancia pura

#### Plan Alto Volumen - $150,000 COP/mes
- ✅ Para restaurantes exitosos
- ✅ 3,000 pedidos incluidos
- ✅ Soporte prioritario (justifica precio)
- ✅ Margen: ~$149,200 COP de ganancia pura

---

### 📊 Proyección de Ingresos por Mix de Clientes

#### Escenario realista: Mix 40% pequeños, 40% medianos, 20% alto volumen

| Total restaurantes | Pequeños (40%) | Medianos (40%) | Alto vol (20%) | Ingreso/mes |
|--------------------|----------------|----------------|----------------|-------------|
| 10 | 4 × $90k | 4 × $120k | 2 × $150k | **$1,140,000 COP** |
| 25 | 10 × $90k | 10 × $120k | 5 × $150k | **$2,850,000 COP** |
| 50 | 20 × $90k | 20 × $120k | 10 × $150k | **$5,700,000 COP** |
| 100 | 40 × $90k | 40 × $120k | 20 × $150k | **$11,400,000 COP** |

#### Ingreso promedio por restaurante: ~$114,000 COP/mes

---

### 🎯 Tabla de Rentabilidad Final

| Restaurantes | Ingreso bruto/mes | Costos operativos | Ganancia neta | Margen |
|--------------|-------------------|-------------------|---------------|--------|
| 10 | $1,140,000 COP (~$276 USD) | ~$5 USD | **$1,119,000 COP** | 98% |
| 25 | $2,850,000 COP (~$690 USD) | ~$5 USD | **$2,829,000 COP** | 99% |
| 50 | $5,700,000 COP (~$1,380 USD) | ~$6 USD | **$5,675,000 COP** | 99.5% |
| 100 | $11,400,000 COP (~$2,760 USD) | ~$8 USD | **$11,367,000 COP** | 99.7% |

> **Nota:** Costos operativos son solo infraestructura. No incluyen marketing, soporte, desarrollo, etc.

---

### Comparativa con el Mercado

| Solución | Precio mensual | Tu ventaja |
|----------|----------------|------------|
| iFood/Rappi comisiones | 15-25% por pedido | Tarifa fija, sin comisiones |
| POS tradicionales | $200,000-500,000 COP | Más barato + WhatsApp integrado |
| Bots WhatsApp genéricos | $50,000-150,000 COP | KDS incluido + sin comisiones |

**Tu propuesta de valor:**
- ✅ Sin comisiones por pedido
- ✅ WhatsApp (donde ya están los clientes)
- ✅ KDS profesional incluido
- ✅ Configuración en minutos
- ✅ Precio predecible

---

### Recomendación Final de Planes

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANES AUTOMATER KDS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🥉 EMPRENDEDOR          🥈 PROFESIONAL        🥇 EMPRESARIAL   │
│     $90,000/mes             $120,000/mes          $150,000/mes  │
│                                                                 │
│  • Hasta 25 ped/día      • Hasta 50 ped/día    • Hasta 100 ped  │
│  • Bot WhatsApp          • Bot WhatsApp        • Bot WhatsApp   │
│  • Panel KDS             • Panel KDS           • Panel KDS      │
│  • Menú personalizable   • Menú personalizable • Menú personaliz│
│  • Soporte CORREO        • Soporte WHATSAPP    • Soporte WHATSAP│
│  • Actualizaciones       • Actualizaciones     • Actualizaciones│
│                                                                 │
│  Ideal para:             Ideal para:           Ideal para:      │
│  - Food trucks           - Restaurantes        - Dark kitchens  │
│  - Cafeterías            - Pizzerías           - Franquicias    │
│  - Emprendimientos       - Comida rápida       - Alto volumen   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Diferencias clave entre planes:**
- **Emprendedor**: Soporte por correo electrónico
- **Profesional y Empresarial**: Soporte por WhatsApp (más rápido y directo)
