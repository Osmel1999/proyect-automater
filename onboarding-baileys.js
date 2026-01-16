/**
 * Baileys Onboarding - Frontend
 * Maneja la UI para conectar WhatsApp escaneando QR
 */

class BaileysOnboarding {
  constructor() {
    this.tenantId = this.getTenantId();
    this.qrCodeElement = document.getElementById('qr-code');
    this.qrLoadingElement = document.getElementById('qr-loading');
    this.qrStatusElement = document.getElementById('qr-status');
    this.qrViewElement = document.getElementById('qr-view');
    this.connectedViewElement = document.getElementById('connected-view');
    
    this.isPolling = false;
    this.isConnected = false;
    
    this.init();
  }

  /**
   * Obtiene el tenant ID desde la URL o localStorage
   */
  getTenantId() {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantId = urlParams.get('tenantId') || localStorage.getItem('tenantId');
    
    if (!tenantId) {
      alert('Error: No se encontró el tenant ID. Redirigiendo...');
      window.location.href = '/login.html';
      return null;
    }
    
    return tenantId;
  }

  /**
   * Inicializa la aplicación
   */
  async init() {
    console.log('🚀 Iniciando Baileys Onboarding');
    console.log('Tenant ID:', this.tenantId);

    // Verificar si ya está conectado
    const status = await this.checkStatus();
    
    if (status && status.connected) {
      console.log('✅ Ya está conectado');
      this.showConnectedView(status);
      return;
    }

    // Iniciar conexión
    await this.startConnection();

    // Event listeners
    this.setupEventListeners();
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    document.getElementById('btn-cancel').addEventListener('click', () => {
      this.cancel();
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      this.retry();
    });

    document.getElementById('btn-disconnect').addEventListener('click', () => {
      this.disconnect();
    });

    document.getElementById('btn-dashboard').addEventListener('click', () => {
      window.location.href = '/dashboard.html?tab=whatsapp';
    });
  }

  /**
   * Verifica el estado de conexión actual
   */
  async checkStatus() {
    try {
      const response = await fetch(`/api/baileys/status?tenantId=${this.tenantId}`);
      const status = await response.json();
      return status;
    } catch (error) {
      console.error('Error verificando estado:', error);
      return null;
    }
  }

