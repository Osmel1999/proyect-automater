/**
 * Servicio de Notificaciones por WhatsApp
 * Envía notificaciones del sistema al dueño del restaurante usando su propio bot
 * 
 * ACTUALIZADO: Ahora usa límites MENSUALES e incluye enlaces de pago directos
 */

const firebaseService = require('./firebase-service');
const membershipService = require('./membership-service');

// Referencia a baileys y wompi (se inyecta para evitar dependencias circulares)
let baileysService = null;
let wompiService = null;

/**
 * Inicializa el servicio con las referencias necesarias
 * @param {object} baileys - Servicio de baileys
 * @param {object} wompi - Servicio de wompi (opcional)
 */
function init(baileys, wompi = null) {
    baileysService = baileys;
    wompiService = wompi;
    console.log('✅ [NotificationService] Inicializado' + (wompi ? ' con Wompi' : ''));
}

/**
 * Obtiene el número de teléfono del dueño/bot del tenant
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<string|null>} Número de teléfono o null
 */
async function getOwnerPhone(tenantId) {
    try {
        // Primero intentar obtener de la sesión activa de baileys
        if (baileysService) {
            const status = await baileysService.getStatus(tenantId);
            if (status?.connected && status?.phoneNumber) {
                return status.phoneNumber;
            }
        }

        // Si no hay sesión activa, buscar en Firebase
        const snapshot = await firebaseService.database
            .ref(`tenants/${tenantId}/whatsapp/phoneNumber`)
            .once('value');
        
        return snapshot.val();
    } catch (error) {
        console.error(`❌ [NotificationService] Error obteniendo teléfono de ${tenantId}:`, error);
        return null;
    }
}

/**
 * Envía una notificación al dueño del restaurante
 * @param {string} tenantId - ID del tenant
 * @param {string} message - Mensaje a enviar
 * @param {string} type - Tipo de notificación (info, warning, urgent)
 * @returns {Promise<boolean>} True si se envió correctamente
 */
async function sendNotification(tenantId, message, type = 'info') {
    try {
        if (!baileysService) {
            console.warn(`⚠️ [NotificationService] Baileys no inicializado`);
            return false;
        }

        // Verificar que el bot esté conectado
        const status = await baileysService.getStatus(tenantId);
        if (!status?.connected) {
            console.log(`📵 [NotificationService] Bot no conectado para ${tenantId}, notificación pendiente`);
            // Guardar notificación pendiente para enviar cuando se conecte
            await savePendingNotification(tenantId, message, type);
            return false;
        }

        const ownerPhone = await getOwnerPhone(tenantId);
        if (!ownerPhone) {
            console.warn(`⚠️ [NotificationService] No se encontró teléfono para ${tenantId}`);
            return false;
        }

        // Construir mensaje con formato
        const icon = type === 'urgent' ? '🚨' : type === 'warning' ? '⚠️' : '🔔';
        const formattedMessage = `${icon} *Notificación KDS*\n\n${message}`;

        // Enviar mensaje
        const result = await baileysService.sendMessage(tenantId, ownerPhone, {
            text: formattedMessage
        });

        if (result?.success) {
            console.log(`✅ [NotificationService] Notificación enviada a ${tenantId}`);
            // Registrar notificación enviada
            await logNotification(tenantId, message, type, 'sent');
            return true;
        } else {
            console.error(`❌ [NotificationService] Error enviando a ${tenantId}:`, result);
            return false;
        }

    } catch (error) {
        console.error(`❌ [NotificationService] Error:`, error);
        return false;
    }
}

/**
 * Guarda una notificación pendiente para enviar después
 */
async function savePendingNotification(tenantId, message, type) {
    try {
        await firebaseService.database
            .ref(`tenants/${tenantId}/pendingNotifications`)
            .push({
                message,
                type,
                createdAt: new Date().toISOString()
            });
    } catch (error) {
        console.error(`❌ [NotificationService] Error guardando notificación pendiente:`, error);
    }
}

/**
 * Envía todas las notificaciones pendientes de un tenant
 * @param {string} tenantId - ID del tenant
 */
async function sendPendingNotifications(tenantId) {
    try {
        const snapshot = await firebaseService.database
            .ref(`tenants/${tenantId}/pendingNotifications`)
            .once('value');
        
        const pending = snapshot.val();
        if (!pending) return;

        for (const [key, notification] of Object.entries(pending)) {
            const sent = await sendNotification(tenantId, notification.message, notification.type);
            if (sent) {
                // Eliminar notificación pendiente
                await firebaseService.database
                    .ref(`tenants/${tenantId}/pendingNotifications/${key}`)
                    .remove();
            }
        }
    } catch (error) {
        console.error(`❌ [NotificationService] Error enviando pendientes:`, error);
    }
}

