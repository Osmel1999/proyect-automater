// Dashboard functionality
// Firebase is initialized in config.js before this script loads

// API URL del backend
const API_URL = 'https://api.kdsapp.site';

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
    const userEmail = localStorage.getItem('userEmail');
    
    console.log('🔑 Authentication check:', {
        userId: currentUserId,
        tenantId: currentTenantId,
        email: userEmail
    });
    
    // Verificar si es admin y mostrar botón
    checkIfAdmin(userEmail);
    
    // Verify user is authenticated
    if (!currentUserId || !currentTenantId) {
      alert('Debes iniciar sesión primero');
      window.location.href = '/auth.html';
      return;
    }

    /**
     * Verifica si el usuario es admin y muestra el botón
     */
    async function checkIfAdmin(email) {
      if (!email) return;
      
      try {
        const response = await fetch(`https://api.kdsapp.site/api/admin/check/${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.isAdmin) {
          const adminBtn = document.getElementById('btn-admin');
          if (adminBtn) {
            adminBtn.style.display = 'flex';
            console.log('🛡️ Admin access enabled');
          }
        }
      } catch (error) {
        console.log('Admin check skipped:', error.message);
      }
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
          // Cargar solo las 4 propiedades conocidas
          const steps = tenantData.onboarding.steps || {};
          onboardingState = {
            whatsapp_connected: steps.whatsapp_connected || false,
            menu_configured: steps.menu_configured || false,
            messages_customized: steps.messages_customized || false,
            bot_tested: steps.bot_tested || false
          };
          
          // Recalcular el progreso basado en las 4 propiedades
          const knownSteps = ['whatsapp_connected', 'menu_configured', 'messages_customized', 'bot_tested'];
          const completed = knownSteps.filter(step => onboardingState[step] === true).length;
          onboardingPercentage = Math.round((completed / 4) * 100);
          console.log(`📊 Progreso de onboarding calculado: ${onboardingPercentage}% (${completed}/4 pasos)`);
          
          // Actualizar el progreso en Firebase si es diferente
          if (tenantData.onboarding.progress !== onboardingPercentage) {
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
          // Refrescar stats cada minuto
          setInterval(() => {
            console.log('🔄 [Dashboard] Refrescando stats automáticamente...');
            loadDashboardStats();
          }, 60000); // Cada 60 segundos
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
      console.log('📊 [Dashboard] Mostrando pantalla de completado...');
      document.getElementById('completion-container').style.display = 'block';
      
      // Cargar stats inmediatamente
      loadDashboardStats();
      loadMenuPreview();
      
      // También refrescar después de un segundo para asegurar que el DOM esté listo
      setTimeout(() => {
        console.log('🔄 [Dashboard] Segundo intento de carga de stats...');
        loadDashboardStats();
      }, 1000);
    }

    // Load dashboard stats
    async function loadDashboardStats() {
      try {
        console.log('🔍 [Dashboard] Cargando stats para tenant:', tenantId);
        
        // Obtener pedidos de hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        
        console.log('📅 [Dashboard] Timestamp de hoy:', todayTimestamp, 'Fecha:', today);

        const ordersSnapshot = await firebase.database()
          .ref(`tenants/${tenantId}/pedidos`)
          .orderByChild('timestamp')
          .startAt(todayTimestamp)
          .once('value');

        const orders = ordersSnapshot.val() || {};
        const ordersList = Object.values(orders);
        
        console.log('📦 [Dashboard] Pedidos obtenidos:', ordersList.length);
        console.log('📦 [Dashboard] Pedidos raw:', orders);
        
        // Contar pedidos y calcular ventas
        const ordersCount = ordersList.length;
        const salesTotal = ordersList.reduce((sum, order) => {
          console.log('💰 Order total:', order.total, 'Order:', order.id);
          return sum + (order.total || 0);
        }, 0);
        
        console.log('📊 [Dashboard] Total pedidos:', ordersCount);
        console.log('📊 [Dashboard] Total ventas:', salesTotal);

        // Actualizar UI
        const ordersElement = document.getElementById('orders-today');
        const salesElement = document.getElementById('sales-today');
        
        if (ordersElement) {
          ordersElement.textContent = ordersCount;
          console.log('✅ [Dashboard] orders-today actualizado:', ordersCount);
        } else {
          console.error('❌ [Dashboard] Elemento orders-today no encontrado');
        }
        
        if (salesElement) {
          salesElement.textContent = '$' + salesTotal.toLocaleString('es-CO');
          console.log('✅ [Dashboard] sales-today actualizado:', salesTotal);
        } else {
          console.error('❌ [Dashboard] Elemento sales-today no encontrado');
        }

        // Estado de WhatsApp
        const whatsappStatus = await checkWhatsAppConnection();
        const whatsappElement = document.getElementById('whatsapp-status-main');
        
        if (whatsappElement) {
          whatsappElement.textContent = whatsappStatus ? 'Conectado' : 'Desconectado';
          console.log('✅ [Dashboard] whatsapp-status actualizado:', whatsappStatus);
        } else {
          console.error('❌ [Dashboard] Elemento whatsapp-status-main no encontrado');
        }
        
      } catch (error) {
        console.error('❌ [Dashboard] Error loading dashboard stats:', error);
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
      // Solo contar las 4 propiedades conocidas del onboarding
      const knownSteps = ['whatsapp_connected', 'menu_configured', 'messages_customized', 'bot_tested'];
      const completed = knownSteps.filter(step => onboardingState[step] === true).length;
      const total = knownSteps.length; // Siempre 4
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
      // Step 1: WhatsApp
      const step1 = document.getElementById('step-1');
      if (onboardingState.whatsapp_connected) {
        step1.classList.add('completed');
        step1.querySelector('.step-icon').innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
        step1.querySelector('.step-description').textContent = 'Tu número de WhatsApp Business está conectado y listo';
        step1.querySelector('.step-action').innerHTML = '<span class="step-status">Completado</span>';
      } else {
        step1.classList.remove('completed');
        step1.querySelector('.step-icon').innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>';
        step1.querySelector('.step-action').innerHTML = '<button class="btn-step" onclick="connectWhatsAppStep()">Conectar →</button>';
      }

      // Step 2: Menu
      const step2 = document.getElementById('step-2');
      if (onboardingState.menu_configured) {
        step2.classList.add('completed');
        step2.querySelector('.step-icon').innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
        step2.querySelector('.step-action').innerHTML = '<span class="step-status">Completado</span>';
      }

      // Step 3: Messages
      const step3 = document.getElementById('step-3');
      if (onboardingState.messages_customized) {
        step3.classList.add('completed');
        step3.querySelector('.step-icon').innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
        step3.querySelector('.step-action').innerHTML = '<span class="step-status">Completado</span>';
      }

      // Step 4: Activate Bot
      const step4 = document.getElementById('step-4');
      const activateBotBtn = document.getElementById('activate-bot-btn');
      
      // Solo habilitar si los 3 pasos anteriores están completos
      const canActivateBot = onboardingState.whatsapp_connected && 
                             onboardingState.menu_configured && 
                             onboardingState.messages_customized;
      
      if (activateBotBtn) {
        activateBotBtn.disabled = !canActivateBot;
        if (!canActivateBot) {
          activateBotBtn.title = 'Completa los pasos anteriores primero';
        } else {
          activateBotBtn.title = '';
        }
      }
      
      if (onboardingState.bot_tested) {
        step4.classList.add('completed');
        step4.querySelector('.step-icon').innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
        step4.querySelector('.step-action').innerHTML = '<span class="step-status">Completado</span>';
      }
    }

    // Save onboarding state
    async function saveOnboardingState() {
      try {
        // Calcular porcentaje usando solo las 4 propiedades conocidas
        const knownSteps = ['whatsapp_connected', 'menu_configured', 'messages_customized', 'bot_tested'];
        const completed = knownSteps.filter(step => onboardingState[step] === true).length;
        const total = knownSteps.length;
        const percentage = Math.round((completed / total) * 100);
        
        // Guardar solo las 4 propiedades conocidas para evitar propiedades extra
        const cleanOnboardingState = {
          whatsapp_connected: onboardingState.whatsapp_connected || false,
          menu_configured: onboardingState.menu_configured || false,
          messages_customized: onboardingState.messages_customized || false,
          bot_tested: onboardingState.bot_tested || false
        };
        
        await firebase.database().ref(`tenants/${tenantId}/onboarding`).set({
          completed: percentage === 100,
          steps: cleanOnboardingState,
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
        alert('Menu guardado exitosamente');
      } catch (error) {
        console.error('Error saving menu:', error);
        alert('Error al guardar el menu');
      }
    }

    // ====================================
    // EXTRACCION DE MENU CON IA (Gemini Vision)
    // ====================================
    
    /**
     * Comprime y redimensiona una imagen para enviarla a la IA
     * @param {File} file - Archivo de imagen original
     * @param {number} maxWidth - Ancho maximo (default 1500px)
     * @param {number} quality - Calidad de compresion 0-1 (default 0.8)
     * @returns {Promise<{base64: string, mimeType: string, originalSize: number, compressedSize: number}>}
     */
    async function compressImage(file, maxWidth = 1500, quality = 0.8) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target.result;
          
          img.onload = () => {
            // Calcular nuevas dimensiones manteniendo proporcion
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            
            // Crear canvas para redimensionar
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir a WebP (o JPEG si WebP no es soportado)
            let mimeType = 'image/webp';
            let base64 = canvas.toDataURL(mimeType, quality);
            
            // Fallback a JPEG si WebP no funciona
            if (base64.length < 50) {
              mimeType = 'image/jpeg';
              base64 = canvas.toDataURL(mimeType, quality);
            }
            
            const compressedSize = Math.round((base64.length * 3) / 4); // Tamano aproximado en bytes
            
            resolve({
              base64,
              mimeType,
              originalSize: file.size,
              compressedSize,
              width,
              height
            });
          };
          
          img.onerror = () => reject(new Error('Error al cargar la imagen'));
        };
        
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
      });
    }

    async function handleMenuImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const statusEl = document.getElementById('menu-upload-status');
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        statusEl.innerHTML = '<span style="color: #ff6b6b;">Por favor selecciona una imagen valida (JPG, PNG, WebP)</span>';
        return;
      }

      // Validar tamano original (max 20MB antes de comprimir)
      if (file.size > 20 * 1024 * 1024) {
        statusEl.innerHTML = '<span style="color: #ff6b6b;">La imagen es muy grande. Maximo 20MB</span>';
        return;
      }

      const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
      statusEl.innerHTML = `<span>Optimizando imagen (${originalSizeMB}MB)...</span>`;

      try {
        // Comprimir imagen
        const compressed = await compressImage(file, 1500, 0.8);
        const compressedSizeKB = Math.round(compressed.compressedSize / 1024);
        
        console.log(`Imagen comprimida: ${originalSizeMB}MB -> ${compressedSizeKB}KB (${compressed.width}x${compressed.height})`);
        
        statusEl.innerHTML = `<span>Analizando menu con IA (${compressedSizeKB}KB)...</span>`;
        
        // Enviar al backend para procesar con Gemini
        const response = await fetch('https://api.kdsapp.site/api/menu/extract-from-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: compressed.base64,
            mimeType: compressed.mimeType,
            tenantId: tenantId
          })
        });

        // Manejar errores de red/servidor
        if (!response.ok) {
          if (response.status === 413) {
            throw new Error('La imagen sigue siendo muy grande. Intenta con una foto mas pequena.');
          } else if (response.status === 500) {
            throw new Error('Error del servidor. Intenta de nuevo en unos segundos.');
          } else if (response.status === 0 || !response.status) {
            throw new Error('Error de conexion. Verifica tu internet e intenta de nuevo.');
          }
          throw new Error(`Error del servidor (${response.status})`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Error al procesar la imagen');
        }

        if (result.items.length === 0) {
          statusEl.innerHTML = '<span style="color: #ff6b6b;">No se encontraron productos. Asegurate de que la foto muestre claramente el menu con nombres y precios.</span>';
          return;
        }

        // Mostrar preview de items extraidos
        statusEl.innerHTML = `<span style="color: #4ade80;">Se encontraron ${result.items.length} productos</span>`;
        
        // Agregar items al menu actual
        const confirmAdd = confirm(`Se encontraron ${result.items.length} productos.\n\nDeseas agregarlos al menu?\n\n(Podras editarlos despues)`);
        
        if (confirmAdd) {
          // Agregar al array de menuItems
          result.items.forEach(item => {
            menuItems.push({
              id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: item.name,
              price: item.price,
              description: item.description || '',
              category: item.category || 'General',
              available: true
            });
          });
          
          renderMenuItems();
          statusEl.innerHTML = `<span style="color: #4ade80;">Se agregaron ${result.items.length} productos. Revisa y guarda el menu.</span>`;
        }

      } catch (error) {
        console.error('Error procesando imagen:', error);
        
        // Mensajes de error amigables
        let errorMsg = error.message;
        if (error.message === 'Failed to fetch' || error.message === 'Load failed') {
          errorMsg = 'Error de conexion. Verifica tu internet e intenta de nuevo.';
        }
        
        statusEl.innerHTML = `<span style="color: #ff6b6b;">${errorMsg}</span>`;
      }

      // Limpiar input para permitir subir la misma imagen de nuevo
      event.target.value = '';
    }

    // Exponer funcion globalmente
    window.handleMenuImageUpload = handleMenuImageUpload;

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

    // Connect WhatsApp Step (desde el wizard)
    function connectWhatsAppStep() {
      window.location.href = `/whatsapp-connect.html?tenant=${tenantId}`;
    }
    
    // Hacer accesible globalmente
    window.connectWhatsAppStep = connectWhatsAppStep;

    // Activate Bot Step (desde el wizard)
    async function activateBotStep() {
      // Verificar que los pasos anteriores estén completos
      if (!onboardingState.whatsapp_connected || 
          !onboardingState.menu_configured || 
          !onboardingState.messages_customized) {
        alert('⚠️ Debes completar todos los pasos anteriores antes de activar el bot.');
        return;
      }
      
      // Activar el bot
      try {
        botActive = true;
        await firebase.database().ref(`tenants/${tenantId}/bot/active`).set(true);
        
        // Marcar paso como completado
        onboardingState.bot_tested = true;
        await saveOnboardingState();
        
        // Actualizar UI del toggle
        updateBotControlUI();
        
        alert('🚀 ¡Bot activado exitosamente! Ahora puedes recibir pedidos automáticamente.');
      } catch (error) {
        console.error('Error activando bot:', error);
        alert('❌ Error al activar el bot. Por favor intenta de nuevo.');
      }
    }
    
    // Hacer accesible globalmente
    window.activateBotStep = activateBotStep;

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
    // COSTO DE ENVÍO / DOMICILIO
    // ====================================
    function openDeliveryCostConfig() {
      document.getElementById('delivery-cost-modal').classList.add('active');
      loadDeliveryCost();
    }

    function closeDeliveryCostModal() {
      document.getElementById('delivery-cost-modal').classList.remove('active');
    }

    async function loadDeliveryCost() {
      try {
        const snapshot = await firebase.database().ref(`tenants/${tenantId}/config/deliveryCost`).once('value');
        const deliveryCost = snapshot.val();

        if (deliveryCost) {
          document.getElementById('delivery-cost-value').value = deliveryCost.cost || 0;
          document.getElementById('free-delivery-min').value = deliveryCost.freeDeliveryMin || '';
        } else {
          // Valores por defecto
          document.getElementById('delivery-cost-value').value = 5000;
          document.getElementById('free-delivery-min').value = '';
        }

        updateDeliveryCostPreview();
      } catch (error) {
        console.error('Error loading delivery cost:', error);
      }
    }

    function updateDeliveryCostPreview() {
      const cost = parseInt(document.getElementById('delivery-cost-value').value) || 0;
      const freeMin = parseInt(document.getElementById('free-delivery-min').value) || 0;
      
      const formattedCost = cost.toLocaleString('es-CO');
      let preview = '';
      
      if (cost === 0) {
        preview = '🚚 ¡Envío GRATIS!';
      } else {
        preview = `🚚 Costo de envío: $${formattedCost}`;
        if (freeMin > 0) {
          preview += ` (Gratis en pedidos mayores a $${freeMin.toLocaleString('es-CO')})`;
        }
      }
      
      document.getElementById('delivery-cost-preview').textContent = preview;
    }

    async function saveDeliveryCost() {
      const cost = parseInt(document.getElementById('delivery-cost-value').value) || 0;
      const freeMin = parseInt(document.getElementById('free-delivery-min').value) || 0;

      console.log(`💾 [saveDeliveryCost] Intentando guardar: cost=${cost}, freeMin=${freeMin}, tenantId=${tenantId}`);

      // Validaciones
      if (cost < 0) {
        return alert('El costo de envío no puede ser negativo');
      }

      if (freeMin < 0) {
        return alert('El monto mínimo para envío gratis no puede ser negativo');
      }

      try {
        const path = `tenants/${tenantId}/config/deliveryCost`;
        console.log(`📡 [saveDeliveryCost] Guardando en Firebase path: ${path}`);
        
        // Guardar en Firebase
        await firebase.database().ref(path).set({
          cost: cost,
          freeDeliveryMin: freeMin || null,
          updatedAt: Date.now()
        });

        console.log(`✅ [saveDeliveryCost] Guardado exitosamente`);
        
        const formattedCost = cost.toLocaleString('es-CO');
        alert(`✅ Costo de envío actualizado: $${formattedCost}`);
        closeDeliveryCostModal();
      } catch (error) {
        console.error('❌ [saveDeliveryCost] Error:', error);
        alert('Error al guardar el costo de envío: ' + error.message);
      }
    }

    // Setup delivery cost preview event listeners
    const costInput = document.getElementById('delivery-cost-value');
    const freeMinInput = document.getElementById('free-delivery-min');
    
    if (costInput && freeMinInput) {
        costInput.addEventListener('input', updateDeliveryCostPreview);
        freeMinInput.addEventListener('input', updateDeliveryCostPreview);
    }

    // ====================================
    // MODO PEDIDO RÁPIDO
    // ====================================
    let quickOrderMode = false;

    /**
     * Carga el estado del modo pedido rápido desde Firebase
     */
    async function loadQuickOrderState() {
      try {
        const snapshot = await firebase.database().ref(`tenants/${tenantId}/bot/quickOrderMode`).once('value');
        quickOrderMode = snapshot.val() === true;
        updateQuickOrderUI();
      } catch (error) {
        console.error('Error cargando estado de pedido rápido:', error);
      }
    }

    /**
     * Actualiza la UI del toggle de pedido rápido
     */
    function updateQuickOrderUI() {
      const toggle = document.getElementById('quick-order-toggle');
      const label = document.getElementById('quick-order-toggle-label');
      const statusLabel = document.getElementById('quick-order-status-label');
      const statusText = document.getElementById('quick-order-status-text');
      const infoBox = document.getElementById('quick-order-info');

      if (!toggle || !label) return;

      if (quickOrderMode) {
        toggle.classList.add('active');
        label.textContent = 'ON';
        statusLabel.textContent = 'Activado - Clientes reciben formulario';
        statusText.classList.add('active');
        statusText.classList.remove('inactive');
        if (infoBox) infoBox.style.display = 'block';
      } else {
        toggle.classList.remove('active');
        label.textContent = 'OFF';
        statusLabel.textContent = 'Desactivado - Modo conversacional';
        statusText.classList.remove('active');
        statusText.classList.add('inactive');
        if (infoBox) infoBox.style.display = 'none';
      }
    }

    /**
     * Toggle del modo pedido rápido
     */
    async function toggleQuickOrder() {
      const newState = !quickOrderMode;
      quickOrderMode = newState;

      try {
        await firebase.database().ref(`tenants/${tenantId}/bot/quickOrderMode`).set(quickOrderMode);
        console.log(`✅ Modo pedido rápido: ${quickOrderMode ? 'ACTIVADO' : 'DESACTIVADO'}`);
        updateQuickOrderUI();

        if (quickOrderMode) {
          alert('⚡ Modo Pedido Rápido activado\n\nAhora el bot enviará un formulario para que los clientes hagan su pedido de forma rápida y estructurada.');
        } else {
          alert('💬 Modo Conversacional activado\n\nEl bot usará el flujo tradicional de conversación para tomar los pedidos.');
        }
      } catch (error) {
        console.error('Error actualizando modo pedido rápido:', error);
        alert('Error al actualizar. Por favor intenta de nuevo.');
        quickOrderMode = !quickOrderMode;
        updateQuickOrderUI();
      }
    }

    // Cargar estado al iniciar
    loadQuickOrderState();

    // ====================================
    // MY PLAN MODAL
    // ====================================
    
    /**
     * Abre el modal de Mi Plan y carga la información
     */
    async function openMyPlanModal() {
      const modal = document.getElementById('my-plan-modal');
      const loading = document.getElementById('plan-loading');
      const content = document.getElementById('plan-content');
      const error = document.getElementById('plan-error');
      
      // Mostrar modal y loading usando la clase 'active' para centrado correcto
      modal.classList.add('active');
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      loading.style.display = 'block';
      content.style.display = 'none';
      error.style.display = 'none';
      
      try {
        // Obtener información del plan desde Firebase
        const snapshot = await firebase.database().ref(`tenants/${tenantId}/membership`).once('value');
        const membership = snapshot.val();
        
        if (!membership) {
          throw new Error('No se encontró información de membresía');
        }
        
        // Procesar información del plan
        const plan = membership.plan || 'trial';
        const status = membership.status || 'active';
        const startDate = membership.paidPlanStartDate || membership.createdAt;
        const expiryDate = membership.paidPlanEndDate || membership.trialEndDate;
        
        // Calcular días restantes
        const now = new Date();
        const expiry = new Date(expiryDate);
        const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        
        // Actualizar UI del plan
        updatePlanUI(plan, status, startDate, expiryDate, daysRemaining);
        
        // Mostrar contenido
        loading.style.display = 'none';
        content.style.display = 'block';
        
      } catch (err) {
        console.error('Error cargando información del plan:', err);
        loading.style.display = 'none';
        error.style.display = 'block';
      }
    }
    
    /**
     * Actualiza la UI del modal con la información del plan
     */
    function updatePlanUI(plan, status, startDate, expiryDate, daysRemaining) {
      // Plan badge
      const planBadge = document.getElementById('plan-badge');
      const planNames = {
        'trial': 'Plan Prueba',
        'emprendedor': 'Plan Emprendedor',
        'profesional': 'Plan Profesional',
        'empresarial': 'Plan Empresarial'
      };
      const planColors = {
        'trial': 'linear-gradient(135deg, #718096 0%, #4a5568 100%)',
        'emprendedor': 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
        'profesional': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'empresarial': 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)'
      };
      
      planBadge.textContent = planNames[plan] || 'Plan Desconocido';
      planBadge.style.background = planColors[plan] || planColors['trial'];
      
      // Estado
      const planStatus = document.getElementById('plan-status');
      const statusTexts = {
        'active': '<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #48bb78; margin-right: 8px;"></span>Activo',
        'expired': '<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #e53e3e; margin-right: 8px;"></span>Expirado',
        'cancelled': '<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #718096; margin-right: 8px;"></span>Cancelado'
      };
      planStatus.innerHTML = statusTexts[status] || statusTexts['active'];
      
      // Fechas
      const planStartDate = document.getElementById('plan-start-date');
      const planExpiryDate = document.getElementById('plan-expiry-date');
      const planDaysRemaining = document.getElementById('plan-days-remaining');
      
      planStartDate.textContent = startDate ? new Date(startDate).toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : '-';
      
      planExpiryDate.textContent = expiryDate ? new Date(expiryDate).toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : '-';
      
      // Días restantes con color
      if (daysRemaining <= 0) {
        planDaysRemaining.innerHTML = '<span style="color: #e53e3e;">Expirado</span>';
      } else if (daysRemaining <= 7) {
        planDaysRemaining.innerHTML = `<span style="color: #ed8936;">${daysRemaining} días</span>`;
      } else {
        planDaysRemaining.textContent = `${daysRemaining} días`;
      }
      
      // Características del plan
      const planFeatures = document.getElementById('plan-features');
      const features = {
        'trial': [
          { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', text: 'Bot de WhatsApp básico' },
          { icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', text: 'Menú digital' },
          { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', text: 'Gestión de pedidos' },
          { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', text: '7 días de prueba gratis' }
        ],
        'emprendedor': [
          { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', text: 'Bot de WhatsApp completo' },
          { icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', text: 'Menú digital ilimitado' },
          { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', text: 'Hasta 750 pedidos/mes' },
          { icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'KDS (Kitchen Display System)' },
          { icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', text: 'Configuración de tiempo de entrega' },
          { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'Soporte por correo electrónico' }
        ],
        'profesional': [
          { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', text: 'Todo lo del Plan Emprendedor' },
          { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', text: 'Hasta 1,500 pedidos/mes' },
          { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', text: 'Pagos en línea (Wompi)' },
          { icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', text: 'Configuración de costo de envío' },
          { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', text: 'Reportes y estadísticas avanzadas' },
          { icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', text: 'Personalización avanzada' },
          { icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z', text: 'Soporte prioritario' }
        ],
        'empresarial': [
          { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', text: 'Todo lo del Plan Profesional' },
          { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', text: 'Hasta 3,000 pedidos/mes' },
          { icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', text: 'Múltiples sucursales' },
          { icon: 'M13 10V3L4 14h7v7l9-11h-7z', text: 'Procesamiento prioritario' },
          { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', text: 'Análisis predictivo de ventas' },
          { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', text: 'Consultoría mensual personalizada' },
          { icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z', text: 'Soporte 24/7 dedicado' }
        ]
      };
      
      const featureList = features[plan] || features['trial'];
      planFeatures.innerHTML = featureList.map(f => 
        `<div style="display: flex; align-items: flex-start; gap: 12px; color: #2d3748; font-size: 14px;">
          <svg style="width: 20px; height: 20px; min-width: 20px; margin-top: 2px; color: #48bb78;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${f.icon}"/>
          </svg>
          <span>${f.text}</span>
        </div>`
      ).join('');
      
      // Sugerencia de upgrade (solo para trial y emprendedor)
      const upgradeSuggestion = document.getElementById('upgrade-suggestion');
      if (plan === 'trial' || plan === 'emprendedor') {
        upgradeSuggestion.style.display = 'block';
      } else {
        upgradeSuggestion.style.display = 'none';
      }
    }
    
    /**
     * Cierra el modal de Mi Plan
     */
    function closeMyPlanModal() {
      const modal = document.getElementById('my-plan-modal');
      modal.classList.remove('active');
      modal.style.display = 'none';
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
    window.openDeliveryCostConfig = openDeliveryCostConfig;
    window.closeDeliveryCostModal = closeDeliveryCostModal;
    window.saveDeliveryCost = saveDeliveryCost;
    window.toggleQuickOrder = toggleQuickOrder;
    window.openMyPlanModal = openMyPlanModal;
    window.closeMyPlanModal = closeMyPlanModal;

}); // End of DOMContentLoaded
