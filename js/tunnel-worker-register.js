/**
 * 🔧 Registro del Service Worker de túnel
 * Este script se carga automáticamente cuando se abre el KDS
 */

(function() {
  'use strict';

  // Verificar soporte de Service Worker
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Workers no soportados en este navegador');
    return;
  }

  /**
   * Registrar Service Worker
   */
  async function registerTunnelWorker() {
    try {
      console.log('🔧 Registrando Service Worker de túnel...');

      const registration = await navigator.serviceWorker.register('/sw-tunnel.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registrado:', registration.scope);

      // Verificar si hay actualización
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Nueva versión del Service Worker detectada');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✨ Nueva versión instalada - Recarga para activar');
            // Opcional: Notificar al usuario
            showUpdateNotification();
          }
        });
      });

      // Verificar estado del túnel
      if (navigator.serviceWorker.controller) {
        console.log('🌐 Túnel de conexión activo');
        updateTunnelStatus('active');
      } else {
        console.log('⏳ Esperando activación del túnel...');
        updateTunnelStatus('pending');
      }

    } catch (error) {
      console.error('❌ Error registrando Service Worker:', error);
      updateTunnelStatus('error');
    }
  }

  /**
   * Actualizar indicador visual del túnel
   */
  function updateTunnelStatus(status) {
    // Crear o actualizar indicador de túnel
    let indicator = document.getElementById('tunnel-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'tunnel-indicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      document.body.appendChild(indicator);
    }

    const statusConfig = {
      'active': {
        color: '#10b981',
        bg: '#d1fae5',
        text: '🌐 Túnel Activo',
        title: 'Usando IP del restaurante'
      },
      'pending': {
        color: '#f59e0b',
        bg: '#fef3c7',
        text: '⏳ Activando túnel...',
        title: 'Espere un momento'
      },
      'error': {
        color: '#ef4444',
        bg: '#fee2e2',
        text: '❌ Error en túnel',
        title: 'Recargue la página'
      }
    };

    const config = statusConfig[status];
    indicator.style.backgroundColor = config.bg;
    indicator.style.color = config.color;
    indicator.innerHTML = config.text;
    indicator.title = config.title;
  }

  /**
   * Mostrar notificación de actualización
   */
  function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 300px;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold;">✨ Actualización disponible</div>
      <div style="font-size: 14px;">Nueva versión del sistema de túnel</div>
      <button 
        onclick="window.location.reload()" 
        style="
          background: white;
          color: #3b82f6;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        "
      >
        Recargar ahora
      </button>
    `;

    document.body.appendChild(notification);

    // Auto-cerrar después de 10 segundos
    setTimeout(() => {
      notification.remove();
    }, 10000);
  }

  /**
   * Comunicación con Service Worker
   */
  function setupCommunication() {
    if (!navigator.serviceWorker.controller) {
      setTimeout(setupCommunication, 1000);
      return;
    }

    // Escuchar mensajes del Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('📨 Mensaje del Service Worker:', event.data);
      
      if (event.data.type === 'tunnel-status') {
        const statusMap = {
          'connected': 'active',
          'disconnected': 'pending',
          'error': 'error',
          'failed': 'error'
        };
        updateTunnelStatus(statusMap[event.data.status] || 'pending');
      }
      else if (event.data.type === 'request-tenant-id') {
        // Service Worker solicita el tenantId
        const tenantId = getTenantId();
        if (tenantId) {
          navigator.serviceWorker.controller.postMessage({
            type: 'set-tenant-id',
            tenantId: tenantId
          });
          console.log(`🆔 TenantId enviado al Service Worker: ${tenantId}`);
        } else {
          console.warn('⚠️ No se encontró tenantId');
        }
      }
    });

    // Enviar información del tenant al Service Worker
    const tenantId = getTenantId();
    if (tenantId) {
      navigator.serviceWorker.controller.postMessage({
        type: 'set-tenant-id',
        tenantId: tenantId
      });
      console.log(`🆔 TenantId configurado: ${tenantId}`);
    } else {
      console.warn('⚠️ No se encontró tenantId en localStorage o URL');
    }
  }

  /**
   * Obtener Tenant ID actual
   */
  function getTenantId() {
    // Obtener de localStorage o URL
    const stored = localStorage.getItem('tenantId');
    if (stored) return stored;

    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tenant') || urlParams.get('tenantId');
  }

  /**
   * Inicialización
   */
  window.addEventListener('load', () => {
    registerTunnelWorker();
    setupCommunication();

    console.log('🚀 Sistema de túnel inicializado');
    console.log('💡 WhatsApp verá la IP de este dispositivo');
  });

  // Reconectar si la pestaña estaba inactiva
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'ping'
        });
      }
    }
  });

})();