/**
 * Registra una notificación en el historial
 */
async function logNotification(tenantId, message, type, status) {
    try {
        await firebaseService.database
            .ref(`tenants/${tenantId}/notificationHistory`)
            .push({
                message,
                type,
                status,
                sentAt: new Date().toISOString()
            });
    } catch (error) {
        console.error(`❌ [NotificationService] Error registrando notificación:`, error);
    }
}

// ============================================
// FUNCIONES AUXILIARES PARA ENLACES DE PAGO
// ============================================

/**
 * Obtiene el email del tenant para generar enlaces de pago
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<string|null>} Email del tenant
 */
async function getTenantEmail(tenantId) {
    try {
        const snapshot = await firebaseService.database
            .ref(`tenants/${tenantId}/config/email`)
            .once('value');
        
        let email = snapshot.val();
        
        // Si no hay email en config, buscar en user
        if (!email) {
            const userSnapshot = await firebaseService.database
                .ref(`tenants/${tenantId}/user/email`)
                .once('value');
            email = userSnapshot.val();
        }
        
        return email;
    } catch (error) {
        console.error(`❌ [NotificationService] Error obteniendo email:`, error);
        return null;
    }
}

/**
 * Genera un enlace de pago de Wompi para un plan específico
 * @param {string} tenantId - ID del tenant
 * @param {string} planName - Nombre del plan (emprendedor, profesional, empresarial)
 * @returns {Promise<string|null>} URL del enlace de pago o null
 */
async function getPaymentLinkForPlan(tenantId, planName) {
    try {
        if (!wompiService) {
            console.log(`⚠️ [NotificationService] Wompi no configurado, usando página de planes`);
            return null;
        }

        const email = await getTenantEmail(tenantId);
        if (!email) {
            console.log(`⚠️ [NotificationService] No se encontró email para ${tenantId}`);
            return null;
        }

        // Generar enlace de pago
        const result = await wompiService.createPaymentLink(tenantId, planName, email);
        
        if (result.success && result.paymentUrl) {
            console.log(`✅ [NotificationService] Enlace de pago generado para ${tenantId}: ${planName}`);
            return result.paymentUrl;
        }

        return null;
    } catch (error) {
        console.error(`❌ [NotificationService] Error generando enlace de pago:`, error);
        return null;
    }
}

/**
 * Obtiene el timestamp de la última notificación de un tipo
 */
async function getLastNotificationTime(tenantId, type) {
    try {
        const snapshot = await firebaseService.database
            .ref(`tenants/${tenantId}/lastNotifications/${type}_timestamp`)
            .once('value');
        
        return snapshot.val();
    } catch (error) {
        return null;
    }
}

/**
 * Guarda el timestamp de la última notificación de un tipo
 */
async function setLastNotificationTime(tenantId, type) {
    try {
        await firebaseService.database
            .ref(`tenants/${tenantId}/lastNotifications/${type}_timestamp`)
            .set(Date.now());
    } catch (error) {
        console.error(`❌ [NotificationService] Error guardando timestamp:`, error);
    }
}

// ============================================
// NOTIFICACIONES ESPECÍFICAS DE MEMBRESÍA
// ============================================

/**
 * Notifica que el trial/plan está por vencer
 * @param {string} tenantId - ID del tenant
 * @param {number} daysRemaining - Días restantes
 */
async function notifyPlanExpiring(tenantId, daysRemaining) {
    let message;
    let type;

    if (daysRemaining <= 1) {
        type = 'urgent';
        message = `Tu plan vence *mañana*.\n\nPara seguir recibiendo pedidos automáticos, elige un plan ahora:\n👉 https://kdsapp.site/plans.html`;
    } else if (daysRemaining <= 3) {
        type = 'warning';
        message = `Tu plan vence en *${daysRemaining} días*.\n\nNo pierdas tus pedidos automáticos. Elige un plan:\n👉 https://kdsapp.site/plans.html`;
    } else if (daysRemaining <= 7) {
        type = 'info';
        message = `Recordatorio: Tu plan vence en ${daysRemaining} días.\n\nRenueva o cambia de plan aquí:\n👉 https://kdsapp.site/plans.html`;
    } else {
        return; // No notificar si faltan más de 7 días
    }

    return sendNotification(tenantId, message, type);
}

/**
 * Notifica que se acercan al límite de pedidos del día
 * @param {string} tenantId - ID del tenant
 * @param {number} currentOrders - Pedidos actuales
 * @param {number} limit - Límite del plan
 * @deprecated Usar notifyApproachingMonthlyLimit en su lugar
 */
async function notifyApproachingLimit(tenantId, currentOrders, limit) {
    // Redirigir a la versión mensual
    const orderCheck = { ordersThisPeriod: currentOrders, ordersLimit: limit, usagePercent: Math.round((currentOrders / limit) * 100) };
    return notifyApproachingMonthlyLimit(tenantId, orderCheck);
}

