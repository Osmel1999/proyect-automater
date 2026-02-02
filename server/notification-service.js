/**
 * Servicio de Notificaciones por WhatsApp
 * Envía notificaciones del sistema al dueño del restaurante usando su propio bot
 */

const firebaseService = require('./firebase-service');
const membershipService = require('./membership-service');

// Referencia a baileys (se inyecta para evitar dependencias circulares)
let baileysService = null;

/**
 * Inicializa el servicio con la referencia a baileys
 * @param {object} baileys - Servicio de baileys
 */
function init(baileys) {
    baileysService = baileys;
    console.log('✅ [NotificationService] Inicializado');
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
 */
async function notifyApproachingLimit(tenantId, currentOrders, limit) {
    const remaining = limit - currentOrders;
    const percentage = Math.round((currentOrders / limit) * 100);

    if (percentage >= 90 && remaining > 0) {
        const message = `⚡ Llevas *${currentOrders}/${limit}* pedidos hoy (${percentage}%).\n\nTe quedan solo *${remaining} pedidos* en tu plan actual.\n\nActualiza tu plan para no perder ventas:\n👉 https://kdsapp.site/plans.html`;
        return sendNotification(tenantId, message, 'warning');
    }
}

/**
 * Notifica que se perdieron pedidos por límite
 * @param {string} tenantId - ID del tenant
 * @param {number} lostCount - Cantidad de pedidos perdidos hoy
 */
async function notifyLostOrders(tenantId, lostCount) {
    if (lostCount === 1) {
        const message = `😔 Perdiste *1 pedido* hoy porque alcanzaste el límite de tu plan.\n\nCada pedido perdido es dinero que no entra a tu negocio.\n\nActualiza ahora:\n👉 https://kdsapp.site/plans.html`;
        return sendNotification(tenantId, message, 'urgent');
    } else if (lostCount > 1 && lostCount % 3 === 0) {
        // Notificar cada 3 pedidos perdidos para no spamear
        const message = `😔 Has perdido *${lostCount} pedidos* hoy por límite de plan.\n\n¿Cuánto dinero representa eso?\n\nActualiza tu plan:\n👉 https://kdsapp.site/plans.html`;
        return sendNotification(tenantId, message, 'urgent');
    }
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
    const planNames = {
        emprendedor: 'Emprendedor',
        profesional: 'Profesional',
        empresarial: 'Empresarial'
    };
    
    const message = `✅ *¡Pago confirmado!*\n\nTu plan *${planNames[plan] || plan}* está activo por 30 días.\n\n¡Gracias por confiar en KDS! 🙌`;
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
    
    // Notificaciones específicas
    notifyPlanExpiring,
    notifyApproachingLimit,
    notifyLostOrders,
    notifyPlanExpired,
    notifyPaymentSuccess,
    
    // Verificación de membresías
    checkAllMemberships
};
