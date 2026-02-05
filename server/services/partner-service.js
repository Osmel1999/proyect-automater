/**
 * 🤝 Partner Service
 * Servicio para gestionar socios comerciales y comisiones
 */

const admin = require('firebase-admin');

const ADMIN_EMAIL = 'odfarakm@gmail.com';
const COMISION_PORCENTAJE = 30; // 30%
const PERIODO_GRACIA_DIAS = 30; // 30 días para vincular tenant

/**
 * Genera un código de referido único basado en el nombre
 */
function generarCodigoReferido(nombre) {
    const nombreLimpio = nombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-zA-Z]/g, '') // Solo letras
        .toUpperCase()
        .substring(0, 6);
    
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    return `${nombreLimpio}${year}${random}`;
}

/**
 * Verifica si un código de referido existe y está activo
 */
async function verificarCodigoReferido(codigo) {
    try {
        const db = admin.database();
        const snapshot = await db.ref('partners')
            .orderByChild('codigoReferido')
            .equalTo(codigo)
            .once('value');
        
        if (!snapshot.exists()) {
            return { valid: false, error: 'Código de referido no encontrado' };
        }
        
        const partners = snapshot.val();
        const partnerId = Object.keys(partners)[0];
        const partner = partners[partnerId];
        
        if (partner.estado !== 'activo') {
            return { valid: false, error: 'Código de referido inactivo' };
        }
        
        return {
            valid: true,
            partnerId,
            partnerNombre: partner.nombre
        };
        
    } catch (error) {
        console.error('Error verificando código referido:', error);
        return { valid: false, error: 'Error verificando código' };
    }
}

/**
 * Crea un nuevo socio comercial (solo admin)
 */
async function crearPartner(datosPartner, adminEmail) {
    if (adminEmail !== ADMIN_EMAIL) {
        throw new Error('No autorizado');
    }
    
    try {
        const db = admin.database();
        const partnerId = db.ref('partners').push().key;
        
        // Generar código único
        let codigoReferido = generarCodigoReferido(datosPartner.nombre);
        
        // Verificar que no exista
        let intentos = 0;
        while (intentos < 10) {
            const existe = await verificarCodigoReferido(codigoReferido);
            if (!existe.valid) break;
            codigoReferido = generarCodigoReferido(datosPartner.nombre);
            intentos++;
        }
        
        const partner = {
            id: partnerId,
            nombre: datosPartner.nombre,
            email: datosPartner.email.toLowerCase(),
            telefono: datosPartner.telefono || '',
            codigoReferido,
            enlaceReferido: `https://kdsapp.site/auth.html?ref=${codigoReferido}`,
            estado: 'activo',
            fechaRegistro: Date.now(),
            creadoPor: adminEmail,
            datosPago: {
                banco: datosPartner.banco || '',
                tipoCuenta: datosPartner.tipoCuenta || '',
                numeroCuenta: datosPartner.numeroCuenta || '',
                cedula: datosPartner.cedula || '',
                titular: datosPartner.titular || datosPartner.nombre
            },
            estadisticas: {
                totalReferidos: 0,
                referidosActivos: 0,
                totalComisionesGeneradas: 0,
                totalComisionesPagadas: 0,
                comisionesPendientes: 0
            }
        };
        
        await db.ref(`partners/${partnerId}`).set(partner);
        
        console.log(`✅ Partner creado: ${partner.nombre} (${codigoReferido})`);
        
        return partner;
        
    } catch (error) {
        console.error('Error creando partner:', error);
        throw error;
    }
}

/**
 * Obtiene todos los partners (solo admin)
 */
async function obtenerPartners(adminEmail) {
    if (adminEmail !== ADMIN_EMAIL) {
        throw new Error('No autorizado');
    }
    
    try {
        const db = admin.database();
        const snapshot = await db.ref('partners').once('value');
        
        if (!snapshot.exists()) {
            return [];
        }
        
        const partners = [];
        snapshot.forEach(child => {
            partners.push({
                id: child.key,
                ...child.val()
            });
        });
        
        return partners;
        
    } catch (error) {
        console.error('Error obteniendo partners:', error);
        throw error;
    }
}