/**
 * Notifica que se acercan al límite MENSUAL de pedidos
 * @param {string} tenantId - ID del tenant
 * @param {Object} orderCheck - Datos del chequeo de límite
 */
async function notifyApproachingMonthlyLimit(tenantId, orderCheck) {
    const { ordersThisPeriod, ordersLimit, usagePercent, daysRemaining } = orderCheck;
    const remaining = ordersLimit - ordersThisPeriod;

    // Solo notificar si está al 90% o más
    if (usagePercent < 90) return;

    // Verificar si ya notificamos hoy (anti-spam)
    const alreadyNotified = await wasNotifiedToday(tenantId, 'approaching_limit');
    if (alreadyNotified) return;

    // Obtener el siguiente plan recomendado
    const nextPlan = membershipService.getNextPlan(orderCheck.plan);
    const planInfo = membershipService.PLAN_INFO[nextPlan];

    let message = `⚡ *Estás por alcanzar tu límite mensual*\n\n`;
    message += `Has usado *${ordersThisPeriod}/${ordersLimit}* pedidos (${usagePercent}%).\n`;
    message += `Te quedan *${remaining} pedidos* para los próximos ${daysRemaining || 'pocos'} días.\n\n`;
    
    if (nextPlan && planInfo) {
        message += `💡 *Recomendación:* Actualiza al plan *${planInfo.name}* (${planInfo.ordersPerMonth} pedidos/mes) para no perder ventas.\n\n`;
        
        // Generar enlace de pago si es posible
        const paymentLink = await getPaymentLinkForPlan(tenantId, nextPlan);
        if (paymentLink) {
            message += `👉 Paga aquí: ${paymentLink}\n`;
            message += `_(El nuevo plan dura 30 días desde el pago)_`;
        } else {
            message += `👉 Ver planes: https://kdsapp.site/plans.html`;
        }
    } else {
        message += `👉 Contacta soporte para opciones personalizadas.`;
    }

    await markNotifiedToday(tenantId, 'approaching_limit');
    return sendNotification(tenantId, message, 'warning');
}

/**
 * Notifica que se perdieron pedidos por límite (versión legacy)
 * @deprecated Usar notifyLostOrderWithPaymentLink en su lugar
 */
async function notifyLostOrders(tenantId, lostCount) {
    // Redirigir a la versión con enlace de pago
    const orderCheck = await membershipService.canCreateOrder(tenantId);
    return notifyLostOrderWithPaymentLink(tenantId, orderCheck);
}

/**
 * Notifica que se perdió un pedido por límite mensual - CON ENLACE DE PAGO
 * @param {string} tenantId - ID del tenant
 * @param {Object} orderCheck - Datos del chequeo de límite
 */
async function notifyLostOrderWithPaymentLink(tenantId, orderCheck) {
    const { plan, ordersThisPeriod, ordersLimit, daysRemaining } = orderCheck;

    // Verificar si ya notificamos recientemente (máximo 1 vez cada 3 horas)
    const lastNotification = await getLastNotificationTime(tenantId, 'lost_order');
    const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
    if (lastNotification && lastNotification > threeHoursAgo) {
        console.log(`📵 [NotificationService] Ya se notificó pedido perdido recientemente para ${tenantId}`);
        return;
    }

    // Obtener el siguiente plan recomendado
    const nextPlan = membershipService.getNextPlan(plan);
    const planInfo = membershipService.PLAN_INFO[nextPlan];

    let message = `😔 *Perdiste un pedido*\n\n`;
    message += `Alcanzaste el límite de *${ordersLimit} pedidos* de tu plan *${plan}*.\n`;
    
    if (daysRemaining > 0) {
        message += `Tu plan actual se renueva en ${daysRemaining} días.\n\n`;
    }

    message += `💰 *Cada pedido perdido es dinero que no entra a tu negocio.*\n\n`;

    if (nextPlan && planInfo) {
        message += `✅ *Solución:* Actualiza al plan *${planInfo.name}*\n`;
        message += `• ${planInfo.ordersPerMonth} pedidos por mes\n`;
        message += `• Solo $${planInfo.price.toLocaleString('es-CO')} COP\n`;
        message += `• Activo por 30 días desde el pago\n\n`;
        
        // Generar enlace de pago directo
        const paymentLink = await getPaymentLinkForPlan(tenantId, nextPlan);
        if (paymentLink) {
            message += `👉 *Paga ahora:* ${paymentLink}`;
        } else {
            message += `� Ver planes: https://kdsapp.site/plans.html`;
        }
    } else {
        message += `Has alcanzado el plan máximo. Contacta soporte para opciones empresariales personalizadas.`;
    }

    await setLastNotificationTime(tenantId, 'lost_order');
    return sendNotification(tenantId, message, 'urgent');
}

