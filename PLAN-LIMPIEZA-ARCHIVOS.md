# 🧹 PLAN DE LIMPIEZA - Archivos MD y Scripts

**Fecha:** 29 de enero de 2025  
**Objetivo:** Limpiar archivos de documentación y scripts obsoletos

---

## 📋 ARCHIVOS A MANTENER (Útiles)

### Documentación Principal:
- ✅ `README.md` - Documentación principal del proyecto
- ✅ `ANALISIS-CODIGO-LEGACY-WHATSAPP-API.md` - Análisis de limpieza reciente
- ✅ `LIMPIEZA-WHATSAPP-API-LEGACY.md` - Detalles de limpieza
- ✅ `MEJORAS-IMPLEMENTADAS-29-ENE.md` - Log de mejoras recientes
- ✅ `RESUMEN-FINAL-SESION-29-ENE.md` - Resumen de sesión actual

### Documentación en carpetas:
- ✅ `docs/` - Documentación técnica (humanización, auto-reconnect, etc.)
- ✅ `Integracion-Multi-Gateway/` - Documentación de multi-gateway (útil)
- ✅ `Integracion-Wompi/` - Documentación de Wompi (útil)

---

## 🗑️ ARCHIVOS A ELIMINAR (Obsoletos/Debug)

### Archivos MD de Debug (raíz):
```
❌ ANALISIS-BOT-MENSAJES-PROPIOS.md       - Debug temporal
❌ ANALISIS-TIEMPO-ENTREGA.md             - Debug temporal
❌ DEBUG-KDS-PEDIDOS-TARJETA.md          - Debug temporal
❌ DEBUG-LOOP-MENSAJES-BAILEYS.md        - Debug temporal
❌ FIX-FINAL-LOOP-BAILEYS.md             - Fix ya aplicado
❌ FIX-NOTIFICACION-CHAT-CORRECTO.md     - Fix ya aplicado
❌ FIX-PAYMENT-LINK-ID-WEBHOOK.md        - Fix ya aplicado
❌ FLUJO-PAGO-MEJORADO.md                - Ya implementado
❌ RESUMEN-FINAL-COMPLETO.md             - Duplicado
❌ RESUMEN-IMPLEMENTACION-FINAL.md       - Duplicado
```

### Scripts Obsoletos (raíz):
```
❌ cleanup-project.sh                     - Script temporal
❌ diagnose-webhook-payment-link-id.sh   - Debug temporal
❌ monitor-payment-debug.sh              - Debug temporal
```

### Carpeta propuesta/ (completa):
```
❌ propuesta/                            - Fase de propuesta completada
   - Todos los archivos MD de fases completadas
   - Scripts de limpieza antiguos
```

### Scripts en scripts/:
```
❌ scripts/verify-baileys-migration.sh   - Migración completada
❌ scripts/commit-baileys-migration.sh   - Migración completada
❌ scripts/test-baileys-production.sh    - Temporal
❌ scripts/run-test.sh                   - Temporal
❌ scripts/verify-domain-setup.sh        - Setup completado
❌ scripts/update-domain-config.sh       - Config completada
```

---

## 📦 ACCIÓN: ARCHIVAR vs ELIMINAR

### ELIMINAR (basura/temporal):
- Scripts .sh de debug temporal
- Archivos MD de debug (DEBUG-*, FIX-* aplicados)
- Carpeta `propuesta/` completa (fases antiguas)
- Scripts de migración ya completada

### MANTENER en docs-archive/ (referencia histórica):
- Documentación de implementaciones completadas
- Análisis importantes pero ya no activos
- Resúmenes de sesiones antiguas

---

## 🎯 ESTRUCTURA FINAL DESEADA

```
kds-webapp/
├── README.md                              ✅ Principal
├── ANALISIS-CODIGO-LEGACY-WHATSAPP-API.md ✅ Reciente
├── LIMPIEZA-WHATSAPP-API-LEGACY.md       ✅ Reciente
├── MEJORAS-IMPLEMENTADAS-29-ENE.md       ✅ Reciente
├── RESUMEN-FINAL-SESION-29-ENE.md        ✅ Reciente
├── docs/                                  ✅ Documentación técnica
│   ├── HUMANIZACION-*.md
│   ├── AUTO-RECONNECTION-*.md
│   └── QUICK-START.md
├── Integracion-Multi-Gateway/             ✅ Documentación útil
├── Integracion-Wompi/                     ✅ Documentación útil
├── docs-archive/                          ✅ Histórico
│   └── [archivos antiguos movidos aquí]
├── server/                                ✅ Backend
├── assets/                                ✅ Frontend assets
└── [archivos HTML, config, etc.]         ✅ Código activo
```

---

**Total a eliminar:** ~80 archivos  
**Total a mantener:** ~15 archivos MD + carpetas docs/
