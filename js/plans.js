/**
 * Plans Page JavaScript
 * Maneja la selección de planes, recomendaciones y pagos
 */

// Configuración
const API_URL = 'https://api.kdsapp.site';

// Estado
let currentTenantId = null;
let userEmail = null;
let isLoggedIn = false;
let recommendedPlan = 'profesional'; // Default para usuarios no logueados

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si hay usuario logueado
    currentTenantId = localStorage.getItem('currentTenantId');
    userEmail = localStorage.getItem('userEmail');
    isLoggedIn = !!currentTenantId;

    // Verificar si viene con un plan preseleccionado en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedPlan = urlParams.get('plan');

    if (isLoggedIn) {
        // Usuario logueado: obtener recomendación real del sistema
        await loadRecommendation();
        
        // NO usar el parámetro de URL si el usuario está logueado
        // El sistema ya determinó el mejor plan basado en analytics
    } else {
        // Usuario no logueado: mostrar banner de prueba gratis
        showTrialBanner();
        updateButtonsForTrial();
        
        // Si hay plan preseleccionado en URL, usarlo; sino, mostrar Profesional por defecto
        if (preselectedPlan && ['emprendedor', 'profesional', 'empresarial'].includes(preselectedPlan)) {
            showRecommendedBadge(preselectedPlan);
        } else {
            showRecommendedBadge('profesional');
        }
    }
});

// Mostrar banner de prueba gratis (solo para no logueados)
function showTrialBanner() {
    const banner = document.getElementById('trialBanner');
    if (banner) {
        banner.classList.add('visible');
    }
}

// Actualizar botones para mostrar "Prueba gratis"
function updateButtonsForTrial() {
    const giftIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;">
        <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
    </svg>`;
    document.querySelectorAll('.plan-cta').forEach(btn => {
        btn.innerHTML = giftIcon + 'Empieza tu prueba gratis';
    });
}

// Cargar recomendación del sistema
async function loadRecommendation() {
    try {
        const response = await fetch(`${API_URL}/api/membership/recommend/${currentTenantId}`);
        const data = await response.json();

        if (data.success) {
            recommendedPlan = data.recommendedPlan;
            
            // Mostrar badge "Recomendado para ti" en el plan correspondiente
            showRecommendedBadge(data.recommendedPlan);
            
            // Mostrar banner de recomendación solo si hay razones específicas (pedidos perdidos, etc.)
            if (data.reasons && data.reasons.length > 0) {
                const banner = document.getElementById('recommendationBanner');
                const titleElement = document.getElementById('recommendationTitle');
                
                // Nombres de planes para mostrar
                const planNames = {
                    emprendedor: 'Plan Emprendedor',
                    profesional: 'Plan Profesional',
                    empresarial: 'Plan Empresarial'
                };
                
                titleElement.textContent = `💡 Te recomendamos: ${planNames[data.recommendedPlan]}`;
                banner.classList.add('visible');
                
                if (data.urgency === 'high') {
                    banner.classList.add('urgency-high');
                }

                // Mostrar razones
                const reasonsList = document.getElementById('recommendationReasons');
                reasonsList.innerHTML = data.reasons.map(r => `<li>${r}</li>`).join('');
            }

            // Resaltar plan recomendado
            highlightPlan(data.recommendedPlan);

            // Mostrar estadísticas de uso en cada plan
            if (data.stats) {
                showUsageStats(data.stats);
            }

            // Mostrar alerta de pedidos perdidos si hay
            if (data.stats && data.stats.lostOrders > 0) {
                showLostOrdersAlert(data.stats.lostOrders, data.financials?.lostRevenue);
            }
        }
    } catch (error) {
        console.error('Error cargando recomendación:', error);
        // Fallback a profesional
        showRecommendedBadge('profesional');
        highlightPlan('profesional');
    }
}

// Mostrar badge "Recomendado para ti" en el plan indicado
function showRecommendedBadge(planId) {
    console.log('🎯 Mostrando badge para plan:', planId);
    
    // Ocultar todos los badges primero
    document.querySelectorAll('.recommended-badge').forEach(badge => {
        badge.style.display = 'none';
    });
    
    // Quitar clase "recommended" de todas las tarjetas
    document.querySelectorAll('.plan-card').forEach(card => {
        card.classList.remove('recommended');
    });
    
    // Mostrar el badge del plan recomendado
    const badge = document.getElementById(`recommended-badge-${planId}`);
    if (badge) {
        badge.style.display = 'block';
        console.log('✅ Badge mostrado para:', planId);
    } else {
        console.warn('⚠️ No se encontró badge para:', planId);
    }
    
    // Agregar clase "recommended" a la tarjeta correspondiente
    const card = document.getElementById(`plan-${planId}`);
    if (card) {
        card.classList.add('recommended');
        
        // Cambiar botón a primary
        const btn = card.querySelector('.plan-cta');
        if (btn) {
            btn.classList.remove('secondary');
            btn.classList.add('primary');
        }
        console.log('✅ Tarjeta resaltada:', planId);
    } else {
        console.warn('⚠️ No se encontró tarjeta para:', planId);
    }
    
    // Actualizar variable global
    recommendedPlan = planId;
}

// Resaltar un plan como recomendado (DEPRECADO - usa showRecommendedBadge)
function highlightPlan(planId) {
    // Redirigir a la nueva función
    showRecommendedBadge(planId);
}

// Mostrar estadísticas de uso
function showUsageStats(stats) {
    const limits = {
        emprendedor: 25,
        profesional: 50,
        empresarial: 100
    };

    Object.keys(limits).forEach(plan => {
        const statsDiv = document.getElementById(`stats-${plan}`);
        const usageSpan = document.getElementById(`usage-${plan}`);
        
        if (statsDiv && usageSpan) {
            statsDiv.classList.add('visible');
            
            const usage = Math.round((stats.ordersPerDay / limits[plan]) * 100);
            usageSpan.textContent = `${usage}% del límite`;
            
            if (usage > 80) {
                usageSpan.classList.add('danger');
            } else if (usage > 50) {
                usageSpan.classList.add('warning');
            }
        }
    });
}

// Mostrar alerta de pedidos perdidos
function showLostOrdersAlert(lostCount, lostRevenue) {
    const alert = document.getElementById('lostOrdersAlert');
    const text = document.getElementById('lostOrdersText');
    const detail = document.getElementById('lostOrdersDetail');

    alert.classList.add('visible');
    text.textContent = `Perdiste ${lostCount} pedidos esta semana`;
    
    if (lostRevenue) {
        detail.textContent = `Eso representa aproximadamente $${lostRevenue.toLocaleString()} COP en ventas perdidas.`;
    }
}

// Seleccionar plan y proceder al pago
async function selectPlan(planId) {
    // Mostrar loading
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('visible');

    try {
        // Si no está logueado, redirigir a registro con el plan
        if (!isLoggedIn) {
            window.location.href = `/auth.html?mode=register&plan=${planId}`;
            return;
        }

        // Crear checkout
        const response = await fetch(`${API_URL}/api/membership/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tenantId: currentTenantId,
                plan: planId,
                email: userEmail
            })
        });

        const data = await response.json();

        if (data.success && data.paymentLink) {
            // Redirigir a Wompi
            window.location.href = data.paymentLink;
        } else {
            throw new Error(data.error || 'Error al crear el pago');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.');
        overlay.classList.remove('visible');
    }
}
