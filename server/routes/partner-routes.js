/**
 * 🤝 Partner Routes
 * Rutas API para gestión de socios comerciales y comisiones
 */

const express = require('express');
const router = express.Router();
const partnerService = require('../services/partner-service');

// Middleware para verificar email del usuario
const getEmailFromRequest = (req) => {
    // El email puede venir del token, header o query
    return req.user?.email || req.headers['x-user-email'] || req.query.email;
};

// ==========================================
// RUTAS DE PARTNERS (Admin)
// ==========================================

/**
 * GET /api/partners - Obtener todos los partners (solo admin)
 */
router.get('/', async (req, res) => {
    try {
        const email = getEmailFromRequest(req);
        
        if (!email) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        
        const partners = await partnerService.obtenerPartners(email);
        
        res.json({
            success: true,
            partners
        });
        
    } catch (error) {
        console.error('Error GET /api/partners:', error);
        res.status(error.message === 'No autorizado' ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/partners - Crear un nuevo partner (solo admin)
 */
router.post('/', async (req, res) => {
    try {
        const email = getEmailFromRequest(req);
        
        if (!email) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        
        const { nombre, emailPartner, telefono, banco, tipoCuenta, numeroCuenta, cedula, titular } = req.body;
        
        if (!nombre || !emailPartner) {
            return res.status(400).json({
                success: false,
                error: 'Nombre y email son requeridos'
            });
        }
        
        const partner = await partnerService.crearPartner({
            nombre,
            email: emailPartner,
            telefono,
            banco,
            tipoCuenta,
            numeroCuenta,
            cedula,
            titular
        }, email);
        
        res.json({
            success: true,
            partner
        });
        
    } catch (error) {
        console.error('Error POST /api/partners:', error);
        res.status(error.message === 'No autorizado' ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/partners/:id - Obtener un partner por ID
 */
router.get('/:id', async (req, res) => {
    try {
        const email = getEmailFromRequest(req);
        
        if (!email) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        
        const partner = await partnerService.obtenerPartnerPorId(req.params.id, email);
        
        if (!partner) {
            return res.status(404).json({
                success: false,
                error: 'Partner no encontrado'
            });
        }
        
        res.json({
            success: true,
            partner
        });
        
    } catch (error) {
        console.error('Error GET /api/partners/:id:', error);
        res.status(error.message === 'No autorizado' ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/partners/:id - Actualizar un partner (solo admin)
 */
router.put('/:id', async (req, res) => {
    try {
        const email = getEmailFromRequest(req);
        
        if (!email) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        
        await partnerService.actualizarPartner(req.params.id, req.body, email);
        
        res.json({
            success: true,
            message: 'Partner actualizado'
        });
        
    } catch (error) {
        console.error('Error PUT /api/partners/:id:', error);
        res.status(error.message === 'No autorizado' ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/partners/:id/referidos - Obtener referidos de un partner
 */
router.get('/:id/referidos', async (req, res) => {
    try {
        const email = getEmailFromRequest(req);
        
        if (!email) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        
        const referidos = await partnerService.obtenerReferidos(req.params.id, email);
        
        res.json({
            success: true,
            referidos
        });
        
    } catch (error) {
        console.error('Error GET /api/partners/:id/referidos:', error);
        res.status(error.message === 'No autorizado' ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/partners/:id/estadisticas - Obtener estadísticas del partner
 */
router.get('/:id/estadisticas', async (req, res) => {
    try {
        const email = getEmailFromRequest(req);
        
        if (!email) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        
        const estadisticas = await partnerService.obtenerEstadisticasPartner(req.params.id, email);
        
        res.json({
            success: true,
            ...estadisticas
        });
        
    } catch (error) {
        console.error('Error GET /api/partners/:id/estadisticas:', error);
        res.status(error.message === 'No autorizado' ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// RUTAS DE COMISIONES
// ==========================================

/**
 * GET /api/partners/comisiones/all - Obtener comisiones (admin ve todas, partner ve las suyas)
 */
router.get('/comisiones/all', async (req, res) => {
    try {
        const email = getEmailFromRequest(req);
        
        if (!email) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        
        const filtros = {
            estado: req.query.estado,
            partnerId: req.query.partnerId
        };
        
        const comisiones = await partnerService.obtenerComisiones(filtros, email);
        
        res.json({
            success: true,
            comisiones
        });
        
    } catch (error) {
        console.error('Error GET /api/partners/comisiones/all:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/partners/comisiones/:id/pagar - Marcar comisión como pagada (solo admin)
 */
router.post('/comisiones/:id/pagar', async (req, res) => {
    try {
        const email = getEmailFromRequest(req);
        
        if (!email) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        
        const { referenciaPago } = req.body;
        
        if (!referenciaPago) {
            return res.status(400).json({
                success: false,
                error: 'Referencia de pago requerida'
            });
        }
        
        await partnerService.marcarComisionPagada(req.params.id, referenciaPago, email);
        
        res.json({
            success: true,
            message: 'Comisión marcada como pagada'
        });
        
    } catch (error) {
        console.error('Error POST /api/partners/comisiones/:id/pagar:', error);
        res.status(error.message === 'No autorizado' ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// RUTAS PÚBLICAS
// ==========================================

/**
 * GET /api/partners/verificar-codigo/:codigo - Verificar código de referido (público)
 */
router.get('/verificar-codigo/:codigo', async (req, res) => {
    try {
        const resultado = await partnerService.verificarCodigoReferido(req.params.codigo);
        
        res.json({
            success: true,
            valid: resultado.valid,
            partnerNombre: resultado.valid ? resultado.partnerNombre : null,
            error: resultado.error
        });
        
    } catch (error) {
        console.error('Error GET /api/partners/verificar-codigo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/partners/mi-cuenta - Obtener datos del partner logueado
 */
router.get('/mi-cuenta/info', async (req, res) => {
    try {
        const email = getEmailFromRequest(req);
        
        if (!email) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        
        const partner = await partnerService.obtenerPartnerPorEmail(email);
        
        if (!partner) {
            return res.status(404).json({
                success: false,
                error: 'No eres un socio comercial registrado'
            });
        }
        
        const estadisticas = await partnerService.obtenerEstadisticasPartner(partner.id, email);
        
        res.json({
            success: true,
            ...estadisticas
        });
        
    } catch (error) {
        console.error('Error GET /api/partners/mi-cuenta/info:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/partners/check-role/:email - Verificar si un email es partner
 */
router.get('/check-role/:email', async (req, res) => {
    try {
        const email = req.params.email;
        
        // Verificar si es admin
        const isAdmin = email === partnerService.ADMIN_EMAIL;
        
        // Verificar si es partner
        const partner = await partnerService.obtenerPartnerPorEmail(email);
        const isPartner = partner !== null;
        
        res.json({
            success: true,
            isAdmin,
            isPartner,
            partnerId: partner?.id || null
        });
        
    } catch (error) {
        console.error('Error GET /api/partners/check-role:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/partners/mi-cuenta/password-cambiado - Marcar que el partner cambió su contraseña
 */
router.post('/mi-cuenta/password-cambiado', async (req, res) => {
    try {
        const email = getEmailFromRequest(req);
        
        if (!email) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        
        const partner = await partnerService.obtenerPartnerPorEmail(email);
        
        if (!partner) {
            return res.status(404).json({
                success: false,
                error: 'No eres un socio comercial registrado'
            });
        }
        
        await partnerService.marcarPasswordCambiado(partner.id);
        
        res.json({
            success: true,
            message: 'Marcado correctamente'
        });
        
    } catch (error) {
        console.error('Error POST /api/partners/mi-cuenta/password-cambiado:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