/**
 * Obtiene un partner por email (para login de partner)
 */
async function obtenerPartnerPorEmail(email) {
    try {
        const db = admin.database();
        const snapshot = await db.ref('partners')
            .orderByChild('email')
            .equalTo(email.toLowerCase())
            .once('value');
        
        if (!snapshot.exists()) {
            return null;
        }
        
        const partners = snapshot.val();
        const partnerId = Object.keys(partners)[0];
        
        return {
            id: partnerId,
            ...partners[partnerId]
        };
        
    } catch (error) {
        console.error('Error obteniendo partner por email:', error);
        return null;
    }
}

/**
 * Obtiene un partner por ID
 */
async function obtenerPartnerPorId(partnerId, solicitanteEmail) {
    try {
        const db = admin.database();
        const snapshot = await db.ref(`partners/${partnerId}`).once('value');
        
        if (!snapshot.exists()) {
            return null;
        }
        
        const partner = snapshot.val();
        
        // Verificar permiso: solo admin o el mismo partner
        if (solicitanteEmail !== ADMIN_EMAIL && partner.email !== solicitanteEmail) {
            throw new Error('No autorizado');
        }
        
        return {
            id: partnerId,
            ...partner
        };
        
    } catch (error) {
        console.error('Error obteniendo partner:', error);
        throw error;
    }
}

/**
 * Actualiza un partner (solo admin)
 */
async function actualizarPartner(partnerId, datos, adminEmail) {
    if (adminEmail !== ADMIN_EMAIL) {
        throw new Error('No autorizado');
    }
    
    try {
        const db = admin.database();
        
        const updates = {};
        
        if (datos.nombre) updates.nombre = datos.nombre;
        if (datos.telefono !== undefined) updates.telefono = datos.telefono;
        if (datos.estado) updates.estado = datos.estado;
        if (datos.datosPago) updates.datosPago = datos.datosPago;
        
        await db.ref(`partners/${partnerId}`).update(updates);
        
        console.log(`✅ Partner actualizado: ${partnerId}`);
        
        return true;
        
    } catch (error) {
        console.error('Error actualizando partner:', error);
        throw error;
    }
}

/**
 * Vincula un tenant a un partner (al registrarse con código de referido)
 */
async function vincularTenantAPartner(tenantId, codigoReferido) {
    try {
        // Verificar código
        const resultado = await verificarCodigoReferido(codigoReferido);
        
        if (!resultado.valid) {
            console.log(`⚠️ Código de referido inválido: ${codigoReferido}`);
            return false;
        }
        
        const db = admin.database();
        
        // Actualizar tenant con datos de referido
        await db.ref(`tenants/${tenantId}`).update({
            partnerId: resultado.partnerId,
            codigoReferido: codigoReferido,
            fueReferido: true,
            fechaVinculacion: Date.now()
        });
        
        // Actualizar estadísticas del partner
        const partnerRef = db.ref(`partners/${resultado.partnerId}/estadisticas`);
        const statsSnapshot = await partnerRef.once('value');
        const stats = statsSnapshot.val() || {};
        
        await partnerRef.update({
            totalReferidos: (stats.totalReferidos || 0) + 1
        });
        
        console.log(`✅ Tenant ${tenantId} vinculado a partner ${resultado.partnerId}`);
        
        return true;
        
    } catch (error) {
        console.error('Error vinculando tenant a partner:', error);
        return false;
    }
}

/**
 * Genera una comisión cuando un tenant paga membresía
 */
