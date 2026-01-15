/**
 * Script de limpieza para tests de Baileys
 * Elimina sesiones de prueba y backups
 */

const fs = require('node:fs').promises;
const path = require('node:path');

const SESSIONS_DIR = path.join(__dirname, 'sessions');
const TEST_TENANT_ID = 'test_tenant_001';

async function cleanup() {
  console.log('🧹 Limpiando sesiones de prueba...\n');

  try {
    // Eliminar sesión de prueba
    const testSessionDir = path.join(SESSIONS_DIR, TEST_TENANT_ID);
    try {
      await fs.rm(testSessionDir, { recursive: true, force: true });
      console.log(`✓ Sesión de prueba eliminada: ${TEST_TENANT_ID}`);
    } catch (error) {
      console.log(`  (No había sesión de prueba)`);
    }

    // Eliminar backups de prueba
    const files = await fs.readdir(SESSIONS_DIR);
    const backups = files.filter(f => f.startsWith(`${TEST_TENANT_ID}_backup_`));
    
    for (const backup of backups) {
      const backupPath = path.join(SESSIONS_DIR, backup);
      await fs.rm(backupPath, { recursive: true, force: true });
      console.log(`✓ Backup eliminado: ${backup}`);
    }

    if (backups.length === 0) {
      console.log(`  (No había backups de prueba)`);
    }

    console.log('\n✅ Limpieza completada\n');
  } catch (error) {
    console.error('❌ Error durante limpieza:', error.message);
  }
}

cleanup();
