/**
 * 🔧 KDS Service Worker - Túnel de conexión
 * 
 * Este Service Worker crea un túnel desde el navegador del restaurante
 * hacia el servidor de Railway, permitiendo que WhatsApp vea la IP
 * del restaurante en lugar de la IP de Railway.
 * 
 * VENTAJAS:
 * - Sin instalación de apps
 * - Sin descargas adicionales
 * - IP real del restaurante
 * - Funciona en cualquier dispositivo
 * - $0 costo operativo
 */

const CACHE_NAME = 'kds-tunnel-v1';
const RAILWAY_API = self.location.origin; // Usar el mismo origin

// Estado del túnel
let tunnelSocket = null;
let tenantId = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000;

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 [SW] Service Worker instalado - Túnel activado');
  self.skipWaiting(); // Activar inmediatamente
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ [SW] Service Worker activado');
  event.waitUntil(self.clients.claim()); // Tomar control de todas las páginas
});

/**
 * Establecer túnel con Railway usando Socket.IO
 */
async function establishTunnel() {
  if (tunnelSocket) {
    return; // Ya conectado
  }

  try {
    // Obtener tenantId desde el cliente
    if (!tenantId) {
      const clients = await self.clients.matchAll();
      if (clients.length > 0) {
        // Solicitar tenantId al cliente
        clients[0].postMessage({ type: 'request-tenant-id' });
        
        // Esperar respuesta (se manejará en el mensaje)
        return;
      }
    }

    console.log(`🌐 [SW] Estableciendo túnel para tenant: ${tenantId}`);

    // Importar Socket.IO client (si está disponible)
    // Por ahora usamos WebSocket nativo
    const wsUrl = `${RAILWAY_API.replace('http', 'ws')}/tunnel`;
    tunnelSocket = new WebSocket(wsUrl);

    tunnelSocket.addEventListener('open', () => {
      console.log('🌐 [SW] Túnel WebSocket establecido');
      reconnectAttempts = 0;
      
      // Enviar información de inicialización
      tunnelSocket.send(JSON.stringify({
        type: 'tunnel.init',
        tenantId: tenantId,
        deviceInfo: {
          userAgent: self.navigator.userAgent,
          timestamp: Date.now()
        }
      }));

      // Notificar a los clientes
      notifyClients({ type: 'tunnel-status', status: 'connected' });
    });

    tunnelSocket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Manejar peticiones que deben salir desde este navegador
        if (data.type === 'proxy.request') {
          await handleProxyRequest(data);
        }
        else if (data.type === 'tunnel.registered') {
          console.log(`✅ [SW] Túnel registrado para tenant: ${data.tenantId}`);
        }
      } catch (error) {
        console.error('❌ [SW] Error procesando mensaje:', error);
      }
    });

    tunnelSocket.addEventListener('close', () => {
      console.warn('⚠️ [SW] Túnel cerrado, intentando reconectar...');
      tunnelSocket = null;
      notifyClients({ type: 'tunnel-status', status: 'disconnected' });
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(establishTunnel, RECONNECT_DELAY * reconnectAttempts);
      } else {
        console.error('❌ [SW] Máximo de intentos de reconexión alcanzado');
        notifyClients({ type: 'tunnel-status', status: 'failed' });
      }
    });

    tunnelSocket.addEventListener('error', (error) => {
      console.error('❌ [SW] Error en túnel:', error);
      notifyClients({ type: 'tunnel-status', status: 'error' });
    });

  } catch (error) {
    console.error('❌ [SW] Error estableciendo túnel:', error);
    setTimeout(establishTunnel, RECONNECT_DELAY * (reconnectAttempts + 1));
  }
}

/**
 * Manejar petición proxy (salir desde IP del navegador)
 */
async function handleProxyRequest(data) {
  const { requestId, url, method, headers, body } = data;

  try {
    // Hacer la petición desde el navegador (usa IP del dispositivo)
    const response = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: body,
      mode: 'cors'
    });

    const responseBody = await response.text();
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Enviar respuesta de vuelta al servidor
    if (tunnelSocket && tunnelSocket.readyState === WebSocket.OPEN) {
      tunnelSocket.send(JSON.stringify({
        type: 'proxy.response',
        requestId: requestId,
        status: response.status,
        headers: responseHeaders,
        body: responseBody
      }));
    }

  } catch (error) {
    // Enviar error al servidor
    if (tunnelSocket && tunnelSocket.readyState === WebSocket.OPEN) {
      tunnelSocket.send(JSON.stringify({
        type: 'proxy.error',
        requestId: requestId,
        error: error.message
      }));
    }
  }
}

/**
 * Notificar a todos los clientes
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Interceptar peticiones (opcional - para cache)
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones de la misma origin
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Dejar pasar peticiones normalmente
  event.respondWith(fetch(event.request));
});

// Escuchar mensajes de los clientes
self.addEventListener('message', (event) => {
  if (event.data.type === 'set-tenant-id') {
    tenantId = event.data.tenantId;
    console.log(`🆔 [SW] TenantId configurado: ${tenantId}`);
    
    // Establecer túnel ahora que tenemos el tenantId
    if (!tunnelSocket) {
      establishTunnel();
    }
  }
  else if (event.data.type === 'ping') {
    // Keep-alive ping desde el cliente
    if (tunnelSocket && tunnelSocket.readyState === WebSocket.OPEN) {
      tunnelSocket.send(JSON.stringify({ type: 'ping' }));
    }
  }
});

// Mantener túnel activo
setInterval(() => {
  if (tunnelSocket && tunnelSocket.readyState === WebSocket.OPEN) {
    // Ping para mantener conexión
    tunnelSocket.send(JSON.stringify({ type: 'ping' }));
  } else if (tenantId && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    // Intentar reconectar si no está conectado
    establishTunnel();
  }
}, 30000); // Cada 30 segundos

console.log('🚀 [SW] KDS Tunnel Service Worker cargado');

