// Dashboard functionality
// Firebase is initialized in config.js before this script loads

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard.js: DOM loaded, initializing...');
    
    // Verify Firebase is initialized
    if (!firebase.apps.length) {
        console.error('❌ Firebase not initialized!');
        alert('Error: Firebase no está inicializado. Por favor recarga la página.');
        return;
    }
    
    console.log('✅ Firebase initialized:', firebase.app().name);
    
    // Check authentication and PIN
    const currentUserId = localStorage.getItem('currentUserId');
    const currentTenantId = localStorage.getItem('currentTenantId');
    
    console.log('🔑 Authentication check:', {
        userId: currentUserId,
        tenantId: currentTenantId
    });
    
    // Verify user is authenticated
    if (!currentUserId || !currentTenantId) {
      alert('Debes iniciar sesión primero');
      window.location.href = '/auth.html';
      return;
    }

    // Global variables
    let tenantId = null;
    let tenantData = null;
    let menuItems = [];
    let onboardingState = {
      whatsapp_connected: true,
      menu_configured: false,
      messages_customized: false,
      bot_tested: false
    };
    let botActive = false; // Estado del bot
    let onboardingPercentage = 0; // Porcentaje de onboarding

    // Get tenant ID from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    tenantId = urlParams.get('tenant') || urlParams.get('tenantId') || currentTenantId;

      if (!tenantId) {
        alert('No se proporcionó ID de tenant');
        window.location.href = '/auth.html';
        return;
      }

      // Update tenant ID in URL if not present
      if (!urlParams.has('tenant')) {
        window.history.replaceState({}, '', `?tenant=${tenantId}`);
      }

      loadTenantData();
      checkWhatsAppStatus(); // Verificar estado de WhatsApp al cargar

    /**
     * Verifica el estado de la conexión de WhatsApp
     */
    async function checkWhatsAppStatus() {
      try {
        const response = await fetch(`https://api.kdsapp.site/api/baileys/status?tenantId=${tenantId}`);
        const data = await response.json();
        
        console.log('Estado de WhatsApp:', data);
        
        updateWhatsAppStatusUI(data.connected, data.phoneNumber);
      } catch (error) {
        console.error('Error verificando estado de WhatsApp:', error);
        updateWhatsAppStatusUI(false, null);
      }
    }

    /**
     * Actualiza la UI del estado de WhatsApp
     */
    function updateWhatsAppStatusUI(connected, phoneNumber) {
      const statusElement = document.getElementById('whatsapp-status');
      const statusDot = document.getElementById('status-dot');
      const statusText = document.getElementById('status-text');
      const disconnectBtn = document.getElementById('btn-disconnect-whatsapp');
      const connectBtn = document.getElementById('btn-connect-whatsapp');
      
      statusElement.style.display = 'inline-flex';
      
      if (connected && phoneNumber) {
        // Conectado
        statusElement.classList.remove('disconnected');
        statusElement.classList.add('connected');
        statusDot.classList.remove('disconnected');
        statusDot.classList.add('connected');
        statusText.textContent = `Conectado: ${phoneNumber}`;
        disconnectBtn.style.display = 'inline-flex';
        connectBtn.style.display = 'none';
      } else {
        // Desconectado
        statusElement.classList.remove('connected');
        statusElement.classList.add('disconnected');
        statusDot.classList.remove('connected');
        statusDot.classList.add('disconnected');
        statusText.textContent = 'WhatsApp Desconectado';
        disconnectBtn.style.display = 'none';
        connectBtn.style.display = 'inline-flex';
      }
    }

    /**
     * Redirige a la página de conexión de WhatsApp
     */
    function connectWhatsApp() {
      window.location.href = `/whatsapp-connect.html?tenant=${tenantId}`;
    }

    /**
     * Desconecta WhatsApp y redirige al onboarding para reconectar
     */
    async function disconnectWhatsApp() {
      if (!confirm('¿Estás seguro de que deseas desconectar WhatsApp?\n\nEsto cerrará la sesión actual y necesitarás escanear un nuevo código QR para reconectar.')) {
        return;
      }

      try {
        // Mostrar loading
        const disconnectBtn = document.getElementById('btn-disconnect-whatsapp');
        disconnectBtn.innerHTML = '⏳ Desconectando...';
        disconnectBtn.disabled = true;

        // Desconectar en el backend
        const response = await fetch('https://api.kdsapp.site/api/baileys/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tenantId })
        });

        const data = await response.json();

        if (data.success) {
          alert('✅ WhatsApp desconectado correctamente.\n\nAhora serás redirigido al onboarding para reconectar.');
          
          // Actualizar estado en Firebase
          await firebase.database().ref(`tenants/${tenantId}/onboarding/steps/whatsapp_connected`).set(false);
          
          // Redirigir al onboarding
          window.location.href = `/onboarding?tenant=${tenantId}`;
        } else {
          throw new Error(data.error || 'Error al desconectar');
        }
      } catch (error) {
        console.error('Error desconectando WhatsApp:', error);
        alert('❌ Error al desconectar WhatsApp:\n\n' + error.message);
        
        // Restaurar botón
        const disconnectBtn = document.getElementById('btn-disconnect-whatsapp');
        disconnectBtn.innerHTML = '📱 Desconectar WhatsApp';
        disconnectBtn.disabled = false;
      }
    }

    // Load tenant data
    async function loadTenantData() {
      try {
        const snapshot = await firebase.database().ref(`tenants/${tenantId}`).once('value');
        tenantData = snapshot.val();

        if (!tenantData) {
          throw new Error('Tenant no encontrado');
        }

        // Update UI
        document.getElementById('tenant-name').textContent = tenantData.restaurant?.name || 'Mi Restaurante';

        // Load onboarding state
        if (tenantData.onboarding) {
          onboardingState = tenantData.onboarding.steps || onboardingState;
          
          // PRIORIDAD: Usar el progreso guardado en Firebase si existe
          if (typeof tenantData.onboarding.progress === 'number') {
            onboardingPercentage = tenantData.onboarding.progress;
            console.log(`📊 Progreso de onboarding leído desde Firebase: ${onboardingPercentage}%`);
          } else {
            // Si no existe, calcularlo y guardarlo
            const completed = Object.values(onboardingState).filter(v => v === true).length;
            const total = Object.keys(onboardingState).length;
            onboardingPercentage = Math.round((completed / total) * 100);
            console.log(`📊 Progreso de onboarding calculado (no existía en Firebase): ${onboardingPercentage}%`);
            
            // Guardar el progreso calculado en Firebase
            await firebase.database().ref(`tenants/${tenantId}/onboarding/progress`).set(onboardingPercentage);
          }
        } else {
          // Si no hay datos de onboarding, el progreso es 25% (solo whatsapp_connected)
          const completed = Object.values(onboardingState).filter(v => v === true).length;
          const total = Object.keys(onboardingState).length;
          onboardingPercentage = Math.round((completed / total) * 100);
          console.log(`📊 Progreso de onboarding inicial (sin datos previos): ${onboardingPercentage}%`);
        }

        // Load bot state
        // Si el progreso es < 75%, forzar el bot a OFF sin importar el valor en Firebase
        if (onboardingPercentage < 75) {
          console.log('⚠️ Progreso < 75%, forzando bot a OFF');
          botActive = false;
          // Guardar en Firebase para asegurar consistencia
          await firebase.database().ref(`tenants/${tenantId}/bot/config`).set({
            active: false,
            lastUpdated: new Date().toISOString(),
            reason: 'onboarding_incomplete'
          });
        } else {
          // Si el progreso >= 75%, respetar el valor en Firebase
          if (tenantData.bot && tenantData.bot.config) {
            botActive = tenantData.bot.config.active === true; // Solo true si es explícitamente true
          } else {
            botActive = false; // Por defecto OFF si no existe el config
          }
        }

        console.log(`🤖 Estado inicial del bot: ${botActive ? 'ON' : 'OFF'} (progreso: ${onboardingPercentage}%)`);

        // Check if onboarding is completed
        const isCompleted = Object.values(onboardingState).every(v => v === true);

        document.getElementById('loading-container').style.display = 'none';

        // Mostrar el control del bot siempre
        document.getElementById('bot-control-container').style.display = 'block';
        updateBotControlUI();

        if (isCompleted) {
          showCompletionScreen();
        } else {
          showWizard();
        }

      } catch (error) {
        console.error('Error loading tenant:', error);
        document.getElementById('loading-container').style.display = 'none';
        
        // Mostrar mensaje de error más descriptivo
        const errorMessage = `
          ❌ Error al cargar datos del restaurante
          
          Detalles: ${error.message}
          
          Posibles causas:
          • No has completado el proceso de onboarding
          • Problemas de conexión con Firebase
          • El tenant ID no es válido
          
          ¿Qué deseas hacer?
        `;
        
        if (confirm(errorMessage + '\n\n✅ Ir al diagnóstico\n❌ Volver a autenticar')) {
          window.location.href = '/dashboard-diagnostico.html';
        } else {
          window.location.href = '/auth.html';
        }
      }
    }

    // Show wizard
    function showWizard() {
      document.getElementById('wizard-container').style.display = 'block';
      updateProgress();
      updateStepsUI();
    }

    // Show completion screen
    function showCompletionScreen() {
      document.getElementById('completion-container').style.display = 'block';
      loadDashboardStats();
      loadMenuPreview();
    }

    // Load dashboard stats
    async function loadDashboardStats() {
      try {
        // Obtener pedidos de hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        const ordersSnapshot = await firebase.database()
          .ref(`restaurants/${tenantId}/orders`)
          .orderByChild('createdAt')
          .startAt(todayTimestamp)
          .once('value');

        const orders = ordersSnapshot.val() || {};
        const ordersList = Object.values(orders);
        
        // Contar pedidos y calcular ventas
        const ordersCount = ordersList.length;
        const salesTotal = ordersList.reduce((sum, order) => sum + (order.total || 0), 0);

        // Actualizar UI
        document.getElementById('orders-today').textContent = ordersCount;
        document.getElementById('sales-today').textContent = '$' + salesTotal.toLocaleString('es-CO');

        // Estado de WhatsApp
        const whatsappStatus = await checkWhatsAppConnection();
        document.getElementById('whatsapp-status-main').textContent = whatsappStatus ? 'Conectado' : 'Desconectado';
        
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      }
    }

    // Check WhatsApp connection for stats
    async function checkWhatsAppConnection() {
      try {
        const response = await fetch(`https://api.kdsapp.site/api/baileys/status?tenantId=${tenantId}`);
        const data = await response.json();
        return data.connected;
      } catch (error) {
        return false;
      }
    }

    // Load menu preview
    async function loadMenuPreview() {
      try {
        const snapshot = await firebase.database().ref(`tenants/${tenantId}/menu/items`).once('value');
        const items = snapshot.val() || {};
        const menuList = Object.values(items);

        const container = document.getElementById('menu-list-preview');

        if (menuList.length === 0) {
          container.innerHTML = '<p style="color: #718096; text-align: center; padding: 40px;">No tienes productos en tu menú aún. ¡Agrega tu primer producto!</p>';
          return;
        }

        container.innerHTML = menuList.map(item => `
          <div class="menu-preview-item">
            <div class="menu-preview-info">
              <h4>${item.name}</h4>
              <p>${item.category || 'Sin categoría'}</p>
            </div>
            <div class="menu-preview-price">$${item.price.toLocaleString('es-CO')}</div>
          </div>
        `).join('');

      } catch (error) {
        console.error('Error loading menu preview:', error);
        document.getElementById('menu-list-preview').innerHTML = '<p style="color: #e53e3e;">Error cargando menú</p>';
      }
    }

    // Update progress
    function updateProgress() {
      const completed = Object.values(onboardingState).filter(v => v === true).length;
      const total = Object.keys(onboardingState).length;
      const percentage = Math.round((completed / total) * 100);
      onboardingPercentage = percentage; // Guardar globalmente

      document.getElementById('progress-percentage').textContent = percentage + '%';
      document.getElementById('progress-fill').style.width = percentage + '%';

      // Actualizar el control del bot con el nuevo porcentaje
      updateBotControlUI();

      return percentage === 100;
    }

    // Update steps UI
    function updateStepsUI() {
      // Step 2: Menu
      const step2 = document.getElementById('step-2');
      if (onboardingState.menu_configured) {
        step2.classList.add('completed');
        step2.querySelector('.step-action').innerHTML = '<span class="step-status">Completado</span>';
      }

      // Step 3: Messages
      const step3 = document.getElementById('step-3');
      if (onboardingState.messages_customized) {
        step3.classList.add('completed');
        step3.querySelector('.step-action').innerHTML = '<span class="step-status">Completado</span>';
      }

      // Step 4: Test
      const step4 = document.getElementById('step-4');
      if (onboardingState.bot_tested) {
        step4.classList.add('completed');
        step4.querySelector('.step-action').innerHTML = '<span class="step-status">Completado</span>';
      }
    }

    // Save onboarding state
    async function saveOnboardingState() {
      try {
        // Calcular porcentaje
        const completed = Object.values(onboardingState).filter(v => v === true).length;
        const total = Object.keys(onboardingState).length;
        const percentage = Math.round((completed / total) * 100);
        
        await firebase.database().ref(`tenants/${tenantId}/onboarding`).set({
          completed: Object.values(onboardingState).every(v => v === true),
          steps: onboardingState,
          progress: percentage, // ← GUARDAR EL PORCENTAJE
          lastUpdated: new Date().toISOString()
        });

        const isCompleted = updateProgress();
        updateStepsUI();

        if (isCompleted) {
          // Show completion
          setTimeout(() => {
            document.getElementById('wizard-container').style.display = 'none';
            showCompletionScreen();
          }, 500);
        }
      } catch (error) {
        console.error('Error saving onboarding state:', error);
      }
    }

    // Menu Config
    function openMenuConfig() {
      document.getElementById('menu-modal').classList.add('active');
      loadCurrentMenu();
    }

    function closeMenuModal() {
      document.getElementById('menu-modal').classList.remove('active');
    }

    async function loadCurrentMenu() {
      try {
        const snapshot = await firebase.database().ref(`tenants/${tenantId}/menu/items`).once('value');
        const items = snapshot.val() || {};
        menuItems = Object.values(items);
        renderMenuItems();
      } catch (error) {
        console.error('Error loading menu:', error);
      }
    }

    function addMenuItem() {
      const name = document.getElementById('item-name').value.trim();
      const price = parseInt(document.getElementById('item-price').value);
      const description = document.getElementById('item-description').value.trim();
      const category = document.getElementById('item-category').value;

      if (!name || !price) {
        alert('Por favor completa el nombre y precio del producto');
        return;
      }

      menuItems.push({
        id: `item_${Date.now()}`,
        name,
        price,
        description,
        category,
        available: true
      });

      // Clear inputs
      document.getElementById('item-name').value = '';
      document.getElementById('item-price').value = '';
      document.getElementById('item-description').value = '';

      renderMenuItems();
    }

    function renderMenuItems() {
      const container = document.getElementById('menu-items-list');
      
      if (menuItems.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #718096; padding: 20px;">No hay productos agregados aún</p>';
        return;
      }

      container.innerHTML = menuItems.map((item, index) => `
        <div class="menu-item">
          <div class="menu-item-name">${item.name}</div>
          <div class="menu-item-price">$${item.price.toLocaleString()}</div>
          <button class="btn-remove" onclick="removeMenuItem(${index})">Eliminar</button>
        </div>
      `).join('');
    }

    function removeMenuItem(index) {
      menuItems.splice(index, 1);
      renderMenuItems();
    }

    async function saveMenu() {
      if (menuItems.length === 0) {
        alert('Agrega al menos un producto al menú');
        return;
      }

      try {
        const itemsObj = {};
        menuItems.forEach(item => {
          itemsObj[item.id] = item;
        });

        await firebase.database().ref(`tenants/${tenantId}/menu/items`).set(itemsObj);

        onboardingState.menu_configured = true;
        await saveOnboardingState();

        closeMenuModal();
        alert('✅ Menú guardado exitosamente');
      } catch (error) {
        console.error('Error saving menu:', error);
        alert('Error al guardar el menú');
      }
    }

    // Messages Config
    function openMessagesConfig() {
      document.getElementById('messages-modal').classList.add('active');
      loadCurrentMessages();
    }

    function closeMessagesModal() {
      document.getElementById('messages-modal').classList.remove('active');
    }

    async function loadCurrentMessages() {
      try {
        const snapshot = await firebase.database().ref(`tenants/${tenantId}/messages`).once('value');
        const messages = snapshot.val() || {};

        document.getElementById('msg-welcome').value = messages.welcome || '¡Hola! 👋 Bienvenido a nuestro restaurante.\n\nEscribe "menú" para ver nuestros productos disponibles.';
        document.getElementById('msg-confirmation').value = messages.confirmation || '✅ ¡Pedido confirmado!\n\nTu orden está siendo preparada. Te notificaremos cuando esté lista.';
        document.getElementById('msg-goodbye').value = messages.goodbye || '¡Gracias por tu pedido! 🙏\n\nEsperamos verte pronto.';
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }

    async function saveMessages() {
      try {
        const messages = {
          welcome: document.getElementById('msg-welcome').value.trim(),
          confirmation: document.getElementById('msg-confirmation').value.trim(),
          goodbye: document.getElementById('msg-goodbye').value.trim()
        };

        await firebase.database().ref(`tenants/${tenantId}/messages`).set(messages);

        onboardingState.messages_customized = true;
        await saveOnboardingState();

        closeMessagesModal();
        alert('✅ Mensajes guardados exitosamente');
      } catch (error) {
        console.error('Error saving messages:', error);
        alert('Error al guardar los mensajes');
      }
    }

    // Test Bot
    function openTestBot() {
      document.getElementById('test-modal').classList.add('active');
      document.getElementById('test-phone-number').textContent = tenantData.whatsapp?.phoneNumber || 'No disponible';
    }

    function closeTestModal() {
      document.getElementById('test-modal').classList.remove('active');
    }

    async function markTestCompleted() {
      onboardingState.bot_tested = true;
      await saveOnboardingState();
      closeTestModal();
      alert('✅ ¡Excelente! Has completado todos los pasos');
    }

    // Skip onboarding
    async function skipOnboarding() {
      if (confirm('¿Estás seguro? Puedes completar estos pasos después desde el dashboard.')) {
        // Mark as completed to hide wizard
        onboardingState = {
          whatsapp_connected: true,
          menu_configured: true,
          messages_customized: true,
          bot_tested: true
        };
        await saveOnboardingState();
      }
    }

    // View WhatsApp info
    function viewWhatsAppInfo() {
      const phone = tenantData.whatsapp?.phoneNumber || 'No disponible';
      alert(`📱 Tu número de WhatsApp Business:\n\n${phone}\n\nComparte este número con tus clientes para que puedan hacer pedidos.`);
    }

    // ====================================
    // BOT CONTROL FUNCTIONS
    // ====================================

    /**
     * Actualiza la UI del control del bot
     */
    function updateBotControlUI() {
      const toggle = document.getElementById('bot-toggle');
      const label = document.getElementById('bot-toggle-label');
      const statusText = document.getElementById('bot-status-text');
      const statusLabel = document.getElementById('bot-status-label');
      const card = document.getElementById('bot-control-card');
      const warning = document.getElementById('bot-warning');
      // Nota: Ya no usamos bot-control-icon porque ahora es SVG fijo

      const canActivate = onboardingPercentage >= 75;

      console.log(`🎨 Actualizando UI del bot:
        - Estado del bot: ${botActive ? 'ON' : 'OFF'}
        - Progreso de onboarding: ${onboardingPercentage}%
        - Puede activar (>= 75%): ${canActivate}`);

      // Actualizar toggle
      if (botActive) {
        toggle.classList.add('active');
        toggle.classList.remove('disabled');
        label.textContent = 'ON';
        statusLabel.textContent = 'Bot activo y respondiendo mensajes';
        statusText.classList.add('active');
        statusText.classList.remove('inactive');
        card.classList.add('active');
        card.classList.remove('inactive');
        // Ya no cambiamos el icono (era: icon.textContent = '✅')
      } else {
        toggle.classList.remove('active');
        label.textContent = 'OFF';
        statusLabel.textContent = 'Bot desactivado, no responderá mensajes';
        statusText.classList.remove('active');
        statusText.classList.add('inactive');
        card.classList.remove('active');
        card.classList.add('inactive');
        // Ya no cambiamos el icono (era: icon.textContent = '🤖')
        
        if (!canActivate) {
          toggle.classList.add('disabled');
        } else {
          toggle.classList.remove('disabled');
        }
      }

      // Mostrar/ocultar advertencia
      if (!canActivate && !botActive) {
        warning.classList.add('visible');
      } else {
        warning.classList.remove('visible');
      }
    }

    /**
     * Toggle del estado del bot
     */
    async function toggleBot() {
      const canActivate = onboardingPercentage >= 75;

      console.log(`🎯 Toggle bot llamado:
        - Estado actual del bot: ${botActive ? 'ON' : 'OFF'}
        - Progreso local (onboardingPercentage): ${onboardingPercentage}%
        - Puede activar (>= 75%): ${canActivate}
        - Estado de onboarding: ${JSON.stringify(onboardingState)}`);

      // VALIDACIÓN CRÍTICA: Si intenta activar el bot pero el progreso es < 75%
      if (!botActive && !canActivate) {
        console.warn('⚠️ Intento de activar bot con progreso insuficiente');
        alert('⚠️ Para activar el bot, debes completar al menos el 75% del onboarding.\n\nActualmente has completado: ' + onboardingPercentage + '%\n\n' +
              'Completa la configuración del menú y los mensajes personalizados para continuar.');
        return;
      }

      // VALIDACIÓN ADICIONAL: Verificar progreso en Firebase antes de cambiar
      try {
        const onboardingSnapshot = await firebase.database().ref(`tenants/${tenantId}/onboarding`).once('value');
        const onboarding = onboardingSnapshot.val();
        const progress = onboarding?.progress || 0;
        
        console.log(`🔍 Validación en Firebase:
          - Progreso guardado en Firebase: ${progress}%
          - Steps en Firebase: ${JSON.stringify(onboarding?.steps)}
          - Completed en Firebase: ${onboarding?.completed}`);
        
        // Si intenta activar y el progreso en Firebase es < 75%, bloquear
        if (!botActive && progress < 75) {
          console.error(`🚫 Validación de progreso falló. 
            - Progreso en Firebase: ${progress}%
            - Progreso local: ${onboardingPercentage}%
            - Diferencia detectada: Se bloqueará la activación`);
          alert('⚠️ El progreso de onboarding en el servidor es insuficiente (' + progress + '%).\n\n' +
                'Completa al menos el 75% del onboarding antes de activar el bot.');
          return;
        }
        
        // Si hay discrepancia entre el progreso local y Firebase, sincronizar
        if (Math.abs(progress - onboardingPercentage) > 5) {
          console.warn(`⚠️ Discrepancia detectada entre progreso local (${onboardingPercentage}%) y Firebase (${progress}%). Sincronizando...`);
          onboardingPercentage = progress;
          updateBotControlUI();
        }
        
      } catch (error) {
        console.error('Error validando progreso:', error);
        alert('Error al validar el progreso. Por favor intenta de nuevo.');
        return;
      }

      // Cambiar estado
      const newState = !botActive;
      botActive = newState;

      // Guardar en Firebase
      try {
        await firebase.database().ref(`tenants/${tenantId}/bot/config`).set({
          active: botActive,
          lastUpdated: new Date().toISOString()
        });

        console.log(`✅ Estado del bot actualizado en Firebase: ${botActive ? 'ACTIVO (true)' : 'DESACTIVADO (false)'}`);
        
        // Actualizar UI
        updateBotControlUI();

        // Mostrar mensaje de confirmación
        if (botActive) {
          alert('✅ Bot activado\n\nEl bot ahora responderá automáticamente a los mensajes de tus clientes.');
        } else {
          alert('🔴 Bot desactivado\n\nEl bot no responderá a los mensajes hasta que lo vuelvas a activar.');
        }

      } catch (error) {
        console.error('Error actualizando estado del bot:', error);
        alert('Error al actualizar el estado del bot. Por favor intenta de nuevo.');
        // Revertir el cambio
        botActive = !botActive;
        updateBotControlUI();
      }
    }

    // Payment Config
    function openPaymentConfig() {
      document.getElementById('payment-modal').classList.add('active');
      loadPaymentConfig();
    }

    function closePaymentModal() {
      document.getElementById('payment-modal').classList.remove('active');
    }

    async function loadPaymentConfig() {
      try {
        // Obtener configuración de pagos desde el backend
        const response = await fetch(`https://api.kdsapp.site/api/payments/get-config/${tenantId}?includeCredentials=true`);
        const data = await response.json();

        if (!data.success || !data.config) {
          // Si no hay configuración, mostrar estado deshabilitado
          document.getElementById('payment-toggle').classList.remove('active');
          document.getElementById('payment-credentials-section').style.display = 'none';
          document.getElementById('payment-disabled-message').style.display = 'block';
          
          // Limpiar campos
          document.getElementById('payment-public-key').value = '';
          document.getElementById('payment-private-key').value = '';
          document.getElementById('payment-integrity-secret').value = '';
          document.getElementById('payment-events-secret').value = '';
        } else {
          const paymentConfig = data.config;
          
          // Cargar estado de habilitación
          const isEnabled = paymentConfig.enabled === true;
          document.getElementById('payment-toggle').classList.toggle('active', isEnabled);
          document.getElementById('payment-credentials-section').style.display = isEnabled ? 'block' : 'none';
          document.getElementById('payment-disabled-message').style.display = isEnabled ? 'none' : 'block';

          // Cargar credenciales (solo si están disponibles)
          if (paymentConfig.credentials) {
            document.getElementById('payment-public-key').value = paymentConfig.credentials.publicKey || '';
            document.getElementById('payment-private-key').value = paymentConfig.credentials.privateKey || '';
            document.getElementById('payment-integrity-secret').value = paymentConfig.credentials.integritySecret || '';
            document.getElementById('payment-events-secret').value = paymentConfig.credentials.eventsSecret || '';
          }
        }

        // Cargar URL de webhook (siempre disponible)
        const webhookUrl = `https://api.kdsapp.site/api/payments/webhook/wompi/${tenantId}`;
        document.getElementById('webhook-url').value = webhookUrl;

      } catch (error) {
        console.error('Error loading payment config:', error);
        // En caso de error, mostrar estado deshabilitado
        document.getElementById('payment-toggle').classList.remove('active');
        document.getElementById('payment-credentials-section').style.display = 'none';
        document.getElementById('payment-disabled-message').style.display = 'block';
      }
    }

    function togglePaymentEnabled() {
      const toggle = document.getElementById('payment-toggle');
      const isEnabled = !toggle.classList.contains('active');

      toggle.classList.toggle('active', isEnabled);
      document.getElementById('payment-credentials-section').style.display = isEnabled ? 'block' : 'none';
      document.getElementById('payment-disabled-message').style.display = isEnabled ? 'none' : 'block';
    }

    async function testPaymentCredentials() {
      const publicKey = document.getElementById('payment-public-key').value.trim();
      const privateKey = document.getElementById('payment-private-key').value.trim();
      const integritySecret = document.getElementById('payment-integrity-secret').value.trim();
      const eventsSecret = document.getElementById('payment-events-secret').value.trim();

      // Validar campos
      if (!publicKey || !privateKey || !integritySecret || !eventsSecret) {
        return alert('Por favor completa todas las llaves antes de probar');
      }

      try {
        // Mostrar loading
        const btnTest = document.getElementById('btn-test-credentials');
        btnTest.innerHTML = '⏳ Probando...';
        btnTest.disabled = true;

        // Probar conexión con Wompi usando el endpoint correcto
        const response = await fetch('https://api.kdsapp.site/api/payments/validate-credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            provider: 'wompi',
            credentials: {
              publicKey,
              privateKey,
              integritySecret,
              eventsSecret
            }
          })
        });

        const data = await response.json();

        if (data.success) {
          document.getElementById('test-result-icon').innerHTML = '✅';
          document.getElementById('test-result-message').textContent = data.message || 'Conexión exitosa con Wompi';
        } else {
          throw new Error(data.error || 'Error desconocido');
        }
      } catch (error) {
        console.error('Error probando credenciales:', error);
        document.getElementById('test-result-icon').innerHTML = '❌';
        document.getElementById('test-result-message').textContent = 'Error: ' + error.message;
      } finally {
        document.getElementById('credentials-test-result').style.display = 'flex';
        const btnTest = document.getElementById('btn-test-credentials');
        btnTest.innerHTML = '🧪 Probar Credenciales';
        btnTest.disabled = false;
      }
    }

    function copyWebhookUrl() {
      const urlField = document.getElementById('webhook-url');
      urlField.select();
      document.execCommand('copy');
      alert('✅ URL del webhook copiada al portapapeles');
    }

    // Save payment configuration
    async function savePaymentConfig() {
      const isEnabled = document.getElementById('payment-toggle').classList.contains('active');
      const publicKey = document.getElementById('payment-public-key').value.trim();
      const privateKey = document.getElementById('payment-private-key').value.trim();
      const integritySecret = document.getElementById('payment-integrity-secret').value.trim();
      const eventsSecret = document.getElementById('payment-events-secret').value.trim();

      // Validar campos requeridos
      if (isEnabled && (!publicKey || !privateKey || !integritySecret || !eventsSecret)) {
        return alert('Por favor completa todas las llaves antes de guardar la configuración');
      }

      try {
        // Guardar usando el backend (con cifrado de credenciales)
        const response = await fetch('https://api.kdsapp.site/api/payments/save-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tenantId,
            enabled: isEnabled,
            gateway: 'wompi',
            credentials: isEnabled ? {
              publicKey,
              privateKey,
              integritySecret,
              eventsSecret
            } : null
          })
        });

        const data = await response.json();

        if (data.success) {
          alert('✅ Configuración de pagos guardada exitosamente');
          closePaymentModal();
          
          // Actualizar la UI para reflejar el estado
          await loadPaymentConfig();
        } else {
          throw new Error(data.error || 'Error al guardar configuración');
        }
      } catch (error) {
        console.error('Error saving payment config:', error);
        alert('Error al guardar la configuración de pagos: ' + error.message);
      }
    }

    // Delivery Time Config
    function openDeliveryTimeConfig() {
      document.getElementById('delivery-time-modal').classList.add('active');
      loadDeliveryTime();
    }

    function closeDeliveryTimeModal() {
      document.getElementById('delivery-time-modal').classList.remove('active');
    }

    async function loadDeliveryTime() {
      try {
        const snapshot = await firebase.database().ref(`tenants/${tenantId}/config/deliveryTime`).once('value');
        const deliveryTime = snapshot.val();

        if (deliveryTime) {
          document.getElementById('delivery-time-min').value = deliveryTime.min || 30;
          document.getElementById('delivery-time-max').value = deliveryTime.max || 40;
        } else {
          // Valores por defecto
          document.getElementById('delivery-time-min').value = 30;
          document.getElementById('delivery-time-max').value = 40;
        }

        updateDeliveryTimePreview();
      } catch (error) {
        console.error('Error loading delivery time:', error);
      }
    }

    function updateDeliveryTimePreview() {
      const min = document.getElementById('delivery-time-min').value || 30;
      const max = document.getElementById('delivery-time-max').value || 40;
      document.getElementById('delivery-time-preview').textContent = `🕒 Tiempo estimado: ${min}-${max} minutos`;
    }

    async function saveDeliveryTime() {
      const min = parseInt(document.getElementById('delivery-time-min').value);
      const max = parseInt(document.getElementById('delivery-time-max').value);

      console.log(`💾 [saveDeliveryTime] Intentando guardar: min=${min}, max=${max}, tenantId=${tenantId}`);

      // Validaciones
      if (!min || !max) {
        return alert('Por favor ingresa ambos valores de tiempo');
      }

      if (min < 10 || max < 10) {
        return alert('El tiempo mínimo debe ser de al menos 10 minutos');
      }

      if (min > max) {
        return alert('El tiempo mínimo no puede ser mayor al tiempo máximo');
      }

      if (max > 120) {
        return alert('El tiempo máximo no debe exceder 120 minutos (2 horas)');
      }

      try {
        const path = `tenants/${tenantId}/config/deliveryTime`;
        console.log(`📡 [saveDeliveryTime] Guardando en Firebase path: ${path}`);
        
        // Guardar en Firebase
        await firebase.database().ref(path).set({
          min: min,
          max: max,
          updatedAt: Date.now()
        });

        console.log(`✅ [saveDeliveryTime] Guardado exitosamente`);
        
        // Verificar que se guardó correctamente
        const snapshot = await firebase.database().ref(path).once('value');
        const saved = snapshot.val();
        console.log(`🔍 [saveDeliveryTime] Verificación - Datos guardados:`, saved);

        alert(`✅ Tiempo de entrega actualizado: ${min}-${max} minutos`);
        closeDeliveryTimeModal();
      } catch (error) {
        console.error('❌ [saveDeliveryTime] Error:', error);
        alert('Error al guardar el tiempo de entrega: ' + error.message);
      }
    }

    // Setup delivery time preview event listeners
    const minInput = document.getElementById('delivery-time-min');
    const maxInput = document.getElementById('delivery-time-max');
    
    if (minInput && maxInput) {
        minInput.addEventListener('input', updateDeliveryTimePreview);
        maxInput.addEventListener('input', updateDeliveryTimePreview);
    }

    // ====================================
    // EXPOSE FUNCTIONS TO GLOBAL SCOPE
    // Para que funcionen con onclick inline
    // ====================================
    window.connectWhatsApp = connectWhatsApp;
    window.disconnectWhatsApp = disconnectWhatsApp;
    window.toggleBot = toggleBot;
    window.openMenuConfig = openMenuConfig;
    window.closeMenuModal = closeMenuModal;
    window.addMenuItem = addMenuItem;
    window.removeMenuItem = removeMenuItem;
    window.saveMenu = saveMenu;
    window.openMessagesConfig = openMessagesConfig;
    window.closeMessagesModal = closeMessagesModal;
    window.saveMessages = saveMessages;
    window.openTestBot = openTestBot;
    window.closeTestModal = closeTestModal;
    window.markTestCompleted = markTestCompleted;
    window.skipOnboarding = skipOnboarding;
    window.viewWhatsAppInfo = viewWhatsAppInfo;
    window.openPaymentConfig = openPaymentConfig;
    window.closePaymentModal = closePaymentModal;
    window.togglePaymentEnabled = togglePaymentEnabled;
    window.testPaymentCredentials = testPaymentCredentials;
    window.copyWebhookUrl = copyWebhookUrl;
    window.savePaymentConfig = savePaymentConfig;
    window.openDeliveryTimeConfig = openDeliveryTimeConfig;
    window.closeDeliveryTimeModal = closeDeliveryTimeModal;
    window.saveDeliveryTime = saveDeliveryTime;

}); // End of DOMContentLoaded
