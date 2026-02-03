# Análisis de Costos Operativos - KDS WhatsApp Bot

**Fecha de análisis**: 31 de Enero 2026  
**Última actualización**: 31 de Enero 2026  
**Versión**: 2.0 (incluye sistema anti-ban con proxies rotativos)

> **Terminología:**
> - **Restaurante** = Usuario de tu plataforma (tenant) que paga mensualidad
> - **Cliente final** = Persona que hace pedidos por WhatsApp al restaurante
> - **Pedido** = Una transacción completa (varios mensajes de WhatsApp)
> - **Bot** = Instancia de WhatsApp conectada para un restaurante (1 bot = 1 número de WhatsApp)

> **⚠️ CAMBIO IMPORTANTE EN V2.0:**  
> Se añade análisis completo del **sistema anti-ban con proxies rotativos**. Cada bot ahora requiere una IP única a través de proxies para evitar bans masivos de WhatsApp. Esto añade ~$0.07/restaurante al costo operativo, pero es **OBLIGATORIO** para operación estable en producción.

---

## 📋 Tabla de Contenido

1. [Planes y Límites de los Servicios](#1-planes-y-límites-de-los-servicios)
2. [Consumo por Cliente Final (1 Pedido)](#2-consumo-por-cliente-final-1-pedido)
3. [Consumo por Restaurante (Proyección Mensual)](#3-consumo-por-restaurante-proyección-mensual)
4. [Capacidad de Planes Gratuitos](#4-capacidad-de-planes-gratuitos)
5. [Capacidad por Plan de Pago](#5-capacidad-por-plan-de-pago)
6. [Tabla de Costos Finales](#6-tabla-de-costos-finales)
7. [Proyecciones de Rentabilidad](#7-proyecciones-de-rentabilidad-sin-proxies---ver-sección-10-para-costos-reales)
8. [Límites y Cuándo Escalar](#8-límites-y-cuándo-escalar)
9. [Resumen Ejecutivo](#9-resumen-ejecutivo)
10. [**Sistema Anti-Ban: Costo de Proxies Rotativos** 🆕](#10-sistema-anti-ban-costo-de-proxies-rotativos)
11. [Optimizaciones Implementadas](#11-optimizaciones-implementadas)
12. [Precios Recomendados por Tipo de Restaurante](#12-precios-recomendados-por-tipo-de-restaurante)

---

## 🆕 Cambios en V2.0 (31 Enero 2026)

### Nuevas Secciones:
- ✅ **Sección 10:** Análisis completo del sistema anti-ban con proxies rotativos
- ✅ **Costo de proxies:** $49/mes (Webshare) para ~650 restaurantes
- ✅ **Consumo de bandwidth:** ~150 MB/bot/mes (90% es keep-alive)
- ✅ **Costo por restaurante actualizado:** $0.11-0.17/mes (incluye proxies)
- ✅ **Rentabilidad actualizada:** Margen sigue siendo >98% con proxies incluidos

### Arquitectura del Sistema:
- 🔒 **1 proxy dedicado por restaurante/bot** (5 IPs en pool de rotación)
- 🔄 **Rotación automática** de IP en cada reinicio del bot
- 📊 **Monitoreo de uso** vía endpoint `/api/proxy/stats`
- ⚡ **Keep-alive optimizado** cada 30 segundos (balance estabilidad/bandwidth)

### Impacto Financiero:
- 💰 Añade **~$0.07/restaurante** al costo operativo
- 📈 Margen se reduce de **99%** a **98-99%** (sigue siendo excelente)
- 🎯 **Costo total por restaurante:** $0.11-0.17/mes (vs $0.05-0.10 sin proxies)
- ✅ **Rentabilidad:** Con precio de $120,000 COP/mes, ganancia sigue siendo >$119,500 COP/restaurante

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
| Proxy | $0.00005 (~5 KB de 100 GB × $0.49/GB) |
| **TOTAL por pedido** | **~$0.00006** (prácticamente $0) |

### Costo por Restaurante/Mes (50 pedidos/día) - SIN PROXIES

> **⚠️ Esta tabla NO incluye proxies.** Ver **Sección 10** para costos reales con proxies.

| # Restaurantes | Firebase | Railway | **Total/restaurante** |
|----------------|----------|---------|----------------------|
| 10 | $0 | $0.50 | **$0.50** |
| 25 | $0 | $0.20 | **$0.20** |
| 50 | $0 | $0.10 | **$0.10** |
| 100 | $0 | $0.05-0.07 | **$0.05-0.07** |
| 500 | $0 | $0.03-0.04 | **$0.03-0.04** |
| 1,000 | $5 | $0.02-0.03 | **$0.007-0.008** |

### Costo por Restaurante/Mes (50 pedidos/día) - CON PROXIES

| # Restaurantes | Firebase | Railway | Proxies | **Total/restaurante** |
|----------------|----------|---------|---------|----------------------|
| 10 | $0 | $0.50 | $0.07 | **$0.57** |
| 50 | $0 | $0.10 | $0.07 | **$0.17** |
| 100 | $0 | $0.07 | $0.07 | **$0.14** |
| 500 | $0 | $0.04 | $0.07 | **$0.11** |
| 650 | $0.01 | $0.04 | $0.07 | **$0.12** |
| 1,000 | $0.005 | $0.03 | $0.075 | **$0.11** |

---

## 7. Proyecciones de Rentabilidad (SIN PROXIES - Ver sección 10 para costos reales)

> **⚠️ IMPORTANTE:** Esta sección NO incluye el costo de proxies ($49/mes para ~650 restaurantes). Ver **Sección 10** para análisis completo con proxies.

### Si cobras $50,000 COP/mes (~$12 USD) por restaurante:

| Restaurantes | Ingreso/mes | Costos/mes* | **Ganancia** | **Margen** |
|--------------|-------------|------------|--------------|------------|
| 10 | $120 | $5 (Railway) | **$115** | 96% |
| 25 | $300 | $5 | **$295** | 98% |
| 50 | $600 | $5-7 | **$593-595** | 99% |
| 100 | $1,200 | $7-10 | **$1,190-1,193** | 99% |
| 500 | $6,000 | $20-25 | **$5,975-5,980** | 99.6% |
| 1,000 | $12,000 | $25-30 | **$11,970-11,975** | 99.7% |

*Solo Railway + Firebase. **NO incluye proxies obligatorios** (ver sección 10)

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

### ⚠️ IMPORTANTE: Sistema Anti-Ban Requiere Proxies

Para evitar bans de WhatsApp, cada bot necesita su propia IP a través de proxies rotativos. Esto añade un costo adicional pero es **OBLIGATORIO** para operación estable.

### Capacidad con planes MÍNIMOS ($49-54/mes):

| Servicio | Plan | Costo | Capacidad |
|----------|------|-------|-----------|
| **Railway Hobby** | Pago por uso | $5/mes | ~100-200 restaurantes |
| **Firebase Blaze** | Pago por uso | $0/mes | ~500-666 restaurantes (gratis) |
| **Webshare Proxies** | Starter | $49/mes | ~650 restaurantes (100 GB) |
| **TOTAL** | - | **$54/mes** | **~100-200 restaurantes*** |

*El cuello de botella es Railway (RAM), no proxies ni Firebase

### Costos reales CON PROXIES:

| Escala | Railway | Firebase | Proxies | **TOTAL/mes** | **Por restaurante** |
|--------|---------|----------|---------|---------------|---------------------|
| 10 rest | $5 | $0 | $0.74 | **$5.74** | **$0.57** |
| 50 rest | $5 | $0 | $3.68 | **$8.68** | **$0.17** |
| 100 rest | $7 | $0 | $7.35 | **$14.35** | **$0.14** |
| 500 rest | $20 | $0 | $36.76 | **$56.76** | **$0.11** |
| 650 rest | $25 | $5 | $49 | **$79** | **$0.12** |

### Conclusión actualizada:

1. **Cada pedido cuesta ~$0.00001** - Prácticamente gratis
2. **Cada restaurante (50 ped/día) cuesta $0.11-0.17/mes** incluyendo proxies anti-ban
3. **Con ~$54/mes puedes tener hasta 100-200 restaurantes** (limitado por Railway)
4. **Con ~$79/mes puedes tener hasta 650 restaurantes** (límite de 100 GB proxies)
5. **Tu margen es >98%** desde el primer restaurante, incluso con proxies
6. **Los proxies añaden solo ~$0.07/restaurante** pero son esenciales para estabilidad

### Cuellos de botella por escala:

| Restaurantes | Cuello de botella | Solución |
|--------------|-------------------|----------|
| 0-50 | Railway Free (30 días) | Migrar a Hobby ($5/mes) |
| 50-200 | Railway RAM (~2-4 GB) | Optimizar o escalar a Pro ($20/mes) |
| 200-650 | Railway RAM (~8 GB) | Railway Pro |
| 650+ | Proxies (100 GB agotado) | 2do plan Webshare (+$49/mes) |

---

## 10. Sistema Anti-Ban: Costo de Proxies Rotativos

> **¿Por qué proxies?** WhatsApp puede banear números/IPs con alta actividad. Cada bot necesita su propia IP única para evitar bans masivos.

### Arquitectura de Proxies

- **1 proxy dedicado por restaurante/bot**
- **Rotación de IP** cada vez que el bot se reinicia
- **Protocolo:** HTTP/HTTPS proxies (no SOCKS5 para evitar complicaciones)
- **Pool de proxies:** 5 por tenant/bot (1 activo + 4 de respaldo)

### Consumo de Bandwidth por Bot

#### Análisis detallado del tráfico:

| Concepto | Consumo | Frecuencia | Total/mes |
|----------|---------|------------|-----------|
| **Keep-alive WebSocket** | 1.5 KB/paquete | Cada 30s | **~129 MB** |
| **Mensajes recibidos** | 2-10 KB/msg | 50 ped × 5 msg = 250/mes | **~1.25 MB** |
| **Mensajes enviados** | 1-5 KB/msg | 50 ped × 3 msg = 150/mes | **~0.45 MB** |
| **Media (imágenes menú)** | 50-200 KB/img | 2-3 veces/día × 30 | **~5 MB** |
| **Reconexiones/sincronización** | 500 KB-2 MB/evento | 5-10 veces/mes | **~10 MB** |
| **TOTAL POR BOT/MES** | - | - | **~145-150 MB** |

> **Desglose del keep-alive:** 2,592,000 seg/mes ÷ 30 seg = 86,400 paquetes × 1.5 KB = 129.6 MB

#### Consumo por tipo de restaurante:

| Perfil | Pedidos/día | Mensajes/mes* | Total bandwidth/mes |
|--------|-------------|---------------|---------------------|
| **Pequeño** | 25 | ~200 | **~135 MB** |
| **Mediano** | 50 | ~400 | **~150 MB** |
| **Alto volumen** | 100 | ~800 | **~180 MB** |

*Incluye keep-alive (90% del tráfico), mensajes de pedidos y media

---

### Proveedores de Proxies y Costos

#### Comparativa de proveedores recomendados:

| Proveedor | Tipo | Precio | Bandwidth | Costo/GB | IPs | Rotación |
|-----------|------|--------|-----------|----------|-----|----------|
| **Webshare** | Residencial | $49/100 GB | 100 GB | $0.49 | Ilimitadas | Cada request |
| **Bright Data** | Residencial | $8.40/GB | Pay-as-you-go | $8.40 | Ilimitadas | Cada request |
| **Smartproxy** | Residencial | $12.5/GB | Pay-as-you-go | $12.50 | Ilimitadas | Cada request |
| **IPRoyal** | Residencial | $7/GB | Pay-as-you-go | $7.00 | Ilimitadas | Cada request |
| **ProxyScrape** | Dedicado | $5/mes/proxy | Ilimitado | $0 | 1 | No |

#### Recomendación: **Webshare** (mejor relación costo/beneficio)

**Plan Starter - $49/mes:**
- ✅ 100 GB bandwidth incluido
- ✅ IPs residenciales (USA, EU, etc.)
- ✅ Rotación automática
- ✅ 99.9% uptime
- ✅ Soporte HTTP/HTTPS

---

### Cálculo de Costos con Proxies

#### ¿Cuántos restaurantes soporta 100 GB?

| Bot consume | 100 GB ÷ consumo | Restaurantes máx |
|-------------|------------------|------------------|
| 135 MB/mes (pequeño) | 100,000 MB ÷ 135 MB | **~740 bots** |
| 150 MB/mes (mediano) | 100,000 MB ÷ 150 MB | **~666 bots** |
| 180 MB/mes (alto vol) | 100,000 MB ÷ 180 MB | **~555 bots** |

**Promedio:** ~**650 restaurantes** con 100 GB de Webshare ($49/mes)

---

### Costo Total de Infraestructura con Proxies

| # Restaurantes | Railway | Firebase | Proxies (Webshare) | **TOTAL/mes** |
|----------------|---------|----------|-------------------|---------------|
| 10 | $5 | $0 | $0.74* | **$5.74** |
| 50 | $5 | $0 | $3.68 | **$8.68** |
| 100 | $7 | $0 | $7.35 | **$14.35** |
| 500 | $20 | $0 | $36.76 | **$56.76** |
| 650 | $25 | $5 | $49 | **$79** |
| 1,000 | $30 | $5 | $75** | **$110** |

*$49/mes ÷ 666 restaurantes promedio × cantidad  
**Necesitarás 2 planes de Webshare (200 GB) a $49 c/u = $98

---

### Costo por Restaurante (Incluye Proxies)

| # Restaurantes | Costo total/mes | Costo por restaurante |
|----------------|-----------------|----------------------|
| 10 | $5.74 | **$0.57** |
| 50 | $8.68 | **$0.17** |
| 100 | $14.35 | **$0.14** |
| 500 | $56.76 | **$0.11** |
| 650 | $79 | **$0.12** |
| 1,000 | $110 | **$0.11** |

---

### Rentabilidad Actualizada (Con Proxies)

#### Si cobras $120,000 COP/mes (~$29 USD) por restaurante:

| Restaurantes | Ingreso/mes | Costos/mes | **Ganancia** | **Margen** |
|--------------|-------------|------------|--------------|------------|
| 10 | $290 | $5.74 | **$284.26** | 98% |
| 50 | $1,450 | $8.68 | **$1,441.32** | 99.4% |
| 100 | $2,900 | $14.35 | **$2,885.65** | 99.5% |
| 500 | $14,500 | $56.76 | **$14,443.24** | 99.6% |
| 650 | $18,850 | $79 | **$18,771** | 99.6% |
| 1,000 | $29,000 | $110 | **$28,890** | 99.6% |

> **Conclusión:** Los proxies añaden **~$0.07/restaurante** pero mantienen el margen >98%

---

### Optimizaciones de Bandwidth

#### Actualmente implementadas:

| Optimización | Ubicación | Ahorro |
|--------------|-----------|--------|
| Keep-alive cada 30s (no 10s) | `proxy-manager.js` | **~2.5x menos tráfico** |
| Compresión de mensajes | Baileys nativo | ~20% menos |
| Caché de media | En memoria | ~30% menos descargas |

#### Optimizaciones adicionales posibles:

| Optimización | Ahorro potencial | Complejidad | Riesgo de ban |
|--------------|------------------|-------------|---------------|
| Keep-alive cada 60s | 50% menos | Baja | Alto ⚠️ |
| Desconectar bots inactivos >2h | 15-20% menos | Media | Bajo |
| Horarios nocturnos (11pm-6am off) | 30% menos | Media | Medio |
| Comprimir imágenes menú (WebP) | 40% menos en media | Baja | Nulo |

**Recomendación:** Mantener keep-alive en 30s por estabilidad. Implementar solo "desconectar inactivos" si se necesita ahorrar.

---

## 11. Optimizaciones Implementadas

| Optimización | Archivo | Ahorro |
|--------------|---------|--------|
| Listeners granulares KDS | `app.js` | 90% menos datos Firebase |
| Caché de menú (5 min) | `server/bot-logic.js` | 33% menos lecturas Firebase |
| Sesiones en memoria | `server/bot-logic.js` | 0 lecturas por mensaje intermedio |
| Proxies rotativos | `proxy-manager.js` | Protección anti-ban |
| Keep-alive optimizado (30s) | `proxy-manager.js` | 2.5x menos bandwidth vs 10s |

Estas optimizaciones permiten:
- **Firebase:** Cada pedido consume solo **~6.5 KB** en lugar de ~20 KB sin optimizar
- **Proxies:** Cada bot consume solo **~150 MB/mes** en lugar de ~375 MB/mes sin optimizar

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

### 🎯 Tabla de Rentabilidad Final (CON PROXIES)

| Restaurantes | Ingreso bruto/mes | Costos operativos** | Ganancia neta | Margen |
|--------------|-------------------|---------------------|---------------|--------|
| 10 | $1,140,000 COP (~$276 USD) | ~$5.74 USD | **$1,116,000 COP** | 98% |
| 25 | $2,850,000 COP (~$690 USD) | ~$6.50 USD | **$2,823,000 COP** | 99% |
| 50 | $5,700,000 COP (~$1,380 USD) | ~$8.68 USD | **$5,664,000 COP** | 99.4% |
| 100 | $11,400,000 COP (~$2,760 USD) | ~$14.35 USD | **$11,341,000 COP** | 99.5% |

**Costos operativos incluyen: Railway + Firebase + Proxies rotativos (Webshare)

> **Nota crítica:** Los proxies son obligatorios para evitar bans de WhatsApp. Sin ellos, el servicio no es viable a largo plazo.

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
