    /**
     * Onboarding con Baileys - Versión simplificada
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
        this.statusPollingStarted = false; // Para iniciar status polling solo una vez
        
        this.init();
      }

      getTenantId() {
        const urlParams = new URLSearchParams(window.location.search);
        const tenantId = urlParams.get('tenantId') || localStorage.getItem('tenantId');
        
        if (!tenantId) {
          alert('Error: No se encontró el tenant ID. Redirigiendo al login...');
          window.location.href = '/auth.html';
          return null;
        }
        
        return tenantId;
      }

      async init() {
        console.log('[Onboarding] Iniciando onboarding Baileys');
        console.log('Tenant ID:', this.tenantId);

        // Configurar event listeners PRIMERO (antes de cualquier lógica)
        this.setupEventListeners();

        // Verificar que QRCode esté cargado
        if (typeof QRCode === 'undefined') {
          console.error('❌ QRCode library not loaded. Reloading...');
          setTimeout(() => window.location.reload(), 2000);
          return;
        }
        console.log('✅ QRCode library loaded');

        // Verificar si ya está conectado
        const status = await this.checkStatus();
        
        if (status && status.connected) {
          console.log('✅ Ya está conectado');
          this.showConnectedView(status);
          return;
        }

        // Iniciar conexión
        await this.startConnection();
      }

      setupEventListeners() {
        console.log('🎯 Configurando event listeners de botones...');
        
        const btnDashboard = document.getElementById('btn-dashboard');
        const btnDisconnect = document.getElementById('btn-disconnect');
        const btnLogout = document.getElementById('logoutButton');
        
        if (btnDashboard) {
          btnDashboard.addEventListener('click', () => {
            console.log('🖱️ Click en botón Dashboard');
            window.location.href = `/dashboard.html?tenant=${this.tenantId}&tab=whatsapp`;
          });
          console.log('✅ Event listener para Dashboard configurado');
        } else {
          console.warn('⚠️ Botón Dashboard no encontrado');
        }

        if (btnDisconnect) {
          btnDisconnect.addEventListener('click', () => {
            console.log('🖱️ Click en botón Desconectar');
            this.disconnect();
          });
          console.log('✅ Event listener para Desconectar configurado');
        } else {
          console.warn('⚠️ Botón Desconectar no encontrado');
        }

        if (btnLogout) {
          btnLogout.addEventListener('click', () => {
            console.log('🖱️ Click en botón Cerrar Sesión');
            this.handleLogout();
          });
          console.log('✅ Event listener para Cerrar Sesión configurado');
        } else {
          console.warn('⚠️ Botón Cerrar Sesión no encontrado');
        }
      }

      async checkStatus() {
        try {
          const response = await fetch(`${API_BASE_URL}/api/baileys/status?tenantId=${this.tenantId}`);
          return await response.json();
        } catch (error) {
          console.error('Error verificando estado:', error);
          return null;
        }
      }

      async startConnection() {
        try {
          console.log('📡 Iniciando conexión...');

          // Limpieza agresiva de sesión corrupta
          try {
            console.log('🧹 Limpiando sesión completamente...');
            const cleanResponse = await fetch(`${API_BASE_URL}/api/baileys/clean-session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tenantId: this.tenantId })
            });
            
            const cleanResult = await cleanResponse.json();
            console.log('✅ Sesión limpiada:', cleanResult.message);
            
            // Esperar un momento para que se procese
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (cleanError) {
            console.log('⚠️ Error al limpiar sesión (puede ser normal):', cleanError.message);
          }

          const response = await fetch(`${API_BASE_URL}/api/baileys/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: this.tenantId })
          });

          console.log('📩 Respuesta del servidor (status):', response.status);
          console.log('📩 Respuesta del servidor (ok):', response.ok);

          const result = await response.json();
          console.log('📩 Respuesta del servidor (data):', result);

          if (!result.success) {
            throw new Error(result.error || 'Error al conectar');
          }

          console.log('✅ Conexión iniciada');

          // Iniciar polling de QR (el status polling se iniciará después de mostrar el QR)
          this.startQRPolling();

        } catch (error) {
          console.error('❌ Error al iniciar conexión:', error);
          
          // Mostrar error al usuario de forma amigable
          this.qrLoadingElement.style.display = 'none';
          this.qrStatusElement.classList.remove('status-waiting');
          this.qrStatusElement.classList.add('status-error');
          this.qrStatusElement.innerHTML = `
            <span>❌ Error al conectar</span>
            <div style="margin-top: 10px; font-size: 14px;">${error.message}</div>
            <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
              🔄 Reintentar
            </button>
          `;
        }
      }

      startQRPolling() {
        if (this.isPolling) return;
        
        this.isPolling = true;
        console.log('🔄 Iniciando polling de QR...');

        const poll = async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/api/baileys/qr?tenantId=${this.tenantId}`);
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
              console.log('[Onboarding] QR recibido');
              this.displayQR(data.qr);
              
              // Iniciar status polling después de mostrar el QR (solo una vez)
              if (!this.statusPollingStarted) {
                console.log('[Onboarding] Iniciando status polling para detectar conexión...');
                this.statusPollingStarted = true;
                this.startStatusPolling();
              }
              
              if (!this.isConnected && this.isPolling) {
                setTimeout(poll, 3000);
              }
            } else if (data.expired) {
              console.log('[Onboarding] QR expirado');
              this.hideQR();
              
              if (!this.isConnected && this.isPolling) {
                setTimeout(poll, 3000);
              }
            } else {
              console.log('[Onboarding] QR no disponible aún');
              this.qrLoadingElement.style.display = 'flex';
              this.qrCodeElement.style.display = 'none';
              this.qrStatusElement.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Generando código QR...</span>
              `;
              
              if (!this.isConnected && this.isPolling) {
                setTimeout(poll, 2000);
              }
            }
          } catch (error) {
            console.error('Error en polling:', error);
            
            if (this.isPolling) {
              setTimeout(poll, 5000);
            }
          }
        };

        poll();
      }

      startStatusPolling() {
        console.log('[Onboarding] Iniciando polling de status...');
        const poll = async () => {
          if (this.isConnected) {
            console.log('[Onboarding] Status polling detenido - ya está conectado');
            return;
          }

          try {
            console.log('[Onboarding] Verificando status de conexión...');
            const status = await this.checkStatus();
            console.log('[Onboarding] Status recibido:', status);
            
            if (status && status.connected) {
              console.log('[Onboarding] ¡Conectado confirmado! Mostrando vista conectada...');
              this.isConnected = true;
              this.isPolling = false;
              this.showConnectedView(status);
              return;
            }

            console.log('[Onboarding] Aún no conectado, verificando nuevamente en 3 segundos...');
            if (!this.isConnected) {
              setTimeout(poll, 3000); // Reducido de 5 a 3 segundos para respuesta más rápida
            }
          } catch (error) {
            console.error('[Onboarding] ERROR en status polling:', error);
            if (!this.isConnected) {
              setTimeout(poll, 3000);
            }
          }
        };

        // Ejecutar la primera verificación después de 2 segundos (dar tiempo al escaneo)
        setTimeout(poll, 2000);
      }

      displayQR(qrData) {
        this.qrLoadingElement.style.display = 'none';
        
        this.qrCodeElement.innerHTML = '';
        this.qrCodeElement.style.display = 'block';

        // Verificar que QRCode esté disponible
        if (typeof QRCode === 'undefined') {
          console.error('❌ QRCode no está definido. Recargando en 2 segundos...');
          this.qrStatusElement.innerHTML = `
            <span style="background-color: #ef4444; color: white; padding: 12px 24px; border-radius: 8px;">
              ⚠️ Error cargando QR. Recargando...
            </span>
          `;
          setTimeout(() => location.reload(), 2000);
          return;
        }

        try {
          new QRCode(this.qrCodeElement, {
            text: qrData,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });

          this.qrStatusElement.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <span>Escanea el código QR</span>
          `;
          this.qrStatusElement.className = 'qr-status status-ready';
          this.qrStatusElement.style.display = 'inline-flex';
        } catch (error) {
          console.error('[Onboarding] ERROR generando QR:', error);
          this.qrStatusElement.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <span>Error generando QR</span>
          `;
          this.qrStatusElement.className = 'qr-status status-waiting';
        }
      }

      hideQR() {
        this.qrCodeElement.style.display = 'none';
        this.qrLoadingElement.style.display = 'flex';
        
        this.qrStatusElement.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Esperando nuevo código QR...</span>
        `;
        this.qrStatusElement.className = 'qr-status status-waiting';
      }

      async showConnectedView(status) {
        console.log('🎉 Mostrando vista de conectado');

        this.qrViewElement.style.display = 'none';
        this.connectedViewElement.style.display = 'block';

        if (status.phoneNumber) {
          document.getElementById('phone-number').textContent = status.phoneNumber;
        }

        // Crear/actualizar tenant en Firebase
        try {
          console.log('📦 [FIX v3.0] Actualizando tenant (preservando datos existentes)...');
          const userId = localStorage.getItem('currentUserId');
          const userEmail = localStorage.getItem('userEmail');
          const businessName = localStorage.getItem('businessName') || 'Mi Restaurante';

          // ✅ FIX: Leer datos existentes primero para no sobreescribir
          const tenantRef = firebase.database().ref(`tenants/${this.tenantId}`);
          const snapshot = await tenantRef.once('value');
          const existingData = snapshot.val();
          
          console.log('📖 Datos existentes del tenant:', existingData);

          // Si el tenant NO existe, algo está mal (debió crearse en registro)
          if (!existingData) {
            console.warn('⚠️ Tenant no existe, creándolo ahora (caso legacy)...');
            await tenantRef.set({
              userId: userId,
              email: userEmail,
              restaurant: {
                name: businessName,
                phone: status.phoneNumber || '',
                whatsappConnected: true,
                connectedAt: new Date().toISOString()
              },
              onboarding: {
                steps: {
                  whatsapp_connected: true,
                  menu_configured: false,
                  messages_configured: false,
                  test_completed: false
                },
                progress: 25,
                currentStep: 'menu',
                startedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              },
              menu: { categories: [], items: [] },
              messages: {
                welcome: '¡Hola! Bienvenido a ' + businessName,
                orderConfirm: 'Perfecto, tu pedido ha sido confirmado.',
                goodbye: '¡Gracias por tu pedido!'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            console.log('✅ Tenant creado en onboarding (caso legacy)');
            return;
          }

          // ✅ MEJOR PRÁCTICA: Usar update() para actualizar solo campos específicos
          // Esto garantiza que NO se sobrescriban datos como menu, messages, etc.
          await tenantRef.update({
            'restaurant/phone': status.phoneNumber || '',
            'restaurant/whatsappConnected': true,
            'restaurant/connectedAt': new Date().toISOString(),
            'onboarding/steps/whatsapp_connected': true,
            'onboarding/lastUpdated': new Date().toISOString(),
            'updatedAt': new Date().toISOString()
          });

          console.log('✅ Tenant actualizado con update() - Datos preservados:', {
            menu: existingData.menu ? 'preservado' : 'no existe',
            messages: existingData.messages ? 'preservado' : 'no existe',
            onboarding: existingData.onboarding ? 'actualizado parcialmente' : 'creado'
          });
        } catch (error) {
          console.error('❌ Error guardando tenant:', error);
        }

        try {
          const statsResponse = await fetch(`${API_BASE_URL}/api/baileys/stats?tenantId=${this.tenantId}`);
          const stats = await statsResponse.json();

          if (!stats.error) {
            document.getElementById('stat-sent').textContent = stats.daily?.count || 0;
            document.getElementById('stat-limit').textContent = stats.daily?.limit || 1000;
          }
        } catch (error) {
          console.error('Error obteniendo stats:', error);
        }
      }

      async disconnect() {
        if (!confirm('¿Estás seguro de desconectar WhatsApp?')) {
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/api/baileys/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: this.tenantId })
          });

          const result = await response.json();

          if (result.success) {
            alert('WhatsApp desconectado exitosamente');
            window.location.reload();
          } else {
            throw new Error(result.error || 'Error al desconectar');
          }
        } catch (error) {
          console.error('Error al desconectar:', error);
          alert('Error al desconectar: ' + error.message);
        }
      }

      handleLogout() {
        if (!confirm('¿Estás seguro de cerrar sesión? Podrás volver más tarde para completar el onboarding.')) {
          return;
        }

        try {
          // Limpiar localStorage
          console.log('🚪 Cerrando sesión...');
          localStorage.removeItem('currentUserId');
          localStorage.removeItem('currentTenantId');
          localStorage.removeItem('tenantId');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          localStorage.removeItem('businessName');

          // Redirigir al auth
          window.location.href = '/auth.html';
        } catch (error) {
          console.error('Error al cerrar sesión:', error);
          alert('Error al cerrar sesión: ' + error.message);
        }
      }
    }

    // Inicializar cuando la página carga
    document.addEventListener('DOMContentLoaded', () => {
      // Verificar que QRCode esté disponible antes de inicializar
      if (typeof QRCode === 'undefined') {
        console.error('❌ QRCode library no se cargó correctamente');
        const qrStatusElement = document.getElementById('qr-status');
        if (qrStatusElement) {
          qrStatusElement.innerHTML = `
            <span style="background-color: #ef4444; color: white; padding: 12px 24px; border-radius: 8px;">
              ⚠️ Error cargando librería QR. Recargando...
            </span>
          `;
        }
        
        // Intentar recargar después de un delay
        setTimeout(() => {
          console.log('🔄 Intentando recargar página...');
          location.reload();
        }, 3000);
        return;
      }

      console.log('✅ QRCode library cargada correctamente');
      const app = new BaileysOnboarding();
    });