/**
 * Notifica que el plan expiró
 * @param {string} tenantId - ID del tenant
 */
async function notifyPlanExpired(tenantId) {
    const message = `🔴 *Tu plan ha expirado*\n\nEl bot de pedidos está desactivado.\n\nPara volver a recibir pedidos automáticos, elige un plan:\n👉 https://kdsapp.site/plans.html`;
    return sendNotification(tenantId, message, 'urgent');
}

/**
 * Notifica que el pago fue exitoso
 * @param {string} tenantId - ID del tenant
 * @param {string} plan - Nombre del plan
 */
async function notifyPaymentSuccess(tenantId, plan) {
    const planInfo = membershipService.PLAN_INFO[plan] || {};
    const planName = planInfo.name || plan;
    const ordersPerMonth = planInfo.ordersPerMonth || 'ilimitados';
    
    // Calcular fecha de vencimiento (30 días desde hoy)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const endDateStr = endDate.toLocaleDateString('es-CO', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });

    let message = `✅ *¡Pago confirmado!*\n\n`;
    message += `Tu plan *${planName}* está ahora activo.\n\n`;
    message += `📦 *${ordersPerMonth} pedidos* disponibles\n`;
    message += `📅 Válido hasta: *${endDateStr}*\n`;
    message += `_(30 días a partir de hoy)_\n\n`;
    message += `¡Gracias por confiar en KDS! 🙌`;
    
    return sendNotification(tenantId, message, 'info');
}

// ============================================
// VERIFICACIÓN DIARIA DE MEMBRESÍAS
// ============================================

/**
 * Verifica todas las membresías y envía notificaciones necesarias
 * (Llamar desde un cron job o al inicio del servidor)
 */
async function checkAllMemberships() {
    try {
        console.log('🔍 [NotificationService] Verificando membresías...');
        
        const tenantsSnapshot = await firebaseService.database
            .ref('tenants')
            .once('value');
        
        const tenants = tenantsSnapshot.val();
        if (!tenants) return;

        let notificationsSent = 0;

        for (const [tenantId, tenant] of Object.entries(tenants)) {
            if (!tenant.membership) continue;

            const verification = await membershipService.verifyMembership(tenantId);
            
            if (verification.isValid && verification.daysRemaining) {
                // Plan activo pero por vencer
                if (verification.daysRemaining <= 7) {
                    // Verificar si ya notificamos hoy
                    const alreadyNotified = await wasNotifiedToday(tenantId, 'expiring');
                    if (!alreadyNotified) {
                        await notifyPlanExpiring(tenantId, verification.daysRemaining);
                        await markNotifiedToday(tenantId, 'expiring');
                        notificationsSent++;
                    }
                }
            } else if (!verification.isValid && verification.reason?.includes('expired')) {
                // Plan expirado
                const alreadyNotified = await wasNotifiedToday(tenantId, 'expired');
                if (!alreadyNotified) {
                    await notifyPlanExpired(tenantId);
                    await markNotifiedToday(tenantId, 'expired');
                    notificationsSent++;
                }
            }
        }

        console.log(`✅ [NotificationService] Verificación completada. ${notificationsSent} notificaciones enviadas.`);
    } catch (error) {
        console.error('❌ [NotificationService] Error en checkAllMemberships:', error);
    }
}

/**
 * Verifica si ya se notificó hoy para evitar spam
 */
async function wasNotifiedToday(tenantId, type) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const snapshot = await firebaseService.database
            .ref(`tenants/${tenantId}/lastNotifications/${type}`)
            .once('value');
        
        return snapshot.val() === today;
    } catch (error) {
        return false;
    }
}

/**
 * Marca que se notificó hoy
 */
async function markNotifiedToday(tenantId, type) {
    try {
        const today = new Date().toISOString().split('T')[0];
        await firebaseService.database
            .ref(`tenants/${tenantId}/lastNotifications/${type}`)
            .set(today);
    } catch (error) {
        console.error('❌ [NotificationService] Error marcando notificación:', error);
    }
}

module.exports = {
    init,
    sendNotification,
    sendPendingNotifications,
    
    // Notificaciones de límites (NUEVO: mensuales con enlace de pago)
    notifyApproachingMonthlyLimit,
    notifyLostOrderWithPaymentLink,
    
    // Notificaciones legacy (redirigen a las nuevas)
    notifyApproachingLimit,
    notifyLostOrders,
    
    // Notificaciones de membresía
    notifyPlanExpiring,
    notifyPlanExpired,
    notifyPaymentSuccess,
    
    // Verificación de membresías
    checkAllMemberships,
    
    // Helpers
    getTenantEmail,
    getPaymentLinkForPlan
};