async function generarComision(tenantId, tenantNombre, valorMembresia, tipoMembresia, transaccionId) {
    try {
        const db = admin.database();
        
        // Obtener datos del tenant
        const tenantSnapshot = await db.ref(`tenants/${tenantId}`).once('value');
        const tenant = tenantSnapshot.val();
        
        if (!tenant || !tenant.partnerId) {
            console.log(`ℹ️ Tenant ${tenantId} no tiene partner asociado`);
            return null;
        }
        
        // Verificar período de gracia (30 días desde registro)
        const fechaVinculacion = tenant.fechaVinculacion || tenant.createdAt;
        const diasDesdeVinculacion = (Date.now() - fechaVinculacion) / (1000 * 60 * 60 * 24);
        
        // Obtener datos del partner
        const partnerSnapshot = await db.ref(`partners/${tenant.partnerId}`).once('value');
        const partner = partnerSnapshot.val();
        
        if (!partner || partner.estado !== 'activo') {
            console.log(`⚠️ Partner ${tenant.partnerId} no activo`);
            return null;
        }
        
        // Calcular comisión
        const valorComision = Math.round(valorMembresia * COMISION_PORCENTAJE / 100);
        
        // Crear registro de comisión
        const comisionId = db.ref('comisiones').push().key;
        
        const comision = {
            id: comisionId,
            partnerId: tenant.partnerId,
            partnerNombre: partner.nombre,
            partnerEmail: partner.email,
            tenantId: tenantId,
            tenantNombre: tenantNombre || tenant.restaurantName || tenantId,
            tipoMembresia: tipoMembresia,
            valorMembresia: valorMembresia,
            porcentajeComision: COMISION_PORCENTAJE,
            valorComision: valorComision,
            estado: 'pendiente',
            fechaGenerada: Date.now(),
            fechaPago: null,
            transaccionWompiId: transaccionId || null,
            referenciaPagoSocio: null,
            periodoMembresia: obtenerPeriodoActual(),
            esRenovacion: diasDesdeVinculacion > 30
        };
        
        await db.ref(`comisiones/${comisionId}`).set(comision);
        
        // Actualizar estadísticas del partner
        const statsRef = db.ref(`partners/${tenant.partnerId}/estadisticas`);
        const statsSnapshot = await statsRef.once('value');
        const stats = statsSnapshot.val() || {};
        
        await statsRef.update({
            totalComisionesGeneradas: (stats.totalComisionesGeneradas || 0) + valorComision,
            comisionesPendientes: (stats.comisionesPendientes || 0) + valorComision
        });
        
        console.log(`💰 Comisión generada: $${valorComision} para partner ${partner.nombre}`);
        
        return comision;
        
    } catch (error) {
        console.error('Error generando comisión:', error);
        throw error;
    }
}

/**
 * Marca una comisión como pagada (solo admin)
 */
async function marcarComisionPagada(comisionId, referenciaPago, adminEmail) {
    if (adminEmail !== ADMIN_EMAIL) {
        throw new Error('No autorizado');
    }
    
    try {
        const db = admin.database();
        
        // Obtener comisión
        const comisionSnapshot = await db.ref(`comisiones/${comisionId}`).once('value');
        const comision = comisionSnapshot.val();
        
        if (!comision) {
            throw new Error('Comisión no encontrada');
        }
        
        if (comision.estado === 'pagada') {
            throw new Error('La comisión ya fue pagada');
        }
        
        // Actualizar comisión
        await db.ref(`comisiones/${comisionId}`).update({
            estado: 'pagada',
            fechaPago: Date.now(),
            referenciaPagoSocio: referenciaPago
        });
        
        // Actualizar estadísticas del partner
        const statsRef = db.ref(`partners/${comision.partnerId}/estadisticas`);
        const statsSnapshot = await statsRef.once('value');
        const stats = statsSnapshot.val() || {};
        
        await statsRef.update({
            totalComisionesPagadas: (stats.totalComisionesPagadas || 0) + comision.valorComision,
            comisionesPendientes: Math.max(0, (stats.comisionesPendientes || 0) - comision.valorComision)
        });
        
        console.log(`✅ Comisión ${comisionId} marcada como pagada`);
        
        return true;
        
    } catch (error) {
        console.error('Error marcando comisión como pagada:', error);
        throw error;
    }
}

/**
 * Obtiene comisiones (filtradas según permisos)
 */
