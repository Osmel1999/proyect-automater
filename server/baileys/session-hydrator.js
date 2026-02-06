/**
 * Baileys Session Hydrator
 * Restaura sesiones WhatsApp desde Realtime Database (tenant data) al disco local
 * Permite sobrevivir a Railway sleep y cold starts
 */

const fs = require('node:fs').promises;
const path = require('node:path');
const pino = require('pino');

const logger = pino({ level: 'info' });

// 🔑 BufferJSON: Must use the same serialization Baileys uses for local files
const BufferJSON = {
  replacer: (k, value) => {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array || value?.type === 'Buffer') {
      return { type: 'Buffer', data: Buffer.from(value?.data || value).toString('base64') };
    }
    return value;
  }
};

// Importar storage singleton
const storage = require('./storage');

/**
 * Hidrata una sesión local desde Firebase Realtime Database (dentro del tenant)
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<boolean>} true si se hidrata exitosamente
 */
async function hydrateLocalSession(tenantId) {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] [Hydrator] 💧 Hidratando sesión para ${tenantId}...`);

  try {
    // 1. Obtener credenciales desde Realtime Database (dentro del tenant)
    const sessionData = await storage.loadSessionFromFirebase(tenantId);

    if (!sessionData?.creds) {
      logger.warn(`[${tenantId}] [Hydrator] ⚠️ No hay credenciales en Firebase (tenants/${tenantId}/baileys_session)`);
      return false;
    }

    // 2. Crear directorio local si no existe
    const sessionDir = path.join(__dirname, '../../sessions', tenantId);
    await fs.mkdir(sessionDir, { recursive: true });
    logger.debug(`[${tenantId}] [Hydrator] 📁 Directorio creado: ${sessionDir}`);

    // 3. Escribir creds.json — must use BufferJSON.replacer like Baileys does
    const credsPath = path.join(sessionDir, 'creds.json');
    await fs.writeFile(
      credsPath,
      JSON.stringify(sessionData.creds, BufferJSON.replacer, 2),
      'utf-8'
    );
    logger.info(`[${tenantId}] [Hydrator] ✅ creds.json escrito (${Object.keys(sessionData.creds).length} keys)`);

    // 4. Escribir app-state-sync-key-*.json (si existen)
    if (sessionData.keys && Object.keys(sessionData.keys).length > 0) {
      let keysWritten = 0;
      for (const [keyId, keyData] of Object.entries(sessionData.keys)) {
        const keyPath = path.join(sessionDir, `app-state-sync-key-${keyId}.json`);
        await fs.writeFile(
          keyPath,
          JSON.stringify(keyData, BufferJSON.replacer, 2),
          'utf-8'
        );
        keysWritten++;
      }
      logger.info(`[${tenantId}] [Hydrator] ✅ ${keysWritten} app-state-sync keys escritas`);
    } else {
      logger.debug(`[${tenantId}] [Hydrator] 📝 No hay app-state-sync keys para hidratar`);
    }

    // 5. Verificar que los archivos existen
    await fs.access(credsPath);
    logger.info(`[${tenantId}] [Hydrator] ✅ Sesión hidratada exitosamente`);

    return true;

  } catch (error) {
    logger.error(`[${tenantId}] [Hydrator] ❌ Error hidratando sesión:`, error.message);
    logger.error(error.stack);
    return false;
  }
}

/**
 * Hidrata múltiples sesiones en paralelo con límite de concurrencia
 * @param {Array<string>} tenantIds - IDs de tenants a hidratar
 * @param {number} batchSize - Número de sesiones a procesar en paralelo
 * @returns {Promise<object>} Resultado con éxitos y fallos
 */
async function hydrateBatch(tenantIds, batchSize = 5) {
  logger.info(`[Hydrator] 🔄 Hidratando ${tenantIds.length} sesiones en lotes de ${batchSize}...`);

  const results = {
    success: [],
    failed: [],
    total: tenantIds.length
  };

  // Procesar en lotes para no saturar
  for (let i = 0; i < tenantIds.length; i += batchSize) {
    const batch = tenantIds.slice(i, i + batchSize);
    logger.info(`[Hydrator] 📦 Procesando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(tenantIds.length / batchSize)}`);

    const batchResults = await Promise.allSettled(
      batch.map(tenantId => hydrateLocalSession(tenantId))
    );

    batchResults.forEach((result, index) => {
      const tenantId = batch[index];
      if (result.status === 'fulfilled' && result.value === true) {
        results.success.push(tenantId);
      } else {
        results.failed.push(tenantId);
        logger.warn(`[Hydrator] ⚠️ Falló hidratación de ${tenantId}`);
      }
    });

    // Pequeño delay entre lotes para no saturar
    if (i + batchSize < tenantIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  logger.info(`[Hydrator] ✅ Hidratación completa: ${results.success.length}/${results.total} exitosas`);
  if (results.failed.length > 0) {
    logger.warn(`[Hydrator] ⚠️ Fallidas: ${results.failed.join(', ')}`);
  }

  return results;
}

/**
 * Verifica si una sesión local necesita ser hidratada
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<boolean>} true si necesita hidratación
 */
async function needsHydration(tenantId) {
  try {
    const sessionDir = path.join(__dirname, '../../sessions', tenantId);
    const credsPath = path.join(sessionDir, 'creds.json');

    // Verificar si existe creds.json local
    await fs.access(credsPath);
    
    // Si existe, verificar que sea válido (no vacío)
    const stats = await fs.stat(credsPath);
    if (stats.size < 10) {
      logger.warn(`[${tenantId}] [Hydrator] ⚠️ creds.json existe pero está vacío/corrupto`);
      return true;
    }

    logger.debug(`[${tenantId}] [Hydrator] ✅ Sesión local existe y es válida`);
    return false;

  } catch {
    // Si no existe el archivo, necesita hidratación
    logger.debug(`[${tenantId}] [Hydrator] 📝 Sesión local no existe, necesita hidratación`);
    return true;
  }
}

module.exports = {
  hydrateLocalSession,
  hydrateBatch,
  needsHydration
};
