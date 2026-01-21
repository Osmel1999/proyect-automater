/* 
 * Archivo de Verificación de Deploy
 * Creado: 2026-01-21 09:00:00
 * 
 * Este archivo sirve para verificar que Railway está actualizando correctamente.
 * 
 * Si puedes ver este archivo en Railway, significa que el deploy se ejecutó.
 */

const DEPLOY_INFO = {
    timestamp: '2026-01-21T09:00:00Z',
    version: '1.0.0-deploy-fix',
    purpose: 'Verificar que Railway actualiza archivos',
    expectedBehavior: {
        'login.html': 'NO DEBE EXISTIR (404)',
        'auth.html': 'DEBE REDIRIGIR A /select.html',
        'select.html': 'DEBE MOSTRAR SELECTOR'
    }
};

console.log('✅ Deploy verificado:', DEPLOY_INFO);

module.exports = DEPLOY_INFO;
