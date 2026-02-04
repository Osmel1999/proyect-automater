/**
 * 🔧 Tunnel Dispatcher - Undici Agent para usar túnel WebSocket
 * 
 * Este módulo crea un dispatcher de Undici que envía requests HTTP
 * a través del túnel WebSocket del navegador del restaurante.
 * 
 * IMPORTANTE: Baileys usa undici internamente y espera un Agent/Dispatcher
 * como fetchAgent, no una función fetch personalizada.
 */

const { Agent, Pool, Dispatcher } = require('undici');
const tunnelManager = require('./tunnel-manager');

/**
 * Dispatcher personalizado que envía requests por el túnel
 */
class TunnelDispatcher extends Dispatcher {
  constructor(tenantId, options = {}) {
    super();
    this.tenantId = tenantId;
    this.options = options;
    this.closed = false;
    this.destroyed = false;
    
    // Fallback dispatcher para cuando no hay túnel
    this.fallbackDispatcher = new Agent({
      connect: {
        timeout: 60000,
      },
      bodyTimeout: 60000,
      headersTimeout: 60000
    });
    
    console.log(`✅ [TunnelDispatcher] Creado para tenant: ${tenantId}`);
  }

  /**
   * Método principal de dispatch - intercepta todos los requests
   */
  dispatch(opts, handler) {
    const url = opts.origin ? `${opts.origin}${opts.path}` : opts.path;
    
    console.log(`🔍 [TunnelDispatcher:${this.tenantId}] Request: ${opts.method} ${url.substring(0, 80)}...`);
    
    // Verificar si hay túnel activo
    const hasTunnel = tunnelManager.hasTunnel(this.tenantId);
    
    if (!hasTunnel) {
      console.log(`📡 [TunnelDispatcher:${this.tenantId}] Sin túnel - usando conexión directa Railway`);
      return this.fallbackDispatcher.dispatch(opts, handler);
    }

    console.log(`🌐 [TunnelDispatcher:${this.tenantId}] ¡Usando TÚNEL! IP del restaurante será visible`);
    
    // Ejecutar request a través del túnel
    this._dispatchViaTunnel(opts, handler, url);
    
    return true;
  }

  /**
   * Enviar request a través del túnel WebSocket
   */
  async _dispatchViaTunnel(opts, handler, url) {
    try {
      // Preparar headers
      const headers = {};
      if (opts.headers) {
        if (Array.isArray(opts.headers)) {
          for (let i = 0; i < opts.headers.length; i += 2) {
            headers[opts.headers[i].toString()] = opts.headers[i + 1].toString();
          }
        } else if (typeof opts.headers === 'object') {
          Object.assign(headers, opts.headers);
        }
      }

      // Preparar body
      let body = null;
      if (opts.body) {
        if (Buffer.isBuffer(opts.body)) {
          body = opts.body.toString('base64');
        } else if (typeof opts.body === 'string') {
          body = opts.body;
        } else if (opts.body.pipe) {
          // Es un stream - leer todo
          const chunks = [];
          for await (const chunk of opts.body) {
            chunks.push(chunk);
          }
          body = Buffer.concat(chunks).toString('base64');
        }
      }

      console.log(`📤 [TunnelDispatcher:${this.tenantId}] Enviando por túnel: ${opts.method} ${url.substring(0, 60)}`);

      // Enviar request por el túnel
      const response = await tunnelManager.proxyRequest(this.tenantId, {
        url: url,
        method: opts.method || 'GET',
        headers: headers,
        body: body,
        bodyIsBase64: Buffer.isBuffer(opts.body)
      });

      console.log(`📥 [TunnelDispatcher:${this.tenantId}] Respuesta del túnel: ${response.status}`);

      // Convertir respuesta a formato handler de undici
      const responseHeaders = [];
      if (response.headers) {
        for (const [key, value] of Object.entries(response.headers)) {
          responseHeaders.push(key, value);
        }
      }

      // Llamar handler con la respuesta
      handler.onConnect((abort) => {});
      
      handler.onHeaders(
        response.status || 200, 
        responseHeaders,
        () => {},
        response.statusText || 'OK'
      );

      // Enviar body de respuesta
      if (response.body) {
        let bodyBuffer;
        if (response.bodyIsBase64) {
          bodyBuffer = Buffer.from(response.body, 'base64');
        } else if (typeof response.body === 'string') {
          bodyBuffer = Buffer.from(response.body);
        } else {
          bodyBuffer = Buffer.from(JSON.stringify(response.body));
        }
        
        handler.onData(bodyBuffer);
      }

      handler.onComplete([]);

    } catch (error) {
      console.error(`❌ [TunnelDispatcher:${this.tenantId}] Error en túnel:`, error.message);
      
      // En caso de error, intentar con fallback
      console.log(`🔄 [TunnelDispatcher:${this.tenantId}] Fallback a conexión directa Railway`);
      
      try {
        return this.fallbackDispatcher.dispatch(opts, handler);
      } catch (fallbackError) {
        handler.onError(fallbackError);
      }
    }
  }

  /**
   * Cerrar dispatcher
   */
  async close() {
    this.closed = true;
    await this.fallbackDispatcher.close();
    console.log(`🔌 [TunnelDispatcher:${this.tenantId}] Cerrado`);
  }

  /**
   * Destruir dispatcher
   */
  async destroy() {
    this.destroyed = true;
    await this.fallbackDispatcher.destroy();
    console.log(`💥 [TunnelDispatcher:${this.tenantId}] Destruido`);
  }
}

/**
 * Crear dispatcher de túnel para un tenant
 * @param {string} tenantId - ID del tenant
 * @returns {TunnelDispatcher} Dispatcher configurado
 */
function createTunnelDispatcher(tenantId) {
  return new TunnelDispatcher(tenantId);
}

module.exports = {
  TunnelDispatcher,
  createTunnelDispatcher
};
