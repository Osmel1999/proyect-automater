/**
 * Membership Check - Frontend Verification
 * Verifica el estado de la membresía del tenant y muestra alertas si es necesario
 * Incluir este script en todas las páginas protegidas
 */

const MembershipCheck = {
    
    /**
     * Verifica el estado de membresía del tenant actual
     * @returns {Promise<Object>} Objeto con el estado de la membresía
     */
    async checkStatus() {
        const currentTenantId = localStorage.getItem('currentTenantId');
        
        if (!currentTenantId) {
            return { valid: false, reason: 'no_tenant' };
        }
        
        try {
            // Verificar que Firebase esté inicializado
            if (!firebase.apps.length) {
                console.error('Firebase no está inicializado');
                return { valid: true, error: true };
            }
            
            // Obtener datos de membresía de Firebase
            const snapshot = await firebase.database()
                .ref(`tenants/${currentTenantId}/membership`)
                .once('value');
            const membership = snapshot.val();
            
            if (!membership) {
                console.warn('⚠️ No se encontró información de membresía');
                return { valid: false, reason: 'no_membership', expired: true };
            }
            
            const now = Date.now();
            const plan = membership.plan || 'trial';
            const status = membership.status || 'active';
            
            // Verificar si es trial y si expiró
            if (plan === 'trial') {
                const trialEnd = membership.trialEndDate;
                if (trialEnd && now > trialEnd) {
                    console.log('⏰ Trial expirado');
                    return { 
                        valid: false, 
                        reason: 'trial_expired',
                        expired: true,
                        plan: 'trial',
                        daysLeft: 0
                    };
                } else if (trialEnd) {
                    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
                    console.log(`✅ Trial activo - ${daysLeft} días restantes`);
                    return {
                        valid: true,
                        plan: 'trial',
                        daysLeft: daysLeft,
                        status: 'active'
                    };
                }
            }
            
            // Si es plan de pago, verificar status
            if (status === 'active' || status === 'paid') {
                console.log(`✅ Plan ${plan} activo`);
                return {
                    valid: true,
                    plan: plan,
                    status: status
                };
            }
            
            // Plan inactivo/suspendido
            return {
                valid: false,
                reason: 'subscription_inactive',
                plan: plan,
                status: status
            };
            
        } catch (error) {
            console.error('Error verificando membresía:', error);
            return { valid: true, error: true };
        }
    },
    
    /**
     * Actualiza los datos de membresía en localStorage
     * @param {Object} data Datos de membresía
     */
    updateLocalStorage(data) {
        if (data.plan) localStorage.setItem('membershipPlan', data.plan);
        if (data.status) localStorage.setItem('membershipStatus', data.status);
        if (data.daysLeft !== undefined) localStorage.setItem('membershipDaysLeft', data.daysLeft.toString());
    },
    
    /**
     * Obtiene datos de membresía del localStorage
     * @returns {Object} Datos de membresía guardados
     */
    getFromLocalStorage() {
        return {
            plan: localStorage.getItem('membershipPlan') || 'trial',
            status: localStorage.getItem('membershipStatus') || 'unknown',
            daysLeft: parseInt(localStorage.getItem('membershipDaysLeft') || '0')
        };
    },
    
    /**
     * Crea e inyecta el modal de trial expirado si no existe
     */
    injectExpiredModal() {
        if (document.getElementById('membershipModal')) return;
        
        const modalHTML = `
            <div class="membership-modal" id="membershipModal">
                <div class="membership-modal-content">
                    <div class="membership-modal-icon expired">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                    <div class="membership-modal-title">Tu período de prueba ha terminado</div>
                    <div class="membership-modal-description">
                        Han pasado 30 días desde que comenzaste tu prueba gratuita. 
                        Para seguir usando KDS App y tu bot de WhatsApp, elige un plan que se adapte a tu negocio.
                    </div>
                    <div class="membership-plans-summary">
                        <div class="plan-option">
                            <span class="plan-name">Emprendedor</span>
                            <span class="plan-price">$90.000/mes</span>
                        </div>
                        <div class="plan-option">
                            <span class="plan-name">Profesional</span>
                            <span class="plan-price">$120.000/mes</span>
                        </div>
                        <div class="plan-option featured">
                            <span class="plan-name">Empresarial</span>
                            <span class="plan-price">$150.000/mes</span>
                        </div>
                    </div>
                    <div class="membership-modal-buttons">
                        <a href="/index.html#pricing" class="membership-btn primary">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Ver Planes y Precios
                        </a>
                        <button class="membership-btn secondary" onclick="MembershipCheck.contactSupport()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            Contactar Soporte
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Inyectar modal al final del body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Agregar estilos si no existen
        this.injectStyles();
    },
    
    /**
     * Inyecta estilos CSS para el modal de membresía
     */
    injectStyles() {
        if (document.getElementById('membershipStyles')) return;
        
        const styles = `
            <style id="membershipStyles">
                .membership-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(15, 23, 42, 0.85);
                    backdrop-filter: blur(8px);
                    z-index: 2000;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                }
                
                .membership-modal.active {
                    display: flex;
                    animation: membershipModalFadeIn 0.4s ease;
                }
                
                @keyframes membershipModalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .membership-modal-content {
                    background: white;
                    border-radius: 1rem;
                    padding: 2.5rem;
                    max-width: 480px;
                    width: 100%;
                    text-align: center;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    animation: membershipModalSlideUp 0.4s ease;
                }
                
                @keyframes membershipModalSlideUp {
                    from { 
                        opacity: 0; 
                        transform: translateY(30px) scale(0.95);
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0) scale(1);
                    }
                }
                
                .membership-modal-icon {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                }
                
                .membership-modal-icon.expired {
                    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
                    color: #dc2626;
                    animation: membershipIconPulse 2s ease-in-out infinite;
                }
                
                @keyframes membershipIconPulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
                    50% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(220, 38, 38, 0); }
                }
                
                .membership-modal-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 0.75rem;
                }
                
                .membership-modal-description {
                    font-size: 1rem;
                    color: #475569;
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                }
                
                .membership-plans-summary {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    background: #f9fafb;
                    border-radius: 0.75rem;
                }
                
                .plan-option {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                
                .plan-option.featured {
                    border-color: #1a5f7a;
                    background: #d4e9f0;
                }
                
                .plan-name {
                    font-weight: 600;
                    color: #0f172a;
                }
                
                .plan-option.featured .plan-name {
                    color: #1a5f7a;
                }
                
                .plan-price {
                    font-weight: 700;
                    color: #1a5f7a;
                }
                
                .membership-modal-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .membership-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 1rem 1.5rem;
                    border-radius: 0.75rem;
                    font-size: 1rem;
                    font-weight: 600;
                    text-decoration: none;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: none;
                }
                
                .membership-btn.primary {
                    background: linear-gradient(135deg, #1a5f7a 0%, #0f3d4f 100%);
                    color: white;
                }
                
                .membership-btn.primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(26, 95, 122, 0.4);
                }
                
                .membership-btn.secondary {
                    background: transparent;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                }
                
                .membership-btn.secondary:hover {
                    background: #f9fafb;
                    border-color: #d1d5db;
                }
                
                @media (max-width: 480px) {
                    .membership-modal-content {
                        padding: 1.5rem;
                    }
                    
                    .membership-modal-icon {
                        width: 80px;
                        height: 80px;
                    }
                    
                    .membership-modal-icon svg {
                        width: 48px;
                        height: 48px;
                    }
                    
                    .membership-modal-title {
                        font-size: 1.25rem;
                    }
                    
                    .plan-option {
                        padding: 0.5rem 0.75rem;
                        font-size: 0.9rem;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    },
    
    /**
     * Muestra el modal de trial expirado
     */
    showExpiredModal() {
        this.injectExpiredModal();
        const modal = document.getElementById('membershipModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },
    
    /**
     * Oculta el modal de trial expirado
     */
    hideExpiredModal() {
        const modal = document.getElementById('membershipModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Abre WhatsApp para contactar soporte
     */
    contactSupport() {
        window.open('https://wa.me/573001234567?text=Hola,%20mi%20trial%20de%20KDS%20App%20expiró%20y%20quiero%20información%20sobre%20los%20planes', '_blank');
    },
    
    /**
     * Inicializa la verificación de membresía
     * @param {Object} options Opciones de configuración
     * @param {boolean} options.blockOnExpired Si true, bloquea la página si el trial expiró
     * @param {boolean} options.showBadge Si true, muestra el badge de estado
     */
    async init(options = {}) {
        const defaults = {
            blockOnExpired: true,
            showBadge: false,
            redirectOnExpired: false,
            redirectUrl: '/select.html'
        };
        
        const config = { ...defaults, ...options };
        
        const membershipData = await this.checkStatus();
        this.updateLocalStorage(membershipData);
        
        if (!membershipData.valid && membershipData.expired) {
            if (config.blockOnExpired) {
                this.showExpiredModal();
            } else if (config.redirectOnExpired) {
                window.location.href = config.redirectUrl;
            }
        }
        
        return membershipData;
    }
};

// Exportar para uso como módulo si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MembershipCheck;
}
