/**
 * Onboarding Success Page
 * Displays success message after WhatsApp connection and loads tenant information
 */

class OnboardingSuccess {
  constructor() {
    this.urlParams = new URLSearchParams(window.location.search);
    this.tenantId = this.urlParams.get('tenantId') || this.urlParams.get('tenant');
    this.mode = this.urlParams.get('mode');
    this.backendUrl = 'https://api.kdsapp.site';
    
    // DOM elements
    this.elements = {
      successTitle: document.getElementById('success-title'),
      successSubtitle: document.getElementById('success-subtitle'),
      migrationNote: document.getElementById('migration-note'),
      newNumberNote: document.getElementById('new-number-note'),
      tenantId: document.getElementById('tenant-id'),
      tenantName: document.getElementById('tenant-name'),
      tenantEmail: document.getElementById('tenant-email'),
      tenantDate: document.getElementById('tenant-date'),
      btnDashboard: document.getElementById('btn-dashboard')
    };
  }

  init() {
    this.customizeMessage();
    this.loadTenantInfo();
    this.logAnalytics();
    this.updateFirebaseUser();
  }

  customizeMessage() {
    // Customize message based on mode
    if (this.mode === 'migrate') {
      this.elements.successTitle.textContent = '🔄 ¡Migración Exitosa!';
      this.elements.successSubtitle.textContent = 
        'Tu número de WhatsApp Business fue migrado correctamente. Tus clientes pueden seguir escribiendo al mismo número que conocen.';
      this.elements.migrationNote.style.display = 'block';
    } else if (this.mode === 'new') {
      this.elements.successTitle.textContent = '✨ ¡Número Registrado!';
      this.elements.successSubtitle.textContent = 
        'Tu nuevo número de WhatsApp Business está activo. No olvides compartirlo con tus clientes.';
      this.elements.newNumberNote.style.display = 'block';
    }
  }

  async loadTenantInfo() {
    if (!this.tenantId) {
      this.showError();
      return;
    }

    // Show tenant ID immediately
    this.elements.tenantId.textContent = this.tenantId;
    this.elements.tenantId.classList.remove('loading');

    // Update dashboard link
    this.elements.btnDashboard.href = '/select.html';

    try {
      const response = await fetch(`${this.backendUrl}/api/tenant/${this.tenantId}`);
      
      if (!response.ok) {
        throw new Error('No se pudo cargar la información del tenant');
      }

      const data = await response.json();
      console.log('✅ Datos del tenant cargados:', data);

      this.displayTenantData(data);
    } catch (error) {
      console.error('❌ Error cargando información del tenant:', error);
      this.showDefaultValues();
    }
  }

  displayTenantData(data) {
    const tenant = data.tenant || data;

    // Update restaurant name
    if (tenant.restaurant && tenant.restaurant.name) {
      this.elements.tenantName.textContent = tenant.restaurant.name;
      this.elements.tenantName.classList.remove('loading');
    }

    // Update email
    if (tenant.restaurant && tenant.restaurant.ownerEmail) {
      this.elements.tenantEmail.textContent = tenant.restaurant.ownerEmail;
      this.elements.tenantEmail.classList.remove('loading');
    } else {
      this.elements.tenantEmail.textContent = 'No configurado';
      this.elements.tenantEmail.classList.remove('loading');
    }

    // Update registration date
    if (tenant.createdAt) {
      const fecha = new Date(tenant.createdAt);
      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      this.elements.tenantDate.textContent = fechaFormateada;
      this.elements.tenantDate.classList.remove('loading');
    }
  }

  showDefaultValues() {
    this.elements.tenantName.textContent = 'Mi Restaurante';
    this.elements.tenantName.classList.remove('loading');
    
    this.elements.tenantEmail.textContent = 'No configurado';
    this.elements.tenantEmail.classList.remove('loading');
    
    this.elements.tenantDate.textContent = new Date().toLocaleDateString('es-ES');
    this.elements.tenantDate.classList.remove('loading');
  }

  showError() {
    this.elements.tenantId.textContent = 'Error: No se recibió ID';
    this.elements.tenantName.textContent = 'Error en la conexión';
    this.elements.tenantEmail.textContent = 'Error en la conexión';
    this.elements.tenantDate.textContent = '-';
    
    this.elements.tenantId.style.color = '#e53e3e';
    this.elements.tenantName.style.color = '#e53e3e';
    this.elements.tenantEmail.style.color = '#e53e3e';
  }

  logAnalytics() {
    console.log('✅ Onboarding completado para tenant:', this.tenantId);
  }

  async updateFirebaseUser() {
    const currentUserId = localStorage.getItem('currentUserId');
    
    if (!currentUserId || !this.tenantId) {
      return;
    }

    try {
      // Load Firebase scripts dynamically
      await this.loadFirebaseScripts();
      
      // Update user in Firebase
      await firebase.database().ref('users/' + currentUserId).update({
        tenantId: this.tenantId,
        onboardingCompleted: true,
        whatsappConnected: true
      });

      console.log('✅ Usuario actualizado con tenantId:', this.tenantId);
      localStorage.setItem('currentTenantId', this.tenantId);
    } catch (error) {
      console.error('❌ Error actualizando usuario:', error);
    }
  }

  loadFirebaseScripts() {
    return new Promise((resolve, reject) => {
      // Load Firebase App
      const appScript = document.createElement('script');
      appScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
      
      appScript.onload = () => {
        // Load Firebase Database
        const dbScript = document.createElement('script');
        dbScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js';
        
        dbScript.onload = () => {
          // Load Firebase Config
          const configScript = document.createElement('script');
          configScript.src = 'config.js';
          
          configScript.onload = () => resolve();
          configScript.onerror = () => reject(new Error('Failed to load Firebase config'));
          
          document.head.appendChild(configScript);
        };
        
        dbScript.onerror = () => reject(new Error('Failed to load Firebase Database'));
        document.head.appendChild(dbScript);
      };
      
      appScript.onerror = () => reject(new Error('Failed to load Firebase App'));
      document.head.appendChild(appScript);
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const onboardingSuccess = new OnboardingSuccess();
  onboardingSuccess.init();
});
