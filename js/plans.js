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
        // Usuario logueado: obtener recomendación real
        await loadRecommendation();
    } else {
        // Usuario no logueado: mostrar banner de prueba gratis y recomendar Profesional
        showTrialBanner();
        highlightPlan('profesional');
        updateButtonsForTrial();
    }

    // Si hay plan preseleccionado, resaltarlo
    if (preselectedPlan && ['emprendedor', 'profesional', 'empresarial'].includes(preselectedPlan)) {
        highlightPlan(preselectedPlan);
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
            
            // Mostrar banner de recomendación
            const banner = document.getElementById('recommendationBanner');
            banner.classList.add('visible');
            
            if (data.urgency === 'high') {
                banner.classList.add('urgency-high');
            }

            // Mostrar razones
            const reasonsList = document.getElementById('recommendationReasons');
            reasonsList.innerHTML = data.reasons.map(r => `<li>${r}</li>`).join('');

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
        highlightPlan('profesional');
    }
}

// Resaltar un plan como recomendado
function highlightPlan(planId) {
    // Quitar clase recommended de todos
    document.querySelectorAll('.plan-card').forEach(card => {
        card.classList.remove('recommended');
    });

    // Agregar clase al plan recomendado
    const card = document.getElementById(`plan-${planId}`);
    if (card) {
        card.classList.add('recommended');
        
        // Cambiar botón a primary
        const btn = card.querySelector('.plan-cta');
        btn.classList.remove('secondary');
        btn.classList.add('primary');
    }

    recommendedPlan = planId;
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
