/**
 * Payment Success Page
 * Displays payment confirmation and redirects to WhatsApp
 */

class PaymentSuccess {
  constructor() {
    this.urlParams = new URLSearchParams(window.location.search);
    this.orderId = this.urlParams.get('order') || this.urlParams.get('id') || 'N/A';
    this.amount = this.urlParams.get('amount');
    this.phone = this.urlParams.get('phone') || this.urlParams.get('customerPhone');
    this.restaurantId = this.urlParams.get('restaurant') || this.urlParams.get('restaurantId');
    this.redirectInterval = null;
  }

  init() {
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const paymentSuccess = new PaymentSuccess();
  paymentSuccess.init();
});
