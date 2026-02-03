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
 */

const CACHE_NAME = 'kds-tunnel-v1';
const RAILWAY_API = 'https://api.kdsapp.site';

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

// WebSocket para túnel persistente
let tunnelSocket = null;
let deviceInfo = null;

/**
 * Establecer túnel WebSocket con Railway
 */
async function establishTunnel() {
  if (tunnelSocket && tunnelSocket.readyState === WebSocket.OPEN) {
    return; // Ya conectado
  }

  try {
    // Obtener info del dispositivo
    const clientInfo = await self.clients.matchAll();
    if (clientInfo.length > 0) {
      const client = clientInfo[0];
      deviceInfo = {
        userAgent: self.navigator.userAgent,
        timestamp: Date.now(),
        clientId: client.id
      };
    }

    // Conectar WebSocket al servidor
    tunnelSocket = new WebSocket(`wss://api.kdsapp.site/tunnel`);

    tunnelSocket.addEventListener('open', () => {
      console.log('🌐 [SW] Túnel WebSocket establecido');
      
      // Enviar información del dispositivo
      tunnelSocket.send(JSON.stringify({
        type: 'tunnel.init',
        deviceInfo: deviceInfo
      }));
    });

    tunnelSocket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Manejar peticiones que deben salir desde este navegador
        if (data.type === 'proxy.request') {
          await handleProxyRequest(data);
        }
      } catch (error) {
        console.error('❌ [SW] Error procesando mensaje:', error);
      }
    });

    tunnelSocket.addEventListener('close', () => {
      console.warn('⚠️ [SW] Túnel cerrado, reconectando...');
      setTimeout(establishTunnel, 3000);
    });

    tunnelSocket.addEventListener('error', (error) => {
      console.error('❌ [SW] Error en túnel:', error);
    });

  } catch (error) {
    console.error('❌ [SW] Error estableciendo túnel:', error);
    setTimeout(establishTunnel, 5000);
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
    tunnelSocket.send(JSON.stringify({
      type: 'proxy.response',
      requestId: requestId,
      status: response.status,
      headers: responseHeaders,
      body: responseBody
    }));

  } catch (error) {
    // Enviar error al servidor
    tunnelSocket.send(JSON.stringify({
      type: 'proxy.error',
      requestId: requestId,
      error: error.message
    }));
  }
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

// Mantener túnel activo
setInterval(() => {
  if (!tunnelSocket || tunnelSocket.readyState !== WebSocket.OPEN) {
    establishTunnel();
  } else {
    // Ping para mantener conexión
    tunnelSocket.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000); // Cada 30 segundos

// Establecer túnel al activar
establishTunnel();

console.log('🚀 [SW] KDS Tunnel Service Worker cargado');
