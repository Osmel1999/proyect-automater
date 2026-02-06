/**
 * Payment Success Page
 * Displays payment confirmation for both orders and memberships
 */

class PaymentSuccess {
  constructor() {
    this.urlParams = new URLSearchParams(window.location.search);
    this.transactionId = this.urlParams.get('id');
    this.orderId = this.urlParams.get('order') || this.transactionId || 'N/A';
    this.amount = this.urlParams.get('amount');
    this.phone = this.urlParams.get('phone') || this.urlParams.get('customerPhone');
    this.restaurantId = this.urlParams.get('restaurant') || this.urlParams.get('restaurantId');
    this.env = this.urlParams.get('env'); // 'test' o 'prod' desde Wompi
    this.redirectInterval = null;
    
    // Detectar si es pago de membresía (viene de Wompi)
    this.isMembership = this.transactionId && this.env;
  }

  init() {
    if (this.isMembership) {
      this.handleMembershipSuccess();
    } else {
      this.handleOrderSuccess();
    }
  }
  
  handleMembershipSuccess() {
    this.updateMembershipUI();
    // Solo verificar con el backend si el monto no vino en la URL
    if (!this.amount) {
      this.verifyTransaction();
    }
    this.setupDashboardRedirect();
  }
  
  handleOrderSuccess() {
    this.updateUI();
    this.setupWhatsAppLink();
    this.startAutoRedirect();
    this.notifyPaymentSuccess();
  }

  updateUI() {
    // Update order number
    if (this.orderId !== 'N/A') {
      const orderNumberEl = document.getElementById('order-number');
      if (orderNumberEl) {
        orderNumberEl.textContent = `#${this.orderId}`;
      }
    }

    // Update amount
    if (this.amount) {
      const formattedAmount = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(this.amount);
      
      const amountEl = document.getElementById('amount');
      if (amountEl) {
        amountEl.textContent = formattedAmount;
      }
    }
  }

  setupWhatsAppLink() {
    let whatsappUrl = 'https://wa.me/';
    
    if (this.phone) {
      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhone = this.phone.replace(/\D/g, '');
      whatsappUrl += cleanPhone;
      
      // Personalized message
      const message = `Hola! Mi pago del pedido #${this.orderId} fue exitoso 🎉`;
      whatsappUrl += `?text=${encodeURIComponent(message)}`;
    } else {
      // If no phone, redirect to home page
      whatsappUrl = window.location.origin;
    }

    const whatsappLink = document.getElementById('whatsapp-link');
    if (whatsappLink) {
      whatsappLink.href = whatsappUrl;
      
      // Cancel auto-redirect when user clicks
      whatsappLink.addEventListener('click', () => {
        if (this.redirectInterval) {
          clearInterval(this.redirectInterval);
        }
      });
    }

    return whatsappUrl;
  }

  startAutoRedirect() {
    const whatsappUrl = this.setupWhatsAppLink();
    let countdown = 5;
    const secondaryText = document.querySelector('.secondary-text');
    
    if (!secondaryText) return;
    
    const originalText = secondaryText.textContent;
    
    this.redirectInterval = setInterval(() => {
      countdown--;
      secondaryText.textContent = `Redirigiendo a WhatsApp en ${countdown} segundos...`;
      
      if (countdown <= 0) {
        clearInterval(this.redirectInterval);
        window.location.href = whatsappUrl;
      }
    }, 1000);
  }

  async notifyPaymentSuccess() {
    try {
      const transactionId = this.urlParams.get('id');
      
      if (transactionId && this.restaurantId) {
        const response = await fetch('/api/payment/webhook/wompi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event: 'transaction.updated',
            data: {
              transaction: {
                id: transactionId,
                status: 'APPROVED',
                amount_in_cents: this.amount ? parseInt(this.amount) * 100 : 0
              }
            },
            signature: {
              source: 'redirect_page'
            }
          })
        });

