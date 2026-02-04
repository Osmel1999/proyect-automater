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
let currentTenantId = null;

/**
 * Seleccionar cliente por prioridad
 * Jerarquía: KDS > WhatsApp Connect > Dashboard
 */
function selectClientByPriority(clients) {
  if (!clients || clients.length === 0) return null;

  // Definir páginas por orden de prioridad
  const priorityPages = [
    { patterns: ['/kds.html', '/kds', '/kds-diagnose.html'], name: 'KDS' },
    { patterns: ['/whatsapp-connect.html', '/whatsapp-connect'], name: 'WhatsApp Connect' },
    { patterns: ['/dashboard.html', '/dashboard'], name: 'Dashboard' }
  ];

  // Buscar cliente con mayor prioridad
  for (const page of priorityPages) {
    for (const pattern of page.patterns) {
      const client = clients.find(c => c.url.includes(pattern));
      if (client) {
        console.log(`🎯 [SW] Cliente seleccionado: ${page.name} (${new URL(client.url).pathname})`);
        return client;
      }
    }
  }

  // Si no encuentra ninguna prioritaria, usar la primera
  console.log('⚠️ [SW] No se encontró página prioritaria, usando primer cliente');
  return clients[0];
}

/**
 * Obtener Tenant ID del cliente
 */
async function getTenantIdFromClients() {
  try {
    const clients = await self.clients.matchAll();
    const selectedClient = selectClientByPriority(clients);
    
    if (!selectedClient) return null;

    // Obtener tenant ID de la URL o localStorage del cliente
    const url = new URL(selectedClient.url);
    const tenantFromUrl = url.searchParams.get('tenant') || url.searchParams.get('tenantId');
    
    if (tenantFromUrl) return tenantFromUrl;

    // Si no está en URL, pedirlo al cliente
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data.tenantId);
      };
      
      selectedClient.postMessage({ type: 'get.tenantId' }, [channel.port2]);
      
      // Timeout de 2 segundos
      setTimeout(() => resolve(null), 2000);
    });
  } catch (error) {
    console.error('❌ [SW] Error obteniendo tenant ID:', error);
    return null;
  }
}

/**
 * Notificar desconexión al backend
 * Esta es una notificación OPCIONAL - el servidor ya detecta el cierre del WebSocket
 */
async function notifyDisconnection(reason = 'unknown') {
  if (!currentTenantId) {
    return; // No hay tenantId, no notificar
  }

  try {
    await fetch(`${RAILWAY_API}/api/tunnel/disconnected`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: currentTenantId,
        timestamp: Date.now(),
        reason: reason
      })
    });
    console.log('✅ [SW] Desconexión notificada al backend');
  } catch (error) {
    // Silenciar error - el servidor ya detectó el cierre del WebSocket
    // Este es solo un backup y no es crítico
    console.log('ℹ️ [SW] Notificación de desconexión no enviada (el servidor ya lo detectó)');
  }
}

/**
 * Notificar a todos los clientes
 */
async function notifyAllClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

/**
 * Establecer túnel WebSocket con Railway
 */