  /**
   * Inicia la conexión con Baileys
   */
  async startConnection() {
    try {
      console.log('📡 Iniciando conexión...');

      const response = await fetch('/api/baileys/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: this.tenantId })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al conectar');
      }

      console.log('✅ Conexión iniciada');

      // Iniciar polling del QR
      this.startQRPolling();

      // Iniciar polling del estado
      this.startStatusPolling();

    } catch (error) {
      console.error('Error al iniciar conexión:', error);
      this.showError(error.message);
    }
  }

  /**
   * Polling para obtener el QR code
   */
  startQRPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    console.log('🔄 Iniciando polling de QR...');

    const poll = async () => {
      try {
        const response = await fetch(`/api/baileys/qr?tenantId=${this.tenantId}`);
        const data = await response.json();

        if (data.connected) {
          console.log('✅ Conectado!');
          this.isConnected = true;
          this.isPolling = false;
          
          const status = await this.checkStatus();
          this.showConnectedView(status);
          return;
        }

        if (data.qr) {
          console.log('📱 QR recibido');
          this.displayQR(data.qr);
          
          // Continuar polling si no está conectado
          if (!this.isConnected && this.isPolling) {
            setTimeout(poll, 3000); // Poll cada 3 segundos
          }
        } else if (data.expired) {
          console.log('⏰ QR expirado, esperando nuevo QR...');
          this.hideQR();
          
          // Continuar polling
          if (!this.isConnected && this.isPolling) {
            setTimeout(poll, 3000);
          }
        }
      } catch (error) {
        console.error('Error en polling de QR:', error);
        
        if (this.isPolling) {
          setTimeout(poll, 5000); // Retry en 5 segundos
        }
      }
    };

    poll();
  }

  /**
   * Polling para verificar el estado de conexión
   */
  startStatusPolling() {
    const poll = async () => {
      if (this.isConnected) return;

      try {
        const status = await this.checkStatus();
        
        if (status && status.connected) {
          console.log('✅ Estado confirmado: Conectado');
          this.isConnected = true;
          this.isPolling = false;
          this.showConnectedView(status);
          return;
        }

        // Continuar polling
        if (!this.isConnected) {
          setTimeout(poll, 5000); // Poll cada 5 segundos
        }
      } catch (error) {
        console.error('Error en polling de estado:', error);
        
        if (!this.isConnected) {
          setTimeout(poll, 5000);
        }
      }
    };

    setTimeout(poll, 5000); // Primer check en 5 segundos
  }

  /**
   * Muestra el QR code en pantalla
   */
  displayQR(qrData) {
    // Ocultar loading
    this.qrLoadingElement.style.display = 'none';

    // Limpiar QR anterior si existe
    this.qrCodeElement.innerHTML = '';
    this.qrCodeElement.style.display = 'block';

    // Generar nuevo QR
    // eslint-disable-next-line no-undef
    new QRCode(this.qrCodeElement, {
      text: qrData,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

    console.log('✅ QR mostrado en pantalla');
  }

  /**
   * Oculta el QR code
   */
  hideQR() {
    this.qrCodeElement.style.display = 'none';
    this.qrLoadingElement.style.display = 'block';
  }

  /**
   * Muestra la vista de conectado
   */
  async showConnectedView(status) {
    console.log('🎉 Mostrando vista de conectado');

    // Ocultar vista de QR
    this.qrViewElement.style.display = 'none';

    // Actualizar información
    if (status.phoneNumber) {
      document.getElementById('phone-number').textContent = status.phoneNumber;
    }

    // Obtener estadísticas
    try {
      const statsResponse = await fetch(`/api/baileys/stats?tenantId=${this.tenantId}`);
      const stats = await statsResponse.json();

      if (!stats.error) {
        document.getElementById('stat-sent').textContent = stats.daily?.count || 0;
        document.getElementById('stat-limit').textContent = stats.daily?.limit || 1000;
        
        const percentage = stats.daily?.percentage || 0;
        document.getElementById('stat-rate').textContent = `${percentage}%`;
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
    }

    // Mostrar vista de conectado
    this.connectedViewElement.classList.add('show');
  }

  /**
   * Muestra un error
   */
  showError(message) {
    this.qrLoadingElement.style.display = 'none';
    this.qrStatusElement.innerHTML = `
      <span class="status-badge status-error">
        <i class="fas fa-exclamation-triangle"></i>
        ${message}
      </span>
    `;

    // Mostrar botón de reintentar
    document.getElementById('btn-retry').style.display = 'inline-block';
  }

  /**
   * Cancela el onboarding
   */
  cancel() {
    console.log('❌ Onboarding cancelado');
    this.isPolling = false;
    window.location.href = '/dashboard.html';
  }

  /**
   * Reintenta la conexión
   */
  async retry() {
    console.log('🔄 Reintentando conexión...');
    
    // Reset UI
    this.qrLoadingElement.style.display = 'block';
    this.qrCodeElement.style.display = 'none';
    this.qrStatusElement.innerHTML = `
      <span class="status-badge status-waiting">
        <i class="fas fa-clock"></i>
        Esperando conexión...
      </span>
    `;
    document.getElementById('btn-retry').style.display = 'none';

    // Reiniciar
    this.isPolling = false;
    this.isConnected = false;
    await this.startConnection();
  }

  /**
   * Desconecta WhatsApp
   */
  async disconnect() {
    if (!confirm('¿Estás seguro de que deseas desconectar WhatsApp?')) {
      return;
    }

    try {
      console.log('🔌 Desconectando...');

      const response = await fetch('/api/baileys/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: this.tenantId })
      });

      const result = await response.json();

      if (result.success) {
        alert('WhatsApp desconectado exitosamente');
        window.location.reload();
      } else {
        alert('Error al desconectar: ' + result.error);
      }
    } catch (error) {
      console.error('Error al desconectar:', error);
      alert('Error al desconectar: ' + error.message);
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // eslint-disable-next-line no-unused-vars
  const app = new BaileysOnboarding();
});
