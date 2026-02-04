/**
 * 🔧 KDS Tunnel - Sistema de Túnel por Navegador
 * 
 * Módulo compartido que gestiona el Service Worker de túnel
 * y expone una API global para que cada página pueda controlar
 * el estado del túnel de forma independiente.
 * 
 * @namespace KDSTunnel
 * @version 2.0.0
 */

(function() {
  'use strict';

  // Verificar soporte de Service Worker
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Workers no soportados en este navegador');
    return;
  }

  // ========================================
  // ESTADO INTERNO
  // ========================================
  
  let tunnelState = {
    status: 'initializing',  // initializing, active, pending, disconnected, error
    tenantId: null,
    page: window.location.pathname,
    timestamp: Date.now(),
    isServiceWorkerReady: false,
    websocketConnected: false,  // Nueva propiedad para estado real de WebSocket
    lastError: null
  };

  const eventListeners = new Map();  // Para sistema de eventos
  let indicatorElement = null;       // Referencia al indicador visual

  // ========================================
  // API PÚBLICA
  // ========================================
  
  /**
   * API Global del Sistema de Túnel
   */
  window.KDSTunnel = {
    /**
     * Verificar si el túnel está activo
     * @returns {boolean}
     */
    isActive: function() {
      return tunnelState.status === 'active' && 
             tunnelState.isServiceWorkerReady &&
             tunnelState.websocketConnected &&  // ✅ Verificar WebSocket conectado
             navigator.serviceWorker.controller !== null;
    },

    /**
     * Obtener estado completo del túnel
     * @returns {Object}
     */
    getStatus: function() {
      return { ...tunnelState };
    },

    /**
     * Forzar reconexión del túnel
     * @returns {Promise<void>}
     */
    forceReconnect: async function() {
      console.log('🔄 [KDSTunnel] Forzando reconexión...');
      
      if (!navigator.serviceWorker.controller) {
        throw new Error('Service Worker no disponible');
      }

      // Enviar mensaje de reconexión
      navigator.serviceWorker.controller.postMessage({
        type: 'tunnel.reconnect'
      });

      updateState('pending', null, 'Reconexión forzada');
    },

    /**
     * Desconectar túnel
     */
    disconnect: function() {
      console.log('🔌 [KDSTunnel] Desconectando túnel...');
      
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'tunnel.disconnect'
        });
      }

      updateState('disconnected', null, 'Desconexión manual');
    },

    /**
     * Suscribirse a eventos
     * @param {string} event - Nombre del evento
     * @param {Function} callback - Función a ejecutar
     */
    on: function(event, callback) {
      if (typeof callback !== 'function') {
        throw new Error('Callback debe ser una función');
      }

      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }

      eventListeners.get(event).push(callback);
    },

    /**
     * Desuscribirse de eventos
     * @param {string} event - Nombre del evento
     * @param {Function} callback - Función a remover
     */
    off: function(event, callback) {
      if (!eventListeners.has(event)) return;

      const listeners = eventListeners.get(event);
      const index = listeners.indexOf(callback);
      
      if (index > -1) {
        listeners.splice(index, 1);
      }
    },

    /**
     * Mostrar indicador visual
     * @param {Object} options - Configuración del indicador
     */
    showIndicator: function(options = {}) {
      const config = {
        position: options.position || 'bottom-right',
        style: options.style || 'minimal',
        autoHide: options.autoHide !== undefined ? options.autoHide : false,
        theme: options.theme || 'auto',
        ...options
      };

      createIndicator(config);
      updateIndicatorVisual(tunnelState.status);
    },

    /**
     * Ocultar indicador visual
     */
    hideIndicator: function() {
      if (indicatorElement && indicatorElement.parentNode) {
        indicatorElement.remove();
        indicatorElement = null;
      }
    },

    /**
     * Actualizar estado del indicador
     * @param {string} status - Nuevo estado
     */
    updateIndicator: function(status) {
      updateIndicatorVisual(status);
    },

    /**
     * Obtener información de debug
     * @returns {Object}
     */
    getDebugInfo: function() {
      return {
        state: tunnelState,
        serviceWorkerReady: navigator.serviceWorker.controller !== null,
        serviceWorkerState: navigator.serviceWorker.controller?.state,
        listeners: Array.from(eventListeners.keys()),
        indicatorVisible: indicatorElement !== null
      };
    }
  };

  // ========================================
  // FUNCIONES INTERNAS
  // ========================================

  /**
   * Emitir evento a todos los listeners
   */
  function emitEvent(eventName, data) {
    if (!eventListeners.has(eventName)) return;

    const listeners = eventListeners.get(eventName);
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ [KDSTunnel] Error en listener de ${eventName}:`, error);
      }
    });
  }

  /**
   * Actualizar estado y notificar
   */
  function updateState(status, error = null, reason = '') {
    const oldStatus = tunnelState.status;
    
    tunnelState.status = status;
    tunnelState.timestamp = Date.now();
    tunnelState.lastError = error;

    console.log(`📊 [KDSTunnel] Estado: ${oldStatus} → ${status}`, reason);

    // Emitir evento de cambio de estado
    emitEvent('status-change', { 
      status, 
      oldStatus, 
      reason,
      timestamp: tunnelState.timestamp 
    });

    // Emitir eventos específicos
    if (status === 'active') {
      emitEvent('connected', { tenantId: tunnelState.tenantId });
    } else if (status === 'disconnected') {
      emitEvent('disconnected', { reason, fallbackToRailway: true });
    } else if (status === 'error') {
      emitEvent('error', { error, reason });
    }

    // Actualizar indicador visual si existe
    updateIndicatorVisual(status);
  }

  /**
   * Registrar Service Worker
   */
  async function registerTunnelWorker() {
    try {
      console.log('🔧 [KDSTunnel] Registrando Service Worker...');

      const registration = await navigator.serviceWorker.register('/sw-tunnel.js', {
        scope: '/'
      });

      console.log('✅ [KDSTunnel] Service Worker registrado:', registration.scope);

      // Verificar si hay actualización
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 [KDSTunnel] Nueva versión detectada');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✨ [KDSTunnel] Nueva versión instalada');
            showUpdateNotification();
          }
        });
      });

      // Verificar estado del túnel
      if (navigator.serviceWorker.controller) {
        console.log('🌐 [KDSTunnel] Service Worker controlando página');
        tunnelState.isServiceWorkerReady = true;
        
        // Verificar si el WebSocket ya está conectado
        checkWebSocketStatus();
      } else {
        console.log('⏳ [KDSTunnel] Esperando activación...');
        updateState('pending', null, 'Esperando activación');
      }

    } catch (error) {
      console.error('❌ [KDSTunnel] Error registrando Service Worker:', error);
      updateState('error', error.message, 'Error en registro');
    }
  }

  /**
   * Verificar estado actual del WebSocket
   * Útil cuando navegamos entre páginas y el SW ya está activo
   */
  async function checkWebSocketStatus() {
    if (!navigator.serviceWorker.controller) {
      updateState('pending', null, 'Service Worker activo, esperando conexión WebSocket');
      return;
    }

    try {
      // Crear un MessageChannel para recibir respuesta
      const channel = new MessageChannel();
      
      // Esperar respuesta del Service Worker
      const statusPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout esperando respuesta del SW'));
        }, 2000);
        
        channel.port1.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(event.data);
        };
      });
      
      // Preguntar al Service Worker por el estado del WebSocket
      navigator.serviceWorker.controller.postMessage(
        { type: 'ping' },
        [channel.port2]
      );
      
      // Esperar respuesta
      const response = await statusPromise;
      
      console.log('🔍 [KDSTunnel] Estado del WebSocket:', response);
      
      if (response.status === 'connected' && response.tenantId) {
        // WebSocket ya está conectado!
        console.log('✅ [KDSTunnel] WebSocket ya conectado:', response.tenantId);
        tunnelState.tenantId = response.tenantId;
        tunnelState.websocketConnected = true;
        updateState('active', null, 'WebSocket ya estaba conectado');
      } else {
        // WebSocket no conectado, esperar
        updateState('pending', null, 'Service Worker activo, esperando conexión WebSocket');
      }
      
    } catch (error) {
      console.warn('⚠️ [KDSTunnel] Error verificando estado del WebSocket:', error);
      updateState('pending', null, 'Service Worker activo, esperando conexión WebSocket');
    }
  }

  /**
   * Configurar comunicación con Service Worker
   */
  function setupCommunication() {
    if (!navigator.serviceWorker.controller) {
      console.warn('⚠️ [KDSTunnel] No hay Service Worker activo para comunicación');
      return;
    }

    // Escuchar mensajes del Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('📨 [KDSTunnel] Mensaje recibido:', event.data);
      
      const { type, data, tenantId, reason, fallbackToRailway, status } = event.data;

      switch(type) {
        case 'tunnel.status':
          updateState(status, null, 'Actualización de estado');
          break;

        case 'tunnel.connected':
          console.log('🌐 [KDSTunnel] Túnel WebSocket conectado:', tenantId);
          tunnelState.tenantId = tenantId;
          tunnelState.websocketConnected = true;  // ✅ Marcar WebSocket conectado
          updateState('active', null, 'Túnel WebSocket establecido');
          break;

        case 'tunnel.disconnected':
          console.warn('⚠️ [KDSTunnel] Túnel WebSocket desconectado:', reason);
          tunnelState.websocketConnected = false;  // ❌ Marcar WebSocket desconectado
          updateState('disconnected', null, reason);
          
          if (fallbackToRailway) {
            showFallbackNotification();
          }
          break;

        case 'get.tenantId':
          // Responder con tenantId
          const responseTenantId = getTenantId();
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ tenantId: responseTenantId });
          }
          break;

        default:
          console.log('📭 [KDSTunnel] Mensaje sin handler:', type);
      }
    });

    // Enviar información del tenant al Service Worker
    const tenantId = getTenantId();
    if (tenantId) {
      tunnelState.tenantId = tenantId;
      navigator.serviceWorker.controller.postMessage({
        type: 'tenant.info',
        tenantId: tenantId
      });
    }
  }

  /**
   * Crear indicador visual
   */
  function createIndicator(config) {
    // Si ya existe, removerlo
    if (indicatorElement) {
      indicatorElement.remove();
    }

    indicatorElement = document.createElement('div');
    indicatorElement.id = 'kds-tunnel-indicator';
    
    // Aplicar posición
    const positions = {
      'top-left': 'top: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;'
    };

    const baseStyle = `
      position: fixed;
      ${positions[config.position] || positions['bottom-right']}
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      cursor: pointer;
    `;

    indicatorElement.style.cssText = baseStyle;
    
    // Click para ver detalles
    indicatorElement.addEventListener('click', () => {
      console.log('🔍 [KDSTunnel] Debug Info:', window.KDSTunnel.getDebugInfo());
    });

    document.body.appendChild(indicatorElement);
  }

  /**
   * Actualizar apariencia del indicador
   */
  function updateIndicatorVisual(status) {
    if (!indicatorElement) return;

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
        text: '⏳ Activando...',
        title: 'Conectando túnel'
      },
      'initializing': {
        color: '#6b7280',
        bg: '#f3f4f6',
        text: '🔧 Iniciando...',
        title: 'Registrando Service Worker'
      },
      'disconnected': {
        color: '#f59e0b',
        bg: '#fef3c7',
        text: '🔄 Reconectando...',
        title: 'Usando Railway temporalmente'
      },
      'error': {
        color: '#ef4444',
        bg: '#fee2e2',
        text: '❌ Error',
        title: 'Error en túnel - Click para detalles'
      }
    };

    const config = statusConfig[status] || statusConfig['initializing'];
    indicatorElement.style.backgroundColor = config.bg;
    indicatorElement.style.color = config.color;
    indicatorElement.innerHTML = config.text;
    indicatorElement.title = config.title;
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
      animation: slideIn 0.3s ease;
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
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 10000);
  }

  /**
   * Mostrar notificación de fallback
   */
  function showFallbackNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f59e0b;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 320px;
      animation: slideIn 0.3s ease;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold; display: flex; align-items: center; gap: 8px;">
        ⚠️ Túnel Desconectado
      </div>
      <div style="font-size: 14px;">
        Usando conexión Railway. Tu sesión WhatsApp sigue activa.
      </div>
      <div style="font-size: 12px; opacity: 0.9;">
        Intentando reconectar túnel...
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  /**
   * Obtener Tenant ID actual
   */
  function getTenantId() {
    // Obtener de localStorage
    const stored = localStorage.getItem('tenantId') || 
                   localStorage.getItem('currentTenantId');
    if (stored) return stored;

    // Obtener de URL
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tenant') || urlParams.get('tenantId');
  }

  // ========================================
  // INICIALIZACIÓN
  // ========================================

  /**
   * Inicializar sistema de túnel
   */
  window.addEventListener('load', () => {
    console.log('🚀 [KDSTunnel] Inicializando sistema de túnel...');
    console.log('📄 [KDSTunnel] Página:', window.location.pathname);
    
    registerTunnelWorker();
    setupCommunication();

    // Mostrar indicador por defecto
    window.KDSTunnel.showIndicator();

    console.log('✅ [KDSTunnel] Sistema inicializado');
    console.log('💡 [KDSTunnel] WhatsApp verá la IP de este dispositivo');
    console.log('🔍 [KDSTunnel] Usa window.KDSTunnel.getDebugInfo() para detalles');
  });

  // Reconectar si la pestaña estaba inactiva
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('👁️ [KDSTunnel] Pestaña visible, verificando túnel...');
      
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'ping'
        });
      }
    }
  });

  // Manejar activación del Service Worker
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 [KDSTunnel] Service Worker controller cambió');
    tunnelState.isServiceWorkerReady = true;
    updateState('active', null, 'Controller activado');
  });

})();