async function establishTunnel() {
  if (tunnelSocket && tunnelSocket.readyState === WebSocket.OPEN) {
    return; // Ya conectado
  }

  try {
    // Obtener info del dispositivo con prioridad de cliente
    const clientInfo = await self.clients.matchAll();
    const selectedClient = selectClientByPriority(clientInfo);
    
    if (selectedClient) {
      const url = new URL(selectedClient.url);
      currentTenantId = await getTenantIdFromClients();
      
      deviceInfo = {
        userAgent: self.navigator.userAgent,
        timestamp: Date.now(),
        clientId: selectedClient.id,
        page: url.pathname,
        tenantId: currentTenantId
      };
      
      console.log('📱 [SW] Info del dispositivo:', {
        page: url.pathname,
        tenantId: currentTenantId || 'sin ID inicial'
      });
    }

    // Conectar WebSocket al servidor (sin tenantId en URL si no lo tenemos)
    const wsUrl = currentTenantId 
      ? `wss://api.kdsapp.site/tunnel?tenantId=${currentTenantId}`
      : `wss://api.kdsapp.site/tunnel`;  // ✅ Permitido ahora
    
    console.log(`🔌 [SW] Conectando a: ${wsUrl}`);
    tunnelSocket = new WebSocket(wsUrl);

    tunnelSocket.addEventListener('open', async () => {
      console.log('🌐 [SW] Túnel WebSocket establecido');
      
      // Si no tenemos tenantId, intentar obtenerlo ahora
      if (!currentTenantId) {
        console.log('⏳ [SW] Esperando tenant ID...');
        currentTenantId = await getTenantIdFromClients();
        
        if (deviceInfo) {
          deviceInfo.tenantId = currentTenantId;
        }
      }
      
      // Si tenemos tenantId, registrarlo ahora
      if (currentTenantId) {
        console.log(`📝 [SW] Registrando con tenant ID: ${currentTenantId}`);
        tunnelSocket.send(JSON.stringify({
          type: 'tunnel.register',
          tenantId: currentTenantId,
          deviceInfo: deviceInfo
        }));
        
        // ✅ Notificar después de registrar con tenantId
        notifyAllClients({ 
          type: 'tunnel.connected',
          tenantId: currentTenantId 
        });
      } else {
        // Si aún no tenemos tenantId, solo enviar init
        console.log('⚠️ [SW] Conectado sin tenant ID - esperando registro');
        tunnelSocket.send(JSON.stringify({
          type: 'tunnel.init',
          deviceInfo: deviceInfo
        }));
        
        // ⚠️ NO notificar como conectado hasta tener tenantId
      }
    });

    tunnelSocket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Manejar registro exitoso
        if (data.type === 'tunnel.registered') {
          console.log(`✅ [SW] Túnel registrado en backend: ${data.tenantId}`);
          currentTenantId = data.tenantId;
          
          // ✅ Notificar a clientes ahora que el backend confirmó
          notifyAllClients({ 
            type: 'tunnel.connected',
            tenantId: currentTenantId 
          });
        }
        
        // Manejar error de registro
        if (data.type === 'tunnel.error') {
          console.error(`❌ [SW] Error en túnel: ${data.error}`);
        }
        
        // Manejar peticiones que deben salir desde este navegador
        if (data.type === 'proxy.request') {
          await handleProxyRequest(data);
        }
        
        // Manejar pong del servidor
        if (data.type === 'pong') {
          console.log('🏓 [SW] Pong recibido del servidor');
        }
        
        // Responder a ping del servidor con pong
        if (data.type === 'ping') {
          tunnelSocket.send(JSON.stringify({ type: 'pong' }));
          console.log('🏓 [SW] Respondiendo pong al servidor');
        }
      } catch (error) {
        console.error('❌ [SW] Error procesando mensaje:', error);
      }
    });

    tunnelSocket.addEventListener('close', (event) => {
      console.warn('⚠️ [SW] Túnel cerrado:', event.code, event.reason);
      
      // Notificar al backend
      notifyDisconnection('connection_closed');
      
      // Notificar a clientes
      notifyAllClients({ 
        type: 'tunnel.disconnected',
        fallbackToRailway: true,
        reason: event.reason || 'connection_closed'
      });
      
      // Reconectar después de 3 segundos
      setTimeout(establishTunnel, 3000);
    });

    tunnelSocket.addEventListener('error', (error) => {
      console.error('❌ [SW] Error en túnel:', error);
      
      // Notificar desconexión por error
      notifyDisconnection('websocket_error');
    });

  } catch (error) {
    console.error('❌ [SW] Error estableciendo túnel:', error);
    notifyDisconnection('establishment_error');
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

// Escuchar mensajes de los clientes
self.addEventListener('message', (event) => {
  if (event.data.type === 'tenant.info') {
    const newTenantId = event.data.tenantId;
    const hadTenantId = currentTenantId !== null;
    
    // Actualizar tenant ID
    currentTenantId = newTenantId;
    console.log('📝 [SW] Tenant ID actualizado:', currentTenantId);
    
    // Si el túnel ya está conectado, actualizar deviceInfo
    if (deviceInfo) {
      deviceInfo.tenantId = currentTenantId;
    }
    
    // Si no teníamos tenantId antes y ahora sí, registrar túnel
    if (!hadTenantId && currentTenantId && tunnelSocket && tunnelSocket.readyState === WebSocket.OPEN) {
      console.log('🔄 [SW] Registrando túnel con nuevo tenant ID');
      tunnelSocket.send(JSON.stringify({
        type: 'tunnel.register',
        tenantId: currentTenantId,
        deviceInfo: deviceInfo
      }));
      
      // ✅ Notificar a clientes
      notifyAllClients({ 
        type: 'tunnel.connected',
        tenantId: currentTenantId 
      });
    }
  } else if (event.data.type === 'ping') {
    // Responder con estado del túnel
    const status = tunnelSocket && tunnelSocket.readyState === WebSocket.OPEN 
      ? 'connected' 
      : 'disconnected';
    
    event.ports[0]?.postMessage({ 
      type: 'pong', 
      status,
      tenantId: currentTenantId 
    });
  }
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
