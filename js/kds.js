        // Debug: Verificar versión cargada
        console.log('[KDS] HTML cargado - Timestamp: 1768856159');
        console.log('[KDS] Versión de scripts: app.js?v=1768856159');
        
        // Configurar botón de dashboard
        document.getElementById('dashboardBtn').addEventListener('click', function(e) {
            e.preventDefault();
            // Obtener el tenantId actual del localStorage
            const currentTenantId = localStorage.getItem('currentTenantId');
            if (currentTenantId) {
                window.location.href = `/select.html`;
            } else {
                alert('Debes iniciar sesión primero');
                window.location.href = '/auth.html';
            }
        });

        // Iniciar la aplicación cuando el DOM esté listo - con manejo de errores
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                try {
                    if (typeof init === 'function') {
                        init();
                    } else {
                        console.error('[KDS] ERROR: Función init() no encontrada. app.js no se cargó correctamente.');
                    }
                } catch (error) {
                    console.error('[KDS] ERROR al inicializar KDS:', error);
                    alert('Error al inicializar KDS. Recarga la página (Ctrl+Shift+R)');
                }
            });
        } else {
            try {
                if (typeof init === 'function') {
                    init();
                } else {
                    console.error('[KDS] ERROR: Función init() no encontrada. app.js no se cargó correctamente.');
                }
            } catch (error) {
                console.error('[KDS] ERROR al inicializar KDS:', error);
                alert('Error al inicializar KDS. Recarga la página (Ctrl+Shift+R)');
            }
        }