async function obtenerComisiones(filtros = {}, solicitanteEmail) {
    try {
        const db = admin.database();
        let query = db.ref('comisiones');
        
        const snapshot = await query.once('value');
        
        if (!snapshot.exists()) {
            return [];
        }
        
        let comisiones = [];
        snapshot.forEach(child => {
            comisiones.push({
                id: child.key,
                ...child.val()
            });
        });
        
        // Si no es admin, filtrar solo las del partner
        if (solicitanteEmail !== ADMIN_EMAIL) {
            const partner = await obtenerPartnerPorEmail(solicitanteEmail);
            if (partner) {
                comisiones = comisiones.filter(c => c.partnerId === partner.id);
            } else {
                return [];
            }
        }
        
        // Aplicar filtros
        if (filtros.estado) {
            comisiones = comisiones.filter(c => c.estado === filtros.estado);
        }
        
        if (filtros.partnerId) {
            comisiones = comisiones.filter(c => c.partnerId === filtros.partnerId);
        }
        
        // Ordenar por fecha (más reciente primero)
        comisiones.sort((a, b) => b.fechaGenerada - a.fechaGenerada);
        
        return comisiones;
        
    } catch (error) {
        console.error('Error obteniendo comisiones:', error);
        throw error;
    }
}

/**
 * Obtiene los tenants referidos por un partner
 */
async function obtenerReferidos(partnerId, solicitanteEmail) {
    try {
        // Verificar permiso
        const partner = await obtenerPartnerPorId(partnerId, solicitanteEmail);
        if (!partner) {
            throw new Error('Partner no encontrado');
        }
        
        const db = admin.database();
        const snapshot = await db.ref('tenants')
            .orderByChild('partnerId')
            .equalTo(partnerId)
            .once('value');
        
        if (!snapshot.exists()) {
            return [];
        }
        
        const referidos = [];
        snapshot.forEach(child => {
            const tenant = child.val();
            referidos.push({
                id: child.key,
                nombre: tenant.restaurantName || tenant.config?.restaurantName || child.key,
                email: tenant.email || tenant.config?.email,
                fechaRegistro: tenant.fechaVinculacion || tenant.createdAt,
                plan: tenant.membership?.plan || 'trial',
                estado: tenant.membership?.status || 'active'
            });
        });
        
        return referidos;
        
    } catch (error) {
        console.error('Error obteniendo referidos:', error);
        throw error;
    }
}

/**
 * Obtiene estadísticas para el dashboard del partner
 */
async function obtenerEstadisticasPartner(partnerId, solicitanteEmail) {
    try {
        const partner = await obtenerPartnerPorId(partnerId, solicitanteEmail);
        if (!partner) {
            throw new Error('Partner no encontrado');
        }
        
        const comisiones = await obtenerComisiones({ partnerId }, solicitanteEmail);
        const referidos = await obtenerReferidos(partnerId, solicitanteEmail);
        
        // Calcular estadísticas
        const comisionesPendientes = comisiones.filter(c => c.estado === 'pendiente');
        const comisionesPagadas = comisiones.filter(c => c.estado === 'pagada');
        
        return {
            partner: {
                nombre: partner.nombre,
                codigoReferido: partner.codigoReferido,
                enlaceReferido: partner.enlaceReferido
            },
            estadisticas: {
                totalReferidos: referidos.length,
                referidosActivos: referidos.filter(r => r.estado === 'active').length,
                totalComisionesGeneradas: comisiones.reduce((sum, c) => sum + c.valorComision, 0),
                totalComisionesPagadas: comisionesPagadas.reduce((sum, c) => sum + c.valorComision, 0),
                comisionesPendientes: comisionesPendientes.reduce((sum, c) => sum + c.valorComision, 0),
                cantidadPendientes: comisionesPendientes.length
            },
            ultimasComisiones: comisiones.slice(0, 10),
            referidos: referidos
        };
        
    } catch (error) {
        console.error('Error obteniendo estadísticas partner:', error);
        throw error;
    }
}

// Utilidad para obtener período actual
function obtenerPeriodoActual() {
    const fecha = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

module.exports = {
    ADMIN_EMAIL,
    COMISION_PORCENTAJE,
    generarCodigoReferido,
    verificarCodigoReferido,
    crearPartner,
    obtenerPartners,
    obtenerPartnerPorEmail,
    obtenerPartnerPorId,
    actualizarPartner,
    vincularTenantAPartner,
    generarComision,
    marcarComisionPagada,
    obtenerComisiones,
    obtenerReferidos,
    obtenerEstadisticasPartner
};