        console.log('Notificación de pago enviada:', response.ok ? 'OK' : 'Error');
      }
    } catch (error) {
      console.error('Error notificando pago:', error);
    }
  }
  
  updateMembershipUI() {
    // Actualizar título y mensaje para membresía
    const title = document.querySelector('.success-title');
    const subtitle = document.querySelector('.success-subtitle');
    
    if (title) {
      title.textContent = '¡Suscripción Activada! 🎉';
    }
    
    if (subtitle) {
      subtitle.innerHTML = 'Tu pago ha sido procesado correctamente.<br>Tu plan estará activo en unos momentos.';
    }
    
    // Actualizar información del pedido (ID de transacción)
    const orderNumber = document.getElementById('order-number');
    if (orderNumber) {
      orderNumber.textContent = this.transactionId;
    }
    
    // Mostrar monto inmediatamente si está disponible en la URL
    const amountEl = document.getElementById('amount');
    if (amountEl) {
      if (this.amount) {
        // El amount viene en centavos desde la URL
        const amountInPesos = parseInt(this.amount) / 100;
        const formattedAmount = new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0
        }).format(amountInPesos);
        
        amountEl.textContent = formattedAmount;
        amountEl.style.color = ''; // Color normal
      } else {
        // Si no viene en la URL, verificar con el backend
        amountEl.textContent = 'Verificando...';
        amountEl.style.color = '#9CA3AF'; // Gris
      }
    }
    
    // Actualizar tiempo estimado
    const timeEstimate = document.querySelector('.order-info-row:last-child .order-info-value');
    if (timeEstimate) {
      timeEstimate.textContent = 'Activación inmediata';
    }
  }
  
  async verifyTransaction() {
    try {
      const API_URL = 'https://api.kdsapp.site';
      const response = await fetch(`${API_URL}/api/membership/transaction/${this.transactionId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Transacción verificada:', data);
        
        // Actualizar UI con información de la transacción
        const amountEl = document.getElementById('amount');
        if (amountEl && data.amount) {
          const formattedAmount = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
          }).format(data.amount);
          
          amountEl.textContent = formattedAmount;
          amountEl.style.color = ''; // Resetear color
          
          // Asegurarse de que la fila esté visible
          const amountRow = amountEl.closest('.order-info-row');
          if (amountRow) {
            amountRow.style.display = 'flex';
          }
        }
      } else {
        // Si falla la verificación, mostrar mensaje genérico
        const amountEl = document.getElementById('amount');
        if (amountEl) {
          amountEl.textContent = 'Ver en dashboard';
          amountEl.style.color = '#6B7280';
        }
      }
    } catch (error) {
      console.error('Error verificando transacción:', error);
      // Si hay error, mostrar mensaje genérico
      const amountEl = document.getElementById('amount');
      if (amountEl) {
        amountEl.textContent = 'Ver en dashboard';
        amountEl.style.color = '#6B7280';
      }
    }
  }
  
  setupDashboardRedirect() {
    const whatsappLink = document.getElementById('whatsapp-link');
    const secondaryText = document.querySelector('.secondary-text');
    
    // URL del dashboard (select.html es la página principal donde ya está logueado)
    const dashboardUrl = `${window.location.origin}/select.html`;
    
    if (whatsappLink) {
      // Cambiar el botón para ir al select (dashboard principal)
      whatsappLink.href = dashboardUrl;
      whatsappLink.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        Volver al Dashboard
      `;
      whatsappLink.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
    
    if (secondaryText) {
      secondaryText.textContent = 'Tu plan ha sido activado. Puedes comenzar a usar todas las funciones.';
    }
    
    // Auto-redirect después de 8 segundos (más tiempo para ver el monto)
    let countdown = 8;
    this.redirectInterval = setInterval(() => {
      countdown--;
      if (secondaryText) {
        secondaryText.textContent = `Redirigiendo al dashboard en ${countdown} segundos...`;
      }
      
      if (countdown <= 0) {
        clearInterval(this.redirectInterval);
        window.location.href = dashboardUrl;
      }
    }, 1000);
    
    // Cancel auto-redirect when user clicks
    if (whatsappLink) {
      whatsappLink.addEventListener('click', () => {
        if (this.redirectInterval) {
          clearInterval(this.redirectInterval);
        }
      });
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const paymentSuccess = new PaymentSuccess();
  paymentSuccess.init();
});
